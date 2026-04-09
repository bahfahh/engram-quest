"use strict";

const obsidian = require("obsidian");

const chapters = [
  { id: "ch1-why", titleEn: "Why Harness?", titleZh: "Why Harness?", emoji: "MAP", themeColor: "blue", summary: "A strong model alone is not enough. Reliable agents need structure around the model so work stays consistent, testable, and recoverable.", keyPoints: [{ title: "Context drift", why: "Agents fail when the right context is missing or mixed with irrelevant detail.", example: "A coding agent edits the wrong file because the repo constraints were never loaded." }, { title: "Weak self-checking", why: "Without checks, an agent often assumes it is correct and moves on too early.", example: "The patch compiles locally but breaks the real workflow because no verification step ran." }, { title: "Harness as control layer", why: "A harness adds instructions, guardrails, state, and feedback loops around the model.", example: "AGENTS.md, tests, and progress files keep the agent aligned with the task." }], realWorld: "Teams using structured agent workflows typically get more predictable output than teams relying on prompts alone." },
  { id: "ch2-three-pillars", titleEn: "Three Pillars", titleZh: "Three Pillars", emoji: "TRI", themeColor: "green", summary: "Harness engineering usually rests on three pillars: context engineering, architectural constraints, and feedback loops.", keyPoints: [{ title: "Context engineering", why: "Give the agent the minimum correct context at the correct time.", example: "Load specs, current task state, and file ownership before asking for edits." }, { title: "Architectural constraints", why: "Clear boundaries reduce destructive or low-quality actions.", example: "Require non-interactive git usage and forbid unsafe resets." }, { title: "Feedback loops", why: "Verification closes the gap between looks done and actually works.", example: "Run syntax checks and targeted tests before declaring success." }], realWorld: "The biggest reliability jump often comes from adding lightweight verification rather than adding more prompt text." },
  { id: "ch3-principles", titleEn: "Design Principles", titleZh: "Design Principles", emoji: "RULE", themeColor: "amber", summary: "Good harnesses do not try to micromanage every step. They shape decisions so the agent can act quickly without drifting.", keyPoints: [{ title: "Specify what and why", why: "Tell the agent the goal and constraints clearly; avoid over-prescribing every keystroke.", example: "Fix the Review Deck scan default and preserve migration behavior." }, { title: "Make failure visible", why: "If something breaks, the system should expose it early.", example: "A syntax check catches broken strings before the plugin reaches runtime." }, { title: "Prefer observable progress", why: "Visible state helps both humans and agents recover from interruptions.", example: "A now.md note records product decisions and implementation status." }], realWorld: "The best agent systems feel boring in production: fewer surprises, clearer boundaries, faster recovery." },
  { id: "ch4-scale", titleEn: "Scale & Teams", titleZh: "Scale and Teams", emoji: "TEAM", themeColor: "purple", summary: "As more agents or teammates join, coordination matters more than raw model quality.", keyPoints: [{ title: "Shared rules", why: "Teams need one source of truth for conventions and safety rules.", example: "AGENTS.md and PROJECT_TRUTH.md define workflow expectations." }, { title: "Scoped ownership", why: "Parallel work is safer when responsibilities are explicit.", example: "One agent owns docs while another owns runtime UI fixes." }, { title: "Reviewable outputs", why: "People must be able to inspect and trust what the agent changed.", example: "Small diffs and reproducible checks beat giant opaque rewrites." }], realWorld: "Scaling agents is usually a coordination problem before it becomes a model problem." },
  { id: "ch5-future", titleEn: "The Future", titleZh: "The Future", emoji: "NEXT", themeColor: "slate", isBoss: true, summary: "The frontier is moving from prompt better toward design better systems around the model.", keyPoints: [{ title: "Model plus system", why: "Capability comes from the combination of model, tools, memory, and verification.", example: "A smaller model with a good harness can outperform a larger model used carelessly." }, { title: "Long-running workflows", why: "Persistent state and checkpointing matter for multi-step work.", example: "A project note preserves decisions across debugging sessions." }, { title: "Human steering", why: "Humans should define direction and quality bars; agents should execute within them.", example: "The user sets product behavior, the agent implements and verifies it." }], realWorld: "Reliable agent products will be differentiated less by raw model access and more by workflow design." }
];

const themeColors = {
  blue: { g1: "#93c5fd", g2: "#3b82f6", depth: "#1e3a8a", light: "#bfdbfe" },
  green: { g1: "#86efac", g2: "#22c55e", depth: "#14532d", light: "#bbf7d0" },
  amber: { g1: "#fde047", g2: "#f59e0b", depth: "#78350f", light: "#fef08a" },
  purple: { g1: "#d8b4fe", g2: "#a855f7", depth: "#581c87", light: "#e9d5ff" },
  slate: { g1: "#cbd5e1", g2: "#64748b", depth: "#0f172a", light: "#e2e8f0" }
};

const positions = [{ cx: 100, cy: 155 }, { cx: 300, cy: 255 }, { cx: 500, cy: 95 }, { cx: 700, cy: 255 }, { cx: 900, cy: 145 }];

function createPath() {
  let path = `M ${positions[0].cx} ${positions[0].cy} `;
  for (let i = 0; i < positions.length - 1; i++) {
    let current = positions[i], next = positions[i + 1], delta = next.cx - current.cx;
    path += `C ${current.cx + delta * .65} ${current.cy}, ${next.cx - delta * .65} ${next.cy}, ${next.cx} ${next.cy} `;
  }
  return path;
}

function renderHarnessMap(activeIndex) {
  let path = createPath(), defs = "", islands = "";
  chapters.forEach((chapter, index) => {
    let colors = themeColors[chapter.themeColor];
    defs += `
      <radialGradient id="hglow${index}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${colors.light}" stop-opacity=".7"/>
        <stop offset="100%" stop-color="${colors.light}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="hsurf${index}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${colors.g1}"/>
        <stop offset="100%" stop-color="${colors.g2}"/>
      </linearGradient>`;
  });
  chapters.forEach((chapter, index) => {
    let { cx, cy } = positions[index], isCurrent = index === activeIndex, isCompleted = index < activeIndex, colors = themeColors[chapter.themeColor];
    islands += `<g class="hm-island" data-index="${index}" style="cursor:pointer">`;
    if (isCurrent) islands += `<ellipse cx="${cx}" cy="${cy + 5}" rx="70" ry="38" fill="url(#hglow${index})"/>`;
    islands += `<ellipse cx="${cx}" cy="${cy + 17}" rx="44" ry="9" fill="${colors.depth}" opacity=".85"/>`;
    islands += `<ellipse cx="${cx}" cy="${cy + 8}" rx="44" ry="12" fill="url(#hsurf${index})" stroke="${isCurrent ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)"}" stroke-width="${isCurrent ? 2 : .5}"/>`;
    islands += `<text x="${cx}" y="${isCurrent ? cy - 48 : cy - 42}" text-anchor="middle" dominant-baseline="middle" font-size="${isCurrent ? 34 : 28}" style="user-select:none">${chapter.emoji}</text>`;
    if (isCompleted) islands += `<circle cx="${cx + 28}" cy="${cy - 44}" r="10" fill="#22c55e" stroke="white" stroke-width="1.5"/><text x="${cx + 28}" y="${cy - 44}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="11" font-weight="700">GO</text>`;
    if (isCurrent) islands += `<rect x="${cx - 28}" y="${cy - 78}" width="56" height="18" rx="9" fill="#0f172a" stroke="#4ade80" stroke-width="1.5"/><circle cx="${cx - 16}" cy="${cy - 69}" r="3" fill="#4ade80"/><text x="${cx + 2}" y="${cy - 69}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="9" font-weight="700">Current</text>`;
    islands += `<rect x="${cx - 52}" y="${cy + 28}" width="104" height="34" rx="17" fill="rgba(255,255,255,0.93)" stroke="${isCurrent ? colors.g2 : "rgba(255,255,255,0.6)"}" stroke-width="${isCurrent ? 2 : 1}"/><text x="${cx}" y="${cy + 40}" text-anchor="middle" dominant-baseline="middle" fill="#1e293b" font-size="11" font-weight="700">${chapter.titleEn}</text><text x="${cx}" y="${cy + 53}" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-size="9">${chapter.titleZh}</text></g>`;
  });
  return `
    <div style="position:relative;width:100%;border-radius:16px;border:1px solid var(--background-modifier-border);
                box-shadow:0 10px 30px -10px rgba(0,0,0,0.15);overflow:hidden">
      <div style="width:100%;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin">
        <div style="min-width:1100px;background:linear-gradient(180deg,#87ceeb 0%,#b8e0f7 35%,#7ec8e3 65%,#a8d8ea 100%)">
          <svg viewBox="0 0 1100 420" style="display:block;width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">
            <defs>${defs}</defs>
            <path d="${path}" fill="none" stroke="white" stroke-width="5" stroke-dasharray="10 15" opacity=".45"/>
            <path d="${path}" fill="none" stroke="#67e8f9" stroke-width="3" stroke-dasharray="10 15" opacity=".6"/>
            ${islands}
          </svg>
        </div>
      </div>
    </div>`;
}

function openHarnessChapter(app, chapterIndex) {
  let modal = new obsidian.Modal(app), activeIndex = chapterIndex;
  function renderChapter() {
    let chapter = chapters[activeIndex], colors = themeColors[chapter.themeColor];
    modal.contentEl.empty();
    modal.modalEl.style.cssText = "width:min(92vw,820px);max-width:none;max-height:90vh;overflow:hidden;display:flex;flex-direction:column";
    modal.contentEl.style.cssText = "padding:0;flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0";
    modal.contentEl.createEl("div", { attr: { style: "height:6px;background:var(--background-modifier-border);flex-shrink:0" } }).createEl("div", { attr: { style: `height:100%;border-radius:0 4px 4px 0;width:${(activeIndex + 1) / chapters.length * 100}%;background:linear-gradient(90deg,${colors.g1},${colors.g2});transition:width .5s` } });
    let content = modal.contentEl.createEl("div", { attr: { style: "padding:28px 32px;overflow-y:auto;flex:1;min-height:0" } });
    let header = content.createEl("div", { attr: { style: "display:flex;align-items:flex-start;gap:16px;margin-bottom:16px" } });
    header.createEl("span", { text: chapter.emoji, attr: { style: "font-size:36px;flex-shrink:0" } });
    let title = header.createEl("div");
    title.createEl("h2", { text: chapter.titleEn, attr: { style: "font-size:22px;font-weight:800;margin:0;line-height:1.3;color:var(--text-normal)" } });
    title.createEl("p", { text: `Chapter ${activeIndex + 1} of ${chapters.length} · ${chapter.titleZh}`, attr: { style: "margin:4px 0 0;font-size:12px;color:var(--text-muted)" } });
    content.createEl("p", { text: chapter.summary, attr: { style: "font-size:14px;line-height:1.7;color:var(--text-normal);margin-bottom:24px" } });
    content.createEl("h3", { text: "Key Takeaways", attr: { style: "font-size:11px;font-weight:700;color:var(--text-faint);letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px" } });
    chapter.keyPoints.forEach((point, index) => {
      let block = content.createEl("div", { attr: { style: "border-radius:12px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);padding:16px 20px;margin-bottom:12px" } });
      let blockHeader = block.createEl("div", { attr: { style: "display:flex;align-items:flex-start;gap:12px;margin-bottom:8px" } });
      blockHeader.createEl("span", { text: String(index + 1), attr: { style: "flex-shrink:0;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:var(--interactive-accent);color:white" } });
      blockHeader.createEl("p", { text: point.title, attr: { style: "font-size:15px;font-weight:700;margin:0;color:var(--text-normal)" } });
      block.createEl("p", { text: point.why, attr: { style: "font-size:14px;line-height:1.65;color:var(--text-normal);margin:0 0 12px 36px" } });
      let example = block.createEl("div", { attr: { style: "margin-left:36px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);padding:12px 16px" } });
      example.createEl("span", { text: "e.g. ", attr: { style: "font-size:10px;font-weight:700;color:var(--text-faint);letter-spacing:.08em;text-transform:uppercase" } });
      example.createEl("span", { text: point.example, attr: { style: "font-size:13px;line-height:1.65;color:var(--text-normal);white-space:pre-wrap" } });
    });
    let insight = content.createEl("div", { attr: { style: "margin-bottom:32px;border-radius:12px;border:1px solid var(--interactive-accent);background:var(--background-secondary);padding:16px 20px" } });
    let insightHeader = insight.createEl("div", { attr: { style: "display:flex;align-items:center;gap:8px;margin-bottom:8px" } });
    insightHeader.createEl("span", { text: "💡" });
    insightHeader.createEl("span", { text: "Real-world Insight", attr: { style: "font-size:10px;font-weight:700;color:var(--interactive-accent);letter-spacing:.08em;text-transform:uppercase" } });
    insight.createEl("p", { text: chapter.realWorld, attr: { style: "font-size:14px;line-height:1.7;color:var(--text-normal);margin:0" } });
    let footer = content.createEl("div", { attr: { style: "display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--background-modifier-border);padding-top:20px" } });
    let prev = footer.createEl("button", { text: "Prev", attr: { style: `border-radius:9999px;padding:8px 16px;font-size:14px;font-weight:600;color:var(--text-muted);background:transparent;border:none;cursor:pointer;visibility:${activeIndex === 0 ? "hidden" : "visible"}` } });
    let dots = footer.createEl("div", { attr: { style: "display:flex;gap:6px" } });
    chapters.forEach((_, index) => dots.createEl("button", { attr: { style: `height:8px;border-radius:9999px;border:none;cursor:pointer;transition:all .3s;width:${index === activeIndex ? "24px" : "8px"};background:${index === activeIndex ? "var(--interactive-accent)" : "var(--background-modifier-border)"}` } }).addEventListener("click", () => { activeIndex = index; renderChapter(); }));
    let next = footer.createEl("button", { text: activeIndex === chapters.length - 1 ? "Done" : "Next", attr: { style: `border-radius:9999px;padding:8px 16px;font-size:14px;font-weight:700;color:white;border:none;cursor:pointer;background:linear-gradient(135deg,${colors.g1},${colors.g2})` } });
    prev.addEventListener("click", () => { if (activeIndex > 0) { activeIndex--; renderChapter(); } });
    next.addEventListener("click", () => { if (activeIndex < chapters.length - 1) { activeIndex++; renderChapter(); } else { modal.close(); } });
  }
  modal.open();
  renderChapter();
}

module.exports = { renderHarnessMap, openHarnessChapter };
