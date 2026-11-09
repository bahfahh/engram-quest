# Azure UI kit (`lib/azure/`)

The real **Microsoft Foundry (new portal)** and **Azure portal** screens, redrawn from Microsoft Learn so the learner
recognises them later — one kit for all five lessons of `azure-ai-2026`, so every lesson's screens look the same.
Built 2026-11-08 for experiment 20. Demo: `projects/azure-kit-demo/` (`scene.html` full-frame, nine scenes;
`studio.html` screen-in-studio). Course map pictures for the same series: `lib/house/coursemap-azure.js`.

## 1. Two looks on one screen

| | what | colours / type |
|---|---|---|
| **the real screen** (`az-*`) | Foundry shell, Azure portal blade, widgets | Fluent 2 light: white / `#FAFAFA` surfaces, `#E0E0E0` hairlines, accent `#0F6CBD`, text `#242424` / `#616161`; the portal's own status colours (green ✓, red ✗) and chart colours. Inter + Noto Sans TC (no Segoe UI); code in JetBrains Mono (system font; falls back to DejaVu Sans Mono). **No Microsoft logos or brand icons**: wordmarks are plain text, resource icons are lucide icons in a coloured square. |
| **what we draw on top** | focus / selection, labels + leaders, stamps, status chips, cursor ring, magnifier rim, line focus in code, `warn` spans | the house grammar: cyan = system / now, amber = the student's, magenta = warning / broken, grey = not yet / preview. Use `makeUI(frame.overlay)` from `lib/house/ui.js` for labels, selections and stamps. |

The Azure portal top bar is the default "Azure" theme (dark bar, white wordmark); `light: true` gives a light bar.
Every frame gets the footnote (`AZ.footnote`; default since experiment 21 「介面依 Microsoft Learn 與入口網站重繪，2026-11」 = `AZ.FOOTNOTE`; the azure-ai-2026 text is `AZ.FOOTNOTE_LEARN` — pass `{ text: AZ.FOOTNOTE_LEARN }` to keep an old page's corner unchanged); a generic panel that is not a
copy of a real one (the AIOps chat) carries 「介面示意」.

**Scale.** Every px is a 1920 × 1080 screen px at full frame: body text 22 px, nav 22 px, titles 32 px, captions
19–20 px (never the point). A 1.3× push-in makes body text ≥ 28 px (`04-skeleton.md` §7). Inside the studio screen the
UI is scaled down (≈ 0.77): recognisable, not for reading — read through a magnifier inset or cut to the full frame.

## 2. Page setup

```html
<link rel="stylesheet" href="/lib/kit/kit.css">        <!-- fonts + the kit cursor -->
<link rel="stylesheet" href="/lib/house/house.css">    <!-- house overlays -->
<link rel="stylesheet" href="/lib/house/kit-house.css"> <!-- only if you use K.callout / K.highlight; set data-house="light" on <html> -->
<link rel="stylesheet" href="/lib/azure/azure.css">
<script type="module">
import * as AZ from '/lib/azure/azure.js';            // also re-exports K (lib/kit/kit.js) as AZ.K
import { makeUI } from '/lib/house/ui.js';
await AZ.init();                                      // icons — before building anything
const f = AZ.foundryFrame({ section: 'Build', nav: 'Agents', crumbs: 'Build / Agents / grader', title: 'grader', chip: 'GA', tabs: AZ.AGENT_TABS, tab: 'Traces' });
// … build widgets into f.page, place the frame (§3) …
window.studioReady = (async () => { await AZ.ready(); /* measure boxes, build cursor / magnifier, set the camera */ window.renderAt = t => { … }; })();
window.TEXTS = () => AZ.texts();                      // every [data-read] on the page (readcheck.cjs)
</script>
```
`AZ.ready()` loads every glyph on the page in every weight the kit uses (Inter / Noto Sans TC 400–800, JetBrains Mono)
and resolves kit layout. Measure boxes (`AZ.box`) only after it.

## 3. Two framings

**Full frame** (a screen fills 1920 × 1080 inside a camera world; push in on a region). Reuse the kit world + camera:
```js
const st = AZ.K.stage({ width: 2200 * nScenes, height: 1300, grid: false });   // world + camera + st.screen (screen space)
st.world.add(f.el, fx, fy, { anchor: 'tl' });                                  // one frame per scene, 2200 px apart
st.cam.set(AZ.shot.full(fx, fy));                                              // the whole screen, exactly
st.cam.to(tPush, AZ.shot.on(fx, fy, AZ.box(el, f.el), 1.3), 1.2);              // push 1.3× onto a box (frame px)
const foot = AZ.footnote(st.screen);                                           // screen space: stays in the corner
window.renderAt = t => { st.cam.update(t); foot.set(1); … };
```
The kit camera centres the target in the safe area (y 96…930), so a push keeps the subtitle band clear. Overlays you put
in `f.overlay` (house `makeUI`, cursor, magnifier) move and zoom with the frame.

**Screen in studio** (the same UI on a large floating screen with a thin house rim in the light studio, Nico and the
student beside it):
```js
const st = await makeStage({ card: false, floor: null });                       // lib/cast/stage.js
const cast = await (await import('/lib/cast/skins/glossy-bot.js')).create(st.env, { variant: 'classic' }); st.adopt(cast);
const flat = await makeFlat(st, { mode: 'light' });                            // lib/house/flat.js
const scr = AZ.studioScreen({ x: 330, y: 96, w: 1250, h: 718, design: [1600, 900], parent: flat.content });
const f = scr.put(AZ.azureFrame({ w: 1600, h: 900, … }));                     // build the frame at its design size
const ui = makeUI(flat.over, { mode: 'light' });                                // labels in page px: map frame px with scr.toPage([x, y])
// per frame: flat.place(cast.teacher, 175, 985, 430); flat.place(cast.student, 1765, 990, 330); hide cast.embodiment; flat.render();
```
Nico stands **left** of the screen (his pointing arm reaches to the viewer's right, `lib/cast/CAST.md` → Cues); with
px 430 and feet at y 985 the arm is at the screen's lower third, so put what he points at there or move him.
Render with `RENDER_GPU=1` (WebGL background + cast).

## 4. API (all builders return plain DOM; nothing animates by itself)

### Frames
| call | key options | returns |
|---|---|---|
| `foundryFrame(o)` | `w, h` (1920×1080), `project` ('cram-ai / grading-prod'), `section` ('Home'·'Discover'·'Build'·'Operate'·'Manage'·'Docs'), `nav` (active left item), `newFoundry`, `crumbs` ('Build / Agents / grader'), `title`, `chip`, `tabs` (`AZ.AGENT_TABS` = Playground · Traces · Monitor), `tab` | `{el, overlay, top, navEl, main, page, item(name), section(name), tab(name), setNav, setTab}` |
| `azureFrame(o)` | `resource` ('cram-ai-insights'), `type` ('Application Insights'), `page` (blade after the `|`), `crumbs`, `menu` (`AZ.APPINSIGHTS_MENU`, `AZ.FOUNDRY_RESOURCE_MENU`, or your own `[{g, items: [[label, icon]]}]`), `active`, `cmds` ([[icon, label]] command bar), `icon`, `iconBg`, `light`, `chip` | `{el, overlay, top, menuEl, cmdbar, content (= page), item(name), cmd(label), setActive}` |

Left panes (`AZ.FOUNDRY_NAV`): Build → **Create**: Agents, Models, Services, Tools, Knowledge, Memory, Guardrails, Data;
**Optimize**: Evaluations, Fine-tune · Operate → Overview, Assets, Compliance · Manage → Quota, AI Gateway, Project details.
App Insights menu: Overview, Activity log · **Investigate**: Agents (Preview), Search, Failures, Performance, Application map ·
**Monitoring**: Alerts, Metrics, Logs, Workbooks, Dashboards with Grafana · **Settings**: Diagnostic settings.
A drawer (e.g. "Deploy gpt-6") = a `div.az-panelR` appended to `f.el.querySelector('.az-fd-body')` (below the top bar).

### Widgets
| call | key options | returns / pure updates |
|---|---|---|
| `tabs(items, active)` | | `{el, tab(n), set(n)}` |
| `button(label, o)` | `primary, subtle, icon, pressed, disabled` | element (toggle `.is-pressed` for a click) |
| `textField(o)` | `label, value, placeholder, required, focus, w` | `{el, input, set(value)}` |
| `dropdown(o)` | `label, value, options` (`AZ.DEPLOYMENT_TYPES`), `open, selected, hover, required, w` | `{el, box, list, opt(n), set({open, value, selected, hover})}` |
| `slider(o)` | `label` ('Tokens per Minute Rate Limit'), `value` ('100K'), `k` (0–1), `w` | `{el, thumb, set(k, text)}` |
| `toggle(o)` | `label, on` | `{el, set(on)}` |
| `props(rows)` | `[[key, value, {link}]]` | element |
| `table(o)` | `columns: [{key, label, num, w, link, mono}]`, `rows` (objects or arrays; a cell may be `{text, status: 'ok'|'err'|'warn'|'info'|'off', link, icon, color, mono, chip}`), shows ≤ 5 rows, `more` → "… N more", `mono`, `sel`, `read` (id prefix: every cell readable) | `{el, row(i), cell(i, key)}` |
| `resultsGrid(o)` | = `table({mono: true})` | |
| `lineChart(o)` | `w, h, title, sub, x/y: {min, max, ticks: [[v, label]]}, series: [{name, color, pts}], threshold: {y, label}, legend: [{name, value, color}]` (split values, e.g. StatusCode = 429) | `{el, px(x, y), reveal(k), hover(x | null, rows?, title)}` |
| `codeEditor(o)` | `lang` 'csharp'·'kql'·'json', `code`, `title`, `run` (KQL: Run + "Time range"), `time`, `first`, `w`, `read`, `runLabel` / `timeLabel` (default 'Run' / 'Time range'; zh not confirmed) | `{el, lines, line(n), runBtn, focus(a, b, k)}` — lines a…b lit in house cyan, the rest dimmed (k fades it in; `focus(null)` clears) |
| `waterfall(o)` | `spans: [{op, target, kind 'agent'|'llm'|'tool', depth, start, dur, tokens, warn, err}]`, `total, unit ('s'), ticks, w, nameW, tokW` (0 = no Tokens column, since exp. 21), `sel` | `{el, row(i), bar(i), reveal(k)}` — bars grow along time; `warn` = our magenta mark |
| `simpleView(o)` | `steps: [{kind, title ('invoke_agent grader'), detail, dur, tokens, warn}]`, `head` | `{el, step(i)}` |
| `banner(o)` / `toast(o)` | `kind` 'err'·'warn'·'ok'·'info', `title, text` (HTML; `<code>` allowed), toast `when` | element |
| `alertTabs(active)`, `alertScope(o)`, `alertCondition(o)`, `alertActions(o)`, `alertDetails(o)` | Scope (resource, type, location) · Condition (signal, split, aggregation, operator, threshold, unit, check, lookback; the preview sentence) · Actions (action groups table) · Details (severity, rule name) | elements; `alertCondition` → `{el, field(label)}` |
| `grafanaPanel(o)` | dark Grafana-style dashboard: `title, folder, range, cols, tiles: [{label, value, unit, color}], series: {title, pts, threshold, h}` | `{el, tile(i), reveal(k)}` |
| `chatPanel(o)` | `title, messages: [{role 'user'|'agent', text, steps}], input, w, h` (labelled 介面示意) | `{el, msg(i), show(n)}` |

### Our layer
| call | what |
|---|---|
| `statusChip(kind, {big})` / `chipOn(el, kind)` | `'GA'` cyan · `'Preview'` grey · `'退役 12/1'` magenta (any text starting 退役 / Retired). `chipOn` puts it right after an element's text (nav item, title, option). |
| `cursor(layer, root, keys)` | the kit's arrow, pure of t: `keys = [{t, at: [x, y] | Element, click}]` in `root` px; moves during the 0.6 s before each key; a click shows a cyan ring. Build it after `AZ.ready()` (it measures elements). → `{el, update(t)}` |
| `magnifier(src, o)` | local zoom of a region: `region {x0,y0,x1,y1}` (src px), `zoom, at` (inset centre), `size, shape ('rect'|'round'), parent, map` (src px → parent px; `scr.toPage` when the inset sits outside a studio screen). Clones `src` once (`refresh()` after you change it). → `{el, ring, set(a)}` |
| focus / selection, labels + leaders, stamps | `const ui = makeUI(f.overlay, {mode: 'light'})`; `ui.selection().set(AZ.box(el, f.el), a)`; `ui.place(ui.label(html, {tone}), [x, y], {dx, dy, a})`; `ui.stamp(…)` (`lib/house/HOUSE.md`). |
| `footnote(parent, {x, y, right, text})` | `AZ.FOOTNOTE` (「介面依 Microsoft Learn 與入口網站重繪，2026-11」), bottom-left at y 890 by default; on a zh-TW portal frame use `AZ.FOOT_PORTAL` (top right under the top bar — the left menu fills the bottom-left). `text: AZ.FOOTNOTE_LEARN` = the old text. |
| `mockTag()` | 「介面示意」 tag |
| `box(el, root)` | an element's box in root px — correct inside a zoomed world or a scaled screen; `el` / `root` may also be a component (`{el}`, e.g. the `azureFrame()` result) |
| `shot.full(fx, fy)`, `shot.on(fx, fy, box, zoom)` | kit camera targets for a frame at world (fx, fy) |
| `texts(root)`, `read(el, id)` | readcheck blocks; mark more text as must-read |

Names you can rely on (checked against Microsoft Learn 2026-11-08 in the research files): `AZ.FOUNDRY_SECTIONS`,
`AZ.FOUNDRY_NAV`, `AZ.AGENT_TABS`, `AZ.DEPLOYMENT_TYPES` (Global Standard, Data Zone Standard, Standard, Global
Provisioned Throughput, Global Batch, Data Zone Batch), `AZ.APPINSIGHTS_MENU`, `AZ.ALERT_TABS`. Metric, table, span and
KQL text: copy from `FACTS-research-B-監控.md` §4–5 (K1–K6 verbatim; A1–A3 are adaptations → label 「示例」).

## 5. Readcheck and purity
- Readable by default (`data-read`): frame titles, resource type, project picker, status chips, dropdown value, slider
  value, chart title / legend values / hover readout, waterfall names, tokens and durations, simple-view titles and
  meta, banner and toast text, alert fields and sentence, Grafana tiles, chat messages. Table cells and code lines only
  with `read: 'prefix'`. Add more with `AZ.read(el, id)`; the magnifier strips `data-read` from its clone.
- A push-in that cuts a readable block in half fails readcheck: push onto whole blocks, or mark fewer.
- Every update is a pure function of its argument (`set`, `reveal(k)`, `hover(x)`, `focus(a, b, k)`, `cursor.update(t)`,
  `show(n)`); no CSS transitions, no timers, no `Date.now`. Values are rewritten only when they change.

## 6. Known limits
- Layout is real CSS: long values can widen a column; the kit does not wrap or truncate for you (`white-space: nowrap`
  on most labels). Check full-resolution stills.
- The magnifier clones the whole frame (fine for a few; each clone is a second copy of the DOM).
- `cursor` and `magnifier` measure elements: build them after `AZ.ready()` (an open dropdown list must be open while
  you measure its options — `dd.set({open: true})`, measure, `dd.set({open: false})`).
- Exact UI wording of minor labels (e.g. Grafana dashboard panel names, the deploy drawer layout, App Insights waterfall
  columns) is a faithful approximation from Learn text, not a pixel copy; if a lesson's point depends on one label, check
  it on Learn first and pass it in.
- JetBrains Mono / DejaVu Sans Mono are system fonts of the render machine (not npm packages).
- Speed: see `projects/azure-kit-demo/NOTES.md` (measured on the shared 4-core machine).

## 7. zh-TW Azure portal (experiment 21, `azure-ops-2026`; `portal.js`, re-exported by `azure.js`)

Built 2026-11-09 from the learner's four portal screenshots (home, the 入口網站功能表, 監視｜概觀, Default Directory｜概觀) and
Microsoft Learn (zh-tw). Demo: `projects/ops-kit-demo/` — `scene.html` (44 full-frame scenes, 2200 px apart, every screen
below; scene lengths are computed from the readable text so `readcheck.cjs` passes; `?scene=<name>` jumps to one;
`window.SCENES`), `studio.html?teacher=iris|nico` (screen in studio), `classroom.html?at=default|rec|l4` (glass classroom
check). Stills: `projects/ops-kit-demo/stills/<scene>.jpg` (+ `-push`), `studio-iris.jpg`, `studio-iris-aha.jpg`,
`studio-nico.jpg`, `iris-classroom-*.jpg`. Nothing old changed except: the footnote default (above), `table` cells may carry
`icon / color / mono / chip` and the statuses `info / off`, `waterfall({tokW: 0})` drops the Tokens column, `codeEditor`
`runLabel / timeLabel`. The English `azureFrame` / `foundryFrame` are unchanged.

### 7.1 Look (from the screenshots)
- **Top bar** `#4778CE` (sampled), waffle + ☰, 「Microsoft Azure」 as plain text, search 「搜尋資源、服務及文件 (G+/)」 (white, at x 590),
  white **Copilot** button (lucide sparkles, not the Copilot logo), Cloud Shell / bell / settings / help / feedback icons, the
  account block (two lines, right-aligned) and a grey avatar. The account is **fictional**: `dev@contoso-cram.com` /
  `DEFAULT DIRECTORY (CONTOSOCRAM…)` (`AZ.ACCOUNT`; never the learner's real address or tenant). Below 1800 px frame width the
  bar compacts (narrower search).
- **Blade**: breadcrumb 「首頁 ›」, header icon (lucide in the resource colour — `AZ.TYPE_ICON`), 「**resource** | page」, the type line
  under it (e.g. 「App Service」, 「Microsoft」), 「…」, optional command chips (screenshot 3: 為此資源產生查詢 · 顯示本資源的效能趨勢 ·
  列出本資源的指標), ✕ at the right. Left menu: 「搜尋」 box + ⇕ « tools, items 21 px (long ones wrap, like the real portal),
  groups 「∨ 管理」 open / 「› 深入解析」 collapsed, the active item on `#EDEBE9` in bold. Command bar above the content.
- Scale ≈ 1.45 × the screenshots (body 21–22 px at 1920 × 1080, like the rest of the kit). Our overlay grammar is unchanged:
  `makeUI(frame.overlay)` for labels / selection / stamps, `AZ.chipOn(f.item('可檢視性 Agent (預覽)'), 'GA')` for status chips
  (the portal still says 預覽; the official status is GA 2026-06-23 — the chip says GA).

### 7.2 Frames and menus
| call | options | returns |
|---|---|---|
| `portalFrame(o)` | `w, h` (1920×1080), `resource`, `page` (after the 「|」), `type` (type line; '' = none), `crumbs` (['首頁']), `menu` (a menu constant or your own; `null` = no menu), `menuW` (360; 370 for Entra), `active` (default = `page`), `cmds` ([[icon, label, {dd}]]), `chips` (header command chips), `icon`, `iconBg` (default from `AZ.TYPE_ICON[type]`), `chip` (status chip after the title), `account`, `close` | `{el, overlay, top, body (append panes here), menuEl, cmdbar, content (= page), item(name), group(name), cmd(label), setActive(name)}` |
| `portalHome(o)` | `services` (`AZ.HOME_SERVICES`), `rows` ([[name, type, when]], default `AZ.SERIES_RESOURCES`), `max` (9), `tab` ('最近') | `{el, overlay, top, content, service(name), row(i), cell(i, 'n'|'t'|'w')}` |
| `portalMenu(o)` | the 入口網站功能表 flyout: `active`, `top` (60), `w` (420), `scrim` — `home.el.append(AZ.portalMenu({active: '監視'}).el)` | `{el, item(name)}` |
| `portalTop(o)` | the bar alone: `search, copilot, account, h, w` | element |

Menu constants (item `[label, icon, colour]`, group `{g, open, items}`): `PORTAL_MENU`, `MONITOR_MENU`, `ENTRA_MENU`,
`APPSERVICE_MENU`, `PLAN_MENU`, `SQLDB_MENU`, `SQLSERVER_MENU`, `KEYVAULT_MENU`, `STORAGE_MENU`, `FRONTDOOR_MENU`,
`WAFPOLICY_MENU`, `APPINSIGHTS_MENU_ZH`, `LOGANALYTICS_MENU`, `DEFENDER_MENU`, `ADVISOR_MENU`, `COST_MENU`; also
`HOME_SERVICES`, `TYPE_ICON`, `SERIES_RESOURCES` (SERIES §2 names), `ENTRA_CMDS`, `ALERT_TABS_ZH`, `IC` (icon colours), `PORTAL_BLUE`.

### 7.3 Widgets (all return plain DOM; pure updates only)
| call | what (labels: see 7.4) | returns |
|---|---|---|
| `checkbox({label, on})`, `radio({label, options, value, row})`, `segmented({label, options, value})` (狀態 關閉｜開啟), `valueBox({value, w, mono, copy, dd, ph})`, `form(rows, {labelW})` (label column + control column; rows `[label, control, {req, info, sub}]`), `section(title, sub)`, `pane({title, w, body, buttons})` (append to `f.body`), `infoBar({kind, text, link})`, `cmdRow(cmds)`, `tableZh(o)` (= `table` with 「… N 個更多」) | form pieces | apis with `set(...)` |
| `metricChart(o)` | picker pills (scope · metric · aggregation · split) + `lineChart` (threshold line, split-by legend) | lineChart api + `el`, `pickers` |
| `autoscale(o)` | 相應放大 page: 手動縮放 / 自訂自動調整, condition 預設, 根據計量進行縮放, scale-out / scale-in rule rows (`rules: [{dir, when, action}]`), 新增規則, 實例限制 最小 / 最大 / 預設 (`limits`), 新增調整規模的條件 | `{el, rule(i), limit(name), radio(name)}` |
| `scaleRulePane(o)` | 縮放規則: metric, aggregation, 運算子, 用於觸發調整動作的計量閾值, duration, 作業, 執行個體計數, 冷卻時間 (分鐘) | pane + `field(label)` |
| `slotsPage(o)`, `swapPane(o)` | 部署位置 list (名稱 / 狀態 / App Service 方案 / 流量 %, PRODUCTION badge); 交換 pane (使用預覽執行交換, 來源, 目標, 來源位置變更 / 目標位置變更 table, 開始交換, 關閉) | `{el, row, cell}`; pane + `tabs, table, checkbox, btn(label)` |
| `healthCheckPage(o)` | tab 健康情況檢查 (啟用｜停用, Path, Load balancing threshold) or 執行個體 (名稱 / 狀態 狀況良好 · 狀況不良 / 重新啟動) | `{el, toggle, path, row(i)}` |
| `generalSettings(o)` = `tlsSettings` | 組態 › 一般設定: Stack 設定, 只限 HTTPS, 最低 TLS 版本 (1.0–1.3), HTTP 版本, AlwaysOn, Session affinity | `{el, row(label)}` |
| `customDomainsPage(o)`, `dnsTable(o)`, `certificatesPage(o)` | 自訂網域 table; the registrar's DNS table 類型 / 主機 / 值 / TTL (A, CNAME, TXT asuid — tagged 介面示意: not an Azure screen); 憑證 tabs + 名稱 / Expiration date / 狀態 | `{el, row, cell}` |
| `iamPage(o)`, `addRoleAssignment(o)` | 存取控制 (IAM) › 角色指派 (名稱 / 類型 / 角色 / 範圍); 新增角色指派 pane, `step: '角色'` (工作功能角色 / 特權管理員角色, role list) or `'成員'` (存取權指派對象: 使用者、群組或服務主體 / 受控識別, 選取成員) | `{el, row, cell}`; pane + `role(name)` |
| `identityPage(o)` | 系統指派 (狀態 關閉｜開啟, Object (principal) ID placeholder GUID `aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb`, Azure role assignments) / 使用者指派 (table) | `{el, status, objectId}` |
| `entraOverview(o)` | screenshot 4 exactly (command bar `ENTRA_CMDS`, info strip, tabs 概觀 監視 屬性 建議 設定指南, 搜尋您的租用戶, 基本資訊 grid, 警示 card 「移轉至聚合的驗證方法原則」, 我的摘要); fictional values | `{el, field(k), value(k), alertCard}` |
| `signInLogs(o)`, `activityLog(o)`, `sqlEntraAuth(o)` | Entra 登入記錄 table; 活動記錄 table (filter pill 事件類別); SQL Server › Microsoft Entra ID (支援對此伺服器執行僅限 Microsoft Entra 驗證 + the 啟用僅限 Microsoft Entra 驗證 [是] dialog with `confirm`) | `{el, row, cell}`; `{el, checkbox, dialog}` |
| `networkPage(o)`, `accessRestrictions(o)`, `sqlNetworking(o)` | App Service 網路 (輸入流量設定: 公用網路存取, 存取限制, Private endpoints; 虛擬網路整合); 存取限制 (不相符的規則動作 允許/拒絕; 優先順序 / 名稱 / 來源 / 動作 / HTTP headers; AzureFrontDoor.Backend + X-Azure-FDID); SQL Server 網路 (`tab` Public access with the 'Allow Azure services…' checkbox `allow` / Private access endpoints) | `{el, row, cell}` / `{el, allow}` |
| `wafPolicy(o)`, `secureScore(o)`, `defenderRecs(o)` | WAF policy (Policy mode, managed rule sets, custom rate-limit rule); 安全分數 ring (`set(pct)`); Defender 建議 table + ring | apis |
| `appMap(o)` | 應用程式對應: nodes `{id, name, kind app|sql|http|storage|ai, x, y, sub, err (0–1 red share of the ring), warn}`, edges `{from, to, label, warn}` (warn = our magenta) | `{el, node(id), edge('a>b'), label('a>b')}` |
| `operationsBlade(o)` | 效能 / 失敗 body: tabs Operations · Dependencies · …, optional `chart` (lineChart opts), operation table (Count, Duration (50th), Duration (95th) / Count (failed), Count (all)) | `{el, row, cell, chart}` |
| `diagnosticSetting(o)` | 記錄 › 類別群組 (allLogs, audit) › 類別 checkboxes, 計量 AllMetrics, 目的地詳細資訊 (Send to Log Analytics workspace + workspace picker) | `{el, category(label), dest}` |
| `availabilityPage(o)` | 新增標準測試, test table, location × run grid (`runs`: 1 ok / 0 fail per location), 啟用 SSL 憑證有效性 + Proactive lifetime check | `{el, row, dot(loc, i)}` |
| `alertTabsZh(active)`, `alertConditionZh(o)`, `alertActionsZh(o)`, `alertDetailsZh(o)` | the alert-rule wizard in zh (範圍 條件 動作 詳細資料 標籤 檢閱 + 建立; 訊號名稱, 閾值 靜態｜動態, 彙總類型, 運算子, 臨界值, 檢查間隔, 回溯期間; 動作群組名稱; 嚴重性, 警示規則名稱, 警示規則描述). No preview sentence (its zh wording is unknown — pass your own label) | tabs api / `{el, field}` / element |
| `alertProcessingRule(o)` | 建立警示處理規則, `tab` 範圍 / 規則設定 (隱藏通知 / 套用動作群組) / 排程 (開始時間, 結束時間, Time zone) | `{el, action}` |
| `healthCard(o)` | `kind: 'resource'` 資源健康狀態 + 可用 / 無法使用 / 未知 / 已降級; `kind: 'service'` 服務健康情況 + tabs 服務問題 / 計劃性維護 / 健康情況諮詢 | `{el}` |
| `changeTable(o)` | 變更分析 rows (Time / Resource / Change type / Changed by / Operation; `cols` to override) | `{el, row, cell}` |
| `usagePage(o)` | Log Analytics 使用量和估計成本: 每日上限 command, GB/day bars with the cap line, and the 每日上限 pane (開啟｜關閉, GB/天) as `pane` (append `u.pane.el` to `f.body`) | `{el, bars, pane, bar(i)}` |
| `costTable(o)`, `advisorPage(o)`, `monitorOverview()` | Cost analysis by service; Advisor 分數 + category tiles + recommendations; 監視 › 概觀 as screenshot 3 (見解 and 偵測、分級與診斷 cards) | apis |

### 7.4 Where the labels come from (SERIES §0.1: screenshots win; then zh-tw Learn; a guess stays English)
- **Screenshots [shot]**: the top bar strings; 首頁; 名稱 / 類型 / 上次檢視時間, 最近 / 我的最愛, 查看全部, 瀏覽, the Azure 服務 row; the whole
  入口網站功能表; 監視 menu (incl. 可檢視性 Agent (預覽), 問題, 健康度模型, 變更分析, 服務健康情況, 活頁簿, 儀表板搭配 Grafana, › 深入解析 / 受管理的服務 /
  設定 / 支援與疑難排解), the 監視 概觀 chips, banner, tabs and card texts; the Entra menu down to Microsoft Entra Connect, its command
  bar, info strip, tabs, 搜尋您的租用戶, 基本資訊 keys, 警示 card text, 我的摘要; resource type strings (SQL 資料庫, SQL Server, Application
  Insights, Log Analytics 工作區, 訂用帳戶, 動作群組, 資源群組, Foundry); 概觀, 活動記錄, 警示, 計量, 記錄, 儲存體帳戶, Advisor,
  適用於雲端的 Microsoft Defender, 成本管理 + 計費.
- **zh-tw Learn [learn]** (fact files A/B/C §12, plus pages checked by the component maker 2026-11-09: autoscale-get-started,
  deploy-staging-slots, monitor-instances-health-check, overview-managed-identity, app-service-ip-restrictions,
  diagnostic-settings, alerts-processing-rules, daily-cap, authentication-azure-ad-only-authentication-tutorial,
  role-assignments-list-portal, concept-sign-ins): 存取控制 (IAM), 標籤, 診斷並解決問題, 部署位置, 部署中心, 環境變數, 組態, 一般設定, 驗證, 身分識別,
  憑證, 受控憑證, 攜帶您自己的憑證 (.pfx), 新增憑證, 自訂網域, 新增自訂網域, 網路, 輸入流量設定, 公用網路存取, 存取限制, 優先順序, 動作, 允許 / 拒絕, 不相符的規則動作,
  虛擬網路整合, 健康情況檢查, 啟用, 儲存, 執行個體, 重新啟動, 狀況不良, 手動縮放, 自訂自動調整, 根據計量進行縮放, 調整為特定執行個體計數, 新增規則, 新增調整規模的條件,
  縮放規則, 運算子, 小於 (→ 大於), 用於觸發調整動作的計量閾值, 作業, 減少計數依據 (→ 增加計數依據), 執行個體計數, 冷卻時間, 實例限制, 最大, 預設, 執行歷程記錄, 新增位置,
  交換, 來源, 目標, 使用預覽執行交換, 來源位置變更, 目標位置變更, 開始交換, 完成交換, 取消交換, 關閉, 流量 %, 部署位置設定, 只限 HTTPS, 最低 TLS 版本, HTTP 版本,
  AlwaysOn, Stack 設定, 系統指派 / 使用者指派, 狀態, 開啟 / 關閉, 新增, 移除, 角色指派, 新增角色指派, 工作功能角色 / 特權管理員角色, 成員, 選取成員,
  使用者、群組或服務主體 / 受控識別, 檢閱 + 指派, 擁有者, 參與者, 讀取者, 儲存體 Blob 資料參與者, 祕密, 安全分數, 建議, 應用程式對應, 智慧偵測, 即時計量, 可用性,
  失敗, 效能, 調查, 端對端交易詳細資料, 新增標準測試, 啟用 SSL 憑證有效性, 使用量和估計成本, 每日上限, GB/天, 診斷設定, 類別群組, 類別, 目的地詳細資訊, allLogs,
  audit, AllMetrics, 範圍 / 條件 / 動作 / 詳細資料 / 標籤 / 檢閱 + 建立, 訊號名稱, 閾值 靜態 / 動態, 彙總類型, 臨界值, 檢查間隔, 回溯期間, 動作群組名稱,
  嚴重性, 警示規則名稱, 警示規則描述, 警示處理規則, 規則設定, 排程, 隱藏通知, 套用動作群組, 開始時間 / 結束時間, 資源健康狀態 + 可用 / 無法使用 / 未知 / 已降級,
  服務問題, 計劃性維護, 健康情況諮詢, 可靠性, 成本, Advisor 分數, 登入記錄, 事件類別, Microsoft Entra ID (SQL menu), 支援對此伺服器執行僅限 Microsoft Entra 驗證,
  啟用僅限 Microsoft Entra 驗證, 是.
- **Ours, derived or common** (flagged; override if a lesson depends on them): 最小 (antonym of Learn's 最大 — the one guessed Chinese word kept,
  because 最小 / 最大 / 預設 is one row); 增加計數依據 (Learn has 減少計數依據); 大於 (Learn has 小於); 「相應增加 / 相應放大 (App Service 方案)」 menu items
  (相應增加 is Learn, the SERIES §4 glossary names both as portal words; the bracket form is unverified — Learn's autoscale page writes
  「擴展（App Service 方案）」); 狀態 / 名稱 / 類型 / 角色 / 範圍 as table headings (words from the screenshots / Learn; their use as these column headings
  is not confirmed); 建立警示規則 / 建立警示處理規則 page titles (Learn says 「建立 > 警示規則」, 「新增警示處理規則精靈」); 來源 column; 「… N 個更多」.
- **Kept English [en]** (zh string unknown or only guessed): Discard, Path, Load balancing threshold, Metric name, Time aggregation,
  Duration (minutes), Session affinity (Learn: 會話親和性 / 工作階段親和性 inconsistent), Path mappings, Status / Binding type / Certificate /
  Secured / No binding (custom domains), Expiration date, Public key certificates (.cer), Check access / Roles / Deny assignments,
  Download role assignments, Description, Object (principal) ID, Azure role assignments, Permissions, Private endpoints, Outbound traffic
  configuration, Service Tag, HTTP headers, Deny all / Any, SQL Server 網路 page (Public access, Private access, Connectivity, Public network
  access, Disable / Selected networks, Exceptions, **Allow Azure services and resources to access this server**, Private endpoint,
  Connection state, Approved), Microsoft Entra admin / Set admin / Remove admin / Microsoft Entra authentication only, the whole Front Door /
  WAF policy UI, Defender menu (except 概觀 / 建議) and table headings, Risk level, Affected resources, the Application Insights tables
  (Operation name, Count, Duration (50th / 95th), Count (failed / all), Operations / Dependencies / Exceptions / Roles), Search, app-map
  edge texts ('calls'), Diagnostic setting name, **Send to Log Analytics workspace** (「傳送至 Log Analytics 工作區」 is guessed in fact file C),
  Archive to a storage account, Stream to an event hub, Send to partner solution, Subscription, Test name / Test type / Availability /
  Test locations / Proactive lifetime check, Select / Create action group(s), Contains actions, severity values, Split by dimensions, Rule
  type, Apply the rule + Always / At a specific time / Recurring, Time zone, Scope, Security advisories, Issue name / Region / Start
  time, No service issues found…, change-analysis headings (Time, Resource, Change type, Changed by, Operation), Data retention, Data
  ingestion, Cost analysis / Cost alerts / Budgets / Service name / Cost / Actual cost, Advisor's Security / Performance / Operational
  excellence / Recommendation / Impact / Impacted resources, the sign-in log tabs and headings (Date, User, Application, Status, IP
  address, Conditional Access, Success / Failure / Not Applied), activity-log headings (Operation name, Status, Time, Time stamp, Event
  initiated by, Succeeded), menu items Apps, Properties, Query editor (preview), Compute + storage (計算 + 儲存體 is guessed), SQL databases,
  Keys / Objects, Containers, Data storage, Security + networking, Access keys, Tables, Getting started, Attack path analysis, Security
  alerts, Inventory, Cloud Security, Management, Environment settings, Recommendations, Advisor recommendations, KQL Run / Time range.
- Asked for by lesson 4 and **not confirmable** in zh: sign-in log column headings, activity-log column headings (作業名稱 / 狀態 / 時間 /
  事件起始者 appear nowhere on zh-tw Learn as headings — kept English), the IAM table headings (above). Confirmed: 登入記錄, 角色指派 tab,
  SQL Server › 設定 › Microsoft Entra ID, 支援對此伺服器執行僅限 Microsoft Entra 驗證, 啟用僅限 Microsoft Entra 驗證 [是], 事件類別.

### 7.5 Use (full frame)
```js
const f = AZ.portalFrame({ resource: 'cram-ai-api', page: '部署位置', type: 'App Service', menu: AZ.APPSERVICE_MENU });
f.content.append(AZ.slotsPage().el);
const p = AZ.swapPane({ preview: true }); f.body.append(p.el);           // panes go into f.body
const foot = AZ.footnote(st.screen, AZ.FOOT_PORTAL);                     // top right
// after AZ.ready(): cursor keys may use elements (AZ.cursor(f.overlay, f.el, [{ t: 2.4, at: p.btn('開始交換'), click: true }]))
```
Readcheck: every builder marks its titles / values `data-read`; table cells only with `read` (`tableZh({..., read: 'id'})`).
Code lines that `focus()` dims to 30 % drop out of TEXTS — mark only the lit lines (`AZ.read(ed.line(n).querySelector('.tx'), id)`).
A content area taller than the frame is cut: the alert wizard fits 條件 *or* 動作 + 詳細資料 in one 1080 frame, not all three.

### 7.6 Screen in studio with both teachers (`projects/ops-kit-demo/studio.html`)
Placements (page px: feet x, feet y, on-screen height px; checked on full-resolution stills, `cues.check` silent):

| teacher (skin) | screen `AZ.studioScreen` | teacher | student | pointing arm y |
|---|---|---|---|---|
| Nico (`glossy-bot`) | `{x: 400, y: 92, w: 1180, h: 688}` | `[200, 975, 430]` | `[1740, 985, 320]` | 975 − 0.43 × 430 ≈ **790** |
| Iris (`glass`) | `{x: 500, y: 92, w: 1110, h: 650}` | `[252, 948, 430]` | `[1715, 970, 270]` | 948 − 0.48 × 430 ≈ **742** |

- The glass cast is **wide**: Iris ≈ 1.1 × px wide, the sphere student ≈ 1.25 × px. Keep Iris's x ≥ 0.56 × px + 10 and the student's
  x ≤ 1920 − 0.65 × px − 10, or they are cut at the frame edge (the student at 1758 / 290 px was cut). The screen starts right of
  Iris's shoulder (x ≥ teacher x + 0.56 × px).
- The arm is horizontal at `feet y − ARM × px` (ARM: glossy-bot 0.43, glass 0.48 — `lib/cast/cue.js`), so with feet near the floor
  line it reaches only the **bottom fifth** of the screen. Anything higher: show it in an `AZ.magnifier` inset placed at arm height
  (`at: [teacherX + 0.56·px + 520, armY]`, `parent: flat.over`, `map: scr.toPage`) and cue the inset element — never let the cue
  point at the far row (it becomes a look and prints a warning). That is what `studio.html` does (row 「老闆」 → inset at y 742 / 790).
- Gaze and state lamps work as for Nico: `cues.apply('student', …)` turns the student to the inset; `state: 'think'` = blue fast core,
  `'aha'` = gold core with sparkles (`studio-iris-aha.jpg`).
- Classroom (`lib/house/classroom.js`): the glass skin now carries `classroomScale` (teacher 0.72, student 0.7; `lib/cast/skins/glass.js`)
  — at the clay height Iris filled the left quarter and was cut. Recommended `makeClassroom({ skin: 'glass', teacherAt: [-2.7, 0, -1.5],
  studentAt: [2.6, 0, -1.3] })` (both fully in the W shot with margin, `iris-classroom-rec.jpg`); the default positions now also fit,
  tightly (`iris-classroom-default.jpg`). The glass pointing arm in the W shot sits at about the board's bottom edge: cue board elements
  in the lower part of the board, or use `point: false`.
