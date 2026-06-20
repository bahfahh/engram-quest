"use strict";

const I = require("obsidian");
const { t, getLocale } = require("../i18n");
const {
  buildQuestRenderState,
  loadQuestState,
  markQuestNodeComplete,
  saveQuestState,
  updateQuestBestRun,
} = require("./state");
const {
  collectExpectedAnswers,
  getQuestImageResource,
  getQuestTheme,
  matchesExpectedAnswer,
  openQuestLink,
  questDifficultyPresets,
  renderClozeSentence,
  retriggerShake,
} = require("./helpers");
const { openQuestChapterModal, renderQuestChallenge } = require("./modal");

const W = I.moment;
function locale(settings) {
  return getLocale(settings, W && W.locale && W.locale());
}

function isDarkTheme() {
  return typeof activeDocument !== "undefined" && activeDocument.body?.classList?.contains("theme-dark");
}

function getNodeDescription(node) {
  return node?.summary || node?.scenario || node?.mission_goal || node?.stakes || "";
}

// Disc positions (x%, y%) calibrated to match background art for each difficulty.
// Each array represents the platform ring centers in path order (start → boss).
const DISC_PRESETS = {
  easy: [
    {x:22.9, y:81.9},
    {x:55.3, y:51.7},
    {x:71.9, y:25.2},
  ],
  medium: [
    {x:24.8, y:77.9},
    {x:39.8, y:61.2},
    {x:53.8, y:49  },
    {x:65.9, y:35.6},
    {x:73.6, y:22.4},
    {x:84.3, y:11.6},
  ],
  hard: [
    {x:22.5, y:86.7},
    {x:41.1, y:69.8},
    {x:31.2, y:47.4},
    {x:55.6, y:57.3},
    {x:66.7, y:45.9},
    {x:75.5, y:66.4},
    {x:57.6, y:26.4},
    {x:67,   y:15.7},
  ],
};

// Select N positions from the preset disc rings.
// When count <= preset.length: pick a subset of actual disc ring positions (never interpolate
// between rings — intermediate points would miss the stone platforms).
// When count > preset.length: interpolate along the path to fill extra slots.
function _interpPreset(preset, count) {
  if (count <= 0) return [];
  if (count === 1) return [{ ...preset[Math.floor(preset.length / 2)] }];
  if (count === preset.length) return preset.map((p) => ({ ...p }));

  // Fewer nodes than rings: evenly pick a subset of disc positions (all on actual rings)
  if (count < preset.length) {
    return Array.from({ length: count }, (_, n) => {
      const idx = Math.round(n * (preset.length - 1) / (count - 1));
      return { ...preset[idx] };
    });
  }

  // More nodes than rings: arc-length interpolation to create extra intermediate positions
  const segs = [];
  let total = 0;
  for (let i = 0; i < preset.length - 1; i++) {
    const dx = preset[i + 1].x - preset[i].x;
    const dy = preset[i + 1].y - preset[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segs.push(len);
    total += len;
  }
  return Array.from({ length: count }, (_, n) => {
    const target = (n / (count - 1)) * total;
    let acc = 0;
    for (let i = 0; i < segs.length; i++) {
      if (acc + segs[i] >= target - 1e-9) {
        const t = segs[i] > 0 ? (target - acc) / segs[i] : 0;
        return {
          x: preset[i].x + t * (preset[i + 1].x - preset[i].x),
          y: preset[i].y + t * (preset[i + 1].y - preset[i].y),
        };
      }
      acc += segs[i];
    }
    return { ...preset[preset.length - 1] };
  });
}

function nodePositions(nodes, layout = {}, difficulty = "medium") {
  const explicit = nodes.every((node) => Number.isFinite(Number(node.x)) && Number.isFinite(Number(node.y)));
  if (explicit) return nodes.map((node) => ({ x: Number(node.x), y: Number(node.y) }));
  if (Array.isArray(layout.positions) && layout.positions.length >= nodes.length) {
    return nodes.map((_, index) => {
      const pos = layout.positions[index] || {};
      return {
        x: Number.isFinite(Number(pos.x)) ? Math.max(0, Math.min(100, Number(pos.x))) : 10 + index * 12,
        y: Number.isFinite(Number(pos.y)) ? Math.max(0, Math.min(100, Number(pos.y))) : 60,
      };
    });
  }
  const preset = DISC_PRESETS[difficulty] || DISC_PRESETS.medium;
  return _interpPreset(preset, Math.max(1, nodes.length));
}

function addConnector(stage, from, to, completed) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const bg = completed
    ? "linear-gradient(90deg,#22c55e,#6366f1)"
    : "linear-gradient(90deg,rgba(255,255,255,.55),rgba(255,255,255,.25))";
  const shadow = completed
    ? "0 0 8px 2px rgba(99,102,241,.45)"
    : "0 2px 6px rgba(0,0,0,.35)";
  stage.createEl("div", {
    attr: {
      style: [
        "position:absolute",
        `left:${from.x}%`,
        `top:${from.y}%`,
        `width:${len}%`,
        "height:5px",
        `transform:rotate(${angle}deg)`,
        "transform-origin:0 50%",
        `background:${bg}`,
        "border-radius:999px",
        "z-index:1",
        `box-shadow:${shadow}`,
      ].join(";"),
    },
  });
}

class QuestViewerModal extends I.Modal {
  constructor(app, plugin, quest, onDone) {
    super(app);
    this.plugin = plugin;
    this.quest = quest;
    this.onDone = onDone;
    this.state = null;
    this.renderState = null;
    this.changed = false;
  }

  async onOpen() {
    this.modalEl.addClass("qm-modal");
    this.modalEl.addClass("lh-hub");
    if (isDarkTheme()) this.modalEl.addClass("lh-dark");
    this.modalEl.style.cssText = "width:min(96vw,1040px);max-width:none;height:min(92vh,760px);max-height:none;padding:0;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;";
    this.contentEl.style.cssText = "padding:0;display:flex;flex-direction:column;min-height:0;flex:1;background:var(--background-primary);color:var(--text-normal);";
    await this.reload();
    this.render();
  }

  onClose() {
    this.contentEl.empty();
    if (this.changed && this.onDone) this.onDone();
  }

  async reload() {
    this.state = await loadQuestState(this.app.vault.adapter, this.quest.stateKey || this.quest.sourcePath || this.quest.slug);
    this.renderState = buildQuestRenderState(this.quest.nodes || [], this.state);
  }

  async markComplete(nodeId, result = {}) {
    if (!nodeId) return;
    const key = this.quest.stateKey || this.quest.sourcePath || this.quest.slug;
    this.state = markQuestNodeComplete(this.state, nodeId, result);
    this.state = updateQuestBestRun(this.state, this.quest.nodes || []);
    await saveQuestState(this.app.vault.adapter, key, this.state);
    this.changed = true;
    await this.reload();
    this.render();
  }

  openNode(index) {
    const nodes = this.quest.nodes || [];
    const node = nodes[index];
    if (!node) return;
    const completed = Boolean(this.renderState?.state?.nodes?.[node.id]?.completed);
    const activeIndex = this.renderState?.activeIndex ?? 0;
    const zh = locale(this.plugin.settings) === "zh-tw";
    if (index > activeIndex && !completed) {
      new I.Notice(zh ? "先完成前面的節點。" : "Complete earlier nodes first.");
      return;
    }
    const challengeDeps = {
      getQuestTheme,
      getLanguage: (settings) => locale(settings),
      renderQuestChallenge: (container, challenge, difficulty, onSolved, settings, app, sourcePath, deps, gameState) => (
        renderQuestChallenge(container, challenge, difficulty, onSolved, settings, app, sourcePath, {
          ...deps,
          collectExpectedAnswers,
          getQuestImageResource,
          getLanguage: (s) => locale(s),
          matchesExpectedAnswer,
          openQuestLink,
          questDifficultyPresets,
          renderClozeSentence,
          retriggerShake,
          translateKey: t,
        }, gameState)
      ),
    };
    openQuestChapterModal(
      this.app,
      [node],
      0,
      this.quest.style || "ocean",
      this.quest.difficulty || "medium",
      this.plugin.settings,
      this.quest.sourcePath || this.quest.stateKey || "",
      challengeDeps,
      (nodeId, _nodeIndex, completion) => {
        if (!nodeId) return;
        this.markComplete(nodeId, completion || { scorePct: 100 }).catch((error) => {
          console.error("EngramQuest: quest node completion failed", error);
        });
      },
    );
  }

  render() {
    const settings = this.plugin.settings;
    const zh = locale(settings) === "zh-tw";
    const nodes = this.quest.nodes || [];
    const progress = this.renderState || buildQuestRenderState(nodes, this.state);
    const positions = nodePositions(nodes, this.quest.layout, this.quest.difficulty || "medium");
    const activeNode = nodes[progress.activeIndex] || nodes[0] || {};
    const completedCount = progress.completedCount || 0;
    const pct = progress.progressPct || 0;
    const isMobile = window.innerWidth < 600;

    this.contentEl.empty();

    // Header
    const header = this.contentEl.createEl("div", {
      attr: { style: "display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-bottom:1px solid var(--background-modifier-border);background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(16,185,129,.10));flex-wrap:wrap;" },
    });
    const main = header.createEl("div", { attr: { style: "flex:1;min-width:0;" } });
    main.createEl("div", {
      text: this.quest.title || this.quest.slug || "Quest Map",
      attr: { style: "font-size:18px;font-weight:850;color:var(--text-normal);line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" },
    });
    main.createEl("div", {
      text: this.quest.description || getNodeDescription(activeNode) || (zh ? "在任務地圖中完成節點，解鎖下一步。" : "Complete nodes in the mission map to unlock the next step."),
      attr: { style: "margin-top:4px;font-size:12px;color:var(--text-muted);line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;" },
    });
    const meta = header.createEl("div", { attr: { style: "display:flex;align-items:flex-end;flex-direction:column;gap:6px;" } });
    meta.createEl("div", {
      text: String(this.quest.difficulty || "medium").toUpperCase(),
      attr: { style: "font-size:11px;font-weight:900;letter-spacing:.08em;color:#4f46e5;" },
    });
    const barW = isMobile ? "100px" : "150px";
    const bar = meta.createEl("div", { attr: { style: `width:${barW};height:8px;border-radius:999px;background:rgba(148,163,184,.22);overflow:hidden;` } });
    bar.createEl("div", { attr: { style: `height:100%;width:${pct}%;background:linear-gradient(90deg,#10b981,#6366f1);border-radius:inherit;` } });
    meta.createEl("div", {
      text: `${completedCount}/${nodes.length}${progress.bestScorePct != null ? ` / ${progress.bestScorePct}%` : ""}`,
      attr: { style: "font-size:11px;font-weight:750;color:var(--text-muted);" },
    });

    const isDark = isDarkTheme();
    const assetRoot = this.app.vault.configDir + "/plugins/engram-quest/assets/quest-map/";
    const generatedRoot = assetRoot + "generated/";
    const mapAssets = {
      crown: this.app.vault.adapter.getResourcePath(generatedRoot + "crown-current-node.webp"),
      nodeFrame: this.app.vault.adapter.getResourcePath(generatedRoot + "node-number-frame.webp"),
      bossGate: this.app.vault.adapter.getResourcePath(generatedRoot + "boss-gate.webp"),
      bossLock: this.app.vault.adapter.getResourcePath(generatedRoot + "boss-lock-badge.webp"),
    };
    const difficulty = this.quest.difficulty || "medium";
    const bgUrl = this.app.vault.adapter.getResourcePath(assetRoot + "quest-map_backgroud_" + difficulty + ".png");

    // Body: 2-col grid on desktop, single column on mobile (side panel first for navigation)
    const body = this.contentEl.createEl("div", {
      attr: {
        style: isMobile
          ? "flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto;"
          : "flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:0;overflow:hidden;",
      },
    });

    const renderSide = (parent) => {
      const side = parent.createEl("div", {
        attr: {
          style: isMobile
            ? "background:var(--background-secondary);padding:16px;"
            : "border-left:1px solid var(--background-modifier-border);background:var(--background-secondary);padding:18px;overflow:auto;",
        },
      });
      this.renderSidePanel(side, activeNode, progress, zh);
    };

    const renderMap = (parent) => {
      const mapWrap = parent.createEl("div", {
        attr: { style: `min-width:0;overflow:${isMobile ? "hidden" : "auto"};padding:${isMobile ? "12px" : "18px"};background:var(--background-primary);` },
      });
      const stageStyles = [
        "position:relative",
        "border-radius:16px",
        "overflow:hidden",
        "border:1px solid var(--background-modifier-border)",
        "box-shadow:0 10px 30px rgba(15,23,42,.08)",
      ];
      if (!isMobile) stageStyles.push("min-width:760px");
      const stage = mapWrap.createEl("div", { attr: { style: stageStyles.join(";") } });
      // <img> makes node x/y% reference actual image coordinates (not CSS cover-cropped space)
      stage.createEl("img", { attr: { src: bgUrl, style: "width:100%;display:block;border-radius:14px;" } });
      positions.slice(0, -1).forEach((pos, index) => {
        const next = positions[index + 1];
        const done = Boolean(progress.state.nodes[nodes[index]?.id]?.completed);
        addConnector(stage, pos, next, done);
      });
      nodes.forEach((node, index) => this.renderNode(stage, node, index, positions[index], progress, assetRoot, isDark, mapAssets));
    };

    // Mobile: side panel first (immediate access to node list + start button), map below
    // Desktop: map on left, side panel on right
    if (isMobile) {
      renderSide(body);
      renderMap(body);
    } else {
      renderMap(body);
      renderSide(body);
    }
  }

  renderNode(stage, node, index, pos, progress, assetRoot, isDark, mapAssets = {}) {
    const completed = Boolean(progress.state.nodes[node.id]?.completed);
    const active = index === progress.activeIndex && !completed;
    const locked = index > progress.activeIndex && !completed;
    const boss = Boolean(node.boss || node.type === "boss");

    const glow = active
      ? "0 0 0 4px rgba(99,102,241,.4),0 0 20px 8px rgba(99,102,241,.45)"
      : boss
        ? "0 0 0 3px rgba(245,158,11,.5),0 0 16px 6px rgba(239,68,68,.4)"
        : "";

    const size = boss ? 110 : 94;
    const assetFilter = locked
      ? "grayscale(70%) brightness(.7) saturate(.55)"
      : completed
        ? "brightness(1.08) saturate(1.08)"
        : "none";

    const nodeEl = stage.createEl("button", {
      attr: {
        style: [
          "position:absolute",
          `left:${pos?.x ?? 50}%`,
          `top:${pos?.y ?? 50}%`,
          "transform:translate(-50%,-50%)",
          "z-index:3",
          "display:flex",
          "flex-direction:column",
          "align-items:center",
          "gap:5px",
          "border:0",
          "background:transparent",
          "padding:0",
          `cursor:${locked ? "not-allowed" : "pointer"}`,
          `opacity:${locked ? ".72" : "1"}`,
        ].join(";"),
      },
    });

    const wrap = nodeEl.createEl("div", {
      attr: {
        style: [
          "position:relative",
          `width:${size}px`,
          `height:${size}px`,
          "border-radius:50%",
          glow ? `box-shadow:${glow}` : "",
        ].filter(Boolean).join(";"),
      },
    });

    if (active && mapAssets.crown) {
      wrap.createEl("img", {
        attr: {
          src: mapAssets.crown,
          alt: "",
          style: [
            "position:absolute",
            "left:50%",
            "top:-36px",
            "width:48px",
            "height:48px",
            "object-fit:contain",
            "transform:translateX(-50%)",
            "z-index:5",
            "filter:drop-shadow(0 8px 10px rgba(0,0,0,.32))",
            "pointer-events:none",
          ].join(";"),
        },
      });
    }

    wrap.createEl("img", {
      attr: {
        src: boss ? mapAssets.bossGate : mapAssets.nodeFrame,
        alt: "",
        style: [
          `width:${size}px`,
          `height:${size}px`,
          "object-fit:contain",
          "display:block",
          `filter:${assetFilter} drop-shadow(0 12px 16px rgba(0,0,0,.25))`,
          "pointer-events:none",
        ].join(";"),
      },
    });

    if (boss && locked && mapAssets.bossLock) {
      wrap.createEl("img", {
        attr: {
          src: mapAssets.bossLock,
          alt: "",
          style: [
            "position:absolute",
            "right:5px",
            "top:8px",
            "width:42px",
            "height:42px",
            "object-fit:contain",
            "filter:drop-shadow(0 8px 10px rgba(0,0,0,.32))",
            "pointer-events:none",
          ].join(";"),
        },
      });
    } else if (completed && mapAssets.crown) {
      wrap.createEl("img", {
        attr: {
          src: mapAssets.crown,
          alt: "",
          style: [
            "position:absolute",
            "left:50%",
            "top:50%",
            "width:52px",
            "height:52px",
            "object-fit:contain",
            "transform:translate(-50%,-50%)",
            "filter:drop-shadow(0 4px 8px rgba(255,210,80,.45))",
            "pointer-events:none",
            "z-index:6",
          ].join(";"),
        },
      });
    } else if (locked) {
      wrap.createEl("div", {
        text: "🔒",
        attr: {
          style: [
            "position:absolute",
            "left:50%",
            "top:50%",
            "transform:translate(-50%,-50%)",
            "font-size:24px",
            "line-height:1",
            "filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))",
            "pointer-events:none",
          ].join(";"),
        },
      });
    } else if (!boss) {
      wrap.createEl("div", {
        text: String(index + 1),
        attr: {
          style: [
            "position:absolute",
            "left:50%",
            "top:50%",
            "transform:translate(-50%,-50%)",
            "font-size:30px",
            "line-height:1",
            "font-weight:950",
            "color:#fff",
            "text-shadow:0 2px 6px rgba(0,0,0,.65)",
            "pointer-events:none",
          ].join(";"),
        },
      });
    }

    // Title label
    nodeEl.createEl("div", {
      text: node.title || node.id,
      attr: {
        style: [
          "max-width:110px",
          "border-radius:999px",
          "padding:3px 9px",
          "background:rgba(10,10,20,.82)",
          "color:#fff",
          "font-size:10px",
          "font-weight:800",
          "line-height:1.4",
          "text-align:center",
          "box-shadow:0 2px 8px rgba(0,0,0,.5)",
          "white-space:nowrap",
          "overflow:hidden",
          "text-overflow:ellipsis",
          "backdrop-filter:blur(3px)",
        ].join(";"),
      },
    });

    nodeEl.addEventListener("click", (event) => {
      event.preventDefault();
      this.openNode(index);
    });
  }

  renderSidePanel(side, node, progress, zh) {
    side.createEl("div", {
      text: zh ? "目前節點" : "Current Node",
      attr: { style: "font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;" },
    });
    side.createEl("div", {
      text: node.title || "-",
      attr: { style: "font-size:18px;font-weight:850;color:var(--text-normal);line-height:1.3;margin-bottom:8px;" },
    });
    side.createEl("div", {
      text: getNodeDescription(node) || (zh ? "點擊可用節點開始任務。" : "Click an available node to begin."),
      attr: { style: "font-size:13px;color:var(--text-muted);line-height:1.6;margin-bottom:16px;" },
    });
    const nextBtn = side.createEl("button", {
      text: zh ? "開始目前節點" : "Start Current Node",
      attr: { style: "width:100%;border:0;border-radius:12px;padding:11px 14px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:13px;font-weight:850;cursor:pointer;box-shadow:0 8px 18px rgba(79,70,229,.24);" },
    });
    nextBtn.addEventListener("click", () => this.openNode(progress.activeIndex || 0));
    const list = side.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:8px;margin-top:18px;" } });
    (this.quest.nodes || []).forEach((item, index) => {
      const done = Boolean(progress.state.nodes[item.id]?.completed);
      const locked = index > progress.activeIndex && !done;
      const row = list.createEl("button", {
        text: `${done ? "✅" : locked ? "🔒" : "▶"} ${item.title || item.id}`,
        attr: {
          style: [
            "text-align:left",
            "border-radius:10px",
            "padding:8px 10px",
            "font-size:12px",
            "font-weight:750",
            "border:1px solid var(--background-modifier-border)",
            `background:${index === progress.activeIndex ? "rgba(99,102,241,.12)" : "var(--background-primary)"}`,
            "color:var(--text-normal)",
            `cursor:${locked ? "not-allowed" : "pointer"}`,
            `opacity:${locked ? ".58" : "1"}`,
          ].join(";"),
        },
      });
      row.addEventListener("click", () => this.openNode(index));
    });
  }
}

module.exports = { QuestViewerModal, nodePositions, DISC_PRESETS };
