"use strict";
// Styles for the Video Academy and Recall Films tabs and their pop-ups. Every colour is a design token
// (src/styles/hub.js); tokens reach the pop-ups through `.lh-vid-modal`. Buttons carry !important because
// Obsidian's own button rules out-rank plain class selectors.

module.exports = `
.lh-vid { flex:1; display:flex; flex-direction:column; gap:12px; min-height:0; overflow:hidden; }
/* Player page header: back, series name, page actions. The right padding is the room the Hub's
   minimise / close buttons take on the first line. When the window is too narrow for one line the
   row wraps: the actions move down first, then the name, which never shrinks below a readable width.
   Below the first line nothing is beside the window buttons, so the actions may use the full width
   there, and wrap among themselves when even that is too narrow. */
.lh-vid-head-row { display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; flex:none; min-height:32px; padding-right:92px; }
.lh-vid-head-title { flex:1 1 0; min-width:min(100%,8em); font-size:17px; line-height:24px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lh-vid-head-actions { display:flex; flex-wrap:wrap; gap:8px 10px; flex:none; max-width:calc(100% + 92px); }
.lh-vid-body { display:flex; flex-direction:column; gap:12px; }
.lh-vid-spacer { flex:1; }

.lh-vid-btn { height:34px; padding:0 14px !important; border-radius:10px !important; border:0 !important; background:var(--raised) !important; color:var(--tint) !important; font-size:13.5px; font-weight:600; cursor:pointer; box-shadow:var(--rshadow) !important; white-space:nowrap; display:inline-flex; align-items:center; justify-content:center; gap:6px; }
.lh-vid-btn:hover { background:var(--raisedh) !important; }
.lh-vid-btn .lh-i { width:16px; height:16px; }
.lh-vid-btn-primary { background:var(--btn) !important; color:var(--onbtn) !important; box-shadow:inset 0 .5px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.16),0 3px 10px rgba(91,72,184,.18) !important; }
.lh-vid-btn-primary:hover { background:var(--btnh) !important; color:var(--onbtn) !important; }
.lh-vid-btn-primary svg:not(.lh-i) { width:12px; height:12px; fill:currentColor; }
.lh-vid-btn-danger,.lh-vid-btn-danger:hover { background:var(--dang) !important; color:var(--ondang) !important; }
.lh-vid-btn:disabled { background:var(--fill2) !important; color:var(--text3) !important; box-shadow:none !important; cursor:not-allowed; }
.lh-vid-btn.is-done:not(:disabled) { background:color-mix(in srgb,var(--mst) 16%,var(--raised)) !important; color:var(--mstt) !important; box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--mstt) var(--ringk),transparent) !important; }
.lh-vid-back { height:32px; padding:0 12px !important; border-radius:10px !important; background:var(--raised) !important; border:0 !important; box-shadow:var(--rshadow) !important; color:var(--tint) !important; font-size:13.5px; font-weight:500; cursor:pointer; white-space:nowrap; }
.lh-vid-back:hover { background:var(--raisedh) !important; }
body.is-phone .lh-vid-back { height:auto; padding:0 !important; background:none !important; box-shadow:none !important; color:var(--tint) !important; font-size:15px; }
.lh-vid-btn-danger-text { background:none !important; color:var(--dang) !important; font-weight:500; padding:0 8px !important; }
.lh-vid-btn-danger-text:hover { background:none !important; color:var(--dang) !important; }
.lh-vid-pro-tag { font-size:11px; font-weight:600; color:var(--tint); background:var(--chipbg); padding:1px 6px; border-radius:6px; }

.lh-vid-empty { flex:1; min-height:240px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; text-align:center; padding-bottom:70px; }
.lh-vid-empty-icon { width:52px; height:52px; border-radius:13px; background:var(--fill2); color:var(--text2); display:grid; place-items:center; margin-bottom:10px; }
.lh-vid-empty-icon .lh-i { width:26px; height:26px; }
.lh-vid-empty-title { font-size:19px; line-height:26px; font-weight:600; color:var(--text); }
.lh-vid-empty-body { font-size:15px; line-height:23px; color:var(--text2); max-width:390px; }

/* Continue-watching card. The text keeps a readable width (series + lesson name) and the resume button
   drops to its own full-width row when the card is too narrow for thumbnail, text and button side by side. */
.lh-vid-continue { display:flex; flex-wrap:wrap; align-items:center; gap:10px 14px; padding:10px; border-radius:16px; background:var(--card); box-shadow:var(--cshadow); flex:none; }
.lh-vid-continue > .lh-vid-thumb { flex:none; }
.lh-vid-continue-info { flex:1000 1 9em; display:flex; flex-direction:column; gap:2px; min-width:min(100%,9em); }
.lh-vid-continue > .lh-vid-btn { flex:1 1 auto; }
.lh-vid-kicker { font-size:12px; line-height:16px; color:var(--tint); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lh-vid-continue-title { font-size:17px; line-height:24px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.lh-vid-filters { display:flex; align-items:center; flex-wrap:wrap; gap:8px; flex:none; }
.lh-vid-filters .lh-seg { max-width:100%; overflow-x:auto; scrollbar-width:none; }
.lh-vid-filters select.lh-fp { max-width:160px; }

.lh-vid-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
.lh-vid-scard,.lh-vid-ep-film { display:flex !important; flex-direction:column; align-items:stretch; justify-content:flex-start; gap:2px; height:auto !important; min-width:0; padding:0 !important; text-align:left; white-space:normal; border-radius:16px !important; border:0 !important; background:var(--card) !important; color:var(--text) !important; box-shadow:var(--cshadow) !important; cursor:pointer; overflow:hidden; }
.lh-vid-scard:focus-visible,.lh-vid-ep-film:focus-visible { outline:2px solid var(--tint); outline-offset:2px; }
.lh-vid-scard > :not(.lh-vid-scard-cover):not(.lh-vid-thumb),.lh-vid-ep-film > :not(.lh-vid-thumb) { margin-left:12px; margin-right:12px; }
.lh-vid-scard > :last-child,.lh-vid-ep-film > :last-child { margin-bottom:12px; }
.lh-vid-scard .lh-vid-scard-title,.lh-vid-ep-film .lh-vid-scard-title { margin-top:10px; }
.lh-vid-scard.is-new { box-shadow:0 0 0 2px var(--btn) !important; }
.lh-vid-scard-cover { display:block; position:relative; aspect-ratio:16/9; overflow:hidden; background:linear-gradient(135deg,#3C3C42,#1F1F23); }
.lh-vid-scard-cover img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.lh-vid-scard-cover.is-pending { display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding:14px; box-sizing:border-box; background:var(--fill2); }
.lh-vid-scard-goal { font-size:14px; line-height:20px; color:var(--text2); display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.lh-vid-scard-title { font-size:15px; line-height:20px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; }
.lh-vid-scard-meta { display:block; font-size:12px; line-height:16px; color:var(--text3); }
.lh-vid-badge-pending { font-size:12px; font-weight:600; color:var(--text3); }
.lh-vid-badge-pending.is-making { color:var(--lrnt); }
.lh-vid-badge-pending.is-failed { color:var(--newt); }
.lh-vid-cover-badge { position:absolute; left:8px; top:8px; padding:1px 7px; border-radius:6px; background:var(--card); }
.lh-vid-banner { display:flex; align-items:center; gap:10px; padding:8px 8px 8px 14px; border-radius:12px; background:var(--card); box-shadow:var(--cshadow); flex:none; }
.lh-vid-banner-text { flex:1; min-width:0; font-size:13px; font-weight:500; color:var(--lrnt); }
.lh-vid-banner.is-failed .lh-vid-banner-text { color:var(--newt); }
.lh-vid-modal .lh-vid-banner .lh-vid-banner-text { color:var(--text2); }
.lh-vid-error { font-size:13px; line-height:18px; color:var(--newt); }
.lh-vid-prompt { width:100%; box-sizing:border-box; padding:10px 12px; border-radius:10px; border:0; background:var(--fill); color:var(--text); font-family:inherit; font-size:13px; line-height:20px; resize:none; }

.lh-vid-avatar { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; flex-shrink:0; border-radius:50%; overflow:hidden; background:var(--fill); color:var(--text); font-size:13px; font-weight:600; }
.lh-vid-avatar img { width:100%; height:100%; object-fit:cover; }
.lh-vid-avatar.is-tiny { width:18px; height:18px; font-size:10px; }
.lh-vid-teacher-tag { display:inline-flex; align-items:center; gap:5px; font-size:12px; line-height:16px; color:var(--text3); }
.lh-vid-teacher-who { flex:1; min-width:0; }
.lh-vid-teacher-pick { display:flex; align-items:center; gap:10px; }
.lh-vid-teacher-pick .lh-vid-teacher-who { font-size:13px; color:var(--text); }
.lh-vid-modal.lh-vid-picker { width:min(94vw,820px) !important; }
.lh-vid-picker .modal-content { max-height:82vh; overflow-y:auto; }
.lh-vid-picker-install { display:flex; align-items:center; gap:10px; }
.lh-vid-picker-install:empty { display:none; }
.lh-vid-picker-install .lh-vid-modal-desc { flex:1; }
.lh-vid-picker-inherit { align-self:flex-start; }
.lh-vid-picker-inherit.is-selected { background:var(--tone) !important; box-shadow:var(--tonering) !important; }
.lh-vid-picker-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.lh-vid-tcard { display:flex; gap:12px; padding:10px; border-radius:16px; background:var(--card); box-shadow:var(--cshadow); }
.lh-vid-tcard.is-selected { box-shadow:0 0 0 2px var(--btn); }
.lh-vid-tcard-photo { position:relative; width:112px; flex-shrink:0; aspect-ratio:3/4; border-radius:10px; overflow:hidden; background:var(--fill); }
.lh-vid-tcard-photo img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.lh-vid-tcard-lock { position:absolute; left:6px; top:6px; padding:1px 6px; border-radius:6px; background:var(--card); color:var(--text2); font-size:11px; font-weight:600; }
.lh-vid-tcard-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; }
.lh-vid-tcard-head { display:flex; align-items:baseline; flex-wrap:wrap; gap:2px 8px; }
.lh-vid-tcard-name { font-size:15px; font-weight:600; color:var(--text); }
.lh-vid-tcard-title { font-size:12px; font-weight:500; color:var(--text3); }
.lh-vid-tcard-fits { font-size:12px; font-weight:500; line-height:18px; color:var(--text); }
.lh-vid-tcard-effect { flex:1; font-size:12px; line-height:18px; color:var(--text3); }
.lh-vid-tcard-actions { display:flex; align-items:center; gap:6px; }
.lh-vid-swatches { display:flex; gap:6px; }
.lh-vid-swatch { width:22px; height:22px; padding:0 !important; border-radius:50% !important; border:2px solid transparent !important; box-shadow:0 0 0 1px var(--sep) !important; cursor:pointer; }
.lh-vid-swatch.is-on { border-color:var(--card) !important; box-shadow:0 0 0 2px var(--btn) !important; }

.lh-vid-cards-row:empty { display:none; }
.lh-vid-cards-row .lh-vid-btn:not(:disabled) { background:var(--tone) !important; box-shadow:var(--tonering) !important; }
.lh-vid-cards-row .lh-vid-btn:not(:disabled):hover { background:var(--toneh) !important; }
.lh-vid-chapters { display:flex; flex-direction:column; gap:2px; }
.lh-vid-chapter { display:flex !important; justify-content:flex-start; align-items:center; gap:10px; height:auto !important; padding:5px 8px !important; background:none !important; border:0 !important; box-shadow:none !important; color:var(--text) !important; font-size:13px; text-align:left; white-space:normal; border-radius:8px !important; cursor:pointer; }
.lh-vid-chapter:hover { background:var(--fill2) !important; }
body:not(.is-phone) .lh-vid-chapters { display:block; columns:230px; column-gap:8px; }
body:not(.is-phone) .lh-vid-chapters .lh-vid-side-head { column-span:all; }
body:not(.is-phone) .lh-vid-chapter { width:100%; margin:0 0 2px; box-sizing:border-box; break-inside:avoid; }
.lh-vid-chapter-time { flex-shrink:0; font-variant-numeric:tabular-nums; color:var(--tint); font-weight:500; }
.lh-vid-credits { font-size:12px; line-height:16px; color:var(--text3); }
.lh-vid-ep-setting { display:flex; align-items:center; flex-wrap:wrap; gap:10px; flex:none; font-size:13px; color:var(--text2); }
.lh-vid-ep-setting .lh-vid-set-label { font-weight:500; color:var(--text); }
.lh-vid-ep-requests { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; overflow:hidden; flex:none; }
.lh-vid-ep-requests-head { height:34px; display:flex; align-items:center; padding:0 14px; font-size:12px; font-weight:500; color:var(--text3); border-bottom:.5px solid var(--sep); }
.lh-vid-ep-request { min-height:60px; display:flex; align-items:center; gap:10px; padding:8px 12px 8px 14px; box-sizing:border-box; }
.lh-vid-ep-request-ic { display:grid; flex:none; color:var(--text2); }
:is(.lh-hub,.lh-theme) .lh-vid-ep-request-ic .lh-i { width:22px; height:22px; }
.lh-vid-ep-request + .lh-vid-ep-request { border-top:.5px solid var(--sep); }
.lh-vid-ep-request-text { flex:1; min-width:0; font-size:15px; line-height:20px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; }
.lh-vid-ep-period { display:flex; align-items:center; gap:12px; margin:10px 2px 0; font-size:18px; line-height:24px; font-weight:700; color:var(--text); font-variant-numeric:tabular-nums; }
.lh-vid-ep-period::after { content:""; flex:1; height:.5px; background:var(--sep); }
.lh-vid-modal.lh-vid-rewatch { width:min(94vw,900px) !important; }
.lh-vid-rewatch .modal-content { padding:0; }
.lh-rewatch-row { display:flex; justify-content:center; padding:8px 0 0; }

.lh-vid-thumb { position:relative; width:100%; aspect-ratio:16/9; flex-shrink:0; overflow:hidden; background:linear-gradient(135deg,#3C3C42,#1F1F23); color:#fff; cursor:pointer; }
.lh-vid-thumb img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.lh-vid-thumb-play { position:absolute; left:50%; top:50%; width:26px; height:26px; transform:translate(-50%,-50%); color:#fff; display:grid; place-items:center; filter:drop-shadow(0 1px 3px rgba(0,0,0,.5)); }
.lh-vid-thumb-play svg { width:26px; height:26px; fill:currentColor; opacity:.9; }
.lh-vid-thumb-dur { position:absolute; right:6px; bottom:7px; padding:1px 6px; border-radius:5px; background:rgba(0,0,0,.55); color:#fff; font-size:11px; line-height:15px; font-weight:600; font-variant-numeric:tabular-nums; }
.lh-vid-thumb-bar { position:absolute; left:0; right:0; bottom:0; height:3px; background:rgba(255,255,255,.28); }
.lh-vid-thumb-fill { display:block; height:100%; background:#fff; }
.lh-vid-thumb.is-continue { width:138px; height:78px; aspect-ratio:auto; border-radius:10px; }
.lh-vid-thumb.is-small { width:84px; height:48px; aspect-ratio:auto; border-radius:7px; }
.lh-vid-thumb.is-small .lh-vid-thumb-play,.lh-vid-thumb.is-small .lh-vid-thumb-play svg { width:18px; height:18px; }
.lh-vid-thumb.is-small .lh-vid-thumb-dur { display:none; }

.lh-vid-item-title { font-size:13px; line-height:18px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-vid-status { font-size:12px; line-height:16px; color:var(--text3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-vid-status.is-done { color:var(--mstt); }
.lh-vid-status.is-progress,.lh-vid-status.is-playing { color:var(--lrnt); }
.lh-vid-status .lh-i,.lh-vid-status svg { width:12px; height:12px; margin-right:4px; vertical-align:-1.5px; }
.lh-vid-status svg:not(.lh-i) { fill:currentColor; }
:is(.lh-hub,.lh-theme) .lh-vid-status .lh-i { width:12px; height:12px; stroke-width:2.6; }

.lh-vid-chip { display:inline-flex; align-items:center; gap:4px; max-width:220px; padding:2px 8px; border-radius:7px; background:var(--fill); color:var(--text2); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-vid-chip-x { height:auto; padding:0 !important; background:none !important; border:0 !important; box-shadow:none !important; color:var(--tint) !important; font-size:13px; cursor:pointer; }

/* Topic view. Stacked (phone, narrow window): player, title row, playlist, then the video's extras.
   Wide desktop window: the playlist becomes a column beside the player and scrolls on its own. */
.lh-vid-topic { display:flex; flex-direction:column; gap:12px; }
.lh-vid-main { display:contents; }
.lh-vid-side { order:1; }
.lh-vid-below { order:2; }
body:not(.is-phone) .lh-vid > .lh-scroll { container:lh-vid / size; }
.lh-vid-stage { width:100%; aspect-ratio:16/9; border-radius:16px; overflow:hidden; background:#000; box-shadow:0 14px 34px rgba(0,0,0,.28); flex:none; }
.lh-vid-player { display:block; width:100%; height:100%; background:#000; }
.lh-vid-missing { height:100%; display:flex; align-items:center; justify-content:center; padding:20px; text-align:center; background:#1F1F23; color:#BDBDC5; font-size:13px; }
.lh-vid-info { display:flex; flex-direction:column; gap:8px; }
.lh-vid-info-row { display:flex; align-items:center; gap:12px; }
.lh-vid-icon-btn { width:32px; padding:0 !important; background:none !important; color:var(--tint) !important; flex:0 0 auto; }
.lh-vid-icon-btn svg { width:16px; height:16px; }
.lh-vid-info-titles { flex:1; min-width:0; }
.lh-vid-info-title { font-size:17px; line-height:24px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
/* Desktop: the title may take two lines, and in a row too narrow for title and buttons the buttons drop below it. */
body:not(.is-phone) .lh-vid-info-row { flex-wrap:wrap; }
body:not(.is-phone) .lh-vid-info-titles { flex:1 1 9em; }
.lh-vid-info-actions { display:flex; align-items:center; gap:12px; flex:none; }
body:not(.is-phone) .lh-vid-info-title { white-space:normal; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow-wrap:anywhere; }
.lh-vid-info-meta { display:flex; align-items:center; flex-wrap:wrap; gap:4px 10px; font-size:13px; line-height:18px; color:var(--text3); }
.lh-vid-sources { display:flex; flex-wrap:wrap; gap:4px 10px; font-size:13px; line-height:18px; color:var(--text3); }
.lh-vid-source { color:var(--tint); cursor:pointer; text-decoration:none; }
.lh-vid-side { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; padding:12px 8px 8px; }
.lh-vid-side-head { font-size:13px; line-height:18px; font-weight:600; color:var(--text2); padding:0 8px 6px; }
.lh-vid-side-list { display:flex; flex-direction:column; }
.lh-vid-item { display:flex; align-items:center; gap:10px; padding:8px; border-radius:10px; box-sizing:border-box; min-width:0; cursor:pointer; }
.lh-vid-item:hover { background:var(--fill2); }
.lh-vid-item.is-current { background:var(--tabon); cursor:default; }
.lh-vid-item-text { min-width:0; }
body:not(.is-phone) .lh-vid-side-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:2px 4px; }
body:not(.is-phone) .lh-vid-item.is-current .lh-vid-status { color:var(--tint); font-weight:600; }
body:not(.is-phone) .lh-vid-item-title { white-space:normal; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
@container lh-vid (min-width:880px) {
  body:not(.is-phone) .lh-vid-topic { display:grid; grid-template-columns:minmax(0,1fr) clamp(300px,30%,360px); gap:16px; align-items:start; }
  body:not(.is-phone) .lh-vid-main { display:flex; flex-direction:column; gap:12px; min-width:0; }
  body:not(.is-phone) .lh-vid-side { position:sticky; top:2px; max-height:100cqh; display:flex; flex-direction:column; box-sizing:border-box; }
  body:not(.is-phone) .lh-vid-side > .lh-vid-side-head { margin-bottom:4px; padding-bottom:8px; box-shadow:0 .5px 0 var(--sep); }
  body:not(.is-phone) .lh-vid-side-list { display:flex; flex-direction:column; gap:2px; min-height:0; overflow-y:auto; }
}

.lh-vid-modal { width:min(92vw,480px) !important; max-width:none !important; padding:0 !important; border-radius:18px !important; overflow:hidden; background:var(--card) !important; color:var(--text); border:0 !important; }
.lh-vid-modal.lh-vid-settings { width:min(94vw,580px) !important; }
.lh-vid-modal.lh-vid-new { width:min(94vw,520px) !important; }
.lh-vid-modal.lh-vid-recall-new { width:min(92vw,440px) !important; }
.lh-vid-field { display:flex; flex-direction:column; gap:6px; min-width:0; }
.lh-vid-field-two { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.lh-vid-label { font-size:13px; line-height:18px; font-weight:500; color:var(--text); }
.lh-vid-optional { margin-left:6px; font-size:12px; font-weight:400; color:var(--text3); }
.lh-vid-modal .modal-content { display:flex; flex-direction:column; gap:16px; padding:24px; }
.lh-vid-modal-title { font-size:19px; line-height:26px; font-weight:600; color:var(--text); }
.lh-vid-modal-desc { font-size:13px; line-height:18px; color:var(--text2); }
.lh-vid-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:2px; }
.lh-vid-input { width:100%; box-sizing:border-box; padding:10px 12px !important; border-radius:10px !important; border:0 !important; background:var(--fill) !important; color:var(--text); font-family:inherit; font-size:15px; resize:none; box-shadow:none !important; }
.lh-vid-input:focus { box-shadow:0 0 0 2px var(--tint) !important; }
.lh-vid-input::placeholder,.lh-vid-prompt::placeholder { color:var(--text3); opacity:1; }
.lh-vid-select { height:38px; max-width:100%; padding:0 12px; border-radius:10px; border:0 !important; background:var(--raised) !important; color:var(--text); font-size:15px; box-shadow:var(--rshadow) !important; }
select.lh-vid-select { padding-right:30px; background:var(--raised) var(--chev) no-repeat right 10px center / 12px !important; -webkit-appearance:none; appearance:none; cursor:pointer; }
.lh-vid-select:hover { background-color:var(--raisedh) !important; }
.lh-vid-select:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
.lh-vid-drop { display:flex; flex-wrap:wrap; align-items:center; gap:6px; min-height:34px; padding:6px 10px; border-radius:10px; border:1px dashed var(--sep); }
.lh-vid-drop.is-over { border-color:var(--tint); background:var(--fill2); }
.lh-vid-drop.is-hidden { display:none; }
.lh-vid-drop-hint { font-size:12px; color:var(--text3); }

.lh-vid-set-form { display:flex; flex-direction:column; gap:10px; max-height:60vh; overflow-y:auto; }
.lh-vid-set-label { display:flex; align-items:baseline; gap:8px; font-size:13px; font-weight:500; color:var(--text); white-space:nowrap; }
.lh-vid-set-hint { font-size:13px; font-weight:400; color:var(--text2); }
.lh-vid-lens { display:inline-flex; padding:2px; border-radius:9px; background:var(--fill); }
.lh-vid-len { height:28px; padding:0 12px !important; border-radius:7px !important; border:0 !important; background:transparent !important; color:var(--text2) !important; box-shadow:none !important; font-size:13px; font-weight:500; cursor:pointer; }
.lh-vid-len.is-on { background:var(--segon) !important; color:var(--segtx) !important; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.14) !important; }
.lh-vid-modal .lh-vid-lens { display:flex; }
.lh-vid-modal .lh-vid-len { flex:1; }
.lh-vid-set-row { display:flex; align-items:center; gap:12px; }
.lh-vid-set-row > .lh-vid-set-label { width:96px; flex-shrink:0; }
.lh-vid-set-note { margin:-4px 0 0 108px; font-size:12px; line-height:16px; color:var(--text2); }
body.is-phone .lh-vid-set-note { margin-left:0; }
.lh-vid-check { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text); cursor:pointer; }
.lh-vid-modal { --checkbox-color:var(--btn); --checkbox-color-hover:var(--btnh); --checkbox-marker-color:var(--onbtn); }

body.is-phone .lh-vid { overflow:visible; flex:none; }
body.is-phone .lh-vid-continue { padding:8px 10px; gap:12px; }
body.is-phone .lh-vid-thumb.is-continue { width:62px; height:40px; border-radius:8px; }
body.is-phone .lh-vid-thumb.is-continue .lh-vid-thumb-play,body.is-phone .lh-vid-thumb.is-small .lh-vid-thumb-play { display:none; }
body.is-phone .lh-vid-thumb.is-continue .lh-vid-thumb-dur,body.is-phone .lh-vid-thumb.is-small .lh-vid-thumb-dur { display:block; inset:0; margin:auto; width:max-content; height:max-content; background:none; font-size:12px; }
body.is-phone .lh-vid-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
body.is-phone .lh-vid-filters { flex-wrap:wrap; }
body.is-phone .lh-vid-filters .lh-sf { flex:1 1 100%; width:auto !important; }
body.is-phone .lh-vid-info-row { flex-direction:column; align-items:stretch; }
body.is-phone .lh-vid-info-title { font-size:22px; line-height:29px; white-space:normal; }
body.is-phone .lh-vid-side { background:none; box-shadow:none; padding:0; }
body.is-phone .lh-vid-side-head { padding:2px 2px 6px; font-size:15px; line-height:20px; }
body.is-phone .lh-vid-side-list { flex-direction:column; gap:0; overflow:visible; background:var(--card); box-shadow:var(--cshadow); border-radius:16px; }
body.is-phone .lh-vid-item { flex:none; min-height:58px; padding:8px 14px; border-radius:0; position:relative; }
body.is-phone .lh-vid-item + .lh-vid-item::before { content:""; position:absolute; left:14px; right:0; top:0; height:.5px; background:var(--sep); }
body.is-phone .lh-vid-thumb.is-small { width:62px; height:40px; border-radius:8px; }
body.is-phone .lh-vid-item-title { font-size:16px; line-height:22px; font-weight:500; }
body.is-phone .lh-vid-item-text .lh-vid-status { font-size:13px; line-height:18px; }
body.is-phone .lh-vid-ep-setting { justify-content:space-between; }
body.is-phone .lh-vid-ep-setting .lh-vid-lens { order:3; flex:1 1 100%; display:flex; }
body.is-phone .lh-vid-ep-setting .lh-vid-len { flex:1; height:32px; }
body.is-phone .lh-vid-ep-setting { font-size:15px; }
body.is-phone .lh-vid-ep-requests-head { display:none; }
body.is-phone .lh-vid-ep-request { flex-wrap:wrap; padding:12px 8px 8px 14px; }
body.is-phone .lh-vid-ep-request-text { flex:1 1 100%; font-size:15px; }
body.is-phone .lh-vid-ep-request .lh-vid-btn { height:44px; background:none !important; font-size:15px; font-weight:500; padding:0 16px 0 0 !important; color:var(--tint) !important; }
body.is-phone .lh-vid-ep-request .lh-vid-btn-danger-text { color:var(--text2) !important; }
body.is-phone .lh-vid-ep-period { font-size:16px; line-height:22px; }
body.is-phone .lh-vid-ep-request-ic { display:none; }
body.is-phone .lh-vid-ep-request .lh-vid-btn .lh-i { display:none; }
body.is-phone .lh-vid-picker-grid { grid-template-columns:minmax(0,1fr); }
body.is-phone .lh-vid-tcard-photo { width:88px; }
body.is-phone .lh-vid-set-row { flex-wrap:wrap; }
body.is-phone .lh-vid-modal.lh-vid-recall-new { position:fixed; left:0; right:0; bottom:0; width:100% !important; border-radius:24px 24px 0 0 !important; box-shadow:0 -10px 40px rgba(0,0,0,.25); }
body.is-phone .lh-vid-recall-new .modal-content { padding:18px 18px calc(env(safe-area-inset-bottom,0px) + 28px); }
body.is-phone .lh-vid-recall-new .lh-vid-modal-actions { flex-direction:column-reverse; }
body.is-phone .lh-vid-recall-new .lh-vid-btn { width:100%; height:52px; border-radius:14px !important; font-size:17px; }
body.is-phone .lh-vid-recall-new .lh-vid-select { height:46px; font-size:17px; }
body.is-phone .lh-vid-recall-new .lh-vid-label { font-size:15px; line-height:20px; }
`;
