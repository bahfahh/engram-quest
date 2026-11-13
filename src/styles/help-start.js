"use strict";
// The guide's first screen (renderStart in src/hub/help.js): three steps as a diagram and the
// sentences to say to an AI tool. With .is-intro the dialog is the first-run introduction: only this
// screen, sized to its content. Colours are the Hub tokens from hub.js.

module.exports = `
.modal.lh-hub.lh-help.is-intro { width:min(94vw,720px); height:auto; max-height:min(90vh,800px); display:flex; flex-direction:column; }
.lh-hub.lh-help.is-intro > .modal-content { height:auto; flex:1 1 auto; min-height:0; }
.lh-help.is-intro .lh-help-body { padding-bottom:16px; }
.lh-start-steps { display:flex; align-items:stretch; gap:4px; }
.lh-start-step { flex:1 1 0; min-width:0; display:flex; flex-direction:column; gap:10px; padding:16px 14px 14px; border-radius:16px; background:var(--card); box-shadow:var(--cshadow); }
.lh-start-arrow { flex:none; align-self:center; display:grid; color:var(--text3); }
.lh-start-arrow .lh-i { width:18px; height:18px; }
.lh-start-art { position:relative; flex:none; width:48px; height:48px; border-radius:14px; display:grid; place-items:center; background:var(--chipbg); color:var(--tint); }
.lh-hub .lh-start-art .lh-i { width:26px; height:26px; }
.lh-start-n { position:absolute; left:-7px; top:-7px; width:21px; height:21px; border-radius:50%; display:grid; place-items:center; background:var(--btn); color:var(--onbtn); box-shadow:0 0 0 2px var(--card); font-size:12px; line-height:1; font-weight:700; font-variant-numeric:tabular-nums; }
.lh-start-tx { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.lh-start-tx b { font-size:15px; line-height:20px; font-weight:600; color:var(--text); }
.lh-start-tx > span { font-size:12.5px; line-height:18px; color:var(--text2); }
.lh-start-act { margin-top:auto; padding-top:8px; }
.lh-start-act:empty { display:none; }
.lh-start-done { display:inline-flex; align-items:center; gap:4px; font-size:12.5px; line-height:18px; font-weight:600; color:var(--mstt); }
.lh-hub .lh-start-done .lh-i { width:15px; height:15px; }
.lh-start-h { margin:8px 0 0; font-size:15px; line-height:20px; font-weight:600; color:var(--text); }
.lh-start-say { background:var(--card); box-shadow:var(--cshadow); border-radius:16px; overflow:hidden; }
.lh-hub .lh-start-row { display:flex; align-items:center; gap:12px; width:100%; height:auto; min-height:54px; padding:8px 14px; position:relative; border:0; border-radius:0; background:transparent; box-shadow:none; color:var(--text); text-align:left; white-space:normal; cursor:pointer; }
.lh-hub .lh-start-row:hover { background:var(--fill2); }
.lh-hub .lh-start-row:focus-visible { outline:2px solid var(--tint); outline-offset:-2px; }
.lh-start-row + .lh-start-row::before { content:""; position:absolute; left:54px; right:0; top:0; height:.5px; background:var(--sep); }
.lh-start-row-tx { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
.lh-start-q { font-size:14.5px; line-height:21px; font-weight:600; color:var(--text); overflow-wrap:anywhere; }
.lh-start-slot { color:var(--tint); border-bottom:1.5px dashed currentColor; }
.lh-start-makes { font-size:12px; line-height:17px; font-weight:400; color:var(--text3); }
.lh-start-copy { flex:none; display:inline-flex; align-items:center; gap:4px; color:var(--tint); font-size:12px; line-height:16px; font-weight:600; white-space:nowrap; }
.lh-hub .lh-start-copy .lh-i { width:17px; height:17px; }
.lh-start-more { display:flex; flex-wrap:wrap; gap:8px 20px; }
.lh-start-video .lh-guide-fig { margin:0; }
body.is-phone .modal.lh-hub.lh-help.is-intro { width:100vw; height:100vh; height:100dvh; max-height:none; }
body.is-phone .lh-start-steps { flex-direction:column; gap:8px; }
body.is-phone .lh-start-arrow { display:none; }
body.is-phone .lh-start-step { flex:none; flex-direction:row; align-items:center; gap:14px; padding:12px 14px; }
body.is-phone .lh-hub .lh-start-row { min-height:60px; }
body.is-phone .lh-hub .lh-start-more .lh-link { min-height:44px; white-space:normal; text-align:left; }
`;
