"use strict";
// Per-feature onboarding modal. The first time a user opens a Hub feature tab
// (review / quest / lesson / memory) it pops a concise "image + what + first step"
// card so newcomers know their next action instead of hunting the global "?" help.
// Shown once per feature (tracked in settings._guideSeen); re-openable via the ⓘ
// button attached to each feature's card header (attachInfoButton).

const I = require("obsidian");
const { getLocale: L } = require("../i18n");

// One entry per feature tab id. `img` is the base filename in assets/guide/ WITHOUT
// the locale suffix — resolved to `{img}_中文.webp` / `{img}_english.webp` at render.
const CONTENT = {
  review: {
    emoji: "🃏", img: "reviewdeck",
    "zh-tw": {
      title: "Review Deck — 三階回想複習",
      lines: [
        "把筆記變成閃卡，FSRS 在你<strong>快忘記的瞬間</strong>排複習。",
        "<strong>L1</strong> 只給問題逼你回想 → <strong>L2</strong> 從你的 vault 找出當初學它的脈絡 → <strong>L3</strong> 給關鍵字方向。",
      ],
      first: "<strong>免 AI</strong>：筆記打上 <code>#flashcards/主題</code> + 一張 <code>Q:/A:</code> 卡，牌組就出現在這裡。<br><strong>用 AI</strong>：① 到<strong>設定 → AI Skills</strong> 安裝 Skills → ② 用 Claude Code / Codex / Antigravity 等工具說「把 math 筆記做成 review deck」。",
    },
    en: {
      title: "Review Deck — Three-Stage Recall",
      lines: [
        "Turn notes into flashcards; FSRS schedules them <strong>right before you forget</strong>.",
        "<strong>L1</strong> question-only recall → <strong>L2</strong> AI rebuilds the moment you first learned it from your vault → <strong>L3</strong> a keyword nudge.",
      ],
      first: "<strong>No AI</strong>: tag a note <code>#flashcards/topic</code> + one <code>Q:/A:</code> card — the deck appears here.<br><strong>With AI</strong>: ① install Skills in <strong>Settings → AI Skills</strong> → ② in Claude Code / Codex / Antigravity, say \"Build a review deck from my math notes.\"",
    },
  },
  quest: {
    emoji: "🗺️", img: "questmap",
    "zh-tw": {
      title: "Quest Map — 把筆記變成遊戲關卡",
      lines: [
        "一篇筆記 → 一張島嶼地圖，<strong>15 種互動題型</strong>逐關闖過去。",
        "難度 Easy / Medium / Hard，章末有 <strong>Boss Battle</strong> 綜合測驗。",
      ],
      first: "① 到<strong>設定 → AI Skills</strong> 安裝 Skills → ② 用 Claude Code / Codex / Antigravity 等工具說：「把 微積分.md 做成 quest-map medium」→ ③ 地圖出現在這個分頁。",
    },
    en: {
      title: "Quest Map — Turn Notes into Challenges",
      lines: [
        "One note → an island map you clear through <strong>15 interaction types</strong>.",
        "Easy / Medium / Hard difficulty, with a final applied <strong>Boss Battle</strong>.",
      ],
      first: "① Install Skills in <strong>Settings → AI Skills</strong> → ② in Claude Code / Codex / Antigravity, say: \"Turn calculus.md into a quest-map medium\" → ③ the map appears in this tab.",
    },
  },
  lesson: {
    emoji: "🎓", img: "lesson_academy",
    "zh-tw": {
      title: "教材 — AI 為你打造課程",
      lines: [
        "告訴 AI 想學什麼，它<strong>先問你的目標和程度</strong>，再生成可在 Obsidian 內研讀的互動課程。",
        "每堂課附測驗，學完可一鍵轉成 Review Deck 或 Quest Map。",
      ],
      first: "① 到<strong>設定 → AI Skills</strong> 安裝 Skills → ② 用 Claude Code / Codex / Antigravity 等工具說：「教我 SEO，建一套課程」→ ③ 課程出現在這裡。也可先按「建立新課程」排課綱。",
    },
    en: {
      title: "Lesson Academy — AI-Built Courses",
      lines: [
        "Tell AI a topic; it <strong>asks your goal and level first</strong>, then builds an interactive course you study inside Obsidian.",
        "Every lesson ends with a quiz — convert a finished course into a Review Deck or Quest Map.",
      ],
      first: "① Install Skills in <strong>Settings → AI Skills</strong> → ② in Claude Code / Codex / Antigravity, say: \"Teach me SEO — build a course\" → ③ it appears here. Or click \"New course\" to plan an outline first.",
    },
  },
  memory: {
    emoji: "🧠", img: "memory_map",
    "zh-tw": {
      title: "Memory Map — 看見知識全局",
      lines: [
        "用 Obsidian Canvas 把抽象概念畫成<strong>視覺結構</strong>，串連你既有的筆記。",
        "複習卡片時可一鍵跳到對應的概念圖。",
      ],
      first: "① 到<strong>設定 → AI Skills</strong> 安裝 Skills → ② 用 Claude Code / Codex / Antigravity 等工具說：「幫 作業系統概論.md 建立 memory-map」→ ③ 概念圖出現在這裡。也可自建 <code>{筆記名}-memory.canvas</code>。",
    },
    en: {
      title: "Memory Map — See the Big Picture",
      lines: [
        "Lay abstract concepts onto an Obsidian Canvas as <strong>visual structure</strong>, linked to your existing notes.",
        "Jump from a review card straight to its matching concept map.",
      ],
      first: "① Install Skills in <strong>Settings → AI Skills</strong> → ② in Claude Code / Codex / Antigravity, say: \"Create a memory-map for OS-overview.md\" → ③ it appears here. Or make a <code>{note-name}-memory.canvas</code> yourself.",
    },
  },
};

function hasGuide(tab) {
  return Object.prototype.hasOwnProperty.call(CONTENT, tab);
}

class FeatureGuideModal extends I.Modal {
  constructor(app, plugin, tab) {
    super(app);
    this.plugin = plugin;
    this.tab = tab;
  }

  onOpen() {
    const def = CONTENT[this.tab];
    if (!def) { this.close(); return; }
    const locale = L(this.plugin.settings) === "zh-tw" ? "zh-tw" : "en";
    const copy = def[locale];
    const isDark = activeDocument.body.classList.contains("theme-dark");
    const bg = isDark ? "#1a1a2e" : "#ffffff";
    const text = isDark ? "#e2e8f0" : "#1f2937";
    const muted = isDark ? "#94a3b8" : "#6b7280";
    const accentBg = isDark ? "rgba(99,102,241,0.16)" : "#eef2ff";
    const accentBorder = isDark ? "rgba(129,140,248,0.5)" : "#c7d2fe";
    const accentText = isDark ? "#c7d2fe" : "#4338ca";
    const codeBg = isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6";

    const imgFile = `${def.img}_${locale === "zh-tw" ? "中文" : "english"}.webp`;
    const imgSrc = this.app.vault.adapter.getResourcePath(
      I.normalizePath(`${this.plugin.manifest.dir}/assets/guide/${imgFile}`)
    );

    const border = isDark ? "#2a2a44" : "#e5e7eb";

    // Bounded-height card: image (capped) + scrollable text + pinned footer button,
    // so the CTA and "Got it" are always reachable regardless of viewport height.
    this.modalEl.style.cssText = `width:min(92vw,500px);max-width:none;max-height:88vh;padding:0;overflow:hidden;border-radius:18px;background:${bg};color:${text};display:flex;flex-direction:column`;
    const { contentEl } = this;
    contentEl.empty();
    contentEl.style.cssText = `padding:0;color:${text};display:flex;flex-direction:column;min-height:0;flex:1;overflow:hidden`;

    // Image header — capped to a fraction of viewport; object-fit:contain keeps the
    // whole infographic legible instead of cropping it.
    const imgWrap = contentEl.createEl("div", { attr: { style: `position:relative;flex-shrink:0;width:100%;background:${isDark ? "#12121f" : "#f8faff"};border-bottom:1px solid ${border};cursor:zoom-in` } });
    const imgEl = imgWrap.createEl("img", { attr: { src: imgSrc, alt: copy.title, style: "width:100%;display:block;max-height:36vh;object-fit:contain" } });
    imgEl.addEventListener("error", () => { imgWrap.style.display = "none"; });
    // The infographic text is tiny at modal size — let the user click to view it full-screen.
    imgWrap.createEl("div", { text: locale === "zh-tw" ? "🔍 點擊放大" : "🔍 Click to enlarge", attr: { style: "position:absolute;right:8px;bottom:8px;padding:3px 9px;border-radius:99px;background:rgba(0,0,0,0.62);color:#fff;font-size:11px;font-weight:600;pointer-events:none" } });
    imgWrap.addEventListener("click", () => openLightbox(imgSrc, copy.title));

    // Scrollable text region.
    const scroll = contentEl.createEl("div", { attr: { style: "flex:1;min-height:0;overflow-y:auto;padding:16px 22px 6px" } });
    const titleRow = scroll.createEl("div", { attr: { style: "display:flex;align-items:center;gap:10px;margin-bottom:8px" } });
    titleRow.createEl("span", { text: def.emoji, attr: { style: "font-size:22px;line-height:1" } });
    titleRow.createEl("span", { text: copy.title, attr: { style: "font-size:16.5px;font-weight:700" } });

    copy.lines.forEach(line => {
      const p = scroll.createEl("p", { attr: { style: `margin:7px 0;font-size:13px;line-height:1.6;color:${text}` } });
      p.appendChild(I.sanitizeHTMLToDom(line));
    });

    // First-step CTA — the whole point: tell the newcomer their next action.
    const cta = scroll.createEl("div", { attr: { style: `margin-top:12px;padding:11px 14px;background:${accentBg};border:1px solid ${accentBorder};border-radius:12px` } });
    cta.createEl("div", { text: locale === "zh-tw" ? "👉 第一步" : "👉 First step", attr: { style: `font-size:12px;font-weight:700;color:${accentText};margin-bottom:5px;letter-spacing:0.02em` } });
    cta.createEl("div", { attr: { style: `font-size:13px;line-height:1.6;color:${text}` } }).appendChild(I.sanitizeHTMLToDom(copy.first));

    // Pinned footer — never scrolls away.
    const footer = contentEl.createEl("div", { attr: { style: `flex-shrink:0;padding:11px 22px;border-top:1px solid ${border};display:flex;align-items:center;justify-content:space-between;gap:10px;background:${bg}` } });
    footer.createEl("span", { text: locale === "zh-tw" ? "之後可點標題旁的 ⓘ 再看一次" : "Reopen via the ⓘ next to the title", attr: { style: `font-size:11px;color:${muted}` } });
    const okBtn = footer.createEl("button", { text: locale === "zh-tw" ? "開始" : "Got it", attr: { style: "padding:8px 22px;border-radius:9px;border:none;background:linear-gradient(135deg,#4f46e5,#818cf8);color:#fff;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0" } });
    okBtn.addEventListener("click", () => this.close());

    // Apply code styling to inline <code> (sanitizeHTMLToDom strips style attrs, so style here).
    contentEl.querySelectorAll("code").forEach(el => {
      el.style.cssText = `background:${codeBg};padding:1px 6px;border-radius:5px;font-size:12px;color:${text}`;
    });
  }
}

// Full-screen image viewer — the modal thumbnail is too small to read the infographic.
function openLightbox(src, alt) {
  const ov = activeDocument.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:24px;-webkit-tap-highlight-color:transparent";
  const im = activeDocument.createElement("img");
  im.src = src;
  im.alt = alt || "";
  im.style.cssText = "max-width:96vw;max-height:96vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.55)";
  ov.appendChild(im);
  ov.addEventListener("click", () => ov.remove());
  activeDocument.body.appendChild(ov);
}

// Adds a clear "?" button to a feature card header that reopens this feature's guide.
function attachInfoButton(headerEl, app, plugin, tab) {
  if (!hasGuide(tab)) return;
  const isDark = activeDocument.body.classList.contains("theme-dark");
  const baseBg = isDark ? "rgba(99,102,241,0.18)" : "#eef2ff";
  const hoverBg = isDark ? "rgba(99,102,241,0.34)" : "#e0e7ff";
  const btn = headerEl.createEl("button", { attr: { class: "lh-feature-info", title: L(plugin.settings) === "zh-tw" ? "使用說明" : "How it works", "aria-label": "guide" } });
  btn.style.cssText = `width:26px;height:26px;border-radius:50%;border:1px solid ${isDark ? "rgba(129,140,248,0.55)" : "#c7d2fe"};background:${baseBg};cursor:pointer;color:${isDark ? "#c7d2fe" : "#4f46e5"};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;padding:0`;
  btn.appendChild(I.sanitizeHTMLToDom('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'));
  btn.addEventListener("mouseenter", () => { btn.style.background = hoverBg; });
  btn.addEventListener("mouseleave", () => { btn.style.background = baseBg; });
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    new FeatureGuideModal(app, plugin, tab).open();
  });
  return btn;
}

module.exports = { FeatureGuideModal, attachInfoButton, hasFeatureGuide: hasGuide };
