"use strict";
const I = require("obsidian");
const { computeFsrs: P } = require("../fsrs");
const { t: c, tAlt: C, getLocale: _getLocale } = require("../i18n");
const { anySrPattern: ge, getReviewStatus: $, loadSrData, saveSrData, buildSrRecord } = require("./helpers");
const { loadSynapseStatus, loadSynapseBatch, attachSynapseToCards, isSynapseEnabled } = require("./synapse");
const { SynapseMapSession } = require("./synapse-session");
const { renderSynapseMap } = require("./synapse-panel");
const { ACHIEVEMENTS, RARITY_DARK, RARITY_LIGHT } = require("../hub/achievement");
const { assetUrl } = require("../assets");
const { wrapSelection, selectionLines } = require("./format");
const { saveTagSourceCard, saveInlineCard, deleteTagSourceCard, applyFormatToCardBack, refreshTagSourceCard } = require("./edit");
const { registerSelectionCopy } = require("../ui/selection-copy");
const { normalizeMarkdown } = require("../ui/markdown");
const { addToQueue, readQueue, isQueued } = require("../explainer/data");
const { ExplainerViewerModal } = require("../explainer/viewer-modal");
const { LessonViewerModal, CanvasLessonModal } = require("../lessons/viewer-modal");
const { addRewatchButton, rewatchTarget, openRewatch } = require("../videos/rewatch");
const { watchTheme, themedModal, restoreButton: _restoreButton, featureIcon: _featureIcon, icon: _uiIcon, iconButton: _uiIconButton, isPhone: _isPhone } = require("../hub/ui");
const W_ref = { get locale() { try { return I.moment && I.moment.locale && I.moment.locale(); } catch(e) { return "en"; } } };
function L(s) { return _getLocale(s, W_ref.locale); }

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
      const lb=activeDocument.body.createEl("div",{attr:{class:"eq-lightbox"}});
      const close=lb.createEl("button",{attr:{class:"eq-lightbox-close"},text:"✕"});
      const lbImg=lb.createEl("img",{attr:{src:img.src,alt:img.alt||""}});
      const dismiss=()=>lb.remove();
      lb.addEventListener("click",dismiss);
      lbImg.addEventListener("click",e2=>e2.stopPropagation()); // don't dismiss on img tap
      close.addEventListener("click",dismiss);
    });
  });
}

function buildEvalContext(st) {
  const vals = Object.values((st && st.dailyReviewLog) || {});
  return {
    totalCardsReviewed: (st && st.totalCardsReviewed) || 0,
    longestStreak:      (st && st.longestStreak)      || 0,
    maxDaily:           vals.length > 0 ? Math.max(...vals) : 0,
    perfectSessions:    (st && st.perfectSessions)    || 0,
    totalAgainCount:    (st && st.totalAgainCount)    || 0,
  };
}

var Q=class extends I.Modal{
  constructor(e,t,r,s,l,a={}){
    super(e);
    this.cards=t; this.deckName=r; this.plugin=s;
    this.idx=0; this.hintLevel=0; this.answerShown=false;
    // A timed session is a pick across decks under a made-up name, so it never becomes the resume point.
    this.onBack=l||null; this.browseOnly=!!a.browseOnly; this.noResume=!!a.noResume||!!a.timeboxMinutes;
    this._rating_locked=false; // Task 4: lock flag
    this.synapseOpen=false;
    this._synapseStatus=null;
    this._synapseExpandedId=null;
    this._synapse=this._newSynapseMap();
    this._timeboxMinutes=a.timeboxMinutes||0;
    this._sessionStartMs=0;
    this._timerIntervalId=null;
    this._timerEl=null;
    this._timeboxExpired=false;
  }

  onOpen(){
    // Save initial progress on open
    this._saveResumePoint();
    this._preSessionEvalCtx = buildEvalContext(this.plugin.settings._stats);
    this.modalEl.addClass("lh-hub","lh-session");
    registerSelectionCopy(this);
    watchTheme(this,{vars:true});
    if(this._timeboxMinutes>0) this._sessionStartMs=Date.now();
    this.renderCard();
    this._loadSynapseAsync();
    if(this._timeboxMinutes>0) this._timerIntervalId=window.setInterval(()=>this._tickTimer(),1000);
  }

  _tickTimer(){
    const t=this.plugin.settings;
    const elapsed=Math.floor((Date.now()-this._sessionStartMs)/1000);
    const remaining=this._timeboxMinutes*60-elapsed;
    if(remaining<=0&&!this._timeboxExpired){
      this._timeboxExpired=true;
      window.clearInterval(this._timerIntervalId); this._timerIntervalId=null;
    }
    if(!this._timerEl||!this._timerEl.isConnected) return;
    if(remaining<=0){
      this._timerEl.textContent=`⏱ ${c(t,"TIMEBOX_TIMES_UP")}`;
      this._timerEl.style.color="var(--newt)";
    } else {
      const mm=Math.floor(remaining/60),ss=remaining%60;
      this._timerEl.textContent=`⏱ ${mm}:${ss.toString().padStart(2,"0")}`;
      this._timerEl.style.color=remaining<=60?"var(--newt)":"var(--text2)";
    }
  }

  // Fire-and-forget after the modal opens; on success re-renders the pre-answer
  // card so the ⚡ button appears without blocking initial render.
  async _loadSynapseAsync(){
    try{
      if(!this.plugin.settings.licenseValid){ this._synapseStatus={ enabled:false, reason:"not-pro" }; return; }
      const adapter=this.app.vault.adapter;
      this._synapseStatus=await loadSynapseStatus(adapter);
      if(!isSynapseEnabled(this._synapseStatus)) return;
      const notePaths=this.cards.map(c=>c&&c.notePath).filter(Boolean);
      const batch=await loadSynapseBatch(adapter,notePaths);
      attachSynapseToCards(this.cards,batch);
      if(!this.answerShown && this.cards[this.idx] && this.contentEl && this.contentEl.isConnected){
        this._renderCardContent(this.cards[this.idx]);
      }
    }catch(err){ console.warn("synapse: load failed",err); }
  }

  // The ⚡ map's logic lives in synapse-session.js; this hands it the session's own pieces: where a
  // card came from, and the viewers. Lessons, videos, Deep Dive pages and recall topics are read
  // once per session and only when the user first opens ⚡, so opening a session costs no more.
  _newSynapseMap(){
    return new SynapseMapSession({
      adapter:this.app.vault.adapter,
      allowed:()=>!!this.plugin.settings.licenseValid&&isSynapseEnabled(this._synapseStatus),
      sourcePaths:getCardRelatedNotePaths,
      anchorBack:(anchor)=>this._lookupAnchorBack(anchor),
      resolvedLinks:()=>this.app.metadataCache.resolvedLinks,
      noteExists:(p)=>!!this.app.vault.getAbstractFileByPath(p),
      openers:{
        // A note opens in Obsidian and the session steps aside so it can be read; the rest open in
        // the viewer the Hub already uses for them, on top of the session.
        note:(path)=>{ this.app.workspace.openLinkText(path,"",false); this._minimize(); },
        lesson:({slug,meta,lesson,onClose})=>{
          if(lesson.type==="canvas") new CanvasLessonModal(this.app,this.plugin,slug,meta,lesson,onClose,this).open();
          else new LessonViewerModal(this.app,this.plugin,slug,meta,lesson,onClose).open();
        },
        explainer:(page,onChanged)=>new ExplainerViewerModal(this.app,this.plugin,page,onChanged,this).open(),
        video:(video)=>openRewatch(this.app,video),
        missing:()=>new I.Notice(c(this.plugin.settings,"SYNAPSE_NOT_HERE")),
      },
    });
  }

  renderCard(){
    this.hintLevel=0; this.answerShown=false; this._rating_locked=false;
    this.synapseOpen=false; this._synapseExpandedId=null;
    this._synapse.retry();
    // Save progress
    this._saveResumePoint();
    this._renderCardContent(this.cards[this.idx]);
  }

  // The Hub's resume banner names a real deck; a partial session (one video's cards) must neither set nor clear it.
  _saveResumePoint(){
    if(this.noResume)return;
    this.plugin.settings._reviewProgress={deck:this.deckName,idx:this.idx};
    this.plugin.saveData(this.plugin.settings);
  }

  // Task 6: completion screen
  _renderComplete(){
    let t=this.plugin.settings;
    if(!this.noResume){
      delete this.plugin.settings._reviewProgress;
      this.plugin.saveData(this.plugin.settings);
    }

    const _postCtx = buildEvalContext(this.plugin.settings._stats);
    const _preCtx  = this._preSessionEvalCtx || {};
    const newlyUnlocked = ACHIEVEMENTS.filter(ach => {
      const pre  = _preCtx[ach.field]  ?? -1;
      const post = _postCtx[ach.field] ?? -1;
      if (pre < 0 || post < 0) return false; // needs deck/map data, not in session stats
      return pre < ach.threshold && post >= ach.threshold;
    });

    const isDark = activeDocument.body.classList.contains("theme-dark");
    const rarityStyles = isDark ? RARITY_DARK : RARITY_LIGHT;

    this.contentEl.empty();
    let wrap=this.contentEl.createEl("div",{attr:{class:"lh-complete-screen",style:"flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center;gap:16px;overflow-y:auto;"}});
    wrap.createEl("div",{attr:{style:"font-size:56px;line-height:1;"}}).textContent="🎉";
    wrap.createEl("div",{attr:{class:"lh-complete-title",style:"font-size:24px;font-weight:700;color:var(--text);"}}).textContent=c(t,"REVIEW_COMPLETE");
    {
      let _statLine=`${this.deckName} · ${this.cards.length} ${c(t,"CARDS_REVIEWED")}`;
      if(this._timeboxMinutes>0){
        const _es=Math.floor((Date.now()-this._sessionStartMs)/1000);
        _statLine+=` · ${Math.floor(_es/60)}:${(_es%60).toString().padStart(2,"0")}`;
      }
      wrap.createEl("div",{attr:{style:"font-size:14px;color:var(--text2);line-height:1.6;max-width:260px;"}}).textContent=_statLine;
    }

    // Show newly unlocked achievements
    if(newlyUnlocked.length>0){
      const achWrap=wrap.createEl("div",{attr:{style:"width:100%;max-width:320px;margin-top:4px;"}});
      achWrap.createEl("div",{attr:{style:"font-size:12px;font-weight:600;color:var(--text3);margin-bottom:10px;"}}).textContent="🏆 "+c(t,"ACH_SESSION_UNLOCKED");
      const achRow=achWrap.createEl("div",{attr:{style:"display:flex;flex-wrap:wrap;gap:12px;justify-content:center;"}});
      for(const ach of newlyUnlocked){
        const rs=rarityStyles[ach.rarity];
        const card=achRow.createEl("div",{attr:{style:`display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 10px 10px;border-radius:16px;background:${rs.bg};box-shadow:0 0 20px ${rs.glow};width:94px;position:relative;`}});
        card.createEl("div",{attr:{style:`font-size:9px;font-weight:800;color:${rs.badge};background:${rs.badge}22;padding:2px 8px;border-radius:99px;`}}).textContent=ach.rarity;
        const iconWrap=card.createEl("div",{attr:{style:"position:relative;margin:4px 0;"}});
        iconWrap.createEl("div",{attr:{style:`position:absolute;inset:-10px;border-radius:50%;background:radial-gradient(circle,${rs.glow} 0%,transparent 70%);pointer-events:none;`}});
        const iconSrc=assetUrl(this.plugin.app,ach.icon);
        const img=iconWrap.createEl("img",{attr:{src:iconSrc,width:"56",height:"56",style:"object-fit:contain;display:block;position:relative;z-index:1;"}});
        img.onerror=()=>{iconWrap.empty();iconWrap.createEl("span",{attr:{style:"font-size:36px;line-height:1;"}}).textContent="🏆";};
        card.createEl("div",{attr:{style:`font-size:10px;font-weight:700;color:var(--text);text-align:center;line-height:1.3;padding:0 2px;`}}).textContent=c(t,ach.nameKey);
      }
    }

    let btnRow=wrap.createEl("div",{attr:{style:"display:flex;flex-direction:column;gap:10px;width:100%;max-width:280px;margin-top:8px;"}});
    let btnHub=btnRow.createEl("button",{attr:{class:"lh-pbtn"}});
    btnHub.textContent=c(t,"BACK_TO_HUB");
    btnHub.addEventListener("click",()=>{ this.close(); this.onBack&&this.onBack(); });
    let btnClose=btnRow.createEl("button",{attr:{class:"lh-pbtn alt"}});
    btnClose.textContent=c(t,"HUB_CLOSE");
    btnClose.addEventListener("click",()=>this.close());
  }

  _renderCardContent(e){
    let t=this.plugin.settings;
    let _openedSourceLabel=L(t)==="zh-tw"?"已開啟":"Opened";
    this.contentEl.empty();
    // Render markdown into el (clears existing children first), then run the
    // standard embed/image-zoom post-processors. Used for question, hints,
    // answer (initial), and answer (in-place refresh after format apply).
    const renderMd=(el,text)=>{
      el.empty();
      I.MarkdownRenderer.renderMarkdown(normalizeMarkdown(text||""),el,e.notePath||"",null);
      postProcessEmbed(el,this.app,e.notePath||"");
      attachImgZoom(el);
    };
    const phone=_isPhone();
    const notePaths=getCardDisplayNotePaths(e);
    const goBack=()=>{ this.close(); this.onBack&&this.onBack(); };
    const openNote=(np)=>{const _f=this.app.vault.getAbstractFileByPath(np);if(_f){this.app.workspace.openLinkText(_f.path,"",false);}else{const _bn=np.split("/").pop().replace(/\.md$/i,"");const _fb=this.app.metadataCache.getFirstLinkpathDest(_bn,"");if(_fb){this.app.workspace.openLinkText(_fb.path,"",false);}else{new I.Notice("Source note not found: "+_bn);}}};
    const copyCard=()=>{
      let parts=[e.front];
      if(e.hint_l1) parts.push("L1: "+e.hint_l1);
      if(e.hint_l2) parts.push("L2: "+e.hint_l2);
      if(e.hint_l3) parts.push("L3: "+e.hint_l3);
      parts.push("A: "+e.back);
      return navigator.clipboard.writeText(parts.join("\n"));
    };
    const editCard=async()=>{
      if(e.notePath){
        try{
          const refreshed=await refreshTagSourceCard(this.app,e);
          if(!refreshed){new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));return;}
        }catch(err){console.error("review-edit: refresh failed",err);new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));return;}
      }
      this._renderEditForm(e);
    };
    const deleteCard=()=>this._renderDeleteConfirm(e);
    const resetHints=()=>{this.hintLevel=0;this.answerShown=false;this._renderCardContent(e);};
    // Memory Map entry — Plan A (sync) then Plan B (async fallback)
    const bindMemoryMap=(btn)=>{
      let memoryMapAction=null;
      const setMemoryMapAction=(candidates)=>{
        if(!candidates||candidates.length===0){
          memoryMapAction=null;
          this._disablePillBtn(btn);
          return;
        }
        this._enablePillBtn(btn);
        memoryMapAction=()=>this._openMemoryMapChooser(candidates);
      };
      btn.addEventListener("click",()=>{ if(memoryMapAction) memoryMapAction(); });
      let w=findMemoryMapCandidatesSync(this.app,e,t,this.deckName);
      if(w.length>0){setMemoryMapAction(w);}
      else{setMemoryMapAction([]);
        const gen=this._mmGen=(this._mmGen||0)+1;
        findMemoryMapCandidatesByCanvasContent(this.app,e,w).then(found=>{if(this._mmGen===gen&&btn.isConnected)setMemoryMapAction(found||[]);}).catch(()=>{});}
    };
    const synapseEnabled=this.plugin.settings.licenseValid && isSynapseEnabled(this._synapseStatus);
    // A card in a file can always have links (at least where it came from); once the content is
    // read, the answer is exact. The count is of the full graph, so ⚡ stays on before the reveal.
    const synapseHasLinks=this._synapse.hasLinks(e);
    // Filled in once the card body exists; the phone menu and the desktop pill both call it.
    let toggleSynapse=()=>{};

    if(phone){
      const rewatch=rewatchTarget(this.app,e);
      let rewatchFound=false;
      if(rewatch) this.app.vault.adapter.exists(rewatch.path).then(found=>{rewatchFound=found;}).catch(()=>{});
      let queued=false;
      if(t.licenseValid) readQueue(this.app.vault.adapter).then(_q=>{queued=isQueued(_q,e.notePath,e.front);}).catch(()=>{});
      const openMore=(ev)=>{
        const menu=new I.Menu();
        const add=(title,iconName,run,disabled)=>menu.addItem(item=>{item.setTitle(title).setIcon(iconName).setDisabled(!!disabled).onClick(run);});
        notePaths.forEach(np=>add(np.split("/").pop().replace(/\.md$/i,""),"file-text",()=>openNote(np)));
        add(c(t,"COPY_CARD"),"copy",()=>copyCard().then(()=>new I.Notice(c(t,"COPY_CARD_DONE"))));
        add(c(t,"EDIT_CARD"),"pencil",editCard);
        add(c(t,"DELETE"),"trash-2",deleteCard);
        if(synapseEnabled) add(c(t,"SYNAPSE"),"zap",()=>toggleSynapse(),!synapseHasLinks);
        if(t.licenseValid&&this.answerShown&&!this.browseOnly) add(queued?c(t,"EXPLAINER_ALREADY"):c(t,"EXPLAINER_MARK_BTN"),"bookmark-plus",async()=>{
          try{const _r=await addToQueue(this.app.vault.adapter,{source:e.notePath,q:e.front,a:e.back,deck:this.deckName||null});new I.Notice(_r.added?c(t,"EXPLAINER_MARKED"):c(t,"EXPLAINER_ALREADY"));queued=true;}catch(err){console.error("EngramQuest: explainer queue failed",err);}
        },queued);
        if(rewatchFound&&this.answerShown) add(c(t,"CARD_REWATCH"),"play",()=>openRewatch(this.app,rewatch));
        add(c(t,"HUB_MINIMIZE"),"chevrons-down",()=>this._minimize());
        menu.showAtMouseEvent(ev);
      };
      const nav=this.contentEl.createEl("div",{cls:"lh-snav"});
      nav.createEl("button",{cls:"lh-pback",text:`‹ ${c(t,"DECK_COLUMN")}`}).addEventListener("click",goBack);
      nav.createEl("span",{cls:"lh-snav-count",text:`${this.idx+1} / ${this.cards.length}`});
      if(this._timeboxMinutes>0){
        this._timerEl=nav.createEl("span",{attr:{class:"lh-timebox-clock"}});
        this._tickTimer();
      }
      const acts=nav.createEl("div",{cls:"lh-snav-acts"});
      bindMemoryMap(_uiIcon(acts.createEl("button",{cls:"lh-sib",attr:{"aria-label":c(t,"MEMORY_MAP"),title:c(t,"MEMORY_MAP")}}),"map"));
      _uiIconButton(acts,"reset",c(t,"RESET_HINTS"),resetHints,"lh-sib");
      _uiIconButton(acts,"more",c(t,"MORE_ACTIONS"),openMore,"lh-sib");
      const prog=this.contentEl.createEl("div",{cls:"lh-sprog"});
      prog.createEl("i",{attr:{style:`width:${Math.round((this.idx+1)/this.cards.length*100)}%`}});
    } else {
      // Nav
      let r=this.contentEl.createEl("div",{attr:{class:"lh-review-nav"}});
      const brand=r.createEl("span",{attr:{class:"lh-review-logo"}});
      _featureIcon(brand,this.plugin,"logo",{size:28});
      brand.createEl("span",{text:c(t,"HUB_TITLE")});
      // Review Deck is where we are; the other two leave the session (progress is already saved) and open the Hub there.
      let s=r.createEl("div",{attr:{class:"lh-review-tabs",role:"group",["aria-label"]:c(t,"HUB_NAV")}});
      [{label:c(t,"TAB_REVIEW"),key:"review",fb:"deck"},{label:c(t,"TAB_MEMORY"),key:"memory",fb:"map"},{label:c(t,"TAB_QUEST"),key:"quest",fb:"flag"}].forEach(p=>{
        let g=s.createEl("button",{attr:{class:"lh-review-tab"+(p.key==="review"?" active":""),...(p.key==="review"?{"aria-current":"page"}:{})}});
        _featureIcon(g,this.plugin,p.key,{size:24,fallback:p.fb});
        g.createEl("span",{text:p.label});
        if(p.key!=="review") g.addEventListener("click",()=>this._openHubTab(p.key));
      });
      if(this._timeboxMinutes>0){
        this._timerEl=r.createEl("span",{attr:{class:"lh-timebox-clock"}});
        this._tickTimer();
      }
      let a=r.createEl("button",{attr:{class:"lh-review-back"}});
      _uiIcon(a,"back");
      a.createEl("span",{text:c(t,"BACK")});
      a.addEventListener("click",goBack);
      const cap=r.createEl("div",{cls:"lh-review-cap"});
      _uiIconButton(cap,"minimize",c(t,"HUB_MINIMIZE"),()=>this._minimize());
      _uiIconButton(cap,"close",c(t,"HUB_CLOSE"),()=>this.close());
    }

    // Card body
    let i=this.contentEl.createEl("div",{attr:{class:"lh-review-body"+(phone?(this.answerShown&&!this.browseOnly?" has-grades":" has-bar"):"")}}).createEl("div",{attr:{class:"lh-review-card"}});
    if(phone){
      if(this.browseOnly) i.createEl("span",{text:c(t,"BROWSE_ONLY"),attr:{class:"lh-rc-badge"}});
    } else {
      let d=i.createEl("div",{attr:{class:"lh-rc-top"}});
      const deck=d.createEl("span",{attr:{class:"lh-rc-deck",title:this.deckName}});
      _uiIcon(deck,"layers");
      deck.createEl("span",{text:this.deckName});
      this.browseOnly&&d.createEl("span",{text:c(t,"BROWSE_ONLY"),attr:{class:"lh-rc-badge"}});
      // Source note buttons — for AI cards show sourceNotePaths only, for hand-written show notePath
      if(notePaths.length>0){
        let srcWrap=d.createEl("div",{attr:{style:"display:flex;align-items:center;gap:4px;margin-left:auto;flex-shrink:1;min-width:0;"}});
        notePaths.forEach(np=>{
          let name=np.split("/").pop().replace(/\.md$/i,"");
          let btn=srcWrap.createEl("button",{attr:{class:"lh-rc-edit-btn lh-rc-src",title:np}});
          _uiIcon(btn,"doc");
          const label=btn.createEl("span",{text:name});
          _uiIcon(btn,"external");
          btn.addEventListener("click",(ev)=>{
            ev.stopPropagation();
            openNote(np);
            label.textContent=_openedSourceLabel;
            btn.classList.add("is-done");
            if(btn._feedbackTimer) window.clearTimeout(btn._feedbackTimer);
            btn._feedbackTimer=window.setTimeout(()=>{ label.textContent=name; btn.classList.remove("is-done"); btn._feedbackTimer=null; },1200);
          });
        });
      }
      // Right-side button group
      let btnGroup=d.createEl("div",{attr:{class:"lh-rc-acts"}});
      const topBtn=(name,label,cls="")=>{
        const b=btnGroup.createEl("button",{attr:{class:"lh-rc-edit-btn"+cls,title:label}});
        _uiIcon(b,name);
        return [b,b.createEl("span",{text:label})];
      };
      // Copy: the label changes in place for a moment; the button keeps its width.
      const [copyTopBtn,copyLabel]=topBtn("copy",c(t,"COPY"));
      copyTopBtn.addEventListener("click",()=>{
        copyCard().then(()=>{ copyLabel.textContent=c(t,"COPY_CARD_DONE"); copyTopBtn.classList.add("is-done"); window.setTimeout(()=>{ copyLabel.textContent=c(t,"COPY"); copyTopBtn.classList.remove("is-done"); },1500); });
      });
      topBtn("pencil",c(t,"EDIT_CARD"))[0].addEventListener("click",editCard);
      topBtn("trash",c(t,"DELETE")," is-danger")[0].addEventListener("click",deleteCard);
    }
    if(e.emoji){ i.createEl("span",{attr:{class:"lh-rc-emoji"}}).textContent=e.emoji; }
    let qEl=i.createEl("div",{attr:{class:"lh-rc-question"+(phone&&this.answerShown?" is-done":"")}});
    renderMd(qEl,e.front);

    // Stable containers for hints + synapse — refreshed in-place so toggling
    // doesn't rebuild the whole card (preserves scroll, avoids flash).
    // Mutex: hints render only when synapse is closed; clicking a hint closes synapse.
    let f=[{key:"hint_l1",cls:"lh-hint-l1",label:phone?c(t,"HINT_LABEL_L1"):"L1 · "+c(t,"HINT_LABEL_L1")},{key:"hint_l2",cls:"lh-hint-l2",label:phone?c(t,"HINT_LABEL_L2"):"L2 · "+c(t,"HINT_LABEL_L2")},{key:"hint_l3",cls:"lh-hint-l3",label:phone?c(t,"HINT_LABEL_L3"):"L3 · "+c(t,"HINT_LABEL_L3")}];
    const hintsContainer=i.createEl("div",{attr:{class:"lh-hints-container"}});
    const synapseContainer=i.createEl("div",{attr:{class:"lh-synapse-container"}});
    const refreshHintsContainer=()=>{
      hintsContainer.empty();
      if(this.synapseOpen) return;
      for(let p=0;p<this.hintLevel;p++){
        let g=f[p],E=hintsContainer.createEl("div",{attr:{class:`lh-hint ${g.cls}`}});
        const hl=E.createEl("div",{attr:{class:"lh-hint-label"}});
        if(!phone) _featureIcon(hl,this.plugin,"hint",{size:18});
        hl.createEl("span",{text:g.label});
        let hintEl=E.createEl("div",{attr:{class:"lh-hint-text"}});
        renderMd(hintEl,e[g.key]||C("NO_HINT",t));
      }
    };
    const refreshSynapseContainer=()=>{
      synapseContainer.empty();
      if(!this.synapseOpen||!synapseEnabled) return;
      this._renderSynapsePanel(synapseContainer,e,t,renderMd,refreshSynapseContainer);
    };
    // After the answer the map opens below it, possibly out of view: bring it in.
    const revealSynapse=()=>{ if(this.synapseOpen) synapseContainer.scrollIntoView({block:"nearest"}); };
    toggleSynapse=()=>{ this.synapseOpen=!this.synapseOpen; refreshHintsContainer(); refreshSynapseContainer(); revealSynapse(); };
    refreshHintsContainer();
    refreshSynapseContainer();

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
      // Answer-header button row — always present so post-reveal Synapse toggle has a home.
      let fmtBtns=answerHeader.createEl("div",{attr:{class:"lh-answer-fmt-btns"}});
      // Post-reveal Synapse access: ⚡ toggle next to Highlight/Blockquote.
      if(!phone&&synapseHasLinks){
        const syHeaderBtn=fmtBtns.createEl("button",{attr:{class:"lh-rc-edit-btn lh-fmt-btn",title:c(t,"SYNAPSE_HINT")}});
        _featureIcon(syHeaderBtn,this.plugin,"synapse",{size:18});
        syHeaderBtn.createEl("span",{text:c(t,"SYNAPSE")});
        syHeaderBtn.addEventListener("click",()=>{ this.synapseOpen=!this.synapseOpen; refreshSynapseContainer(); revealSynapse(); });
      }
      if(e.notePath){
        // In-place answer refresh — full _renderCardContent rebuilds .lh-review-card and
        // resets scrollTop, which the user perceives as a flash + jump-to-top when they
        // had scrolled down to highlight something. Updating just answerEl preserves scroll.
        const refreshAnswerEl=()=>{ renderMd(answerEl,e.back); selectedAnswerText=""; };
        const applyAnswerFmt=async(wrap)=>{
          const rawSel=(captureAnswerSelection()||selectedAnswerText).replace(/\r\n/g,"\n");
          if(!rawSel){new I.Notice(c(t,"FORMAT_SELECT_TEXT"));return;}
          // The selection is rendered text; the source also holds hidden markup and line breaks.
          const oldBack=e.back;
          const newBack=wrapSelection(e.back,rawSel,wrap);
          if(newBack===null){new I.Notice(c(t,"FORMAT_NOT_FOUND"));return;}
          try{
            const saved=await applyFormatToCardBack(this.app,e,oldBack,newBack);
            if(!saved){new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));return;}
            e.back=newBack;
            refreshAnswerEl();
          }catch(err){console.error("format-apply failed",err);new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));}
        };
        let hlBtn=fmtBtns.createEl("button",{text:c(t,"FORMAT_HIGHLIGHT"),attr:{class:"lh-rc-edit-btn lh-fmt-btn"}});
        hlBtn.addEventListener("mousedown",(ev)=>{captureAnswerSelection();ev.preventDefault();});
        hlBtn.addEventListener("click",()=>applyAnswerFmt("=="));
        const applyBlockquoteToBack=async()=>{
          const selectedText=(captureAnswerSelection()||selectedAnswerText||'').trim();
          if(!selectedText){new I.Notice(c(t,"FORMAT_SELECT_PARA"));return;}
          const lines=e.back.split('\n');
          // Quote only the lines the selection covers; a selection that cannot be found changes nothing.
          const span=selectionLines(e.back,selectedText);
          if(!span){new I.Notice(c(t,"FORMAT_NOT_FOUND"));return;}
          const startIdx=span.first,endIdx=span.last;
          const oldBack=e.back;
          const newLines=lines.map((line,i)=>(i>=startIdx&&i<=endIdx&&!line.startsWith('> '))?'> '+line:line);
          const newBack=newLines.join('\n');
          if(newBack===oldBack)return;
          try{
            const saved=await applyFormatToCardBack(this.app,e,oldBack,newBack);
            if(!saved){new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));return;}
            e.back=newBack;
            refreshAnswerEl();
          }catch(err){console.error("blockquote-apply failed",err);new I.Notice(c(t,"CREATE_CARD_SAVE_FAILED"));}
        };
        let bqBtn=fmtBtns.createEl("button",{text:c(t,"FORMAT_BLOCKQUOTE"),attr:{class:"lh-rc-edit-btn lh-fmt-btn"}});
        bqBtn.addEventListener("mousedown",(ev)=>{captureAnswerSelection();ev.preventDefault();});
        bqBtn.addEventListener("click",applyBlockquoteToBack);
      }
      if(t.licenseValid&&!phone&&!this.browseOnly){
        const qBtn=fmtBtns.createEl("button",{attr:{class:"lh-rc-edit-btn lh-fmt-btn lh-queue-btn"}});
        _uiIcon(qBtn,"plus");
        const qLabel=qBtn.createEl("span",{text:c(t,"EXPLAINER_MARK_BTN")});
        const markQueued=()=>{ qLabel.textContent=c(t,"EXPLAINER_ALREADY"); qBtn.disabled=true; };
        qBtn.addEventListener("click",async()=>{try{const _r=await addToQueue(this.app.vault.adapter,{source:e.notePath,q:e.front,a:e.back,deck:this.deckName||null});new I.Notice(_r.added?c(t,"EXPLAINER_MARKED"):c(t,"EXPLAINER_ALREADY"));markQueued();}catch(err){console.error("EngramQuest: explainer queue failed",err);}});
        readQueue(this.app.vault.adapter).then(_q=>{if(isQueued(_q,e.notePath,e.front))markQueued();}).catch(()=>{});
      }
      answerEl=p.createEl("div",{attr:{class:"lh-answer-text"+(String(e.back||"").length<=90?" is-short":"")}});
      renderMd(answerEl,e.back);
      answerEl.addEventListener("mouseup",captureAnswerSelection);
      answerEl.addEventListener("keyup",captureAnswerSelection);
      if(phone&&notePaths.length>0){
        i.createEl("button",{cls:"lh-link lh-open-note",text:c(t,"OPEN_IN_NOTE")}).addEventListener("click",()=>openNote(notePaths[0]));
      }
      this.browseOnly&&i.createEl("div",{text:c(t,"BROWSE_NOTE"),attr:{class:"lh-browse-note"}});
      // Once the answer shows, the relation map sits below it: the answer stays the first thing in view.
      i.appendChild(synapseContainer);
    }

    // Footer buttons
    if(this.answerShown){
      if(!phone) addRewatchButton(this.contentEl,this.app,t,e);
      if(this.browseOnly){
        let p=(phone?this.contentEl.createEl("div",{cls:"lh-sbar lh-glass"}):this.contentEl).createEl("div",{attr:{class:"lh-browse-row"}});
        p.createEl("button",{text:c(t,"BACK_TO_QUESTION"),attr:{class:"lh-browse-btn"}}).addEventListener("click",()=>{this.answerShown=false;this._renderCardContent(e);});
        let E=p.createEl("button",{text:c(t,"PREVIOUS"),attr:{class:"lh-browse-btn"}});
        this.idx===0&&(E.disabled=true);
        E.addEventListener("click",()=>{this.idx!==0&&(this.idx--,this.renderCard());});
        p.createEl("button",{text:this.idx>=this.cards.length-1?c(t,"BACK"):c(t,"NEXT"),attr:{class:"lh-browse-btn lh-browse-next"}}).addEventListener("click",()=>{
          if(this.idx>=this.cards.length-1){this.close();this.onBack&&this.onBack();return;}
          this.idx++;this.renderCard();
        });
      } else {
        // Task 4: rating buttons with lock
        let p=e.srMeta||null;
        let _gradeBar=phone?this.contentEl.createEl("div",{cls:"lh-sbar lh-glass"}):null;
        if(_gradeBar) _gradeBar.createEl("div",{cls:"lh-sbar-title",text:c(t,"RATE_PROMPT")});
        let g=(_gradeBar||this.contentEl).createEl("div",{attr:{class:"lh-rating-row"}});
        [{q:1,label:C("AGAIN",t),icon:"reset",cls:"lh-rb-again"},{q:2,label:C("HARD",t),icon:"pulse",cls:"lh-rb-hard"},{q:3,label:C("GOOD",t),icon:"check",cls:"lh-rb-good"},{q:4,label:C("EASY",t),icon:"sparkle",cls:"lh-rb-easy"}].forEach(E=>{
          let m=P(E.q,p,t);
          let x=g.createEl("button",{attr:{class:`lh-rating-btn ${E.cls}`}});
          let S=x.createEl("div",{attr:{class:"lh-rb-top"}});
          _uiIcon(S.createEl("span",{attr:{class:"lh-rb-icon"}}),E.icon);
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
              srData[e.front]=buildSrRecord(srData[e.front],w,E.q);
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
            if(this.idx>=this.cards.length||this._timeboxExpired){ this._renderComplete(); return; }
            this.renderCard();
          });
        });
      }
    } else {
      const hasHints=e.hint_l1||e.hint_l2||e.hint_l3;
      const nextHint=()=>{
        // Hints render top-down so a full re-render (scroll-to-top) is acceptable here;
        // the flash bug only mattered for Synapse, where the panel sits mid-card.
        // synapseOpen=false enforces the mutex (opening a hint closes Synapse).
        this.hintLevel++; this.synapseOpen=false;
        this._renderCardContent(e);
      };
      const showAnswer=()=>{this.answerShown=true;this._renderCardContent(e);};
      if(phone){
        const bar=this.contentEl.createEl("div",{cls:"lh-sbar lh-sbar-row lh-glass"});
        const hintBtn=bar.createEl("button",{cls:"lh-pbtn alt",text:C("HINT_NEXT",t)});
        if(!hasHints||this.hintLevel>=3) this._disablePillBtn(hintBtn);
        else hintBtn.addEventListener("click",nextHint);
        bar.createEl("button",{cls:"lh-pbtn",text:C("SHOW_ANSWER",t)}).addEventListener("click",showAnswer);
        return;
      }
      // Pill buttons (before answer)
      let p=this.contentEl.createEl("div",{attr:{class:"lh-review-footer"}});
      let g=p.createEl("div",{attr:{class:"lh-pill-row"}});
      let E=g.createEl("button",{attr:{class:"lh-pill-btn lh-pill-show"}});
      _uiIcon(E,"eye");
      E.createEl("span",{text:C("SHOW_ANSWER",t)});
      E.addEventListener("click",showAnswer);

      let x=g.createEl("button",{attr:{class:"lh-pill-btn lh-pill-recall"}});
      _featureIcon(x,this.plugin,"hint",{size:22,fallback:"info"});
      x.createEl("span",{text:`L${Math.min(this.hintLevel+1,3)} `+(this.hintLevel===0?C("RECALL",t):C("HINT_NEXT",t))});
      if(!hasHints) this._disablePillBtn(x,c(t,"NO_HINT"));
      else if(this.hintLevel>=3) this._disablePillBtn(x,c(t,"HINTS_USED_UP"));
      else x.addEventListener("click",nextHint);

      let k=g.createEl("button",{attr:{class:"lh-pill-btn lh-pill-memory"}});
      _featureIcon(k,this.plugin,"memory",{size:22,fallback:"map"});
      k.createEl("span",{text:c(t,"MEMORY_MAP")});
      bindMemoryMap(k);

      // Three states: hidden (feature off / not Pro), dim (nothing links to this card), active.
      if(synapseEnabled){
        g.classList.add("lh-pill-row-4");
        let syBtn=g.createEl("button",{attr:{class:"lh-pill-btn lh-pill-synapse"}});
        _featureIcon(syBtn,this.plugin,"synapse",{size:22,fallback:"bolt"});
        const syLabel=syBtn.createEl("span",{text:c(t,"SYNAPSE")});
        if(!synapseHasLinks){
          syLabel.textContent=c(t,"SYNAPSE_NONE");
          this._disablePillBtn(syBtn,c(t,"SYNAPSE_EMPTY"));
        }else{
          syBtn.title=c(t,"SYNAPSE_HINT");
          syBtn.addEventListener("click",toggleSynapse);
        }
      }

      let y=p.createEl("div",{attr:{class:"lh-footer-meta"}});
      let b=y.createEl("button",{attr:{class:"lh-pill-reset"}});
      _uiIcon(b,"reset");
      b.createEl("span",{text:c(t,"RESET_HINTS")});
      b.addEventListener("click",resetHints);
      let T=y.createEl("div",{attr:{class:"lh-dots"}});
      for(let _=0;_<3;_++) T.createEl("div",{attr:{class:"lh-dot"+(_<this.hintLevel?" lit":"")}});
    }

    if(phone) return;
    // Progress bar
    let h=this.contentEl.createEl("div",{attr:{class:"lh-review-progress"}});
    let u=h.createEl("div",{attr:{class:"lh-review-prog-wrap"}});
    let v=Math.round(this.idx/this.cards.length*100);
    u.createEl("div",{attr:{class:"lh-review-prog-bar",style:`width:${v}%`}});
    h.createEl("span",{text:`${this.idx+1} / ${this.cards.length}`,attr:{class:"lh-review-badge"}});
  }

  _disablePillBtn(btn,title){
    btn.disabled=true;
    btn.classList.add("is-off");
    if(title) btn.title=title;
  }

  _enablePillBtn(btn){
    btn.disabled=false;
    btn.classList.remove("is-off");
  }

  // The relation map around this card. Before the answer it holds only what the user has already
  // learned; the graph builder leaves the rest, and any text spelling out the answer, for after.
  // A failure in here leaves the panel empty and the rest of the card as it was.
  _renderSynapsePanel(parent,card,t,renderMd,refresh){
    try{
      if(!this._synapse.ready){
        renderSynapseMap(parent,{t,card,loading:true,revealed:this.answerShown});
        this._synapse.load().then(drawable=>{ if(drawable&&parent.isConnected) refresh(); });
        return;
      }
      renderSynapseMap(parent,{
        t, card, plugin:this.plugin, revealed:this.answerShown,
        graph:this._synapse.graph(card,this.answerShown),
        expandedId:this._synapseExpandedId,
        renderBack:(el,node)=>{
          if(node.back) renderMd(el,node.back);
          else el.textContent=c(t,"SYNAPSE_NO_BACK");
        },
        onSelect:(node)=>{
          if(node.type!=="card"){ this._synapse.open(node,()=>{ if(parent.isConnected) refresh(); }); return; }
          if(!node.expandable) return;
          this._synapseExpandedId=this._synapseExpandedId===node.id?null:node.id;
          refresh();
        },
      });
    }catch(err){
      console.warn("synapse: could not draw the map",err);
      parent.empty();
    }
  }

  // Fallback to session-card lookup for anchors pre-dating stored `back` (backward compat).
  _lookupAnchorBack(anchor){
    if(!anchor||!anchor.front) return "";
    if(anchor.back) return anchor.back;
    const np=anchor.notePath||"";
    const hit=this.cards.find(c=>c && c.front===anchor.front && (np?c.notePath===np:true));
    return (hit&&hit.back)||"";
  }

  _openMemoryMapChooser(candidates){
    const modal=themedModal(new I.Modal(this.app));
    const isZh=L(this.plugin.settings)==="zh-tw";
    const reasonLabelMap={
      "same-folder": isZh?"同資料夾":"Same folder",
      "configured-folder": isZh?"設定資料夾":"Configured folder",
      "topic-folder": isZh?"同主題":"Same topic",
      "deck-token": isZh?"同 deck":"Deck match",
      "file-node": isZh?"關聯節點":"Linked node"
    };
    modal.modalEl.style.cssText="width:min(92vw,620px);padding:0;border-radius:18px;overflow:hidden;background:var(--base);box-shadow:var(--float);";
    const wrap=modal.contentEl;
    wrap.style.cssText="padding:24px;display:flex;flex-direction:column;gap:14px;";
    wrap.createEl("div",{text:isZh?"選擇 Memory Map":"Select Memory Map",attr:{style:"font-size:18px;font-weight:700;color:var(--text);"}});
    wrap.createEl("div",{text:isZh?"選擇要開啟的地圖":"Choose the map to open",attr:{style:"font-size:12px;color:var(--text3);margin-top:-6px;"}});
    candidates.forEach(candidate=>{
      const card=wrap.createEl("div",{cls:"lh-choice"});
      card.setAttr("role","button");
      card.tabIndex=0;
      const topRow=card.createEl("div",{attr:{style:"width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;"}});
      topRow.createEl("div",{text:getBaseName(candidate.path),attr:{style:"flex:1 1 auto;min-width:0;font-size:15px;font-weight:600;color:var(--text);line-height:20px;word-break:break-word;overflow-wrap:anywhere;"}});
      topRow.createEl("div",{text:reasonLabelMap[candidate.reason]||candidate.reason,attr:{style:"flex:0 0 auto;align-self:flex-start;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap;background:var(--fill);color:var(--text2);"}});
      const metaRow=card.createEl("div",{attr:{style:"display:flex;flex-wrap:wrap;gap:8px;width:100%;"}});
      metaRow.createEl("div",{text:candidate.file.parent?.path||candidate.path,attr:{style:"max-width:100%;font-size:12px;line-height:16px;color:var(--text3);word-break:break-word;overflow-wrap:anywhere;"}});
      if(candidate.relatedPath) metaRow.createEl("div",{text:isZh?`關聯：${getBaseName(candidate.relatedPath)}`:`Related: ${getBaseName(candidate.relatedPath)}`,attr:{style:"max-width:100%;font-size:12px;line-height:16px;color:var(--text3);word-break:break-word;overflow-wrap:anywhere;"}});
      const openCandidate=()=>{modal.close();this.app.workspace.openLinkText(candidate.path,"",false);};
      card.addEventListener("click",openCandidate);
      card.addEventListener("keydown",(ev)=>{ if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); openCandidate(); } });
    });
    const closeBtn=wrap.createEl("button",{text:isZh?"取消":"Cancel",cls:"lh-btn alt"}); 
    closeBtn.addEventListener("click",()=>modal.close());
    modal.open();
  }

  // Leave the session for another Hub tab, keeping the resume point so the review can continue.
  _openHubTab(tab){
    this._saveResumePoint();
    this.close();
    const { HubModal } = require("../hub/modal");
    const hub=new HubModal(this.app,this.plugin);
    hub.activeTab=tab;
    hub.open();
  }

  _minimize(){
    if(this._minimized) return;
    this._minimized=true;
    this.containerEl.style.display="none";
    // Release modal keymap scope so global hotkeys (Ctrl+P / Ctrl+O) work while minimized
    try{this.app.keymap.popScope(this.scope);}catch(e){}
    if(this._fab) return; // already exists
    this._fab=_restoreButton(this.plugin,c(this.plugin.settings,"RESUME_REVIEW"),()=>this._restore());
  }
  _restore(){
    if(!this._minimized) return;
    this._minimized=false;
    this.containerEl.style.display="";
    try{this.app.keymap.pushScope(this.scope);}catch(e){}
    if(this._fab){this._fab.remove();this._fab=null;}
  }
  onClose(){
    if(this._timerIntervalId){window.clearInterval(this._timerIntervalId);this._timerIntervalId=null;}
    this._timerEl=null;
    if(this._fab){this._fab.remove();this._fab=null;}
    this._minimized=false;
    this._preSessionEvalCtx=null;
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
      const modal=themedModal(new I.Modal(this.app));
      modal.modalEl.style.cssText="width:min(92vw,400px);padding:0;border-radius:16px;overflow:hidden;";
      const wrap=modal.contentEl;
      wrap.style.cssText="padding:24px;display:flex;flex-direction:column;gap:14px;";
      wrap.createEl("div",{text:"✏️ "+c(t,"EDIT_CARD"),attr:{style:"font-size:16px;font-weight:700;color:var(--text);"}});
      wrap.createEl("div",{text:`這是「${sourceNote}」的手寫筆記卡片，請直接在筆記中刪除對應的 question :: answer 行。`,attr:{style:"font-size:13px;color:var(--text2);line-height:1.6;"}});
      const btnRow=wrap.createEl("div",{attr:{style:"display:flex;gap:8px;justify-content:flex-end;"}});
      btnRow.createEl("button",{text:c(t,"DELETE_CANCEL_BTN"),cls:"lh-btn alt"}).addEventListener("click",()=>modal.close());
      const openBtn=btnRow.createEl("button",{cls:"lh-btn",text:"開啟筆記"});
      openBtn.addEventListener("click",()=>{ modal.close(); this.app.workspace.openLinkText(sourceNote,"",false); });
      modal.open();
      return;
    }

    // AI card: confirm then delete
    const modal=themedModal(new I.Modal(this.app));
    modal.modalEl.style.cssText="width:min(92vw,400px);padding:0;border-radius:16px;overflow:hidden;";
    const wrap=modal.contentEl;
    wrap.style.cssText="padding:24px;display:flex;flex-direction:column;gap:14px;";
    wrap.createEl("div",{text:c(t,"DELETE_CONFIRM_TITLE").replace("{name}",e.front),attr:{style:"font-size:16px;font-weight:700;color:var(--text);"}});
    wrap.createEl("div",{text:c(t,"DELETE_CONFIRM_FILE"),attr:{style:"font-size:13px;color:var(--text2);line-height:1.6;"}});
    const btnRow=wrap.createEl("div",{attr:{style:"display:flex;gap:8px;justify-content:flex-end;"}});
    btnRow.createEl("button",{text:c(t,"DELETE_CANCEL_BTN"),cls:"lh-btn alt"}).addEventListener("click",()=>modal.close());
    const delBtn=btnRow.createEl("button",{cls:"lh-btn danger",text:c(t,"DELETE_CONFIRM_BTN")});
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
