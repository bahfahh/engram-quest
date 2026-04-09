"use strict";

const obsidian = require("obsidian");

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function openReviewCardModal(app, card, onDone, settings, deps) {
  let modal = new obsidian.Modal(app);
  modal.modalEl.style.cssText = "width:min(92vw,600px);max-width:none;max-height:90vh;overflow:hidden;display:flex;flex-direction:column";
  modal.contentEl.style.cssText = "padding:0;flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0";

  let hintLevel = 0;
  let answerShown = false;
  let srMeta = card.srMeta || null;

  function render() {
    let againCalc = deps.computeFsrs(1, srMeta, settings);
    let hardCalc = deps.computeFsrs(2, srMeta, settings);
    let goodCalc = deps.computeFsrs(3, srMeta, settings);
    let easyCalc = deps.computeFsrs(4, srMeta, settings);

    modal.contentEl.empty();
    let body = modal.contentEl.createEl("div", {
      attr: { style: "padding:28px 28px 24px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px" }
    });
    body.createEl("div", {
      attr: { style: "font-size:17px;font-weight:700;color:var(--text-normal);line-height:1.55" },
      text: card.front
    });
    body.createEl("div", { attr: { style: "border-top:1px dashed var(--background-modifier-border)" } });

    let hintBackgrounds = ["", "#dbeafe", "#fef9c3", "#dcfce7"];
    let hintLabels = ["", "L1 Active Recall", "L2 Contextual Anchor", "L3 Narrowing Hint"];
    let hints = [null, card.hint_l1, card.hint_l2, card.hint_l3];

    for (let index = 1; index <= hintLevel; index++) {
      let block = body.createEl("div", {
        attr: { style: `border-radius:10px;padding:13px 16px;background:${hintBackgrounds[index]};border:1px solid rgba(0,0,0,0.07)` }
      });
      block.createEl("div", {
        attr: { style: "font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px" },
        text: hintLabels[index]
      });
      block.createEl("div", {
        attr: { style: "font-size:14px;color:#1f2937;line-height:1.65" },
        text: hints[index] || deps.translate(settings, "NO_HINT")
      });
    }

    if (answerShown) {
      body.createEl("div", {
        attr: { style: "font-size:15px;line-height:1.7;color:var(--text-normal);background:var(--background-secondary);border-radius:10px;padding:15px 17px;border:1px solid var(--background-modifier-border)" },
        text: card.back
      });
    }

    body.createEl("div", { attr: { style: "flex:1" } });
    let actions = body.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:8px" } });

    if (answerShown) {
      let ratings = actions.createEl("div", { attr: { class: "rd-rating-row" } });
      [
        { q: 1, label: deps.translate(settings, "AGAIN"), calc: againCalc, color: "#ef4444" },
        { q: 2, label: deps.translate(settings, "HARD"), calc: hardCalc, color: "#f59e0b" },
        { q: 3, label: deps.translate(settings, "GOOD"), calc: goodCalc, color: "#3b82f6" },
        { q: 4, label: deps.translate(settings, "EASY"), calc: easyCalc, color: "#22c55e" }
      ].forEach((rating) => {
        let button = ratings.createEl("button", { attr: { class: "rd-rating-btn", style: `background:${rating.color}` } });
        button.createEl("span", { text: rating.label });
        button.createEl("small", { text: `${rating.calc.interval}${deps.translate(settings, "DAYS")}` });
        button.addEventListener("click", async () => {
          let result = deps.computeFsrs(rating.q, srMeta, settings);
          let comment = `<!--SR:!${result.due},${result.interval},${result.stability},${result.difficulty},${result.state}-->`;

          if (card.notePath) {
            try {
              let file = app.vault.getAbstractFileByPath(card.notePath);
              if (file) {
                let content = await app.vault.read(file);
                if (card.srComment && deps.anySrPattern.test(card.srComment)) {
                  content = content.replace(card.srComment, comment);
                } else {
                  let pairPattern = new RegExp(`(${escapeRegExp(card.front)}\\s*::\\s*${escapeRegExp(card.back)})`);
                  content = content.replace(pairPattern, `$1\n${comment}`);
                }
                await app.vault.modify(file, content);
              }
            } catch (error) {
              console.error("review-deck: write FSRS meta failed", error);
            }
          }

          card.srMeta = {
            due: result.due,
            interval: result.interval,
            stability: result.stability,
            difficulty: result.difficulty,
            state: result.state,
            repetitions: result.repetitions
          };
          card.srComment = comment;
          srMeta = card.srMeta;
          modal.close();
          if (onDone) onDone();
        });
      });
      return;
    }

    if ((card.hint_l1 || card.hint_l2 || card.hint_l3) && hintLevel < 3) {
      let hintButton = actions.createEl("button", {
        attr: { class: "rd-action-btn", style: "border:1.5px solid var(--interactive-accent);background:transparent;color:var(--interactive-accent)" },
        text: deps.translate(settings, hintLevel === 0 ? "RECALL" : "HINT_NEXT")
      });
      hintButton.addEventListener("click", () => {
        hintLevel += 1;
        render();
      });
    }

    let answerButton = actions.createEl("button", {
      attr: { class: "rd-action-btn", style: "border:none;background:var(--interactive-accent);color:white" },
      text: deps.translate(settings, "SHOW_ANSWER")
    });
    answerButton.addEventListener("click", () => {
      answerShown = true;
      render();
    });
  }

  modal.open();
  render();
}

module.exports = {
  openReviewCardModal
};
