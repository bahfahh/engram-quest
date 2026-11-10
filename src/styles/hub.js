"use strict";
// Hub design system: tokens, the window shell (sidebar, rail, phone tabs) and shared components.
// Spec: doc/開發計劃/Hub介面改版/spec-design.md. Page-specific rules live in hub-*.js next to this file.
// Colour rule: large areas stay neutral, each data colour keeps one meaning.

const tokens = `
.lh-hub,.lh-theme,.lh-vid-modal {
  --base:#F5F5F7; --card:#FFFFFF; --text:#1D1D1F; --text2:#55555C; --text3:#6A6A72;
  --fill:rgba(60,60,67,.08); --fill2:rgba(60,60,67,.05); --sep:rgba(60,60,67,.12);
  --glass:rgba(250,250,252,.66); --edge:rgba(255,255,255,.75);
  --btn:#0071E3; --onbtn:#FFFFFF; --tint:#0066CC; --bar:#0071E3;
  --trk:rgba(120,120,128,.16); --tabon:rgba(120,120,128,.14); --segon:#FFFFFF;
  --cshadow:0 0 0 .5px rgba(0,0,0,.05),0 1px 2px rgba(0,0,0,.04),0 6px 18px rgba(0,0,0,.05);
  --float:inset 0 1px 0 rgba(255,255,255,.7),0 0 0 .5px rgba(0,0,0,.08),0 10px 30px rgba(0,0,0,.12);
  --mst:#4FC7AE; --due:#4F7CF0; --lrn:#6CBBF2; --new:#F0785E; --uns:#D4D4DA;
  --mstt:#0E7A67; --duet:#2C60DA; --lrnt:#1672B5; --newt:#C0412B;
  --locked:grayscale(1) opacity(.42);
  --interactive-normal:transparent; --interactive-hover:var(--fill2); --input-shadow:none; --input-shadow-hover:none;
}
.lh-hub.lh-dark,.lh-theme.lh-dark,.theme-dark .lh-vid-modal {
  --base:#161618; --card:#232326; --text:#F5F5F7; --text2:#BDBDC5; --text3:#A0A0A8;
  --fill:rgba(235,235,245,.12); --fill2:rgba(235,235,245,.06); --sep:rgba(235,235,245,.12);
  --glass:rgba(42,42,46,.62); --edge:rgba(255,255,255,.12);
  --btn:#0A72E0; --tint:#6CB2FF; --bar:#3E9BFF;
  --trk:rgba(235,235,245,.13); --tabon:rgba(235,235,245,.13); --segon:#636366;
  --cshadow:inset 0 .5px 0 rgba(255,255,255,.08),0 6px 18px rgba(0,0,0,.28);
  --float:inset 0 .5px 0 rgba(255,255,255,.16),0 12px 34px rgba(0,0,0,.5);
  --mst:#5FD8C0; --due:#6B92FF; --lrn:#74C4FA; --new:#FF8A70; --uns:#55555B;
  --mstt:#6FE0C8; --duet:#92AEFF; --lrnt:#84CBFB; --newt:#FF9B85;
  --locked:grayscale(1) brightness(.5);
}
`;

const shell = `
.modal.lh-hub.lh-session { width:min(95vw,700px); height:min(90vh,640px); }
.modal.lh-hub { width:min(96vw,1240px); max-width:none; min-width:0; height:min(92vh,820px); max-height:none; padding:0; overflow:hidden; border:0; border-radius:18px; background:var(--base); color:var(--text); }
.lh-hub:not(.qm-modal) > .modal-close-button,.lh-hub > .modal-header-button,.lh-hub > .modal-header { display:none !important; }
.lh-hub > .modal-content { margin:0; padding:0; height:100%; display:flex; flex-direction:column; overflow:hidden; background:var(--base); color:var(--text); }
:is(.lh-hub,.lh-theme) .lh-i { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; flex:none; }
.lh-pcont:empty { display:none; }
.lh-pcont { flex:none; cursor:pointer; }
.lh-pcont .lh-chev { color:var(--text3); font-size:20px; line-height:1; padding-right:4px; }
.lh-loading { flex:1; display:flex; align-items:center; justify-content:center; }
.lh-spinner { width:32px; height:32px; border:3px solid var(--fill); border-top-color:var(--text3); border-radius:50%; animation:lh-spin .7s linear infinite; }
@keyframes lh-spin { to { transform:rotate(360deg); } }

.lh-shell { position:relative; flex:1; min-height:0; isolation:isolate; background:var(--base); }
.lh-hero { position:absolute; left:0; right:0; top:0; height:150px; z-index:-1; pointer-events:none; background-repeat:no-repeat; background-size:max(100%,1240px) auto; background-position:0 -108px; -webkit-mask-image:linear-gradient(#000 62px,transparent 118px); mask-image:linear-gradient(#000 62px,transparent 118px); }
.lh-dark .lh-hero { background-position:0 -50px; -webkit-mask-image:linear-gradient(#000 62px,transparent 124px); mask-image:linear-gradient(#000 62px,transparent 124px); }
.lh-shell.no-hero .lh-hero { display:none; }

.lh-glass { background:var(--glass); -webkit-backdrop-filter:blur(30px) saturate(170%); backdrop-filter:blur(30px) saturate(170%); border:1px solid var(--edge); box-shadow:var(--float); }
@media (prefers-reduced-transparency:reduce) { .lh-hub .lh-glass { background:var(--card); -webkit-backdrop-filter:none; backdrop-filter:none; } }

.lh-side { position:absolute; z-index:3; left:10px; top:10px; bottom:10px; width:216px; border-radius:14px; padding:10px; display:flex; flex-direction:column; gap:2px; overflow-y:auto; scrollbar-width:none; box-sizing:border-box; }
.lh-side::-webkit-scrollbar { display:none; }
.lh-brand { height:40px; flex:none; display:flex; align-items:center; padding:0 10px; margin-bottom:6px; font-size:13px; font-weight:600; color:var(--text); }
.lh-brand-short { display:none; }
.lh-grp { flex:none; font-size:12px; line-height:16px; font-weight:600; color:var(--text3); padding:14px 10px 5px; }
.lh-rsep { display:none; }
.lh-hub .lh-nv { flex:none; height:38px; width:100%; border:0; border-radius:9px; background:transparent; box-shadow:none; color:var(--text); display:flex; align-items:center; justify-content:flex-start; gap:10px; padding:0 10px; font-size:14px; font-weight:500; cursor:pointer; text-align:left; }
.lh-hub .lh-nv:hover { background:var(--fill2); }
.lh-hub .lh-nv.on { background:var(--fill); font-weight:600; }
.lh-nv-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lh-nv em { margin-left:auto; font-style:normal; font-size:12px; font-weight:500; color:var(--text3); font-variant-numeric:tabular-nums; }
.lh-hub .lh-nv.on em { color:var(--text2); }
.lh-hub .lh-nv:focus-visible,.lh-hub .lh-ib:focus-visible,.lh-hub .lh-pro:focus-visible,.lh-hub .lh-btn:focus-visible { outline:2px solid var(--tint); outline-offset:1px; box-shadow:none; }

.lh-ti { width:26px; height:26px; border-radius:7px; display:grid; place-items:center; flex:none; box-shadow:inset 0 .5px 0 rgba(255,255,255,.4); }
.lh-ti.mem { background:linear-gradient(180deg,#6B93F5,#4F7CF0); }
.lh-ti.lrn { background:linear-gradient(180deg,#5AD2BA,#37B39B); }
.lh-ti.ach { background:linear-gradient(180deg,#F59079,#EC7158); }
.lh-hub .lh-ti .lh-i { width:15px; height:15px; color:#fff; stroke-width:2; }

.lh-foot { margin-top:auto; flex:none; display:flex; align-items:center; gap:2px; padding:4px 0 0; }
.lh-hub .lh-pro { flex:1; min-width:0; height:42px; border:0; border-radius:10px; background:transparent; box-shadow:none; color:var(--text); display:flex; align-items:center; justify-content:flex-start; gap:10px; padding:0 8px; font-size:14px; font-weight:500; cursor:pointer; text-align:left; white-space:nowrap; }
.lh-hub .lh-pro:hover { background:var(--fill); }
.lh-hub .lh-pro.active { color:var(--text2); }
.lh-pti { width:26px; height:26px; border-radius:7px; display:grid; place-items:center; flex:none; box-shadow:inset 0 .5px 0 rgba(255,255,255,.3); }
.lh-pti svg { width:15px; height:15px; fill:currentColor; }
.lh-pti.free { background:linear-gradient(180deg,#4A4A50,#1D1D1F); color:#fff; }
.lh-dark .lh-pti.free { background:linear-gradient(180deg,#F5F5F7,#C9C9CF); color:#1D1D1F; box-shadow:none; }
.lh-pti.active { background:var(--fill); color:var(--mstt); box-shadow:none; }

.lh-hub .lh-ib { width:36px; height:36px; padding:0; border:0; border-radius:10px; background:transparent; box-shadow:none; color:var(--text2); display:grid; place-items:center; cursor:pointer; flex:none; }
.lh-hub .lh-ib:hover { background:var(--fill); }
.lh-capsule { position:absolute; z-index:4; right:12px; top:12px; border-radius:12px; display:flex; padding:2px; }

.lh-main { position:absolute; z-index:1; left:236px; right:0; top:0; bottom:0; display:flex; flex-direction:column; gap:12px; padding:100px 24px 0 16px; overflow:hidden; box-sizing:border-box; }
.lh-shell.no-hero .lh-main { padding-top:14px; }
.lh-pending { flex:1; display:flex; align-items:center; justify-content:center; font-size:20px; color:var(--text3); }

@media (max-width:1039px) {
  body:not(.is-phone) .lh-hero { height:96px; background-size:max(100%,900px) auto; -webkit-mask-image:linear-gradient(#000 26px,transparent 76px); mask-image:linear-gradient(#000 26px,transparent 76px); }
  body:not(.is-phone) .lh-side { width:60px; padding:8px 6px; align-items:center; }
  body:not(.is-phone) .lh-brand { width:44px; height:40px; justify-content:center; padding:0; margin-bottom:4px; font-weight:700; }
  body:not(.is-phone) .lh-brand-full,body:not(.is-phone) .lh-grp,body:not(.is-phone) .lh-nv-label,body:not(.is-phone) .lh-nv em,body:not(.is-phone) .lh-pro-label { display:none; }
  body:not(.is-phone) .lh-brand-short { display:inline; }
  body:not(.is-phone) .lh-rsep { display:block; width:28px; height:1px; background:var(--sep); margin:5px 0; flex:none; }
  body:not(.is-phone) .lh-hub .lh-nv { width:44px; height:44px; padding:0; justify-content:center; }
  body:not(.is-phone) .lh-foot { flex-direction:column-reverse; gap:4px; }
  body:not(.is-phone) .lh-hub .lh-pro { flex:none; width:44px; height:44px; padding:0; justify-content:center; }
  body:not(.is-phone) .lh-main { left:70px; padding:62px 20px 0 14px; gap:9px; }
}
`;

const components = `
.lh-hd { display:flex; align-items:flex-start; gap:8px; flex:none; }
.lh-hd-main { min-width:0; flex:1; }
.lh-hd-title { display:flex; align-items:center; gap:8px; }
.lh-tt { margin:0; font-size:28px; line-height:36px; font-weight:700; letter-spacing:-.018em; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-sub { margin:0; font-size:15px; line-height:22px; color:var(--text2); }
.lh-count { font-size:14px; color:var(--text3); font-variant-numeric:tabular-nums; white-space:nowrap; }
.lh-hd-right { display:flex; align-items:center; gap:8px; flex:none; flex-wrap:wrap; justify-content:flex-end; }
.lh-hub .lh-feature-info { width:24px !important; height:24px !important; padding:0; border:0 !important; border-radius:50% !important; background:transparent !important; box-shadow:none; color:var(--text3) !important; display:grid !important; place-items:center; cursor:pointer; flex:none; }
.lh-hub .lh-feature-info svg { width:16px; height:16px; stroke-width:1.8; }

.lh-hub .lh-btn { height:32px; padding:0 14px; border:0; border-radius:9px; background:var(--btn); box-shadow:none; color:var(--onbtn); font-size:13px; font-weight:600; display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; white-space:nowrap; }
.lh-hub .lh-btn:hover { background:var(--btn); filter:brightness(1.08); }
.lh-hub .lh-btn svg { width:12px; height:12px; fill:currentColor; }
.lh-hub .lh-btn.alt { background:var(--fill); color:var(--text); }
.lh-hub .lh-btn.alt:hover { background:var(--fill); }
.lh-hub .lh-link { border:0; background:none; box-shadow:none; padding:0; height:auto; color:var(--tint); font-size:13px; font-weight:500; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; }
.lh-hub .lh-link:hover { background:none; text-decoration:underline; }
.lh-hub .lh-link .lh-i { width:14px; height:14px; stroke-width:2; }

.lh-sumr { display:flex; flex-direction:column; gap:7px; flex:none; }
.lh-mets { display:flex; align-items:baseline; gap:0 26px; flex-wrap:wrap; }
.lh-met { display:flex; align-items:baseline; gap:6px; }
.lh-met b { font-size:30px; line-height:36px; font-weight:600; letter-spacing:-.02em; font-variant-numeric:tabular-nums; color:var(--text); }
.lh-met span { font-size:13px; font-weight:500; color:var(--text2); white-space:nowrap; }
.lh-mets .lh-link { margin-left:auto; align-self:center; }
.lh-sb { display:flex; gap:1.5px; height:6px; border-radius:3px; overflow:hidden; background:var(--trk); flex:none; }
.lh-sb i { display:block; height:100%; }
.lh-track { height:4px; border-radius:2px; background:var(--trk); overflow:hidden; }
.lh-track i { display:block; height:100%; border-radius:2px; background:var(--bar); }
.lh-track.ok i { background:var(--mst); }
:is(.lh-hub,.lh-theme) .tm { color:var(--mstt); } :is(.lh-hub,.lh-theme) .tl { color:var(--lrnt); } :is(.lh-hub,.lh-theme) .td { color:var(--duet); } :is(.lh-hub,.lh-theme) .tn { color:var(--newt); } :is(.lh-hub,.lh-theme) .dim { color:var(--text3); }

.lh-tb { display:flex; align-items:center; gap:8px; flex:none; flex-wrap:wrap; }
.lh-grow { flex:1; min-width:0; }
.lh-seg { display:inline-flex; padding:2px; border-radius:9px; background:var(--fill); flex:none; max-width:100%; }
.lh-hub .lh-seg button { height:28px; min-width:0; padding:0 12px; border:0; border-radius:7px; background:transparent; box-shadow:none; color:var(--text2); font-size:13px; font-weight:500; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; justify-content:center; }
.lh-hub .lh-seg button:hover { background:transparent; color:var(--text); }
.lh-hub .lh-seg button.on { background:var(--segon); color:var(--text); font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.14); }
.lh-hub .lh-vt button { width:40px; padding:0; }
.lh-hub .lh-vt .lh-i { width:16px; height:16px; stroke-width:1.8; }
.lh-sf { height:32px; border-radius:9px; background:var(--fill); display:flex; align-items:center; gap:8px; padding:0 12px; color:var(--text3); min-width:0; box-sizing:border-box; }
.lh-sf .lh-i { width:16px; height:16px; stroke-width:1.8; }
.lh-hub .lh-sf input { all:unset; flex:1; min-width:0; font-size:14px; color:var(--text); }
.lh-hub .lh-sf input::placeholder { color:var(--text3); }
.lh-hub .lh-fp { height:32px; flex:none; line-height:32px; max-width:100%; border:0; border-radius:9px; background-color:var(--fill2); background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231D1D1F' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 8px center; background-size:12px; box-shadow:none; color:var(--text); font-size:13px; font-weight:500; padding:0 26px 0 10px; cursor:pointer; -webkit-appearance:none; appearance:none; white-space:nowrap; }
.lh-hub .lh-fp:hover { background-color:var(--fill); box-shadow:none; }
.lh-hub .lh-fp.is-set { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230066CC' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); color:var(--tint); font-weight:600; }
.lh-hub.lh-dark .lh-fp { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23F5F5F7' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); }
.lh-hub.lh-dark .lh-fp.is-set { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236CB2FF' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); }
.lh-sf.lh-grow { min-width:140px; }
.lh-tf { position:relative; flex:none; }
.lh-tf-drop { display:none; position:absolute; z-index:6; top:calc(100% + 4px); right:0; width:220px; max-height:260px; flex-direction:column; border-radius:12px; background:var(--card); box-shadow:var(--float); overflow:hidden; }
.lh-tf-drop.on { display:flex; }
.lh-hub .lh-tf-drop input { all:unset; flex:none; margin:8px; height:30px; padding:0 10px; border-radius:8px; background:var(--fill); color:var(--text); font-size:13px; box-sizing:border-box; }
.lh-tf-list { overflow-y:auto; padding:0 4px 4px; }
.lh-hub .lh-tf-opt { display:block; width:100%; height:auto; min-height:32px; padding:0 10px; border:0; border-radius:8px; background:transparent; box-shadow:none; color:var(--text); font-size:13px; font-weight:500; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer; }
.lh-hub .lh-tf-opt:hover { background:var(--fill2); }
.lh-hub .lh-tf-opt.on { background:var(--fill); color:var(--tint); font-weight:600; }
.lh-gi { width:36px; height:36px; border-radius:9px; background:var(--fill2); color:var(--text2); display:grid; place-items:center; flex:none; }
:is(.lh-hub,.lh-theme) .lh-gi .lh-i { width:19px; height:19px; }
.lh-emp { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; text-align:center; padding:32px 16px; }
.lh-emp b { font-size:15px; line-height:20px; font-weight:600; color:var(--text); }
.lh-emp p { margin:0; max-width:420px; font-size:13px; line-height:20px; color:var(--text2); }
.lh-confirm.modal { width:min(92vw,420px); padding:0; border:0; border-radius:16px; background:var(--card); color:var(--text); overflow:hidden; }
.lh-confirm .modal-content { padding:24px; display:flex; flex-direction:column; gap:14px; }
.lh-confirm-title { font-size:16px; line-height:22px; font-weight:600; color:var(--text); overflow-wrap:anywhere; }
.lh-confirm-body { font-size:13px; line-height:20px; color:var(--text2); white-space:pre-line; }
.lh-confirm-acts { display:flex; justify-content:flex-end; gap:8px; padding-top:4px; }

.lh-scroll { flex:1; min-height:0; overflow-y:auto; margin:0 -2px; padding:2px 2px 26px; -webkit-mask-image:linear-gradient(#000 calc(100% - 26px),transparent); mask-image:linear-gradient(#000 calc(100% - 26px),transparent); }
.lh-banners { display:flex; flex-direction:column; gap:10px; margin-top:12px; }
.lh-banners:empty { display:none; }
.lh-hub .lh-synapse-banner { background:var(--card); box-shadow:var(--cshadow); border:0; border-radius:16px; color:var(--text); margin:0; }
.lh-hub .lh-synapse-banner-btn { background:var(--fill); border:0; box-shadow:none; color:var(--tint); }
.lh-empty2 { flex:1; display:flex; align-items:center; justify-content:center; text-align:center; padding:32px 16px; font-size:15px; line-height:23px; color:var(--text2); }

.lh-hub .lh-deck-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; padding:0; }
.lh-tbi { display:inline-flex; align-items:center; gap:6px; color:var(--text2); font-size:13px; font-weight:500; white-space:nowrap; }
.lh-tbi em { font-style:normal; font-size:11px; font-weight:600; color:var(--text2); background:var(--fill); padding:1px 6px; border-radius:6px; }
.lh-tbi .lh-i { width:16px; height:16px; stroke-width:1.8; }
.lh-dc { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; padding:14px; display:flex; flex-direction:column; gap:8px; position:relative; min-width:0; cursor:pointer; }
.lh-nm { font-size:15px; line-height:20px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-pth { font-size:12px; line-height:16px; color:var(--text3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-nr { display:flex; align-items:baseline; gap:6px; margin-top:6px; min-width:0; }
.lh-nr b { font-size:30px; line-height:34px; font-weight:600; letter-spacing:-.02em; font-variant-numeric:tabular-nums; color:var(--text); }
.lh-nr span { font-size:13px; color:var(--text2); min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-nr i { margin-left:auto; font-style:normal; font-size:12px; font-weight:500; color:var(--mstt); font-variant-numeric:tabular-nums; white-space:nowrap; }
.lh-dmeta { display:flex; justify-content:space-between; gap:8px; font-size:12px; line-height:16px; color:var(--text3); font-variant-numeric:tabular-nums; white-space:nowrap; }
.lh-dmeta .td,.lh-dmeta .tn { font-weight:500; }
.lh-dc.is-idle .lh-nr b { color:var(--text3); }

.lh-ra { display:flex; gap:2px; opacity:0; transition:opacity .15s; }
.lh-dc:hover .lh-ra,.lh-tr:hover .lh-ra,.lh-trow:hover .lh-ra,.lh-qc:hover .lh-ra,.lh-ra:focus-within,.lh-ra-on .lh-ra { opacity:1; }
body.is-mobile .lh-ra { opacity:1; }
@media (hover:none) { .lh-ra { opacity:1; } }
.lh-dc > .lh-ra { position:absolute; right:8px; top:8px; z-index:2; }
.lh-hub .lh-ra button { width:28px; height:28px; padding:0; border:0; border-radius:8px; background:var(--fill2); box-shadow:none; color:var(--text2); display:grid; place-items:center; cursor:pointer; }
.lh-hub .lh-ra button:hover { background:var(--fill); }
.lh-hub .lh-ra .lh-i { width:16px; height:16px; stroke-width:1.8; }

.lh-tbl { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; overflow:hidden; }
.lh-th,.lh-tr { display:grid; align-items:center; column-gap:12px; padding:0 14px; font-variant-numeric:tabular-nums; }
.lh-th { height:34px; font-size:12px; font-weight:500; color:var(--text3); border-bottom:.5px solid var(--sep); }
.lh-th .td,.lh-th .tn,.lh-th .tm,.lh-th .tl { font-weight:600; }
.lh-tr { min-height:56px; position:relative; font-size:14px; color:var(--text); cursor:pointer; }
.lh-tr + .lh-tr::before { content:""; position:absolute; left:14px; right:0; top:0; height:.5px; background:var(--sep); }
.lh-r { text-align:right; }
.lh-strong { font-size:17px; font-weight:600; }
.lh-mini { display:flex; align-items:center; gap:8px; color:var(--text2); font-size:13px; }
.lh-mini .lh-track { flex:1; }
.lh-tr .lh-ra button { background:transparent; color:var(--text3); }

.lh-hub .lh-tree-container { display:flex; flex-direction:column; gap:6px; padding:0; }
.lh-hub .lh-tree-details,.lh-hub .lh-tree-content { background:transparent; border:0; margin:0; }
.lh-hub .lh-tree-content { margin-left:14px; padding-left:8px; border-left:.5px solid var(--sep); }
.lh-hub .lh-tree-summary { list-style:none; cursor:pointer; padding:7px 8px; border-radius:9px; font-size:14px; font-weight:600; color:var(--text); background:transparent; border:0; }
.lh-hub .lh-tree-summary:hover { background:var(--fill2); }
.lh-hub .lh-tree-summary::-webkit-details-marker { display:none; }
.lh-hub .lh-tree-summary-inner { display:flex; align-items:center; gap:8px; }
.lh-hub .lh-tree-summary-inner .lh-i { width:16px; height:16px; color:var(--text3); }
.lh-hub .lh-tree-items-container { background:var(--card); box-shadow:var(--cshadow); border-radius:14px; overflow:hidden; margin:4px 0; padding:0; }
.lh-trow { display:flex; align-items:center; gap:12px; min-height:52px; padding:8px 10px 8px 14px; position:relative; cursor:pointer; color:var(--text); }
.lh-trow + .lh-trow::before { content:""; position:absolute; left:14px; right:0; top:0; height:.5px; background:var(--sep); }
.lh-trow-main { flex:1; min-width:0; }
.lh-trow-metrics { display:flex; align-items:baseline; gap:12px; font-size:13px; color:var(--text3); font-variant-numeric:tabular-nums; white-space:nowrap; }
.lh-trow-metrics b { font-size:17px; font-weight:600; color:var(--text); }
.lh-trow .lh-ra button { background:transparent; color:var(--text3); }
`;

const phone = `
body.is-phone .modal.lh-hub { width:100vw; height:100vh; height:100dvh; max-height:none; border-radius:0; margin:0; }
body.is-phone .modal-container:has(.lh-hub) { padding:0; align-items:stretch; }
.lh-ph { position:relative; flex:1; min-height:0; display:flex; flex-direction:column; background:var(--base); isolation:isolate; overflow:hidden; }
.lh-ph.is-home .lh-hero { height:150px; background-size:640px auto; background-position:-125px -42px; -webkit-mask-image:linear-gradient(#000 62px,transparent 104px); mask-image:linear-gradient(#000 62px,transparent 104px); }
.lh-dark .lh-ph.is-home .lh-hero { background-size:auto 240px; background-position:center top; -webkit-mask-image:linear-gradient(#000 62px,transparent 112px); mask-image:linear-gradient(#000 62px,transparent 112px); }
.lh-ph:not(.is-home) .lh-hero { display:none; }
.lh-ph .lh-capsule { top:calc(env(safe-area-inset-top,0px) + 10px); right:14px; }
.lh-hub .lh-ph .lh-capsule .lh-ib { width:44px; height:40px; background:transparent; }
.lh-pbody { flex:1; min-height:0; display:flex; flex-direction:column; gap:10px; padding:calc(env(safe-area-inset-top,0px) + 10px) 18px calc(env(safe-area-inset-bottom,0px) + 16px); overflow-y:auto; box-sizing:border-box; }
.lh-ph.is-home .lh-pbody { padding-top:calc(env(safe-area-inset-top,0px) + 96px); padding-bottom:calc(env(safe-area-inset-bottom,0px) + 112px); gap:11px; }
.lh-ptl { margin:0; font-size:30px; line-height:38px; font-weight:700; letter-spacing:-.02em; color:var(--text); }
.lh-psb { margin:2px 0 0; font-size:16px; line-height:23px; color:var(--text2); }
.lh-hub .lh-pbtn { width:100%; height:52px; flex:none; border:0; border-radius:14px; background:var(--btn); box-shadow:none; color:var(--onbtn); font-size:17px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; }
.lh-hub .lh-pbtn:hover { background:var(--btn); }
.lh-hub .lh-pbtn svg { width:14px; height:14px; fill:currentColor; }
.lh-hub .lh-pbtn.alt { background:var(--fill); color:var(--text); }
.lh-hub .lh-pbody > .lh-link,.lh-hub .lh-pmain > .lh-link { font-size:15px; min-height:30px; justify-content:center; flex:none; width:100%; }
.lh-pl { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; overflow:hidden; flex:none; }
.lh-hub .lh-pr { display:flex; align-items:center; justify-content:flex-start; gap:12px; width:100%; height:auto; min-height:52px; padding:8px 14px; position:relative; border:0; border-radius:0; background:none; box-shadow:none; color:var(--text); text-align:left; font-size:16px; cursor:pointer; }
.lh-hub .lh-pr:hover { background:none; }
.lh-pr + .lh-pr::before { content:""; position:absolute; left:58px; right:0; top:0; height:1px; background:var(--sep); }
.lh-pr b { display:block; font-size:16px; line-height:22px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-pr .lh-val { font-size:16px; font-weight:600; font-variant-numeric:tabular-nums; }
.lh-pr .lh-note { font-size:13px; line-height:18px; color:var(--text3); white-space:nowrap; }
.lh-pr .lh-chev { color:var(--text3); font-size:20px; line-height:1; }
.lh-hub .lh-pr .lh-ti,.lh-hub .lh-pr .lh-pti { width:30px; height:30px; border-radius:8px; }
.lh-hub .lh-pr .lh-ti .lh-i { width:17px; height:17px; }
.lh-hub .lh-pr .lh-pti svg { width:17px; height:17px; }
.lh-tabg { position:absolute; left:44px; right:44px; bottom:calc(env(safe-area-inset-bottom,0px) + 24px); height:64px; border-radius:32px; z-index:4; display:flex; padding:4px; box-sizing:border-box; }
.lh-hub .lh-tabg button { flex:1; height:auto; border:0; border-radius:28px; background:transparent; box-shadow:none; color:var(--text); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; font-size:12px; font-weight:600; cursor:pointer; padding:0; }
.lh-hub .lh-tabg button.on { background:var(--tabon); color:var(--tint); }
.lh-hub .lh-tabg .lh-i { width:22px; height:22px; stroke-width:1.8; }
.lh-pnav { display:flex; align-items:center; justify-content:space-between; min-height:44px; gap:8px; flex:none; }
.lh-hub .lh-pback { border:0; background:none; box-shadow:none; padding:0; height:auto; min-height:44px; color:var(--tint); font-size:17px; font-weight:500; cursor:pointer; white-space:nowrap; }
.lh-hub .lh-pback:hover { background:none; }
.lh-pnav-title { font-size:17px; line-height:22px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.lh-pnav-side { width:58px; flex:none; display:flex; justify-content:flex-end; }
.lh-pnav-side:first-child { justify-content:flex-start; }
.lh-hub .lh-pnav .lh-feature-info { width:44px !important; height:44px !important; color:var(--text) !important; }
.lh-hub .lh-pnav .lh-feature-info svg { width:22px; height:22px; stroke-width:1.7; }
.lh-pmain { flex:1; min-height:0; display:flex; flex-direction:column; gap:10px; }
body.is-phone .lh-sf { height:40px; border-radius:11px; flex:none; }
body.is-phone .lh-hub .lh-sf input { font-size:15px; }
body.is-phone .lh-hub .lh-seg button { height:32px; flex:1 0 auto; padding:0 8px; }
body.is-phone .lh-seg { display:flex; overflow-x:auto; scrollbar-width:none; }
body.is-phone .lh-seg::-webkit-scrollbar { display:none; }
body.is-phone .lh-tb { position:relative; }
body.is-phone .lh-tf { position:static; }
body.is-phone .lh-tf-drop { left:0; right:0; width:auto; }
.lh-hub .lh-pcycle { width:40px; height:40px; flex:none; padding:0; border:0; border-radius:10px; background:var(--fill); box-shadow:none; color:var(--text2); display:grid; place-items:center; cursor:pointer; }
.lh-hub .lh-pcycle:hover { background:var(--fill); }
.lh-prd { display:flex; align-items:center; gap:6px; padding:10px 6px 10px 14px; position:relative; cursor:pointer; }
.lh-prd + .lh-prd::before { content:""; position:absolute; left:14px; right:0; top:0; height:.5px; background:var(--sep); }
.lh-prd .lh-sb { margin-top:7px; }
.lh-pcnt { display:flex; flex-direction:column; align-items:flex-end; flex:none; min-width:46px; margin-left:8px; }
.lh-pcnt b { font-size:22px; line-height:26px; font-weight:600; font-variant-numeric:tabular-nums; color:var(--text); }
.lh-pcnt span { font-size:11px; line-height:14px; color:var(--text3); }
.lh-hub .lh-pact { width:34px; height:44px; padding:0; border:0; background:transparent; box-shadow:none; color:var(--text3); display:grid; place-items:center; flex:none; cursor:pointer; }
.lh-hub .lh-pact:hover { background:transparent; }
.lh-tbx { flex-wrap:nowrap; }
body.is-phone .lh-tbx .lh-seg { flex:1; }
.lh-ra-phone { display:flex; flex:none; }
.lh-dc > .lh-ra-phone { position:absolute; right:4px; top:2px; z-index:2; }
body.is-phone .lh-dc .lh-nm { padding-right:72px; }
/* Touch targets reach 44px through a transparent area; a select has no pseudo-element, so it uses clear borders. */
body.is-phone .lh-hub :is(.lh-seg button,.lh-btn,.lh-get,.lh-cc-st,.lh-ib,.lh-pcycle,.lh-pact,.lh-link,.lh-tree-summary,.lh-vid-btn,.lh-vid-len) { position:relative; }
body.is-phone .lh-hub :is(.lh-seg button,.lh-btn,.lh-get,.lh-cc-st,.lh-ib,.lh-pcycle,.lh-pact,.lh-link,.lh-tree-summary,.lh-vid-btn,.lh-vid-len)::after { content:""; position:absolute; left:50%; top:50%; width:max(100%,44px); height:max(100%,44px); transform:translate(-50%,-50%); }
body.is-phone .lh-seg:not(:has(> button:nth-child(6))) { overflow:visible; }
body.is-phone .lh-hub .lh-fp { height:44px; border-top:6px solid transparent; border-bottom:6px solid transparent; background-clip:padding-box; margin:-6px 0; }
body.is-phone .lh-scroll { margin:0; padding:0 0 20px; -webkit-mask-image:none; mask-image:none; overflow:visible; flex:none; }
`;

const motion = `
@media (prefers-reduced-motion:reduce) { .lh-hub *,.lh-hub *::before,.lh-hub *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; } }
`;

module.exports = tokens + shell + components + phone + require("./hub-pages") + motion;
