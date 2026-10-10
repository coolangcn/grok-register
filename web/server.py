#!/usr/bin/env python3
"""Local FastAPI control plane that reuses the existing registration engine."""
from __future__ import annotations

import collections
import datetime
import json
import os
import threading
import time
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from starlette.concurrency import run_in_threadpool

import grok_register_ttk as engine

ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = Path(__file__).resolve().parent / "index.html"
PROXY_POOL_JS = Path(__file__).resolve().parent / "proxy-pool.js"
PROXY_POOL_CSS = Path(__file__).resolve().parent / "proxy-pool.css"
OUTLOOK_MAILBOX_JS = Path(__file__).resolve().parent / "outlook-mailbox.js"
LOG_LIMIT = 2000

app = FastAPI(title="grok-register WebUI", version="1.2")


@app.on_event("startup")
def _sweep_orphan_registration_browsers() -> None:
    """服务启动即清理上次运行残留的注册浏览器，防止 Chrome 进程越积越多拖垮系统。"""
    try:
        from registration_browser import sweep_orphan_browsers
        sweep_orphan_browsers(log_callback=lambda msg: print(msg, flush=True))
    except Exception as exc:
        print(f"orphan browser sweep skipped: {exc}", flush=True)

_job_lock = threading.Lock()
_job_thread: Optional[threading.Thread] = None
_controller: Any = None
_maintenance_state: Optional[str] = None
_job_state = {
    "running": False,
    "target": 0,
    "success": 0,
    "fail": 0,
    "pending": 0,
    "warnings": 0,
    "uncertain": 0,
    "cancelled": False,
    "started_at": None,
    "finished_at": None,
    "accounts_file": "",
    "error": "",
}

_log_lock = threading.Lock()
_log_seq = 0
_logs = collections.deque(maxlen=LOG_LIMIT)


def _append_log(message: str) -> None:
    global _log_seq
    line = "[%s] %s" % (time.strftime("%H:%M:%S"), str(message))
    with _log_lock:
        _log_seq += 1
        _logs.append({"seq": _log_seq, "line": line})


def _state_snapshot() -> dict[str, Any]:
    with _job_lock:
        snapshot = dict(_job_state)
        snapshot["maintenance"] = _maintenance_state
        return snapshot


def _begin_maintenance(kind: str) -> None:
    global _maintenance_state
    with _job_lock:
        if _job_state["running"]:
            raise HTTPException(status_code=409, detail="注册任务运行期间不能执行维护操作")
        if _maintenance_state is not None:
            raise HTTPException(
                status_code=409,
                detail="已有维护操作正在执行: %s" % _maintenance_state,
            )
        _maintenance_state = str(kind)


def _end_maintenance(kind: str) -> None:
    global _maintenance_state
    with _job_lock:
        if _maintenance_state == str(kind):
            _maintenance_state = None


def _load_config_if_idle() -> dict[str, Any]:
    with _job_lock:
        if not _job_state["running"] and _maintenance_state is None:
            engine.load_config()
        return dict(engine.config)


def _new_accounts_file() -> str:
    stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    return str(ROOT / ("accounts_%s.txt" % stamp))


def _update_progress(batch: Any) -> None:
    with _job_lock:
        _job_state["success"] = int(batch.success_count)
        _job_state["fail"] = int(batch.fail_count)
        _job_state["pending"] = int(batch.registered_unsaved_count)
        _job_state["warnings"] = int(batch.postprocess_warning_count)
        _job_state["uncertain"] = int(getattr(batch, "uncertain_count", 0) or 0)
        _job_state["cancelled"] = bool(batch.cancelled)


# grok2api 入池统计：observer 从每个账号的 OutputResult.pools 聚合（local/remote）
_g2a_lock = threading.Lock()
_g2a_stats: dict[str, dict[str, Any]] = {}


def _reset_g2a_stats() -> None:
    with _g2a_lock:
        _g2a_stats.clear()


def _record_g2a_output(output: Any) -> None:
    pools = getattr(output, "pools", None)
    if not isinstance(pools, dict):
        return
    with _g2a_lock:
        for name, state in pools.items():
            if not isinstance(state, dict) or not state.get("enabled"):
                continue
            entry = _g2a_stats.setdefault(str(name), {"ok": 0, "fail": 0, "errors": []})
            if state.get("ok"):
                entry["ok"] += 1
            else:
                entry["fail"] += 1
                error = str(state.get("error") or "未知错误")
                if error not in entry["errors"]:
                    entry["errors"].append(error)


def _g2a_stats_snapshot() -> dict[str, dict[str, Any]]:
    with _g2a_lock:
        return {name: dict(entry) for name, entry in _g2a_stats.items()}


def _job_observer(batch: Any, _account: Any, output: Any) -> None:
    _update_progress(batch)
    _record_g2a_output(output)


def _run_job(count: int, controller: Any, accounts_file: str) -> None:
    global _controller
    try:
        batch = engine.run_registration_common(
            count=count,
            log_callback=_append_log,
            cancel_callback=controller.should_stop,
            accounts_output_file=accounts_file,
            observer=_job_observer,
        )
        _update_progress(batch)
    except Exception as exc:
        with _job_lock:
            _job_state["error"] = str(exc)
        _append_log("[!] WebUI 任务异常: %s" % exc)
    finally:
        with _job_lock:
            _job_state["running"] = False
            _job_state["finished_at"] = time.time()
            _job_state["cancelled"] = bool(
                _job_state["cancelled"] or controller.should_stop()
            )
            _controller = None
        _append_log("[*] WebUI 任务结束")


@app.get("/", include_in_schema=False)
def index():
    html = INDEX_HTML.read_text(encoding="utf-8")
    if PROXY_POOL_CSS.is_file():
        html = html.replace("</head>", '<link rel="stylesheet" href="/proxy-pool.css">\n</head>', 1)
    if PROXY_POOL_JS.is_file():
        html = html.replace("</body>", '<script src="/proxy-pool.js"></script>\n</body>', 1)
    if OUTLOOK_MAILBOX_JS.is_file():
        html = html.replace("</body>", '<script src="/outlook-mailbox.js"></script>\n</body>', 1)
    return HTMLResponse(html, headers={"Cache-Control": "no-store"})


@app.get("/proxy-pool.js", include_in_schema=False)
def proxy_pool_js():
    return FileResponse(PROXY_POOL_JS, media_type="application/javascript", headers={"Cache-Control": "no-store"})


@app.get("/proxy-pool.css", include_in_schema=False)
def proxy_pool_css():
    return FileResponse(PROXY_POOL_CSS, media_type="text/css", headers={"Cache-Control": "no-store"})


@app.get("/outlook-mailbox.js", include_in_schema=False)
def outlook_mailbox_js():
    return FileResponse(OUTLOOK_MAILBOX_JS, media_type="application/javascript", headers={"Cache-Control": "no-store"})


@app.middleware("http")
async def protect_outlook_mailbox_api(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/mailboxes/outlook"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def _require_local_origin(request: Request) -> None:
    origin = str(request.headers.get("origin") or "").strip()
    if not origin:
        return
    from urllib.parse import urlsplit
    host = (urlsplit(origin).hostname or "").lower()
    if host not in {"127.0.0.1", "localhost", "::1"}:
        raise HTTPException(status_code=403, detail="Outlook 邮箱池只允许本地 WebUI 访问")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/config")
def get_config():
    return {"ok": True, "config": _load_config_if_idle()}


@app.put("/api/config")
async def put_config(request: Request):
    updates = await request.json()
    if not isinstance(updates, dict):
        raise HTTPException(status_code=400, detail="配置更新必须是 JSON 对象")

    allowed = set(engine.DEFAULT_CONFIG)
    unknown = sorted(set(updates) - allowed)
    if unknown:
        raise HTTPException(status_code=400, detail="未知配置项: " + ", ".join(unknown))

    with _job_lock:
        if _job_state["running"]:
            raise HTTPException(status_code=409, detail="任务运行期间不能修改配置")
        if _maintenance_state is not None:
            raise HTTPException(status_code=409, detail="维护操作期间不能修改配置")
        engine.load_config()
        candidate = dict(engine.config)
        candidate.update(updates)
        try:
            validated = engine.validate_config_structure(candidate)
        except engine.ConfigError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        engine.config.clear()
        engine.config.update(validated)
        engine.save_config()
        result = dict(engine.config)
    return {"ok": True, "config": result}


@app.get("/api/mailboxes/outlook")
def get_outlook_mailboxes(request: Request):
    _require_local_origin(request)
    from outlook_mailbox_pool import load_outlook_mailbox_pool
    cfg = _load_config_if_idle()
    try:
        summary = load_outlook_mailbox_pool(cfg.get("outlook_accounts_file", ""))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return JSONResponse({
        "ok": True,
        "path": summary["path"],
        "data": summary["data"],
        "count": summary["count"],
        "invalid": summary["invalid"],
        "duplicates": summary["duplicates"],
        "accounts": summary["accounts"],
    })


@app.put("/api/mailboxes/outlook")
async def put_outlook_mailboxes(request: Request):
    _require_local_origin(request)
    payload = await request.json()
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), str):
        raise HTTPException(status_code=400, detail="请求必须包含字符串字段 data")
    from outlook_mailbox_pool import save_outlook_mailbox_pool
    with _job_lock:
        if _job_state["running"]:
            raise HTTPException(status_code=409, detail="任务运行期间不能修改 Outlook 邮箱池")
        if _maintenance_state is not None:
            raise HTTPException(status_code=409, detail="维护操作期间不能修改 Outlook 邮箱池")
        engine.load_config()
        path = engine.config.get("outlook_accounts_file", "")
        try:
            summary = save_outlook_mailbox_pool(path, payload["data"])
        except (ValueError, RuntimeError, OSError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    _append_log("[*] Outlook 邮箱池已保存: %s 个账号" % summary["count"])
    return JSONResponse({"ok": True, **summary})


@app.post("/api/mailboxes/outlook/test")
async def test_outlook_mailboxes(request: Request):
    _require_local_origin(request)
    payload = await request.json()
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), str):
        raise HTTPException(status_code=400, detail="请求必须包含字符串字段 data")
    from outlook_mailbox_pool import probe_outlook_mailbox_pool_data

    kind = "outlook_mailbox_test"
    _begin_maintenance(kind)
    try:
        try:
            summary = await run_in_threadpool(probe_outlook_mailbox_pool_data, payload["data"])
        except (ValueError, RuntimeError, OSError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        _end_maintenance(kind)
    _append_log(
        "[*] Outlook 邮箱池健康检查完成: %s/%s 个账号可用"
        % (summary["healthy"], summary["count"])
    )
    return JSONResponse({"ok": True, **summary})


_bg_probe_hint_lock = threading.Lock()
_bg_probe_hint_at = 0.0


@app.get("/api/proxy-pool/status")
def proxy_pool_status(limit: int = Query(None, ge=1, le=10000), status: str = Query(None)):
    global _bg_probe_hint_at
    from proxy_pool import manager_snapshot
    from proxy_pool_v3 import _load_success_history
    cfg = _load_config_if_idle()
    result = {"ok": True, **manager_snapshot(config=cfg, status=status)}
    # 空闲保鲜（小范围）：待运行状态下只复检「过期 healthy」与「出过号」节点，
    # 不碰未探测节点（留给定时周期/手动测试），避免待机时长时间全量探测和桥进程滚动
    with _job_lock:
        idle = not _job_state["running"] and _maintenance_state is None
    if idle:
        now = time.time()
        with _bg_probe_hint_lock:
            due = now - _bg_probe_hint_at >= 60
            if due:
                _bg_probe_hint_at = now
        if due:
            nodes = result.get("nodes")
            if isinstance(nodes, list):
                success_set = set(result.get("success_node_ids") or ())
                targets = {n.get("id") for n in nodes
                           if n.get("probe_stale") or n.get("id") in success_set}
                targets.discard(None)
            else:
                targets = set()
            if targets:
                def _bg_probe(targets=targets, cfg=cfg):
                    try:
                        from proxy_pool import get_manager
                        get_manager(config=cfg, log=lambda msg: None).probe_all(force=True, only_ids=sorted(targets))
                    except Exception as exc:
                        print("[!] 空闲复检跳过: %s" % exc, flush=True)
                threading.Thread(target=_bg_probe, name="proxy-idle-reprobe", daemon=True).start()
    # 过期标注：healthy 但探测时间超过 freshness（与 _probe_tier 一致）的节点单独标记
    probe_interval = max(0, int(cfg.get("proxy_pool_probe_interval_sec") or 0))
    freshness = max(60.0, probe_interval * 2 if probe_interval > 0 else 300.0)
    now = time.time()
    nodes = result.get("nodes")
    if isinstance(nodes, list):
        for item in nodes:
            if not isinstance(item, dict):
                continue
            probed_at = item.get("last_probed_at")
            try:
                age = now - float(probed_at) if probed_at else None
            except (TypeError, ValueError):
                age = None
            item["probe_age_min"] = round(age / 60) if age is not None and age >= 0 else None
            item["probe_stale"] = bool(
                age is not None and age > freshness and item.get("probe_status") == "healthy"
            )
    try:
        success_ids = [nid for nid, rec in _load_success_history().items()
                       if isinstance(rec, dict) and rec.get("proxy_url")]
        result["success_node_ids"] = success_ids
        result["success_count"] = len(success_ids)
        # 出过号的节点置顶展示，避免被 limit 截断在列表外而看不到高亮
        history = _load_success_history()
        success_set = set(success_ids)
        nodes = result.get("nodes")
        if not isinstance(nodes, list):
            nodes = []
            result["nodes"] = nodes
        listed = {n.get("id") for n in nodes}
        hot_nodes = [n for n in nodes if n.get("id") in success_set]
        # 已被池清理的成功节点：从历史记录合成虚拟行，保证始终可见（研究/复用）
        for nid in success_ids:
            if nid in listed:
                continue
            rec = history.get(nid) or {}
            nodes.insert(0, {
                "id": nid, "source": "success-history", "proxy": rec.get("proxy_url") or "",
                "name": rec.get("name") or "", "protocol": rec.get("protocol") or "",
                "backend": "native", "enabled": False, "rotating": False,
                "health_model": "fixed", "health": None,
                "registration_successes": int(rec.get("successes") or 0),
                "business_samples": 0, "transport_failures": 0, "suspected_failures": 0,
                "configuration_failures": 0, "failure_count": 0, "cooldown_sec": 0,
                "inflight": 0, "retired": True, "probe_status": "unknown",
                "probe_latency_ms": 0, "probe_error": "proven node (out of pool)",
                "probe_age_min": None, "probe_stale": False,
                "exit_ip": rec.get("exit_ip") or "", "ipv4_probe": {}, "ipv6_probe": {},
            })
        result["nodes"] = (hot_nodes
                           + [n for n in nodes if n.get("id") in success_set and n not in hot_nodes]
                           + [n for n in nodes if n.get("id") not in success_set])
    except Exception:
        result["success_node_ids"] = []
        result["success_count"] = 0
    nodes = result.get("nodes")
    if limit is not None and isinstance(nodes, list) and len(nodes) > limit:
        result["nodes"] = nodes[:limit]
        result["nodes_shown"] = len(result["nodes"])
    return result


@app.post("/api/proxy-pool/reload")
def proxy_pool_reload():
    from proxy_pool import get_manager
    kind = "proxy_reload"
    _begin_maintenance(kind)
    try:
        engine.load_config()
        try:
            cfg = engine.validate_config_structure(dict(engine.config))
            manager = get_manager(config=cfg, log=_append_log)
            snapshot = manager.reload_sources(force=True)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        _end_maintenance(kind)
    _append_log("[*] 代理池已重新加载")
    return {"ok": True, **_capped_snapshot(snapshot)}


def _capped_snapshot(payload, cap=500):
    """大池子时截断响应中的节点列表，避免前端渲染上万行卡顿（summary 仍为全量）。"""
    if isinstance(payload, dict) and isinstance(payload.get("nodes"), list) and len(payload["nodes"]) > cap:
        summary = payload.get("summary") if isinstance(payload.get("summary"), dict) else {}
        payload["nodes"] = payload["nodes"][:cap]
        payload["nodes_shown"] = cap
        payload["nodes_total"] = summary.get("total", cap)
    return payload


@app.post("/api/proxy-pool/test")
def proxy_pool_test():
    from proxy_pool import get_manager
    kind = "proxy_test"
    _begin_maintenance(kind)
    try:
        engine.load_config()
        try:
            cfg = engine.validate_config_structure(dict(engine.config))
            manager = get_manager(config=cfg, log=_append_log)
            manager.reload_sources(force=True)
            results = manager.probe_all(force=True, skip_healthy=True)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        _end_maintenance(kind)
    _append_log("[*] 代理池测试完成: %s 个节点（已跳过正常节点）" % len(results))
    return {"ok": True, "results": results, **_capped_snapshot(manager.snapshot())}


@app.post("/api/proxy-pool/prune")
async def proxy_pool_prune(request: Request):
    """批量删除节点。请求体：{"node_ids":["id1","id2"], "only_invalid": false}"""
    from proxy_pool import get_manager
    body = await request.json() if callable(getattr(request, "json", None)) else {}
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="请求体必须是 JSON 对象")
    node_ids = body.get("node_ids", [])
    if not isinstance(node_ids, list) or not node_ids:
        raise HTTPException(status_code=400, detail="node_ids 必须是数组且不为空")
    only_invalid = bool(body.get("only_invalid", True))
    with _job_lock:
        engine.load_config()
        try:
            cfg = engine.validate_config_structure(dict(engine.config))
            manager = get_manager(config=cfg, log=_append_log)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    result = manager.prune_nodes(node_ids, only_invalid=only_invalid)
    _append_log("[*] 代理池批量删除: 移除 %s 个，忽略 %s 个，占用 %s 个" % (result["removed"], result["ignored"], result["inflight"]))
    return {"ok": True, **result, **_capped_snapshot(manager.snapshot())}


@app.post("/api/proxy-pool/preflight")
def proxy_pool_preflight(node_id: str = Query(..., min_length=1)):
    from proxy_pool import get_manager
    kind = "proxy_preflight"
    _begin_maintenance(kind)
    try:
        engine.load_config()
        try:
            cfg = engine.validate_config_structure(dict(engine.config))
            if not cfg.get("proxy_pool_preflight_enabled", True):
                raise HTTPException(status_code=409, detail="注册路径预检已在配置中关闭")
            manager = get_manager(config=cfg, log=_append_log)
            result = manager.preflight_node(node_id)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        _end_maintenance(kind)
    _append_log("[*] 代理节点注册路径预检完成: %s" % node_id)
    return {"ok": True, "result": result, **_capped_snapshot(manager.snapshot())}


@app.get("/api/proxy-success-history")
def get_proxy_success_history():
    """历史成功注册过的代理（永久登记，独立于池清理机制）。"""
    from proxy_pool import get_manager
    from proxy_pool_v3 import _load_success_history
    history = _load_success_history()
    in_pool: dict[str, dict[str, Any]] = {}
    try:
        manager = get_manager(config=_current_config(), log=lambda msg: None)
        nodes = manager.snapshot().get("nodes") or []
        for item in nodes:
            if isinstance(item, dict) and item.get("id"):
                in_pool[str(item["id"])] = {
                    "probe_status": str(item.get("probe_status") or ""),
                    "inflight": int(item.get("inflight") or 0),
                }
    except Exception:
        pass
    entries = []
    for node_id, record in history.items():
        if not isinstance(record, dict) or not record.get("proxy_url"):
            continue
        entry = dict(record)
        entry["node_id"] = str(node_id)
        state = in_pool.get(str(node_id))
        entry["in_pool"] = state is not None
        entry["probe_status"] = state.get("probe_status") if state else ""
        entries.append(entry)
    entries.sort(key=lambda item: (-(item.get("successes") or 0), -(item.get("last_success_at") or 0)))
    return {"ok": True, "count": len(entries), "entries": entries}


@app.post("/api/proxy-success-history/reuse")
async def reuse_proxy_success_history(request: Request):
    """把选中的历史成功代理追加到静态代理池文件，下个注册周期自动入池。"""
    from proxy_pool_v3 import _load_success_history
    payload = await request.json()
    ids = payload.get("node_ids") if isinstance(payload, dict) else None
    if not isinstance(ids, list) or not [i for i in ids if str(i).strip()]:
        raise HTTPException(status_code=400, detail="请求必须包含非空 node_ids 数组")
    history = _load_success_history()
    urls, missing = [], []
    for item in ids:
        record = history.get(str(item))
        if isinstance(record, dict) and str(record.get("proxy_url") or "").strip():
            urls.append(str(record["proxy_url"]).strip())
        else:
            missing.append(str(item))
    if not urls:
        raise HTTPException(status_code=404, detail="所选记录不存在或缺少代理地址")
    with _job_lock:
        if _job_state["running"] or _maintenance_state is not None:
            raise HTTPException(status_code=409, detail="任务运行期间不能修改代理复用清单，请稍后再试")
        config_path = ROOT / "config.json"
        try:
            cfg = json.loads(config_path.read_text(encoding="utf-8"))
        except Exception:
            cfg = dict(engine.config)
        pool_file = str(cfg.get("proxy_pool_file") or "").strip()
        if not pool_file:
            pool_file = str(ROOT / "proxy_manual_pool.txt")
            cfg["proxy_pool_file"] = pool_file
            config_path.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
        pool_path = Path(pool_file)
        if not pool_path.is_absolute():
            pool_path = ROOT / pool_path
        existing = []
        if pool_path.is_file():
            existing = [ln.strip() for ln in pool_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
        added = 0
        for url in urls:
            if url not in existing:
                existing.append(url)
                added += 1
        pool_path.write_text("\n".join(existing) + ("\n" if existing else ""), encoding="utf-8")
    _append_log("[*] 历史成功代理复用: 追加 %s 个节点到 %s" % (added, pool_path.name))
    return {"ok": True, "added": added, "duplicates": len(urls) - added, "pool_file": str(pool_path), "missing": missing}


@app.get("/api/status")
def status():
    return {"ok": True, **_state_snapshot()}


@app.get("/api/logs")
def logs(after: int = Query(default=0, ge=0)):
    with _log_lock:
        entries = [dict(item) for item in _logs if int(item["seq"]) > int(after)]
        latest = int(_log_seq)
    return {"ok": True, "latest": latest, "entries": entries}


@app.post("/api/start")
def start():
    global _job_thread, _controller

    with _job_lock:
        if _job_state["running"]:
            raise HTTPException(status_code=409, detail="已有注册任务正在运行")
        if _maintenance_state is not None:
            raise HTTPException(status_code=409, detail="维护操作进行中，暂不能启动注册: %s" % _maintenance_state)

        engine.load_config()
        try:
            validated = engine.validate_run_requirements(dict(engine.config))
        except engine.ConfigError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        engine.config.clear()
        engine.config.update(validated)

        count = engine.resolve_registration_count(
            int(engine.config["register_count"]), log_callback=_append_log
        )
        controller = engine.CliStopController()
        accounts_file = _new_accounts_file()

        _job_state.update({
            "running": True,
            "target": count,
            "success": 0,
            "fail": 0,
            "pending": 0,
            "warnings": 0,
            "uncertain": 0,
            "cancelled": False,
            "started_at": time.time(),
            "finished_at": None,
            "accounts_file": accounts_file,
            "error": "",
        })
        _reset_g2a_stats()
        _controller = controller
        thread = threading.Thread(
            target=_run_job,
            args=(count, controller, accounts_file),
            name="grok-register-web-job",
            daemon=True,
        )
        _job_thread = thread
        try:
            thread.start()
        except Exception:
            _job_state["running"] = False
            _job_state["finished_at"] = time.time()
            _controller = None
            _job_thread = None
            raise

    _append_log("[*] WebUI 启动注册任务，目标数量: %s" % count)
    return {"ok": True, "started": True, "target": count, "accounts_file": accounts_file}


@app.post("/api/stop")
def stop():
    with _job_lock:
        controller = _controller
        running = bool(_job_state["running"])
    if not running or controller is None:
        return {"ok": True, "stopped": False}
    controller.stop()
    _append_log("[!] WebUI 已发送停止请求")
    return {"ok": True, "stopped": True}


# ---------------------------------------------------------------------------
# 定时自动注册：周期性「重载订阅+探测 → 注册批次 → 邮件通知详细结果」
# ---------------------------------------------------------------------------

def _current_config() -> dict[str, Any]:
    """定时线程专用：读取磁盘最新配置，不触碰共享 engine.config（避免与运行中批次竞态）。"""
    try:
        import json

        from app_config import CONFIG_FILE, validate_config_structure
        with open(CONFIG_FILE, "r", encoding="utf-8") as fh:
            loaded = json.load(fh)
        return validate_config_structure(loaded)
    except Exception:
        return dict(engine.config)


def _try_email(subject: str, body: str) -> None:
    try:
        _send_report_email(subject, body)
        _append_log("[*] 定时自动注册：通知邮件已发送")
    except Exception as exc:
        _append_log("[!] 定时自动注册：通知邮件发送失败: %s" % exc)


def _send_report_email(subject: str, body: str) -> None:
    import smtplib
    from email.header import Header
    from email.mime.text import MIMEText
    cfg = _current_config()
    host = (cfg.get("notify_smtp_host") or "").strip()
    port = int(cfg.get("notify_smtp_port") or 465)
    user = (cfg.get("notify_smtp_user") or "").strip()
    password = str(cfg.get("notify_smtp_pass") or "")
    recipient = (cfg.get("notify_email") or "").strip()
    if not (host and user and password and recipient):
        raise RuntimeError("SMTP 通知未配置完整（notify_smtp_host / notify_smtp_user / notify_smtp_pass / notify_email）")
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = user
    msg["To"] = recipient
    smtp = smtplib.SMTP_SSL(host, port, timeout=30)
    try:
        smtp.login(user, password)
        smtp.sendmail(user, [recipient], msg.as_string())
    finally:
        smtp.quit()


def _auto_batch_cycle() -> None:
    started = time.time()

    def _stamp() -> str:
        return datetime.datetime.now().strftime("%m-%d %H:%M:%S")

    _append_log("[*] 定时自动注册周期开始")
    probe_lines = []
    probe_error = ""
    try:
        result = proxy_pool_test()
        summary = result.get("summary") or {}
        results = result.get("results") or []
        probe_lines.append("本次探测节点: %s" % len(results))
        for key, label in (("total", "池内总数"), ("healthy", "健康"), ("unhealthy", "异常"),
                           ("unknown", "未探测"), ("unavailable", "运行时不可用"), ("inflight", "占用中")):
            if key in summary:
                probe_lines.append("%s: %s" % (label, summary[key]))
        _append_log("[*] 定时自动注册：订阅重载与探测完成")
    except Exception as exc:
        probe_error = str(getattr(exc, "detail", None) or exc)
        _append_log("[!] 定时自动注册：订阅重载/探测失败（保留上次成功节点继续）: %s" % probe_error)

    try:
        r = start()
        target = int(r.get("target") or 0)
        accounts_file = str(r.get("accounts_file") or "")
    except Exception as exc:
        detail = str(getattr(exc, "detail", None) or exc)
        _append_log("[!] 定时自动注册：批次启动失败: %s" % detail)
        _try_email(
            "grok 定时注册: 批次启动失败",
            "定时注册周期在启动批次时失败。\n\n时间: %s\n探测: %s\n错误: %s"
            % (_stamp(), probe_error or "完成", detail),
        )
        return
    _append_log("[*] 定时自动注册：批次已启动，目标 %s 个账号" % target)

    deadline = time.time() + 4 * 3600
    timed_out = True
    while time.time() < deadline:
        with _job_lock:
            if not _job_state["running"]:
                timed_out = False
                break
        time.sleep(10)
    if timed_out:
        _append_log("[!] 定时自动注册：批次超过 4 小时未结束，发送超时报告")

    with _job_lock:
        snap = dict(_job_state)
    account_lines = []
    if accounts_file and os.path.exists(accounts_file):
        try:
            with open(accounts_file, "r", encoding="utf-8") as fh:
                account_lines = [ln.rstrip("\n") for ln in fh if ln.strip()]
        except Exception:
            account_lines = []
    elapsed = int(time.time() - started)
    g2a = _g2a_stats_snapshot()
    g2a_fail_total = sum(int(entry.get("fail") or 0) for entry in g2a.values())
    g2a_suffix = "，grok2api 入池失败 %s" % g2a_fail_total if g2a_fail_total else ""
    subject = "grok 定时注册报告: 成功 %s / 目标 %s%s%s" % (
        snap.get("success"), snap.get("target"), "（超时未结束）" if timed_out else "", g2a_suffix)
    parts = [
        "定时自动注册周期报告", "",
        "周期开始: %s" % _stamp(),
        "用时: %d 分 %d 秒" % (elapsed // 60, elapsed % 60),
        "目标: %s  成功: %s  失败: %s" % (snap.get("target"), snap.get("success"), snap.get("fail")),
        "注册成功未保存: %s  不确定: %s  后处理警告: %s" % (
            snap.get("pending"), snap.get("uncertain"), snap.get("warnings")),
        "取消: %s" % snap.get("cancelled"),
    ]
    if snap.get("error"):
        parts.append("任务错误: %s" % snap["error"])
    parts.extend(["", "── 代理订阅与探测 ──"])
    parts.extend(probe_lines or ["（无探测数据）"])
    if probe_error:
        parts.append("探测错误: %s" % probe_error)
    g2a = _g2a_stats_snapshot()
    parts.extend(["", "── grok2api 入池 ──"])
    if not g2a:
        parts.append("未启用 grok2api 自动入池")
    else:
        for name in ("local", "remote"):
            entry = g2a.get(name)
            if entry is None:
                continue
            label = "本地池" if name == "local" else "远端池"
            parts.append("%s: 成功 %s / 失败 %s" % (label, entry["ok"], entry["fail"]))
            for error in entry["errors"][:3]:
                parts.append("  失败原因: %s" % error[:160])
            if len(entry["errors"]) > 3:
                parts.append("  … 其余 %s 种错误见服务器日志" % (len(entry["errors"]) - 3))
    parts.extend(["", "── 本批账号明细（%s 行）──" % len(account_lines)])
    parts.extend(account_lines[:50])
    if len(account_lines) > 50:
        parts.append("… 其余 %s 行见服务器 accounts 文件" % (len(account_lines) - 50))
    _try_email(subject, "\n".join(parts))


def _auto_batch_loop() -> None:
    _append_log("[*] 定时自动注册线程已启动（周期: 重载订阅+探测 → 注册批次 → 邮件报告）")
    first_wait_sec = 60
    was_enabled = False
    while True:
        try:
            cfg = _current_config()
            enabled = bool(cfg.get("auto_batch_enabled"))
            interval = max(int(cfg.get("auto_batch_interval_min") or 120), 30) * 60
        except Exception:
            enabled, interval = False, 7200
        if not enabled:
            was_enabled = False
            time.sleep(30)
            continue
        # 刚启用时 60 秒后执行首个周期，之后按完整间隔轮转
        wait = first_wait_sec if not was_enabled else interval
        was_enabled = True
        deadline = time.time() + wait
        while time.time() < deadline:
            time.sleep(min(10, max(deadline - time.time(), 0.5)))
            try:
                if not bool(_current_config().get("auto_batch_enabled")):
                    break
            except Exception:
                pass
        try:
            if bool(_current_config().get("auto_batch_enabled")):
                with _job_lock:
                    running = bool(_job_state["running"])
                if running:
                    _append_log("[*] 定时自动注册：上一批次仍在运行，本轮跳过")
                    continue
                _auto_batch_cycle()
        except Exception as exc:
            _append_log("[!] 定时自动注册周期异常: %s" % exc)


@app.on_event("startup")
def _start_auto_batch_thread() -> None:
    threading.Thread(target=_auto_batch_loop, name="auto-batch-scheduler", daemon=True).start()


def main() -> None:
    import uvicorn

    uvicorn.run("web.server:app", host="0.0.0.0", port=8092, workers=1)


if __name__ == "__main__":
    main()
