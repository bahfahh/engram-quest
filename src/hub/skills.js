"use strict";
const I = require("obsidian");
const { t: c } = require("../i18n");
const G = require("../skills/installer")();
const { registerSelectionCopy } = require("../ui/selection-copy");

function oe(n,e){return c(n,{claude:"SKILLS_TOOL_CLAUDE",codex:"SKILLS_TOOL_CODEX",gemini:"SKILLS_TOOL_GEMINI",cursor:"SKILLS_TOOL_CURSOR"}[e]||"")||e}function K(n,e){return String(n||"").replace(/\{(\w+)\}/g,(t,r)=>{var s;return(s=e[r])!=null?s:""})}async function Ne(n,e){return await n.exists(e)?n.read(e):null}async function ct(n,e){let t=I.normalizePath(e||"");if(!t)return;let r=t.split("/").filter(Boolean),s="";for(let l of r)if(s=s?`${s}/${l}`:l,!n.vault.getAbstractFileByPath(s))try{await n.vault.createFolder(s)}catch(a){if(!String(a&&a.message||a).includes("Folder already exists"))throw a}}async function le(n,e){const isPro=!!(n.settings&&n.settings.licenseValid);let t=n.app.vault.adapter,r=await G.getInstallEntries(e,t,n.app.vault.configDir,{isPro}),s=[];for(let i of r){let d=await Ne(t,i.path),f="create";d!==null&&(f=d===i.content?"unchanged":"replace"),s.push({path:i.path,content:i.content,action:f})}let l=s.some(i=>i.action==="create"),a=s.some(i=>i.action==="replace"),o="not_installed";return!l&&!a?o="installed":s.some(i=>i.action!=="create")&&(o="update_available"),{toolId:e,tool:G.TOOL_TARGETS[e],items:s,status:o}}async function De(n,e){let t=n.app.vault.adapter;for(let r of e.items){let s=r.path.includes("/")?r.path.slice(0,r.path.lastIndexOf("/")):"";await ct(n.app,s),await t.write(r.path,r.content)}n._skillsUpdateStatus=null}
// Auto-update on plugin load. Ownership = files already exist at our engram-quest-*
// paths (status "update_available"). The previous guard required an
// "engram-quest-installer:" marker that only Cursor .mdc files ever contained,
// so Claude/Codex/Gemini installs were silently never auto-updated.
async function pt(n){for(let e of Object.values(G.TOOL_TARGETS)){let r=await le(n,e.id);r.status==="update_available"&&(await De(n,r),console.debug("EngramQuest: auto-updated installed skills for "+e.id))}}function me(){return!!G&&typeof G.getInstallEntries=="function"&&Object.keys(G.TOOL_TARGETS||{}).length>0}var ce=class extends I.Modal{constructor(e,t,r,s){super(e),this.plugin=t,this.preview=r,this.onDone=s}onOpen(){let e=this.plugin.settings,{contentEl:t}=this;t.empty(),registerSelectionCopy(this),this.modalEl.style.cssText="width:min(92vw,860px);max-width:none;",t.createEl("h2",{text:c(e,"SKILLS_PREVIEW_TITLE")}),t.createEl("p",{text:c(e,"SKILLS_PREVIEW_DESC")});let r=t.createEl("div",{attr:{style:"display:flex;flex-direction:column;gap:8px;max-height:52vh;overflow:auto;margin:16px 0;"}});this.preview.items.forEach(o=>{r.createEl("div",{attr:{style:"border:1px solid var(--background-modifier-border);border-radius:10px;padding:10px 12px;"}}).createEl("div",{text:`${c(e,o.action==="create"?"SKILLS_ACTION_CREATE":o.action==="replace"?"SKILLS_ACTION_REPLACE":"SKILLS_ACTION_UNCHANGED")}  ${o.path}`,attr:{style:"font-family:monospace;font-size:12px;word-break:break-all;"}})});let s=t.createEl("div",{attr:{style:"display:flex;justify-content:flex-end;gap:10px;margin-top:18px;"}}),l=s.createEl("button",{text:c(e,"HUB_CLOSE")}),a=s.createEl("button",{text:c(e,"SKILLS_CONFIRM_INSTALL"),cls:"mod-cta"});l.addEventListener("click",()=>this.close()),a.addEventListener("click",async()=>{a.disabled=!0;try{await De(this.plugin,this.preview);new I.Notice(K(c(e,"SKILLS_INSTALL_DONE"),{tool:oe(e,this.preview.toolId)}));new I.Notice(K(c(e,"SKILLS_NEXT_STEP"),{tool:oe(e,this.preview.toolId)}));this.onDone&&await this.onDone();this.close();}catch(err){console.error("EngramQuest: skill install failed",err);new I.Notice("Install failed: "+String(err));a.disabled=!1;}})}},de=class extends I.Modal{constructor(e,t){super(e),this.plugin=t}async onOpen(){registerSelectionCopy(this),this.modalEl.style.cssText="width:min(94vw,920px);max-width:none;",await this.render()}async render(){let e=this.plugin.settings,{contentEl:t}=this;if(t.empty(),t.createEl("h2",{text:c(e,"SKILLS_INSTALL_TITLE")}),t.createEl("p",{text:c(e,"SKILLS_INSTALL_DESC")}),t.createEl("p",{text:c(e,"SKILLS_INSTALL_PROJECT_LOCAL"),attr:{style:"color:var(--text-muted);margin-top:-4px;"}}),!me()){t.createEl("p",{text:"Installer assets are unavailable in this plugin build.",attr:{style:"color:var(--text-error);"}});return}let r=t.createEl("div",{attr:{style:"display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px;"}}),s=t.createEl("p",{text:c(e,"SKILLS_MODAL_LOADING"),attr:{style:"color:var(--text-muted);margin-top:14px;"}});try{for(let l of Object.values(G.TOOL_TARGETS)){let a=await le(this.plugin,l.id),o=r.createEl("div",{attr:{style:"border:1px solid var(--background-modifier-border);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;"}});o.createEl("div",{text:oe(e,l.id),attr:{style:"font-size:16px;font-weight:700;"}}),o.createEl("div",{text:l.summary,attr:{style:"color:var(--text-muted);font-size:13px;"}}),o.createEl("div",{text:`${c(e,"SKILLS_TARGET_PATH")}: ${l.baseDir}`,attr:{style:"font-family:monospace;font-size:12px;word-break:break-all;"}}),o.createEl("div",{text:`${c(e,"SKILLS_MODULES")}: ${(e.licenseValid?G.MODULES:G.MODULES.filter(d=>!d.pro)).map(d=>d.id).join(", ")}`,attr:{style:"font-size:12px;color:var(--text-muted);"}}),o.createEl("div",{text:a.status==="installed"?c(e,"SKILLS_STATUS_INSTALLED"):a.status==="update_available"?c(e,"SKILLS_STATUS_UPDATE"):c(e,"SKILLS_STATUS_NOT_INSTALLED"),attr:{style:`display:inline-flex;align-self:flex-start;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;${a.status==="installed"?"background:#dcfce7;color:#166534;":a.status==="update_available"?"background:#fef3c7;color:#92400e;":"background:#e5e7eb;color:#374151;"}`}}),o.createEl("button",{text:c(e,"SKILLS_PREVIEW_BUTTON"),cls:"mod-cta",attr:{style:"margin-top:auto;"}}).addEventListener("click",async()=>{try{let d=await le(this.plugin,l.id);new ce(this.app,this.plugin,d,async()=>{try{await this.render();}catch(err){console.error("EngramQuest: skills render failed",err);}}).open();}catch(err){console.error("EngramQuest: skill preview failed",err);new I.Notice("Failed to load skill info: "+String(err));}})}}catch(err){console.error("EngramQuest: skills modal render failed",err);s.textContent="Failed to load skill data: "+String(err);s.style.color="var(--text-error)";return}s.remove()}}

// Returns toolIds whose installed skills differ from the bundled versions.
// Cached on the plugin instance (doInstall clears it) so switching Hub tabs
// doesn't re-read every installed skill file.
function checkSkillsUpdates(plugin) {
  if (!plugin._skillsUpdateStatus) {
    const p = (async () => {
      const outdated = [];
      for (const tool of Object.values(G.TOOL_TARGETS)) {
        const preview = await le(plugin, tool.id);
        if (preview.status === "update_available") outdated.push(tool.id);
      }
      return outdated;
    })();
    // A rejected result must not stay cached, or one transient I/O error would
    // disable update detection for the rest of the session.
    p.catch(() => { if (plugin._skillsUpdateStatus === p) plugin._skillsUpdateStatus = null; });
    plugin._skillsUpdateStatus = p;
  }
  return plugin._skillsUpdateStatus;
}

// Synapse-style Hub banner: shown when installed skills are outdated — in practice
// only when auto-update is off or failed, since autoUpdateSkills runs at plugin load.
// Dismiss short-circuits before any I/O, same pattern as renderSynapseProBanner.
async function renderSkillsUpdateBanner(parent, plugin, stillValid) {
  const t = plugin.settings;
  const dismissedAt = t._skillsUpdateBannerDismissedAt || 0;
  if (dismissedAt && Date.now() - dismissedAt < 24 * 60 * 60 * 1000) return;
  if (!me()) return;

  let outdated;
  try { outdated = await checkSkillsUpdates(plugin); }
  catch (err) { console.warn("EngramQuest: skills update check failed", err); return; }
  if (!outdated.length) return;
  // The check reads every installed skill file; the user may have switched tabs
  // by the time it resolves, and `parent` is the reused tab container.
  if (stillValid && !stillValid()) return;

  const banner = parent.createEl("div", { attr: { class: "lh-synapse-banner" } });
  const text = banner.createEl("div", { attr: { class: "lh-synapse-banner-text" } });
  text.createEl("div", {
    text: K(c(t, "SKILLS_UPDATE_BANNER"), { tools: outdated.map(id => oe(t, id)).join(", ") }),
    attr: { style: "font-weight:600;font-size:13px;line-height:1.4;" }
  });

  const actions = banner.createEl("div", { attr: { class: "lh-synapse-banner-actions" } });
  const updateBtn = actions.createEl("button", {
    text: c(t, "SKILLS_UPDATE_BANNER_BUTTON"),
    attr: { class: "lh-synapse-banner-btn" }
  });
  updateBtn.addEventListener("click", () => { new de(plugin.app, plugin).open(); });

  const dismissBtn = actions.createEl("button", {
    text: "✕",
    attr: { class: "lh-synapse-banner-btn", title: "Dismiss for 24h", style: "padding:6px 10px;" }
  });
  dismissBtn.addEventListener("click", async () => {
    plugin.settings._skillsUpdateBannerDismissedAt = Date.now();
    await plugin.saveData(plugin.settings);
    banner.remove();
  });
}

module.exports = { SkillsPreviewModal: ce, SkillsInstallModal: de, isInstallerAvailable: me, getInstallPreview: le, doInstall: De, autoUpdateSkills: pt, checkSkillsUpdates, renderSkillsUpdateBanner };
