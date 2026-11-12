"use strict";
// Hub design system: tokens, the window shell (sidebar, rail, phone tabs) and shared components.
// Look: design/2026-11-11-apple-ui (pearl / graphite surfaces, glass feature icons, raised controls).
// Page-specific rules live in hub-pages.js. Colour rule: large areas stay neutral, each data colour
// keeps one meaning. Controls come in three weights: primary (solid indigo), raised (neutral surface
// with a hairline and a small shadow) and quiet (no surface until hover). Static data never looks raised.

const tokens = `
.lh-hub,.lh-theme,.lh-vid-modal {
  --base:#F5F5F7; --card:#FFFFFF; --side:#EFEFF2; --text:#1D1D1F; --text2:#595963; --text3:#6A6A72;
  --fill:rgba(60,60,67,.08); --fill2:rgba(60,60,67,.05); --sep:rgba(60,60,67,.12); --line:#D9D9DF;
  --glass:rgba(250,250,252,.72); --edge:rgba(255,255,255,.75);
  --raised:#FFFFFF; --raisedh:#F7F7F9;
  --rshadow:0 0 0 .5px rgba(0,0,0,.10),0 1px 2px rgba(0,0,0,.06),0 2px 6px rgba(0,0,0,.03);
  --btn:#6D5BD0; --btnh:#5B48B8; --onbtn:#FFFFFF; --tint:#5B48B8; --focus:#6D5BD0; --bar:#6E83EC;
  --trk:rgba(120,120,128,.16); --tabon:rgba(60,60,67,.10); --segon:#FFFFFF; --segtx:#1D1D1F;
  --cshadow:0 0 0 .5px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.03),0 6px 18px rgba(0,0,0,.04);
  --cshadowh:0 0 0 .5px rgba(0,0,0,.10),0 2px 4px rgba(0,0,0,.04),0 10px 24px rgba(0,0,0,.07);
  --float:inset 0 1px 0 rgba(255,255,255,.7),0 0 0 .5px rgba(0,0,0,.08),0 10px 30px rgba(0,0,0,.12);
  --amb1:rgba(109,91,208,.075); --amb2:rgba(176,150,128,.06);
  --mst:#5DBB9D; --due:#6E83EC; --lrn:#6CBBF2; --new:#E8877B; --uns:#D4D4DA;
  --mstt:#24705E; --duet:#4057B5; --lrnt:#1672B5; --newt:#AC4934; --dang:#C2412D; --gold:#D29A2E;
  --locked:grayscale(1) opacity(.42);
  --interactive-normal:transparent; --interactive-hover:var(--fill2); --input-shadow:none; --input-shadow-hover:none;
}
.lh-hub.lh-dark,.lh-theme.lh-dark,.theme-dark .lh-vid-modal {
  --base:#18181B; --card:#29292D; --side:#1F1F23; --text:#F5F5F7; --text2:#BDBDC7; --text3:#A0A0A8;
  --fill:rgba(235,235,245,.12); --fill2:rgba(235,235,245,.06); --sep:rgba(235,235,245,.12); --line:#48484F;
  --glass:rgba(42,42,46,.66); --edge:rgba(255,255,255,.12);
  --raised:#2F2F34; --raisedh:#38383E;
  --rshadow:inset 0 .5px 0 rgba(255,255,255,.08),0 0 0 .5px rgba(255,255,255,.10),0 1px 3px rgba(0,0,0,.35);
  --btn:#5B5BD6; --btnh:#6C6CE0; --tint:#B0A5FF; --focus:#B0A5FF; --bar:#7C8FF5;
  --trk:rgba(235,235,245,.13); --tabon:rgba(235,235,245,.13); --segon:#ECECF0; --segtx:#1D1D1F;
  --cshadow:inset 0 .5px 0 rgba(255,255,255,.08),0 0 0 .5px rgba(255,255,255,.07),0 6px 18px rgba(0,0,0,.30);
  --cshadowh:inset 0 .5px 0 rgba(255,255,255,.10),0 0 0 .5px rgba(255,255,255,.14),0 10px 26px rgba(0,0,0,.40);
  --float:inset 0 .5px 0 rgba(255,255,255,.16),0 12px 34px rgba(0,0,0,.5);
  --amb1:rgba(124,108,255,.14); --amb2:rgba(90,80,160,.10);
  --mst:#6FCFAE; --due:#7C8FF5; --lrn:#74C4FA; --new:#F2917F; --uns:#55555B;
  --mstt:#93D6C0; --duet:#ADB9FF; --lrnt:#84CBFB; --newt:#F2A18D; --dang:#FF8A75; --gold:#E5C07A;
  --locked:grayscale(1) brightness(.5);
}
`;

// The icon rail. Narrow windows always use it; `.is-rail` is the user folding the sidebar
// (src/hub/sidebar.js). One rule set draws both, so the two can never drift apart; only a narrow
// window also tightens the page area.
const rail = (scope, hub) => `
  ${scope} .lh-side { width:68px; padding:12px 10px; align-items:center; }
  ${scope} .lh-brand { width:44px; justify-content:center; padding:0; margin-bottom:4px; }
  ${scope} .lh-brand-full,${scope} .lh-grp,${scope} .lh-nv-label,${scope} .lh-nv em,${scope} .lh-pro-label { display:none; }
  ${scope} .lh-rsep { display:block; width:28px; height:1px; background:var(--sep); margin:6px 0; flex:none; }
  ${hub} .lh-nv { width:44px; height:44px; padding:0; justify-content:center; }
  ${scope} .lh-foot { flex-direction:column-reverse; gap:4px; }
  ${hub} .lh-pro { flex:none; width:44px; height:44px; padding:0; justify-content:center; }`;

const shell = `
.modal.lh-hub.lh-session { width:min(95vw,920px); height:min(90vh,700px); }
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
.lh-amb { position:absolute; left:0; right:0; top:0; height:240px; z-index:-1; pointer-events:none; background:radial-gradient(55% 100% at 74% 0,var(--amb1),transparent 72%),radial-gradient(40% 80% at 30% 0,var(--amb2),transparent 70%); }

.lh-glass { background:var(--glass); -webkit-backdrop-filter:blur(30px) saturate(170%); backdrop-filter:blur(30px) saturate(170%); border:1px solid var(--edge); box-shadow:var(--float); }
@media (prefers-reduced-transparency:reduce) { .lh-hub .lh-glass { background:var(--card); -webkit-backdrop-filter:none; backdrop-filter:none; } }

/* Glass feature icon: both theme variants are rendered, the matching one shows. */
.lh-fi { width:var(--fi,32px); height:var(--fi,32px); display:grid; place-items:center; flex:none; }
.lh-fi img { display:block; width:100%; height:100%; object-fit:contain; -webkit-user-drag:none; user-select:none; }
.lh-fi .lh-fi-dark,.lh-dark .lh-fi .lh-fi-light { display:none; }
.lh-dark .lh-fi .lh-fi-dark { display:block; }
:is(.lh-hub,.lh-theme) .lh-fi.is-fallback .lh-i { width:calc(var(--fi,32px) * .62); height:calc(var(--fi,32px) * .62); color:var(--text2); }

.lh-side { position:absolute; z-index:3; left:0; top:0; bottom:0; width:224px; padding:16px 12px 12px; background:var(--side); border-right:.5px solid var(--sep); display:flex; flex-direction:column; gap:2px; overflow-y:auto; scrollbar-width:none; box-sizing:border-box; }
.lh-side::-webkit-scrollbar { display:none; }
.lh-brand { height:44px; flex:none; display:flex; align-items:center; gap:10px; padding:0 0 0 8px; margin-bottom:6px; font-size:17px; font-weight:700; letter-spacing:-.01em; color:var(--text); white-space:nowrap; }
.lh-grp { flex:none; font-size:12px; line-height:16px; font-weight:600; color:var(--text3); padding:16px 10px 6px; }
.lh-rsep { display:none; }
.lh-hub .lh-nv { flex:none; height:42px; width:100%; border:0; border-radius:10px; background:transparent; box-shadow:none; color:var(--text); display:flex; align-items:center; justify-content:flex-start; gap:11px; padding:0 8px; font-size:14.5px; font-weight:500; cursor:pointer; text-align:left; }
.lh-hub .lh-nv:hover { background:var(--fill2); }
.lh-hub .lh-nv.on { background:var(--tabon); font-weight:650; }
.lh-nv-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lh-nv em { margin-left:auto; font-style:normal; font-size:12.5px; font-weight:500; color:var(--text3); font-variant-numeric:tabular-nums; }
.lh-hub .lh-nv.on em { color:var(--text2); }
.lh-hub :is(.lh-nv,.lh-ib,.lh-side-fold,.lh-pro,.lh-btn,.lh-pbtn,.lh-seg button,.lh-fp,.lh-link,.lh-ra button,.lh-pr,.lh-pact,.lh-pcycle,.lh-tf-opt,.lh-tabg button,.lh-pback):focus-visible,.lh-hub .lh-sf:focus-within,.lh-theme :is(.lh-btn,.lh-ib):focus-visible { outline:2px solid var(--focus); outline-offset:2px; box-shadow:none; }

.lh-foot { margin-top:auto; flex:none; display:flex; align-items:center; gap:4px; padding:6px 0 0; }
.lh-hub .lh-pro { flex:1; min-width:0; height:44px; border:0; border-radius:10px; background:transparent; box-shadow:none; color:var(--text); display:flex; align-items:center; justify-content:flex-start; gap:10px; padding:0 6px; font-size:14px; font-weight:500; cursor:pointer; text-align:left; white-space:nowrap; }
.lh-hub .lh-pro:hover { background:var(--fill2); }
.lh-pti { width:32px; height:32px; border-radius:50%; display:grid; place-items:center; flex:none; background:var(--raised); box-shadow:var(--rshadow); color:var(--text2); }
.lh-pti svg { width:15px; height:15px; fill:currentColor; }
.lh-pti.free { background:var(--btn); color:var(--onbtn); box-shadow:0 1px 2px rgba(0,0,0,.18); }

.lh-hub .lh-ib { width:36px; height:36px; padding:0; border:0; border-radius:10px; background:transparent; box-shadow:none; color:var(--text2); display:grid; place-items:center; cursor:pointer; flex:none; }
.lh-hub .lh-ib:hover { background:var(--fill); color:var(--text); }
.lh-capsule { position:absolute; z-index:4; right:14px; top:14px; border-radius:12px; display:flex; padding:2px; background:var(--raised); box-shadow:var(--rshadow); }
.lh-hub .lh-capsule .lh-ib { width:34px; height:32px; border-radius:9px; }

.lh-main { position:absolute; z-index:1; left:224px; right:0; top:0; bottom:0; display:flex; flex-direction:column; gap:14px; padding:64px 28px 0 28px; overflow:hidden; box-sizing:border-box; }
.lh-shell.no-hero .lh-main { padding-top:14px; }
.lh-pending { flex:1; display:flex; align-items:center; justify-content:center; font-size:20px; color:var(--text3); }

/* Fold button: at the end of the name row; in the folded rail it sits under the logo. */
.lh-brand-full { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; }
.lh-hub .lh-side-fold { position:relative; flex:none; width:28px; height:28px; margin:0 -4px 0 -8px; padding:0; border:0; border-radius:50%; background:var(--raised) !important; box-shadow:var(--rshadow) !important; color:var(--text2) !important; display:grid; place-items:center; cursor:pointer; }
.lh-hub .lh-side-fold:hover { background:var(--raisedh) !important; color:var(--text) !important; }
.lh-hub .lh-side-fold::after { content:""; position:absolute; inset:-6px; }
.lh-hub .lh-side-fold .lh-i { width:15px; height:15px; stroke-width:2.2; }

@media (max-width:1039px) {${rail("body:not(.is-phone)", "body:not(.is-phone) .lh-hub")}
  body:not(.is-phone) .lh-main { left:68px; padding:60px 20px 0 20px; gap:10px; }
  body:not(.is-phone) .lh-hub .lh-side-fold { display:none; }
}
${rail(".lh-shell.is-rail", ".lh-hub .lh-shell.is-rail")}
  .lh-shell.is-rail .lh-main { left:68px; }
@media (min-width:1040px) {
  .lh-shell.is-rail .lh-brand { flex-direction:column; height:auto; gap:8px; margin-bottom:8px; }
  .lh-hub .lh-shell.is-rail .lh-side-fold { margin:0; }
  .lh-hub .lh-shell.is-rail .lh-side-fold .lh-i { transform:rotate(180deg); }
}
`;

const components = `
.lh-hd { display:flex; align-items:flex-start; gap:12px; flex:none; }
.lh-hd-main { min-width:0; flex:1; }
.lh-hd-title { display:flex; align-items:center; gap:8px; }
.lh-tt { margin:0; font-size:30px; line-height:38px; font-weight:700; letter-spacing:-.02em; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-sub { margin:2px 0 0; font-size:14px; line-height:21px; color:var(--text2); }
.lh-count { font-size:14px; color:var(--text3); font-variant-numeric:tabular-nums; white-space:nowrap; }
.lh-hd-right { display:flex; align-items:center; gap:8px; flex:none; flex-wrap:wrap; justify-content:flex-end; }
.lh-hub .lh-feature-info { width:28px !important; height:28px !important; padding:0; border:0 !important; border-radius:50% !important; background:transparent !important; box-shadow:none; color:var(--text3) !important; display:grid !important; place-items:center; cursor:pointer; flex:none; }
.lh-hub .lh-feature-info svg { width:19px; height:19px; stroke-width:1.7; }
.lh-hub .lh-feature-info:hover { background:var(--fill) !important; color:var(--text2) !important; }

.lh-hub .lh-btn,.lh-theme .lh-btn { height:36px; padding:0 16px; border:0; border-radius:10px; background:var(--btn); box-shadow:inset 0 .5px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.16),0 3px 10px rgba(91,72,184,.18); color:var(--onbtn); font-size:14px; font-weight:600; display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; white-space:nowrap; transition:background .12s,box-shadow .12s,transform .12s; }
.lh-hub .lh-btn:hover,.lh-theme .lh-btn:hover { background:var(--btnh); }
.lh-hub .lh-btn:active,.lh-theme .lh-btn:active { transform:translateY(.5px); box-shadow:inset 0 1px 2px rgba(0,0,0,.2); }
.lh-hub .lh-btn svg:not(.lh-i) { width:12px; height:12px; fill:currentColor; }
.lh-hub .lh-btn .lh-i { width:16px; height:16px; }
.lh-hub .lh-btn.alt,.lh-theme .lh-btn.alt { background:var(--raised); color:var(--text); box-shadow:var(--rshadow); }
.lh-hub .lh-btn.alt:hover,.lh-theme .lh-btn.alt:hover { background:var(--raisedh); }
.lh-hub .lh-btn:disabled,.lh-theme .lh-btn:disabled,.lh-hub .lh-btn[aria-disabled="true"] { background:var(--fill); color:var(--text3); box-shadow:none; cursor:not-allowed; transform:none; }
.lh-hub .lh-link { border:0; background:none; box-shadow:none; padding:0; height:auto; color:var(--tint); font-size:13px; font-weight:500; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; }
.lh-hub .lh-link:hover { background:none; text-decoration:underline; }
.lh-hub .lh-link .lh-i { width:14px; height:14px; stroke-width:2; }

.lh-sumr { display:flex; flex-direction:column; gap:7px; flex:none; }
.lh-mets { display:flex; align-items:baseline; gap:0 26px; flex-wrap:wrap; }
.lh-met { display:flex; align-items:baseline; gap:6px; }
.lh-met b { font-size:32px; line-height:38px; font-weight:650; letter-spacing:-.02em; font-variant-numeric:tabular-nums; color:var(--text); }
.lh-met span { font-size:13.5px; font-weight:500; color:var(--text2); white-space:nowrap; }
.lh-mets .lh-link { margin-left:auto; align-self:center; }
.lh-hub .lh-mets > .lh-link { height:36px; padding:0 12px 0 14px; border-radius:10px; background:var(--raised); box-shadow:var(--rshadow); color:var(--text); font-size:13.5px; gap:8px; }
.lh-hub .lh-mets > .lh-link:hover { background:var(--raisedh); text-decoration:none; }
.lh-hub .lh-mets > .lh-link::before { content:""; width:0; height:0; border-left:8px solid currentColor; border-top:5px solid transparent; border-bottom:5px solid transparent; margin-right:2px; }
.lh-hub .lh-mets > .lh-link .lh-i { color:var(--text3); }
.lh-sb { display:flex; gap:2px; height:8px; border-radius:4px; overflow:hidden; background:var(--trk); flex:none; }
.lh-sb i { display:block; height:100%; }
.lh-track { height:6px; border-radius:3px; background:var(--trk); overflow:hidden; }
.lh-track i { display:block; height:100%; border-radius:3px; background:var(--bar); }
.lh-track.ok i { background:var(--mst); }
:is(.lh-hub,.lh-theme) .tm { color:var(--mstt); } :is(.lh-hub,.lh-theme) .tl { color:var(--lrnt); } :is(.lh-hub,.lh-theme) .td { color:var(--duet); } :is(.lh-hub,.lh-theme) .tn { color:var(--newt); } :is(.lh-hub,.lh-theme) .dim { color:var(--text3); }

.lh-tb { display:flex; align-items:center; gap:10px; flex:none; flex-wrap:wrap; }
.lh-grow { flex:1; min-width:0; }
.lh-seg { display:inline-flex; gap:2px; padding:3px; border-radius:12px; background:var(--fill); flex:none; max-width:100%; box-sizing:border-box; }
.lh-hub .lh-seg button { height:30px; min-width:0; padding:0 14px; border:0; border-radius:9px; background:transparent; box-shadow:none; color:var(--text2); font-size:13.5px; font-weight:500; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; justify-content:center; }
.lh-hub .lh-seg button:hover { background:var(--fill2); color:var(--text); }
.lh-hub .lh-seg button.on { background:var(--segon); color:var(--segtx); font-weight:650; box-shadow:0 0 0 .5px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.14); }
.lh-hub .lh-vt button { width:42px; padding:0; }
.lh-hub .lh-vt .lh-i { width:18px; height:18px; stroke-width:1.8; }
.lh-sf { height:36px; border-radius:10px; background:var(--fill); display:flex; align-items:center; gap:8px; padding:0 12px; color:var(--text3); min-width:0; box-sizing:border-box; }
.lh-sf .lh-i { width:17px; height:17px; stroke-width:1.8; }
.lh-hub .lh-sf input { all:unset; flex:1; min-width:0; font-size:14px; color:var(--text); }
.lh-hub .lh-sf input::placeholder { color:var(--text3); }
.lh-hub .lh-fp { height:36px; flex:none; line-height:36px; max-width:100%; border:0; border-radius:10px; background-color:var(--raised); background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231D1D1F' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 8px center; background-size:12px; box-shadow:var(--rshadow); color:var(--text); font-size:13.5px; font-weight:500; padding:0 28px 0 12px; cursor:pointer; -webkit-appearance:none; appearance:none; white-space:nowrap; }
.lh-hub .lh-fp:hover { background-color:var(--raisedh); box-shadow:var(--rshadow); }
.lh-hub .lh-fp.is-set { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235B48B8' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); color:var(--tint); font-weight:600; }
.lh-hub.lh-dark .lh-fp { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23F5F5F7' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); }
.lh-hub.lh-dark .lh-fp.is-set { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23B0A5FF' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); }
.lh-sf.lh-grow { min-width:140px; }
.lh-tf { position:relative; flex:none; }
.lh-tf-drop { display:none; position:absolute; z-index:6; top:calc(100% + 4px); right:0; width:220px; max-height:260px; flex-direction:column; border-radius:12px; background:var(--card); box-shadow:var(--float); overflow:hidden; }
.lh-tf-drop.on { display:flex; }
.lh-hub .lh-tf-drop input { all:unset; flex:none; margin:8px; height:30px; padding:0 10px; border-radius:8px; background:var(--fill); color:var(--text); font-size:13px; box-sizing:border-box; }
.lh-tf-list { overflow-y:auto; padding:0 4px 4px; }
.lh-hub .lh-tf-opt { display:block; width:100%; height:auto; min-height:32px; padding:0 10px; border:0; border-radius:8px; background:transparent; box-shadow:none; color:var(--text); font-size:13px; font-weight:500; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer; }
.lh-hub .lh-tf-opt:hover { background:var(--fill2); }
.lh-hub .lh-tf-opt.on { background:var(--fill); color:var(--tint); font-weight:600; }
.lh-gi { width:36px; height:36px; border-radius:10px; background:var(--fill2); color:var(--text2); display:grid; place-items:center; flex:none; }
:is(.lh-hub,.lh-theme) .lh-gi .lh-i { width:19px; height:19px; }
.lh-emp { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; text-align:center; padding:32px 16px; }
.lh-emp b { font-size:15px; line-height:20px; font-weight:600; color:var(--text); }
.lh-emp p { margin:0; max-width:420px; font-size:13px; line-height:20px; color:var(--text2); }
.lh-confirm.modal { width:min(92vw,420px); padding:0; border:0; border-radius:18px; background:var(--card); color:var(--text); overflow:hidden; box-shadow:var(--float); }
.lh-confirm .modal-content { padding:24px; display:flex; flex-direction:column; gap:14px; }
.lh-confirm-title { font-size:16px; line-height:22px; font-weight:600; color:var(--text); overflow-wrap:anywhere; }
.lh-confirm-body { font-size:13px; line-height:20px; color:var(--text2); white-space:pre-line; }
.lh-confirm-acts { display:flex; justify-content:flex-end; gap:8px; padding-top:4px; }

.lh-scroll { flex:1; min-height:0; overflow-y:auto; margin:0 -2px; padding:2px 2px 26px; -webkit-mask-image:linear-gradient(#000 calc(100% - 26px),transparent); mask-image:linear-gradient(#000 calc(100% - 26px),transparent); }
.lh-banners { display:flex; flex-direction:column; gap:10px; margin-top:12px; }
.lh-banners:empty { display:none; }
.lh-hub .lh-synapse-banner { background:var(--card); box-shadow:var(--cshadow); border:0; border-radius:16px; color:var(--text); margin:0; }
.lh-hub .lh-synapse-banner-btn { background:var(--raised); border:0; box-shadow:var(--rshadow); color:var(--text); border-radius:10px; }
.lh-hub .lh-synapse-banner-btn:hover { background:var(--raisedh); }
.lh-empty2 { flex:1; display:flex; align-items:center; justify-content:center; text-align:center; padding:32px 16px; font-size:15px; line-height:23px; color:var(--text2); }

.lh-hub .lh-deck-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:14px; padding:0; }
.lh-tbi { display:inline-flex; align-items:center; gap:6px; color:var(--text2); font-size:13px; font-weight:500; white-space:nowrap; }
.lh-tbi em { font-style:normal; font-size:11px; font-weight:600; color:var(--text2); background:var(--fill); padding:1px 6px; border-radius:6px; }
.lh-tbi .lh-i { width:16px; height:16px; stroke-width:1.8; }
.lh-dc { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; padding:15px 16px 14px; display:flex; flex-direction:column; gap:8px; position:relative; min-width:0; cursor:pointer; transition:box-shadow .15s; }
.lh-dc:hover,.lh-dc:focus-within { box-shadow:var(--cshadowh); }
.lh-dc-top { display:flex; align-items:flex-start; gap:10px; min-width:0; }
.lh-dc-hd { flex:1; min-width:0; }
.lh-dc-ic { width:30px; height:30px; flex:none; display:grid; place-items:center; color:var(--text2); margin-top:-1px; }
:is(.lh-hub,.lh-theme) .lh-dc-ic .lh-i { width:21px; height:21px; stroke-width:1.5; }
.lh-dc-go { flex:none; color:var(--text3); margin-top:2px; }
:is(.lh-hub,.lh-theme) .lh-dc-go .lh-i { width:16px; height:16px; stroke-width:2; }
.lh-dc:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
.lh-dc:hover > .lh-dc-top .lh-dc-go { opacity:0; }
.lh-nm { font-size:15.5px; line-height:21px; font-weight:650; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-pth { font-size:12px; line-height:16px; color:var(--text3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-nr { display:flex; align-items:baseline; gap:6px; margin-top:6px; min-width:0; }
.lh-nr b { font-size:32px; line-height:36px; font-weight:650; letter-spacing:-.02em; font-variant-numeric:tabular-nums; color:var(--text); }
.lh-nr span { font-size:13px; color:var(--text2); min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-nr i { margin-left:auto; font-style:normal; font-size:12px; font-weight:500; color:var(--mstt); font-variant-numeric:tabular-nums; white-space:nowrap; }
.lh-dmeta { display:flex; justify-content:space-between; gap:8px; font-size:12.5px; line-height:17px; color:var(--text3); font-variant-numeric:tabular-nums; white-space:nowrap; }
.lh-dmeta .td,.lh-dmeta .tn { font-weight:500; }
.lh-dc.is-idle .lh-nr b { color:var(--text3); }

.lh-ra { display:flex; gap:2px; opacity:0; transition:opacity .15s; }
.lh-dc:hover .lh-ra,.lh-tr:hover .lh-ra,.lh-trow:hover .lh-ra,.lh-qc:hover .lh-ra,.lh-ra:focus-within,.lh-ra-on .lh-ra { opacity:1; }
body.is-mobile .lh-ra { opacity:1; }
@media (hover:none) { .lh-ra { opacity:1; } }
.lh-dc > .lh-ra { position:absolute; right:8px; top:8px; z-index:2; }
.lh-hub .lh-ra button { width:30px; height:30px; padding:0; border:0; border-radius:9px; background:var(--raised); box-shadow:var(--rshadow); color:var(--text2); display:grid; place-items:center; cursor:pointer; }
.lh-hub .lh-ra button:hover { background:var(--raisedh); color:var(--text); }
.lh-hub .lh-ra .lh-i { width:16px; height:16px; stroke-width:1.8; }

.lh-tbl { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; overflow:hidden; }
.lh-th,.lh-tr { display:grid; align-items:center; column-gap:12px; padding:0 14px; font-variant-numeric:tabular-nums; }
.lh-th { height:38px; font-size:12px; font-weight:500; color:var(--text3); border-bottom:.5px solid var(--sep); }
.lh-th .td,.lh-th .tn,.lh-th .tm,.lh-th .tl { font-weight:600; }
.lh-tr { min-height:58px; position:relative; font-size:14px; color:var(--text); cursor:pointer; }
.lh-tr + .lh-tr::before { content:""; position:absolute; left:14px; right:0; top:0; height:.5px; background:var(--sep); }
.lh-r { text-align:right; }
.lh-strong { font-size:17px; font-weight:600; }
.lh-mini { display:flex; align-items:center; gap:8px; color:var(--text2); font-size:13px; }
.lh-mini .lh-track { flex:1; }
.lh-tr .lh-ra button { background:transparent; box-shadow:none; color:var(--text3); }
.lh-tr:hover { background:var(--fill2); }

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
.lh-trow .lh-ra button { background:transparent; box-shadow:none; color:var(--text3); }
.lh-trow:hover { background:var(--fill2); }
`;

const phone = `
body.is-phone .modal.lh-hub { width:100vw; height:100vh; height:100dvh; max-height:none; border-radius:0; margin:0; }
body.is-phone .modal-container:has(.lh-hub) { padding:0; align-items:stretch; }
.lh-ph { position:relative; flex:1; min-height:0; display:flex; flex-direction:column; background:var(--base); isolation:isolate; overflow:hidden; }
.lh-ph .lh-capsule { top:calc(env(safe-area-inset-top,0px) + 10px); right:14px; }
.lh-hub .lh-ph .lh-capsule .lh-ib { width:44px; height:40px; background:transparent; }
.lh-pbody { flex:1; min-height:0; display:flex; flex-direction:column; gap:10px; padding:calc(env(safe-area-inset-top,0px) + 10px) 18px calc(env(safe-area-inset-bottom,0px) + 16px); overflow-y:auto; box-sizing:border-box; }
.lh-ph.is-home .lh-pbody { padding-top:calc(env(safe-area-inset-top,0px) + 64px); padding-bottom:calc(env(safe-area-inset-bottom,0px) + 112px); gap:11px; }
.lh-ptl { margin:0; font-size:30px; line-height:38px; font-weight:700; letter-spacing:-.02em; color:var(--text); }
.lh-psb { margin:2px 0 0; font-size:16px; line-height:23px; color:var(--text2); }
.lh-hub .lh-pbtn { width:100%; height:52px; flex:none; border:0; border-radius:14px; background:var(--btn); box-shadow:inset 0 .5px 0 rgba(255,255,255,.22),0 2px 10px rgba(91,72,184,.22); color:var(--onbtn); font-size:17px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; }
.lh-hub .lh-pbtn:hover { background:var(--btnh); }
.lh-hub .lh-pbtn svg:not(.lh-i) { width:14px; height:14px; fill:currentColor; }
.lh-hub .lh-pbtn.alt { background:var(--raised); color:var(--text); box-shadow:var(--rshadow); }
.lh-hub .lh-pbody > .lh-link,.lh-hub .lh-pmain > .lh-link { font-size:15px; min-height:30px; justify-content:center; flex:none; width:100%; }
.lh-pl { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; overflow:hidden; flex:none; }
.lh-hub .lh-pr { display:flex; align-items:center; justify-content:flex-start; gap:12px; width:100%; height:auto; min-height:52px; padding:8px 14px; position:relative; border:0; border-radius:0; background:none; box-shadow:none; color:var(--text); text-align:left; font-size:16px; cursor:pointer; }
.lh-hub .lh-pr:hover { background:none; }
.lh-pr + .lh-pr::before { content:""; position:absolute; left:58px; right:0; top:0; height:1px; background:var(--sep); }
.lh-pr b { display:block; font-size:16px; line-height:22px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-pr .lh-val { font-size:16px; font-weight:600; font-variant-numeric:tabular-nums; }
.lh-pr .lh-note { font-size:13px; line-height:18px; color:var(--text3); white-space:nowrap; }
.lh-pr .lh-chev { color:var(--text3); font-size:20px; line-height:1; }
.lh-hub .lh-pr .lh-pti { width:30px; height:30px; }
.lh-hub .lh-pr .lh-pti svg { width:17px; height:17px; }
.lh-tabg { position:absolute; left:44px; right:44px; bottom:calc(env(safe-area-inset-bottom,0px) + 24px); height:64px; border-radius:32px; z-index:4; display:flex; padding:4px; box-sizing:border-box; }
.lh-hub .lh-tabg button { flex:1; height:auto; border:0; border-radius:28px; background:transparent; box-shadow:none; color:var(--text); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; font-size:12px; font-weight:600; cursor:pointer; padding:0; }
.lh-hub .lh-tabg button.on { background:var(--tabon); color:var(--text); }
.lh-hub .lh-tabg button:not(.on) .lh-fi { opacity:.72; }
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
.lh-hub .lh-pcycle { width:40px; height:40px; flex:none; padding:0; border:0; border-radius:10px; background:var(--raised); box-shadow:var(--rshadow); color:var(--text2); display:grid; place-items:center; cursor:pointer; }
.lh-hub .lh-pcycle:hover { background:var(--raisedh); }
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
body.is-phone .lh-dc-go { display:none; }
/* Touch targets reach 44px through a transparent area; a select has no pseudo-element, so it uses clear borders. */
body.is-phone .lh-hub :is(.lh-seg button,.lh-btn,.lh-get,.lh-cc-st,.lh-ib,.lh-pcycle,.lh-pact,.lh-link,.lh-tree-summary,.lh-vid-btn,.lh-vid-len) { position:relative; }
body.is-phone .lh-hub :is(.lh-seg button,.lh-btn,.lh-get,.lh-cc-st,.lh-ib,.lh-pcycle,.lh-pact,.lh-link,.lh-tree-summary,.lh-vid-btn,.lh-vid-len)::after { content:""; position:absolute; left:50%; top:50%; width:max(100%,44px); height:max(100%,44px); transform:translate(-50%,-50%); }
body.is-phone .lh-seg:not(:has(> button:nth-child(6))) { overflow:visible; }
body.is-phone .lh-hub .lh-fp { height:44px; border-top:6px solid transparent; border-bottom:6px solid transparent; background-clip:padding-box; margin:-6px 0; }
body.is-phone .lh-scroll { margin:0; padding:0 0 20px; -webkit-mask-image:none; mask-image:none; overflow:visible; flex:none; }
`;

const fab = `
.lh-fab { position:fixed; z-index:9999; right:20px; bottom:calc(env(safe-area-inset-bottom,0px) + 88px); width:48px; height:48px; padding:0; border:0; border-radius:50%; display:grid; place-items:center; background:var(--raised); box-shadow:var(--rshadow),0 8px 24px rgba(0,0,0,.16); cursor:pointer; -webkit-tap-highlight-color:transparent; transition:transform .15s; }
.lh-fab:hover { background:var(--raisedh); transform:translateY(-1px); }
.lh-fab:focus-visible { outline:2px solid var(--focus); outline-offset:3px; }
`;

const motion = `
@media (prefers-reduced-motion:reduce) { .lh-hub *,.lh-hub *::before,.lh-hub *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; } }
`;

module.exports = tokens + shell + components + phone + fab + require("./hub-pages") + motion;
