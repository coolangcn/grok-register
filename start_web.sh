#!/bin/bash
# ============================================================
# 一键启动 Web 服务
#  1. 清理占用端口的旧进程（含孤儿 uvicorn/python 进程）
#  2. 后台启动 web.server，等待端口就绪
# ============================================================
PORT=8092
WORKDIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$WORKDIR/web_server.log"

cd "$WORKDIR"

# 优先使用已安装依赖的 Anaconda Python
PYTHON=/Users/mac/anaconda3/bin/python3
if [ ! -x "$PYTHON" ]; then
  PYTHON="$(command -v python3)"
fi
echo "[0/3] 使用 Python: $PYTHON"

echo "[1/3] 检查并清理旧进程..."
# 1) 占用 8092 端口的进程
OLD_PIDS="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)"
# 2) 残留的 web.server / uvicorn 进程（防止端口未占满但仍在运行的孤儿进程）
STALE_PIDS="$(pgrep -f "web\.server" 2>/dev/null || true)"
ALL_PIDS="$(printf '%s\n%s\n' "$OLD_PIDS" "$STALE_PIDS" | sort -un | grep -v '^$' || true)"

if [ -n "$ALL_PIDS" ]; then
  echo "   清理进程: $(echo $ALL_PIDS | tr '\n' ' ')"
  echo "$ALL_PIDS" | xargs kill 2>/dev/null || true
  # 等待进程真正退出（优雅关闭可能被长连接卡住），最多 5 秒
  for i in $(seq 1 5); do
    ALIVE=""
    for pid in $ALL_PIDS; do
      kill -0 "$pid" 2>/dev/null && ALIVE="$ALIVE $pid"
    done
    [ -z "$ALIVE" ] && break
    sleep 1
  done
  # 仍有存活（或端口仍被占用）则强制 kill -9
  REMAIN_PIDS=""
  for pid in $ALL_PIDS; do
    kill -0 "$pid" 2>/dev/null && REMAIN_PIDS="$REMAIN_PIDS $pid"
  done
  REMAIN_PORT="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)"
  FORCE_PIDS="$(printf '%s\n%s\n' "$REMAIN_PIDS" "$REMAIN_PORT" | sort -un | grep -v '^$' || true)"
  if [ -n "$FORCE_PIDS" ]; then
    echo "   进程未退出（可能被长连接卡住），强制终止: $(echo $FORCE_PIDS | tr '\n' ' ')"
    echo "$FORCE_PIDS" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
else
  echo "   无残留进程，端口 $PORT 空闲"
fi

echo "[2/3] 后台启动 Web 服务 (0.0.0.0:$PORT)..."
nohup "$PYTHON" -m web.server > "$LOG" 2>&1 &

echo "[3/3] 等待服务就绪..."
for i in $(seq 1 60); do
  if curl -s -o /dev/null -m 2 "http://127.0.0.1:$PORT/"; then
    LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '?')"
    echo ""
    echo "  ✓ 服务启动成功"
    echo "    本机访问 : http://127.0.0.1:$PORT"
    echo "    局域网访问: http://$LAN_IP:$PORT"
    echo "    日志文件 : $LOG"
    exit 0
  fi
  sleep 1
done

echo "  ✗ 服务启动超时，请查看日志:"
tail -20 "$LOG"
exit 1
