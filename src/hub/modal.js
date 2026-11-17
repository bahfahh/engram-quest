"use strict";
const I = require("obsidian");
const { t: c } = require("../i18n");
const { ReviewSessionModal: Q } = require("../review/session");
const { maybeShowIntro: _maybeShowIntro, maybeShowTabGuide: _maybeShowTabGuide } = require("./intro");
const { scanReviewDecks } = require("../review/decks");
const { getReviewStatus: $ } = require("../review/helpers");
const reviewHelpers = require("../review/helpers");
const backNav = require("../ui/back-nav");
const scanCache = require("../review/scan-cache");
const { registerSelectionCopy } = require("../ui/selection-copy");
const { deleteDeckCards } = require("../review/edit");
const { readLegacyQuest: _readLegacyQuest } = require("../quest/helpers");
const { listQuestPackages, questPackageToHubItem } = require("../quest/data");
const questState = require("../quest/state");
const { deleteQuestPackage, trashQuestProgress } = require("../quest/delete");
function lt(n, e) { return scanReviewDecks(n, e, reviewHelpers); }
const { renderAchievementTab: _renderAchTabFn } = require("./achievement");
const { renderExplainerTab: _renderExplainerTabFn } = require("../explainer/render");
const { renderLessonTab: _renderLessonTabFn } = require("../lessons/render");
const { listCourses: _listLessonCourses } = require("../lessons/data");
const { renderVideoTab: _renderVideoTabFn } = require("../videos/render");
const { renderEpisodicTab: _renderEpisodicTabFn } = require("../videos/episodic");
const { renderShell } = require("./shell");
const { renderReviewTab } = require("./review-tab");
const { renderMemoryTab } = require("./memory-tab");
const { renderQuestTab } = require("./quest-tab");
const ui = require("./ui");
const { icon: _uiIcon } = ui;

var ne=class n extends I.Modal{constructor(e,t){super(e),this.plugin=t,this.decks=[],this.quests=[],this.memories=[],this.courses=[],this.activeTab="review",this.viewModes=t.settings._viewModes||{review:"list",memory:"list",quest:"list"},this.viewMode=this.viewModes.review,this.treeExpanded=t.settings._treeExpanded||{},this.filterStatus="all",this.searchQuery="",this.sortQuest="newest",this.sortMemory="newest",this.filterQuestStatus="all"}loadDecks(){return this._decksReady=(async()=>{const _t0=Date.now();this.decks=await lt(this.app,this.plugin.settings);this._timing("decks",_t0);})();}
loadLessons(){return this._lessonsReady=(async()=>{this.courses=await _listLessonCourses(this.app.vault.adapter);})();}
loadLibrary(){this._libraryLoaded=false;const _t0=Date.now();return this._libraryReady=this._loadLibrary().then(()=>{this._libraryLoaded=true;this._timing("library",_t0);});}
// Each scan starts the first time something needs it, and is shared after that.
_ensureDecks(){return this._decksReady||this.loadDecks();}
_ensureLibrary(){return this._libraryReady||this.loadLibrary();}
// How long each part of opening took, in the developer console (Obsidian: Settings → About → or
// Ctrl/Cmd+Shift+I; on a phone, through remote debugging). Read when checking open speed on a device.
_timing(part,t0){const ms=Date.now()-t0;(this._timings||(this._timings={}))[part]=ms;console.debug(`EngramQuest: hub ${part} ${ms}ms`,this._openedAt?`(${Date.now()-this._openedAt}ms since open)`:"");}
async loadData(){await Promise.all([this.loadDecks(),this.loadLibrary()]);}
// Which load promises a tab needs before it can render. Explainer/lesson tabs do their own
// scoped loads; achievement (and anything unknown) needs everything.
_needsFor(h){return h==="review"?[this._ensureDecks()]:h==="memory"||h==="quest"?[this._ensureLibrary()]:h==="explainer"||h==="lesson"||h==="video"||h==="episodic"?[]:h==="achievement"?[this._ensureDecks(),this._ensureLibrary(),this.loadLessons()]:[this._ensureDecks(),this._ensureLibrary()]}
async _loadLibrary(){await scanCache.whenRestored();this.quests=[];
// Quest scan: filter candidates via metadataCache (sync), then read them with bounded
// parallelism. cachedRead serves from Obsidian's in-memory cache when available.
const _readNote=e=>this.app.vault.cachedRead?this.app.vault.cachedRead(e):this.app.vault.read(e);
const _candidates=this.app.vault.getMarkdownFiles().filter(e=>{let _qc=this.app.metadataCache.getFileCache(e);let _cacheUnindexed=!_qc||(!_qc.frontmatter&&(!_qc.sections||_qc.sections.length===0)&&(!_qc.headings||_qc.headings.length===0)&&(!_qc.tags||_qc.tags.length===0));return e.name.endsWith("-quest.md")||_cacheUnindexed||(_qc&&_qc.sections&&_qc.sections.some(sec=>sec.type==="code"))});
const _firstText=(nodes,keys)=>{for(const node of nodes||[])for(const key of keys){let value=node&&node[key];if(value&&String(value).trim())return String(value).trim();}return "";};
const _visited=new Set();
const _scanned=await reviewHelpers.mapLimit(_candidates,8,async e=>{try{_visited.add(e.path);
// Whether the note is a quest map, and its parse, come from its text: reused while the note is
// unchanged, so the notes with code blocks that are not quests are read once, not on every open.
const _stamp=scanCache.fileStamp(e);let _pc=scanCache.get("quests",e.path,_stamp);if(_pc===undefined){let text=await _readNote(e);let _p=_readLegacyQuest(e.name,text);let _sm=_p?text.match(/style:\s*([a-zA-Z0-9_-]+)/):null;_pc=_p?{parsed:_p,style:_sm?_sm[1]:"sky-island"}:null;scanCache.put("quests",e.path,_stamp,_pc);}
if(!_pc)return null;let parsed=_pc.parsed;let difficulty=parsed.difficulty,style=_pc.style,tags=[],cache=this.app.metadataCache.getFileCache(e);if(cache&&cache.tags)cache.tags.forEach(tag=>tags.push(tag.tag.replace(/^#/,"").toLowerCase()));if(cache&&cache.frontmatter&&cache.frontmatter.tags){let rawTags=cache.frontmatter.tags;typeof rawTags==="string"?rawTags.split(",").forEach(tag=>tags.push(tag.trim().replace(/^#/,"").toLowerCase())):Array.isArray(rawTags)&&rawTags.forEach(tag=>tags.push(String(tag).replace(/^#/,"").toLowerCase()))}let normalizedTags=[...new Set(tags.filter(Boolean))].map(tag=>"#"+tag);let nodes=parsed.nodes,state=null,renderState=null;if(nodes.length){state=await questState.loadQuestState(this.app.vault.adapter,e.path);state=questState.migrateQuestCompletion(state,nodes);renderState=questState.buildQuestRenderState(nodes,state);}let completed=!!(renderState&&nodes.length&&renderState.completedCount>=nodes.length);let bossIndex=nodes.findIndex(node=>node&&node.boss),bossNode=bossIndex>=0?nodes[bossIndex]:nodes[nodes.length-1]||null,nextNode=renderState&&nodes.length?nodes[renderState.activeIndex]||null:null;let missionNodes=nodes.filter(node=>node&&node.challenge),missionTypes=[...new Set(missionNodes.map(node=>node.challenge&&node.challenge.type).filter(Boolean))];let progressPct=renderState?renderState.progressPct:0;let completedCount=renderState?renderState.completedCount:(nodes.filter(node=>node.completed).length||0);let bossReady=!!(renderState&&bossIndex>=0&&renderState.activeIndex>=bossIndex&&!completed);return{sourceType:"markdown",file:e,stateKey:e.path,sourcePath:e.path,title:(parsed&&parsed.title)||e.basename.replace(/-quest$/i,""),description:(parsed&&parsed.description)||"",nodes,difficulty,tags:normalizedTags,style,ctime:e.stat.ctime,completed,nodeCount:nodes.length,missionCount:missionNodes.length,completedCount,progressPct,bestScorePct:renderState?renderState.bestScorePct:null,bossReady,bossTitle:bossNode&&bossNode.title?bossNode.title:"Boss Battle",activeTitle:nextNode&&nextNode.title?nextNode.title:"",scenario:_firstText(nodes,["scenario","mission_goal","stakes"]),missionGoal:_firstText(nodes,["mission_goal","scenario","summary"]),stakes:_firstText(nodes,["stakes"]),missionTypes}}catch(err){console.warn("EngramQuest: failed to scan quest",e&&e.path,err);return null}});
scanCache.prune("quests",_visited);
{let _packages=await listQuestPackages(this.app.vault.adapter),_packageItems=await reviewHelpers.mapLimit(_packages,8,async pkg=>{try{let state=await questState.loadQuestState(this.app.vault.adapter,pkg.stateKey);return questPackageToHubItem(pkg,state)}catch(err){console.warn("EngramQuest: failed to scan quest package",pkg&&pkg.slug,err);return null}});this.quests=[..._packageItems.filter(Boolean),..._scanned.filter(Boolean)];}this.memories=[];let _mdByBase=new Map();for(let _f of this.app.vault.getMarkdownFiles())if(!_mdByBase.has(_f.basename))_mdByBase.set(_f.basename,_f);for(let e of this.app.vault.getFiles())if(e.name.endsWith("-memory.canvas")){let t=e.name.replace("-memory.canvas",""),r=[],s=_mdByBase.get(t);if(s){let l=[],a=this.app.metadataCache.getFileCache(s);if(a&&a.tags&&a.tags.forEach(o=>l.push(o.tag.replace(/^#/,"").toLowerCase())),a&&a.frontmatter&&a.frontmatter.tags){let o=a.frontmatter.tags;typeof o==="string"?o.split(",").forEach(i=>l.push(i.trim().replace(/^#/,"").toLowerCase())):Array.isArray(o)&&o.forEach(i=>l.push(String(i).replace(/^#/,"").toLowerCase()))}r=[...new Set(l.filter(o=>o))].map(o=>"#"+o)}this.memories.push({file:e,baseName:t,tags:r,ctime:e.stat.ctime})}}
onOpen(){this._closed=false;this.modalEl.addClass("lh-hub");registerSelectionCopy(this);
// Android back, history.back and the iPhone edge swipe take the back button's step: back one phone
// page, then close (src/ui/back-nav.js). A minimized Hub just closes, as before.
backNav.useBack(this,()=>{if(this._minimized||!(this._phoneBack&&this._phoneBack()))this.close();});
// Until the introduction has been shown or skipped, the tabs' own guides wait (src/hub/intro.js).
this._introPending=!this.plugin.settings._introSeen;
ui.watchTheme(this,{vars:true});
this.contentEl.createEl("div",{cls:"lh-loading"}).createEl("div",{cls:"lh-spinner"});
// Opened at once, before any scan (every opener calls open() without waiting for data): the
// spinner shows while the page in view loads only what it needs. The deck scan always starts
// (the home page shows its counts); the quest/memory library scan, the slow one on a phone,
// starts only after the decks are in, so the two do not share the file bridge, unless the page
// in view needs it. A tab that needs it later awaits the same promise.
this._openedAt=Date.now();
this._ensureDecks();
Promise.all(this._needsFor(this.activeTab)).then(()=>{if(this._closed)return;this.render();this._timing("first paint",this._openedAt);this._maybeShowIntro();}).catch(err=>console.error("EngramQuest: hub load failed",err));
this._decksReady.then(()=>{if(this._closed||this._libraryReady)return;window.setTimeout(()=>{if(!this._closed&&!this._libraryReady)this._ensureLibrary().catch(err=>console.warn("EngramQuest: library scan failed",err));},250);}).catch(()=>{});const lic=this.plugin.license;let wasPro=this.plugin.settings.licenseValid;if(lic)this._stopLicenseWatch=lic.subscribe(()=>{const now=this.plugin.settings.licenseValid;if(now===wasPro)return;wasPro=now;if(!this._hubOpen)return;this.plugin._skillsUpdateStatus=null;try{this.render();}catch(err){console.error("EngramQuest: hub refresh after license change failed",err);}});}render(){this._hubOpen=true;renderShell(this);}
_renderTab(a,h){h==="review"?renderReviewTab(a,this):h==="memory"?renderMemoryTab(a,this):h==="quest"?renderQuestTab(a,this):h==="explainer"?this._renderExplainerTab(a):h==="lesson"?this._renderLessonTab(a):h==="video"?_renderVideoTabFn(a,this).catch(err=>console.error("EngramQuest: video tab render failed",err)):h==="episodic"?_renderEpisodicTabFn(a,this).catch(err=>console.error("EngramQuest: recall tab render failed",err)):h==="achievement"&&this._renderAchievementTab(a);}
get _backToHub(){return async()=>{new n(this.app,this.plugin).open();};}
get _openTimebox(){return (cards,name,backFn,minutes)=>{this.close();new Q(this.app,cards,name,this.plugin,backFn,{timeboxMinutes:minutes}).open();};}
_studyAll(){let t=this.plugin.settings,p=this.decks.flatMap(g=>g.cards).filter(g=>{let E=$(g.srMeta);return E==="due"||E==="unseen"});if(p.length===0){new I.Notice(c(t,"NO_CARDS_TO_REVIEW"));return}p.sort((g,E)=>($(g.srMeta)==="due"?0:1)-($(E.srMeta)==="due"?0:1)),this.close(),new Q(this.app,p,c(t,"FILTER_ALL"),this.plugin,this._backToHub).open()}
_resumeLink(parent){let t=this.plugin.settings,_rp=t._reviewProgress;if(!_rp||!_rp.deck)return null;let _left=((this.decks.find(dk=>dk.name===_rp.deck)||{}).cards||[]).filter(g=>{let E=$(g.srMeta);return E==="due"||E==="unseen"}).length;if(!_left)return null;let b=parent.createEl("button",{cls:"lh-link"});b.createEl("span",{text:`${c(t,"RESUME")} ${_rp.deck.split("/").pop()} · ${c(t,"RESUME_LEFT").replace("{count}",String(_left))}`});_uiIcon(b,"chevron");b.addEventListener("click",()=>{let _deck=this.decks.find(dk=>dk.name===_rp.deck);if(_deck)this._startDeckReview(_deck);});return b;}
_maybeShowIntro(){return _maybeShowIntro(this);}
_maybeShowGuide(tab){_maybeShowTabGuide(this,tab);}
_minimize(){if(this._minimized)return;this._minimized=true;this.containerEl.classList.add("lh-minimized");try{this.app.keymap.popScope(this.scope);}catch(e){}if(this._fab)return;this._fab=ui.restoreButton(this.plugin,c(this.plugin.settings,"HUB_RESTORE"),()=>this._restore());}_restore(){if(!this._minimized)return;this._minimized=false;this.containerEl.classList.remove("lh-minimized");try{this.app.keymap.pushScope(this.scope);}catch(e){}if(this._fab){this._fab.remove();this._fab=null;}if(["quest","memory"].includes(this.activeTab)){this._libraryReady=null;this.loadLibrary().then(()=>{if(this._hubOpen)this.render();}).catch(err=>console.warn("EngramQuest: restore reload failed",err));}}onClose(){this._closed=true;this._hubOpen=false;if(this._stopLicenseWatch){this._stopLicenseWatch();this._stopLicenseWatch=null;}if(this._stopRailWatch){this._stopRailWatch();this._stopRailWatch=null;}if(this._guideTimer){window.clearTimeout(this._guideTimer);this._guideTimer=null;}if(this._fab){this._fab.remove();this._fab=null;}this._minimized=false;if(this._tagFilterCleanups){this._tagFilterCleanups.forEach(fn=>fn());this._tagFilterCleanups=[];}}_confirmDelete(item,type){const t=this.plugin.settings;let displayName,filesToTrash;if(type==='quest'){displayName=item.file.basename.replace(/-quest$/,'');filesToTrash=[item.file];}else if(type==='quest-package'){displayName=item.title||item.slug;filesToTrash=[];}else if(type==='memory'){displayName=item.baseName;filesToTrash=[item.file];}else if(type==='deck'){displayName=item.name;filesToTrash=[...new Set(item.cards.map(card=>card.notePath).filter(Boolean))];}let bodyText;if(type==='deck'){bodyText=c(t,'DELETE_CONFIRM_DECK').replace('{count}',String(filesToTrash.length)).replace('{cards}',String(item.cards.length));}else{bodyText=c(t,'DELETE_CONFIRM_FILE');}ui.confirmDialog(this.app,t,{title:c(t,'DELETE_CONFIRM_TITLE').replace('{name}',displayName),body:bodyText,onConfirm:async()=>{try{if(type==='deck'){await deleteDeckCards(this.app,item);}else if(type==='quest-package'){await deleteQuestPackage(this.app,item);}else{for(const f of filesToTrash){if(f)await this.app.fileManager.trashFile(f);}}if(type==='quest'){await trashQuestProgress(this.app,item.stateKey||(item.file&&item.file.path));}await (type==='deck'?this.loadDecks():this.loadLibrary());this.render();}catch(err){console.error("EngramQuest: delete failed",err);new I.Notice(c(t,"DELETE_FAILED"));try{await this.loadData();this.render();}catch(e){console.warn("EngramQuest: reload after a failed delete failed",e);}}}});}_startDeckReview(e){let t=this.plugin.settings,r=e.cards.filter(s=>{let l=$(s.srMeta);return l==="due"||l==="unseen"});const backToHub=async()=>{new n(this.app,this.plugin).open()};if(r.length===0){this.close(),new Q(this.app,e.cards,e.name,this.plugin,backToHub,{browseOnly:!0,noResume:!!e.noResume}).open();return}r.sort((s,l)=>($(s.srMeta)==="due"?0:1)-($(l.srMeta)==="due"?0:1));this.close();new Q(this.app,r,e.name,this.plugin,backToHub,{noResume:!!e.noResume}).open()}_sortItems(arr,key,completedLast){let cmp=key==="newest"?(a,b)=>b.ctime-a.ctime:key==="oldest"?(a,b)=>a.ctime-b.ctime:(a,b)=>a.file.basename.localeCompare(b.file.basename);if(completedLast)return arr.sort((a,b)=>(a.completed?1:0)-(b.completed?1:0)||cmp(a,b));return arr.sort(cmp)}_renderExplainerTab(e){_renderExplainerTabFn(e,this);}_renderLessonTab(e){_renderLessonTabFn(e,this);}_renderAchievementTab(e){_renderAchTabFn(e,this.plugin,this.decks,this.quests,this.memories,this.courses).catch(err=>console.error("EngramQuest: achievement tab render failed",err))}
_buildTree(items, getPathFn) {
    let root = { name: "Root", children: {}, items: [] };
    items.forEach(item => {
        let pathStr = getPathFn(item) || "";
        let parts = pathStr.split("/").filter(p => p.trim());
        let current = root;
        parts.forEach(part => {
            if (!current.children[part]) {
                current.children[part] = { name: part, children: {}, items: [] };
            }
            current = current.children[part];
        });
        current.items.push(item);
    });
    return root;
}
_renderTreeRecursive(container, node, renderItemFn, path = "", level = 0) {
    let keys = Object.keys(node.children).sort((a,b)=>a.localeCompare(b));
    keys.forEach(key => {
        let childNode = node.children[key];
        let nodePath = path ? path + "/" + key : key;
        let isOpen = this.treeExpanded[nodePath] !== undefined ? this.treeExpanded[nodePath] : (level === 0);
        let details = container.createEl("details", { attr: { class: "lh-tree-details" } });
        if (isOpen) details.setAttribute("open", "");
        
        details.addEventListener("toggle", async (ev) => {
            if (ev.target === details) {
                this.treeExpanded[nodePath] = details.open;
                this.plugin.settings._treeExpanded = this.treeExpanded;
                await this.plugin.saveData(this.plugin.settings);
            }
        });

        let summary = details.createEl("summary", { attr: { class: "lh-tree-summary" } });
        let wrapper = summary.createEl("div", { attr: { class: "lh-tree-summary-inner" } });
        _uiIcon(wrapper, "folder");
        wrapper.createEl("span", { text: childNode.name, attr: { class: "lh-tree-folder-name" } });
        
        let content = details.createEl("div", { attr: { class: "lh-tree-content" } });
        this._renderTreeRecursive(content, childNode, renderItemFn, nodePath, level + 1);
    });
    
    if (node.items.length > 0) {
        let itemsContainer = container.createEl("div", { attr: { class: "lh-tree-items-container" } });
        node.items.forEach(item => {
            renderItemFn(itemsContainer, item);
        });
    }
}
}

module.exports = { HubModal: ne };
