"use strict";
// Styles for the Video Academy tab and its pop-ups. Light mode uses the soft-violet palette
// (#6D5BD0 / hover #5B48B8, ADR-09); dark mode keeps the plugin's existing indigo accents.
// Buttons carry !important because Obsidian's own button rules out-rank plain class selectors.

module.exports = `
.lh-vid { flex:1; display:flex; flex-direction:column; min-height:0; overflow:hidden; }
.lh-vid-head { display:flex; align-items:center; gap:8px; padding:12px 18px 8px; }
.lh-vid-head-left { flex:1; display:flex; align-items:center; gap:8px; min-width:0; }
.lh-vid-head-title { font-size:16px; font-weight:800; color:var(--text-normal); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lh-vid-body { flex:1; overflow-y:auto; padding:4px 18px 18px; }
.lh-vid-spacer { flex:1; }

.lh-vid-btn { height:32px; padding:0 14px !important; border-radius:9px !important; border:1px solid var(--background-modifier-border) !important; background:var(--background-primary) !important; color:var(--text-normal) !important; font-size:12.5px; font-weight:600; cursor:pointer; box-shadow:none !important; white-space:nowrap; }
.lh-vid-btn:hover { border-color:#6D5BD0 !important; color:#5B48B8 !important; }
.lh-vid-btn-primary { background:#6D5BD0 !important; border-color:#6D5BD0 !important; color:#ffffff !important; }
.lh-vid-btn-primary:hover { background:#5B48B8 !important; border-color:#5B48B8 !important; color:#ffffff !important; }
.lh-vid-btn-danger, .lh-vid-btn-danger:hover { background:#ef4444 !important; border-color:#ef4444 !important; color:#ffffff !important; }
.lh-vid-btn:disabled { opacity:.5; cursor:not-allowed; }
.lh-vid-btn.is-done { background:#f0fdf4 !important; border-color:#86efac !important; color:#15803d !important; }
.lh-vid-back { height:auto; padding:4px 6px !important; background:none !important; border:none !important; box-shadow:none !important; color:#5B48B8 !important; font-size:12.5px; font-weight:700; cursor:pointer; white-space:nowrap; }
.lh-vid-btn-danger-text { color:#b91c1c !important; }
.lh-vid-btn-danger-text:hover { border-color:#ef4444 !important; color:#b91c1c !important; }

.lh-vid-empty { padding:64px 20px; text-align:center; }
.lh-vid-empty-title { font-size:15px; font-weight:700; color:var(--text-normal); }
.lh-vid-empty-body { font-size:13px; line-height:1.6; color:var(--text-muted); max-width:440px; margin:8px auto 0; }

.lh-vid-continue { display:flex; align-items:center; gap:14px; padding:10px; margin-bottom:12px; border-radius:14px; background:#F0EDFC; }
.lh-vid-continue-info { flex:1; display:flex; flex-direction:column; gap:3px; min-width:0; }
.lh-vid-kicker { font-size:11px; font-weight:800; letter-spacing:.04em; color:#5B48B8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lh-vid-continue-title { font-size:15px; font-weight:800; line-height:1.35; color:var(--text-normal); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.lh-vid-filters { display:flex; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
.lh-vid-chips { display:flex; flex-wrap:wrap; gap:6px; }
.lh-vid-chip-btn { height:30px; padding:0 12px !important; border-radius:99px !important; border:1px solid var(--background-modifier-border) !important; background:var(--background-primary) !important; color:var(--text-muted) !important; font-size:12.5px; box-shadow:none !important; cursor:pointer; }
.lh-vid-chip-btn:hover { border-color:#6D5BD0 !important; }
.lh-vid-chip-btn:focus-visible, .lh-vid-scard:focus-visible { outline:2px solid #6D5BD0; outline-offset:2px; }
.lh-vid-chip-btn.is-on { border-color:#6D5BD0 !important; background:#F0EDFC !important; color:#5B48B8 !important; font-weight:700; }
.lh-vid-select.lh-vid-tag-select { height:30px; border-radius:99px; padding:0 10px; font-size:12.5px; }
.lh-vid-select.lh-vid-tag-select.is-on { border-color:#6D5BD0 !important; background:#F0EDFC !important; color:#5B48B8 !important; font-weight:700; }
.lh-vid-search { height:30px; width:200px; max-width:100%; padding:0 12px; border-radius:99px; border:1px solid var(--background-modifier-border); background:var(--background-primary); color:var(--text-normal); font-size:12.5px; }

.lh-vid-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(190px, 1fr)); gap:14px; }
.lh-vid-scard { display:flex !important; flex-direction:column; align-items:stretch; gap:6px; height:auto !important; padding:8px !important; text-align:left; white-space:normal; border-radius:14px !important; border:1px solid var(--background-modifier-border) !important; background:var(--background-primary) !important; color:var(--text-normal) !important; box-shadow:none !important; cursor:pointer; transition:border-color .15s, background .6s; }
.lh-vid-scard:hover { border-color:#6D5BD0 !important; }
.lh-vid-scard.is-new { background:#F0EDFC !important; }
.lh-vid-scard.is-pending { border:1.5px dashed #e0b567 !important; }
.lh-vid-scard-cover { display:block; position:relative; aspect-ratio:16/9; border-radius:10px; overflow:hidden; background:#2b2560; }
.lh-vid-scard-cover img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.lh-vid-scard-cover.is-pending { display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding:10px; box-sizing:border-box; background:#fff7e6; }
.lh-vid-scard-goal { font-size:12px; line-height:1.5; color:#6b4e16; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.lh-vid-scard-title { font-size:13.5px; font-weight:800; line-height:1.4; color:var(--text-normal); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.lh-vid-scard-meta { display:block; font-size:11.5px; color:var(--text-muted); }
.lh-vid-style-pick { display:flex; align-items:center; gap:6px; margin-left:6px; flex-shrink:0; font-size:12px; color:var(--text-muted); }

.lh-vid-thumb { position:relative; width:100%; aspect-ratio:16/9; flex-shrink:0; border-radius:10px; overflow:hidden; background:#2b2560; cursor:pointer; }
.lh-vid-thumb[data-style="fast"] { background:#3a2a12; }
.lh-vid-thumb[data-style="system"] { background:#15334a; }
.lh-vid-thumb[data-style="visual"] { background:#1b2440; }
.lh-vid-thumb img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.lh-vid-thumb-play { position:absolute; left:50%; top:50%; width:38px; height:38px; transform:translate(-50%,-50%); border-radius:50%; background:rgba(255,255,255,.88); color:#1e1b4b; display:flex; align-items:center; justify-content:center; font-size:13px; padding-left:3px; box-sizing:border-box; transition:transform .15s; }
.lh-vid-thumb:hover .lh-vid-thumb-play { transform:translate(-50%,-50%) scale(1.08); }
.lh-vid-thumb-dur { position:absolute; right:6px; bottom:8px; padding:1px 6px; border-radius:5px; background:rgba(0,0,0,.65); color:#ffffff; font-size:10.5px; }
.lh-vid-thumb-bar { position:absolute; left:0; right:0; bottom:0; height:3px; background:rgba(0,0,0,.35); }
.lh-vid-thumb-fill { display:block; height:100%; background:#8b7fe0; }
.lh-vid-thumb.is-continue { width:176px; }
.lh-vid-thumb.is-small { width:112px; border-radius:8px; }
.lh-vid-thumb.is-small .lh-vid-thumb-play { width:24px; height:24px; font-size:9px; padding-left:2px; }

.lh-vid-item-title { font-size:12.5px; font-weight:650; line-height:1.4; color:var(--text-normal); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.lh-vid-status { font-size:11px; color:var(--text-muted); }
.lh-vid-status.is-done { color:#16a34a; }
.lh-vid-status.is-progress { color:#5B48B8; }

.lh-vid-badge-pending { font-size:11px; font-weight:700; padding:1px 8px; border-radius:99px; background:#fff8e6; border:1px solid #f3d58a; color:#a16207; }
.lh-vid-chip { display:inline-flex; align-items:center; gap:4px; max-width:220px; padding:2px 8px; border-radius:7px; background:#F0EDFC; color:#5B48B8; font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-vid-chip-x { height:auto; padding:0 !important; background:none !important; border:none !important; box-shadow:none !important; color:#8b7fe0 !important; font-size:13px; cursor:pointer; }

.lh-vid-topic { display:flex; gap:16px; align-items:flex-start; }
.lh-vid-main { flex:1.7; min-width:0; display:flex; flex-direction:column; gap:10px; }
.lh-vid-stage { width:100%; aspect-ratio:16/9; border-radius:12px; overflow:hidden; background:#000000; }
.lh-vid-player { display:block; width:100%; height:100%; background:#000000; }
.lh-vid-missing { height:100%; display:flex; align-items:center; justify-content:center; padding:20px; text-align:center; background:#1e1b4b; color:#cbd5e1; font-size:13px; }
.lh-vid-info { display:flex; flex-direction:column; gap:8px; }
.lh-vid-info-row { display:flex; align-items:flex-start; gap:12px; }
.lh-vid-icon-btn { width:32px; padding:0 !important; display:inline-flex; align-items:center; justify-content:center; flex:0 0 auto; }
.lh-vid-icon-btn svg { width:16px; height:16px; }
.lh-vid-info-titles { flex:1; min-width:0; }
.lh-vid-info-title { font-size:16px; font-weight:800; line-height:1.4; color:var(--text-normal); }
.lh-vid-info-meta { font-size:12px; color:var(--text-muted); margin-top:2px; }
.lh-vid-sources { display:flex; flex-wrap:wrap; gap:4px 10px; font-size:12px; color:var(--text-muted); }
.lh-vid-source { color:#5B48B8; cursor:pointer; }
.lh-vid-side { flex:1; min-width:220px; max-width:300px; display:flex; flex-direction:column; gap:6px; }
.lh-vid-side-head { font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:2px; }
.lh-vid-item { display:flex; align-items:center; gap:10px; padding:6px; border-radius:10px; border:1px solid transparent; cursor:pointer; }
.lh-vid-item:hover { background:var(--background-secondary); }
.lh-vid-item.is-current { background:#F0EDFC; border-color:#D9D2F5; cursor:default; }
.lh-vid-item-text { min-width:0; }

.lh-vid-modal { width:min(92vw,480px) !important; max-width:none !important; padding:0 !important; border-radius:16px !important; overflow:hidden; }
.lh-vid-modal.lh-vid-settings { width:min(94vw,580px) !important; }
.lh-vid-modal.lh-vid-new { width:min(94vw,520px) !important; }
.lh-vid-field { display:flex; flex-direction:column; gap:6px; }
.lh-vid-label { font-size:13px; font-weight:700; color:var(--text-normal); }
.lh-vid-optional { margin-left:6px; font-size:11.5px; font-weight:400; color:var(--text-muted); }
.lh-vid-modal .modal-content { display:flex; flex-direction:column; gap:12px; padding:22px 24px; }
.lh-vid-modal-title { font-size:17px; font-weight:800; color:var(--text-normal); }
.lh-vid-modal-desc { font-size:12.5px; line-height:1.6; color:var(--text-muted); }
.lh-vid-modal-actions { display:flex; justify-content:flex-end; gap:8px; padding-top:6px; }
.lh-vid-input { width:100%; box-sizing:border-box; padding:10px 12px !important; border-radius:12px !important; border:1.5px solid #6D5BD0 !important; background:var(--background-primary) !important; color:var(--text-normal); font-family:inherit; font-size:14.5px; resize:none; }
.lh-vid-input:focus { box-shadow:0 0 0 4px rgba(109,91,208,.16) !important; }
.lh-vid-select { height:34px; max-width:100%; padding:0 8px; border-radius:9px; border:1px solid var(--background-modifier-border); background:var(--background-primary); color:var(--text-normal); font-size:13px; }
.lh-vid-drop { display:flex; flex-wrap:wrap; align-items:center; gap:6px; min-height:34px; padding:6px 10px; border-radius:10px; border:1.5px dashed var(--background-modifier-border); }
.lh-vid-drop.is-over { border-color:#6D5BD0; background:#F7F5FE; }
.lh-vid-drop.is-hidden { display:none; }
.lh-vid-drop-hint { font-size:12px; color:var(--text-faint); }

.lh-vid-set-form { display:flex; flex-direction:column; gap:10px; max-height:60vh; overflow-y:auto; }
.lh-vid-set-label { display:flex; align-items:baseline; gap:8px; font-size:13px; font-weight:700; color:var(--text-normal); }
.lh-vid-set-hint { font-size:11.5px; font-weight:400; color:var(--text-muted); }
.lh-vid-modes { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px; }
.lh-vid-mode { display:flex !important; flex-direction:column; align-items:flex-start; gap:4px; height:auto !important; padding:10px 12px !important; text-align:left; white-space:normal; border-radius:12px !important; border:1.5px solid var(--background-modifier-border) !important; background:var(--background-primary) !important; color:var(--text-normal) !important; box-shadow:none !important; cursor:pointer; }
.lh-vid-mode.is-on { border-color:#6D5BD0 !important; background:#F0EDFC !important; }
.lh-vid-mode.is-locked { opacity:.55; cursor:not-allowed; }
.lh-vid-mode-top { display:flex; align-items:center; gap:6px; }
.lh-vid-mode-name { font-size:13.5px; font-weight:700; }
.lh-vid-mode-desc { font-size:11.5px; line-height:1.5; color:var(--text-muted); }
.lh-vid-pro { padding:1px 6px; border-radius:99px; background:#fbbf24; color:#1c1d2b; font-size:9.5px; font-weight:800; }
.lh-vid-lens { display:flex; gap:8px; }
.lh-vid-len { min-width:88px; padding:0 14px !important; height:34px; border-radius:9px !important; border:1.5px solid var(--background-modifier-border) !important; background:var(--background-primary) !important; color:var(--text-normal) !important; box-shadow:none !important; font-weight:700; cursor:pointer; }
.lh-vid-len.is-on { background:#6D5BD0 !important; border-color:#6D5BD0 !important; color:#ffffff !important; }
.lh-vid-set-row { display:flex; align-items:center; gap:12px; }
.lh-vid-set-row > .lh-vid-set-label { width:96px; flex-shrink:0; }
.lh-vid-check { display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--text-muted); cursor:pointer; }

body.is-phone .lh-vid-topic { flex-direction:column; }
body.is-phone .lh-vid-side { max-width:none; width:100%; }
body.is-phone .lh-vid-continue { flex-wrap:wrap; }
body.is-phone .lh-vid-thumb.is-continue { width:100%; }
body.is-phone .lh-vid-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; }
body.is-phone .lh-vid-head-left { flex-wrap:wrap; }

.theme-dark .lh-vid-btn:hover { border-color:#818cf8 !important; color:#c7d2fe !important; }
.theme-dark .lh-vid-btn-primary, .theme-dark .lh-vid-len.is-on { background:#6366f1 !important; border-color:#6366f1 !important; color:#ffffff !important; }
.theme-dark .lh-vid-btn-primary:hover { background:#818cf8 !important; border-color:#818cf8 !important; color:#ffffff !important; }
.theme-dark .lh-vid-btn.is-done { background:rgba(34,197,94,.14) !important; border-color:rgba(74,222,128,.42) !important; color:#86efac !important; }
.theme-dark .lh-vid-back, .theme-dark .lh-vid-kicker, .theme-dark .lh-vid-source, .theme-dark .lh-vid-status.is-progress { color:#a5b4fc !important; }
.theme-dark .lh-vid-btn-danger-text, .theme-dark .lh-vid-btn-danger-text:hover { color:#f87171 !important; }
.theme-dark .lh-vid-status.is-done { color:#4ade80; }
.theme-dark .lh-vid-continue { background:rgba(99,102,241,.12); }
.theme-dark .lh-vid-scard.is-new { background:rgba(99,102,241,.12) !important; }
.theme-dark .lh-vid-scard:hover { border-color:#818cf8 !important; }
.theme-dark .lh-vid-chip-btn:hover { border-color:#818cf8 !important; }
.theme-dark .lh-vid-chip-btn:focus-visible, .theme-dark .lh-vid-scard:focus-visible { outline-color:#818cf8; }
.theme-dark .lh-vid-select.lh-vid-tag-select.is-on { border-color:#818cf8 !important; background:rgba(99,102,241,.16) !important; color:#c7d2fe !important; }
.theme-dark .lh-vid-chip-btn.is-on { border-color:#818cf8 !important; background:rgba(99,102,241,.16) !important; color:#c7d2fe !important; }
.theme-dark .lh-vid-scard.is-pending { border-color:rgba(245,158,11,.45) !important; }
.theme-dark .lh-vid-scard-cover.is-pending { background:rgba(245,158,11,.08); }
.theme-dark .lh-vid-scard-goal { color:#fcd34d; }
.theme-dark .lh-vid-item.is-current, .theme-dark .lh-vid-mode.is-on { background:rgba(99,102,241,.16) !important; border-color:#818cf8 !important; }
.theme-dark .lh-vid-chip { background:rgba(99,102,241,.2); color:#c7d2fe; }
.theme-dark .lh-vid-input { border-color:#6366f1 !important; }
.theme-dark .lh-vid-drop.is-over { border-color:#818cf8; background:rgba(99,102,241,.1); }
.theme-dark .lh-vid-badge-pending { background:rgba(245,158,11,.12); border-color:rgba(245,158,11,.4); color:#fbbf24; }
`;
