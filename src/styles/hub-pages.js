"use strict";
// Page-level rules for the Hub redesign. `.lh-hub.lh-session` and similar double selectors exist to
// outrank the legacy sheet in styles/index.js, which marks most of these properties !important.

const session = `
.lh-session .modal-content { position:relative; }
.lh-hub .lh-btn.danger { background:var(--newt); color:var(--card); }
.lh-theme .lh-btn { height:32px; padding:0 14px; border:0; border-radius:9px; background:var(--btn); box-shadow:none; color:var(--onbtn); font-size:13px; font-weight:600; cursor:pointer; }
.lh-theme .lh-btn.alt { background:var(--fill); color:var(--text); }
.lh-theme .lh-btn.danger { background:var(--newt); color:var(--card); }
.lh-choice { display:flex; flex-direction:column; gap:8px; padding:14px; border-radius:16px; background:var(--card); box-shadow:var(--cshadow); cursor:pointer; outline:none; }
.lh-choice:hover { background:var(--fill2); }
.lh-choice:focus-visible { outline:2px solid var(--tint); }

.lh-hub.lh-session .lh-review-nav { background:transparent !important; border-bottom:.5px solid var(--sep); -webkit-backdrop-filter:none; backdrop-filter:none; }
.lh-hub.lh-session .lh-review-logo { color:var(--text3) !important; text-transform:none; letter-spacing:0; font-size:13px; font-weight:600; }
.lh-hub.lh-session .lh-review-tab { border:0 !important; background:var(--fill2) !important; color:var(--text2) !important; font-weight:500; border-radius:9px; box-shadow:none; }
.lh-hub.lh-session .lh-review-tab.active { background:var(--fill) !important; color:var(--text) !important; font-weight:600; box-shadow:none; }
.lh-hub.lh-session .lh-review-back { border:0 !important; background:var(--fill) !important; color:var(--text) !important; border-radius:9px; font-weight:500; box-shadow:none; transform:none; }
.lh-hub.lh-session .lh-review-card { background:var(--card) !important; color:var(--text) !important; border-radius:16px; box-shadow:var(--cshadow); }
.lh-hub.lh-session .lh-rc-question { color:var(--text) !important; font-weight:600; }
.lh-hub.lh-session .lh-rc-badge { background:var(--fill) !important; color:var(--text2) !important; border-radius:9px; font-weight:600; }
.lh-hub.lh-session .lh-rc-edit-btn { background:var(--fill2) !important; border:0 !important; color:var(--text2) !important; border-radius:9px; font-weight:500; box-shadow:none; }
.lh-hub.lh-session .lh-rc-edit-btn:hover { background:var(--fill) !important; }
.lh-hub.lh-session .lh-hint { background:var(--fill2) !important; border-left:0; border-radius:12px; }
.lh-hub.lh-session .lh-hint .lh-hint-label { color:var(--text3) !important; font-size:12px; font-weight:600; text-transform:none; letter-spacing:0; }
.lh-hub.lh-session .lh-hint .lh-hint-text { color:var(--text) !important; }
.lh-hub.lh-session .lh-answer-block { background:var(--fill2) !important; border-left:0; border-radius:12px; }
.lh-hub.lh-session .lh-answer-header { background:transparent; box-shadow:none; position:static; }
.lh-hub.lh-session .lh-answer-label { color:var(--text3) !important; font-size:12px; font-weight:600; text-transform:none; letter-spacing:0; }
.lh-hub.lh-session .lh-answer-text { color:var(--text) !important; }
.lh-hub.lh-session .lh-answer-text mark { background:var(--fill); color:var(--text); }
.lh-hub.lh-session .lh-answer-text blockquote,.lh-hub.lh-session .lh-hint-text blockquote { border-left:3px solid var(--sep); background:transparent; }
.lh-hub.lh-session .lh-pill-btn { border:0 !important; background:var(--fill) !important; color:var(--text) !important; box-shadow:none !important; border-radius:12px; font-weight:600; min-height:44px; transform:none; filter:none; }
.lh-hub.lh-session .lh-pill-show { background:var(--btn) !important; color:var(--onbtn) !important; }
.lh-hub.lh-session .lh-pill-reset { background:var(--fill2) !important; border:0 !important; color:var(--text2) !important; box-shadow:none; }
.lh-hub.lh-session .lh-dot { background:var(--fill) !important; border:0; box-shadow:none; }
.lh-hub.lh-session .lh-dot.lit { background:var(--bar) !important; box-shadow:none; }
.lh-hub.lh-session .lh-review-prog-wrap { background:var(--trk) !important; height:4px; }
.lh-hub.lh-session .lh-review-prog-bar { background:var(--bar) !important; }
.lh-hub.lh-session .lh-review-badge { background:transparent !important; color:var(--text3) !important; box-shadow:none; font-weight:500; font-variant-numeric:tabular-nums; }
.lh-hub.lh-session .lh-browse-note { background:var(--fill2) !important; border:0 !important; color:var(--text2) !important; }
.lh-hub.lh-session .lh-browse-btn { background:var(--fill) !important; border:0 !important; color:var(--text) !important; box-shadow:none; }
.lh-hub.lh-session .lh-rating-btn { background:var(--fill) !important; box-shadow:none !important; transform:none; border-radius:14px; }
.lh-hub.lh-session .lh-rating-btn::before { display:none; }
.lh-hub.lh-session .lh-rb-label { font-weight:600; font-size:16px; }
.lh-hub.lh-session .lh-rb-icon { display:none; }
.lh-hub.lh-session .lh-rb-days { color:var(--text2); opacity:1; font-weight:500; font-size:12px; }
.lh-hub.lh-session .lh-rb-again .lh-rb-label { color:var(--newt); }
.lh-hub.lh-session .lh-rb-hard .lh-rb-label { color:var(--text); }
.lh-hub.lh-session .lh-rb-good .lh-rb-label { color:var(--duet); }
.lh-hub.lh-session .lh-rb-easy .lh-rb-label { color:var(--mstt); }
.lh-hub.lh-session .lh-edit-label,.lh-hub.lh-session .lh-edit-hints-label { color:var(--text3) !important; text-transform:none; letter-spacing:0; font-size:12px; font-weight:600; }
.lh-hub.lh-session .lh-edit-textarea { background:var(--card) !important; border:1px solid var(--sep) !important; color:var(--text) !important; box-shadow:none; }
.lh-hub.lh-session .lh-edit-textarea:focus { border-color:var(--tint) !important; }
.lh-hub.lh-session .lh-edit-save-btn { background:var(--btn) !important; color:var(--onbtn) !important; border-radius:9px; box-shadow:none !important; transform:none; font-weight:600; }
.lh-hub.lh-session .lh-edit-cancel-btn { background:var(--fill) !important; border:0 !important; color:var(--text) !important; border-radius:9px; }
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
.lh-xhead { display:flex; align-items:center; gap:12px; min-height:30px; margin-bottom:8px; }
.lh-xpt { display:flex; align-items:center; gap:6px; min-width:0; }
.lh-xstar { color:var(--text2); display:grid; flex:none; }
.lh-hub .lh-xstar .lh-i { width:14px; height:14px; fill:currentColor; }
.lh-xbadge { flex:none; font-size:11px; line-height:16px; color:var(--text3); background:var(--fill2); border-radius:6px; padding:0 6px; white-space:nowrap; }

.lh-mgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:12px; }
.lh-dh { display:flex; align-items:center; gap:10px; min-width:0; }
.lh-mf { display:flex; align-items:center; gap:10px; min-width:0; }
.lh-hub .lh-dc.lh-mc { gap:10px; }

.lh-qgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(400px,100%),1fr)); gap:12px; }
.lh-qc { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; overflow:hidden; position:relative; display:flex; min-width:0; cursor:pointer; }
.lh-qc > .lh-ra,.lh-qc > .lh-ra-phone { position:absolute; left:8px; top:8px; z-index:2; }
.lh-hub .lh-qc .lh-ra button,.lh-hub .lh-qc .lh-ra-phone button { background:var(--glass); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px); width:32px; height:32px; border-radius:8px; color:var(--text); }
.lh-qcov { width:116px; flex:none; background-color:var(--fill2); background-size:cover; background-position:center; }
.lh-qb { padding:12px 14px; display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
.lh-qt { display:flex; align-items:center; gap:8px; min-width:0; }
.lh-scn { font-size:13px; line-height:18px; color:var(--text2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-stars { display:flex; gap:1px; flex:none; font-size:13px; line-height:16px; color:var(--text); }
.lh-stars i { font-style:normal; color:var(--text3); opacity:.55; }
.lh-qmeta { font-size:12px; line-height:16px; color:var(--text3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-qmeta b { font-weight:600; }
.lh-qf { display:flex; align-items:flex-end; gap:14px; margin-top:6px; }
.lh-qpt { display:flex; justify-content:space-between; gap:8px; margin-bottom:4px; font-size:12px; line-height:16px; color:var(--text3); font-variant-numeric:tabular-nums; white-space:nowrap; }
.lh-hub .lh-get { height:30px; flex:none; padding:0 14px; border:0; border-radius:15px; background:var(--fill); box-shadow:none; color:var(--tint); font-size:13px; font-weight:600; white-space:nowrap; cursor:pointer; }
.lh-hub .lh-get:hover { background:var(--fill); filter:brightness(.97); }
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
.lh-ct { flex:1 1 180px; min-width:0; font-size:17px; line-height:24px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lh-hub .lh-ib-sm { width:32px; height:32px; }
.lh-hub .lh-ib-sm.on { background:var(--fill); color:var(--tint); }
.lh-ls { display:flex; align-items:center; gap:12px; min-height:52px; padding:8px 8px 8px 14px; position:relative; box-sizing:border-box; cursor:pointer; color:var(--text); }
.lh-ls + .lh-ls::before { content:""; position:absolute; left:48px; right:0; top:0; height:.5px; background:var(--sep); }
.lh-lic { width:22px; height:22px; display:grid; flex:none; color:var(--text3); }
.lh-hub .lh-lic .lh-i { width:22px; height:22px; stroke-width:1.8; }
.lh-hub .lh-lic.tm { color:var(--mstt); } .lh-hub .lh-lic.tl { color:var(--lrnt); }
.lh-ls-t { font-size:15px; line-height:20px; font-weight:500; min-width:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word; }
.lh-ls-goal { margin-top:2px; font-size:13px; line-height:18px; color:var(--text3); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.lh-ls-s { flex:none; font-size:13px; color:var(--text3); white-space:nowrap; }
.lh-ls-chev { display:grid; flex:none; color:var(--text3); }
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
.lh-pnl { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; padding:14px 16px; }
.lh-pnl-fill { flex:1 0 auto; }
.lh-pnl-t { font-size:15px; line-height:20px; font-weight:600; color:var(--text); margin-bottom:10px; }
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
.lh-bars i { flex:1; min-height:2px; background:var(--bar); border-radius:2px 2px 0 0; }
.lh-bars i.zero { background:var(--trk); }
.lh-ach-coll { display:flex; align-items:baseline; gap:8px; margin:6px 0 10px; }
.lh-ach-coll .lh-pnl-t { margin:0; }
.lh-acg { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:10px; }
.lh-ac { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; padding:10px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:3px; position:relative; cursor:pointer; min-width:0; }
.lh-ac img,.lh-ach-img img { width:72px; height:72px; margin:-4px; display:block; clip-path:inset(8% round 20%); }
.lh-ac.round img,.lh-ach-img.round img { clip-path:circle(43%); }
.lh-ac.off img,.lh-ach-img.off img { filter:var(--locked); }
.lh-ac b { font-size:13px; line-height:17px; font-weight:600; color:var(--text); margin-top:2px; }
.lh-ac small { font-size:11px; line-height:15px; color:var(--text3); }
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
