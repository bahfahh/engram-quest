"use strict";
const I = require("obsidian");
const { computeFsrs: P } = require("../fsrs");
const { t: c, tAlt: C, getLocale: _getLocale } = require("../i18n");
const { anySrPattern: ge, getReviewStatus: $, loadSrData, saveSrData } = require("./helpers");
const { saveTagSourceCard, saveInlineCard, deleteTagSourceCard, applyFormatToCardBack, refreshTagSourceCard } = require("./edit");
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
function isAiReviewCard(card) {
  return !!(card && card.notePath && card.notePath.startsWith("engram-review/ai-cards/"));
}

function uniqueNonEmpty(items) {
  return [...new Set((items || []).filter(v => typeof v === "string" && v.trim()))];
}

function getParentFolder(notePath) {
  if (!notePath || !notePath.includes("/")) return "";
  return notePath.slice(0, notePath.lastIndexOf("/"));
}

function getBaseName(filePath) {
  return (filePath || "").split("/").pop().replace(/\.[^.]+$/i, "");
}

function getCardRelatedNotePaths(card) {
  const paths = [];
  if (Array.isArray(card.relatedNotePaths)) paths.push(...card.relatedNotePaths);
  if (Array.isArray(card.sourceNotePaths)) paths.push(...card.sourceNotePaths);
  if (card.primarySourceNotePath) paths.push(card.primarySourceNotePath);
  if (card.sourceNotePath) paths.push(card.sourceNotePath);
  if (!isAiReviewCard(card) && card.notePath) paths.push(card.notePath);
  return uniqueNonEmpty(paths);
}

function getCardDisplayNotePaths(card) {
  if (isAiReviewCard(card)) return getCardRelatedNotePaths(card);
  return uniqueNonEmpty([card.notePath, card.sourceNotePath, ...(Array.isArray(card.relatedNotePaths) ? card.relatedNotePaths : [])]);
}

function getCanvasFiles(app) {
  return app.vault.getFiles().filter(f => f.name.endsWith("-memory.canvas"));
}

function addMemoryMapCandidate(candidates, seen, file, reason, relatedPath = null) {
  if (!file || !file.path || seen.has(file.path)) return;
  seen.add(file.path);
  candidates.push({ file, path: file.path, reason, relatedPath });
}

function getUniqueFolders(notePaths) {
  return uniqueNonEmpty(notePaths.map(getParentFolder));
}

function getCommonTopicFolder(notePaths) {
  const folders = getUniqueFolders(notePaths);
  if (folders.length === 0) return "";
  const splitFolders = folders.map(folder => folder.split("/").filter(Boolean));
  const shortest = Math.min(...splitFolders.map(parts => parts.length));
  const common = [];
  for (let i = 0; i < shortest; i++) {
    const part = splitFolders[0][i];
    if (splitFolders.every(parts => parts[i] === part)) common.push(part);
    else break;
  }
  return common.join("/");
}

function getTopicFolders(notePaths) {
  const folders = getUniqueFolders(notePaths);
  const related = [];
  const common = getCommonTopicFolder(notePaths);
  if (common && !folders.includes(common)) related.push(common);
  if (folders.length === 1) {
    const parts = folders[0].split("/").filter(Boolean);
    if (parts.length > 1) related.push(parts.slice(0, -1).join("/"));
  }
  return uniqueNonEmpty(related);
}

function findMemoryMapCandidatesSync(app, card, settings, deckName) {
  const relatedNotePaths = getCardRelatedNotePaths(card);
  if (relatedNotePaths.length === 0) return [];
  const candidates = [];
  const seen = new Set();
  const canvasFiles = getCanvasFiles(app);
  const folderMatches = new Set(getUniqueFolders(relatedNotePaths));
  for (const cf of canvasFiles) {
    if (folderMatches.has(cf.parent?.path || "")) addMemoryMapCandidate(candidates, seen, cf, "same-folder");
  }
  if (candidates.length > 0) return candidates;

  const mmFolder = settings.memoryMapFolder;
  if (mmFolder) {
    for (const notePath of relatedNotePaths) {
      const guess = `${mmFolder}/${getBaseName(notePath)}-memory.canvas`;
      const found = app.vault.getAbstractFileByPath(guess)
        || app.metadataCache.getFirstLinkpathDest(guess.split("/").pop(), "") || null;
      if (found) addMemoryMapCandidate(candidates, seen, found, "configured-folder", notePath);
    }
  }
  if (candidates.length > 0) return candidates;

  const topicFolders = getTopicFolders(relatedNotePaths);
  if (topicFolders.length > 0) {
    for (const cf of canvasFiles) {
      if (topicFolders.some(folder => cf.path.startsWith(folder + "/"))) {
        addMemoryMapCandidate(candidates, seen, cf, "topic-folder");
      }
    }
  }
  if (candidates.length > 0) return candidates;

  const deckToken = String(deckName || "").trim().toLowerCase();
  if (deckToken) {
    for (const cf of canvasFiles) {
      const hay = `${cf.path} ${getBaseName(cf.path)}`.toLowerCase();
      if (hay.includes(deckToken)) addMemoryMapCandidate(candidates, seen, cf, "deck-token");
    }
  }
  return candidates;
}

/** Plan B — async canvas file-node reverse lookup */
async function findMemoryMapCandidatesByCanvasContent(app, card, existingCandidates = []) {
  const relatedNotePaths = getCardRelatedNotePaths(card);
  if (relatedNotePaths.length === 0) return existingCandidates;
  const targets = new Set(relatedNotePaths);
  const candidates = [...existingCandidates];
  const seen = new Set(existingCandidates.map(candidate => candidate.path));
  for (const cf of getCanvasFiles(app)) {
    try {
      const json = JSON.parse(await app.vault.read(cf));
      const fileNodes = (json.nodes || []).filter(n => n.type === "file" && n.file);
      for (const fn of fileNodes) {
        if (targets.has(fn.file)) {
          addMemoryMapCandidate(candidates, seen, cf, "file-node", fn.file);
          break;
        }
      }
    } catch { /* skip malformed canvas */ }
  }
  return candidates;
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

function attachImgZoom(el){
  el.querySelectorAll("img").forEach(img=>{
    if(img.dataset.eqZoom)return;
    img.dataset.eqZoom="1";
    img.classList.add("eq-zoomable");
    img.addEventListener("click",e=>{
      e.stopPropagation();
      const lb=document.body.createEl("div",{attr:{class:"eq-lightbox"}});
      const close=lb.createEl("button",{attr:{class:"eq-lightbox-close"},text:"✕"});
      const lbImg=lb.createEl("img",{attr:{src:img.src,alt:img.alt||""}});
      const dismiss=()=>lb.remove();
      lb.addEventListener("click",dismiss);
      lbImg.addEventListener("click",e2=>e2.stopPropagation()); // don't dismiss on img tap
      close.addEventListener("click",dismiss);
    });
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
    let notePaths=getCardDisplayNotePaths(e);
    if(notePaths.length>0){
      let srcWrap=d.createEl("div",{attr:{style:"display:flex;align-items:center;gap:4px;margin-left:auto;flex-shrink:1;min-width:0;"}});
      notePaths.forEach(np=>{
        let name=np.split("/").pop().replace(/\.md$/i,"");
        let btn=srcWrap.createEl("button",{attr:{class:"lh-rc-edit-btn",style:"font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6366f1;",title:np}});
        btn.textContent="📄 "+name;
        btn.addEventListener("click",(ev)=>{ev.stopPropagation();const _f=this.app.vault.getAbstractFileByPath(np);if(_f){this.app.workspace.openLinkText(_f.path,"",false);}else{const _bn=np.split("/").pop().replace(/\.md$/i,"");const _fb=this.app.metadataCache.getFirstLinkpathDest(_bn,"");if(_fb){this.app.workspace.openLinkText(_fb.path,"",false);}else{new I.Notice("Source note not found: "+_bn);}}});
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
    editTopBtn.addEventListener("click",async()=>{
      if(e.notePath){
        try{
          const refreshed=await refreshTagSourceCard(this.app,e);
          if(!refreshed){new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));return;}
        }catch(err){console.error("review-edit: refresh failed",err);new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));return;}
      }
      this._renderEditForm(e);
    });
    // Delete button
    let delTopBtn=btnGroup.createEl("button",{attr:{class:"lh-rc-edit-btn",style:"color:#ef4444;"}});
    delTopBtn.textContent="🗑️";
    delTopBtn.title=c(t,"DELETE");
    delTopBtn.addEventListener("click",()=>this._renderDeleteConfirm(e));
    if(e.emoji){ i.createEl("span",{attr:{class:"lh-rc-emoji"}}).textContent=e.emoji; }
    let qEl=i.createEl("div",{attr:{class:"lh-rc-question"}});
    I.MarkdownRenderer.renderMarkdown(e.front||"",qEl,e.notePath||"",null);
    postProcessEmbed(qEl,this.app,e.notePath||"");
    attachImgZoom(qEl);

    // Hints
    let f=[{key:"hint_l1",cls:"lh-hint-l1",label:"L1 · Active Recall"},{key:"hint_l2",cls:"lh-hint-l2",label:"L2 · Contextual Anchor"},{key:"hint_l3",cls:"lh-hint-l3",label:"L3 · Narrowing Hint"}];
    for(let p=0;p<this.hintLevel;p++){
      let g=f[p],E=i.createEl("div",{attr:{class:`lh-hint ${g.cls}`}});
      E.createEl("div",{text:g.label,attr:{class:"lh-hint-label"}});
      let hintEl=E.createEl("div",{attr:{class:"lh-hint-text"}});
      I.MarkdownRenderer.renderMarkdown(e[g.key]||C("NO_HINT",t),hintEl,e.notePath||"",null);
      postProcessEmbed(hintEl,this.app,e.notePath||"");
      attachImgZoom(hintEl);
    }

    // Answer block
    if(this.answerShown){
      let p=i.createEl("div",{attr:{class:"lh-answer-block"}});
      // Answer header row: label on left, format buttons on right
      let answerHeader=p.createEl("div",{attr:{class:"lh-answer-header"}});
      answerHeader.createEl("div",{text:c(t,"ANSWER"),attr:{class:"lh-answer-label"}});
      let answerEl;
      let selectedAnswerText="";
      const captureAnswerSelection=()=>{
        const sel=window.getSelection&&window.getSelection();
        if(!sel||sel.rangeCount===0){selectedAnswerText="";return "";}
        const text=sel.toString();
        if(!text||!text.trim()){selectedAnswerText="";return "";}
        const anchor=sel.anchorNode;
        const focus=sel.focusNode;
        if(!answerEl||(!answerEl.contains(anchor)&&!answerEl.contains(focus))){selectedAnswerText="";return "";}
        selectedAnswerText=text.trim();
        return selectedAnswerText;
      };
      if(e.notePath){
        let fmtBtns=answerHeader.createEl("div",{attr:{class:"lh-answer-fmt-btns"}});
        const applyAnswerFmt=async(wrap)=>{
          const selectedText=captureAnswerSelection()||selectedAnswerText;
          if(!selectedText){new I.Notice(c(t,"FORMAT_SELECT_TEXT"));return;}
          if(!e.back.includes(selectedText)){new I.Notice(c(t,"FORMAT_SELECT_TEXT"));return;}
          const oldBack=e.back;
          const newBack=e.back.replace(selectedText,wrap+selectedText+wrap);
          try{
            const saved=await applyFormatToCardBack(this.app,e,oldBack,newBack);
            if(!saved){new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));return;}
            e.back=newBack;
            this._renderCardContent(e);
          }catch(err){console.error("format-apply failed",err);new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));}
        };
        let hlBtn=fmtBtns.createEl("button",{text:c(t,"FORMAT_HIGHLIGHT"),attr:{class:"lh-rc-edit-btn lh-fmt-btn"}});
        hlBtn.addEventListener("mousedown",(ev)=>{captureAnswerSelection();ev.preventDefault();});
        hlBtn.addEventListener("click",()=>applyAnswerFmt("=="));
        const applyBlockquoteToBack=async()=>{
          const selectedText=(captureAnswerSelection()||selectedAnswerText||'').trim();
          if(!selectedText){new I.Notice(c(t,"FORMAT_SELECT_PARA"));return;}
          const lines=e.back.split('\n');
          const selParts=selectedText.split('\n').map(p=>p.trim()).filter(Boolean);
          let startIdx=-1,endIdx=-1;
          for(let i=0;i<lines.length;i++){
            const raw=lines[i].replace(/^>\s*/,'').trim();
            if(startIdx===-1&&selParts[0]&&raw.includes(selParts[0])){startIdx=i;}
            if(startIdx!==-1&&selParts[selParts.length-1]&&raw.includes(selParts[selParts.length-1])){endIdx=i;break;}
          }
          if(startIdx===-1){startIdx=0;endIdx=lines.length-1;}
          if(endIdx===-1)endIdx=startIdx;
          const oldBack=e.back;
          const newLines=lines.map((line,i)=>(i>=startIdx&&i<=endIdx&&!line.startsWith('> '))?'> '+line:line);
          const newBack=newLines.join('\n');
          if(newBack===oldBack)return;
          try{
            const saved=await applyFormatToCardBack(this.app,e,oldBack,newBack);
            if(!saved){new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));return;}
            e.back=newBack;
            this._renderCardContent(e);
          }catch(err){console.error("blockquote-apply failed",err);new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));}
        };
        let bqBtn=fmtBtns.createEl("button",{text:c(t,"FORMAT_BLOCKQUOTE"),attr:{class:"lh-rc-edit-btn lh-fmt-btn"}});
        bqBtn.addEventListener("mousedown",(ev)=>{captureAnswerSelection();ev.preventDefault();});
        bqBtn.addEventListener("click",applyBlockquoteToBack);
      }
      answerEl=p.createEl("div",{attr:{class:"lh-answer-text"}});
      I.MarkdownRenderer.renderMarkdown(e.back||"",answerEl,e.notePath||"",null);
      postProcessEmbed(answerEl,this.app,e.notePath||"");
      attachImgZoom(answerEl);
      answerEl.addEventListener("mouseup",captureAnswerSelection);
      answerEl.addEventListener("keyup",captureAnswerSelection);
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
              
              if(E.q === 1) {
                _st.totalAgainCount = (_st.totalAgainCount || 0) + 1;
                this._perfectStreak = 0;
              } else {
                this._perfectStreak = (this._perfectStreak || 0) + 1;
                if (this._perfectStreak >= 20 && !this._perfectSessionAwarded) {
                  _st.perfectSessions = (_st.perfectSessions || 0) + 1;
                  this._perfectSessionAwarded = true;
                }
              }

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
      let memoryMapAction=null;
      const setMemoryMapAction=(candidates)=>{
        if(!candidates||candidates.length===0){
          memoryMapAction=null;
          k.disabled=true;
          k.style.opacity="0.38";
          k.style.cursor="not-allowed";
          return;
        }
        k.disabled=false;
        k.style.opacity="";
        k.style.cursor="";
        memoryMapAction=()=>this._openMemoryMapChooser(candidates);
      };
      k.addEventListener("click",()=>{ if(memoryMapAction) memoryMapAction(); });
      let w=findMemoryMapCandidatesSync(this.app,e,t,this.deckName);
      if(w.length>0){setMemoryMapAction(w);}
      else{setMemoryMapAction([]);
        const gen=this._mmGen=(this._mmGen||0)+1;
        findMemoryMapCandidatesByCanvasContent(this.app,e,w).then(found=>{if(this._mmGen===gen&&k.isConnected)setMemoryMapAction(found||[]);}).catch(()=>{});}

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

  _openMemoryMapChooser(candidates){
    const modal=new I.Modal(this.app);
    const isZh=L(this.plugin.settings)==="zh-tw";
    const reasonLabelMap={
      "same-folder": isZh?"同資料夾":"Same folder",
      "configured-folder": isZh?"設定資料夾":"Configured folder",
      "topic-folder": isZh?"同主題":"Same topic",
      "deck-token": isZh?"同 deck":"Deck match",
      "file-node": isZh?"關聯節點":"Linked node"
    };
    const reasonStyleMap={
      "same-folder":"background:rgba(34,197,94,0.16);color:#22c55e;border:1px solid rgba(34,197,94,0.28);",
      "configured-folder":"background:rgba(59,130,246,0.16);color:#60a5fa;border:1px solid rgba(96,165,250,0.28);",
      "topic-folder":"background:rgba(245,158,11,0.16);color:#f59e0b;border:1px solid rgba(245,158,11,0.28);",
      "deck-token":"background:rgba(168,85,247,0.16);color:#c084fc;border:1px solid rgba(192,132,252,0.28);",
      "file-node":"background:rgba(99,102,241,0.16);color:#818cf8;border:1px solid rgba(129,140,248,0.28);"
    };
    modal.modalEl.style.cssText="width:min(92vw,620px);padding:0;border-radius:18px;overflow:hidden;background:var(--background-primary,#141722);box-shadow:0 20px 50px rgba(0,0,0,0.35);";
    const wrap=modal.contentEl;
    wrap.style.cssText="padding:24px;display:flex;flex-direction:column;gap:14px;";
    wrap.createEl("div",{text:isZh?"選擇 Memory Map":"Select Memory Map",attr:{style:"font-size:18px;font-weight:800;color:var(--text-normal,#111);"}});
    wrap.createEl("div",{text:isZh?"選擇要開啟的地圖":"Choose the map to open",attr:{style:"font-size:12px;color:var(--text-muted,#6b7280);margin-top:-6px;"}});
    candidates.forEach(candidate=>{
      const card=wrap.createEl("div",{attr:{style:"display:flex;flex-direction:column;gap:12px;padding:16px 18px;border-radius:16px;border:1px solid rgba(148,163,184,0.18);background:linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015));cursor:pointer;transition:transform .12s ease,border-color .12s ease,background .12s ease;outline:none;"}});      
      card.setAttr("role","button");
      card.tabIndex=0;
      card.addEventListener("mouseenter",()=>{card.style.transform="translateY(-1px)";card.style.borderColor="rgba(99,102,241,0.42)";card.style.background="linear-gradient(180deg,rgba(99,102,241,0.10),rgba(255,255,255,0.02))";});
      card.addEventListener("mouseleave",()=>{card.style.transform="";card.style.borderColor="rgba(148,163,184,0.18)";card.style.background="linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))";});
      card.addEventListener("focus",()=>{card.style.borderColor="rgba(99,102,241,0.55)";card.style.boxShadow="0 0 0 3px rgba(99,102,241,0.12)";});
      card.addEventListener("blur",()=>{card.style.borderColor="rgba(148,163,184,0.18)";card.style.boxShadow="";});
      const topRow=card.createEl("div",{attr:{style:"width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;"}});
      topRow.createEl("div",{text:getBaseName(candidate.path),attr:{style:"flex:1 1 auto;min-width:0;font-size:17px;font-weight:800;color:var(--text-normal,#111);line-height:1.35;word-break:break-word;overflow-wrap:anywhere;"}});
      topRow.createEl("div",{text:reasonLabelMap[candidate.reason]||candidate.reason,attr:{style:`flex:0 0 auto;align-self:flex-start;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;${reasonStyleMap[candidate.reason]||"background:rgba(148,163,184,0.16);color:#cbd5e1;border:1px solid rgba(203,213,225,0.24);"}`}});
      const metaRow=card.createEl("div",{attr:{style:"display:flex;flex-wrap:wrap;gap:8px;width:100%;"}});
      metaRow.createEl("div",{text:candidate.file.parent?.path||candidate.path,attr:{style:"max-width:100%;padding:5px 10px;border-radius:999px;background:rgba(148,163,184,0.10);color:var(--text-muted,#6b7280);font-size:12px;line-height:1.45;word-break:break-word;overflow-wrap:anywhere;"}});
      if(candidate.relatedPath) metaRow.createEl("div",{text:isZh?`關聯：${getBaseName(candidate.relatedPath)}`:`Related: ${getBaseName(candidate.relatedPath)}`,attr:{style:"max-width:100%;padding:5px 10px;border-radius:999px;background:rgba(99,102,241,0.14);color:#818cf8;font-size:12px;line-height:1.45;word-break:break-word;overflow-wrap:anywhere;"}});
      const openCandidate=()=>{modal.close();this.app.workspace.openLinkText(candidate.path,"",false);};
      card.addEventListener("click",openCandidate);
      card.addEventListener("keydown",(ev)=>{ if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); openCandidate(); } });
    });
    const closeBtn=wrap.createEl("button",{text:isZh?"取消":"Cancel",attr:{style:"margin-top:4px;padding:10px 12px;border-radius:12px;border:1px solid rgba(148,163,184,0.18);background:rgba(148,163,184,0.08);color:var(--text-muted,#6b7280);cursor:pointer;font-size:13px;font-weight:600;"}}); 
    closeBtn.addEventListener("click",()=>modal.close());
    modal.open();
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
    // Back field: inline creation so format bar lives in the label row
    let backField=body.createEl("div",{attr:{class:"lh-edit-field"}});
    let backHeader=backField.createEl("div",{attr:{class:"lh-edit-field-header"}});
    backHeader.createEl("label",{text:c(t,"EDIT_BACK"),attr:{class:"lh-edit-label"}});
    let backFmtBar=backHeader.createEl("div",{attr:{class:"lh-edit-fmt-bar"}});
    let taBack=backField.createEl("textarea",{attr:{class:"lh-edit-textarea"}});
    taBack.value=e.back||"";
    taBack.style.minHeight="140px";
    function autoResize(ta){ta.style.height="auto";ta.style.height=ta.scrollHeight+"px";}
    autoResize(taBack);
    taBack.addEventListener("input",()=>autoResize(taBack));
    const applyEditFmt=(ta,wrap)=>{
      const start=ta.selectionStart;
      const end=ta.selectionEnd;
      if(start===end){new I.Notice(c(t,"FORMAT_SELECT_TEXT"));return;}
      const sel=ta.value.slice(start,end);
      ta.value=ta.value.slice(0,start)+wrap+sel+wrap+ta.value.slice(end);
      ta.selectionStart=start+wrap.length;
      ta.selectionEnd=end+wrap.length;
      ta.focus();
      autoResize(ta);
    };
    let hlEditBtn=backFmtBar.createEl("button",{text:c(t,"FORMAT_HIGHLIGHT"),attr:{class:"lh-rc-edit-btn lh-fmt-btn"}});
    hlEditBtn.addEventListener("click",()=>applyEditFmt(taBack,"=="));
    const applyBlockquoteEdit=(ta)=>{
      const lineStart=ta.value.lastIndexOf('\n',ta.selectionStart-1)+1;
      let lineEnd=ta.value.indexOf('\n',ta.selectionEnd);
      if(lineEnd===-1)lineEnd=ta.value.length;
      const sel=ta.value.slice(lineStart,lineEnd);
      if(!sel.trim())return;
      const quoted=sel.split('\n').map(l=>l.startsWith('> ')?l:'> '+l).join('\n');
      ta.value=ta.value.slice(0,lineStart)+quoted+ta.value.slice(lineEnd);
      ta.selectionStart=lineStart;
      ta.selectionEnd=lineStart+quoted.length;
      ta.focus();
      autoResize(ta);
    };
    let bqEditBtn=backFmtBar.createEl("button",{text:c(t,"FORMAT_BLOCKQUOTE"),attr:{class:"lh-rc-edit-btn lh-fmt-btn"}});
    bqEditBtn.addEventListener("click",()=>applyBlockquoteEdit(taBack));

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
        let saved=false;
        if(e.notePath){
          saved=await saveTagSourceCard(this.app, e, newData);
        } else {
          // inline card: find source via active MarkdownView
          const view=this.app.workspace.getActiveViewOfType&&this.app.workspace.getActiveViewOfType(I.MarkdownView);
          const sourcePath=view&&view.file&&view.file.path;
          if(sourcePath){await saveInlineCard(this.app, sourcePath, e, newData);saved=true;}
        }
        if(!saved){new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));saveBtn.disabled=false;return;}
        // Update in-memory card
        e.front=newData.front; e.back=newData.back;
        e.hint_l1=newData.hint_l1; e.hint_l2=newData.hint_l2; e.hint_l3=newData.hint_l3;
      } catch(err){ console.error("review-edit: save failed",err);new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));saveBtn.disabled=false;return; }
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

module.exports = {
  ReviewSessionModal: Q,
  __private: {
    isAiReviewCard,
    getCardRelatedNotePaths,
    getCardDisplayNotePaths,
    getTopicFolders,
    findMemoryMapCandidatesSync,
    findMemoryMapCandidatesByCanvasContent
  }
};
