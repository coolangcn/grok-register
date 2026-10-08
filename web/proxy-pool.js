(() => {
  'use strict';

  const proxyFields = [
    ['proxy_mode','select',['auto','direct','single','pool']],
    ['proxy','text','full'],
    ['proxy_fallback','select',['none','direct','single']],
    ['proxy_pool_endpoint_mode','select',['auto','fixed','rotating']],
    ['proxy_pool_file','text','full'],
    ['proxy_pool_subscription_url','text','full'],
    ['proxy_pool_subscription_proxy','text','full'],
    ['proxy_pool_refresh_interval_sec','number',{min:0,max:86400}],
    ['proxy_pool_probe_interval_sec','number',{min:0,max:86400}],
    ['proxy_pool_probe_timeout_sec','number',{min:3,max:120}],
    ['proxy_pool_probe_provider','select',['cloudflare','ipinfo','xai']],
    ['proxy_pool_probe_dual_stack','checkbox'],
    ['proxy_pool_max_concurrent_per_node','number',{min:1,max:64}],
    ['proxy_pool_acquire_timeout_sec','number',{min:1,max:600}],
    ['proxy_protocol_backend','select',['auto','sing-box','native-only']],
    ['proxy_singbox_path','text','full'],
    ['proxy_protocol_start_timeout_sec','number',{min:3,max:60}],
    ['proxy_runtime_idle_ttl_sec','number',{min:0,max:3600}],
    ['proxy_runtime_cache_max','number',{min:1,max:256}],
    ['proxy_pool_persist_health','checkbox'],
    ['proxy_pool_state_file','text','full'],
    ['proxy_pool_subscription_public_only','checkbox'],
    ['proxy_pool_preflight_enabled','checkbox'],
  ];

  const zh = {
    tabProxy:'代理池', proxyReload:'重新加载', proxyTest:'测试节点', proxyStatus:'代理节点状态',
    proxyEmpty:'暂无代理节点', proxyNode:'节点', proxyRunHealth:'运行健康', proxyProbeStatus:'探测状态',
    proxyLatency:'探测延迟', proxyExitIP:'出口 IP', proxyInflight:'占用', proxyFailures:'失败',
    proxyCooldown:'冷却', proxyType:'类型', proxyProtocol:'协议', proxyBackend:'后端',
    proxySourceSummary:'订阅解析', proxyError:'最近错误', probeHealthy:'正常', probeUnhealthy:'异常',
    probeUnknown:'未探测', probeUnavailable:'运行时不可用', noBusinessSamples:'未产生业务样本', failedAfter:'后失败',
    proxyIPv4:'IPv4', proxyIPv6:'IPv6', proxyGatewayRate:'出口成功率', proxySamples:'样本',
    proxySelectAll:'全选', proxyBatchDelete:'批量删除无效节点', proxyBatchDeleteSelected:'删除选中',
    proxyDeleteConfirm:'确定删除选中的 {n} 个节点？', proxyDeleteResult:'已删除 {n} 个节点',
    proxySelectInvalid:'仅选无效', proxySummary:'统计概览', proxyTotal:'总计', proxyRetired:'已退役',
  };
  const en = {
    tabProxy:'Proxy pool', proxyReload:'Reload', proxyTest:'Test nodes', proxyStatus:'Proxy node status',
    proxyEmpty:'No proxy nodes', proxyNode:'Node', proxyRunHealth:'Runtime health', proxyProbeStatus:'Probe status',
    proxyLatency:'Probe latency', proxyExitIP:'Exit IP', proxyInflight:'Inflight', proxyFailures:'Failures',
    proxyCooldown:'Cooldown', proxyType:'Type', proxyProtocol:'Protocol', proxyBackend:'Backend',
    proxySourceSummary:'Subscription parse', proxyError:'Last error', probeHealthy:'Healthy', probeUnhealthy:'Unhealthy',
    probeUnknown:'Not probed', probeUnavailable:'Runtime unavailable', noBusinessSamples:'No business samples', failedAfter:'to failure',
    proxyIPv4:'IPv4', proxyIPv6:'IPv6', proxyGatewayRate:'Exit success', proxySamples:'Samples',
    proxySelectAll:'Select all', proxyBatchDelete:'Batch delete invalid', proxyBatchDeleteSelected:'Delete selected',
    proxyDeleteConfirm:'Delete {n} selected nodes?', proxyDeleteResult:'Deleted {n} nodes',
    proxySelectInvalid:'Select invalid', proxySummary:'Summary', proxyTotal:'Total', proxyRetired:'Retired',
  };
  Object.assign(i18n.zh, zh); Object.assign(i18n.en, en);
  Object.assign(i18n.zh.fields, {
    proxy_mode:['代理模式','auto 保持旧配置兼容；single/pool 启用账号级代理租约。'],
    proxy:['固定代理 / 单代理','auto 兼容旧代理；single 模式或 single fallback 使用。'],
    proxy_fallback:['代理池回退','none / direct / single。只在新账号租约获取前回退。'],
    proxy_pool_endpoint_mode:['节点类型','auto 会将含 {account} 的原生代理地址视为旋转代理入口。'],
    proxy_pool_file:['代理池文件','支持 HTTP/HTTPS/SOCKS/VLESS/VMess/Trojan/Hysteria2/TUIC/Shadowsocks；也支持 Base64 订阅文本。'],
    proxy_pool_subscription_url:['代理订阅 URL','支持普通文本或整份 Base64 编码的多协议节点订阅；刷新失败保留最近一次成功节点。'],
    proxy_pool_subscription_proxy:['订阅拉取代理','仅用于下载代理订阅，只接受 HTTP/HTTPS/SOCKS，可留空。'],
    proxy_pool_refresh_interval_sec:['订阅刷新间隔（秒）','0 表示关闭自动刷新。'],
    proxy_pool_probe_interval_sec:['健康探测间隔（秒）','0 表示关闭定期探测。探测状态与运行健康分相互独立。'],
    proxy_pool_probe_timeout_sec:['探测超时（秒）','单节点连通性检查超时。'],
    proxy_pool_probe_provider:['探测服务','cloudflare/ipinfo 仅验证连通性和出口 IP；xai 会额外用 Chrome 指纹访问 accounts.x.ai 注册页，要求 2xx 且未被风控拦截。'],
    proxy_pool_probe_dual_stack:['双栈探测','分别执行 IPv4 / IPv6 连通性探测。'],
    proxy_pool_max_concurrent_per_node:['单节点最大并发','默认 1，避免多个注册 Session 共用同一固定出口。'],
    proxy_pool_acquire_timeout_sec:['租约等待超时（秒）','代理被占用或冷却时等待可用节点的最长时间。'],
    proxy_protocol_backend:['高级协议后端','auto：原生 HTTP/SOCKS 通过统一 HTTP endpoint 使用，高级协议自动通过 sing-box；native-only 禁用高级协议。'],
    proxy_singbox_path:['sing-box 路径','留空时从 PATH 自动寻找 sing-box；VLESS/VMess/Trojan/Hysteria2/TUIC/Shadowsocks 使用。'],
    proxy_protocol_start_timeout_sec:['高级协议启动超时（秒）','等待本地 sing-box HTTP 出口就绪的最长时间。'],
    proxy_runtime_idle_ttl_sec:['运行时空闲缓存（秒）','引用数归零后继续保留一段时间，避免重复启动 bridge / sing-box；0 表示立即关闭。'],
    proxy_runtime_cache_max:['运行时缓存上限','空闲运行时超过上限时优先清理最久未使用项。'],
    proxy_pool_persist_health:['持久化代理健康','把固定节点的业务健康统计保存到本地 JSON。'],
    proxy_pool_state_file:['健康状态文件','仅在启用健康持久化时使用。'],
    proxy_pool_subscription_public_only:['订阅仅允许公网','启用后拒绝解析到私网/回环/保留地址的订阅 URL 和重定向。'],
    proxy_pool_preflight_enabled:['注册路径预检','保留非破坏性的 accounts.x.ai / grok.com 可达性预检能力。'],
  });
  Object.assign(i18n.en.fields, {
    proxy_mode:['Proxy mode','auto preserves legacy behavior; single/pool enables account-scoped leases.'],
    proxy:['Fixed / single proxy','Used by legacy auto mode, single mode, or single fallback.'],
    proxy_fallback:['Pool fallback','none / direct / single; applied only before a new account lease starts.'],
    proxy_pool_endpoint_mode:['Endpoint type','auto treats native URLs containing {account} as rotating gateways.'],
    proxy_pool_file:['Proxy pool file','Supports HTTP/HTTPS/SOCKS/VLESS/VMess/Trojan/Hysteria2/TUIC/Shadowsocks and Base64 subscription text.'],
    proxy_pool_subscription_url:['Subscription URL','Plain/Base64 multi-protocol source; failed refreshes retain last-known-good nodes.'],
    proxy_pool_subscription_proxy:['Subscription fetch proxy','Used only to download the subscription; HTTP/HTTPS/SOCKS only.'],
    proxy_pool_refresh_interval_sec:['Refresh interval (seconds)','0 disables automatic source refresh.'],
    proxy_pool_probe_interval_sec:['Probe interval (seconds)','0 disables periodic probes. Probe status is independent from runtime health.'],
    proxy_pool_probe_timeout_sec:['Probe timeout (seconds)','Timeout for one connectivity probe.'],
    proxy_pool_probe_provider:['Probe provider','cloudflare/ipinfo only verify connectivity and exit IP; xai additionally opens the accounts.x.ai sign-up page with a Chrome fingerprint and requires HTTP 2xx without risk-control interception.'],
    proxy_pool_probe_dual_stack:['Dual-stack probe','Probe IPv4 and IPv6 connectivity independently.'],
    proxy_pool_max_concurrent_per_node:['Max sessions per node','Defaults to 1 to avoid sharing one fixed exit across account sessions.'],
    proxy_pool_acquire_timeout_sec:['Lease wait timeout (seconds)','Maximum wait while nodes are busy or cooling down.'],
    proxy_protocol_backend:['Advanced protocol backend','auto normalizes native proxies and routes advanced protocols through sing-box; native-only disables advanced protocols.'],
    proxy_singbox_path:['sing-box path','Leave blank to resolve from PATH; used by VLESS/VMess/Trojan/Hysteria2/TUIC/Shadowsocks.'],
    proxy_protocol_start_timeout_sec:['Advanced protocol startup timeout','Maximum wait for the local sing-box HTTP endpoint to become ready.'],
    proxy_runtime_idle_ttl_sec:['Runtime idle TTL','Keep idle bridge/sing-box runtimes for reuse; 0 closes immediately.'],
    proxy_runtime_cache_max:['Runtime cache limit','Evict oldest idle runtimes after this limit.'],
    proxy_pool_persist_health:['Persist proxy health','Persist fixed-node business health to local JSON.'],
    proxy_pool_state_file:['Health state file','Used only when health persistence is enabled.'],
    proxy_pool_subscription_public_only:['Public-only subscription','Reject subscription URLs/redirects resolving to private, loopback or reserved addresses.'],
    proxy_pool_preflight_enabled:['Registration preflight','Keep non-destructive accounts.x.ai / grok.com path preflight available.'],
  });

  icons.proxy = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 11l8-4M8 13l8 4"/></svg>';
  fieldDefs.basic = fieldDefs.basic.filter(([key]) => key !== 'proxy');
  fieldDefs.proxy = proxyFields;
  tabMeta.proxy = ['tabProxy','proxy'];
  renderFields();
  applyLanguage();

  const proxyTab = document.querySelector('[data-tabkey="tabProxy"]');
  const basicTab = document.querySelector('[data-tabkey="tabBasic"]');
  if (proxyTab && basicTab && basicTab.nextSibling !== proxyTab) basicTab.after(proxyTab);
  const proxySection = document.getElementById('sec-proxy');
  const basicSection = document.getElementById('sec-basic');
  if (proxySection && basicSection && basicSection.nextSibling !== proxySection) basicSection.after(proxySection);

  if (proxySection) {
    const shell = document.createElement('div');
    shell.className = 'proxy-status-shell';
    shell.innerHTML = `
      <div class="proxy-status-head">
        <strong data-i18n="proxyStatus">${t('proxyStatus')}</strong>
        <div class="proxy-status-actions">
          <button type="button" id="proxyReloadBtn" class="mini-btn"><span data-i18n="proxyReload">${t('proxyReload')}</span></button>
          <button type="button" id="proxyTestBtn" class="mini-btn"><span data-i18n="proxyTest">${t('proxyTest')}</span></button>
          <button type="button" id="proxySelectInvalidBtn" class="mini-btn" style="opacity:0.7" disabled><span data-i18n="proxySelectInvalid">${t('proxySelectInvalid')}</span></button>
          <button type="button" id="proxyPruneBtn" class="mini-btn mini-btn-danger" style="opacity:0.7" disabled><span data-i18n="proxyBatchDeleteSelected">${t('proxyBatchDeleteSelected')}</span></button>
        </div>
      </div>
      <div id="proxyPoolSummary" class="proxy-summary"></div>
      <div id="proxySourceSummary" class="proxy-summary"></div>
      <div id="proxyStatsSummary" class="proxy-stats"><span class="proxy-stats-label" data-i18n="proxySummary">${t('proxySummary')}</span>: <span id="proxyStatsContent"></span></div>
      <div class="proxy-table-wrap"><table class="proxy-table"><thead><tr>
        <th style="width:32px"><input type="checkbox" id="proxySelectAll" title="${t('proxySelectAll')}"></th>
        <th data-i18n="proxyNode">${t('proxyNode')}</th><th data-i18n="proxyProtocol">${t('proxyProtocol')}</th>
        <th data-i18n="proxyBackend">${t('proxyBackend')}</th><th data-i18n="proxyType">${t('proxyType')}</th>
        <th data-i18n="proxyProbeStatus">${t('proxyProbeStatus')}</th><th data-i18n="proxyRunHealth">${t('proxyRunHealth')}</th>
        <th data-i18n="proxyLatency">${t('proxyLatency')}</th><th data-i18n="proxyExitIP">${t('proxyExitIP')}</th>
        <th data-i18n="proxyInflight">${t('proxyInflight')}</th><th data-i18n="proxyFailures">${t('proxyFailures')}</th>
        <th data-i18n="proxyCooldown">${t('proxyCooldown')}</th><th data-i18n="proxyError">${t('proxyError')}</th>
      </tr></thead><tbody id="proxyPoolRows"></tbody></table></div>`;
    proxySection.appendChild(shell);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function renderSourceSummary(data) {
    const target = document.getElementById('proxySourceSummary'); if (!target) return;
    const sources = data && data.sources && typeof data.sources === 'object' ? data.sources : {}; const parts = [];
    for (const key of ['subscription','file']) {
      const source = sources[key]; if (!source || typeof source !== 'object') continue;
      const counts = source.protocol_counts || {}; const protocolText = Object.entries(counts).map(([name,count]) => `${name}:${count}`).join(' · ');
      parts.push(`${key}: ${source.supported || 0}/${source.total_lines || 0}${source.decoded_base64 ? ' · Base64' : ''}${protocolText ? ' · '+protocolText : ''}${source.skipped ? ' · skipped:'+source.skipped : ''}${source.stale ? ' · LKG(stale)' : ''}${source.error ? ' · '+source.error : ''}`);
    }
    target.textContent = parts.join(' || ');
  }
  function probeText(status) {
    if (status === 'healthy') return t('probeHealthy'); if (status === 'unhealthy') return t('probeUnhealthy');
    if (status === 'unavailable') return t('probeUnavailable'); return t('probeUnknown');
  }
  function familyText(node, key) {
    const p = node[key] || {}; if (!p.status || p.status === 'unknown') return `${key === 'ipv4_probe' ? 'IPv4' : 'IPv6'} —`;
    return `${key === 'ipv4_probe' ? 'IPv4' : 'IPv6'} ${probeText(p.status)}${p.latency_ms ? ' '+p.latency_ms+'ms' : ''}${p.exit_ip ? ' '+p.exit_ip : ''}`;
  }

  function renderStatsSummary(data) {
    const el = document.getElementById('proxyStatsContent'); if (!el) return;
    const s = data && data.summary; if (!s) { el.textContent = ''; return; }
    const parts = [];
    parts.push(`${t('proxyTotal')}: ${s.total}`);
    const byProbe = s.by_probe_status || {};
    if (byProbe.healthy) parts.push(`\u2705 ${t('probeHealthy')}: ${byProbe.healthy}`);
    if (byProbe.unhealthy) parts.push(`\u274c ${t('probeUnhealthy')}: ${byProbe.unhealthy}`);
    if (byProbe.unknown) parts.push(`\u2753 ${t('probeUnknown')}: ${byProbe.unknown}`);
    if (byProbe.unavailable) parts.push(`\u26a0 ${t('probeUnavailable')}: ${byProbe.unavailable}`);
    if (s.retired) parts.push(`\u{1f504} ${t('proxyRetired')}: ${s.retired}`);
    if (s.inflight) parts.push(`\u{1f4e1} ${t('proxyInflight')}: ${s.inflight}`);
    const byProto = s.by_protocol || {};
    const protoParts = Object.entries(byProto).map(([k,v]) => `${k}:${v}`);
    if (protoParts.length) parts.push(`\u{1f4cb} ${t('proxyProtocol')}: ${protoParts.join(' / ')}`);
    const byBackend = s.by_backend || {};
    const backendParts = Object.entries(byBackend).map(([k,v]) => `${k}:${v}`);
    if (backendParts.length) parts.push(`\u2699 ${t('proxyBackend')}: ${backendParts.join(' / ')}`);
    const byModel = s.by_health_model || {};
    const modelParts = Object.entries(byModel).map(([k,v]) => `${k}:${v}`);
    if (modelParts.length) parts.push(`\u{1f4ca} ${t('proxyType')}: ${modelParts.join(' / ')}`);
    el.textContent = parts.join(' | ');
  }

  function renderProxyStatus(data) {
    const rows = document.getElementById('proxyPoolRows'); const summary = document.getElementById('proxyPoolSummary'); if (!rows || !summary) return;
    const nodes = Array.isArray(data.nodes) ? data.nodes : [];
    summary.textContent = `${data.mode || 'auto'} · ${nodes.length} nodes${data.persist_health ? ' · persisted health' : ''}`;
    renderSourceSummary(data);
    renderStatsSummary(data);
    if (!nodes.length) { rows.innerHTML = `<tr><td colspan="13" class="proxy-empty">${esc(t('proxyEmpty'))}</td></tr>`; return; }
    rows.innerHTML = nodes.map(node => {
      const status = node.probe_status === 'healthy' ? 'good' : (node.probe_status === 'unhealthy' || node.probe_status === 'unavailable') ? 'bad' : '';
      const label = node.name ? `${node.name} · ${node.proxy}` : node.proxy; const samples = Number(node.business_samples || 0);
      const health = node.rotating
        ? `${t('proxyGatewayRate')}: ${node.gateway_success_rate == null ? '—' : Math.round(Number(node.gateway_success_rate)*1000)/10+'%'} · exits=${Number(node.exit_successes||0)+Number(node.exit_failures||0)}`
        : (samples > 0 ? `${node.health} · n=${samples}` : `— · ${t('noBusinessSamples')}`);
      const latency = `${familyText(node,'ipv4_probe')} / ${familyText(node,'ipv6_probe')}`;
      const error = node.probe_error || node.last_error || '—';
      const failures = node.rotating ? `${node.exit_failures || 0} exits` : `${node.failure_count || 0} · transport=${node.transport_failures || 0} · config=${node.configuration_failures || 0}`;
      return `<tr>
        <td><input type="checkbox" class="proxy-node-cb" data-id="${esc(node.id)}" data-status="${esc(node.probe_status)}"></td>
        <td title="${esc(node.id)}"><span class="proxy-dot ${status}"></span>${esc(label)}</td>
        <td>${esc(node.protocol || '—')}</td><td>${esc(node.backend || 'native')}</td>
        <td>${node.rotating ? 'rotating gateway' : 'fixed'}</td><td>${esc(probeText(node.probe_status))}</td>
        <td>${esc(health)}</td><td>${esc(latency)}</td><td>${esc(node.exit_ip || '—')}</td>
        <td>${esc(node.inflight)}</td><td>${esc(failures)}</td><td>${node.rotating ? 'N/A' : (node.cooldown_sec ? esc(node.cooldown_sec)+' s' : '—')}</td>
        <td title="${esc(error)}">${esc(error)}</td>
      </tr>`;
    }).join('');
    // Sync select-all with checkbox state
    updatePruneButtonState();
  }

  function updatePruneButtonState() {
    const cbs = document.querySelectorAll('.proxy-node-cb:checked');
    const btn = document.getElementById('proxyPruneBtn');
    const selectBtn = document.getElementById('proxySelectInvalidBtn');
    if (btn) btn.disabled = cbs.length === 0;
    if (btn) btn.style.opacity = cbs.length === 0 ? '0.7' : '1';
    if (selectBtn) selectBtn.disabled = false;
    if (selectBtn) selectBtn.style.opacity = '1';
  }

  function getSelectedNodeIds(onlyInvalid) {
    const cbs = document.querySelectorAll('.proxy-node-cb');
    const ids = [];
    for (const cb of cbs) {
      if (cb.checked) ids.push(cb.dataset.id);
      else if (onlyInvalid !== true && !cb.checked) continue;
      else if (onlyInvalid === true && cb.dataset.status !== 'healthy') ids.push(cb.dataset.id);
    }
    return ids;
  }

  function selectAllInvalidNodes() {
    const cbs = document.querySelectorAll('.proxy-node-cb');
    for (const cb of cbs) {
      cb.checked = cb.dataset.status !== 'healthy';
    }
    updatePruneButtonState();
  }

  async function refreshProxyStatus() {
    try { const r = await fetch('/api/proxy-pool/status'); if (!r.ok) return; renderProxyStatus(await r.json()); } catch (_) {}
  }
  async function proxyAction(path) {
    if (dirty.size && !await saveConfig()) return;
    const reload = document.getElementById('proxyReloadBtn'); const test = document.getElementById('proxyTestBtn');
    const prune = document.getElementById('proxyPruneBtn'); const selectBtn = document.getElementById('proxySelectInvalidBtn');
    if (reload) reload.disabled = true; if (test) test.disabled = true; if (prune) prune.disabled = true; if (selectBtn) selectBtn.disabled = true;
    try { const r = await fetch(path,{method:'POST'}); const d = await r.json(); if (!r.ok) setNotice(d.detail || 'Proxy pool operation failed', true); else { renderProxyStatus(d); setNotice(''); } }
    catch (e) { setNotice(e.message, true); }
    finally { if (reload) reload.disabled = !!running; if (test) test.disabled = !!running; updatePruneButtonState(); }
  }
  async function proxyPruneAction() {
    if (dirty.size && !await saveConfig()) return;
    const ids = getSelectedNodeIds();
    if (!ids.length) { setNotice(t('proxyBatchDeleteSelected') + ': no nodes selected', true); return; }
    if (!confirm(t('proxyDeleteConfirm').replace('{n}', ids.length))) return;
    const prune = document.getElementById('proxyPruneBtn'); const reload = document.getElementById('proxyReloadBtn'); const test = document.getElementById('proxyTestBtn'); const selectBtn = document.getElementById('proxySelectInvalidBtn');
    if (prune) prune.disabled = true; if (reload) reload.disabled = true; if (test) test.disabled = true; if (selectBtn) selectBtn.disabled = true;
    try {
      const r = await fetch('/api/proxy-pool/prune', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({node_ids: ids, only_invalid: false})});
      const d = await r.json();
      if (!r.ok) setNotice(d.detail || 'Prune failed', true);
      else { renderProxyStatus(d); setNotice(t('proxyDeleteResult').replace('{n}', d.removed || 0)); }
    } catch (e) { setNotice(e.message, true); }
    finally { if (reload) reload.disabled = !!running; if (test) test.disabled = !!running; if (selectBtn) selectBtn.disabled = false; if (selectBtn) selectBtn.style.opacity = '1'; updatePruneButtonState(); }
  }

  function setupEventListeners() {
    // Select-all checkbox
    const selectAll = document.getElementById('proxySelectAll');
    if (selectAll) {
      selectAll.addEventListener('change', function() {
        const checked = this.checked;
        document.querySelectorAll('.proxy-node-cb').forEach(cb => cb.checked = checked);
        updatePruneButtonState();
      });
      // Delegate click on table body to auto-uncheck select-all when any row cb changes
      document.getElementById('proxyPoolRows').addEventListener('change', function(e) {
        if (e.target && e.target.classList.contains('proxy-node-cb')) {
          const all = document.querySelectorAll('.proxy-node-cb');
          const checked = document.querySelectorAll('.proxy-node-cb:checked');
          if (selectAll) selectAll.checked = all.length > 0 && all.length === checked.length;
          updatePruneButtonState();
        }
      });
    }
    // Select invalid button
    const selectBtn = document.getElementById('proxySelectInvalidBtn');
    if (selectBtn) selectBtn.onclick = selectAllInvalidNodes;
    // Prune button
    const pruneBtn = document.getElementById('proxyPruneBtn');
    if (pruneBtn) pruneBtn.onclick = proxyPruneAction;
  }

  const reloadBtn = document.getElementById('proxyReloadBtn'); const testBtn = document.getElementById('proxyTestBtn');
  if (reloadBtn) reloadBtn.onclick = () => proxyAction('/api/proxy-pool/reload');
  if (testBtn) testBtn.onclick = () => proxyAction('/api/proxy-pool/test');
  loadConfig().catch(e => setNotice(e.message,true));
  refreshProxyStatus();
  setupEventListeners();
  setInterval(() => {
    if (reloadBtn) reloadBtn.disabled = !!running;
    if (testBtn) testBtn.disabled = !!running;
    refreshProxyStatus();
  }, 2000);
})();