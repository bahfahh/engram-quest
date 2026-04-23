"use strict";
const I = require("obsidian");
const { computeFsrs: P } = require("../fsrs");
const { t: c, tAlt: C, getLocale: _getLocale } = require("../i18n");
const { anySrPattern: ge, getReviewStatus: $, loadSrData, saveSrData } = require("./helpers");
const { saveTagSourceCard, saveInlineCard, deleteTagSourceCard } = require("./edit");
const W_ref = { get locale() { try { return I.moment && I.moment.locale && I.moment.locale(); } catch(e) { return "en"; } } };
function L(s) { return _getLocale(s, W_ref.locale); }

const REVIEW_MOBILE_PATCH_ID = "engram-quest-review-mobile-patch";
function ensureReviewMobilePatch() {
  if (document.getElementById(REVIEW_MOBILE_PATCH_ID)) return;
  const styleEl = document.createElement("style");
  styleEl.id = REVIEW_MOBILE_PATCH_ID;
  styleEl.textContent = `
body.is-phone .lh-review-nav {
  overflow:hidden !important;
}
body.is-phone .lh-review-nav > .lh-review-tabs {
  flex:1 1 auto;
  min-width:0;
  overflow-x:auto;
  overflow-y:hidden;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
}
body.is-phone .lh-review-nav > .lh-review-tabs::-webkit-scrollbar { display:none; }
body.is-phone .lh-review-nav .lh-review-tab { flex:0 0 auto; }
body.is-phone .lh-review-card .lh-rc-top {
  flex-wrap:wrap;
  gap:8px;
}
body.is-phone .lh-review-card .lh-rc-top > div {
  min-width:0;
  max-width:100%;
}
body.is-phone .lh-review-card .lh-rc-top > div:first-of-type {
  flex:1 1 100%;
  margin-left:0 !important;
  display:flex !important;
  flex-wrap:wrap;
  gap:6px;
}
body.is-phone .lh-review-card .lh-rc-top > div:last-of-type {
  width:100%;
  display:flex !important;
  flex-wrap:wrap;
  justify-content:flex-start !important;
  gap:6px;
}
body.is-phone .lh-review-card .lh-rc-edit-btn {
  margin-left:0;
  max-width:100%;
}
body.is-phone .lh-review-card .lh-rc-badge {
  font-size:11px;
  padding:5px 12px;
}
body.is-phone .lh-review-footer .lh-pill-row {
  flex-wrap:wrap;
}
body.is-phone .lh-review-footer .lh-pill-btn {
  flex:1 1 calc(50% - 6px);
}
`;
  document.head.appendChild(styleEl);
}

/** Plan A — sync name-based lookup (fast, no I/O) */
function findMemoryMapSync(app, card, settings) {
  const isAi = card.notePath && card.notePath.startsWith("engram-review/ai-cards/");
  const mmFolder = settings.memoryMapFolder;
  let guess = null;
  if (card.notePath) {
    if (mmFolder) {
      const nn = (card.sourceNotePath || card.notePath).split("/").pop().replace(/\.md$/i, "");
      guess = `${mmFolder}/${nn}-memory.canvas`;
    } else if (!isAi) {
      guess = card.notePath.replace(/\.md$/i, "-memory.canvas");
    } else if (card.sourceNotePath) {
      guess = card.sourceNotePath.replace(/\.md$/i, "-memory.canvas");
    }
  }
  let found = guess ? app.vault.getAbstractFileByPath(guess) : null;
  if (!found && guess) {
    const bn = guess.split("/").pop();
    found = app.metadataCache.getFirstLinkpathDest(bn, "") || null;
  }
  return found;
}

/** Plan B — async canvas file-node reverse lookup */
async function findMemoryMapByCanvasContent(app, card) {
  const targets = new Set();
  if (card.notePath) targets.add(card.notePath);
  if (card.sourceNotePath) targets.add(card.sourceNotePath);
  if (card.sourceNotePaths) card.sourceNotePaths.forEach(p => p && targets.add(p));
  if (targets.size === 0) return null;
  const canvasFiles = app.vault.getFiles().filter(f => f.name.endsWith("-memory.canvas"));
  for (const cf of canvasFiles) {
    try {
      const json = JSON.parse(await app.vault.read(cf));
      const fileNodes = (json.nodes || []).filter(n => n.type === "file");
      for (const fn of fileNodes) {
        if (targets.has(fn.file)) return cf;
      }
    } catch { /* skip malformed canvas */ }
  }
  return null;
}

const IMG_EXT=["png","jpg","jpeg","gif","bmp","svg","webp","avif"];
function postProcessEmbed(el,app,notePath){
  if(!el.findAll)return;
  el.findAll(".internal-embed").forEach(em=>{
    const src=em.getAttribute("src");if(!src)return;
    const file=src.replace(/#.*$/,"");
    const target=app.metadataCache.getFirstLinkpathDest(file,notePath||"");
    if(!target)return;
    if(IMG_EXT.includes(target.extension.toLowerCase())){
      em.empty();
      em.createEl("img",{attr:{src:app.vault.getResourcePath(target),width:em.getAttribute("width")||"100%"}});
      em.addClasses(["image-embed","is-loaded"]);
    }
  });
}

var Q=class extends I.Modal{
  constructor(e,t,r,s,l,a={}){
    super(e);
    this.cards=t; this.deckName=r; this.plugin=s;
    this.idx=0; this.hintLevel=0; this.answerShown=false;
    this.onBack=l||null; this.browseOnly=!!a.browseOnly;
    this._rating_locked=false; // Task 4: lock flag
  }

  onOpen(){
    ensureReviewMobilePatch();
    // Save initial progress on open
    this.plugin.settings._reviewProgress={deck:this.deckName,idx:this.idx};
    this.plugin.saveData(this.plugin.settings);
    const _isDark=document.body.classList.contains("theme-dark");const _bgPrimary=_isDark?"#1e1e2e":"#ffffff";const _bgSecondary=_isDark?"#252538":"#f3f4f6";const _textNormal=_isDark?"#e2e8f0":"#1f2937";const _textMuted=_isDark?"#94a3b8":"#6b7280";
    this.modalEl.addClass("lh-hub");
    if(_isDark)this.modalEl.addClass("lh-dark");
    this.modalEl.style.cssText="width:min(95vw,700px);max-width:none;height:min(90vh,640px);max-height:none;padding:0;overflow:hidden;border-radius:24px";
    this.modalEl.style.setProperty("--background-primary",_bgPrimary,"important");
    this.modalEl.style.setProperty("--background-secondary",_bgSecondary,"important");
    this.modalEl.style.setProperty("--text-normal",_textNormal,"important");
    this.modalEl.style.setProperty("--text-muted",_textMuted,"important");
    this.modalEl.style.setProperty("--background-modifier-border","#e5e7eb","important");
    const _bgFile=_isDark?"bg_dark.webp":"bg.png";
    let e=this.app.vault.adapter.getResourcePath(this.app.vault.configDir+"/plugins/engram-quest/"+_bgFile);
    this.contentEl.style.cssText=`padding:0;display:flex;flex-direction:column;height:100%;overflow:hidden;background-image:url('${e}');background-size:cover;background-position:center top;color:${_isDark?"#e2e8f0":"#1f2937"}`;
    this.renderCard();
  }

  renderCard(){
    this.hintLevel=0; this.answerShown=false; this._rating_locked=false;
    // Save progress
    this.plugin.settings._reviewProgress={deck:this.deckName,idx:this.idx};
    this.plugin.saveData(this.plugin.settings);
    this._renderCardContent(this.cards[this.idx]);
  }

  // Task 6: completion screen
  _renderComplete(){
    let t=this.plugin.settings;
    // Clear progress
    delete this.plugin.settings._reviewProgress;
    this.plugin.saveData(this.plugin.settings);
    this.contentEl.empty();
    let wrap=this.contentEl.createEl("div",{attr:{class:"lh-complete-screen",style:"flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center;gap:16px;"}});
    wrap.createEl("div",{attr:{style:"font-size:56px;line-height:1;"}}).textContent="🎉";
    wrap.createEl("div",{attr:{class:"lh-complete-title",style:"font-size:24px;font-weight:800;color:var(--text-normal, #1e293b);"}}).textContent=c(t,"REVIEW_COMPLETE");
    wrap.createEl("div",{attr:{style:"font-size:14px;color:var(--text-muted, #64748b);line-height:1.6;max-width:260px;"}}).textContent=`${this.deckName} · ${this.cards.length} ${c(t,"CARDS_REVIEWED")}`;
    let btnRow=wrap.createEl("div",{attr:{style:"display:flex;flex-direction:column;gap:10px;width:100%;max-width:280px;margin-top:8px;"}});
    // Continue → back to hub
    let btnHub=btnRow.createEl("button",{attr:{class:"lh-complete-btn",style:"border-radius:99px;padding:14px 24px;font-size:15px;font-weight:700;cursor:pointer;border:none;background:linear-gradient(135deg,#4f46e5,#818cf8);color:#fff;box-shadow:0 4px 16px rgba(79,70,229,0.4);min-height:52px;"}});
    btnHub.textContent=c(t,"BACK_TO_HUB");
    btnHub.addEventListener("click",()=>{ this.close(); this.onBack&&this.onBack(); });
    // Close
    let btnClose=btnRow.createEl("button",{attr:{class:"lh-complete-btn",style:"border-radius:99px;padding:14px 24px;font-size:15px;font-weight:600;cursor:pointer;border:1.5px solid #e2e8f0;background:#f8faff;color:#475569;min-height:52px;"}});
    btnClose.textContent=c(t,"HUB_CLOSE");
    btnClose.addEventListener("click",()=>this.close());
  }

  _renderCardContent(e){
    let t=this.plugin.settings;
    let _openedSourceLabel=L(t)==="zh-tw"?"已開啟":"Opened";
    this.contentEl.empty();
    // Nav
    let r=this.contentEl.createEl("div",{attr:{class:"lh-review-nav"}});
    r.createEl("span",{text:c(t,"HUB_TITLE"),attr:{class:"lh-review-logo"}});
    let s=r.createEl("div",{attr:{class:"lh-review-tabs"}});
    [{label:c(t,"TAB_REVIEW"),key:"review"},{label:c(t,"TAB_MEMORY"),key:"memory"},{label:c(t,"TAB_QUEST"),key:"quest"}].forEach(p=>{
      let g=s.createEl("button",{text:p.label,attr:{class:"lh-review-tab"+(p.key==="review"?" active":"")}});
      p.key!=="review"&&(g.style.opacity="0.6");
    });
    // Task 6: back button → always go back to Hub (not close)
    let a=r.createEl("button",{attr:{class:"lh-review-back"}});
    a.textContent="← "+c(t,"BACK");
    a.addEventListener("click",()=>{ this.close(); this.onBack&&this.onBack(); });
    // Minimize button
    let minBtn=r.createEl("button",{attr:{class:"lh-review-back",style:"font-size:16px;padding:4px 8px;margin-left:4px;"}});
    minBtn.textContent="⏬";
    minBtn.title="Minimize";
    minBtn.addEventListener("click",()=>this._minimize());

    // Card body
    let i=this.contentEl.createEl("div",{attr:{class:"lh-review-body"}}).createEl("div",{attr:{class:"lh-review-card"}});
    let d=i.createEl("div",{attr:{class:"lh-rc-top"}});
    d.createEl("span",{text:this.deckName,attr:{class:"lh-rc-badge"}});
    this.browseOnly&&d.createEl("span",{text:c(t,"BROWSE_ONLY"),attr:{class:"lh-rc-badge"}});
    // Source note buttons — for AI cards show sourceNotePaths only, for hand-written show notePath
    let _isAi=e.notePath&&e.notePath.startsWith("engram-review/ai-cards/");
    let notePaths=_isAi?(e.sourceNotePaths||[e.sourceNotePath].filter(Boolean)):[...new Set([e.notePath,e.sourceNotePath].filter(Boolean))];
    if(notePaths.length>0){
      let srcWrap=d.createEl("div",{attr:{style:"display:flex;align-items:center;gap:4px;margin-left:auto;flex-shrink:1;min-width:0;"}});
      notePaths.forEach(np=>{
        let name=np.split("/").pop().replace(/\.md$/i,"");
        let btn=srcWrap.createEl("button",{attr:{class:"lh-rc-edit-btn",style:"font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6366f1;",title:np}});
        btn.textContent="📄 "+name;
        btn.addEventListener("click",(ev)=>{ev.stopPropagation();this.app.workspace.openLinkText(np,"",false);});
      });
    }
    if(notePaths.length>0){
      d.querySelectorAll(".lh-rc-top .lh-rc-edit-btn").forEach(btn=>{
        if(btn.dataset.feedbackBound==="1") return;
        let defaultLabel=btn.textContent;
        btn.dataset.feedbackBound="1";
        btn.addEventListener("click",()=>{
          btn.textContent="✓ "+_openedSourceLabel;
          btn.style.color="#10b981";
          if(btn._feedbackTimer) clearTimeout(btn._feedbackTimer);
          btn._feedbackTimer=setTimeout(()=>{
            btn.textContent=defaultLabel;
            btn.style.color="#6366f1";
            btn._feedbackTimer=null;
          },1200);
        });
      });
    }
    // Right-side button group
    let btnGroup=d.createEl("div",{attr:{style:"display:flex;align-items:center;gap:4px;flex-shrink:0;"}});
    // Copy button
    let copyTopBtn=btnGroup.createEl("button",{attr:{class:"lh-rc-edit-btn"}});
    copyTopBtn.textContent="📋 Copy";
    copyTopBtn.title="Copy";
    copyTopBtn.addEventListener("click",()=>{
      let parts=[e.front];
      if(e.hint_l1) parts.push("L1: "+e.hint_l1);
      if(e.hint_l2) parts.push("L2: "+e.hint_l2);
      if(e.hint_l3) parts.push("L3: "+e.hint_l3);
      parts.push("A: "+e.back);
      navigator.clipboard.writeText(parts.join("\n")).then(()=>{ copyTopBtn.textContent="✅ Copied"; setTimeout(()=>copyTopBtn.textContent="📋 Copy",1500); });
    });
    // Edit button
    let editTopBtn=btnGroup.createEl("button",{attr:{class:"lh-rc-edit-btn"}});
    editTopBtn.textContent="✏️ "+c(t,"EDIT_CARD");
    editTopBtn.addEventListener("click",()=>this._renderEditForm(e));
    // Delete button
    let delTopBtn=btnGroup.createEl("button",{attr:{class:"lh-rc-edit-btn",style:"color:#ef4444;"}});
    delTopBtn.textContent="🗑️";
    delTopBtn.title=c(t,"DELETE");
    delTopBtn.addEventListener("click",()=>this._renderDeleteConfirm(e));
    if(e.emoji){ i.createEl("span",{attr:{class:"lh-rc-emoji"}}).textContent=e.emoji; }
    let qEl=i.createEl("div",{attr:{class:"lh-rc-question"}});
    I.MarkdownRenderer.renderMarkdown(e.front||"",qEl,e.notePath||"",null);
    postProcessEmbed(qEl,this.app,e.notePath||"");

    // Hints
    let f=[{key:"hint_l1",cls:"lh-hint-l1",label:"L1 · Active Recall"},{key:"hint_l2",cls:"lh-hint-l2",label:"L2 · Contextual Anchor"},{key:"hint_l3",cls:"lh-hint-l3",label:"L3 · Narrowing Hint"}];
    for(let p=0;p<this.hintLevel;p++){
      let g=f[p],E=i.createEl("div",{attr:{class:`lh-hint ${g.cls}`}});
      E.createEl("div",{text:g.label,attr:{class:"lh-hint-label"}});
      let hintEl=E.createEl("div",{attr:{class:"lh-hint-text"}});
      I.MarkdownRenderer.renderMarkdown(e[g.key]||C("NO_HINT",t),hintEl,e.notePath||"",null);
      postProcessEmbed(hintEl,this.app,e.notePath||"");
    }

    // Answer block
    if(this.answerShown){
      let p=i.createEl("div",{attr:{class:"lh-answer-block"}});
      p.createEl("div",{text:c(t,"ANSWER"),attr:{class:"lh-answer-label"}});
      let answerEl=p.createEl("div",{attr:{class:"lh-answer-text"}});
      I.MarkdownRenderer.renderMarkdown(e.back||"",answerEl,e.notePath||"",null);
      postProcessEmbed(answerEl,this.app,e.notePath||"");
      this.browseOnly&&i.createEl("div",{text:c(t,"BROWSE_NOTE"),attr:{class:"lh-browse-note"}});
    }

    // Footer buttons
    if(this.answerShown){
      if(this.browseOnly){
        let p=this.contentEl.createEl("div",{attr:{class:"lh-browse-row"}});
        p.createEl("button",{text:c(t,"BACK_TO_QUESTION"),attr:{class:"lh-browse-btn"}}).addEventListener("click",()=>{this.answerShown=false;this._renderCardContent(e);});
        let E=p.createEl("button",{text:c(t,"PREVIOUS"),attr:{class:"lh-browse-btn"}});
        this.idx===0&&(E.disabled=true);
        E.addEventListener("click",()=>{this.idx!==0&&(this.idx--,this.renderCard());});
        p.createEl("button",{text:this.idx>=this.cards.length-1?c(t,"BACK"):c(t,"NEXT"),attr:{class:"lh-browse-btn"}}).addEventListener("click",()=>{
          if(this.idx>=this.cards.length-1){this.close();this.onBack&&this.onBack();return;}
          this.idx++;this.renderCard();
        });
      } else {
        // Task 4: rating buttons with lock
        let p=e.srMeta||null;
        let g=this.contentEl.createEl("div",{attr:{class:"lh-rating-row"}});
        [{q:1,label:C("AGAIN",t),icon:"AG",cls:"lh-rb-again"},{q:2,label:C("HARD",t),icon:"HD",cls:"lh-rb-hard"},{q:3,label:C("GOOD",t),icon:"GD",cls:"lh-rb-good"},{q:4,label:C("EASY",t),icon:"OK",cls:"lh-rb-easy"}].forEach(E=>{
          let m=P(E.q,p,t);
          let x=g.createEl("button",{attr:{class:`lh-rating-btn ${E.cls}`}});
          let S=x.createEl("div",{attr:{class:"lh-rb-top"}});
          S.createEl("span",{attr:{class:"lh-rb-icon"}}).textContent=E.icon;
          S.createEl("span",{attr:{class:"lh-rb-label"}}).textContent=E.label;
          x.createEl("div",{text:`${m.interval}${C("DAYS",t)}`,attr:{class:"lh-rb-days"}});
          x.addEventListener("click",async()=>{
            // Task 4: prevent double-submit
            if(this._rating_locked) return;
            this._rating_locked=true;
            x.style.opacity="0.6"; x.style.pointerEvents="none";
            // disable all rating buttons immediately
            g.querySelectorAll(".lh-rating-btn").forEach(b=>{ b.style.opacity="0.5"; b.style.pointerEvents="none"; });

            let w=P(E.q,p,t);
            if(e.notePath) try {
              let srData=await loadSrData(this.app.vault.adapter,e.notePath);
              srData[e.front]={due:w.due,interval:w.interval,stability:w.stability,difficulty:w.difficulty,state:w.state,repetitions:w.repetitions};
              await saveSrData(this.app.vault.adapter,e.notePath,srData);
            } catch(y){ console.error("review-deck write failed",y); }
            // Stats tracking for achievement system
            try {
              const _d=new Date();const _p=n=>String(n).padStart(2,'0');
              const _today=_d.getFullYear()+'-'+_p(_d.getMonth()+1)+'-'+_p(_d.getDate());
              const _dy=new Date(_d);_dy.setDate(_dy.getDate()-1);
              const _yest=_dy.getFullYear()+'-'+_p(_dy.getMonth()+1)+'-'+_p(_dy.getDate());
              let _st=this.plugin.settings._stats||{};
              _st.totalCardsReviewed=(_st.totalCardsReviewed||0)+1;
              _st.dailyReviewLog=_st.dailyReviewLog||{};
              _st.dailyReviewLog[_today]=(_st.dailyReviewLog[_today]||0)+1;
              if(_st.lastReviewDate===_today){/* same day */}
              else if(_st.lastReviewDate===_yest){_st.currentStreak=(_st.currentStreak||1)+1;_st.longestStreak=Math.max(_st.longestStreak||0,_st.currentStreak);}
              else{_st.currentStreak=1;}
              _st.lastReviewDate=_today;
              this.plugin.settings._stats=_st;
              this.plugin.saveData(this.plugin.settings);
            } catch(_se){console.error('achievement stats failed',_se);}

            e.srMeta={due:w.due,interval:w.interval,stability:w.stability,difficulty:w.difficulty,state:w.state,repetitions:w.repetitions};
            e.srComment="";
            this.idx++;
            // Task 6: show completion screen instead of closing
            if(this.idx>=this.cards.length){ this._renderComplete(); return; }
            this.renderCard();
          });
        });
      }
    } else {
      // Pill buttons (before answer)
      let p=this.contentEl.createEl("div",{attr:{class:"lh-review-footer"}});
      let g=p.createEl("div",{attr:{class:"lh-pill-row"}});
      let E=g.createEl("button",{attr:{class:"lh-pill-btn lh-pill-show"}});
      E.textContent="TIP "+C("SHOW_ANSWER",t);
      E.addEventListener("click",()=>{this.answerShown=true;this._renderCardContent(e);});

      let m=e.hint_l1||e.hint_l2||e.hint_l3;
      let x=g.createEl("button",{attr:{class:"lh-pill-btn lh-pill-recall"}});
      x.textContent="L1 "+(this.hintLevel===0?C("RECALL",t):C("HINT_NEXT",t));
      if(!m||this.hintLevel>=3){ x.disabled=true; x.style.opacity="0.38"; x.style.cursor="not-allowed"; }
      else x.addEventListener("click",()=>{this.hintLevel++;this._renderCardContent(e);});

      // Memory Map button — Plan A (sync) then Plan B (async fallback)
      let k=g.createEl("button",{attr:{class:"lh-pill-btn lh-pill-memory"}});
      k.textContent=c(t,"MEMORY_MAP");
      let w=findMemoryMapSync(this.app,e,t);
      if(w){k.addEventListener("click",()=>{this.app.workspace.openLinkText(w.path,"",false);});}
      else{k.disabled=true;k.style.opacity="0.38";k.style.cursor="not-allowed";
        const gen=this._mmGen=(this._mmGen||0)+1;
        findMemoryMapByCanvasContent(this.app,e).then(cf=>{if(cf&&this._mmGen===gen&&k.isConnected){k.disabled=false;k.style.opacity="";k.style.cursor="";k.addEventListener("click",()=>{this.app.workspace.openLinkText(cf.path,"",false);});}}).catch(()=>{});}

      let y=p.createEl("div",{attr:{class:"lh-footer-meta"}});
      let b=y.createEl("button",{attr:{class:"lh-pill-reset"}});
      b.textContent="Reset";
      b.addEventListener("click",()=>{this.hintLevel=0;this.answerShown=false;this._renderCardContent(e);});
      let T=y.createEl("div",{attr:{class:"lh-dots"}});
      for(let _=0;_<3;_++) T.createEl("div",{attr:{class:"lh-dot"+(_<this.hintLevel?" lit":"")}});
    }

    // Progress bar
    let h=this.contentEl.createEl("div",{attr:{class:"lh-review-progress"}});
    let u=h.createEl("div",{attr:{class:"lh-review-prog-wrap"}});
    let v=Math.round(this.idx/this.cards.length*100);
    u.createEl("div",{attr:{class:"lh-review-prog-bar",style:`width:${v}%`}});
    h.createEl("span",{text:`${this.idx+1} / ${this.cards.length}`,attr:{class:"lh-review-badge"}});
  }

  _minimize(){
    this.containerEl.style.display="none";
    if(this._fab) return; // already exists
    let fab=document.createElement("div");
    fab.className="engram-fab";
    fab.textContent="📖";
    fab.title="Resume Review";
    fab.style.cssText="position:fixed;bottom:calc(env(safe-area-inset-bottom, 0px) + 88px);right:20px;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#818cf8);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;z-index:9999;box-shadow:0 4px 16px rgba(79,70,229,0.45);user-select:none;-webkit-tap-highlight-color:transparent;transition:transform 0.15s;";
    fab.addEventListener("mouseenter",()=>{fab.style.transform="scale(1.12)";});
    fab.addEventListener("mouseleave",()=>{fab.style.transform="scale(1)";});
    fab.addEventListener("click",()=>this._restore());
    document.body.appendChild(fab);
    this._fab=fab;
  }
  _restore(){
    this.containerEl.style.display="";
    if(this._fab){this._fab.remove();this._fab=null;}
  }
  onClose(){
    if(this._fab){this._fab.remove();this._fab=null;}
  }

  _renderEditForm(e){
    let t=this.plugin.settings;
    this.contentEl.empty();

    // Nav (minimal — just back arrow)
    let nav=this.contentEl.createEl("div",{attr:{class:"lh-review-nav"}});
    nav.createEl("span",{text:c(t,"HUB_TITLE"),attr:{class:"lh-review-logo"}});
    let backBtn=nav.createEl("button",{attr:{class:"lh-review-back"}});
    backBtn.textContent="← "+c(t,"BACK");
    backBtn.addEventListener("click",()=>this.renderCard());

    // Form body
    let body=this.contentEl.createEl("div",{attr:{class:"lh-edit-form"}});

    function field(labelKey, value){
      let wrap=body.createEl("div",{attr:{class:"lh-edit-field"}});
      wrap.createEl("label",{text:c(t,labelKey),attr:{class:"lh-edit-label"}});
      let ta=wrap.createEl("textarea",{attr:{class:"lh-edit-textarea"}});
      ta.value=value||"";
      return ta;
    }

    let taFront=field("EDIT_FRONT", e.front);
    let taBack=field("EDIT_BACK", e.back);
    taBack.style.minHeight="140px";
    function autoResize(ta){ta.style.height="auto";ta.style.height=ta.scrollHeight+"px";}
    autoResize(taBack);
    taBack.addEventListener("input",()=>autoResize(taBack));

    // Hints section
    let hintsWrap=body.createEl("div",{attr:{class:"lh-edit-hints-section"}});
    hintsWrap.createEl("div",{text:c(t,"EDIT_HINTS")+" (L1 / L2 / L3)",attr:{class:"lh-edit-hints-label"}});
    let taL1=hintsWrap.createEl("textarea",{attr:{class:"lh-edit-textarea lh-edit-hint-ta",placeholder:"L1"}});
    taL1.value=e.hint_l1||"";
    let taL2=hintsWrap.createEl("textarea",{attr:{class:"lh-edit-textarea lh-edit-hint-ta",placeholder:"L2"}});
    taL2.value=e.hint_l2||"";
    let taL3=hintsWrap.createEl("textarea",{attr:{class:"lh-edit-textarea lh-edit-hint-ta",placeholder:"L3"}});
    taL3.value=e.hint_l3||"";

    // Action buttons
    let btnRow=body.createEl("div",{attr:{class:"lh-edit-btn-row"}});
    let saveBtn=btnRow.createEl("button",{attr:{class:"lh-edit-save-btn"}});
    saveBtn.textContent=c(t,"EDIT_SAVE");
    saveBtn.addEventListener("click",async()=>{
      const newData={
        front: taFront.value.trim(),
        back: taBack.value.trim(),
        hint_l1: taL1.value.trim(),
        hint_l2: taL2.value.trim(),
        hint_l3: taL3.value.trim(),
      };
      if(!newData.front||!newData.back) return;
      saveBtn.disabled=true;
      try {
        if(e.notePath){
          await saveTagSourceCard(this.app, e, newData);
        } else {
          // inline card: find source via active MarkdownView
          const view=this.app.workspace.getActiveViewOfType&&this.app.workspace.getActiveViewOfType(I.MarkdownView);
          const sourcePath=view&&view.file&&view.file.path;
          if(sourcePath) await saveInlineCard(this.app, sourcePath, e, newData);
        }
        // Update in-memory card
        e.front=newData.front; e.back=newData.back;
        e.hint_l1=newData.hint_l1; e.hint_l2=newData.hint_l2; e.hint_l3=newData.hint_l3;
      } catch(err){ console.error("review-edit: save failed",err); }
      this.renderCard();
    });

    let cancelBtn=btnRow.createEl("button",{attr:{class:"lh-edit-cancel-btn"}});
    cancelBtn.textContent=c(t,"EDIT_CANCEL");
    cancelBtn.addEventListener("click",()=>this.renderCard());
  }
  _renderDeleteConfirm(e){
    let t=this.plugin.settings;
    const isAiCard=e.notePath&&e.notePath.startsWith("engram-review/ai-cards/");

    // Hand-written card: show redirect notice, don't delete
    if(!isAiCard){
      const sourceNote=e.notePath||"";
      const modal=new I.Modal(this.app);
      modal.modalEl.style.cssText="width:min(92vw,400px);padding:0;border-radius:16px;overflow:hidden;";
      const wrap=modal.contentEl;
      wrap.style.cssText="padding:24px;display:flex;flex-direction:column;gap:14px;";
      wrap.createEl("div",{text:"✏️ "+c(t,"EDIT_CARD"),attr:{style:"font-size:16px;font-weight:700;color:var(--text-normal,#111);"}});
      wrap.createEl("div",{text:`這是「${sourceNote}」的手寫筆記卡片，請直接在筆記中刪除對應的 question :: answer 行。`,attr:{style:"font-size:13px;color:var(--text-muted,#6b7280);line-height:1.6;"}});
      const btnRow=wrap.createEl("div",{attr:{style:"display:flex;gap:8px;justify-content:flex-end;"}});
      btnRow.createEl("button",{text:c(t,"DELETE_CANCEL_BTN"),attr:{style:"padding:7px 16px;border-radius:8px;border:1px solid var(--background-modifier-border, #d1d5db);background:var(--background-secondary, #fff);color:var(--text-muted, inherit);cursor:pointer;font-size:13px;"}}).addEventListener("click",()=>modal.close());
      const openBtn=btnRow.createEl("button",{text:"開啟筆記",attr:{style:"padding:7px 16px;border-radius:8px;border:none;background:#6366f1;color:#fff;cursor:pointer;font-size:13px;font-weight:600;"}});
      openBtn.addEventListener("click",()=>{ modal.close(); this.app.workspace.openLinkText(sourceNote,"",false); });
      modal.open();
      return;
    }

    // AI card: confirm then delete
    const modal=new I.Modal(this.app);
    modal.modalEl.style.cssText="width:min(92vw,400px);padding:0;border-radius:16px;overflow:hidden;";
    const wrap=modal.contentEl;
    wrap.style.cssText="padding:24px;display:flex;flex-direction:column;gap:14px;";
    wrap.createEl("div",{text:c(t,"DELETE_CONFIRM_TITLE").replace("{name}",e.front),attr:{style:"font-size:16px;font-weight:700;color:var(--text-normal,#111);"}});
    wrap.createEl("div",{text:c(t,"DELETE_CONFIRM_FILE"),attr:{style:"font-size:13px;color:var(--text-muted,#6b7280);line-height:1.6;"}});
    const btnRow=wrap.createEl("div",{attr:{style:"display:flex;gap:8px;justify-content:flex-end;"}});
    btnRow.createEl("button",{text:c(t,"DELETE_CANCEL_BTN"),attr:{style:"padding:7px 16px;border-radius:8px;border:1px solid var(--background-modifier-border, #d1d5db);background:var(--background-secondary, #fff);color:var(--text-muted, inherit);cursor:pointer;font-size:13px;"}}).addEventListener("click",()=>modal.close());
    const delBtn=btnRow.createEl("button",{text:c(t,"DELETE_CONFIRM_BTN"),attr:{style:"padding:7px 16px;border-radius:8px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-size:13px;font-weight:600;"}});
    delBtn.addEventListener("click",async()=>{
      modal.close();
      try { await deleteTagSourceCard(this.app,e); } catch(err){ console.error("review-delete failed",err); }
      // Remove card from in-memory array and continue session
      this.cards.splice(this.idx,1);
      if(this.cards.length===0){ this._renderComplete(); return; }
      if(this.idx>=this.cards.length) this.idx=this.cards.length-1;
      this.renderCard();
    });
    modal.open();
  }

}

module.exports = { ReviewSessionModal: Q };
