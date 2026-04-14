"use strict";
const I = require("obsidian");
const { computeFsrs: P } = require("../fsrs");
const { t: c, tAlt: C, getLocale: _getLocale } = require("../i18n");
const { anySrPattern: ge, getReviewStatus: $, loadSrData, saveSrData } = require("./helpers");
const { saveTagSourceCard, saveInlineCard, deleteTagSourceCard } = require("./edit");
const W_ref = { get locale() { try { return I.moment && I.moment.locale && I.moment.locale(); } catch(e) { return "en"; } } };
function L(s) { return _getLocale(s, W_ref.locale); }

var Q=class extends I.Modal{
  constructor(e,t,r,s,l,a={}){
    super(e);
    this.cards=t; this.deckName=r; this.plugin=s;
    this.idx=0; this.hintLevel=0; this.answerShown=false;
    this.onBack=l||null; this.browseOnly=!!a.browseOnly;
    this._rating_locked=false; // Task 4: lock flag
  }

  onOpen(){
    this.modalEl.addClass("lh-hub");
    this.modalEl.style.cssText="width:min(95vw,700px);max-width:none;height:min(90vh,640px);max-height:none;padding:0;overflow:hidden;border-radius:24px";
    this.modalEl.style.setProperty("--background-primary","#ffffff","important");
    this.modalEl.style.setProperty("--background-secondary","#f3f4f6","important");
    this.modalEl.style.setProperty("--text-normal","#1f2937","important");
    this.modalEl.style.setProperty("--text-muted","#6b7280","important");
    this.modalEl.style.setProperty("--background-modifier-border","#e5e7eb","important");
    let e=this.app.vault.adapter.getResourcePath(".obsidian/plugins/engram-quest/bg.png");
    this.contentEl.style.cssText=`padding:0;display:flex;flex-direction:column;height:100%;overflow:hidden;background-image:url('${e}');background-size:cover;background-position:center top;color:#1f2937`;
    this.renderCard();
  }

  renderCard(){
    this.hintLevel=0; this.answerShown=false; this._rating_locked=false;
    this._renderCardContent(this.cards[this.idx]);
  }

  // Task 6: completion screen
  _renderComplete(){
    let t=this.plugin.settings;
    this.contentEl.empty();
    let wrap=this.contentEl.createEl("div",{attr:{class:"lh-complete-screen",style:"flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center;gap:16px;"}});
    wrap.createEl("div",{attr:{style:"font-size:56px;line-height:1;"}}).textContent="🎉";
    wrap.createEl("div",{attr:{class:"lh-complete-title",style:"font-size:24px;font-weight:800;color:#1e293b;"}}).textContent=c(t,"REVIEW_COMPLETE");
    wrap.createEl("div",{attr:{style:"font-size:14px;color:#64748b;line-height:1.6;max-width:260px;"}}).textContent=`${this.deckName} · ${this.cards.length} ${c(t,"CARDS_REVIEWED")}`;
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
    a.innerHTML=`← ${c(t,"BACK")}`;
    a.addEventListener("click",()=>{ this.close(); this.onBack&&this.onBack(); });

    // Card body
    let i=this.contentEl.createEl("div",{attr:{class:"lh-review-body"}}).createEl("div",{attr:{class:"lh-review-card"}});
    let d=i.createEl("div",{attr:{class:"lh-rc-top"}});
    d.createEl("span",{text:this.deckName,attr:{class:"lh-rc-badge"}});
    this.browseOnly&&d.createEl("span",{text:c(t,"BROWSE_ONLY"),attr:{class:"lh-rc-badge"}});
    // Edit button — top-right of card
    let editTopBtn=d.createEl("button",{attr:{class:"lh-rc-edit-btn"}});
    editTopBtn.textContent="✏️ "+c(t,"EDIT_CARD");
    editTopBtn.addEventListener("click",()=>this._renderEditForm(e));
    // Delete button
    let delTopBtn=d.createEl("button",{attr:{class:"lh-rc-edit-btn",style:"margin-left:6px;color:#ef4444;"}});
    delTopBtn.innerHTML="🗑️";
    delTopBtn.title=c(t,"DELETE");
    delTopBtn.addEventListener("click",()=>this._renderDeleteConfirm(e));
    if(e.emoji){ i.createEl("span",{attr:{class:"lh-rc-emoji"}}).textContent=e.emoji; }
    i.createEl("div",{text:e.front,attr:{class:"lh-rc-question"}});

    // Hints
    let f=[{key:"hint_l1",cls:"lh-hint-l1",label:"L1 · Active Recall"},{key:"hint_l2",cls:"lh-hint-l2",label:"L2 · Contextual Anchor"},{key:"hint_l3",cls:"lh-hint-l3",label:"L3 · Narrowing Hint"}];
    for(let p=0;p<this.hintLevel;p++){
      let g=f[p],E=i.createEl("div",{attr:{class:`lh-hint ${g.cls}`}});
      E.createEl("div",{text:g.label,attr:{class:"lh-hint-label"}});
      E.createEl("div",{text:e[g.key]||C("NO_HINT",t),attr:{class:"lh-hint-text"}});
    }

    // Answer block
    if(this.answerShown){
      let p=i.createEl("div",{attr:{class:"lh-answer-block"}});
      p.createEl("div",{text:c(t,"ANSWER"),attr:{class:"lh-answer-label"}});
      p.createEl("div",{text:e.back,attr:{class:"lh-answer-text"}});
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
      E.innerHTML="TIP "+C("SHOW_ANSWER",t);
      E.addEventListener("click",()=>{this.answerShown=true;this._renderCardContent(e);});

      let m=e.hint_l1||e.hint_l2||e.hint_l3;
      let x=g.createEl("button",{attr:{class:"lh-pill-btn lh-pill-recall"}});
      x.innerHTML="L1 "+(this.hintLevel===0?C("RECALL",t):C("HINT_NEXT",t));
      if(!m||this.hintLevel>=3){ x.disabled=true; x.style.opacity="0.38"; x.style.cursor="not-allowed"; }
      else x.addEventListener("click",()=>{this.hintLevel++;this._renderCardContent(e);});

      let _isAiCard=e.notePath&&e.notePath.startsWith("engram-review/ai-cards/");
      let _mmFolder=this.plugin.settings.memoryMapFolder;
      let S=null;
      if(e.notePath){if(_mmFolder){let nn=(e.sourceNotePath||e.notePath).split("/").pop().replace(/\.md$/i,"");S=`${_mmFolder}/${nn}-memory.canvas`;}else if(!_isAiCard){S=e.notePath.replace(/\.md$/i,"-memory.canvas");}else if(e.sourceNotePath){// sourceNotePath may be full path or bare filename — derive canvas name and use openLinkText for resolution
        let _srcBase=e.sourceNotePath.replace(/\.md$/i,"-memory.canvas");
        // If sourceNotePath contains a folder, use it directly; otherwise let Obsidian resolve by name
        S=_srcBase;}}
      let w=S?this.app.vault.getAbstractFileByPath(S):null;
      // Fallback: if full path not found, try resolving by basename via Obsidian link resolution
      if(!w&&S){let _bn=S.split("/").pop();let _resolved=this.app.metadataCache.getFirstLinkpathDest(_bn,"");if(_resolved)w=_resolved;}
      let k=g.createEl("button",{attr:{class:"lh-pill-btn lh-pill-memory"}});
      k.innerHTML=`${c(t,"MEMORY_MAP")}`;
      w?k.addEventListener("click",()=>{this.app.workspace.openLinkText(w.path,"",false);}):(k.disabled=true,k.style.opacity="0.38",k.style.cursor="not-allowed");

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

  _renderEditForm(e){
    let t=this.plugin.settings;
    this.contentEl.empty();

    // Nav (minimal — just back arrow)
    let nav=this.contentEl.createEl("div",{attr:{class:"lh-review-nav"}});
    nav.createEl("span",{text:c(t,"HUB_TITLE"),attr:{class:"lh-review-logo"}});
    let backBtn=nav.createEl("button",{attr:{class:"lh-review-back"}});
    backBtn.innerHTML=`← ${c(t,"BACK")}`;
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
      btnRow.createEl("button",{text:c(t,"DELETE_CANCEL_BTN"),attr:{style:"padding:7px 16px;border-radius:8px;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-size:13px;"}}).addEventListener("click",()=>modal.close());
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
    btnRow.createEl("button",{text:c(t,"DELETE_CANCEL_BTN"),attr:{style:"padding:7px 16px;border-radius:8px;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-size:13px;"}}).addEventListener("click",()=>modal.close());
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
