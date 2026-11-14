"use strict";

module.exports = `
.modal.eq-pro-modal { width:min(1080px,94vw); max-width:1080px; padding:0; overflow:hidden; border-radius:22px; }
.eq-pro-modal .modal-content { margin:0; padding:0; overflow:auto; max-height:88vh; }
.eq-pro-modal .modal-close-button { z-index:2; }
.eq-pro-layout { display:grid; grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr); color:var(--text-normal); }
.eq-pro-art { position:relative; background:#f6f0e7; color:#342c52; display:flex; flex-direction:column; justify-content:center; overflow:hidden; }
.eq-pro-brand { position:absolute; top:24px; left:24px; right:16px; z-index:1; display:flex; gap:10px; align-items:center; font-size:20px; font-weight:700; text-shadow:0 1px 12px #fff; }
.eq-pro-brand>span:first-child { color:#6d5bd0; font-size:28px; }
.eq-pro-notebook { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center; }
.eq-pro-notebook-dark { display:none; }
.eq-pro-notebook[hidden] { display:none !important; }
.eq-pro-art-caption { position:absolute; bottom:0; left:0; right:0; margin:0; padding:38px 24px 22px; background:linear-gradient(transparent,#f6f0e7); font-size:13px; line-height:1.6; }
.eq-pro-art-missing { min-height:400px; }
.eq-pro-body { padding:28px 30px 22px; background:var(--background-primary); min-width:0; }
.eq-pro-heading { margin:0 24px 8px 0; font-size:clamp(23px,2.4vw,29px); line-height:1.25; letter-spacing:-.5px; }
.eq-pro-subtitle { color:var(--text-muted); font-size:14px; line-height:1.5; margin:0 0 10px; }
.eq-pro-features { display:flex; flex-direction:column; gap:2px; }
.eq-pro-feature-toggle { width:100%; height:auto; display:flex; gap:12px; text-align:left; padding:5px 8px !important; border:none !important; box-shadow:none !important; background:transparent !important; color:var(--text-normal) !important; border-radius:12px; }
.eq-pro-feature-toggle:hover { background:var(--background-secondary) !important; }
.eq-pro-feature-toggle:focus-visible { outline:2px solid var(--interactive-accent); outline-offset:2px; }
.eq-pro-thumb { flex-shrink:0; width:68px; height:50px; border-radius:12px; background:#f0edf9; border:1px solid #e2dcf3; display:flex; align-items:center; justify-content:center; gap:8px; }
.eq-pro-thumb-icon { color:#7861ca; font-size:25px; }
.eq-pro-mini { display:flex; flex-direction:column; gap:5px; }
.eq-pro-mini>span { width:27px; height:10px; border-radius:3px; background:#fff; border:1px solid #d4caed; box-shadow:0 2px 3px #7861ca12; }
.eq-pro-thumb-anchors .eq-pro-mini>span::after { content:'✓'; color:#4d9573; font-size:8px; display:block; text-align:right; padding-right:2px; line-height:8px; }
.eq-pro-thumb-explain .eq-pro-mini>span { margin-left:3px; border-left:3px solid #a591d7; }
.eq-pro-thumb-time .eq-pro-mini>span { font-size:8px; text-align:center; line-height:9px; }
.eq-pro-thumb-video { background:#edf3f6; }
.eq-pro-thumb-video .eq-pro-mini>span { height:12px; background:linear-gradient(135deg,#e5dfab,#a7c6c0); border:2px dotted #b4a6d5; }
.eq-pro-feature-copy { display:flex; flex-direction:column; justify-content:center; gap:3px; flex:1; min-width:0; }
.eq-pro-feature-title { font-size:16px; font-weight:700; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.eq-pro-feature-desc { font-size:12px; color:var(--text-muted); line-height:1.45; white-space:normal; }
.eq-pro-expand { align-self:center; font-size:18px; color:var(--text-faint); }
.eq-pro-detail { margin:0 8px 8px 88px; font-size:12px; line-height:1.8; color:var(--text-muted); }
.eq-pro-detail[hidden] { display:none; }
.eq-pro-price { margin-top:10px; padding:12px 16px; border-radius:15px; background:#f0edf9; color:#3f345f; }
.eq-pro-price-top { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:4px; }
.eq-pro-price-top strong { font-size:28px; letter-spacing:-1px; line-height:1.2; }
.eq-pro-buyout { padding:5px 13px; background:#e0d8f5; border-radius:24px; font-size:13px; font-weight:700; color:#6250aa; }
.eq-pro-price p { margin:3px 0 0; font-size:12px; line-height:1.45; }
.eq-pro-tax { font-size:11px; color:var(--text-muted); line-height:1.45; margin:6px 0; }
.eq-pro-actions { display:flex; gap:10px; margin-top:8px; }
.eq-pro-actions button { height:auto; padding:11px 14px; border-radius:10px; flex:1; white-space:normal; font-size:13px; }
.eq-pro-sandbox { font-size:11px; line-height:1.45; color:var(--text-muted); margin:6px 0 0; }
button.eq-pro-entry { height:28px; padding:3px 10px; font-size:12px; border-radius:8px; background:transparent !important; color:var(--text-muted) !important; border:1px solid var(--background-modifier-border); box-shadow:none; }
button.eq-pro-entry:hover { color:var(--text-normal) !important; background:var(--background-secondary) !important; }
.eq-pro-key { margin-top:12px; padding:14px 16px; border-radius:14px; border:1px solid var(--background-modifier-border); background:var(--background-secondary); display:flex; flex-direction:column; gap:8px; }
.eq-pro-key[hidden],.eq-pro-key-hint[hidden] { display:none !important; }
.eq-pro-key.is-next { border-color:var(--interactive-accent); box-shadow:0 0 0 3px color-mix(in srgb,var(--interactive-accent) 20%,transparent); }
.eq-pro-key-title { margin:0; font-size:15px; font-weight:700; line-height:1.4; color:var(--text-normal); }
.eq-pro-em { color:#c0362c; font-weight:700; }
.eq-pro-key-hint { margin:10px 0 0; font-size:13px; line-height:1.6; color:var(--text-muted); text-align:center; }
.eq-pro-key-desc { margin:0; font-size:13px; line-height:1.6; color:var(--text-normal); }
.eq-pro-key-row { display:flex; gap:8px; flex-wrap:wrap; }
.eq-pro-key-row input { flex:1 1 180px; min-width:0; height:38px; }
.eq-pro-key-row button { height:38px; padding:0 16px; border-radius:10px; }
.eq-pro-key-status { margin:0; font-size:13px; color:var(--text-muted); }
.eq-pro-key-status.is-error { color:#b42318; font-weight:600; }
button.eq-pro-key-open { display:inline; margin:0 0 0 6px; height:auto; padding:0; border:0 !important; background:transparent !important; box-shadow:none !important; color:var(--text-accent) !important; font-size:13px; text-decoration:underline; cursor:pointer; }
button.eq-pro-key-recover { align-self:flex-start; height:auto; padding:0; border:0 !important; background:transparent !important; box-shadow:none !important; color:var(--text-accent) !important; font-size:13px; text-decoration:underline; cursor:pointer; }
.theme-dark .eq-pro-em,.theme-dark .eq-pro-key-status.is-error { color:#ff8a80; }
.eq-license-status.is-pro { display:inline-flex; align-items:center; gap:8px; padding:6px 14px 6px 8px; border-radius:999px; background:linear-gradient(135deg,#efe9fd,#f8efe2); color:#4a3d86; font-weight:700; }
.eq-license-status.is-pro::before { content:"✦"; display:inline-grid; place-items:center; width:24px; height:24px; border-radius:50%; background:linear-gradient(135deg,#8b74e0,#d9a55a); color:#fff; font-size:13px; }
.modal.eq-pro-welcome-modal { width:min(520px,94vw); padding:0; overflow:hidden; border-radius:22px; }
.eq-pro-welcome-modal .modal-content { margin:0; padding:0; max-height:88vh; overflow:auto; }
.eq-pro-welcome-head { padding:32px 28px 22px; text-align:center; background:linear-gradient(135deg,#efe9fd,#f8efe2); color:#342c52; }
.eq-pro-welcome-star { display:inline-grid; place-items:center; width:58px; height:58px; border-radius:50%; background:linear-gradient(135deg,#8b74e0,#d9a55a); color:#fff; font-size:28px; box-shadow:0 6px 18px rgba(109,91,208,.3); animation:eq-pro-pop .5s ease-out; }
.eq-pro-welcome-head h2 { margin:14px 0 6px; font-size:23px; line-height:1.3; }
.eq-pro-welcome-head p { margin:0; font-size:14px; line-height:1.6; color:#5b5078; }
.eq-pro-welcome-list { list-style:none; margin:0; padding:20px 24px 4px; display:flex; flex-direction:column; gap:14px; }
.eq-pro-welcome-list li { display:flex; gap:12px; }
.eq-pro-welcome-icon { flex:none; width:36px; height:36px; border-radius:10px; display:grid; place-items:center; background:#f0edf9; color:#7861ca; font-size:18px; }
.eq-pro-welcome-list strong { font-size:15px; }
.eq-pro-welcome-list p { margin:2px 0 0; font-size:13px; line-height:1.55; color:var(--text-muted); }
.eq-pro-welcome-list p.eq-pro-welcome-start { color:var(--text-normal); }
button.eq-pro-welcome-go { display:block; width:calc(100% - 48px); margin:14px 24px 24px; height:44px; border-radius:12px; font-size:15px; }
@keyframes eq-pro-pop { from { transform:scale(.6); opacity:0; } to { transform:scale(1); opacity:1; } }
@media (prefers-reduced-motion:reduce) { .eq-pro-welcome-star { animation:none; } }
.theme-dark .eq-license-status.is-pro { background:linear-gradient(135deg,#2f2945,#3a2f26); color:#e3d9ff; }
.theme-dark .eq-pro-welcome-head { background:linear-gradient(135deg,#2f2945,#3a2f26); color:#ece4ff; }
.theme-dark .eq-pro-welcome-head p { color:#cfc4ea; }
.theme-dark .eq-pro-welcome-icon { background:#302b41; color:#b9a7ef; }
.theme-dark .eq-pro-art { background:#262335; }
.theme-dark .eq-pro-notebook-light { display:none; }
.theme-dark .eq-pro-notebook-dark { display:block; }
.theme-dark .eq-pro-brand { color:#ece4ff; text-shadow:0 2px 12px #282034; }
.theme-dark .eq-pro-art-caption { color:#ece4ff; background:linear-gradient(transparent,#262335); }
.theme-dark .eq-pro-thumb { background:#302b41; border-color:#49405e; }
.theme-dark .eq-pro-thumb-icon { color:#b9a7ef; }
.theme-dark .eq-pro-mini>span { background:#443b58; border-color:#695985; }
.theme-dark .eq-pro-thumb-video { background:#29383d; }
.theme-dark .eq-pro-price { background:#302b41; color:#ece4ff; }
.theme-dark .eq-pro-buyout { background:#49405e; color:#ded3ff; }
@media(max-width:700px) {
 .eq-pro-layout { grid-template-columns:1fr; }
 .eq-pro-art { height:180px; }
 .eq-pro-notebook { position:static; height:180px; object-fit:cover; object-position:center 32%; }
 .eq-pro-brand { top:16px; left:20px; font-size:18px; }
 .eq-pro-art-caption { padding:30px 20px 12px; font-size:11px; }
 .eq-pro-body { padding:22px 20px; }
 .eq-pro-thumb { width:60px; height:48px; gap:5px; }
 .eq-pro-thumb-icon { font-size:25px; }
 .eq-pro-mini>span { width:22px; }
 .eq-pro-detail { margin-left:80px; }
 .eq-pro-heading { font-size:24px; }
}
@media(max-width:380px) { .eq-pro-actions { flex-direction:column; } .eq-pro-body { padding:20px 14px; } }
`;
