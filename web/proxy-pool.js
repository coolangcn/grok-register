(() => {
  'use strict';

  const proxyFields = [
    ['proxy_mode','select',['auto','direct','single','pool']],
    ['proxy','text','full'],
    ['proxy_fallback','select',['none','direct','single']],
    ['proxy_pool_endpoint_mode','select',['auto','fixed','rotating']],
    ['proxy_pool_file','text','full'],
    ['proxy_pool_subscription_url','textarea','full'],
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

  const scheduleFields = [
    ['auto_batch_enabled','checkbox'],
    ['auto_batch_interval_min','number',{min:30,max:1440}],
    ['notify_email','text','full'],
    ['notify_smtp_host','text'],
    ['notify_smtp_port','number',{min:1,max:65535}],
    ['notify_smtp_user','text'],
    ['notify_smtp_pass','password'],
  ];

  const zh = {
    tabProxy:'代理设置', tabProxyNodes:'代理节点', tabSchedule:'定时任务', tabSuccess:'成功代理', proxyReload:'重新加载', proxyTest:'测试节点', proxyStatus:'代理节点状态',
    proxyEmpty:'暂无代理节点', proxyNode:'节点', proxyRunHealth:'运行健康', proxyProbeStatus:'探测状态',
    proxyLatency:'探测延迟', proxyExitIP:'出口 IP', proxyInflight:'占用', proxyFailures:'失败',
    proxyCooldown:'冷却', proxyType:'类型', proxyProtocol:'协议', proxyBackend:'后端',
    proxySourceSummary:'订阅解析', proxyError:'最近错误', probeHealthy:'正常', probeUnhealthy:'异常',
    probeUnknown:'未探测', probeUnavailable:'运行时不可用', noBusinessSamples:'未产生业务样本', failedAfter:'后失败',
    proxyIPv4:'IPv4', proxyIPv6:'IPv6', proxyGatewayRate:'出口成功率', proxySamples:'样本',
    proxySelectAll:'全选', proxyBatchDelete:'批量删除无效节点', proxyBatchDeleteSelected:'删除选中',
    proxyDeleteConfirm:'确定删除选中的 {n} 个节点？', proxyDeleteResult:'已删除 {n} 个节点', proxyOpDone:'操作完成', proxyRuntime:'协议运行时', proxyNoRuntime:'无运行中桥接', proxyRunMode:'运行模式', proxyRunCapacity:'容量', proxyRunBusy:'忙碌租约', proxyMaintenanceIdle:'空闲', proxyMaintenanceActive:'进行中', proxyUnmanaged:'未接管', proxyPreflight:'预检', proxyActions:'操作', proxyPreflightDone:'预检通过', proxyPreflightFail:'预检失败', proxyCopied:'已复制代理',
    proxySelectInvalid:'仅选无效', proxySummary:'统计概览', proxyTotal:'总计', proxyRetired:'已退役',
    proxyFilterAll:'全部节点', proxyShownOf:'显示',
    successTitle:'历史成功代理', successRefresh:'刷新', successCopyAll:'复制全部', successNone:'暂无成功注册记录（出过号的代理会自动永久登记在这里）',
    successColProxy:'代理地址', successColProto:'协议', successColExit:'出口 IP', successColHits:'成功次数', successColFirst:'首次成功', successColLast:'最近成功', successColState:'池内状态', successColActions:'操作',
    successInPool:'在池内', successNotInPool:'已出池', successReuse:'复用', successReuseDone:'已加入复用池', successSummary:'共 {n} 条，按成功次数排序；「复用」会写入静态代理池文件，下个注册周期自动入池。',
    successCopyDone:'已复制全部成功代理',
    proxySuccessCount:'出过号', proxySuccessHot:'该代理出过号，优先复用',
    proxyProbeStale:'早前正常', proxyProbeAgo:'{n} 分钟前探测', proxyProbeStaleTip:'该结果是早前探测的缓存，节点当前实际可用性未知；空闲复检会自动更新',
  };
  const en = {
    tabProxy:'Proxy settings', tabProxyNodes:'Proxy nodes', tabSchedule:'Schedule', proxyReload:'Reload', proxyTest:'Test nodes', proxyStatus:'Proxy node status',
    proxyEmpty:'No proxy nodes', proxyNode:'Node', proxyRunHealth:'Runtime health', proxyProbeStatus:'Probe status',
    proxyLatency:'Probe latency', proxyExitIP:'Exit IP', proxyInflight:'Inflight', proxyFailures:'Failures',
    proxyCooldown:'Cooldown', proxyType:'Type', proxyProtocol:'Protocol', proxyBackend:'Backend',
    proxySourceSummary:'Subscription parse', proxyError:'Last error', probeHealthy:'Healthy', probeUnhealthy:'Unhealthy',
    probeUnknown:'Not probed', probeUnavailable:'Runtime unavailable', noBusinessSamples:'No business samples', failedAfter:'to failure',
    proxyIPv4:'IPv4', proxyIPv6:'IPv6', proxyGatewayRate:'Exit success', proxySamples:'Samples',
    proxySelectAll:'Select all', proxyBatchDelete:'Batch delete invalid', proxyBatchDeleteSelected:'Delete selected',
    proxyDeleteConfirm:'Delete {n} selected nodes?', proxyDeleteResult:'Deleted {n} nodes', proxyOpDone:'Operation completed', proxyRuntime:'Protocol runtimes', proxyNoRuntime:'No active bridges', proxyRunMode:'Mode', proxyRunCapacity:'Capacity', proxyRunBusy:'Busy leases', proxyMaintenanceIdle:'Idle', proxyMaintenanceActive:'Running', proxyUnmanaged:'unmanaged', proxyPreflight:'Precheck', proxyActions:'Actions', proxyPreflightDone:'Precheck OK', proxyPreflightFail:'Precheck failed', proxyCopied:'Proxy copied',
    proxySelectInvalid:'Select invalid', proxySummary:'Summary', proxyTotal:'Total', proxyRetired:'Retired',
    proxyFilterAll:'All nodes', proxyShownOf:'Showing',
    successTitle:'Successful proxies', successRefresh:'Refresh', successCopyAll:'Copy all', successNone:'No records yet (proxies that produced accounts are logged here permanently)',
    successColProxy:'Proxy', successColProto:'Protocol', successColExit:'Exit IP', successColHits:'Successes', successColFirst:'First success', successColLast:'Last success', successColState:'Pool state', successColActions:'Actions',
    successInPool:'In pool', successNotInPool:'Retired', successReuse:'Reuse', successReuseDone:'Added to reuse pool', successSummary:'{n} records, sorted by successes; "Reuse" appends to the static pool file and takes effect next cycle.',
    successCopyDone:'All successful proxies copied',
    proxySuccessCount:'Proven', proxySuccessHot:'This proxy produced accounts; preferred for reuse',
    proxyProbeStale:'Was healthy', proxyProbeAgo:'probed {n} min ago', proxyProbeStaleTip:'Cached result from an earlier probe; current availability unknown. Idle re-probe updates it automatically',
  };
  Object.assign(i18n.zh, zh); Object.assign(i18n.en, en);
  Object.assign(i18n.zh.fields, {
    proxy_mode:['代理模式','auto 保持旧配置兼容；single/pool 启用账号级代理租约。切换模式仅显示相关配置。'],
    proxy:['固定代理 / 单代理','auto 兼容旧代理；single 模式或 single fallback 使用。'],
    proxy_fallback:['代理池回退','none / direct / single。只在新账号租约获取前回退。'],
    proxy_pool_endpoint_mode:['节点类型','auto 会将含 {account} 的原生代理地址视为旋转代理入口。'],
    proxy_pool_file:['代理池文件','支持 HTTP/HTTPS/SOCKS/VLESS/VMess/Trojan/Hysteria2/TUIC/Shadowsocks；也支持 Base64 订阅文本。'],
    proxy_pool_subscription_url:['代理订阅 URL','支持多订阅源：每行一个（也可用逗号/分号分隔），普通文本或整份 Base64 编码均可；单个源失败不影响其它源，全部失败保留最近一次成功节点。'],
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
    auto_batch_enabled:['定时自动注册','按设定周期自动执行：重载订阅 → 探测节点 → 启动注册批次，结束后邮件通知详细结果。'],
    auto_batch_interval_min:['自动注册间隔（分钟）','相邻两个周期之间的等待时间，最小 30 分钟。'],
    notify_email:['通知邮箱','接收定时注册详细结果报告的邮箱地址。'],
    notify_smtp_host:['SMTP 服务器','发送通知邮件使用的 SMTP 主机，如 smtp.qq.com。'],
    notify_smtp_port:['SMTP 端口','SSL 端口，QQ 邮箱为 465。'],
    notify_smtp_user:['发件邮箱','用于发送通知邮件的邮箱账号。'],
    notify_smtp_pass:['SMTP 授权码','邮箱 SMTP 服务的授权码（QQ 邮箱：设置→账户→开启 SMTP 服务→生成授权码），不是邮箱登录密码。'],
  });
  Object.assign(i18n.en.fields, {
    proxy_mode:['Proxy mode','auto preserves legacy behavior; single/pool enables account-scoped leases. Only relevant fields are shown per mode.'],
    proxy:['Fixed / single proxy','Used by legacy auto mode, single mode, or single fallback.'],
    proxy_fallback:['Pool fallback','none / direct / single; applied only before a new account lease starts.'],
    proxy_pool_endpoint_mode:['Endpoint type','auto treats native URLs containing {account} as rotating gateways.'],
    proxy_pool_file:['Proxy pool file','Supports HTTP/HTTPS/SOCKS/VLESS/VMess/Trojan/Hysteria2/TUIC/Shadowsocks and Base64 subscription text.'],
    proxy_pool_subscription_url:['Subscription URL','One URL per line (commas/semicolons also accepted); plain or Base64 subscriptions both work. A failing source does not affect others; all-failed refreshes retain last-known-good nodes.'],
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
    auto_batch_enabled:['Scheduled auto-register','Each cycle: reload subscription, probe nodes, start a registration batch, then email a detailed report.'],
    auto_batch_interval_min:['Auto-register interval (minutes)','Wait time between cycles, minimum 30 minutes.'],
    notify_email:['Notify email','Recipient of the scheduled registration report.'],
    notify_smtp_host:['SMTP server','SMTP host used to send the report, e.g. smtp.qq.com.'],
    notify_smtp_port:['SMTP port','SSL port; 465 for QQ Mail.'],
    notify_smtp_user:['Sender email','Account used to send the notification email.'],
    notify_smtp_pass:['SMTP auth code','SMTP service authorization code (QQ Mail: Settings→Account→enable SMTP→generate), not the mailbox login password.'],
  });

  icons.proxy = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 11l8-4M8 13l8 4"/></svg>';
  icons.schedule = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>';
  icons.success = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a1 1 0 0 0-1 1c0 2 1.5 3.5 4 4M17 6h3a1 1 0 0 1 1 1c0 2-1.5 3.5-4 4"/></svg>';
  fieldDefs.basic = fieldDefs.basic.filter(([key]) => key !== 'proxy');
  fieldDefs.proxyNodes = [];
  fieldDefs.proxy = proxyFields;
  fieldDefs.schedule = scheduleFields;
  fieldDefs.success = [];
  tabMeta.proxyNodes = ['tabProxyNodes','proxy'];
  tabMeta.proxy = ['tabProxy','proxy'];
  tabMeta.schedule = ['tabSchedule','schedule'];
  tabMeta.success = ['tabSuccess','success'];
  renderFields();
  const autoBatchToggle = $('auto_batch_enabled');
  if (autoBatchToggle) autoBatchToggle.addEventListener('change', updateScheduleFieldVisibility);
  updateScheduleFieldVisibility();
  applyLanguage();

  const nodesTab = document.querySelector('[data-tabkey="tabProxyNodes"]');
  const successTab = document.querySelector('[data-tabkey="tabSuccess"]');
  const proxyTab = document.querySelector('[data-tabkey="tabProxy"]');
  const scheduleTab = document.querySelector('[data-tabkey="tabSchedule"]');
  const basicTab = document.querySelector('[data-tabkey="tabBasic"]');
  if (nodesTab && basicTab && basicTab.nextSibling !== nodesTab) basicTab.after(nodesTab);
  if (successTab && nodesTab && nodesTab.nextSibling !== successTab) nodesTab.after(successTab);
  if (proxyTab && successTab && successTab.nextSibling !== proxyTab) successTab.after(proxyTab);
  if (scheduleTab && proxyTab && proxyTab.nextSibling !== scheduleTab) proxyTab.after(scheduleTab);
  const nodesSection = document.getElementById('sec-proxyNodes');
  const successSection = document.getElementById('sec-success');
  const proxySection = document.getElementById('sec-proxy');
  const scheduleSection = document.getElementById('sec-schedule');
  const basicSection = document.getElementById('sec-basic');
  if (nodesSection && basicSection && basicSection.nextSibling !== nodesSection) basicSection.after(nodesSection);
  if (successSection && nodesSection && nodesSection.nextSibling !== successSection) nodesSection.after(successSection);
  if (proxySection && successSection && successSection.nextSibling !== proxySection) successSection.after(proxySection);
  if (scheduleSection && proxySection && proxySection.nextSibling !== scheduleSection) proxySection.after(scheduleSection);

  if (nodesSection) {
    const shell = document.createElement('div');
    shell.className = 'proxy-status-shell';
    shell.innerHTML = `
      <div class="proxy-status-head">
        <strong data-i18n="proxyStatus">${t('proxyStatus')}</strong>
        <div class="proxy-status-actions">
          <select id="proxyStatusFilter" class="mini-select" title="${t('proxyFilterAll')}">
            <option value="">${t('proxyFilterAll')}</option>
            <option value="healthy">${t('probeHealthy')}</option>
            <option value="unhealthy">${t('probeUnhealthy')}</option>
            <option value="unknown">${t('probeUnknown')}</option>
            <option value="unavailable">${t('probeUnavailable')}</option>
          </select>
          <button type="button" id="proxyReloadBtn" class="mini-btn"><span data-i18n="proxyReload">${t('proxyReload')}</span></button>
          <button type="button" id="proxyTestBtn" class="mini-btn"><span data-i18n="proxyTest">${t('proxyTest')}</span></button>
          <button type="button" id="proxySelectInvalidBtn" class="mini-btn" style="opacity:0.7" disabled><span data-i18n="proxySelectInvalid">${t('proxySelectInvalid')}</span></button>
          <button type="button" id="proxyPruneBtn" class="mini-btn mini-btn-danger" style="opacity:0.7" disabled><span data-i18n="proxyBatchDeleteSelected">${t('proxyBatchDeleteSelected')}</span></button>
        </div>
      </div>
      <div id="proxyPoolSummary" class="proxy-summary"></div>
      <div id="proxySourceSummary" class="proxy-summary"></div>
      <div id="proxyRunStatus" class="proxy-run"></div>
      <div id="proxyStatsSummary" class="proxy-stats"><span class="proxy-stats-label" data-i18n="proxySummary">${t('proxySummary')}</span>: <span id="proxyStatsContent"></span></div>
      <div class="proxy-table-wrap"><table class="proxy-table"><thead><tr>
        <th style="width:32px"><input type="checkbox" id="proxySelectAll" title="${t('proxySelectAll')}"></th>
        <th data-i18n="proxyNode">${t('proxyNode')}</th><th data-i18n="proxyProtocol">${t('proxyProtocol')}</th>
        <th data-i18n="proxyBackend">${t('proxyBackend')}</th><th data-i18n="proxyType">${t('proxyType')}</th>
        <th data-i18n="proxyProbeStatus">${t('proxyProbeStatus')}</th><th data-i18n="proxyRunHealth">${t('proxyRunHealth')}</th>
        <th data-i18n="proxyLatency">${t('proxyLatency')}</th><th data-i18n="proxyExitIP">${t('proxyExitIP')}</th>
        <th data-i18n="proxyInflight">${t('proxyInflight')}</th><th data-i18n="proxyFailures">${t('proxyFailures')}</th>
        <th data-i18n="proxyCooldown">${t('proxyCooldown')}</th><th data-i18n="proxyError">${t('proxyError')}</th>
        <th data-i18n="proxyActions">${t('proxyActions')}</th>
      </tr></thead><tbody id="proxyPoolRows"></tbody></table></div>`;
    nodesSection.appendChild(shell);
  }

  if (successSection) {
    const shell = document.createElement('div');
    shell.className = 'proxy-status-shell';
    shell.innerHTML = `
      <div class="proxy-status-head">
        <strong data-i18n="successTitle">${t('successTitle')}</strong>
        <div class="proxy-status-actions">
          <button type="button" id="successRefreshBtn" class="mini-btn"><span data-i18n="successRefresh">${t('successRefresh')}</span></button>
          <button type="button" id="successCopyAllBtn" class="mini-btn"><span data-i18n="successCopyAll">${t('successCopyAll')}</span></button>
        </div>
      </div>
      <div id="successSummary" class="proxy-summary"></div>
      <div class="proxy-table-wrap"><table class="proxy-table"><thead><tr>
        <th data-i18n="successColProxy">${t('successColProxy')}</th><th data-i18n="successColProto">${t('successColProto')}</th>
        <th data-i18n="successColExit">${t('successColExit')}</th><th data-i18n="successColHits">${t('successColHits')}</th>
        <th data-i18n="successColFirst">${t('successColFirst')}</th><th data-i18n="successColLast">${t('successColLast')}</th>
        <th data-i18n="successColState">${t('successColState')}</th><th data-i18n="successColActions">${t('successColActions')}</th>
      </tr></thead><tbody id="successRows"></tbody></table></div>`;
    successSection.appendChild(shell);
  }

  let successEntries = [];
  let successNodeIds = new Set();
  function fmtSuccessTime(value) {
    const ts = Number(value);
    if (!ts) return '-';
    const d = new Date(ts * 1000);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  function shortProxy(url) {
    const raw = String(url || '');
    const idx = raw.indexOf('://');
    return idx >= 0 ? raw.slice(idx + 3) : raw;
  }
  function renderSuccessRows(entries) {
    const tb = document.getElementById('successRows'); if (!tb) return;
    if (!entries.length) {
      tb.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#707079;padding:24px 0">${t('successNone')}</td></tr>`;
    } else {
      tb.innerHTML = entries.map(e => `<tr>
        <td><span class="proxy-copy" data-proxy="${esc(e.proxy_url)}" title="${esc(e.proxy_url)}">${esc(shortProxy(e.proxy_url))}</span></td>
        <td>${esc(e.protocol || '-')}</td>
        <td>${esc(e.exit_ip || '-')}</td>
        <td style="color:var(--green);font-weight:700">${Number(e.successes) || 0}</td>
        <td>${fmtSuccessTime(e.first_success_at)}</td>
        <td>${fmtSuccessTime(e.last_success_at)}</td>
        <td>${e.in_pool ? `<span style="color:var(--green)">${t('successInPool')}</span>` : `<span style="color:#707079">${t('successNotInPool')}</span>`}</td>
        <td><button type="button" class="mini-btn success-reuse" data-id="${esc(e.node_id)}">${t('successReuse')}</button></td>
      </tr>`).join('');
    }
    const summary = document.getElementById('successSummary');
    if (summary) summary.textContent = t('successSummary').replace('{n}', entries.length);
  }
  async function loadSuccessHistory() {
    try {
      const resp = await fetch('/api/proxy-success-history', {cache: 'no-store'});
      const data = await resp.json();
      successEntries = Array.isArray(data.entries) ? data.entries : [];
      renderSuccessRows(successEntries);
    } catch (err) {
      flashNotice(String(err && err.message || err), true);
    }
  }
  const successTabEl = document.querySelector('[data-tabkey="tabSuccess"]');
  if (successTabEl) successTabEl.addEventListener('click', loadSuccessHistory);
  const successRefreshBtn = document.getElementById('successRefreshBtn');
  if (successRefreshBtn) successRefreshBtn.addEventListener('click', loadSuccessHistory);
  const successCopyAllBtn = document.getElementById('successCopyAllBtn');
  if (successCopyAllBtn) successCopyAllBtn.addEventListener('click', () => {
    const text = successEntries.map(e => e.proxy_url).join('\n');
    if (!text) { flashNotice(t('successNone'), true); return; }
    navigator.clipboard.writeText(text).then(() => flashNotice('✓ ' + t('successCopyDone'))).catch(err => flashNotice(String(err), true));
  });
  const successRows = document.getElementById('successRows');
  if (successRows) successRows.addEventListener('click', async ev => {
    const copy = ev.target.closest('.proxy-copy');
    if (copy) {
      navigator.clipboard.writeText(copy.dataset.proxy).then(() => flashNotice('✓ ' + t('proxyCopied'))).catch(err => flashNotice(String(err), true));
      return;
    }
    const reuse = ev.target.closest('.success-reuse');
    if (!reuse) return;
    reuse.disabled = true;
    try {
      const resp = await fetch('/api/proxy-success-history/reuse', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({node_ids: [reuse.dataset.id]}),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || `HTTP ${resp.status}`);
      flashNotice(`✓ ${t('successReuseDone')} +${data.added}`);
    } catch (err) {
      flashNotice(String(err && err.message || err), true);
    } finally {
      reuse.disabled = false;
    }
  });

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
  function probeCell(node) {
    if (node.probe_stale) {
      const ago = Number(node.probe_age_min);
      const agoText = Number.isFinite(ago) ? t('proxyProbeAgo').replace('{n}', ago) : '';
      return `<span class="proxy-stale" title="${esc(t('proxyProbeStaleTip'))}">${esc(t('proxyProbeStale'))}${agoText ? ' · ' + esc(agoText) : ''}</span>`;
    }
    return esc(probeText(node.probe_status));
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
    if (data && data.success_count != null) {
      const tag = document.createElement('span');
      tag.className = 'proxy-hot-count';
      tag.textContent = ` | ★ ${t('proxySuccessCount')}: ${data.success_count}`;
      el.appendChild(tag);
    }
  }

  let lastMaintenance = '';
  function renderRunStatus(data) {
    const el = document.getElementById('proxyRunStatus'); if (!el) return;
    const s = data && data.summary ? data.summary : {};
    const parts = [];
    parts.push(esc(t('proxyRunMode')) + ': ' + esc(data.mode || 'auto') + (data.managed === false ? ' (' + esc(t('proxyUnmanaged')) + ')' : '') + (data.fallback ? ' · fallback=' + esc(data.fallback) : ''));
    if (typeof data.capacity === 'number') parts.push(esc(t('proxyRunCapacity')) + ': ' + data.capacity);
    parts.push(esc(t('proxyRunBusy')) + ': ' + (s.inflight || 0));
    const rt = data.runtime && typeof data.runtime === 'object' ? Object.values(data.runtime) : [];
    const alive = rt.filter(x => x && x.alive).length;
    const detail = rt.map(x => esc((x.kind || '?') + ':' + (x.port ?? '—') + ' ×' + (x.refcount || 0) + (x.alive ? '' : ' dead'))).join(' · ');
    parts.push(esc(t('proxyRuntime')) + ': ' + (rt.length ? (rt.length + ' (' + alive + ' ' + t('proxyMaintenanceActive').toLowerCase() + ') — ' + detail) : esc(t('proxyNoRuntime'))));
    parts.push(lastMaintenance ? ('<span class="proxy-run-maint">' + esc(t('proxyMaintenanceActive')) + ': ' + esc(lastMaintenance) + '</span>') : ('<span class="proxy-run-idle">' + esc(t('proxyMaintenanceIdle')) + '</span>'));
    el.innerHTML = parts.map(x => '<span class="proxy-run-item">' + x + '</span>').join('');
  }
  async function preflightNode(id, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
      const r = await fetch('/api/proxy-pool/preflight?node_id=' + encodeURIComponent(id), { method: 'POST' });
      const d = await r.json();
      if (!r.ok) { flashNotice(d.detail || 'Precheck failed', true); return; }
      const res = d.result || {}; const targets = Array.isArray(res.targets) ? res.targets : [];
      const detail = targets.map(x => String(x.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '') + ':' + (x.usable ? '✓' : '✗') + (x.latency_ms || 0) + 'ms').join(' · ');
      if (res.ok) flashNotice('✓ ' + t('proxyPreflightDone') + ' — ' + detail);
      else flashNotice(t('proxyPreflightFail') + ' — ' + detail, true);
    } catch (e) { flashNotice(e.message, true); }
    finally { if (btn) { btn.disabled = false; btn.textContent = t('proxyPreflight'); } }
  }
  function renderProxyStatus(data) {
    const rows = document.getElementById('proxyPoolRows'); const summary = document.getElementById('proxyPoolSummary'); if (!rows || !summary) return;
    successNodeIds = new Set(Array.isArray(data.success_node_ids) ? data.success_node_ids : []);
    const nodes = Array.isArray(data.nodes) ? data.nodes : [];
    const shown = typeof data.nodes_shown === 'number' ? data.nodes_shown : nodes.length;
    const total = typeof data.nodes_total === 'number' ? data.nodes_total : (data.summary && data.summary.total) || nodes.length;
    summary.textContent = `${data.mode || 'auto'} · ${t('proxyShownOf')} ${shown}/${total}${data.persist_health ? ' · persisted health' : ''}`;
    renderSourceSummary(data);
    renderStatsSummary(data);
    if (!nodes.length) { rows.innerHTML = `<tr><td colspan="14" class="proxy-empty">${esc(t('proxyEmpty'))}</td></tr>`; return; }
    rows.innerHTML = nodes.map(node => {
      const status = node.probe_status === 'healthy' ? 'good' : (node.probe_status === 'unhealthy' || node.probe_status === 'unavailable') ? 'bad' : '';
      const label = node.name ? `${node.name} · ${node.proxy}` : node.proxy; const samples = Number(node.business_samples || 0);
      const health = node.rotating
        ? `${t('proxyGatewayRate')}: ${node.gateway_success_rate == null ? '—' : Math.round(Number(node.gateway_success_rate)*1000)/10+'%'} · exits=${Number(node.exit_successes||0)+Number(node.exit_failures||0)}`
        : (samples > 0 ? `${node.health ?? '—'} · n=${samples}` : `— · ${t('noBusinessSamples')}`);
      const latency = `${familyText(node,'ipv4_probe')} / ${familyText(node,'ipv6_probe')}`;
      const error = node.probe_error || node.last_error || '—';
      const failures = node.rotating ? `${node.exit_failures || 0} exits` : `${node.failure_count || 0} · transport=${node.transport_failures || 0} · config=${node.configuration_failures || 0}`;
      const isHot = successNodeIds.has(node.id);
      const cls = [node.inflight > 0 && 'proxy-busy', isHot && 'proxy-hot'].filter(Boolean).join(' ');
      return `<tr${cls ? ` class="${cls}"` : ''}>
        <td><input type="checkbox" class="proxy-node-cb" data-id="${esc(node.id)}" data-status="${esc(node.probe_status)}"></td>
        <td title="${esc(node.id)}"><span class="proxy-dot ${status}"></span>${isHot ? `<span class="proxy-hot-star" title="${esc(t('proxySuccessHot'))}">★</span>` : ''}<span class="proxy-copy" data-proxy="${esc(node.proxy)}" title="${esc(t('proxyCopied'))}">${esc(label)}</span></td>
        <td>${esc(node.protocol || '—')}</td><td>${esc(node.backend || 'native')}</td>
        <td>${node.rotating ? 'rotating gateway' : 'fixed'}</td><td>${probeCell(node)}</td>
        <td>${esc(health)}</td><td>${esc(latency)}</td><td>${esc(node.exit_ip || '—')}</td>
        <td>${esc(node.inflight)}</td><td>${esc(failures)}</td><td>${node.rotating ? 'N/A' : (node.cooldown_sec ? esc(node.cooldown_sec)+' s' : '—')}</td>
        <td title="${esc(error)}">${esc(error)}</td>
      <td><button type="button" class="proxy-pf" data-id="${esc(node.id)}">${esc(t('proxyPreflight'))}</button></td>
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

  let proxyStatusFilter = '';
  let lastProxyRenderHash = '';
  async function refreshProxyStatus(force) {
    // 页面不可见或代理面板未激活时跳过轮询，避免后台持续重建 DOM 造成卡顿
    const active = nodesSection && nodesSection.classList.contains('active');
    if (!force && (document.hidden || !active)) return;
    const params = new URLSearchParams({ limit: '100' });
    if (proxyStatusFilter) params.set('status', proxyStatusFilter);
    try {
      const [r, ms] = await Promise.all([fetch('/api/proxy-pool/status?' + params.toString()), fetch('/api/status')]);
      if (!r.ok) return; const d = await r.json();
      const m = ms.ok ? await ms.json() : {};
      lastMaintenance = m.maintenance || '';
      // 数据未变化时跳过整表重渲染（200 行 innerHTML 重建是主要卡顿来源）
      const hash = JSON.stringify([d.nodes_total, d.summary, d.nodes, d.runtime, lastMaintenance, d.success_node_ids]);
      if (!force && hash === lastProxyRenderHash) return;
      lastProxyRenderHash = hash;
      renderProxyStatus(d);
      renderRunStatus(d);
    } catch (_) {}
  }
  async function proxyAction(path) {
    if (dirty.size && !await saveConfig()) return;
    const reload = document.getElementById('proxyReloadBtn'); const test = document.getElementById('proxyTestBtn');
    const prune = document.getElementById('proxyPruneBtn'); const selectBtn = document.getElementById('proxySelectInvalidBtn');
    if (reload) reload.disabled = true; if (test) test.disabled = true; if (prune) prune.disabled = true; if (selectBtn) selectBtn.disabled = true;
    try { const r = await fetch(path,{method:'POST'}); const d = await r.json(); if (!r.ok) flashNotice(d.detail || 'Proxy pool operation failed', true); else { renderProxyStatus(d); flashNotice('✓ ' + t('proxyOpDone')); } }
    catch (e) { flashNotice(e.message, true); }
    finally { if (reload) reload.disabled = !!running; if (test) test.disabled = !!running; updatePruneButtonState(); }
  }
  async function proxyPruneAction() {
    if (dirty.size && !await saveConfig()) return;
    const ids = getSelectedNodeIds();
    if (!ids.length) { flashNotice(t('proxyBatchDeleteSelected') + ': no nodes selected', true); return; }
    if (!confirm(t('proxyDeleteConfirm').replace('{n}', ids.length))) return;
    const prune = document.getElementById('proxyPruneBtn'); const reload = document.getElementById('proxyReloadBtn'); const test = document.getElementById('proxyTestBtn'); const selectBtn = document.getElementById('proxySelectInvalidBtn');
    if (prune) prune.disabled = true; if (reload) reload.disabled = true; if (test) test.disabled = true; if (selectBtn) selectBtn.disabled = true;
    try {
      const r = await fetch('/api/proxy-pool/prune', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({node_ids: ids, only_invalid: false})});
      const d = await r.json();
      if (!r.ok) flashNotice(d.detail || 'Prune failed', true);
      else { renderProxyStatus(d); flashNotice('✓ ' + t('proxyDeleteResult').replace('{n}', d.removed || 0)); }
    } catch (e) { flashNotice(e.message, true); }
    finally { if (reload) reload.disabled = !!running; if (test) test.disabled = !!running; if (selectBtn) selectBtn.disabled = false; if (selectBtn) selectBtn.style.opacity = '1'; updatePruneButtonState(); }
  }

  function setupEventListeners() {
    // 切换到代理面板时立即刷新一次（平时后台跳过轮询以省资源）
    if (nodesSection && window.MutationObserver) {
      new MutationObserver(() => {
        if (nodesSection.classList.contains('active')) refreshProxyStatus(true);
      }).observe(nodesSection, { attributes: true, attributeFilter: ['class'] });
    }
    // Select-all checkbox
    const selectAll = document.getElementById('proxySelectAll');
    if (selectAll) {
      selectAll.addEventListener('change', function() {
        const checked = this.checked;
        document.querySelectorAll('.proxy-node-cb').forEach(cb => cb.checked = checked);
        updatePruneButtonState();
      });
      // Delegate click on table body to auto-uncheck select-all when any row cb changes
      document.getElementById('proxyPoolRows').addEventListener('click', function(e) {
        const pf = e.target.closest('.proxy-pf');
        if (pf) { e.preventDefault(); preflightNode(pf.dataset.id, pf); return; }
        const cp = e.target.closest('.proxy-copy');
        if (cp && cp.dataset.proxy) {
          navigator.clipboard.writeText(cp.dataset.proxy).then(() => flashNotice('✓ ' + t('proxyCopied'))).catch(() => flashNotice(t('copyFailed'), true));
        }
      });
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
    const filterSel = document.getElementById('proxyStatusFilter');
    if (filterSel) filterSel.onchange = () => { proxyStatusFilter = filterSel.value; refreshProxyStatus(); };
    const selectBtn = document.getElementById('proxySelectInvalidBtn');
    if (selectBtn) selectBtn.onclick = selectAllInvalidNodes;
    // Prune button
    const pruneBtn = document.getElementById('proxyPruneBtn');
    if (pruneBtn) pruneBtn.onclick = proxyPruneAction;
  }

  const reloadBtn = document.getElementById('proxyReloadBtn'); const testBtn = document.getElementById('proxyTestBtn');
  if (reloadBtn) reloadBtn.onclick = () => proxyAction('/api/proxy-pool/reload');
  if (testBtn) testBtn.onclick = () => proxyAction('/api/proxy-pool/test');
  loadConfig().catch(e => flashNotice(e.message,true));
  refreshProxyStatus();
  setupEventListeners();
  setInterval(() => {
    if (reloadBtn) reloadBtn.disabled = !!running;
    if (testBtn) testBtn.disabled = !!running;
    refreshProxyStatus();
  }, 4000);
})();