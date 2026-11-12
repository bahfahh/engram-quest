"use strict";
// Page-level rules for the Hub redesign. `.lh-hub.lh-session` and similar double selectors exist to
// outrank the legacy sheet in styles/index.js, which marks most of these properties !important.

const session = `
.lh-session .modal-content { position:relative; }
.lh-hub .lh-btn.danger,.lh-theme .lh-btn.danger { background:var(--dang); color:#FFFFFF; box-shadow:inset 0 .5px 0 rgba(255,255,255,.2),0 1px 2px rgba(0,0,0,.16); }
.lh-hub .lh-btn.danger:hover,.lh-theme .lh-btn.danger:hover { background:var(--dang); filter:brightness(1.06); }
.lh-dark .lh-btn.danger { color:#1D1D1F; }
.lh-theme .lh-btn.lh-vtog { height:30px; padding:0 12px; font-size:12.5px; gap:6px; flex:none; }
.lh-theme .lh-btn.lh-vtog .lh-i { width:15px; height:15px; }
.lh-theme .lh-btn.lh-vtog.is-on { background:color-mix(in srgb,var(--mst) 16%,var(--raised)); color:var(--mstt); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--mst) 45%,transparent); }
.lh-theme .lh-btn.lh-vtog.is-star.is-on { background:color-mix(in srgb,var(--gold) 16%,var(--raised)); color:var(--text); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--gold) 50%,transparent); }
.lh-theme .lh-btn.lh-vtog.is-star.is-on .lh-i { fill:var(--gold); color:var(--gold); }
.lh-theme .lh-btn.lh-vtog.is-icon { width:30px; padding:0; }
.lh-hub .lh-qrow .lh-i { width:15px; height:15px; flex:none; color:var(--text3); }
.lh-hub .lh-qrow.is-done .lh-i { color:var(--mstt); }
.lh-hub .lh-qrow:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
.lh-theme .lh-btn.lh-vtog.is-danger:hover { color:var(--dang); }
.lh-theme .lh-btn.lh-vtog.lh-vsrc { max-width:180px; }
.lh-theme .lh-btn.lh-vtog.lh-vsrc span { overflow:hidden; text-overflow:ellipsis; }
.lh-choice { display:flex; flex-direction:column; gap:8px; padding:14px; border-radius:16px; background:var(--card); box-shadow:var(--cshadow); cursor:pointer; outline:none; }
.lh-choice:hover { background:var(--fill2); }
.lh-choice:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }

.lh-hub.lh-session > .modal-content { background:radial-gradient(55% 55% at 72% 0,var(--amb1),transparent 70%),radial-gradient(40% 45% at 24% 0,var(--amb2),transparent 70%),var(--base); }
.lh-hub.lh-session .lh-review-nav { background:transparent !important; border:0 !important; display:flex; align-items:center; gap:8px; padding:14px 14px 10px 18px; -webkit-backdrop-filter:none; backdrop-filter:none; box-shadow:none; }
.lh-hub.lh-session .lh-review-logo { display:flex; align-items:center; gap:9px; flex:none; color:var(--text) !important; font-size:16px; font-weight:700; text-transform:none; letter-spacing:-.01em; padding-right:14px; margin-right:2px; border-right:.5px solid var(--sep); white-space:nowrap; }
.lh-hub.lh-session .lh-review-tabs { display:flex; gap:4px; flex:1; min-width:0; overflow:hidden; }
.lh-hub.lh-session .lh-review-tab { display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 14px 0 10px; border:0 !important; background:transparent !important; color:var(--text) !important; font-size:14px; font-weight:500; border-radius:10px; box-shadow:none; cursor:pointer; opacity:1 !important; white-space:nowrap; transform:none; }
.lh-hub.lh-session .lh-review-tab:hover { background:var(--fill2) !important; }
.lh-hub.lh-session .lh-review-tab.active { background:var(--tabon) !important; color:var(--text) !important; font-weight:650; cursor:default; box-shadow:none !important; }
.lh-hub.lh-session .lh-review-back { display:inline-flex; align-items:center; gap:6px; flex:none; height:34px; padding:0 14px 0 10px; border:0 !important; background:var(--raised) !important; color:var(--text) !important; border-radius:10px; font-size:14px; font-weight:500; box-shadow:var(--rshadow); transform:none; }
.lh-hub.lh-session .lh-review-back:hover { background:var(--raisedh) !important; }
.lh-hub.lh-session .lh-review-back .lh-i { width:17px; height:17px; }
.lh-review-cap { display:flex; flex:none; padding:2px; margin-left:4px; border-radius:12px; background:var(--raised); box-shadow:var(--rshadow); }
.lh-hub .lh-review-cap .lh-ib { width:32px; height:30px; border-radius:9px; }
.lh-hub.lh-session .lh-review-card { background:var(--card) !important; color:var(--text) !important; border-radius:18px; box-shadow:var(--cshadow); }
.lh-hub.lh-session .lh-rc-top { display:flex; align-items:center; gap:8px; padding-bottom:12px; margin-bottom:16px; border-bottom:.5px solid var(--sep); }
.lh-rc-deck { display:flex; align-items:center; gap:10px; min-width:0; flex:0 1 auto; font-size:16px; font-weight:650; color:var(--text); }
.lh-rc-deck span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
:is(.lh-hub,.lh-theme) .lh-rc-deck .lh-i { width:22px; height:22px; stroke-width:1.5; color:var(--text2); }
.lh-rc-acts { display:flex; align-items:center; gap:6px; flex:none; }
.lh-hub.lh-session .lh-rc-edit-btn { display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 12px; background:var(--raised) !important; border:0 !important; color:var(--text) !important; border-radius:10px; font-size:13px; font-weight:500; box-shadow:var(--rshadow); white-space:nowrap; cursor:pointer; }
.lh-hub.lh-session .lh-rc-edit-btn:hover { background:var(--raisedh) !important; }
.lh-hub.lh-session .lh-rc-edit-btn:disabled { background:var(--fill2) !important; color:var(--text3) !important; box-shadow:none; cursor:default; }
.lh-hub.lh-session .lh-rc-edit-btn .lh-i { width:16px; height:16px; }
.lh-hub.lh-session .lh-rc-edit-btn.is-danger { color:var(--dang) !important; }
.lh-hub.lh-session .lh-rc-edit-btn.is-done { color:var(--mstt) !important; }
.lh-rc-src span { max-width:150px; overflow:hidden; text-overflow:ellipsis; }
:is(.lh-hub,.lh-theme) .lh-rc-src .lh-i:last-child { width:14px; height:14px; color:var(--text3); }
.lh-hub.lh-session .lh-rc-question { color:var(--text) !important; font-size:24px; line-height:1.45; font-weight:650; letter-spacing:-.01em; }
.lh-hub.lh-session .lh-rc-badge { background:var(--fill) !important; color:var(--text2) !important; border-radius:9px; font-weight:600; }
.lh-hub.lh-session .lh-hint { background:var(--fill2) !important; border:0 !important; border-left:0 !important; border-radius:12px; box-shadow:none; }
.lh-hub.lh-session .lh-hint .lh-hint-label { display:flex; align-items:center; gap:6px; color:var(--text2) !important; font-size:12.5px; font-weight:650; text-transform:none; letter-spacing:0; }
.lh-hub.lh-session .lh-hint .lh-hint-text { color:var(--text) !important; }
.lh-syg { margin-top:12px; padding:14px 16px 16px; border-radius:14px; background:var(--base); animation:lh-fadeslide .28s ease; --syg-wire:color-mix(in srgb,var(--text3) 60%,transparent); }
.lh-syg-head { display:flex; align-items:center; flex-wrap:wrap; gap:2px 8px; margin-bottom:12px; color:var(--text2); font-size:13px; line-height:18px; }
.lh-syg-head .lh-i { width:16px; height:16px; color:var(--tint); }
.lh-syg-name { color:var(--text); font-weight:650; }
.lh-syg-note { color:var(--text2); font-size:13.5px; line-height:1.5; }
.lh-syg-map + .lh-syg-note { margin-top:14px; }
.lh-syg-map { position:relative; }
.lh-syg-wires { display:none; position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; }
.lh-syg-wires path { fill:none; stroke:var(--syg-wire); stroke-width:1.5; }
.lh-syg-wires path.is-next { stroke-dasharray:4 4; }
.lh-syg-root { position:relative; display:flex; flex-direction:column; gap:2px; padding:10px 14px; border-radius:14px; background:var(--card); box-shadow:0 0 0 1.5px var(--focus),var(--cshadow); }
.lh-syg-root-cap { color:var(--tint); font-size:12px; font-weight:650; line-height:16px; }
.lh-syg-root-tt { color:var(--text); font-size:14.5px; font-weight:650; line-height:21px; }
.lh-syg-root-tt,.lh-syg-tt { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:anywhere; }
.lh-syg-tree { list-style:none; margin:0; padding:0 0 0 20px; }
.lh-syg-br > .lh-syg-tree { padding-left:24px; }
.lh-syg-tree > li { position:relative; margin:0; padding:10px 0 0 20px; }
.lh-syg-tree > li::before { content:""; position:absolute; left:0; top:0; bottom:0; border-left:1.5px solid var(--syg-wire); }
.lh-syg-side:last-child > li:last-child::before,.lh-syg-br > .lh-syg-tree > li:last-child::before { bottom:auto; height:10px; }
.lh-syg-br::after { content:""; position:absolute; left:0; top:10px; width:14px; height:10px; border:solid var(--syg-wire); border-width:0 0 1.5px 1.5px; border-bottom-left-radius:9px; }
.lh-syg-br.is-next::after { border-bottom-style:dashed; }
.lh-syg-tree > .lh-syg-grp { padding-top:16px; color:var(--text2); font-size:12.5px; font-weight:650; line-height:18px; }
.lh-syg-tree > .lh-syg-grp:first-child { padding-top:10px; }
.lh-syg-row { display:flex; flex-direction:column; gap:5px; min-width:0; }
.lh-syg-edge { color:var(--text); font-size:13.5px; font-weight:500; line-height:20px; overflow-wrap:anywhere; }
.lh-syg-edge.is-explicit { color:var(--text2); }
.lh-syg-node { display:flex; align-items:center; gap:10px; min-width:0; padding:8px 10px; border:1.5px solid transparent; border-radius:12px; }
.lh-syg-node.is-link { background:var(--card); box-shadow:var(--rshadow); cursor:pointer; transition:background .12s,box-shadow .12s; }
.lh-syg-node.is-link:hover { background:var(--raisedh); box-shadow:var(--cshadowh); }
.lh-syg-node.is-link:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
.lh-syg-br.is-next > .lh-syg-row > .lh-syg-node.is-link { background:transparent; border-color:var(--line); border-style:dashed; box-shadow:none; }
.lh-syg-br.is-next > .lh-syg-row > .lh-syg-node.is-link:hover { background:var(--card); }
.lh-syg-ic { flex:none; display:grid; place-items:center; width:32px; height:32px; border-radius:9px; background:var(--fill); color:var(--text2); }
.lh-syg-tx { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.lh-syg-tt { color:var(--text); font-size:14.5px; font-weight:600; line-height:20px; }
.lh-syg-meta { display:flex; align-items:center; gap:8px; min-width:0; color:var(--text2); font-size:12.5px; line-height:17px; }
.lh-syg-sub { min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-syg-st { flex:none; display:inline-flex; align-items:center; gap:5px; font-weight:650; white-space:nowrap; }
.lh-syg-st::before { content:""; width:8px; height:8px; border-radius:50%; background:var(--dot,currentColor); }
.lh-syg-st:is([data-state="mastered"],[data-state="done"]) { color:var(--mstt); --dot:var(--mst); }
.lh-syg-st:is([data-state="learning"],[data-state="seen"]) { color:var(--lrnt); --dot:var(--lrn); }
.lh-syg-st[data-state="unseen"] { color:var(--text3); }
.lh-syg-st[data-state="unseen"]::before { background:transparent; box-shadow:inset 0 0 0 1.5px currentColor; }
.lh-syg-cue { flex:none; display:grid; place-items:center; width:22px; height:22px; color:var(--tint); }
.lh-syg-cue .lh-i { width:16px; height:16px; transition:transform .15s; }
.lh-syg-cue.is-open .lh-i { transform:rotate(90deg); }
.lh-syg-back { margin-top:6px; padding:10px 12px; border-radius:12px; background:var(--card); box-shadow:inset 0 0 0 1px var(--sep); color:var(--text); font-size:14px; line-height:1.6; }
.lh-syg-back p:first-child { margin-top:0; }
.lh-syg-back p:last-child { margin-bottom:0; }
.lh-syg-br .lh-syg-br .lh-syg-node { gap:8px; padding:5px 8px; }
.lh-syg-br .lh-syg-br .lh-fi { --fi:24px !important; }
.lh-syg-br .lh-syg-br .lh-syg-ic { width:24px; height:24px; border-radius:7px; }
.lh-syg-br .lh-syg-br .lh-syg-ic .lh-i { width:15px; height:15px; }
.lh-syg-br .lh-syg-br .lh-syg-tt { font-size:13.5px; line-height:19px; }
.lh-syg-br .lh-syg-br .lh-syg-edge { font-size:13px; }
.lh-syg-map.is-map { display:grid; grid-template-columns:minmax(0,1fr) minmax(150px,190px) minmax(0,1fr); column-gap:52px; align-items:start; }
.lh-syg-map.is-map > .lh-syg-wires { display:block; }
.lh-syg-map.is-map > .lh-syg-root { position:sticky; top:10px; z-index:1; grid-column:2; grid-row:1; align-items:center; margin-top:22px; padding:14px 16px; border-radius:18px; text-align:center; }
.lh-syg-map.is-map .lh-syg-root-tt { -webkit-line-clamp:6; font-size:15px; line-height:22px; }
.lh-syg-map.is-map > .lh-syg-side { position:relative; grid-row:1; display:flex; flex-direction:column; gap:12px; padding:0; }
.lh-syg-map.is-map > .lh-syg-side.is-left { grid-column:1; }
.lh-syg-map.is-map > .lh-syg-side.is-right { grid-column:3; }
.lh-syg-map.is-map > .lh-syg-side > li { padding:0; }
.lh-syg-map.is-map > .lh-syg-side > li::before,.lh-syg-map.is-map > .lh-syg-side > li::after { display:none; }
.lh-syg-map.is-map > .lh-syg-side > .lh-syg-grp { margin-bottom:-4px; }
.lh-syg-map.is-map > .lh-syg-side > .lh-syg-grp ~ .lh-syg-grp { margin-top:8px; }
.lh-syg-map.is-map > .lh-syg-side > .lh-syg-br > .lh-syg-row { gap:7px; }
.lh-syg-map.is-map > .lh-syg-side > .lh-syg-br > .lh-syg-row > .lh-syg-edge { padding:0 2px 4px; border-bottom:1.5px solid var(--syg-wire); }
.lh-syg-map.is-map > .lh-syg-side > .lh-syg-br.is-next > .lh-syg-row > .lh-syg-edge { border-bottom-style:dashed; }
.lh-syg-map.is-map > .lh-syg-side.is-left > .lh-syg-grp,.lh-syg-map.is-map > .lh-syg-side.is-left > .lh-syg-br > .lh-syg-row > .lh-syg-edge { text-align:right; }
.lh-hub.lh-session .lh-answer-block { background:transparent !important; border:0 !important; border-left:0 !important; border-radius:0; box-shadow:none; }
.lh-hub.lh-session .lh-answer-header { display:flex; align-items:center; gap:8px; background:transparent; box-shadow:none; position:static; }
.lh-hub.lh-session .lh-answer-label { display:inline-flex; align-items:center; height:28px; padding:0 12px; border-radius:9px; background:var(--tabon); color:var(--text) !important; font-size:13.5px; font-weight:700; text-transform:none; letter-spacing:0; }
.lh-hub.lh-session .lh-answer-fmt-btns { display:flex; align-items:center; gap:6px; margin-left:auto; flex-wrap:wrap; justify-content:flex-end; }
.lh-hub.lh-session .lh-answer-text { color:var(--text) !important; font-size:16.5px; line-height:1.65; }
.lh-hub.lh-session .lh-answer-text mark { background:var(--fill); color:var(--text); }
.lh-hub.lh-session .lh-answer-text blockquote,.lh-hub.lh-session .lh-hint-text blockquote { border-left:3px solid var(--line); background:transparent; }
.lh-hub.lh-session .lh-pill-row { gap:10px; }
.lh-hub.lh-session .lh-pill-btn { display:inline-flex; align-items:center; justify-content:center; gap:10px; border:0 !important; background:var(--raised) !important; color:var(--text) !important; box-shadow:var(--rshadow) !important; border-radius:12px; font-size:15px; font-weight:600; min-height:46px; transform:none; filter:none; opacity:1; cursor:pointer; }
.lh-hub.lh-session .lh-pill-btn:hover { background:var(--raisedh) !important; }
.lh-hub.lh-session .lh-pill-btn .lh-i { width:20px; height:20px; }
.lh-hub.lh-session .lh-pill-show { background:var(--btn) !important; color:var(--onbtn) !important; box-shadow:inset 0 .5px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.16),0 3px 10px rgba(91,72,184,.2) !important; }
.lh-hub.lh-session .lh-pill-show:hover { background:var(--btnh) !important; }
.lh-hub.lh-session .lh-pill-btn.is-off { background:var(--fill2) !important; color:var(--text3) !important; box-shadow:none !important; cursor:not-allowed; }
.lh-hub.lh-session .lh-pill-btn.is-off .lh-fi { opacity:.45; filter:grayscale(.6); }
.lh-hub.lh-session .lh-pbtn.is-off { background:var(--fill2); color:var(--text3); box-shadow:none; cursor:not-allowed; }
.lh-hub.lh-session .lh-footer-meta { justify-content:flex-start; }
.lh-hub.lh-session .lh-pill-reset { width:auto; flex:none; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 12px 0 10px; background:var(--raised) !important; border:0 !important; color:var(--text) !important; border-radius:10px; font-size:13px; font-weight:500; box-shadow:var(--rshadow); }
.lh-hub.lh-session .lh-pill-reset:hover { background:var(--raisedh) !important; transform:none; }
.lh-hub.lh-session .lh-pill-reset .lh-i { width:16px; height:16px; }
.lh-hub.lh-session .lh-dot { background:var(--fill) !important; border:0; box-shadow:none; }
.lh-hub.lh-session .lh-dot.lit { background:var(--bar) !important; box-shadow:none; }
body:not(.is-phone) .lh-hub.lh-session .lh-review-progress { flex-direction:row; gap:14px; padding:12px 16px 16px; }
body:not(.is-phone) .lh-hub.lh-session .lh-review-prog-wrap { flex:1; }
.lh-hub.lh-session .lh-review-prog-wrap { background:var(--trk) !important; height:8px; border-radius:4px; }
.lh-hub.lh-session .lh-review-prog-bar { background:var(--bar) !important; border-radius:4px; }
.lh-hub.lh-session .lh-review-badge { background:transparent !important; color:var(--text) !important; box-shadow:none; padding:0; border-radius:0; font-size:14px; font-weight:600; font-variant-numeric:tabular-nums; }
.lh-hub.lh-session .lh-browse-note { background:var(--fill2) !important; border:0 !important; color:var(--text2) !important; }
.lh-hub.lh-session .lh-browse-btn { background:var(--raised) !important; border:0 !important; color:var(--text) !important; box-shadow:var(--rshadow); border-radius:12px; }
.lh-hub.lh-session .lh-browse-btn:hover { background:var(--raisedh) !important; }
.lh-hub.lh-session .lh-browse-btn:disabled { background:var(--fill2) !important; color:var(--text3) !important; box-shadow:none; }
.lh-hub.lh-session .lh-rating-row { gap:10px; }
.lh-hub.lh-session .lh-rating-btn { background:var(--raised) !important; box-shadow:var(--rshadow) !important; border:0 !important; transform:none; border-radius:14px; }
.lh-hub.lh-session .lh-rating-btn:hover { background:var(--raisedh) !important; }
.lh-hub.lh-session .lh-rating-btn::before { display:none; }
.lh-hub.lh-session .lh-rb-top { display:flex; align-items:center; justify-content:center; gap:7px; }
.lh-hub.lh-session .lh-rb-label { font-weight:650; font-size:16px; color:var(--text); }
.lh-hub.lh-session .lh-rb-icon { display:inline-grid; place-items:center; width:20px; height:20px; background:none !important; box-shadow:none; }
.lh-hub.lh-session .lh-rb-icon .lh-i { width:19px; height:19px; stroke-width:1.9; }
.lh-hub.lh-session .lh-rb-days { color:var(--text2); opacity:1; font-weight:500; font-size:12.5px; }
.lh-hub.lh-session .lh-rb-again .lh-rb-icon { color:var(--newt); }
.lh-hub.lh-session .lh-rb-hard .lh-rb-icon { color:var(--text2); }
.lh-hub.lh-session .lh-rb-good .lh-rb-icon { color:var(--duet); }
.lh-hub.lh-session .lh-rb-easy .lh-rb-icon { color:var(--mstt); }
body.is-phone .lh-hub.lh-session .lh-rb-icon { display:none; }
.lh-hub.lh-session .lh-edit-label,.lh-hub.lh-session .lh-edit-hints-label { color:var(--text3) !important; text-transform:none; letter-spacing:0; font-size:12px; font-weight:600; }
.lh-hub.lh-session .lh-edit-textarea { background:var(--card) !important; border:1px solid var(--sep) !important; color:var(--text) !important; box-shadow:none; }
.lh-hub.lh-session .lh-edit-textarea:focus { border-color:var(--focus) !important; box-shadow:0 0 0 3px color-mix(in srgb,var(--focus) 20%,transparent); }
.lh-hub.lh-session .lh-edit-save-btn { background:var(--btn) !important; color:var(--onbtn) !important; border-radius:10px; box-shadow:0 1px 2px rgba(0,0,0,.16) !important; transform:none; font-weight:600; }
.lh-hub.lh-session .lh-edit-cancel-btn { background:var(--raised) !important; border:0 !important; color:var(--text) !important; border-radius:10px; box-shadow:var(--rshadow); }
.lh-hub.lh-session .lh-timebox-clock { background:var(--fill); color:var(--text2); }

.lh-snav { display:flex; align-items:center; gap:4px; flex:none; min-height:44px; padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 0 18px; }
.lh-snav-count { flex:1; min-width:0; text-align:center; font-size:13px; font-weight:500; color:var(--text3); font-variant-numeric:tabular-nums; white-space:nowrap; }
.lh-snav-acts { display:flex; flex:none; }
.lh-hub .lh-sib { width:40px; height:44px; padding:0; border:0; background:transparent; box-shadow:none; color:var(--text2); display:grid; place-items:center; cursor:pointer; }
.lh-hub .lh-sib:hover { background:transparent; }
.lh-hub .lh-sib .lh-i { width:20px; height:20px; }
.lh-sprog { flex:none; height:3px; margin:4px 18px 0; border-radius:2px; background:var(--trk); overflow:hidden; }
.lh-sprog i { display:block; height:100%; background:var(--bar); }
body.is-phone .lh-hub.lh-session .lh-review-body { padding:14px 18px 0; overflow-y:auto; display:block; }
body.is-phone .lh-hub.lh-session .lh-review-body.has-bar { padding-bottom:calc(env(safe-area-inset-bottom,0px) + 118px); }
body.is-phone .lh-hub.lh-session .lh-review-body.has-grades { padding-bottom:calc(env(safe-area-inset-bottom,0px) + 150px); }
body.is-phone .lh-hub.lh-session .lh-review-card { background:transparent !important; box-shadow:none; padding:0; border-radius:0; overflow:visible; flex:none; display:flex; flex-direction:column; gap:10px; }
body.is-phone .lh-hub.lh-session .lh-rc-question { font-size:24px; line-height:33px; font-weight:600; letter-spacing:-.01em; flex:none; }
body.is-phone .lh-hub.lh-session .lh-rc-question.is-done { font-size:17px; line-height:25px; font-weight:500; color:var(--text2) !important; }
body.is-phone .lh-hub.lh-session .lh-hints-container { display:flex; flex-direction:column; gap:8px; }
body.is-phone .lh-hub.lh-session .lh-hints-container:empty,body.is-phone .lh-hub.lh-session .lh-synapse-container:empty { display:none; }
body.is-phone .lh-hub.lh-session .lh-hint { background:var(--card) !important; box-shadow:var(--cshadow); border-radius:14px; padding:12px 14px; margin:0; }
body.is-phone .lh-hub.lh-session .lh-hint-label { font-size:13px; line-height:18px; margin-bottom:3px; }
body.is-phone .lh-hub.lh-session .lh-hint-text { font-size:16px; line-height:24px; }
body.is-phone .lh-syg { margin:0; padding:12px 14px 14px; background:var(--card); box-shadow:var(--cshadow); }
body.is-phone .lh-syg-root,body.is-phone .lh-syg-back { background:var(--base); }
body.is-phone .lh-syg-node.is-link { background:var(--base); box-shadow:none; }
body.is-phone .lh-syg-node.is-link:active { background:var(--side); }
body.is-phone .lh-syg-br.is-next > .lh-syg-row > .lh-syg-node.is-link { background:transparent; }
body.is-phone .lh-syg-root-tt { -webkit-line-clamp:1; font-size:15px; line-height:22px; }
body.is-phone .lh-syg-edge { font-size:15px; line-height:22px; }
body.is-phone .lh-syg-br::after { height:11px; }
body.is-phone .lh-syg-tt { font-size:16px; line-height:22px; }
body.is-phone .lh-syg-meta,body.is-phone .lh-syg-grp,body.is-phone .lh-syg-head { font-size:13px; line-height:18px; }
body.is-phone .lh-syg-note { font-size:14.5px; }
body.is-phone .lh-syg-back { font-size:15px; }
body.is-phone .lh-hub.lh-session .lh-answer-block { background:var(--card) !important; box-shadow:var(--cshadow); border-radius:14px; padding:12px 16px 16px; margin:0; --lh-ans-px:16px; --lh-ans-py:12px; }
body.is-phone .lh-hub.lh-session .lh-answer-header { margin:0 0 4px; padding:0; min-height:18px; }
body.is-phone .lh-hub.lh-session .lh-answer-label { font-size:13px; line-height:18px; }
body.is-phone .lh-hub.lh-session .lh-answer-text { font-size:16px; line-height:25px; }
body.is-phone .lh-hub.lh-session .lh-answer-text.is-short { font-size:21px; line-height:31px; font-weight:600; letter-spacing:-.01em; }
.lh-hub .lh-open-note { align-self:flex-start; min-height:30px; }
.lh-sbar { position:absolute; left:12px; right:12px; bottom:calc(env(safe-area-inset-bottom,0px) + 30px); z-index:3; border-radius:22px; padding:10px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box; }
.lh-sbar-row { flex-direction:row; }
.lh-hub .lh-sbar-row .lh-pbtn.alt { flex:0 0 43%; width:auto; }
.lh-hub .lh-sbar-row .lh-pbtn:not(.alt) { flex:1; width:auto; }
.lh-sbar-title { text-align:center; font-size:13px; line-height:18px; color:var(--text2); }
body.is-phone .lh-hub.lh-session .lh-sbar .lh-rating-row { grid-template-columns:repeat(4,minmax(0,1fr)); gap:0; padding:0; background:var(--fill); border-radius:14px; overflow:hidden; }
body.is-phone .lh-hub.lh-session .lh-sbar .lh-rating-btn { background:transparent !important; border:0; border-radius:0; min-height:62px; padding:0 2px; gap:2px; }
body.is-phone .lh-hub.lh-session .lh-sbar .lh-rb-good { background:var(--tabon) !important; }
body.is-phone .lh-hub.lh-session .lh-sbar .lh-browse-row { padding:0; }
`;

const library = `
.lh-unread { display:inline-flex; align-items:center; gap:6px; color:var(--duet); font-weight:600; font-variant-numeric:tabular-nums; }
.lh-unread::before { content:""; width:7px; height:7px; border-radius:50%; background:var(--due); flex:none; }
.lh-xhead { display:flex; align-items:center; gap:12px; min-height:44px; margin-bottom:12px; }
.lh-hub .lh-btn.lh-back { height:32px; padding:0 12px 0 8px; font-size:13px; gap:4px; flex:none; }
.lh-xdeck { font-size:18px; line-height:24px; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-st { flex:none; font-size:12px; line-height:22px; font-weight:650; padding:0 9px; border-radius:7px; white-space:nowrap; }
.lh-st.td { background:color-mix(in srgb,var(--new) 15%,transparent); color:var(--newt); }
.lh-st.tl { background:color-mix(in srgb,var(--due) 15%,transparent); color:var(--duet); }
.lh-st.tm { background:color-mix(in srgb,var(--mst) 18%,transparent); color:var(--mstt); }
.lh-xpt { display:flex; align-items:center; gap:6px; min-width:0; }
.lh-xstar { color:var(--text2); display:grid; flex:none; }
.lh-hub .lh-xstar .lh-i { width:14px; height:14px; fill:currentColor; }
.lh-xbadge { flex:none; font-size:11px; line-height:16px; color:var(--text3); background:var(--fill2); border-radius:6px; padding:0 6px; white-space:nowrap; }

.lh-mgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px; }
.lh-dh { display:flex; align-items:center; gap:12px; min-width:0; }
.lh-hub .lh-dh .lh-gi,.lh-hub .lh-trow > .lh-gi { width:42px; height:42px; border-radius:12px; background:var(--fill2); }
.lh-mf { display:flex; align-items:center; gap:8px; min-width:0; margin-top:auto; padding-top:12px; border-top:.5px solid var(--sep); }
.lh-hub .lh-dc.lh-mc { gap:10px; }
.lh-hub .lh-mf .lh-open { flex:1; }
.lh-hub .lh-open { height:32px; font-size:13px; gap:6px; padding:0 12px; }
.lh-hub .lh-open .lh-i { width:15px; height:15px; color:var(--text3); }
.lh-chips { display:flex; flex-wrap:wrap; gap:6px; min-width:0; }
.lh-chip { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; line-height:20px; font-weight:600; padding:0 8px; border-radius:7px; background:color-mix(in srgb,var(--due) 14%,transparent); color:var(--duet); }

.lh-qgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(400px,100%),1fr)); gap:12px; }
.lh-qc { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; overflow:hidden; position:relative; display:flex; min-width:0; cursor:pointer; }
.lh-qc > .lh-ra,.lh-qc > .lh-ra-phone { position:absolute; left:8px; top:8px; z-index:2; }
.lh-hub .lh-qc .lh-ra button,.lh-hub .lh-qc .lh-ra-phone button { background:var(--glass); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px); width:32px; height:32px; border-radius:8px; color:var(--text); }
.lh-qcov { width:116px; flex:none; background-color:var(--fill2); background-size:cover; background-position:center; }
.lh-qb { padding:12px 14px; display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
.lh-qt { display:flex; align-items:center; gap:8px; min-width:0; }
.lh-scn { font-size:13px; line-height:18px; color:var(--text2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-stars { display:flex; gap:1px; flex:none; font-size:15px; line-height:18px; color:var(--gold); }
.lh-stars i { font-style:normal; color:var(--text3); opacity:.55; }
.lh-qmeta { font-size:12px; line-height:16px; color:var(--text3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-qmeta b { font-weight:600; }
.lh-qf { display:flex; align-items:flex-end; gap:14px; margin-top:6px; }
.lh-qpt { display:flex; justify-content:space-between; gap:8px; margin-bottom:4px; font-size:12px; line-height:16px; color:var(--text3); font-variant-numeric:tabular-nums; white-space:nowrap; }
.lh-hub .lh-get { height:34px; flex:none; display:inline-flex; align-items:center; gap:6px; padding:0 14px 0 11px; border:0; border-radius:10px; background:var(--btn); box-shadow:inset 0 .5px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.16); color:var(--onbtn); font-size:13px; font-weight:650; white-space:nowrap; cursor:pointer; }
.lh-hub .lh-get:hover { background:var(--btnh); }
.lh-hub .lh-get .lh-i { width:15px; height:15px; stroke-width:2; }
.lh-hub .lh-get.is-boss { background:var(--dang); color:#FFFFFF; }
.lh-hub .lh-get.is-boss:hover { background:var(--dang); filter:brightness(1.07); }
.lh-dark .lh-get.is-boss { color:#1D1D1F; }
.lh-hub .lh-get.is-cleared { background:color-mix(in srgb,var(--mst) 18%,transparent); color:var(--mstt); box-shadow:none; }
.lh-hub .lh-get.is-cleared:hover { background:color-mix(in srgb,var(--mst) 26%,transparent); }
.lh-qthumb { width:72px; height:72px; flex:none; border-radius:10px; background-color:var(--fill2); background-size:cover; background-position:center; }
.lh-qdiff { flex:none; font-size:12px; font-weight:600; color:var(--text3); }
body.is-phone .lh-qthumb { display:none; }
body.is-phone .lh-qcov { width:84px; }
body.is-phone .lh-hub .lh-get { height:36px; border-radius:18px; }
`;

const lessons = `
.lh-lwrap { flex:1; min-height:0; display:flex; gap:16px; }
.lh-lmain { min-width:0; flex:1; display:flex; flex-direction:column; gap:10px; }
.lh-lmain > * { flex:none; }
.lh-lfilters .lh-fp { max-width:170px; }
.lh-cstrip { display:flex; gap:12px; overflow-x:auto; padding:2px; margin:0 -2px; scrollbar-width:none; }
.lh-cstrip::-webkit-scrollbar { display:none; }
.lh-cgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; padding:2px; }
.lh-cempty { padding:24px; }
.lh-cc { width:252px; flex:none; box-sizing:border-box; background:var(--card); box-shadow:var(--cshadow); border-radius:16px; padding:14px; position:relative; display:flex; flex-direction:column; gap:8px; cursor:pointer; min-width:0; }
.lh-cgrid .lh-cc { width:auto; }
.lh-cc.sel { box-shadow:0 0 0 2px var(--btn); }
.lh-cc-nm { font-size:15px; line-height:20px; font-weight:600; color:var(--text); padding-right:6px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word; }
.lh-cc-em { width:34px; height:34px; border-radius:9px; background:var(--fill2); display:grid; place-items:center; font-size:18px; flex:none; }
.lh-hub .lh-cc-st { position:absolute; right:8px; top:6px; width:32px; height:32px; padding:0; border:0; background:transparent; box-shadow:none; color:var(--text3); font-size:16px; line-height:1; cursor:pointer; }
.lh-hub .lh-cc-st:hover { background:transparent; }
.lh-hub .lh-cc-st.on { color:var(--text); }
.lh-cc-tag { align-self:flex-start; }
.lh-cc-tags { display:flex; gap:4px; flex-wrap:wrap; }
.lh-cc-desc { font-size:12px; line-height:17px; color:var(--text2); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.lh-cc-done { margin-top:auto; font-size:13px; line-height:18px; color:var(--text2); font-variant-numeric:tabular-nums; }
.lh-chead { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:6px; }
.lh-ct { flex:1 1 100px; min-width:0; font-size:18px; line-height:24px; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-hub .lh-ib-sm { width:32px; height:32px; }
.lh-hub .lh-ib-sm.on { background:var(--fill); color:var(--tint); }
.lh-ls { display:flex; align-items:center; gap:12px; min-height:52px; padding:8px 8px 8px 14px; position:relative; box-sizing:border-box; cursor:pointer; color:var(--text); }
.lh-ls + .lh-ls::before { content:""; position:absolute; left:48px; right:0; top:0; height:.5px; background:var(--sep); }
.lh-lic { width:22px; height:22px; display:grid; flex:none; color:var(--text3); }
.lh-hub .lh-lic .lh-i { width:22px; height:22px; stroke-width:1.8; }
.lh-hub .lh-lic.tm { color:var(--mstt); } .lh-hub .lh-lic.tl { color:var(--lrnt); }
.lh-ls-t { font-size:15px; line-height:20px; font-weight:500; min-width:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word; }
.lh-ls-goal { margin-top:2px; font-size:13px; line-height:18px; color:var(--text3); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.lh-ls:not(.lh-ladd):hover { background:var(--fill2); }
.lh-st:not(.td):not(.tl):not(.tm) { background:var(--fill); color:var(--text2); }
.lh-ls-chev { display:grid; flex:none; width:16px; color:var(--text3); }
.lh-hub .lh-ls-chev .lh-i { width:16px; height:16px; }
.lh-ls:hover .lh-ra { opacity:1; }
.lh-hub .lh-ls .lh-ra button { background:transparent; color:var(--text3); }
.lh-ladd { color:var(--tint); }
.lh-hub .lh-ladd .lh-lic { color:var(--tint); }
.lh-hub .lh-ladd input { all:unset; flex:1; min-width:0; height:32px; padding:0 10px; border-radius:8px; background:var(--fill); color:var(--text); font-size:14px; box-sizing:border-box; }
.lh-lform.modal-content label { display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--text2); }
.lh-lform input,.lh-lform textarea { width:100%; padding:8px 10px; border:0; border-radius:9px; background:var(--fill); color:var(--text); font:inherit; font-size:14px; box-shadow:none; box-sizing:border-box; resize:vertical; }
.lh-lside { width:254px; flex:none; display:flex; flex-direction:column; gap:12px; overflow-y:auto; padding:2px 2px 12px; scrollbar-width:none; box-sizing:border-box; }
.lh-lside::-webkit-scrollbar { display:none; }
.lh-pnl { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; padding:16px 18px; }
.lh-pnl-fill { flex:1 0 auto; }
.lh-pnl-t { font-size:16px; line-height:22px; font-weight:700; color:var(--text); margin-bottom:10px; }
.lh-dn { position:relative; margin:0 auto 12px; }
.lh-dn svg { display:block; width:100%; height:100%; }
.lh-dnc { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.1; }
.lh-dnc b { font-size:26px; font-weight:600; letter-spacing:-.01em; font-variant-numeric:tabular-nums; color:var(--text); }
.lh-dnc span { font-size:12px; color:var(--text3); }
.lh-rw { display:flex; justify-content:space-between; align-items:center; gap:8px; height:26px; font-size:13px; font-weight:500; color:var(--text2); font-variant-numeric:tabular-nums; }
.lh-rw + .lh-rw { border-top:.5px solid var(--sep); }
.lh-rw b { font-weight:600; color:var(--text); }
.lh-rec { display:flex; flex-direction:column; padding:5px 0; cursor:pointer; min-width:0; }
.lh-rec b { font-size:14px; line-height:20px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-rec span { font-size:12px; line-height:16px; color:var(--text3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
body.is-phone .lh-lwrap { flex:none; flex-direction:column; }
body.is-phone .lh-lmain { flex:none; }
body.is-phone .lh-lside { width:auto; overflow:visible; padding:0; }
body.is-phone .lh-cc { width:220px; }
body.is-phone .lh-ct { flex-basis:100%; }
body.is-phone .lh-chead .lh-seg { flex-basis:100%; }
body.is-phone .lh-hd:has(.lh-hd-right) { align-items:center; }
`;

const achievements = `
.lh-ach-charts { display:grid; grid-template-columns:330px minmax(0,1fr); gap:12px; padding:0 0 12px; }
.lh-ach-fam { display:flex; align-items:center; gap:18px; }
.lh-ach-fam .lh-dn { margin:0; flex:none; }
.lh-ach-fam .lh-dnc b { font-size:24px; }
.lh-ach-act { min-width:0; display:flex; flex-direction:column; gap:10px; }
.lh-ach-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.lh-ach-head .lh-pnl-t { margin:0; }
.lh-hub .lh-seg-s button { height:24px; padding:0 8px; font-size:12px; }
.lh-acs { margin-left:auto; display:flex; gap:16px; font-size:13px; color:var(--text2); white-space:nowrap; }
.lh-acs b { font-weight:600; color:var(--text); font-variant-numeric:tabular-nums; }
.lh-bars { display:flex; align-items:flex-end; gap:3px; height:74px; }
.lh-bars.dense { gap:1px; }
.lh-bars i { flex:1; min-height:2px; background:color-mix(in srgb,var(--bar) 72%,var(--card)); border-radius:3px 3px 1px 1px; transition:background .12s; }
.lh-bars i:not(.zero):hover { background:var(--bar); }
.lh-bars i.zero { background:var(--trk); }
.lh-ach-coll { display:flex; align-items:baseline; gap:8px; margin:6px 0 10px; }
.lh-ach-coll .lh-pnl-t { margin:0; font-size:18px; line-height:24px; }
.lh-acg { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:10px; }
.lh-ac { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; padding:12px 10px; transition:box-shadow .15s; display:flex; flex-direction:column; align-items:center; text-align:center; gap:3px; position:relative; cursor:pointer; min-width:0; }
.lh-ac img,.lh-ach-img img { width:72px; height:72px; margin:-4px; display:block; clip-path:inset(8% round 20%); }
.lh-ac.round img,.lh-ach-img.round img { clip-path:circle(43%); }
.lh-ac.off img,.lh-ach-img.off img { filter:var(--locked); }
.lh-ac b { font-size:13px; line-height:17px; font-weight:600; color:var(--text); margin-top:2px; }
.lh-ac small { font-size:11.5px; line-height:15px; color:var(--text3); }
.lh-ac:hover,.lh-ac:focus-visible { box-shadow:var(--cshadowh); }
.lh-ac:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
.lh-ach-rar { position:absolute; right:9px; top:7px; font-size:10px; line-height:14px; font-weight:600; color:var(--text3); letter-spacing:.03em; }
.lh-ach-modal.modal { width:min(92vw,420px); padding:0; border:0; border-radius:16px; background:var(--card); color:var(--text); overflow:hidden; }
.lh-ach-modal .modal-content { position:relative; padding:24px; display:flex; flex-direction:column; align-items:stretch; text-align:center; gap:8px; }
.lh-ach-img { align-self:center; }
.lh-ach-img img { width:112px; height:112px; margin:0; }
.lh-ach-prog { margin:10px 0 0; }
@media (max-width:1039px) { body:not(.is-phone) .lh-ach-charts { grid-template-columns:minmax(0,1fr); } }
body.is-phone .lh-ach-charts { grid-template-columns:minmax(0,1fr); }
body.is-phone .lh-acs { margin-left:0; width:100%; justify-content:space-between; }
body.is-phone .lh-acg { grid-template-columns:repeat(2,minmax(0,1fr)); }
`;

// The Help dialog and the first-run feature guides (src/hub/help.js, src/hub/feature-guide.js).
const help = `
.modal.lh-hub.lh-help { width:min(94vw,780px); height:min(90vh,800px); }
.lh-help-head { display:flex; align-items:center; gap:8px; flex:none; padding:16px 14px 8px 24px; }
.lh-help-title { flex:1; min-width:0; margin:0; font-size:22px; line-height:28px; font-weight:700; letter-spacing:-.01em; color:var(--text); }
.lh-help-body { flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding:4px 24px 28px; }
.lh-help-body > * { flex:none; }
.lh-help-lead { margin:0; font-size:15px; line-height:23px; color:var(--text2); }
.lh-help-note { margin:0; font-size:13px; line-height:19px; color:var(--text3); }
.lh-help-h { margin:10px 0 0; font-size:17px; line-height:22px; font-weight:600; color:var(--text); }
.lh-help-map { display:flex; flex-wrap:wrap; align-items:flex-start; gap:12px; }
.lh-help-grp { flex:1 1 220px; min-width:0; background:var(--card); box-shadow:var(--cshadow); border-radius:16px; padding:4px 0; overflow:hidden; }
.lh-help-grp-h { display:flex; align-items:baseline; gap:8px; padding:10px 14px 6px; }
.lh-help-grp-h b { font-size:13px; font-weight:600; color:var(--text); }
.lh-help-grp-h span { font-size:12px; color:var(--text3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-hub .lh-help-tab { display:flex; align-items:center; gap:10px; width:100%; min-height:48px; padding:6px 10px 6px 14px; position:relative; color:var(--text); text-align:left; cursor:pointer; }
.lh-hub .lh-help-tab:hover { background:var(--fill2); }
.lh-hub .lh-help-tab:focus-visible,.lh-hub .lh-help-sec-h:focus-visible,.lh-hub .lh-guide-opt:focus-visible { outline:2px solid var(--tint); outline-offset:-2px; }
:is(.lh-help,.lh-guide) :is(.lh-link,.lh-guide-back,.lh-guide-zoom,.lh-guide-yt):focus-visible { outline:2px solid var(--tint); outline-offset:2px; border-radius:4px; }
.lh-help-tab + .lh-help-tab::before { content:""; position:absolute; left:50px; right:0; top:0; height:.5px; background:var(--sep); }
.lh-help-tab > .lh-i { width:16px; height:16px; color:var(--text3); }
.lh-help-tab-tx { flex:1; min-width:0; display:flex; flex-direction:column; }
.lh-help-tab-nm { display:flex; align-items:center; gap:6px; font-size:14px; line-height:19px; font-weight:600; }
.lh-help-tab-sub { font-size:12px; line-height:16px; color:var(--text3); }
.lh-help-pro { font-size:11px; line-height:16px; font-weight:600; color:var(--text2); background:var(--fill); padding:0 6px; border-radius:6px; }
.lh-help-acc { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; overflow:hidden; }
.lh-help-sec + .lh-help-sec { border-top:.5px solid var(--sep); }
.lh-hub .lh-help-sec-hd { margin:0; font:inherit; }
.lh-hub .lh-help-sec-h { display:flex; align-items:center; gap:12px; width:100%; min-height:52px; padding:8px 14px; color:var(--text); text-align:left; cursor:pointer; }
.lh-hub .lh-help-sec-h:hover { background:var(--fill2); }
.lh-hub .lh-help-sec-h .lh-gi { width:26px; height:26px; border-radius:7px; }
.lh-hub .lh-help-sec-h .lh-gi .lh-i { width:15px; height:15px; }
.lh-help-sec-t { flex:1; min-width:0; font-size:15px; line-height:20px; font-weight:600; }
.lh-help-tag { flex:none; max-width:45%; font-size:12px; line-height:16px; color:var(--text3); text-align:right; }
.lh-help-tag.pro { color:var(--text2); background:var(--fill); padding:1px 7px; border-radius:6px; font-weight:600; }
.lh-help-chev { display:grid; flex:none; color:var(--text3); transition:transform .15s; }
.lh-help-chev .lh-i { width:16px; height:16px; }
.lh-help-sec-h[aria-expanded="true"] .lh-help-chev { transform:rotate(90deg); }
.lh-help-sec-b { padding:0 20px 18px 52px; font-size:14px; line-height:22px; color:var(--text); }
.lh-help-sec-b[hidden] { display:none; }
.lh-help-sec-b p { margin:8px 0; }
.lh-help-sec-b h4 { margin:16px 0 4px; font-size:14px; line-height:20px; font-weight:600; color:var(--text); }
.lh-help-sec-b ol,.lh-help-sec-b ul { margin:6px 0; padding-left:20px; }
.lh-help-sec-b li { margin:4px 0; }
.lh-help-sec-b li::marker { color:var(--text3); }
.lh-help-sec-b strong,.lh-guide-body strong { font-weight:600; color:var(--text); }
:is(.lh-help-sec-b,.lh-guide-body) code { font-family:var(--font-monospace,ui-monospace,monospace); font-size:.9em; background:var(--fill); color:var(--text); padding:1px 5px; border-radius:5px; }
.lh-help-sec-b pre { margin:8px 0; padding:10px 12px; border-radius:10px; background:var(--fill2); color:var(--text); font-family:var(--font-monospace,ui-monospace,monospace); font-size:12.5px; line-height:19px; white-space:pre-wrap; overflow-wrap:anywhere; }
.lh-help-tbl { margin:8px 0; overflow-x:auto; border-radius:10px; background:var(--fill2); }
.lh-help-tbl table { width:100%; border-collapse:collapse; font-size:13px; line-height:19px; }
.lh-help-tbl th { padding:7px 10px; text-align:left; vertical-align:bottom; font-size:12px; font-weight:600; color:var(--text3); border-bottom:.5px solid var(--sep); }
.lh-help-tbl td { padding:8px 10px; vertical-align:top; color:var(--text); border-bottom:.5px solid var(--sep); }
.lh-help-tbl tr:last-child td { border-bottom:0; }
.lh-help-tbl code { white-space:nowrap; }
.lh-help-say { display:flex; flex-direction:column; align-items:flex-start; gap:6px; margin:8px 0; }
.lh-help-say-i { max-width:100%; padding:7px 12px; border-radius:14px 14px 14px 4px; background:var(--fill); color:var(--text); font-size:13.5px; line-height:20px; }
.lh-help-aside { margin:12px 0 4px; padding:10px 12px; border-radius:12px; background:var(--fill2); color:var(--text2); font-size:13px; line-height:20px; }
.lh-help-first,.lh-guide-first { margin:12px 0 4px; padding:10px 12px; border-radius:12px; box-shadow:inset 0 0 0 1px var(--sep); font-size:13.5px; line-height:21px; color:var(--text); }
.lh-help-first-h,.lh-guide-first-h { margin-bottom:2px; font-size:12px; line-height:16px; font-weight:600; color:var(--tint); }
.lh-help-acts { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
.lh-help-foot { display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:8px; padding-top:8px; font-size:13px; color:var(--text3); }
body.is-phone .lh-help-head { padding:calc(env(safe-area-inset-top,0px) + 8px) 8px 6px 18px; }
body.is-phone .lh-help-title { font-size:20px; }
body.is-phone .lh-help-body { padding:4px 16px calc(env(safe-area-inset-bottom,0px) + 24px); }
body.is-phone .lh-help-sec-b { padding:0 14px 16px; }
body.is-phone .lh-help-tag:not(.pro) { display:none; }

.modal.lh-hub.lh-guide { width:min(92vw,520px); height:auto; max-height:min(88vh,780px); display:flex; flex-direction:column; }
.lh-hub.lh-guide > .modal-content { height:auto; flex:1 1 auto; min-height:0; }
.lh-guide-hero { position:relative; flex:none; background:var(--fill2); border-bottom:.5px solid var(--sep); cursor:zoom-in; }
.lh-guide-hero[hidden],.lh-guide-fig[hidden] { display:none; }
.lh-guide-hero img { display:block; width:100%; max-height:32vh; object-fit:contain; }
.lh-hub .lh-guide-zoom { position:absolute; right:8px; bottom:8px; padding:3px 10px; border-radius:99px; background:var(--glass); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px); color:var(--text); font-size:11px; line-height:16px; font-weight:600; cursor:zoom-in; }
.lh-guide-body { flex:1 1 auto; min-height:0; overflow-y:auto; padding:16px 22px 12px; font-size:14px; line-height:22px; color:var(--text); }
.lh-guide-body > p,.lh-guide-p { margin:8px 0; color:var(--text); }
.lh-guide-title { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
.lh-guide-title h2,.lh-guide-ptitle { margin:0; min-width:0; font-size:17px; line-height:23px; font-weight:600; color:var(--text); }
.lh-guide-ptitle { margin:4px 0 8px; }
.lh-guide-pick { margin:16px 0 6px; font-size:12px; line-height:16px; font-weight:600; color:var(--text3); }
.lh-guide-opts { background:var(--card); box-shadow:var(--cshadow); border-radius:14px; overflow:hidden; }
.lh-hub .lh-guide-opt { display:flex; align-items:center; gap:10px; width:100%; min-height:52px; padding:8px 12px 8px 14px; position:relative; color:var(--text); text-align:left; cursor:pointer; }
.lh-hub .lh-guide-opt:hover { background:var(--fill2); }
.lh-guide-opt + .lh-guide-opt::before { content:""; position:absolute; left:14px; right:0; top:0; height:.5px; background:var(--sep); }
.lh-guide-opt b { display:block; font-size:15px; line-height:20px; font-weight:600; }
.lh-guide-opt span span { display:block; font-size:12px; line-height:16px; color:var(--text3); }
.lh-guide-opt > .lh-i { width:16px; height:16px; color:var(--text3); }
.lh-hub .lh-guide-back { min-height:32px; color:var(--tint); font-size:14px; font-weight:500; cursor:pointer; }
.lh-guide-fig { position:relative; margin:12px 0; }
.lh-guide-cap { margin-bottom:5px; font-size:12px; line-height:16px; font-weight:600; color:var(--text3); }
.lh-guide-img { cursor:zoom-in; }
.lh-guide-img img { display:block; width:100%; max-height:30vh; object-fit:contain; border-radius:10px; background:var(--fill2); }
.lh-guide-vid { position:relative; aspect-ratio:16/9; border-radius:10px; overflow:hidden; background:var(--fill); }
.lh-guide-vid iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
.lh-hub .lh-guide-yt { display:inline-block; margin-top:5px; font-size:12px; color:var(--tint); text-decoration:none; }
.lh-hub .lh-guide-yt:hover { text-decoration:underline; }
.lh-guide-foot { flex:none; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 22px; border-top:.5px solid var(--sep); }
.lh-guide-hint { min-width:0; font-size:12px; line-height:16px; color:var(--text3); }
body.is-phone .lh-guide-body { padding:calc(env(safe-area-inset-top,0px) + 12px) 18px 12px; }
body.is-phone .lh-guide-hero { padding-top:env(safe-area-inset-top,0px); }
body.is-phone .lh-guide-hero:not([hidden]) + .lh-guide-body { padding-top:14px; }
body.is-phone .lh-guide-foot { padding:10px 18px calc(env(safe-area-inset-bottom,0px) + 12px); }
body.is-phone .lh-hub .lh-guide-back { min-height:44px; font-size:17px; }

.eq-guide-lightbox { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; padding:24px; background:rgba(0,0,0,.88); cursor:zoom-out; -webkit-tap-highlight-color:transparent; }
.eq-guide-lightbox img { max-width:96vw; max-height:96vh; object-fit:contain; border-radius:8px; }
`;

module.exports = session + library + lessons + achievements + help;
