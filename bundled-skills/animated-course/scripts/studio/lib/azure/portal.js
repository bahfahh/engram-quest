// Azure portal in Traditional Chinese (zh-TW) — the screens of azure-ops-2026 (experiment 21), redrawn from the
// learner's own portal screenshots (2026-11-09) and Microsoft Learn (zh-tw). Re-exported by azure.js, so
//   import * as AZ from '/lib/azure/azure.js';  await AZ.init();  const f = AZ.portalFrame({ … });
// Doc: lib/azure/AZURE.md §7 (every builder, its options, and where each label comes from).
//
// LABEL RULE (SERIES.md §0.1): the learner's screenshots win; then strings from zh-tw Learn; a label we would have to
// guess stays in its English original (the real zh-TW portal leaves plenty of English too). Source tags in comments:
//   [shot] = learner screenshot 1–4 · [learn] = zh-tw Learn (fact files A/B/C §12 or checked 2026-11-09) ·
//   [en] = kept English (zh string unknown) · [ours] = our own drawing, not a portal string (fictional names, numbers).
// Every builder takes plain strings, so a producer who has verified a better label passes it in.
// Fictional only: account dev@contoso-cram.com, tenant Default Directory (contosocram.onmicrosoft.com), SERIES §2 names.
import * as K from '/lib/kit/kit.js';
import { table, statusChip, lineChart, box } from './azure.js';

export const PORTAL_ICONS = ['bell-ring', 'circle-minus', 'id-card', 'route', 'server', 'layers', 'database', 'globe', 'key-round', 'zap', 'gauge', 'activity', 'app-window', 'archive', 'arrow-right', 'arrow-right-left', 'arrow-up-right', 'badge-check', 'bell', 'bot', 'box', 'boxes', 'building-2', 'cable', 'calendar-clock', 'chart-column', 'check', 'chevron-down', 'chevron-right', 'chevrons-left', 'chevrons-up-down', 'circle', 'circle-check', 'circle-dollar-sign', 'circle-help', 'circle-x', 'code-xml', 'coins', 'copy', 'cpu', 'database', 'download', 'earth', 'ellipsis', 'external-link', 'eye', 'file-badge', 'file-text', 'filter', 'fingerprint', 'gauge', 'gavel', 'git-compare', 'globe', 'grip', 'handshake', 'heart-pulse', 'history', 'house', 'id-card', 'info', 'key-round', 'layers', 'layout-dashboard', 'layout-grid', 'life-buoy', 'lightbulb', 'link', 'list', 'list-checks', 'list-tree', 'lock', 'menu', 'message-square-heart', 'monitor-cog', 'network', 'notebook', 'piggy-bank', 'plus', 'radar', 'refresh-cw', 'rocket', 'route', 'save', 'scaling', 'search', 'server', 'settings', 'shield', 'shield-alert', 'shield-check', 'siren', 'sliders-horizontal', 'smartphone', 'sparkles', 'square-plus', 'square-terminal', 'star', 'table', 'tags', 'ticket', 'trash-2', 'triangle-alert', 'user', 'user-cog', 'users', 'users-round', 'waypoints', 'wrench', 'x', 'zap'];

// ------------------------------------------------------------------------------------------------ helpers (pure DOM)
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ic = (n, s = 24, c) => K.icon(n, { size: s, color: c }).outerHTML;
const rd = id => (id ? ` data-read="${esc(id)}"` : '');
const node = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const find = (root, sel, txt) => [...root.querySelectorAll(sel)].find(e => e.dataset.name === txt || e.textContent.trim() === txt);
const el$ = x => (x && x.el) || x;
/** Fluent icon colours used for menu icons (the real portal's icons are multi-coloured; ours are lucide in one of these). */
export const IC = { blue: '#0F6CBD', sky: '#0078D4', teal: '#038387', purple: '#8764B8', green: '#107C10', lime: '#5C8A1F', orange: '#CA5010', red: '#C50F1F', gold: '#C19C00', grey: '#616161', navy: '#243A5E' };

// ================================================================================================ account (fictional)
export const ACCOUNT = { email: 'dev@contoso-cram.com', tenant: 'DEFAULT DIRECTORY (CONTOSOCRAM…)', initials: '' };   // [ours]
export const PORTAL_BLUE = '#4778CE';   // sampled from the learner's screenshots 1, 3, 4 (top bar)
export const FOOTNOTE_PORTAL = '介面依 Microsoft Learn 與入口網站重繪，2026-11';
/** Where the corner footnote goes on a portal frame: AZ.footnote(parent, AZ.FOOT_PORTAL) — top right, in the empty strip under the top bar
 *  (the default bottom-left spot covers the resource menu). */
export const FOOT_PORTAL = { right: 24, y: 68 };

// ================================================================================================ menus (constants)
// Item: [label, icon, colour?]. Group: {g, open (default true; false = collapsed '›' row), icon?, items}.
/** 入口網站功能表 (left portal menu, screenshot 2, exactly) [shot] */
export const PORTAL_MENU = [
  ['建立資源', 'plus', IC.green], ['首頁', 'house', IC.sky], ['儀表板', 'chart-column', IC.teal], ['所有服務', 'list', IC.grey],
  { g: '我的最愛', star: true, items: [['應用程式範本', 'code-xml', IC.sky], ['所有資源', 'layout-grid', IC.lime], ['資源群組', 'boxes', IC.sky], ['應用程式服務', 'globe', IC.sky],
    ['函數應用程式', 'zap', IC.gold], ['Azure SQL 資料庫', 'database', IC.sky], ['Azure Cosmos DB', 'earth', IC.sky], ['虛擬機器', 'monitor-cog', IC.sky], ['負載平衡器', 'network', IC.green],
    ['儲存體帳戶', 'archive', IC.teal], ['虛擬網路', 'cable', IC.sky], ['Microsoft Entra ID', 'id-card', IC.sky], ['監視', 'gauge', IC.sky], ['Advisor', 'lightbulb', IC.sky],
    ['適用於雲端的 Microsoft Defender', 'shield', IC.green], ['成本管理 + 計費', 'circle-dollar-sign', IC.green], ['說明 + 支援', 'life-buoy', IC.sky]] },
];
/** 監視 (Azure Monitor) resource menu — screenshot 3, exactly, top to bottom [shot] */
export const MONITOR_MENU = [
  ['概觀', 'gauge', IC.sky], ['活動記錄', 'list-tree', IC.sky], ['警示', 'bell', IC.green], ['計量', 'chart-column', IC.sky], ['可檢視性 Agent (預覽)', 'sparkles', IC.purple],
  ['問題', 'siren', IC.sky], ['記錄', 'file-text', IC.sky], ['健康度模型', 'heart-pulse', IC.sky], ['變更分析', 'git-compare', IC.green], ['服務健康情況', 'heart-pulse', IC.grey],
  ['活頁簿', 'notebook', IC.sky], ['儀表板搭配 Grafana', 'layout-dashboard', IC.orange],
  { g: '深入解析', open: false, items: [] }, { g: '受管理的服務', open: false, items: [] }, { g: '設定', open: false, items: [] }, { g: '支援與疑難排解', open: false, items: [] },
];
/** Microsoft Entra ID (Default Directory) menu — screenshot 4, exactly (down to Microsoft Entra Connect, where the screenshot ends) [shot] */
export const ENTRA_MENU = [
  ['概觀', 'info', IC.sky], ['預覽功能', 'app-window', IC.purple], ['診斷並解決問題', 'wrench', IC.sky],
  { g: '管理', items: [['使用者', 'user', IC.sky], ['群組', 'users', IC.sky], ['外部身分識別', 'users-round', IC.sky], ['角色和系統管理員', 'user-cog', IC.green], ['系統管理單位', 'building-2', IC.sky],
    ['委派系統管理員合作夥伴', 'handshake', IC.orange], ['代理程式', 'bot', IC.sky], ['企業應用程式', 'layout-grid', IC.sky], ['裝置', 'smartphone', IC.sky], ['應用程式註冊', 'layout-grid', IC.sky],
    ['Identity Governance', 'badge-check', IC.purple], ['應用程式 Proxy', 'globe', IC.green], ['自訂安全性屬性', 'tags', IC.green], ['授權', 'ticket', IC.gold], ['跨租用戶同步處理', 'refresh-cw', IC.grey],
    ['Microsoft Entra Connect', 'id-card', IC.sky]] },
];
const TOP4 = [['概觀', 'layout-grid', IC.sky], ['活動記錄', 'list-tree', IC.sky], ['存取控制 (IAM)', 'user', IC.sky], ['標籤', 'tags', IC.purple], ['診斷並解決問題', 'wrench', IC.sky]];
const MON = (...extra) => ({ g: '監視', items: [...extra, ['警示', 'bell', IC.green], ['計量', 'chart-column', IC.sky], ['診斷設定', 'settings', IC.green], ['記錄', 'file-text', IC.sky]] });
/** App Service (web app) — 概觀/活動記錄/警示/計量/記錄 [shot]; 存取控制 (IAM), 標籤, 診斷並解決問題, 部署位置, 部署中心, 環境變數, 組態, 驗證, 身分識別, 憑證,
 *  自訂網域, 網路, 健康情況檢查, 診斷設定, 記錄資料流 [learn]; 相應增加/相應放大 (App Service 方案) [learn+SERIES §4: the bracket form is unverified] */
export const APPSERVICE_MENU = [...TOP4,
  { g: '部署', items: [['部署位置', 'layers', IC.sky], ['部署中心', 'rocket', IC.sky]] },
  { g: '設定', items: [['環境變數', 'code-xml', IC.sky], ['組態', 'sliders-horizontal', IC.sky], ['驗證', 'fingerprint', IC.sky], ['身分識別', 'key-round', IC.gold], ['憑證', 'file-badge', IC.sky],
    ['自訂網域', 'globe', IC.sky], ['網路', 'network', IC.green], ['相應增加 (App Service 方案)', 'arrow-up-right', IC.sky], ['相應放大 (App Service 方案)', 'scaling', IC.sky]] },
  MON(['健康情況檢查', 'heart-pulse', IC.red], ['Application Insights', 'lightbulb', IC.purple]),
  { g: '記錄資料流', open: false, items: [] },
];
/** App Service 方案 (plan) [same sources as above] */
export const PLAN_MENU = [...TOP4,
  { g: '設定', items: [['相應增加 (App Service 方案)', 'arrow-up-right', IC.sky], ['相應放大 (App Service 方案)', 'scaling', IC.sky], ['Apps', 'globe', IC.sky], ['Properties', 'list', IC.grey]] },
  { g: '監視', items: [['警示', 'bell', IC.green], ['計量', 'chart-column', IC.sky]] },
];
/** Azure SQL 資料庫 — 查詢效能深入解析, 連接字串 [learn]; Compute + storage, Query editor [en] (計算 + 儲存體 is guessed in fact file A) */
export const SQLDB_MENU = [...TOP4, ['Query editor (preview)', 'code-xml', IC.sky],
  { g: '設定', items: [['Compute + storage', 'cpu', IC.sky], ['連接字串', 'link', IC.sky]] },
  { g: '智慧效能', items: [['查詢效能深入解析', 'activity', IC.sky]] },
  MON(),
];
/** SQL Server — 網路 [learn], Microsoft Entra ID, 適用於雲端的 Microsoft Defender [shot]; SQL databases [en] */
export const SQLSERVER_MENU = [...TOP4,
  { g: '設定', items: [['SQL databases', 'database', IC.sky], ['Microsoft Entra ID', 'id-card', IC.sky]] },
  { g: '安全性', items: [['網路', 'network', IC.green], ['適用於雲端的 Microsoft Defender', 'shield', IC.green]] },
  MON(),
];
/** Key Vault — 祕密, 憑證 [learn]; Keys [en]; 網路 [learn] */
export const KEYVAULT_MENU = [...TOP4,
  { g: 'Objects', items: [['Keys', 'key-round', IC.gold], ['祕密', 'lock', IC.sky], ['憑證', 'file-badge', IC.sky]] },
  { g: '設定', items: [['網路', 'network', IC.green]] },
  MON(),
];
/** 儲存體帳戶 [shot] — Containers, Data storage [en]; 網路 [learn] */
export const STORAGE_MENU = [...TOP4,
  { g: 'Data storage', items: [['Containers', 'box', IC.sky]] },
  { g: 'Security + networking', items: [['網路', 'network', IC.green], ['Access keys', 'key-round', IC.gold]] },
  MON(),
];
/** Front Door and CDN profile — product menu kept in English [en] (no zh source) */
export const FRONTDOOR_MENU = [...TOP4,
  { g: 'Settings', items: [['Front Door manager', 'route', IC.sky], ['Domains', 'globe', IC.sky], ['Origin groups', 'server', IC.sky], ['Rule sets', 'list-checks', IC.sky], ['Security policies', 'shield', IC.green]] },
  MON(),
];
/** WAF policy (Front Door) — [en] */
export const WAFPOLICY_MENU = [...TOP4,
  { g: 'Settings', items: [['Policy settings', 'settings', IC.sky], ['Managed rules', 'shield-check', IC.green], ['Custom rules', 'gavel', IC.sky], ['Associations', 'link', IC.sky]] },
  MON(),
];
/** Application Insights — 調查, 應用程式對應, 智慧偵測, 即時計量, 失敗, 效能, 可用性, 使用量和估計成本 [learn]; 活頁簿 [shot]; Search, Transaction search [en] */
export const APPINSIGHTS_MENU_ZH = [...TOP4,
  { g: '調查', items: [['應用程式對應', 'waypoints', IC.sky], ['智慧偵測', 'radar', IC.sky], ['即時計量', 'activity', IC.sky], ['Search', 'search', IC.sky], ['可用性', 'globe', IC.green], ['失敗', 'triangle-alert', IC.red], ['效能', 'gauge', IC.sky]] },
  { g: '監視', items: [['警示', 'bell', IC.green], ['計量', 'chart-column', IC.sky], ['診斷設定', 'settings', IC.green], ['記錄', 'file-text', IC.sky], ['活頁簿', 'notebook', IC.sky]] },
  { g: '設定', items: [['使用量和估計成本', 'coins', IC.green]] },
];
/** Log Analytics 工作區 [shot] — 記錄 [shot]; 使用量和估計成本 [learn]; Tables [en] */
export const LOGANALYTICS_MENU = [...TOP4, ['記錄', 'file-text', IC.sky],
  { g: '設定', items: [['Tables', 'table', IC.sky], ['使用量和估計成本', 'coins', IC.green]] },
  { g: '監視', items: [['警示', 'bell', IC.green], ['計量', 'chart-column', IC.sky], ['診斷設定', 'settings', IC.green]] },
];
/** 適用於雲端的 Microsoft Defender [shot] — 概觀, 建議 [learn]; the rest [en] */
export const DEFENDER_MENU = [['概觀', 'layout-grid', IC.sky], ['Getting started', 'rocket', IC.sky], ['建議', 'list-checks', IC.sky], ['Attack path analysis', 'route', IC.sky], ['Security alerts', 'shield-alert', IC.red], ['Inventory', 'boxes', IC.sky],
  { g: 'Cloud Security', items: [['Security posture', 'shield-check', IC.green], ['Regulatory compliance', 'gavel', IC.sky], ['Workload protections', 'shield', IC.sky]] },
  { g: 'Management', items: [['Environment settings', 'settings', IC.sky]] },
];
/** Advisor [shot] — 概觀, 可靠性, 成本, Advisor 分數 [learn]; Security, Performance, Operational excellence [en] */
export const ADVISOR_MENU = [['概觀', 'layout-grid', IC.sky], ['Advisor 分數', 'gauge', IC.sky],
  { g: 'Recommendations', items: [['可靠性', 'shield-check', IC.green], ['Security', 'lock', IC.sky], ['Performance', 'zap', IC.gold], ['成本', 'circle-dollar-sign', IC.green], ['Operational excellence', 'list-checks', IC.sky]] },
];
/** 成本管理 + 計費 [shot] — Cost analysis, Budgets, Cost alerts [en] */
export const COST_MENU = [['概觀', 'layout-grid', IC.sky],
  { g: '成本管理', items: [['Cost analysis', 'chart-column', IC.green], ['Cost alerts', 'bell', IC.green], ['Budgets', 'piggy-bank', IC.green], ['Advisor recommendations', 'lightbulb', IC.sky]] },
];
/** 首頁 · Azure 服務 row (screenshot 1, exactly) [shot] */
export const HOME_SERVICES = [['建立資源', 'plus', IC.sky, true], ['所有資源', 'layout-grid', IC.lime], ['成本管理 + 計費', 'circle-dollar-sign', IC.green], ['應用程式範本', 'code-xml', IC.sky],
  ['Microsoft Entra ID', 'id-card', IC.sky], ['App Service 憑證', 'file-badge', IC.orange], ['監視', 'gauge', IC.sky], ['SQL Server', 'server', IC.sky], ['Azure SQL 資料庫', 'database', IC.sky], ['更多服務', 'arrow-right', IC.sky, true]];
/** Resource icons by type (lucide + colour; never Microsoft's icons). Type strings: [shot] where screenshot 1 shows them. */
export const TYPE_ICON = {
  'App Service': ['globe', IC.sky], '應用程式服務': ['globe', IC.sky], 'App Service 方案': ['layers', IC.sky], 'SQL 資料庫': ['database', IC.sky], 'SQL Server': ['server', IC.sky],
  'Application Insights': ['lightbulb', IC.purple], 'Log Analytics 工作區': ['chart-column', IC.sky], '訂用帳戶': ['key-round', IC.gold], '函數應用程式': ['zap', IC.gold],
  '動作群組': ['bell-ring', IC.grey], 'Foundry': ['sparkles', IC.purple], '資源群組': ['boxes', IC.sky], 'Foundry 專案': ['sparkles', IC.purple], '儲存體帳戶': ['archive', IC.teal],
  'Key Vault': ['key-round', IC.gold], 'Front Door and CDN profiles': ['route', IC.sky], '監視': ['gauge', IC.sky], 'Microsoft Entra ID': ['id-card', IC.sky],
};
/** The resources of the series (SERIES §2) as rows for the home page's 最近 table. [ours] names; type strings [shot] */
export const SERIES_RESOURCES = [
  ['cram-ai-api', 'App Service', '20 分鐘之前'], ['cramdb', 'SQL 資料庫', '20 分鐘之前'], ['sql-cram-prod', 'SQL Server', '1 小時之前'], ['cram-ai-insights', 'Application Insights', '1 小時之前'],
  ['plan-cram-api', 'App Service 方案', '1 天前'], ['log-cram-prod', 'Log Analytics 工作區', '1 天前'], ['ag-cram-oncall', '動作群組', '3 天前'], ['rg-cram-prod', '資源群組', '3 天前'],
  ['cram-ai-worker', 'App Service', '1 週前'], ['kv-cram-prod', 'Key Vault', '1 週前'], ['stcramexams', '儲存體帳戶', '1 個月前'], ['cram-ai', 'Foundry', '1 個月前'],
];

// ================================================================================================ frame pieces
/**
 * Portal top bar as in the learner's screenshots: waffle, menu, 「Microsoft Azure」 (plain text), search 「搜尋資源、服務及文件 (G+/)」,
 * Copilot button, Cloud Shell / notifications / settings / help / feedback icons, and a fictional account block.
 * o: {search, copilot (true), account: {email, tenant}, h (60), w (frame width: below 1800 the bar compacts like the real portal — narrower search,
 *     no Cloud Shell / feedback icons)} → element
 */
export function portalTop({ search = '搜尋資源、服務及文件 (G+/)', copilot = true, account = ACCOUNT, h = 60, w = 1920 } = {}) {
  return node(`<div class="az-ptop ${w < 1800 ? 'is-compact' : ''}" style="height:${h}px">
    <span class="az-ptop-ic">${ic('grip', 26)}</span><span class="az-ptop-ic">${ic('menu', 28)}</span><span class="az-wordmark az-ptop-wm">Microsoft Azure</span>
    <span class="az-ptop-search">${ic('search', 22)}<span>${esc(search)}</span></span>
    <span class="az-ptop-right">${copilot ? `<span class="az-ptop-copilot">${ic('sparkles', 22, '#8764B8')}<span>Copilot</span></span>` : ''}
      ${['square-terminal', 'bell', 'settings', 'circle-help', 'message-square-heart'].map(n => `<span class="az-ptop-ic">${ic(n, 25)}</span>`).join('')}
      <span class="az-ptop-acct"><span class="az-e">${esc(account.email)}</span><span class="az-t">${esc(account.tenant)}</span></span>
      <span class="az-ptop-av">${ic('user', 24, '#fff')}</span></span></div>`);
}
function menuHtml(menu, active, { search = true } = {}) {
  const item = ([n, i, c], sub) => `<div class="az-pm-i ${sub ? 'sub' : ''} ${n === active ? 'is-on' : ''}" data-name="${esc(n)}">${ic(i || 'circle', 22, c || IC.sky)}<span>${esc(n)}</span></div>`;
  const body = menu.map(e => {
    if (Array.isArray(e)) return item(e, false);
    if (!e.g) return e.items.map(x => item(x, false)).join('');
    const open = e.open !== false;
    const head = e.star ? `<div class="az-pm-star">${ic('star', 20, IC.sky)}<span>${esc(e.g)}</span></div>` : `<div class="az-pm-g" data-name="${esc(e.g)}">${ic(open ? 'chevron-down' : 'chevron-right', 20)}<span>${esc(e.g)}</span></div>`;
    return head + (open ? e.items.map(x => item(x, !e.star)).join('') : '');
  }).join('');
  return `${search ? `<div class="az-pm-top"><span class="az-pm-search">${ic('search', 18)}<span>搜尋</span></span><span class="az-pm-tool">${ic('chevrons-up-down', 18)}</span><span class="az-pm-tool">${ic('chevrons-left', 20)}</span></div>` : ''}${body}`;
}
/**
 * A zh-TW resource blade like screenshots 3–4: top bar, breadcrumb 「首頁」, header 「resource | page」 + type line + … + command chips + ✕,
 * left resource menu (search box 「搜尋」, groups ∨ open / › collapsed, the active item on grey), command bar, content.
 * o: {w, h, resource, page, type, crumbs (['首頁']), menu (AZ.APPSERVICE_MENU …; null = no menu), active, cmds ([[icon, label, {dd}]]), chips (['為此資源產生查詢', …]),
 *     icon, iconBg, chip (status chip after the title), account, close (true), read (id prefix)}
 * → {el, overlay, top, menuEl, cmdbar, content (= page), item(name), group(name), cmd(label), setActive(name)}
 */
export function portalFrame({ w = 1920, h = 1080, resource = 'cram-ai-api', page = '概觀', type = 'App Service', crumbs = ['首頁'], menu = APPSERVICE_MENU, active, cmds = [], chips = [],
  icon, iconBg, chip = null, account = ACCOUNT, close = true, read: rid = 'pf', menuW = 360 } = {}) {
  const ti = TYPE_ICON[type] || ['layout-grid', IC.sky];
  const icn = icon || ti[0], bg = iconBg || ti[1];
  active = active ?? page;
  const el = node(`<div class="az az-pb" style="width:${w}px;height:${h}px">
    <div class="az-pb-crumb">${crumbs.map(c => `<span>${esc(c)}</span>`).join(`<span class="sep">${ic('chevron-right', 16)}</span>`)}</div>
    <div class="az-pb-head"><span class="az-pb-icon" style="color:${bg}">${ic(icn, 40)}</span>
      <div class="az-col"><span class="az-pb-title"${rd(rid + '-title')}><b>${esc(resource)}</b>${page ? `<i>|</i>${esc(page)}` : ''}</span><span class="az-pb-type"${rd(rid + '-type')}>${esc(type)}</span></div>
      <span class="az-pb-more">${ic('ellipsis', 24)}</span>${chips.map(c => `<span class="az-pb-chip">${esc(c)}</span>`).join('')}
      ${close ? `<span class="az-pb-close">${ic('x', 28)}</span>` : ''}</div>
    <div class="az-pb-body">${menu ? `<div class="az-pm" style="width:${menuW}px">${menuHtml(menu, active)}</div>` : ''}
      <div class="az-pb-main">${cmds && cmds.length ? `<div class="az-pb-cmd">${cmds.map(([i, l, o = {}]) => `<span class="az-cmd" data-name="${esc(l)}">${ic(i, 22)}<span>${esc(l)}</span>${o.dd ? ic('chevron-down', 18) : ''}</span>`).join('')}</div>` : ''}
        <div class="az-pb-content"></div></div></div></div>`);
  el.prepend(portalTop({ account, w }));
  if (chip) el.querySelector('.az-pb-title').after(statusChip(chip, { read: rid + '-chip' }));
  const overlay = node(`<div class="az-over" style="width:${w}px;height:${h}px"></div>`); el.append(overlay);
  const api = { el, overlay, top: el.querySelector('.az-ptop'), body: el.querySelector('.az-pb-body'), menuEl: el.querySelector('.az-pm'), cmdbar: el.querySelector('.az-pb-cmd'), content: el.querySelector('.az-pb-content'),
    item: n => find(el, '.az-pm-i', n), group: n => find(el, '.az-pm-g', n), cmd: n => find(el, '.az-pb-cmd .az-cmd', n),
    setActive(n) { el.querySelectorAll('.az-pm-i').forEach(e => e.classList.toggle('is-on', e.dataset.name === n)); return api; } };
  api.page = api.content;
  return api;
}
/**
 * Portal home (screenshot 1): 「Azure 服務」 row, 「資源」 with tabs 最近 / 我的最愛 and the table 名稱 / 類型 / 上次檢視時間, 「查看全部」, 「瀏覽」.
 * o: {w, h, services (AZ.HOME_SERVICES), rows ([[name, type, when]], default AZ.SERIES_RESOURCES), max (rows shown, 10), tab ('最近'), account}
 * → {el, overlay, top, content, service(name), row(i), cell(i, k)}
 */
export function portalHome({ w = 1920, h = 1080, services = HOME_SERVICES, rows = SERIES_RESOURCES, max = 9, tab = '最近', account = ACCOUNT, read: rid = 'home' } = {}) {
  const tbl = `<table class="az-table az-home-t"><thead><tr><th${rd(rid + '-h0')}>名稱</th><th${rd(rid + '-h1')}>類型</th><th${rd(rid + '-h2')}>上次檢視時間</th></tr></thead><tbody>${rows.slice(0, max).map(([n, t, when], i) => {
    const [ti, c] = TYPE_ICON[t] || ['layout-grid', IC.sky];
    return `<tr><td class="link" data-key="n"><span class="az-st">${ic(ti, 22, c)}<span>${esc(n)}</span></span></td><td data-key="t">${esc(t)}</td><td data-key="w">${esc(when)}</td></tr>`; }).join('')}</tbody></table>`;
  const el = node(`<div class="az az-pb az-home" style="width:${w}px;height:${h}px"><div class="az-home-in">
    <div class="az-home-h"${rd(rid + '-svc')}>Azure 服務</div>
    <div class="az-home-svc">${services.map(([n, i, c, link]) => `<div class="az-home-s ${link ? 'is-link' : ''}" data-name="${esc(n)}"><span class="ic">${ic(i, 44, c)}</span><span class="az-l">${esc(n)}</span></div>`).join('')}</div>
    <div class="az-home-h"${rd(rid + '-res')}>資源</div>
    <div class="az-tabs az-home-tabs">${['最近', '我的最愛'].map(t => `<span class="az-tab ${t === tab ? 'is-on' : ''}">${t}</span>`).join('')}</div>
    ${tbl}<div class="az-link az-home-all">查看全部</div><div class="az-home-h">瀏覽</div></div></div>`);
  el.prepend(portalTop({ account, w }));
  const overlay = node(`<div class="az-over" style="width:${w}px;height:${h}px"></div>`); el.append(overlay);
  const t = el.querySelector('.az-home-t');
  return { el, overlay, top: el.querySelector('.az-ptop'), content: el.querySelector('.az-home-in'), service: n => find(el, '.az-home-s', n),
    row: i => t.tBodies[0].rows[i], cell: (i, k) => t.tBodies[0].rows[i]?.querySelector(`td[data-key="${k}"]`) };
}
/**
 * The 入口網站功能表 flyout (screenshot 2) — append to a frame: `home.el.append(AZ.portalMenu({ active: '監視' }).el)`. o: {active, top (60), h, w (420), scrim (true)}
 * → {el, item(name)}
 */
export function portalMenu({ active = null, top = 60, h = 1020, w = 420, scrim = true } = {}) {
  const el = node(`<div class="az-pmenu-wrap" style="top:${top}px;height:${h}px">${scrim ? '<div class="az-scrim"></div>' : ''}
    <div class="az-pmenu" style="width:${w}px"><div class="az-pmenu-hb">${ic('menu', 28, IC.sky)}</div>${menuHtml(PORTAL_MENU, active, { search: false })}</div></div>`);
  return { el, item: n => find(el, '.az-pm-i', n) };
}

// ================================================================================================ small widgets
/** Checkbox. o: {label, on, read} → {el, set(on)} */
export function checkbox({ label = '', on = false, read: rid = '', dis = false } = {}) {
  const el = node(`<span class="az-cb ${on ? 'is-on' : ''} ${dis ? 'is-dis' : ''}"><i>${ic('check', 18, '#fff')}</i>${label ? `<span${rd(rid)}>${esc(label)}</span>` : ''}</span>`);
  return { el, set(o) { el.classList.toggle('is-on', !!o); } };
}
/** Radio group. o: {label, options, value, row (horizontal), read} → {el, opt(name), set(value)} */
export function radio({ label = '', options = [], value = null, row = false, read: rid = '' } = {}) {
  const el = node(`<div class="az-field">${label ? `<span class="az-label">${esc(label)}</span>` : ''}<div class="az-radios ${row ? 'is-row' : ''}">${options.map((o, i) => `<span class="az-rb" data-name="${esc(o)}"><i></i><span${rd(rid && `${rid}-${i}`)}>${esc(o)}</span></span>`).join('')}</div></div>`);
  const api = { el, opt: n => find(el, '.az-rb', n), set(v) { el.querySelectorAll('.az-rb').forEach(e => e.classList.toggle('is-on', e.dataset.name === v)); return api; } };
  return api.set(value);
}
/** Segmented switch (e.g. 狀態 關閉 | 開啟 on the identity page). o: {label, options, value, read} → {el, opt(name), set(value)} */
export function segmented({ label = '', options = ['關閉', '開啟'], value = '關閉', read: rid = '' } = {}) {
  const el = node(`<div class="az-field">${label ? `<span class="az-label">${esc(label)}</span>` : ''}<div class="az-seg">${options.map(o => `<span data-name="${esc(o)}"${rd(rid && o === value ? rid : '')}>${esc(o)}</span>`).join('')}</div></div>`);
  const api = { el, opt: n => find(el, '.az-seg > span', n), set(v) { el.querySelectorAll('.az-seg > span').forEach(e => e.classList.toggle('is-on', e.dataset.name === v)); return api; } };
  return api.set(value);
}
/** A plain value box (input look). o: {value, w, mono, copy, dd (chevron), ph (placeholder look), read} → element */
export function valueBox({ value = '', w = null, mono = false, copy = false, dd = false, ph = false, read: rid = '' } = {}) {
  return node(`<span class="az-input ${ph ? 'is-ph' : ''}" style="${w ? `width:${w}px;` : ''}${dd || copy ? 'justify-content:space-between;' : ''}"><span class="${mono ? 'az-mono' : ''}"${rd(rid)}>${esc(value)}</span>${dd ? ic('chevron-down', 22) : ''}${copy ? ic('copy', 22, IC.sky) : ''}</span>`);
}
/**
 * Form: label column + control column (the portal's create / settings layout). rows: [[label, control (element | api | string), {req, info, sub}]] → {el, row(label)}
 */
export function form(rows, { labelW = 380, gap = 18, read: rid = '' } = {}) {
  const el = node(`<div class="az-form" style="grid-template-columns:${labelW}px 1fr;row-gap:${gap}px"></div>`);
  rows.forEach(([lab, ctl, o = {}], i) => {
    const L = node(`<span class="az-form-l" data-name="${esc(lab)}"><span${rd(rid && `${rid}-l${i}`)}>${esc(lab)}</span>${o.req ? '<span class="az-req">*</span>' : ''}${o.info ? ic('info', 18, '#616161') : ''}</span>`);
    const C = document.createElement('span'); C.className = 'az-form-c';
    if (typeof ctl === 'string') { const v = valueBox({ value: ctl, read: rid && `${rid}-v${i}` }); C.append(v); } else if (ctl) C.append(el$(ctl));
    if (o.sub) C.append(node(`<span class="az-sub" style="white-space:normal">${esc(o.sub)}</span>`));
    el.append(L, C);
  });
  return { el, row: n => find(el, '.az-form-l', n)?.nextElementSibling };
}
/** Section title (+ optional one-line description). → element */
export const section = (title, sub = '', { read: rid = '' } = {}) => node(`<div class="az-psec"><span class="az-h2"${rd(rid)}>${esc(title)}</span>${sub ? `<span class="az-sub">${esc(sub)}</span>` : ''}</div>`);
/** Right-hand context pane (a blade opened on top): title, ✕, body elements, buttons ([label, {primary}]). Append it to portalFrame().body (it covers the content
 *  and the menu from the right, below the header). → {el, body, btn(label)} */
export function pane({ title = '', sub = '', w = 760, body = [], buttons = [], top = 0, read: rid = 'pane' } = {}) {
  const el = node(`<div class="az-panelR az-ppane" style="width:${w}px;top:${top}px"><div class="az-row" style="gap:12px"><div class="az-col"><span class="az-h2" style="margin:0"${rd(rid + '-title')}>${esc(title)}</span>${sub ? `<span class="az-sub">${esc(sub)}</span>` : ''}</div><span style="margin-left:auto;color:#424242">${ic('x', 28)}</span></div><div class="az-ppane-b"></div>${buttons.length ? `<div class="az-row az-ppane-btns">${buttons.map(([l, o = {}]) => `<span class="az-btn ${o.primary ? 'is-primary' : ''}" data-name="${esc(l)}">${esc(l)}</span>`).join('')}</div>` : ''}</div>`);
  const b = el.querySelector('.az-ppane-b'); body.forEach(x => b.append(el$(x)));
  return { el, body: b, btn: n => find(el, '.az-ppane-btns .az-btn', n) };
}
/** Table with the zh-TW "more" row 「… N 個更多」. Same options as AZ.table (cells may carry {text, status, link, icon, color}). */
export const tableZh = o => table({ ...o, moreText: o.moreText ?? (o.more ? `… ${Number(o.more).toLocaleString('en-US')} 個更多` : undefined) });
/** Fluent tabs (no data-read). → {el, tab(n), set(n)} */
function tabsEl(items, active, cls = '') {
  const el = node(`<div class="az-tabs ${cls}">${items.map(t => `<span class="az-tab ${t === active ? 'is-on' : ''}" data-name="${esc(t)}">${esc(t)}</span>`).join('')}</div>`);
  return { el, tab: n => find(el, '.az-tab', n), set(n) { el.querySelectorAll('.az-tab').forEach(e => e.classList.toggle('is-on', e.dataset.name === n)); } };
}
/** Info / warning bar in portal style (the light-blue info strip of screenshots 3–4). o: {kind ('info'|'warn'|'err'|'ok'), text, link, close} → element */
export function infoBar({ kind = 'info', text = '', link = '', close = false, read: rid = '' } = {}) {
  const icn = { info: 'info', warn: 'triangle-alert', err: 'circle-x', ok: 'circle-check' }[kind];
  return node(`<div class="az-pinfo ${kind}">${ic(icn, 24)}<span${rd(rid)}>${esc(text)}${link ? ` <span class="az-link">${esc(link)}</span>` : ''}</span>${close ? `<span style="margin-left:auto">${ic('x', 22)}</span>` : ''}</div>`);
}
/** Command bar inside a content area (for panes and sub-pages). cmds: [[icon, label, {dd}]] → element */
export const cmdRow = cmds => node(`<div class="az-pb-cmd is-inline">${cmds.map(([i, l, o = {}]) => `<span class="az-cmd" data-name="${esc(l)}">${ic(i, 22)}<span>${esc(l)}</span>${o.dd ? ic('chevron-down', 18) : ''}</span>`).join('')}</div>`);

// ================================================================================================ App Service: scale, slots, health
/**
 * 相應放大 (App Service 方案) page with Azure Monitor autoscale (lesson 2). Labels: 手動縮放, 自訂自動調整, 根據計量進行縮放, 調整為特定執行個體計數, 新增規則,
 * 新增調整規模的條件, 實例限制 / 最大 / 預設, 執行歷程記錄, 儲存 [learn]; 最小 [ours: antonym of Learn's 最大, unverified]; rule sentence words [en].
 * o: {mode ('custom'|'manual'), rules: [{dir: 'out'|'in', when (sentence), action}], limits: {min, max, def}, condition ('預設'), tab} → {el, rule(i), limit(name), radio(name)}
 */
export function autoscale({ mode = 'custom', rules = [{ dir: 'out', when: 'When plan-cram-api (Average) CpuPercentage > 65', action: 'Increase count by 1' }, { dir: 'in', when: 'When plan-cram-api (Average) CpuPercentage < 30', action: 'Decrease count by 1' }],
  limits = { min: 2, max: 6, def: 2 }, condition = '預設', tab = '設定', read: rid = 'as' } = {}) {
  const el = node(`<div class="az-col" style="gap:18px">${tabsEl(['設定', '執行歷程記錄', 'JSON'], tab).el.outerHTML}
    <div class="az-radios is-row az-as-mode">${['手動縮放', '自訂自動調整'].map(o => `<span class="az-rb ${(mode === 'custom') === (o === '自訂自動調整') ? 'is-on' : ''}" data-name="${o}"><i></i><span${rd(rid + '-mode-' + o)}>${o}</span></span>`).join('')}</div>
    <div class="az-card az-as-cond"><div class="az-row" style="gap:12px">${ic('chevron-down', 20)}<span class="az-h3"${rd(rid + '-cond')}>${esc(condition)}</span><span class="az-sub">Auto created default scale condition</span></div>
      <div class="az-radios is-row" style="margin:16px 0 8px">${['根據計量進行縮放', '調整為特定執行個體計數'].map((o, i) => `<span class="az-rb ${i === 0 ? 'is-on' : ''}" data-name="${o}"><i></i><span>${o}</span></span>`).join('')}</div>
      <div class="az-as-rules">${rules.map((r, i) => `<div class="az-as-rule ${r.dir}" data-i="${i}"><span class="dir">${r.dir === 'out' ? 'Scale out' : 'Scale in'}</span><span class="w"${rd(`${rid}-r${i}`)}>${esc(r.when)}</span><span class="a"${rd(`${rid}-a${i}`)}>${esc(r.action)}</span></div>`).join('')}
        <span class="az-link az-row" style="gap:8px">${ic('plus', 20, IC.sky)}<span>新增規則</span></span></div>
      <div class="az-row az-as-lim"><span class="az-label" style="min-width:150px"${rd(rid + '-lim')}>實例限制</span>${[['最小', limits.min], ['最大', limits.max], ['預設', limits.def]].map(([n, v]) => `<span class="az-field" data-name="${n}"><span class="az-sub">${n}</span><span class="az-input" style="width:140px"><span${rd(`${rid}-${n}`)}>${v}</span></span></span>`).join('')}</div></div>
    <span class="az-link az-row" style="gap:8px">${ic('plus', 20, IC.sky)}<span>新增調整規模的條件</span></span></div>`);
  return { el, rule: i => el.querySelector(`.az-as-rule[data-i="${i}"]`), limit: n => el.querySelector(`.az-as-lim .az-field[data-name="${n}"] .az-input`), radio: n => find(el, '.az-rb', n) };
}
/**
 * 縮放規則 pane (the rule editor). Labels: 縮放規則, 運算子, 用於觸發調整動作的計量閾值, 作業, 執行個體計數, 冷卻時間, 新增 [learn]; Metric name, Duration, Time aggregation [en].
 * o: {metric ('CPU Percentage'), aggregation ('Average'), operator ('大於'), threshold (65), duration (10), operation ('增加計數依據'), count (1), cooldown (5), chart (lineChart opts or null)}
 * → pane api + {field(label)}
 */
export function scaleRulePane({ metric = 'CPU Percentage', aggregation = 'Average', operator = '大於', threshold = 65, duration = 10, operation = '增加計數依據', count = 1, cooldown = 5, w = 820, read: rid = 'rule' } = {}) {
  const f = form([
    ['Metric name', valueBox({ value: metric, dd: true, read: rid + '-metric' })],
    ['Time aggregation', valueBox({ value: aggregation, dd: true })],
    ['運算子', valueBox({ value: operator, dd: true, read: rid + '-op' })],
    ['用於觸發調整動作的計量閾值', valueBox({ value: String(threshold), w: 200, read: rid + '-thr' }), { req: true }],
    ['Duration (minutes)', valueBox({ value: String(duration), w: 200, read: rid + '-dur' }), { req: true }],
    ['作業', valueBox({ value: operation, dd: true, read: rid + '-opn' })],
    ['執行個體計數', valueBox({ value: String(count), w: 200, read: rid + '-cnt' }), { req: true }],
    ['冷卻時間 (分鐘)', valueBox({ value: String(cooldown), w: 200, read: rid + '-cool' }), { req: true }],
  ], { labelW: 330, gap: 16 });
  const p = pane({ title: '縮放規則', w, body: [f.el], buttons: [['新增', { primary: true }]], read: rid });
  return { ...p, field: n => f.row(n)?.firstElementChild };
}
/**
 * 部署位置 page (lesson 2): command bar 新增位置 · 交換, table 名稱 / 狀態 / App Service 方案 / 流量 %. Labels: 新增位置, 交換, 流量 % [learn]; 名稱 [shot]; 狀態 [ours: common];
 * App Service 方案 [shot]; status words [en].  o: {app, slots: [{name, status, plan, traffic, prod}], sel} → {el, row(i), cell(i, k)}
 */
export function slotsPage({ app = 'cram-ai-api', slots = null, sel = -1, read: rid = 'slots' } = {}) {
  slots = slots || [{ name: app, status: 'Running', plan: 'plan-cram-api', traffic: '100', prod: true }, { name: `${app}-staging`, status: 'Running', plan: 'plan-cram-api', traffic: '0' }];
  const el = node('<div class="az-col" style="gap:18px"></div>');
  el.append(cmdRow([['plus', '新增位置'], ['arrow-right-left', '交換'], ['history', '記錄'], ['refresh-cw', '重新整理']]));
  const t = tableZh({ columns: [{ key: 'n', label: '名稱' }, { key: 's', label: '狀態' }, { key: 'p', label: 'App Service 方案' }, { key: 't', label: '流量 %', num: true }],
    rows: slots.map(s => [{ text: s.name, link: true, chip: s.prod ? 'PRODUCTION' : null }, { text: s.status, status: s.status === 'Running' ? 'ok' : 'warn' }, s.plan, s.traffic]), sel, read: rid });
  el.append(t.el);
  return { el, row: t.row, cell: t.cell };
}
/**
 * 交換 dialog (pane). Labels: 交換, 來源, 目標, 使用預覽執行交換, 來源位置變更, 目標位置變更, 開始交換, 關閉 [learn]; table headings [en].
 * o: {app, source ('staging'), target ('production'), preview (false), tab, changes: [[setting, type, old, new]]} → pane api + {tabs, table}
 */
export function swapPane({ app = 'cram-ai-api', source = null, target = null, preview = false, tab = '來源位置變更', changes = [['ASPNETCORE_ENVIRONMENT', 'AppSetting', 'Staging', 'Production'], ['ConnectionStrings__Sql', 'ConnectionString', 'sql-cram-staging', 'sql-cram-prod']], w = 1120, read: rid = 'swap' } = {}) {
  source = source || `${app}-staging`; target = target || `${app} (production)`;
  const cb = checkbox({ label: '使用預覽執行交換', on: preview, read: rid + '-pv' });
  const f = form([['來源', valueBox({ value: source, dd: true, read: rid + '-src' })], ['目標', valueBox({ value: target, dd: true, read: rid + '-tgt' })]], { labelW: 160 });
  const tb = tabsEl(['來源位置變更', '目標位置變更'], tab);
  const t = tableZh({ columns: [{ key: 's', label: 'Setting' }, { key: 'y', label: 'Type' }, { key: 'o', label: 'Old value' }, { key: 'n', label: 'New value' }], rows: changes, read: rid + '-t' });
  const p = pane({ title: '交換', w, body: [cb.el, f.el, tb.el, t.el], buttons: [['開始交換', { primary: true }], ['關閉']], read: rid });
  return { ...p, tabs: tb, table: t, checkbox: cb };
}
/**
 * 健康情況檢查 page (lesson 2). Labels: 健康情況檢查, 執行個體 (tab), 啟用, 儲存, 重新啟動, 計量, 狀況不良 / 狀況良好 [learn]; Path, Load balancing threshold [en].
 * o: {tab ('健康情況檢查'|'執行個體'), on, path, threshold ('10'), instances: [[name, status ('狀況良好'|'狀況不良')]]} → {el, toggle, path, row(i)}
 */
export function healthCheckPage({ tab = '健康情況檢查', on = true, path = '/healthz', threshold = '10', instances = [['pd1sdlwk00001', '狀況良好'], ['pd1sdlwk00002', '狀況良好']], read: rid = 'hc' } = {}) {
  const el = node('<div class="az-col" style="gap:20px"></div>');
  el.append(cmdRow([['save', '儲存'], ['x', 'Discard'], ['chart-column', '計量']]));
  el.append(tabsEl(['健康情況檢查', '執行個體'], tab).el);
  let tg = null, pth = null, t = null;
  if (tab === '健康情況檢查') {
    tg = segmented({ options: ['啟用', '停用'], value: on ? '啟用' : '停用', read: rid + '-on' });
    pth = valueBox({ value: path, w: 520, mono: true, read: rid + '-path' });
    el.append(form([['健康情況檢查', tg], ['Path', pth, { req: true, info: true }], ['Load balancing threshold', valueBox({ value: threshold, w: 200, dd: true, read: rid + '-thr' }), { info: true }]], { labelW: 360 }).el);
  } else {
    t = tableZh({ columns: [{ key: 'n', label: '名稱' }, { key: 's', label: '狀態' }, { key: 'r', label: '' }], rows: instances.map(([n, s]) => [n, { text: s, status: s === '狀況良好' ? 'ok' : 'err' }, { text: '重新啟動', link: true }]), read: rid + '-i' });
    el.append(t.el);
  }
  return { el, toggle: tg, path: pth, row: i => t && t.row(i) };
}

// ================================================================================================ TLS, domains, certificates
/**
 * 組態 › 一般設定 (lesson 3, 2): 只限 HTTPS, 最低 TLS 版本, HTTP 版本, AlwaysOn, Stack 設定 [learn]; Session affinity [en]. o: {httpsOnly, minTls ('1.2'), http ('2.0'), alwaysOn, arr, stack ('.NET 10')}
 * → {el, row(label)}
 */
export function generalSettings({ httpsOnly = true, minTls = '1.2', http = '2.0', alwaysOn = true, arr = false, stack = '.NET 10 (LTS)', read: rid = 'gs' } = {}) {
  const el = node('<div class="az-col" style="gap:16px"></div>');
  el.append(tabsEl(['一般設定', 'Path mappings'], '一般設定').el);
  const onoff = (v, id) => segmented({ options: ['關閉', '開啟'], value: v ? '開啟' : '關閉', read: id });
  const f = form([
    ['Stack 設定', valueBox({ value: stack, dd: true, w: 420, read: rid + '-stack' })],
    ['只限 HTTPS', onoff(httpsOnly, rid + '-https')],
    ['最低 TLS 版本', radio({ options: ['1.0', '1.1', '1.2', '1.3'], value: minTls, row: true, read: rid + '-tls' })],
    ['HTTP 版本', radio({ options: ['1.1', '2.0'], value: http, row: true })],
    ['AlwaysOn', onoff(alwaysOn, rid + '-ao')],
    ['Session affinity', onoff(arr, rid + '-arr')],
  ], { labelW: 330 });
  el.append(f.el);
  return { el, row: f.row };
}
export const tlsSettings = generalSettings;
/**
 * 自訂網域 page (lesson 3): 新增自訂網域 [learn]; table 自訂網域 [learn] / Status / Binding type / Certificate [en]; status values 'Secured' / 'No binding' [en].
 * o: {domains: [[domain, status, binding, cert]]} → {el, row(i), cell(i, k)}
 */
export function customDomainsPage({ domains = [['cram-ai-api.azurewebsites.net', '', '', ''], ['api.contoso-cram.com', 'Secured', 'SNI SSL', 'App Service 受控憑證']], read: rid = 'cd' } = {}) {
  const el = node('<div class="az-col" style="gap:18px"></div>');
  el.append(cmdRow([['plus', '新增自訂網域'], ['refresh-cw', '重新整理']]));
  const t = tableZh({ columns: [{ key: 'd', label: '自訂網域' }, { key: 's', label: 'Status' }, { key: 'b', label: 'Binding type' }, { key: 'c', label: 'Certificate' }],
    rows: domains.map(([d, s, b, c]) => [d, s ? { text: s, status: s === 'Secured' ? 'ok' : 'warn' } : '', b, c]), read: rid });
  el.append(t.el);
  return { el, row: t.row, cell: t.cell };
}
/**
 * DNS records at the domain registrar (NOT an Azure screen — a generic DNS manager, tagged 介面示意 by default). Columns 類型 / 主機 / 值 / TTL [ours].
 * o: {zone ('contoso-cram.com'), records: [[type, host, value, ttl, {warn}]], mock (true)} → {el, row(i), cell(i, k)}
 */
export function dnsTable({ zone = 'contoso-cram.com', records = [['A', '@', '20.205.243.166', '3600'], ['CNAME', 'api', 'cram-ai-api.azurewebsites.net', '3600'], ['TXT', 'asuid.api', '6F2A…9C1E', '3600']], mock = true, read: rid = 'dns' } = {}) {
  const el = node(`<div class="az-card az-dns"><div class="az-row" style="gap:14px;margin-bottom:14px">${ic('globe', 26, IC.sky)}<span class="az-h3"${rd(rid + '-zone')}>DNS · ${esc(zone)}</span>${mock ? '<span class="az-x-mock" style="margin-left:auto">介面示意</span>' : ''}</div></div>`);
  const t = tableZh({ columns: [{ key: 'y', label: '類型' }, { key: 'h', label: '主機' }, { key: 'v', label: '值' }, { key: 't', label: 'TTL', num: true }],
    rows: records.map(r => [{ text: r[0], mono: true }, { text: r[1], mono: true }, { text: r[2], mono: true }, r[3]]), read: rid });
  t.el.classList.add('az-dns-t'); el.append(t.el);
  return { el, row: t.row, cell: t.cell };
}
/**
 * 憑證 page (lesson 3): tabs 受控憑證 / 攜帶您自己的憑證 (.pfx) [learn], 新增憑證 [learn]; columns 名稱 [shot] / Expiration date [en] / 狀態 [ours: common]. Status values pass-through.
 * o: {tab, certs: [[name, expires, status ('ok'|'warn'|'err', text)]]} → {el, row(i), cell(i, k)}
 */
export function certificatesPage({ tab = '受控憑證', certs = [['api.contoso-cram.com', '2027-05-21', ['ok', 'Healthy']]], read: rid = 'cert' } = {}) {
  const el = node('<div class="az-col" style="gap:18px"></div>');
  el.append(tabsEl(['受控憑證', '攜帶您自己的憑證 (.pfx)', 'Public key certificates (.cer)'], tab).el);
  el.append(cmdRow([['plus', '新增憑證'], ['refresh-cw', '重新整理']]));
  const t = tableZh({ columns: [{ key: 'n', label: '名稱' }, { key: 'e', label: 'Expiration date' }, { key: 's', label: '狀態' }], rows: certs.map(([n, e, [k, s]]) => [n, e, { text: s, status: k }]), read: rid });
  el.append(t.el);
  return { el, row: t.row, cell: t.cell };
}

// ================================================================================================ identity & access
/**
 * 存取控制 (IAM) page (lesson 4). Tabs 角色指派 [learn] + Check access / Roles [en]; 新增 [learn]; columns 名稱 [shot] / 類型 [shot] / 角色 [learn] / 範圍 [learn].
 * Role names 擁有者, 參與者, 讀取者, 儲存體 Blob 資料參與者 [learn]; 'Key Vault Secrets User' [en] (Learn has the half-translated 「金鑰保存庫 secrets user」).
 * o: {rows: [[name, type, role, scope, {warn}]], tab, more} → {el, row(i), cell(i, k)}
 */
export function iamPage({ rows = [['開發者', '使用者', '擁有者', '訂用帳戶 (繼承)'], ['同事', '使用者', '擁有者', '訂用帳戶 (繼承)'], ['外包', '使用者', '擁有者', '訂用帳戶 (繼承)'], ['老闆', '使用者', '擁有者', '訂用帳戶 (繼承)'], ['cram-ai-api', '應用程式', 'Key Vault Secrets User', '此資源']], tab = '角色指派', more = 0, read: rid = 'iam' } = {}) {
  const el = node('<div class="az-col" style="gap:18px"></div>');
  el.append(cmdRow([['plus', '新增', { dd: true }], ['download', 'Download role assignments'], ['refresh-cw', '重新整理']]));
  el.append(tabsEl(['Check access', '角色指派', 'Roles', 'Deny assignments'], tab).el);
  const t = tableZh({ columns: [{ key: 'n', label: '名稱' }, { key: 'y', label: '類型' }, { key: 'r', label: '角色' }, { key: 's', label: '範圍' }],
    rows: rows.map(([n, y, r, s]) => [{ text: n, icon: y === '應用程式' ? 'app-window' : y === '群組' ? 'users' : 'user', color: y === '應用程式' ? IC.purple : IC.sky }, y, r, s]), more, read: rid });
  el.append(t.el);
  return { el, row: t.row, cell: t.cell };
}
/**
 * 新增角色指派 picker (pane). Tabs 角色 / 成員 / 檢閱 + 指派 [learn]; 工作功能角色 / 特權管理員角色 [learn]; 成員: 使用者、群組或服務主體 / 受控識別, 選取成員 [learn].
 * o: {step ('角色'|'成員'), sub ('工作功能角色'), roles: [[name, desc]], sel (role name), assignTo ('受控識別'), members: [name]} → pane api + {role(name)}
 */
export function addRoleAssignment({ step = '角色', sub = '工作功能角色', roles = [['Key Vault Secrets User', 'Read secret contents.'], ['儲存體 Blob 資料參與者', 'Read, write, and delete Azure Storage containers and blobs.'], ['讀取者', 'View all resources, but does not allow you to make any changes.']], sel = 'Key Vault Secrets User', assignTo = '受控識別', members = ['cram-ai-api'], w = 1180, read: rid = 'ra' } = {}) {
  const body = [tabsEl(['角色', '成員', '條件', '檢閱 + 指派'], step).el];
  if (step === '角色') {
    body.push(tabsEl(['工作功能角色', '特權管理員角色'], sub, 'is-sub').el, valueBox({ value: '依角色名稱、描述、權限或識別碼搜尋', ph: true, w: 700 }));
    const t = tableZh({ columns: [{ key: 'n', label: '名稱' }, { key: 'd', label: 'Description' }], rows: roles.map(([n, d]) => [n, d]), sel: roles.findIndex(r => r[0] === sel), read: rid + '-r' });
    body.push(t.el);
  } else {
    body.push(form([['角色', valueBox({ value: sel, read: rid + '-role' })], ['存取權指派對象', radio({ options: ['使用者、群組或服務主體', '受控識別'], value: assignTo, read: rid + '-to' })],
      ['成員', node(`<span class="az-col" style="gap:10px"><span class="az-link az-row" style="gap:8px">${ic('plus', 20, IC.sky)}<span>選取成員</span></span>${members.map((m, i) => `<span class="az-row" style="gap:10px">${ic('app-window', 22, IC.purple)}<span${rd(`${rid}-m${i}`)}>${esc(m)}</span></span>`).join('')}</span>`)]], { labelW: 300 }).el);
  }
  const p = pane({ title: '新增角色指派', w, body, buttons: [['檢閱 + 指派', { primary: true }], ['上一步'], ['下一步']], read: rid });
  return { ...p, role: n => [...p.el.querySelectorAll('tbody tr')].find(r => r.cells[0]?.textContent.trim() === n) };
}
/**
 * 設定 › 身分識別 page (lesson 4). Tabs 系統指派 / 使用者指派, 狀態, 關閉 / 開啟, 儲存, 新增 [learn]; Object (principal) ID, Azure role assignments, Discard [en].
 * o: {tab, on, objectId (placeholder GUID — fictional), assigned: [[name, rg]]} → {el, status, objectId}
 */
export function identityPage({ tab = '系統指派', on = true, objectId = 'aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb', assigned = [['id-cram-api', 'rg-cram-prod']], read: rid = 'id' } = {}) {
  const el = node('<div class="az-col" style="gap:20px"></div>');
  el.append(tabsEl(['系統指派', '使用者指派'], tab).el);
  let st = null, oid = null;
  if (tab === '系統指派') {
    el.append(cmdRow([['save', '儲存'], ['x', 'Discard'], ['refresh-cw', '重新整理']]));
    st = segmented({ options: ['關閉', '開啟'], value: on ? '開啟' : '關閉', read: rid + '-status' });
    oid = valueBox({ value: on ? objectId : '', copy: on, mono: true, w: 700, read: on ? rid + '-oid' : '' });
    el.append(form([['狀態', st], ['Object (principal) ID', oid, { info: true }], ['Permissions', node(`<span class="az-btn">${ic('key-round', 20, IC.gold)}<span>Azure role assignments</span></span>`)]], { labelW: 330 }).el);
  } else {
    el.append(cmdRow([['plus', '新增'], ['trash-2', '移除'], ['refresh-cw', '重新整理']]));
    el.append(tableZh({ columns: [{ key: 'n', label: '名稱' }, { key: 'g', label: '資源群組' }], rows: assigned, read: rid + '-ua' }).el);
  }
  return { el, status: st, objectId: oid };
}
/**
 * Microsoft Entra ID › 概觀 content, exactly as screenshot 4: command bar 新增 ∨ · 管理租用戶 · 新增功能 · 有任何意見反應嗎? ∨, the info strip, tabs 概觀 監視 屬性 建議 設定指南,
 * 搜尋您的租用戶, 基本資訊 (名稱, 租用戶識別碼, 主要網域, 授權 | 使用者, 群組, 應用程式, 裝置), 警示 card 「移轉至聚合的驗證方法原則」, 我的摘要 [shot].
 * Values are fictional (SERIES §2). Use inside portalFrame({ resource: 'Default Directory', page: '概觀', type: '', menu: AZ.ENTRA_MENU, icon: 'info', cmds: AZ.ENTRA_CMDS }).
 * o: {name, tenantId, domain, license, users, groups, apps, devices, alert (true)} → {el, field(label), alertCard, value(label)}
 */
export const ENTRA_CMDS = [['plus', '新增', { dd: true }], ['settings', '管理租用戶'], ['square-plus', '新增功能'], ['message-square-heart', '有任何意見反應嗎?', { dd: true }]];
export function entraOverview({ name = 'Default Directory', tenantId = 'c7a1e3d2-5b8f-4e0a-9c61-2f4b8d0e7a35', domain = 'contosocram.onmicrosoft.com', license = 'Microsoft Entra ID 免費', users = 4, groups = 0, apps = 3, devices = 0, alert = true, read: rid = 'entra' } = {}) {
  const kv = (k, v, link, copy, i) => `<span class="k" data-name="${esc(k)}"${rd(`${rid}-k${i}`)}>${esc(k)}</span><span class="v ${link ? 'link' : ''}"${rd(`${rid}-v${i}`)}>${esc(v)}${copy ? ` ${ic('copy', 20, IC.sky)}` : ''}</span>`;
  const el = node(`<div class="az-col az-entra" style="gap:0">
    <div class="az-pinfo info">${ic('info', 22)}<span class="az-link" style="text-decoration:underline">Microsoft Entra 擁有更簡單且整合的體驗，可管理您所有的身分識別與存取管理需求。試用全新的 Microsoft Entra 系統管理中心!</span>${ic('external-link', 18, IC.sky)}</div>
    ${tabsEl(['概觀', '監視', '屬性', '建議', '設定指南'], '概觀').el.outerHTML}
    <span class="az-input is-ph az-entra-search">${ic('search', 20)}<span>搜尋您的租用戶</span></span>
    <div class="az-h3 az-entra-h"${rd(rid + '-basic')}>基本資訊</div>
    <div class="az-entra-grid">
      <div class="az-props az-entra-p">${kv('名稱', name, 0, 0, 0)}${kv('租用戶識別碼', tenantId, 0, 1, 1)}${kv('主要網域', domain, 0, 0, 2)}${kv('授權', license, 0, 0, 3)}</div>
      <div class="az-props az-entra-p">${kv('使用者', users, 1, 0, 4)}${kv('群組', groups, 1, 0, 5)}${kv('應用程式', apps, 1, 0, 6)}${kv('裝置', devices, 1, 0, 7)}</div></div>
    ${alert ? `<div class="az-h3 az-entra-h"${rd(rid + '-alerts')}>警示</div>
    <div class="az-card az-entra-alert"><span class="w">${ic('triangle-alert', 52, '#D83B01')}</span><div class="az-col" style="gap:6px"><b${rd(rid + '-alert-t')}>移轉至聚合的驗證方法原則</b>
      <span${rd(rid + '-alert-m')}>請在 2025 年 9 月前將您的驗證方法從舊版 MFA 和 SSPR 原則移轉，以避免任何服務受影響</span><span class="az-link az-row" style="gap:6px">深入了解 ${ic('external-link', 18, IC.sky)}</span></div></div>` : ''}
    <div class="az-h3 az-entra-h">我的摘要</div></div>`);
  return { el, field: k => find(el, '.k', k), value: k => find(el, '.k', k)?.nextElementSibling, alertCard: el.querySelector('.az-entra-alert') };
}

// ================================================================================================ network & protection
/**
 * App Service › 網路 page (lesson 5): 輸入流量設定, 公用網路存取, 存取限制, 虛擬網路整合 [learn]; Private endpoints, Outbound traffic configuration, values [en].
 * o: {publicAccess ('Enabled with access restrictions'), restrictions ('1 rule'), privateEndpoints ('0 private endpoints'), vnet ('Not configured')} → {el, row(label)}
 */
export function networkPage({ publicAccess = 'Enabled with access restrictions', restrictions = '1 rule', privateEndpoints = '0 private endpoints', vnet = 'vnet-cram-prod/snet-app', read: rid = 'net' } = {}) {
  const el = node('<div class="az-col" style="gap:22px"></div>');
  const lnk = (v, id) => node(`<span class="az-link"${rd(id)}>${esc(v)}</span>`);
  el.append(section('輸入流量設定', '', { read: rid + '-in' }), form([['公用網路存取', lnk(publicAccess, rid + '-pub')], ['存取限制', lnk(restrictions, rid + '-ar')], ['Private endpoints', lnk(privateEndpoints, rid + '-pe')]], { labelW: 360 }).el);
  el.append(section('Outbound traffic configuration'), form([['虛擬網路整合', lnk(vnet, rid + '-vnet')]], { labelW: 360 }).el);
  return { el };
}
/**
 * 存取限制 page (lesson 5): 優先順序 [learn], 名稱 [shot], 來源 [ours], 動作 [learn] (允許 / 拒絕 [learn]); HTTP headers [en]; 不相符的規則動作 [learn].
 * o: {rules: [[priority, name, source, action ('允許'|'拒絕'), headers]], unmatched ('拒絕')} → {el, row(i), cell(i, k)}
 */
export function accessRestrictions({ rules = [['100', 'AllowFrontDoor', 'AzureFrontDoor.Backend', '允許', 'X-Azure-FDID=7c2e…a91f'], ['2147483647', 'Deny all', 'Any', '拒絕', '']], unmatched = '拒絕', read: rid = 'acr' } = {}) {
  const el = node('<div class="az-col" style="gap:18px"></div>');
  el.append(cmdRow([['plus', '新增'], ['trash-2', '刪除'], ['save', '儲存']]));
  el.append(form([['不相符的規則動作', radio({ options: ['允許', '拒絕'], value: unmatched, row: true, read: rid + '-un' })]], { labelW: 280 }).el);
  const t = tableZh({ columns: [{ key: 'p', label: '優先順序', num: true }, { key: 'n', label: '名稱' }, { key: 's', label: '來源' }, { key: 'a', label: '動作' }, { key: 'h', label: 'HTTP headers' }],
    rows: rules.map(([p, n, s, a, h]) => [p, n, { text: s, mono: true }, { text: a, status: a === '允許' ? 'ok' : 'err' }, { text: h, mono: true }]), read: rid });
  el.append(t.el);
  return { el, row: t.row, cell: t.cell };
}
/**
 * SQL Server › 網路 (lesson 5): tabs Public access / Private access, the 'Allow Azure services…' exception, private endpoint connections — all [en] (no zh source).
 * o: {tab ('Public access'|'Private access'), publicAccess ('Disable'|'Selected networks'), allowAzure (true = the trap), endpoints: [[name, state]]} → {el, allow (checkbox api)}
 */
export function sqlNetworking({ tab = 'Public access', publicAccess = 'Selected networks', allowAzure = true, endpoints = [['pe-sql-cram-prod', 'Approved']], read: rid = 'sqlnet' } = {}) {
  const el = node('<div class="az-col" style="gap:20px"></div>');
  el.append(tabsEl(['Public access', 'Private access', 'Connectivity'], tab).el);
  let allow = null;
  if (tab === 'Public access') {
    allow = checkbox({ label: 'Allow Azure services and resources to access this server', on: allowAzure, read: rid + '-allow' });
    el.append(form([['Public network access', radio({ options: ['Disable', 'Selected networks'], value: publicAccess, row: true, read: rid + '-pub' })], ['Exceptions', allow]], { labelW: 330 }).el);
  } else if (tab === 'Private access') {
    el.append(cmdRow([['plus', 'Create a private endpoint'], ['refresh-cw', '重新整理']]));
    el.append(tableZh({ columns: [{ key: 'n', label: 'Private endpoint' }, { key: 's', label: 'Connection state' }], rows: endpoints.map(([n, s]) => [{ text: n, link: true }, { text: s, status: s === 'Approved' ? 'ok' : 'warn' }]), read: rid + '-pe' }).el);
  }
  return { el, allow };
}
/**
 * Front Door WAF policy (lesson 5) — [en] throughout. o: {mode ('Prevention'), managed: [[ruleset, version, action]], custom: [[name, priority, type, threshold, action]]} → {el, managedRow(i), customRow(i)}
 */
export function wafPolicy({ mode = 'Prevention', managed = [['Microsoft_DefaultRuleSet', '2.2', 'Block'], ['Microsoft_BotManagerRuleSet', '1.1', 'Block']], custom = [['RateLimitLogin', '100', 'Rate limit', '100 / 1 min', 'Block']], read: rid = 'waf' } = {}) {
  const el = node('<div class="az-col" style="gap:20px"></div>');
  el.append(form([['Policy mode', segmented({ options: ['Detection', 'Prevention'], value: mode, read: rid + '-mode' })]], { labelW: 260 }).el);
  el.append(section('Managed rules'));
  const m = tableZh({ columns: [{ key: 'r', label: 'Rule set' }, { key: 'v', label: 'Version' }, { key: 'a', label: 'Action' }], rows: managed, read: rid + '-m' }); el.append(m.el);
  el.append(section('Custom rules'));
  const c = tableZh({ columns: [{ key: 'n', label: 'Name' }, { key: 'p', label: 'Priority', num: true }, { key: 'y', label: 'Rule type' }, { key: 't', label: 'Threshold' }, { key: 'a', label: 'Action' }], rows: custom, read: rid + '-c' }); el.append(c.el);
  return { el, managedRow: m.row, customRow: c.row };
}
/** Secure score ring (Defender for Cloud) — 安全分數 [learn]. o: {pct, size, label} → {el, set(pct)} (pure) */
export function secureScore({ pct = 38, size = 220, label = '安全分數', read: rid = 'score' } = {}) {
  const r = size / 2 - 16, C = 2 * Math.PI * r;
  const el = node(`<div class="az-score" style="width:${size}px"><svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#E0E0E0" stroke-width="18"/><circle class="arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#0F6CBD" stroke-width="18" stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-dasharray="${C}"/></svg>
    <div class="in" style="height:${size}px"><b${rd(rid + '-v')}>${pct}%</b></div><div class="az-l"${rd(rid + '-l')}>${esc(label)}</div></div>`);
  const arc = el.querySelector('.arc'), v = el.querySelector('b');
  const api = { el, set(p) { arc.setAttribute('stroke-dashoffset', (C * (1 - Math.max(0, Math.min(100, p)) / 100)).toFixed(1)); const s = Math.round(p) + '%'; if (v.textContent !== s) v.textContent = s; return api; } };
  return api.set(pct);
}
/**
 * Defender for Cloud › 建議 (lesson 5): score ring + recommendations table 建議 [learn] / Risk level / Affected resources / Status [en]. Recommendation titles are passed in.
 * o: {score, recs: [[title, risk ('High'|'Medium'|'Low'), resources, status]], more} → {el, score (api), row(i), cell(i, k)}
 */
export function defenderRecs({ score = 38, recs = [['Public network access on Azure SQL Database should be disabled', 'Medium', 'sql-cram-prod', 'Unassigned'], ['Key vaults should use private link', 'Medium', 'kv-cram-prod', 'Unassigned'], ['Storage accounts should restrict network access', 'Medium', 'stcramexams', 'Unassigned']], more = 0, read: rid = 'def' } = {}) {
  const el = node('<div class="az-row" style="gap:40px;align-items:flex-start"></div>');
  const sc = secureScore({ pct: score, read: rid + '-score' });
  const col = node('<div class="az-col" style="gap:16px;flex:1 1 auto;min-width:0"></div>');
  const t = tableZh({ columns: [{ key: 't', label: '建議' }, { key: 'r', label: 'Risk level' }, { key: 'a', label: 'Affected resources' }, { key: 's', label: 'Status' }],
    rows: recs.map(([t, r, a, s]) => [t, { text: r, status: r === 'High' ? 'err' : r === 'Medium' ? 'warn' : 'info' }, a, s]), more, read: rid });
  col.append(cmdRow([['download', 'Download CSV report'], ['filter', 'Filter']]), t.el);
  el.append(sc.el, col);
  return { el, score: sc, row: t.row, cell: t.cell };
}

// ================================================================================================ Application Insights / Monitor
/**
 * 應用程式對應 (lesson 6): nodes and edges with call counts / durations. Node / edge wording is passed in (default edge text in [en] units).
 * o: {w, h, nodes: [{id, name, kind ('app'|'sql'|'http'|'storage'|'ai'), x, y, sub, err (0–1 failed share), warn}], edges: [{from, to, label, warn}]}
 * → {el, node(id), edge(id 'a>b'), label(id)}   (warn = OUR magenta mark)
 */
export function appMap({ w = 1300, h = 640, nodes = null, edges = null, read: rid = 'map' } = {}) {
  nodes = nodes || [{ id: 'web', name: 'React SPA', kind: 'http', x: 160, y: 320, sub: '' }, { id: 'api', name: 'cram-ai-api', kind: 'app', x: 560, y: 320, sub: '3 instances' },
    { id: 'sql', name: 'sql-cram-prod | cramdb', kind: 'sql', x: 1000, y: 160, sub: '' }, { id: 'blob', name: 'stcramexams', kind: 'storage', x: 1000, y: 480, sub: '' }];
  edges = edges || [{ from: 'web', to: 'api', label: '9.4K calls · 4.8 s' }, { from: 'api', to: 'sql', label: '197K calls · 210 ms', warn: true }, { from: 'api', to: 'blob', label: '1.2K calls · 38 ms' }];
  const KI = { app: ['globe', IC.sky], sql: ['database', IC.sky], http: ['app-window', IC.teal], storage: ['archive', IC.teal], ai: ['sparkles', IC.purple] };
  const P = Object.fromEntries(nodes.map(n => [n.id, n]));
  const R = 66;
  const el = node(`<div class="az-map" style="width:${w}px;height:${h}px"><svg width="${w}" height="${h}"></svg></div>`);
  const svg = el.querySelector('svg'), NS = 'http://www.w3.org/2000/svg';
  const E = {}, LB = {};
  for (const e of edges) {
    const a = P[e.from], b = P[e.to], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const x0 = a.x + ux * (R + 6), y0 = a.y + uy * (R + 6), x1 = b.x - ux * (R + 14), y1 = b.y - uy * (R + 14);
    const ln = document.createElementNS(NS, 'path'); ln.setAttribute('d', `M${x0},${y0} L${x1},${y1}`); ln.setAttribute('class', `edge ${e.warn ? 'is-warn' : ''}`); svg.append(ln);
    const hd = document.createElementNS(NS, 'path'); const s = 14; hd.setAttribute('d', `M${x1 + ux * 10},${y1 + uy * 10} L${x1 - ux * s - uy * s * 0.6},${y1 - uy * s + ux * s * 0.6} L${x1 - ux * s + uy * s * 0.6},${y1 - uy * s - ux * s * 0.6}Z`); hd.setAttribute('class', `head ${e.warn ? 'is-warn' : ''}`); svg.append(hd);
    const id = `${e.from}>${e.to}`; E[id] = ln;
    const lb = node(`<span class="az-map-l ${e.warn ? 'is-warn' : ''}"${rd(`${rid}-e-${e.from}-${e.to}`)}>${esc(e.label)}</span>`); lb.style.left = ((x0 + x1) / 2) + 'px'; lb.style.top = ((y0 + y1) / 2) + 'px'; el.append(lb); LB[id] = lb;
  }
  const N = {};
  for (const n of nodes) {
    const [i, c] = KI[n.kind] || KI.app, errDeg = (n.err || 0) * 360;
    const d = node(`<div class="az-map-n ${n.warn ? 'is-warn' : ''}" style="left:${n.x}px;top:${n.y}px"><span class="c" style="background:conic-gradient(#C50F1F 0 ${errDeg}deg, #107C10 ${errDeg}deg 360deg)"><span class="in">${ic(i, 52, c)}</span></span>
      <span class="nm"${rd(`${rid}-n-${n.id}`)}>${esc(n.name)}</span>${n.sub ? `<span class="sb">${esc(n.sub)}</span>` : ''}</div>`);
    el.append(d); N[n.id] = d;
  }
  return { el, node: id => N[id], edge: id => E[id], label: id => LB[id] };
}
/**
 * 效能 / 失敗 blade body (lesson 6): an operations list with count and duration percentiles (or failed counts). Headings [en] (Operation name, Count, Duration (avg) …).
 * o: {kind ('效能'|'失敗'), ops: [[name, count, p50, p95, (failed)]], sel, chart (lineChart opts | null)} → {el, row(i), cell(i, k), chart}
 */
export function operationsBlade({ kind = '效能', ops = [['GET /api/exams/{id}/result', '9,412', '1.9 s', '4.8 s'], ['POST /api/exams/upload', '1,206', '320 ms', '880 ms'], ['GET /api/classes/{id}', '3,880', '45 ms', '120 ms'], ['GET /healthz', '4,320', '6 ms', '14 ms']], sel = 0, chart = null, read: rid = 'ops' } = {}) {
  const el = node('<div class="az-col" style="gap:18px"></div>');
  el.append(tabsEl(kind === '失敗' ? ['Operations', 'Dependencies', 'Exceptions'] : ['Operations', 'Dependencies', 'Roles'], 'Operations').el);
  let ch = null;
  if (chart) { ch = lineChart(chart); el.append(ch.el); }
  const cols = kind === '失敗' ? [{ key: 'n', label: 'Operation name' }, { key: 'c', label: 'Count (failed)', num: true }, { key: 'a', label: 'Count (all)', num: true }]
    : [{ key: 'n', label: 'Operation name' }, { key: 'c', label: 'Count', num: true }, { key: 'p50', label: 'Duration (50th)', num: true }, { key: 'p95', label: 'Duration (95th)', num: true }];
  const t = tableZh({ columns: cols, rows: ops, sel, read: rid });
  el.append(t.el);
  return { el, row: t.row, cell: t.cell, chart: ch };
}
/**
 * Metric chart in the Azure Monitor metrics look (lessons 1, 2, 6, 7): a picker row (scope · metric · aggregation · split, values pass-through), then AZ.lineChart
 * (threshold line, split-by legend). o: {scope, metric, aggregation, split, ...lineChart options} → lineChart api + {el (wrapper), pickers}
 */
export function metricChart({ scope = 'cram-ai-api', metric = 'Http 5xx', aggregation = 'Sum', split = '', ...chart } = {}) {
  const wrap = node(`<div class="az-col az-metric" style="gap:14px"><div class="az-row az-metric-pick">${[scope, metric, aggregation].map((v, i) => `<span class="az-pill"${rd(i === 1 ? (chart.read || 'chart') + '-metric' : '')}>${esc(v)}</span>`).join('')}${split ? `<span class="az-pill is-split">${ic('git-compare', 18, IC.sky)}<span>${esc(split)}</span></span>` : ''}</div></div>`);
  const ch = lineChart(chart); wrap.append(ch.el);
  return { ...ch, el: wrap, chart: ch.el, pickers: wrap.querySelector('.az-metric-pick') };
}
/**
 * 診斷設定 page (lesson 6). Headings 記錄 [shot], 類別群組, 類別, allLogs, audit, AllMetrics, 目的地詳細資訊 [learn], 計量 [shot];
 * name label 'Diagnostic setting name' and destinations 'Send to Log Analytics workspace' … [en] (「傳送至 Log Analytics 工作區」 is guessed in fact file C).
 * o: {name, groups: {allLogs, audit}, categories: [[label, on]], metrics (true), workspace ('log-cram-prod'), sendLA (true)} → {el, category(label), dest}
 */
export function diagnosticSetting({ name = 'diag-cram-ai-api', groups = { allLogs: false, audit: false }, categories = [['HTTP logs', true], ['App Service Console Logs', true], ['App Service Application Logs', false], ['Access Audit Logs', false], ['IPSecurity Audit logs', true], ['App Service Platform logs', false]], metrics = true, workspace = 'log-cram-prod', sendLA = true, read: rid = 'diag' } = {}) {
  const el = node('<div class="az-col" style="gap:18px"></div>');
  el.append(form([['Diagnostic setting name', valueBox({ value: name, w: 520, read: rid + '-name' }), { req: true }]], { labelW: 330 }).el);
  const grid = node('<div class="az-diag"></div>');
  const left = node(`<div class="az-col" style="gap:12px"><span class="az-h3"${rd(rid + '-logs')}>記錄</span><span class="az-sub">類別群組</span></div>`);
  left.append(checkbox({ label: 'allLogs', on: groups.allLogs }).el, checkbox({ label: 'audit', on: groups.audit }).el, node('<span class="az-sub" style="margin-top:6px">類別</span>'));
  categories.forEach(([l, on], i) => left.append(checkbox({ label: l, on, read: `${rid}-c${i}` }).el));
  left.append(node(`<span class="az-h3" style="margin-top:10px">計量</span>`), checkbox({ label: 'AllMetrics', on: metrics }).el);
  const right = node(`<div class="az-col" style="gap:12px"><span class="az-h3"${rd(rid + '-dest')}>目的地詳細資訊</span></div>`);
  const dest = checkbox({ label: 'Send to Log Analytics workspace', on: sendLA, read: rid + '-la' });
  right.append(dest.el, form([['Subscription', valueBox({ value: 'cram-ai-prod', dd: true, w: 420 })], ['Log Analytics workspace', valueBox({ value: workspace, dd: true, w: 420, read: rid + '-ws' })]], { labelW: 260, gap: 12 }).el,
    checkbox({ label: 'Archive to a storage account' }).el, checkbox({ label: 'Stream to an event hub' }).el, checkbox({ label: 'Send to partner solution' }).el);
  grid.append(left, right); el.append(grid);
  return { el, category: l => [...el.querySelectorAll('.az-cb')].find(c => c.textContent.trim() === l), dest };
}
/**
 * 可用性 page (lesson 3, 7): 新增標準測試, 啟用 SSL 憑證有效性 [learn]; table and grid wording [en]. The result grid: one row per location, one dot per run (ok / fail).
 * o: {tests: [[name, type, pct]], locations: [names], runs: [[0|1 …] per location], ssl: {on, days}} → {el, dot(loc, i), row(i)}
 */
export function availabilityPage({ tests = [['api-healthz', 'Standard', '100%']], locations = ['East Asia', 'Southeast Asia', 'Japan East', 'West US', 'West Europe'], runs = null, ssl = { on: true, days: 7 }, read: rid = 'avail' } = {}) {
  runs = runs || locations.map(() => Array.from({ length: 12 }, () => 1));
  const el = node('<div class="az-col" style="gap:18px"></div>');
  el.append(cmdRow([['plus', '新增標準測試'], ['refresh-cw', '重新整理']]));
  const t = tableZh({ columns: [{ key: 'n', label: 'Test name' }, { key: 'y', label: 'Test type' }, { key: 'p', label: 'Availability', num: true }], rows: tests, read: rid }); el.append(t.el);
  const g = node(`<div class="az-card az-avail"><div class="az-row" style="gap:12px;margin-bottom:10px"><span class="az-h3"${rd(rid + '-loc')}>Test locations</span><span class="az-sub" style="margin-left:auto">5 min frequency</span></div>${locations.map((l, i) => `<div class="az-avail-r"><span class="az-l"${rd(`${rid}-l${i}`)}>${esc(l)}</span><span class="az-d">${runs[i].map((r, j) => `<i class="${r ? 'ok' : 'err'}" data-i="${j}"></i>`).join('')}</span></div>`).join('')}</div>`);
  el.append(g);
  if (ssl) el.append(form([['啟用 SSL 憑證有效性', checkbox({ on: ssl.on, read: rid + '-ssl' })], ['Proactive lifetime check (days)', valueBox({ value: String(ssl.days), w: 160, read: rid + '-days' })]], { labelW: 420, gap: 12 }).el);
  return { el, row: t.row, dot: (li, i) => g.querySelectorAll('.az-avail-r')[li]?.querySelector(`i[data-i="${i}"]`) };
}
/** Alert-rule wizard tabs in zh-TW: 範圍 條件 動作 詳細資料 標籤 檢閱 + 建立 [learn] → tabs api */
export const ALERT_TABS_ZH = ['範圍', '條件', '動作', '詳細資料', '標籤', '檢閱 + 建立'];
export const alertTabsZh = (active = '條件') => { const t = tabsEl(ALERT_TABS_ZH, active, 'az-steps'); t.el.querySelector('.is-on')?.setAttribute('data-read', 'alert-tab'); return t; };
/**
 * Alert rule 條件 tab in zh-TW: 訊號名稱, 閾值 (靜態 / 動態), 彙總類型, 運算子, 臨界值, 檢查間隔, 回溯期間 [learn]; Split by dimensions [en]; values pass-through.
 * o: {signal, threshold ('靜態'), aggregation, operator, value, unit, check, lookback, split} → {el, field(label)}
 */
export function alertConditionZh({ signal = 'Http 5xx', threshold = '靜態', aggregation = 'Total', operator = 'Greater than', value = '5', unit = '%', check = '1 minute', lookback = '5 minutes', split = '', read: rid = 'alert' } = {}) {
  const f = (label, v, dd = true) => `<div class="az-field" data-name="${esc(label)}"><span class="az-label">${esc(label)}</span><span class="az-input"${dd ? ' style="justify-content:space-between"' : ''}><span${rd(`${rid}-${label}`)}>${esc(v)}</span>${dd ? ic('chevron-down', 22) : ''}</span></div>`;
  const el = node(`<div class="az-sec"><span class="az-h2">條件</span>
    <div class="az-grid2">${f('訊號名稱', signal)}${split ? f('Split by dimensions', split) : `<div class="az-field"><span class="az-label">閾值</span>${segmented({ options: ['靜態', '動態'], value: threshold }).el.querySelector('.az-seg').outerHTML}</div>`}</div>
    <div class="az-grid4">${f('彙總類型', aggregation)}${f('運算子', operator)}${f('臨界值', value + (unit ? ' ' + unit : ''), false)}${f('檢查間隔', check)}</div>
    <div class="az-grid4">${f('回溯期間', lookback)}</div></div>`);
  return { el, field: n => el.querySelector(`.az-field[data-name="${n}"] .az-input`) };
}
/** Alert rule 動作 tab: 動作群組名稱 [learn]; buttons and 'Contains actions' [en]. o: {groups: [[name, actions]]} → element */
export function alertActionsZh({ groups = [['ag-cram-oncall', 'Email, SMS']] } = {}) {
  return node(`<div class="az-sec"><span class="az-h2">動作</span><span class="az-row" style="gap:16px"><span class="az-btn">${ic('plus', 20)}<span>Select action groups</span></span><span class="az-btn">${ic('plus', 20)}<span>Create action group</span></span></span>
    ${tableZh({ columns: [{ key: 'n', label: '動作群組名稱' }, { key: 'a', label: 'Contains actions' }], rows: groups.map(([n, a]) => [{ text: n, link: true }, a]), read: 'alert-actions' }).el.outerHTML}</div>`);
}
/** Alert rule 詳細資料 tab: 嚴重性, 警示規則名稱, 警示規則描述 [learn]; severity values [en]. o: {severity, name, description} → element */
export function alertDetailsZh({ severity = '1 - Error', name = 'cram-api-5xx-rate', description = '' } = {}) {
  return node(`<div class="az-sec"><span class="az-h2">詳細資料</span><div class="az-grid2">
    <div class="az-field"><span class="az-label">嚴重性<span class="az-req">*</span></span><span class="az-input" style="justify-content:space-between"><span data-read="alert-sev">${esc(severity)}</span>${ic('chevron-down', 22)}</span></div>
    <div class="az-field"><span class="az-label">警示規則名稱<span class="az-req">*</span></span><span class="az-input"><span data-read="alert-name">${esc(name)}</span></span></div>
    ${description ? `<div class="az-field" style="grid-column:1/3"><span class="az-label">警示規則描述</span><span class="az-input"><span>${esc(description)}</span></span></div>` : ''}</div></div>`);
}
/**
 * 警示處理規則 (lesson 7): tabs 範圍 規則設定 排程 詳細資料 標籤 檢閱 + 建立, 隱藏通知 / 套用動作群組, 開始時間 / 結束時間 [learn]; schedule option words [en].
 * o: {tab, action ('隱藏通知'), schedule ('At a specific time'), start, end, tz, scope} → {el, action (radio api)}
 */
export function alertProcessingRule({ tab = '規則設定', action = '隱藏通知', schedule = 'At a specific time', start = '2026-12-04 20:30', end = '2026-12-04 21:30', tz = '(UTC+08:00) Taipei', scope = 'rg-cram-prod', read: rid = 'apr' } = {}) {
  const el = node(`<div class="az-col" style="gap:20px"><span class="az-h2"${rd(rid + '-title')}>建立警示處理規則</span></div>`);
  el.append(tabsEl(['範圍', '規則設定', '排程', '詳細資料', '標籤', '檢閱 + 建立'], tab, 'az-steps').el);
  let r = null;
  if (tab === '範圍') el.append(tableZh({ columns: [{ key: 's', label: 'Scope' }, { key: 't', label: 'Type' }], rows: [[{ text: scope, link: true }, '資源群組']], read: rid + '-scope' }).el);
  else if (tab === '規則設定') { r = radio({ label: 'Rule type', options: ['隱藏通知', '套用動作群組'], value: action, read: rid + '-act' }); el.append(r.el); }
  else if (tab === '排程') el.append(form([['Apply the rule', radio({ options: ['Always', 'At a specific time', 'Recurring'], value: schedule, read: rid + '-when' })], ['開始時間', valueBox({ value: start, w: 380, read: rid + '-start' })], ['結束時間', valueBox({ value: end, w: 380, read: rid + '-end' })], ['Time zone', valueBox({ value: tz, dd: true, w: 380 })]], { labelW: 300 }).el);
  return { el, action: r };
}
/**
 * Resource health / Service health card (lesson 7). 資源健康狀態 + 可用 / 無法使用 / 未知 / 已降級 [learn]; 服務健康情況 [shot] + 服務問題 / 計劃性維護 / 健康情況諮詢 [learn].
 * o: {kind ('resource'|'service'), status ('可用'), resource, when, events: [[title, region, when]]} → {el}
 */
export function healthCard({ kind = 'resource', status = '可用', resource = 'cram-ai-api', when = '', events = [], read: rid = 'health' } = {}) {
  if (kind === 'resource') {
    const S = { 可用: ['circle-check', '#107C10'], 無法使用: ['circle-x', '#C50F1F'], 未知: ['circle-help', '#616161'], 已降級: ['triangle-alert', '#D83B01'] }[status] || ['circle-help', '#616161'];
    return { el: node(`<div class="az-card az-health"><span class="az-sub"${rd(rid + '-t')}>資源健康狀態</span><div class="az-row" style="gap:14px;margin:10px 0 4px">${ic(S[0], 44, S[1])}<span class="az-h2" style="margin:0"${rd(rid + '-s')}>${esc(status)}</span></div><span class="az-sub">${esc(resource)}${when ? ' · ' + esc(when) : ''}</span></div>`) };
  }
  const el = node(`<div class="az-col" style="gap:16px"><span class="az-h2"${rd(rid + '-t')}>服務健康情況</span></div>`);
  el.append(tabsEl(['服務問題', '計劃性維護', '健康情況諮詢', 'Security advisories'], '服務問題').el);
  el.append(events.length ? tableZh({ columns: [{ key: 'n', label: 'Issue name' }, { key: 'r', label: 'Region' }, { key: 'w', label: 'Start time' }], rows: events, read: rid + '-ev' }).el
    : node(`<div class="az-row" style="gap:12px;padding:18px 0">${ic('circle-check', 30, '#107C10')}<span${rd(rid + '-none')}>No service issues found in your subscriptions</span></div>`));
  return { el };
}
/**
 * 變更分析 table (lesson 7): headings Time / Resource / Change type / Changed by / Operation [en] (no zh source; pass `cols` once verified).
 * o: {rows: [[time, resource, change, by, op, {warn}]], cols, sel} → {el, row(i), cell(i, k)}
 */
export function changeTable({ rows = [['20:50', 'cram-ai-api', 'Update', 'colleague@contoso-cram.com', 'Swap Web App Slots'], ['18:12', 'plan-cram-api', 'Update', 'Autoscale', 'Scale out'], ['昨天 16:40', 'kv-cram-prod', 'Update', 'dev@contoso-cram.com', 'Update secret']], cols = ['Time', 'Resource', 'Change type', 'Changed by', 'Operation'], sel = -1, read: rid = 'chg' } = {}) {
  const keys = ['t', 'r', 'c', 'b', 'o'];
  const el = node('<div class="az-col" style="gap:16px"></div>');
  el.append(cmdRow([['filter', 'Filter'], ['calendar-clock', 'Last 24 hours'], ['refresh-cw', '重新整理']]));
  const t = tableZh({ columns: cols.map((c, i) => ({ key: keys[i], label: c })), rows: rows.map(r => r.slice(0, cols.length)), sel, read: rid });
  el.append(t.el);
  return { el, row: t.row, cell: t.cell };
}
/**
 * Log Analytics › 使用量和估計成本 (lesson 6): command 每日上限 [learn], ingestion bars per day [ours]; the 每日上限 pane: 開啟 / 關閉, GB/天 [learn]; banner text [ours].
 * o: {days: [[label, GB]], cap (GB/day or null), on, pane (true: show the daily-cap pane)} → {el, bars, pane, bar(i)}
 */
export function usagePage({ days = [['11/03', 1.2], ['11/04', 1.3], ['11/05', 1.1], ['11/06', 4.6], ['11/07', 1.4], ['11/08', 1.2], ['11/09', 1.3]], cap = 2, on = true, pane: showPane = true, read: rid = 'usage' } = {}) {
  const el = node('<div class="az-col" style="gap:18px;position:relative"></div>');
  el.append(cmdRow([['gauge', '每日上限'], ['archive', 'Data retention']]));
  const max = Math.max(...days.map(d => d[1]), cap || 0) * 1.15, H = 360;
  const bars = node(`<div class="az-card az-usage"><span class="az-h3"${rd(rid + '-t')}>Data ingestion (GB / day)</span><div class="az-usage-plot" style="height:${H}px">${cap ? `<span class="cap" style="bottom:${(cap / max * H).toFixed(1)}px"><b${rd(rid + '-cap')}>${on ? '每日上限' : ''} ${cap} GB/天</b></span>` : ''}
    ${days.map(([l, v], i) => `<span class="b" data-i="${i}"><i style="height:${(v / max * H).toFixed(1)}px"></i><em>${esc(l)}</em><s${rd(`${rid}-v${i}`)}>${v} GB</s></span>`).join('')}</div></div>`);
  el.append(bars);
  let p = null;
  if (showPane) {
    p = pane({ title: '每日上限', w: 640, read: rid + '-pane', body: [segmented({ label: '每日上限', options: ['開啟', '關閉'], value: on ? '開啟' : '關閉', read: rid + '-on' }).el,
      form([['GB/天', valueBox({ value: String(cap), w: 160, read: rid + '-gb' })]], { labelW: 140 }).el], buttons: [['確定', { primary: true }], ['取消']] });
  }
  return { el, bars, pane: p, bar: i => bars.querySelector(`.b[data-i="${i}"] i`) };
}
/**
 * Cost breakdown (lesson 8): Cost analysis table by service [en headings]; values pass-through; total row. o: {rows: [[service, cost]], total, currency ('USD'), range} → {el, row(i), cell(i, k)}
 */
export function costTable({ rows = [['Azure App Service', '$474.12'], ['SQL Database', '$147.20'], ['Azure Front Door', '$35.00'], ['Log Analytics', '$12.40'], ['Azure Monitor', '$33.50']], total = '$702.22', range = 'Nov 2026', more = 0, read: rid = 'cost' } = {}) {
  const el = node('<div class="az-col" style="gap:16px"></div>');
  el.append(node(`<div class="az-row" style="gap:18px"><span class="az-pill">${ic('calendar-clock', 18, IC.sky)}<span>${esc(range)}</span></span><span class="az-pill">Group by: Service name</span></div>`));
  el.append(node(`<div class="az-col"><span class="az-sub">Actual cost (USD)</span><span class="az-cost-total"${rd(rid + '-total')}>${esc(total)}</span></div>`));
  const t = tableZh({ columns: [{ key: 's', label: 'Service name' }, { key: 'c', label: 'Cost', num: true }], rows, more, read: rid });
  el.append(t.el);
  return { el, row: t.row, cell: t.cell };
}
/**
 * Advisor recommendations (lesson 8): category tiles 可靠性 / 成本 [learn] + Security / Performance / Operational excellence [en], Advisor 分數 [learn]; table [en].
 * o: {score, tiles: [[category, count]], recs: [[recommendation, impact, resources]], cat} → {el, row(i), tile(name)}
 */
export function advisorPage({ score = 64, tiles = [['可靠性', 3], ['Security', 4], ['Performance', 1], ['成本', 2], ['Operational excellence', 2]], recs = [['Enable zone redundancy for App Service plan', 'High', 'plan-cram-api'], ['Right-size underutilized App Service plan', 'Medium', 'plan-cram-worker']], read: rid = 'adv' } = {}) {
  const el = node('<div class="az-col" style="gap:20px"></div>');
  const row = node(`<div class="az-row" style="gap:18px;align-items:stretch"><div class="az-card az-adv-score"><span class="az-sub">Advisor 分數</span><b${rd(rid + '-score')}>${score}%</b></div>${tiles.map(([c, n], i) => `<div class="az-card az-adv-tile" data-name="${esc(c)}"><span${rd(`${rid}-c${i}`)}>${esc(c)}</span><b>${n}</b></div>`).join('')}</div>`);
  el.append(row);
  const t = tableZh({ columns: [{ key: 'r', label: 'Recommendation' }, { key: 'i', label: 'Impact' }, { key: 'a', label: 'Impacted resources' }], rows: recs.map(([r, i, a]) => [r, { text: i, status: i === 'High' ? 'err' : i === 'Medium' ? 'warn' : 'info' }, a]), read: rid });
  el.append(t.el);
  return { el, row: t.row, tile: n => find(el, '.az-adv-tile', n) };
}
/**
 * 監視 › 概觀 content as screenshot 3 (lesson 6/7 openers): banner 「試用全新的 Azure 監視器概觀」 + 新概觀 switch, tabs 概觀 / 教學課程, 見解 cards, 偵測、分級與診斷 cards [shot].
 * → {el, card(title)}
 */
export function monitorOverview({ read: rid = 'mon' } = {}) {
  const card = (t, d, i, c) => `<div class="az-card az-mon-c" data-name="${esc(t)}"><div class="az-row" style="gap:12px">${ic(i, 30, c)}<b>${esc(t)}</b></div><span class="az-d">${esc(d)}</span><span class="f">${ic('eye', 20, IC.sky)} 檢視 &nbsp;&nbsp; ${ic('ellipsis', 20, IC.sky)} 更多</span></div>`;
  const el = node(`<div class="az-col" style="gap:16px">
    <div class="az-pinfo info az-mon-new">${ic('rocket', 22, IC.purple)}<span>試用全新的 Azure 監視器概觀</span><span style="margin-left:auto" class="az-row">新概觀 <span class="az-switch" style="margin-left:10px"><i></i></span></span></div>
    ${tabsEl(['概觀', '教學課程'], '概觀').el.outerHTML}
    <div class="az-col"><span class="az-h2" style="margin:0"${rd(rid + '-h1')}>見解</span><span class="az-sub">針對特定 Azure 資源使用策劃的監視檢視。 <span class="az-link">檢視所有見解</span></span></div>
    <div class="az-mon-g">${card('Application Insights', '監視您應用程式的可用性、效能、錯誤與使用量。', 'lightbulb', IC.purple)}${card('容器見解', '查看控制器、節點與容器的效能與健康狀態。', 'boxes', IC.purple)}${card('VM 見解', '監視 VM 與 VM 擴展集的健康狀態、效能與相依性。', 'monitor-cog', IC.sky)}${card('Network Insights', '檢視所有已部署網路資源的健康狀態與計量。', 'network', IC.purple)}</div>
    <div class="az-col"><span class="az-h2" style="margin:0"${rd(rid + '-h2')}>偵測、分級與診斷</span><span class="az-sub">將監視資料與事件視覺化，並加以分析及回應。 <span class="az-link">深入了解監視</span></span></div>
    <div class="az-mon-g">${card('計量', '建立圖表，以監視及調查 Azure 資源的使用量與效能。', 'chart-column', IC.sky)}${card('警示', '使用警示與動作取得通知並回應。', 'bell', IC.green)}${card('記錄', '使用記錄查詢來分析及診斷的問題。', 'file-text', IC.sky)}${card('健康度模型', '管理完整堆疊應用程式和工作負載的健康情況。', 'heart-pulse', IC.sky)}</div></div>`);
  return { el, card: n => find(el, '.az-mon-c', n) };
}

// ================================================================================================ lesson 4 extras (sign-ins, activity log, SQL Entra-only)
/**
 * SQL Server › 設定 › Microsoft Entra ID (lesson 4). The checkbox 「支援對此伺服器執行僅限 Microsoft Entra 驗證」 and the confirmation
 * 「啟用僅限 Microsoft Entra 驗證」 [是] / [儲存] are [learn] (authentication-azure-ad-only-authentication-tutorial, zh-tw, checked 2026-11-09);
 * 'Microsoft Entra admin', 'Set admin', 'Remove admin' [en]. o: {admin ('sg-cram-dba'), only (true), confirm (false: show the 是 / 否 dialog)}
 * → {el, checkbox (api), dialog}
 */
export function sqlEntraAuth({ admin = 'sg-cram-dba', only = true, confirm = false, read: rid = 'sqlentra' } = {}) {
  const el = node('<div class="az-col" style="gap:20px;position:relative"></div>');
  el.append(cmdRow([['user', 'Set admin'], ['trash-2', 'Remove admin'], ['save', '儲存']]));
  const cb = checkbox({ label: '支援對此伺服器執行僅限 Microsoft Entra 驗證', on: only, read: rid + '-only' });
  el.append(form([['Microsoft Entra admin', node(`<span class="az-row" style="gap:10px">${ic('users', 22, IC.sky)}<span${rd(rid + '-admin')}>${esc(admin)}</span></span>`)], ['Microsoft Entra authentication only', cb]], { labelW: 420 }).el);
  let dialog = null;
  if (confirm) {
    dialog = node(`<div class="az-dialog" style="position:absolute;left:300px;top:200px;width:720px"><div class="az-h2"${rd(rid + '-dlg')}>啟用僅限 Microsoft Entra 驗證</div><div class="az-row" style="gap:14px;margin-top:22px"><span class="az-btn is-primary" data-name="是">是</span><span class="az-btn" data-name="否">否</span></div></div>`);
    el.append(dialog);
  }
  return { el, checkbox: cb, dialog };
}
/**
 * Entra › 登入記錄 (lesson 4): page name 登入記錄 [learn: Entra ID > 監視與健康 > 登入記錄]; tabs and column headings [en] (not confirmed in zh).
 * o: {rows: [[date, user, app, status ('Success'|'Failure'), ip, ca ('Success'|'Not Applied'|'Failure')]], tab, more} → {el, row(i), cell(i, k)}
 */
export function signInLogs({ rows = [['2026/11/09 21:02', '外包', 'Azure Portal', 'Failure', '203.0.113.24', 'Not Applied'], ['2026/11/09 20:48', '開發者', 'Azure Portal', 'Success', '198.51.100.7', 'Success'], ['2026/11/09 20:31', '老闆', 'Azure Portal', 'Success', '198.51.100.31', 'Success']], tab = 'User sign-ins (interactive)', more = 0, read: rid = 'signin' } = {}) {
  const el = node('<div class="az-col" style="gap:16px"></div>');
  el.append(cmdRow([['download', 'Download'], ['list', 'Columns'], ['refresh-cw', '重新整理']]));
  el.append(tabsEl(['User sign-ins (interactive)', 'User sign-ins (non-interactive)', 'Service principal sign-ins', 'Managed identity sign-ins'], tab, 'is-sub').el);
  const st = v => ({ text: v, status: /^Success/.test(v) ? 'ok' : /^Fail/.test(v) ? 'err' : 'off' });
  const t = tableZh({ columns: [{ key: 'd', label: 'Date' }, { key: 'u', label: 'User' }, { key: 'a', label: 'Application' }, { key: 's', label: 'Status' }, { key: 'i', label: 'IP address' }, { key: 'c', label: 'Conditional Access' }],
    rows: rows.map(([d, u, a, s, i, c]) => [d, u, a, st(s), { text: i, mono: true }, st(c)]), more, read: rid });
  el.append(t.el);
  return { el, row: t.row, cell: t.cell };
}
/**
 * 活動記錄 [shot] (lesson 4, 7): the list of control-plane operations. Filter 事件類別 [learn]; column headings [en] (Operation name, Status, Time,
 * Time stamp, Subscription, Event initiated by) — not confirmed in zh. o: {rows: [[op, status, time, stamp, by]], sel, more} → {el, row(i), cell(i, k)}
 */
export function activityLog({ rows = [['Swap Web App Slots', 'Succeeded', '23 minutes ago', 'Fri Dec 04 2026 20:50:12', 'colleague@contoso-cram.com'], ['Create role assignment', 'Succeeded', '2 days ago', 'Wed Dec 02 2026 10:14:40', 'dev@contoso-cram.com'], ['Update website', 'Succeeded', '3 days ago', 'Tue Dec 01 2026 18:03:55', 'dev@contoso-cram.com']], sel = -1, more = 0, read: rid = 'act' } = {}) {
  const el = node('<div class="az-col" style="gap:16px"></div>');
  el.append(cmdRow([['history', 'Activity'], ['pencil', 'Edit columns'], ['refresh-cw', '重新整理'], ['download', 'Export Activity Logs']]));
  el.append(node(`<div class="az-row" style="gap:10px"><span class="az-pill">Management Group : None</span><span class="az-pill">Timespan : Last 6 hours</span><span class="az-pill">事件類別 : All</span><span class="az-pill">${ic('plus', 18, IC.sky)} Add filter</span></div>`));
  const t = tableZh({ columns: [{ key: 'o', label: 'Operation name' }, { key: 's', label: 'Status' }, { key: 't', label: 'Time' }, { key: 'ts', label: 'Time stamp' }, { key: 'b', label: 'Event initiated by' }],
    rows: rows.map(([o, s, t, ts, b]) => [{ text: o, link: true }, { text: s, status: s === 'Succeeded' ? 'ok' : s === 'Failed' ? 'err' : 'info' }, t, ts, b]), sel, more, read: rid });
  el.append(t.el);
  return { el, row: t.row, cell: t.cell };
}
