"use strict";

const obsidian = require("obsidian");
const { resolveImageOcclusionRect } = require("./helpers");

function isZh(deps, settings) {
  return deps.getLanguage(settings) === "zh-tw";
}

async function markNodeCompleted(app, sourcePath, nodeId) {
  if (!sourcePath || !nodeId) return;
  let file = app.vault.getAbstractFileByPath(sourcePath);
  if (!file) return;
  let content = await app.vault.read(file);
  let lines = content.split('\n');
  let nodeLineIdx = -1, nodeIndentLen = 0;
  for (let i = 0; i < lines.length; i++) {
    let trimmed = lines[i].trim();
    let indent = lines[i].length - lines[i].trimStart().length;
    if (trimmed === `- id: ${nodeId}` && indent <= 2) { nodeLineIdx = i; nodeIndentLen = indent; break; }
  }
  if (nodeLineIdx === -1) return;
  let propIndent = ' '.repeat(nodeIndentLen + 2);
  for (let i = nodeLineIdx + 1; i < lines.length; i++) {
    let trimmed = lines[i].trim();
    let indent = lines[i].length - lines[i].trimStart().length;
    if (trimmed.startsWith('- id:') && indent <= nodeIndentLen) break;
    if (trimmed.startsWith('completed:')) { lines[i] = propIndent + 'completed: true'; await app.vault.modify(file, lines.join('\n')); return; }
  }
  lines.splice(nodeLineIdx + 1, 0, propIndent + 'completed: true');
  await app.vault.modify(file, lines.join('\n'));
}

function setSolved(buttons, onSolved) {
  buttons.forEach((button) => {
    button.disabled = true;
    button.style.background = "#22c55e";
    button.style.color = "white";
    button.style.borderColor = "#22c55e";
  });
  setTimeout(() => onSolved(), 500);
}

function renderQuestChallenge(container, challenge, difficulty, onSolved, settings, app, sourcePath, deps) {
  let preset = deps.questDifficultyPresets[difficulty] || deps.questDifficultyPresets.medium;
  let retryCount = 0;
  let zh = isZh(deps, settings);
  let wrapper = container.createEl("div", { attr: { style: "margin-top:20px;border-top:1px solid var(--background-modifier-border);padding-top:18px" } });
  let header = wrapper.createEl("div", { attr: { style: "display:flex;align-items:center;gap:8px;margin-bottom:14px" } });
  header.createEl("span", { text: "🗺️" });
  header.createEl("span", { text: deps.translateKey(settings, "TAB_QUEST"), attr: { style: "font-size:12px;font-weight:700;color:var(--text-faint);letter-spacing:.08em;text-transform:uppercase" } });
  header.createEl("span", { text: deps.translateKey(settings, preset.labelKey), attr: { style: `font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;color:white;background:${preset.color}` } });

  let hintNotice = null;
  let limitNotice = null;

  function handleWrong(element) {
    retryCount += 1;
    deps.retriggerShake(element);

    if (preset.showHint && challenge.hint && !hintNotice) {
      hintNotice = wrapper.createEl("div", { attr: { style: "margin-top:10px;padding:10px 14px;border-radius:8px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);font-size:13px;color:var(--text-muted)" } });
      hintNotice.createEl("span", { text: "💡 " });
      hintNotice.createEl("span", { text: challenge.hint });
    }

    if (preset.maxRetries !== 99 && retryCount >= preset.maxRetries && !limitNotice) {
      limitNotice = wrapper.createEl("div", { attr: { style: "margin-top:12px;padding:12px 16px;border-radius:10px;background:#fef2f2;border:1px solid #fca5a5;font-size:13px;color:#dc2626;display:flex;align-items:center;gap:10px" } });
      limitNotice.createEl("span", { text: zh ? "已達重試上限，請先回去複習這個章節。" : "Retry limit reached. Review this chapter first." });
      if (challenge.link) {
        limitNotice.createEl("button", {
          text: zh ? "開啟筆記" : "Open Note",
          attr: { style: "margin-left:auto;padding:6px 12px;border-radius:6px;background:#dc2626;color:white;border:none;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap" }
        }).addEventListener("click", () => deps.openQuestLink(app, challenge.link, sourcePath));
      }
    }
  }

  if (challenge.type === "quiz" && Array.isArray(challenge.options)) {
    wrapper.createEl("p", { text: challenge.question || "", attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:12px;line-height:1.5" } });
    let grid = wrapper.createEl("div", { attr: { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px" } });
    let buttons = [];
    challenge.options.forEach((option, index) => {
      let button = grid.createEl("button", { text: option, attr: { class: "qm-ch-btn" } });
      buttons.push(button);
      button.addEventListener("click", () => {
        if (button.disabled) return;
        if (index === challenge.answer) {
          setSolved(buttons, onSolved);
        } else {
          handleWrong(button);
        }
      });
    });
    return;
  }

  if (challenge.type === "countdown" && Array.isArray(challenge.options)) {
    let timerSec = challenge.timer || 15;
    let timerBar = wrapper.createEl("div", { attr: { style: "height:4px;background:var(--background-modifier-border);border-radius:99px;overflow:hidden;margin-bottom:12px" } });
    let timerFill = timerBar.createEl("div", { attr: { style: "height:100%;width:100%;border-radius:99px;background:var(--interactive-accent);transition:width 0.1s linear" } });
    let timerLabel = wrapper.createEl("div", { attr: { style: "font-size:11px;color:var(--text-faint);text-align:right;margin-bottom:12px;font-variant-numeric:tabular-nums" } });
    timerLabel.textContent = timerSec + "s";
    wrapper.createEl("p", { text: challenge.question || "", attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:12px;line-height:1.5" } });
    let grid = wrapper.createEl("div", { attr: { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px" } });
    let buttons = [];
    let expired = false;
    let interval = setInterval(() => {
      timerSec -= 0.1;
      if (timerSec <= 0) {
        clearInterval(interval);
        timerSec = 0;
        timerFill.style.width = "0%";
        timerLabel.textContent = "0s";
        if (!expired && buttons.every(b => !b.disabled)) {
          expired = true;
          buttons.forEach(b => b.disabled = true);
          buttons[challenge.answer].style.background = "#22c55e";
          buttons[challenge.answer].style.color = "white";
          buttons[challenge.answer].style.borderColor = "#22c55e";
          handleWrong(wrapper);
          setTimeout(() => onSolved(), 1200);
        }
        return;
      }
      let pct = (timerSec / (challenge.timer || 15)) * 100;
      timerFill.style.width = pct + "%";
      timerFill.style.background = pct > 50 ? "var(--interactive-accent)" : pct > 25 ? "#f59e0b" : "#ef4444";
      timerLabel.textContent = Math.ceil(timerSec) + "s";
    }, 100);
    challenge.options.forEach((option, index) => {
      let button = grid.createEl("button", { text: option, attr: { class: "qm-ch-btn" } });
      buttons.push(button);
      button.addEventListener("click", () => {
        if (button.disabled || expired) return;
        clearInterval(interval);
        if (index === challenge.answer) {
          setSolved(buttons, onSolved);
        } else {
          handleWrong(button);
        }
      });
    });
    return;
  }

  if (challenge.type === "snapshot" && Array.isArray(challenge.options)) {
    let snapItems = challenge.snapshot_items || [];
    let snapLabels = challenge.snapshot_labels || snapItems.map((_, i) => String(i + 1));
    let snapTime = challenge.snapshot_time || 4;
    let phase = "show";
    let snapBox = wrapper.createEl("div", { attr: { style: "border-radius:10px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);padding:20px;margin-bottom:14px;min-height:80px;text-align:center" } });
    let cdLabel = wrapper.createEl("div", { attr: { style: "font-size:11px;color:var(--text-faint);margin-bottom:12px;font-variant-numeric:tabular-nums" } });
    let grid = snapBox.createEl("div", { attr: { style: "display:grid;grid-template-columns:repeat(2,1fr);gap:8px" } });
    snapItems.forEach((item, i) => {
      let cell = grid.createEl("div", { attr: { style: "background:var(--background-primary);border:1px solid var(--background-modifier-border);border-radius:6px;padding:10px;text-align:left" } });
      cell.createEl("div", { text: snapLabels[i] || "", attr: { style: "font-size:10px;color:var(--text-faint);margin-bottom:2px" } });
      cell.createEl("div", { text: item, attr: { style: "font-size:13px;font-weight:600;color:var(--text-normal)" } });
    });
    cdLabel.textContent = (zh ? "記住以上內容 — " : "Memorize — ") + snapTime + "s";
    let cdVal = snapTime;
    let cdInterval = setInterval(() => {
      cdVal -= 1;
      if (cdVal <= 0) {
        clearInterval(cdInterval);
        phase = "quiz";
        snapBox.empty();
        snapBox.createEl("div", { text: "?", attr: { style: "font-size:48px;color:var(--text-faint);font-style:italic" } });
        cdLabel.textContent = zh ? "從記憶回答：" : "Answer from memory:";
        showQuizPart();
      } else {
        cdLabel.textContent = (zh ? "記住以上內容 — " : "Memorize — ") + cdVal + "s";
      }
    }, 1000);
    function showQuizPart() {
      wrapper.createEl("p", { text: challenge.question || "", attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:12px;line-height:1.5" } });
      let qGrid = wrapper.createEl("div", { attr: { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px" } });
      let buttons = [];
      challenge.options.forEach((option, index) => {
        let button = qGrid.createEl("button", { text: option, attr: { class: "qm-ch-btn" } });
        buttons.push(button);
        button.addEventListener("click", () => {
          if (button.disabled) return;
          if (index === challenge.answer) {
            setSolved(buttons, onSolved);
          } else {
            handleWrong(button);
          }
        });
      });
    }
    return;
  }

  if (challenge.type === "auction" && Array.isArray(challenge.options)) {
    let totalCoins = challenge.coins || 100;
    let betAmount = 10;
    let selectedIdx = -1;
    let confirmed = false;
    let auctionBox = wrapper.createEl("div", { attr: { style: "border-radius:10px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);padding:20px;margin-bottom:14px" } });
    let hdr = auctionBox.createEl("div", { attr: { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--background-modifier-border)" } });
    hdr.createEl("span", { text: zh ? "🪙 知識拍賣場" : "🪙 Knowledge Auction", attr: { style: "font-size:11px;color:var(--text-faint);letter-spacing:.08em" } });
    let coinsLabel = hdr.createEl("span", { text: "◈ " + totalCoins, attr: { style: "font-size:13px;font-weight:600;color:var(--text-normal)" } });
    auctionBox.createEl("p", { text: challenge.question || "", attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:12px;line-height:1.5" } });
    let optGrid = auctionBox.createEl("div", { attr: { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px" } });
    let optEls = [];
    challenge.options.forEach((option, index) => {
      let card = optGrid.createEl("div", { attr: { style: "border:1px solid var(--background-modifier-border);border-radius:8px;padding:10px;cursor:pointer;transition:all .15s;background:var(--background-primary)" } });
      card.createEl("div", { text: option, attr: { style: "font-size:12px;color:var(--text-normal);margin-bottom:6px" } });
      optEls.push(card);
      card.addEventListener("click", () => {
        if (confirmed) return;
        selectedIdx = index;
        optEls.forEach((el, j) => { el.style.borderColor = j === index ? "var(--interactive-accent)" : "var(--background-modifier-border)"; });
      });
    });
    let sliderRow = auctionBox.createEl("div", { attr: { style: "display:flex;align-items:center;gap:8px;margin-bottom:12px" } });
    sliderRow.createEl("span", { text: zh ? "押注：" : "Bet:", attr: { style: "font-size:12px;color:var(--text-faint)" } });
    let slider = sliderRow.createEl("input", { attr: { type: "range", min: "5", max: String(Math.min(totalCoins, 80)), step: "5", value: "10", style: "flex:1" } });
    let betLabel = sliderRow.createEl("span", { text: "10", attr: { style: "font-size:12px;font-weight:600;color:var(--text-normal);min-width:28px;text-align:right" } });
    slider.addEventListener("input", () => { betAmount = parseInt(slider.value); betLabel.textContent = String(betAmount); });
    let confirmBtn = auctionBox.createEl("button", { text: zh ? "確認押注 ◈" : "Confirm Bet ◈", attr: { style: "width:100%;padding:10px;border-radius:8px;background:var(--interactive-accent);color:white;border:none;cursor:pointer;font-size:13px;font-weight:700" } });
    let resultEl = auctionBox.createEl("div", { attr: { style: "margin-top:10px;font-size:12px;color:var(--text-muted);display:none" } });
    confirmBtn.addEventListener("click", () => {
      if (confirmed || selectedIdx < 0) return;
      confirmed = true;
      confirmBtn.style.display = "none";
      slider.disabled = true;
      let win = selectedIdx === challenge.answer;
      optEls.forEach((el, i) => {
        el.style.cursor = "default";
        if (i === challenge.answer) { el.style.borderColor = "#22c55e"; el.style.background = "rgba(34,197,94,0.08)"; }
        else if (i === selectedIdx && !win) { el.style.borderColor = "#ef4444"; el.style.background = "rgba(239,68,68,0.08)"; }
      });
      let delta = win ? betAmount : -betAmount;
      totalCoins = Math.max(0, totalCoins + delta);
      coinsLabel.textContent = "◈ " + totalCoins;
      resultEl.style.display = "block";
      resultEl.textContent = (win ? "✓ +" : "✗ ") + delta + " ◈ — " + (zh ? "餘額 " : "Balance ") + totalCoins;
      resultEl.style.color = win ? "#22c55e" : "#ef4444";
      setTimeout(() => onSolved(), 1200);
    });
    return;
  }

  if (challenge.type === "timeline" && Array.isArray(challenge.slots) && Array.isArray(challenge.events)) {
    let correctAnswer = Array.isArray(challenge.answer) ? challenge.answer : [];
    let placed = new Array(challenge.slots.length).fill(null);
    let selectedEvent = null;
    let checked = false;
    wrapper.createEl("p", { text: challenge.question || (zh ? "把事件放到正確的時間位置" : "Place events in the correct time slots"), attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:12px;line-height:1.5" } });
    let poolLabel = wrapper.createEl("div", { text: zh ? "點選事件，再點選時間欄位放置：" : "Click an event, then click a slot to place it:", attr: { style: "font-size:11px;color:var(--text-faint);margin-bottom:8px" } });
    let pool = wrapper.createEl("div", { attr: { style: "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px" } });
    let eventChips = [];
    let shuffled = challenge.events.map((e, i) => i).sort(() => Math.random() - 0.5);
    shuffled.forEach(origIdx => {
      let chip = pool.createEl("button", { text: challenge.events[origIdx], attr: { style: "padding:6px 12px;border-radius:6px;border:1px solid var(--background-modifier-border);background:var(--background-primary);font-size:12px;cursor:pointer;transition:all .15s;color:var(--text-normal)" } });
      chip._origIdx = origIdx;
      eventChips.push(chip);
      chip.addEventListener("click", () => {
        if (checked || chip.disabled) return;
        eventChips.forEach(c => { c.style.borderColor = "var(--background-modifier-border)"; });
        selectedEvent = origIdx;
        chip.style.borderColor = "var(--interactive-accent)";
      });
    });
    let track = wrapper.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:6px;margin-bottom:14px;padding-left:12px;border-left:2px solid var(--background-modifier-border)" } });
    let slotEls = [];
    challenge.slots.forEach((slot, slotIdx) => {
      let row = track.createEl("div", { attr: { style: "display:flex;align-items:center;gap:10px" } });
      row.createEl("span", { text: slot, attr: { style: "font-size:11px;color:var(--text-faint);min-width:48px;font-weight:600" } });
      let drop = row.createEl("div", { attr: { style: "flex:1;min-height:36px;border:1px dashed var(--background-modifier-border);border-radius:6px;padding:6px 10px;font-size:12px;color:var(--text-muted);cursor:pointer;transition:all .15s;display:flex;align-items:center" } });
      drop.textContent = zh ? "點擊放置" : "Click to place";
      slotEls.push(drop);
      drop.addEventListener("click", () => {
        if (checked || selectedEvent === null) return;
        if (placed[slotIdx] !== null) {
          let oldChip = eventChips.find(c => c._origIdx === placed[slotIdx]);
          if (oldChip) { oldChip.disabled = false; oldChip.style.opacity = "1"; }
        }
        placed[slotIdx] = selectedEvent;
        drop.textContent = challenge.events[selectedEvent];
        drop.style.borderStyle = "solid";
        drop.style.color = "var(--text-normal)";
        drop.style.fontWeight = "600";
        let usedChip = eventChips.find(c => c._origIdx === selectedEvent);
        if (usedChip) { usedChip.disabled = true; usedChip.style.opacity = "0.3"; }
        selectedEvent = null;
        eventChips.forEach(c => { c.style.borderColor = "var(--background-modifier-border)"; });
      });
    });
    let checkBtn = wrapper.createEl("button", { text: zh ? "確認" : "Check", attr: { style: "width:100%;padding:10px;border-radius:8px;background:var(--interactive-accent);color:white;border:none;cursor:pointer;font-size:13px;font-weight:700" } });
    checkBtn.addEventListener("click", () => {
      if (checked) return;
      checked = true;
      checkBtn.style.display = "none";
      let correctCount = 0;
      challenge.slots.forEach((_, i) => {
        let isCorrect = placed[i] === correctAnswer[i];
        if (isCorrect) correctCount++;
        slotEls[i].style.borderColor = isCorrect ? "#22c55e" : "#ef4444";
        slotEls[i].style.borderStyle = "solid";
        slotEls[i].style.background = isCorrect ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)";
        if (!isCorrect && correctAnswer[i] != null) {
          slotEls[i].textContent += " → " + challenge.events[correctAnswer[i]];
        }
      });
      if (correctCount === challenge.slots.length) {
        setTimeout(() => onSolved(), 800);
      } else {
        handleWrong(wrapper);
        setTimeout(() => onSolved(), 2000);
      }
    });
    return;
  }

  if (challenge.type === "chain" && Array.isArray(challenge.chain_items)) {
    let correctOrder = Array.isArray(challenge.answer) ? challenge.answer : challenge.chain_items.map((_, i) => i);
    let timerSec = challenge.timer || 20;
    let activated = 0;
    let mistakes = 0;
    let done = false;
    let timerBar = wrapper.createEl("div", { attr: { style: "height:4px;background:var(--background-modifier-border);border-radius:99px;overflow:hidden;margin-bottom:8px" } });
    let timerFill = timerBar.createEl("div", { attr: { style: "height:100%;width:100%;border-radius:99px;background:var(--interactive-accent);transition:width 0.1s linear" } });
    let timerLabel = wrapper.createEl("div", { attr: { style: "font-size:11px;color:var(--text-faint);text-align:right;margin-bottom:12px;font-variant-numeric:tabular-nums" } });
    timerLabel.textContent = timerSec + "s";
    wrapper.createEl("p", { text: challenge.question || (zh ? "按正確順序點擊：" : "Click in the correct order:"), attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:12px;line-height:1.5" } });
    let nodeList = wrapper.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:6px;margin-bottom:14px" } });
    let shuffled = challenge.chain_items.map((_, i) => i).sort(() => Math.random() - 0.5);
    let nodeEls = [];
    shuffled.forEach(origIdx => {
      let node = nodeList.createEl("button", { attr: { style: "display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;border:1px solid var(--background-modifier-border);background:var(--background-primary);cursor:pointer;transition:all .2s;text-align:left;width:100%" } });
      let numEl = node.createEl("span", { text: "?", attr: { style: "width:24px;height:24px;border-radius:6px;background:rgba(124,111,247,0.12);color:var(--interactive-accent);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0" } });
      node.createEl("span", { text: challenge.chain_items[origIdx], attr: { style: "font-size:13px;color:var(--text-normal)" } });
      node._origIdx = origIdx;
      node._numEl = numEl;
      nodeEls.push(node);
      node.addEventListener("click", () => {
        if (done || node.disabled) return;
        let expected = correctOrder[activated];
        if (origIdx === expected) {
          activated++;
          node.disabled = true;
          node.style.borderColor = "#22c55e";
          node.style.background = "rgba(34,197,94,0.06)";
          numEl.textContent = String(activated);
          numEl.style.background = "rgba(34,197,94,0.2)";
          numEl.style.color = "#22c55e";
          if (activated === correctOrder.length) { endChain(true); }
        } else {
          mistakes++;
          deps.retriggerShake(node);
          node.style.borderColor = "#ef4444";
          setTimeout(() => { node.style.borderColor = "var(--background-modifier-border)"; }, 400);
          if (mistakes >= 3) { endChain(false); }
        }
      });
    });
    let interval = setInterval(() => {
      timerSec -= 0.1;
      if (timerSec <= 0) { clearInterval(interval); if (!done) endChain(false); return; }
      let pct = (timerSec / (challenge.timer || 20)) * 100;
      timerFill.style.width = pct + "%";
      timerFill.style.background = pct > 50 ? "var(--interactive-accent)" : pct > 25 ? "#f59e0b" : "#ef4444";
      timerLabel.textContent = Math.ceil(timerSec) + "s";
    }, 100);
    function endChain(success) {
      if (done) return;
      done = true;
      clearInterval(interval);
      nodeEls.forEach(n => { n.disabled = true; n.style.cursor = "default"; });
      if (success) {
        setTimeout(() => onSolved(), 800);
      } else {
        correctOrder.forEach((origIdx, step) => {
          let el = nodeEls.find(n => n._origIdx === origIdx);
          if (el && !el.style.borderColor.includes("22c55e")) {
            el._numEl.textContent = String(step + 1);
            el.style.borderColor = "#f59e0b";
            el.style.background = "rgba(245,158,11,0.06)";
          }
        });
        handleWrong(wrapper);
        setTimeout(() => onSolved(), 2000);
      }
    }
    return;
  }

  if (challenge.type === "truefalse") {
    wrapper.createEl("p", { text: challenge.statement || "", attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:12px;line-height:1.5;padding:12px 16px;border-radius:8px;background:var(--background-secondary)" } });
    let row = wrapper.createEl("div", { attr: { style: "display:flex;gap:12px" } });
    let buttons = [];
    [
      { label: zh ? "正確" : "True", val: true },
      { label: zh ? "錯誤" : "False", val: false }
    ].forEach(({ label, val }) => {
      let button = row.createEl("button", { text: label, attr: { class: "qm-ch-btn", style: "width:auto;padding:10px 28px;font-size:14px" } });
      buttons.push(button);
      button.addEventListener("click", () => {
        if (button.disabled) return;
        if (val === challenge.answer) {
          setSolved(buttons, onSolved);
        } else {
          handleWrong(button);
        }
      });
    });
    return;
  }

  if (challenge.type === "order" && Array.isArray(challenge.items)) {
    wrapper.createEl("p", { text: challenge.question || (zh ? "請依正確順序點擊：" : "Click in the correct order:"), attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:10px" } });
    let chipRow = wrapper.createEl("div", { attr: { style: "display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px" } });
    let sequence = wrapper.createEl("div", { attr: { style: "min-height:36px;padding:8px 12px;border-radius:8px;background:var(--background-secondary);font-size:13px;color:var(--text-muted);margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center" } });
    sequence.createEl("span", { text: zh ? "順序：" : "Sequence:", attr: { style: "color:var(--text-faint);font-size:11px" } });
    let picks = [];
    let buttons = [];
    challenge.items.forEach((item, index) => {
      let button = chipRow.createEl("button", { text: item, attr: { class: "qm-ch-chip" } });
      buttons.push(button);
      button.addEventListener("click", () => {
        if (button.disabled) return;
        picks.push(index);
        button.disabled = true;
        sequence.createEl("span", { text: item, attr: { style: "padding:2px 10px;border-radius:12px;background:var(--interactive-accent);color:white;font-size:12px;font-weight:600" } });
        if (picks.length !== challenge.items.length) return;
        let correct = Array.isArray(challenge.answer) && picks.every((value, answerIndex) => value === challenge.answer[answerIndex]);
        if (correct) {
          setSolved(buttons, onSolved);
          return;
        }
        buttons.forEach((itemButton) => {
          itemButton.disabled = false;
          itemButton.style.borderColor = "";
          deps.retriggerShake(itemButton);
        });
        Array.from(sequence.querySelectorAll("span")).slice(1).forEach((node) => node.remove());
        picks = [];
        handleWrong(chipRow);
      });
    });
    return;
  }

  if (challenge.type === "match" && Array.isArray(challenge.pairs)) {
    wrapper.createEl("p", { text: zh ? "配對題：先點左邊，再點右邊。" : "Match the pairs: click left, then right.", attr: { style: "font-size:13px;color:var(--text-muted);margin-bottom:12px" } });
    let grid = wrapper.createEl("div", { attr: { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:0" } });
    let left = grid.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:6px;min-width:0" } });
    let right = grid.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:6px;min-width:0" } });
    let order = challenge.pairs.map((_, index) => index).sort(() => Math.random() - 0.5);
    let selected = null;
    let solved = 0;
    let leftButtons = [];
    let rightButtons = [];

    challenge.pairs.forEach((pair, index) => {
      let button = left.createEl("button", { text: pair[0], attr: { class: "qm-ch-btn" } });
      leftButtons.push(button);
      button.addEventListener("click", () => {
        if (button.disabled) return;
        leftButtons.forEach((item) => item.classList.remove("qm-selected"));
        selected = index;
        button.classList.add("qm-selected");
      });
    });

    order.forEach((pairIndex) => {
      let button = right.createEl("button", { text: challenge.pairs[pairIndex][1], attr: { class: "qm-ch-btn" } });
      rightButtons.push(button);
      button.addEventListener("click", () => {
        if (button.disabled || selected === null) return;
        if (selected === pairIndex) {
          let matchedLeft = leftButtons[selected];
          matchedLeft.disabled = true;
          button.disabled = true;
          matchedLeft.classList.remove("qm-selected");
          matchedLeft.style.background = "#22c55e";
          matchedLeft.style.color = "white";
          matchedLeft.style.borderColor = "#22c55e";
          button.style.background = "#22c55e";
          button.style.color = "white";
          button.style.borderColor = "#22c55e";
          selected = null;
          solved += 1;
          if (solved === challenge.pairs.length) {
            setTimeout(() => onSolved(), 500);
          }
          return;
        }
        handleWrong(button);
        leftButtons[selected].classList.remove("qm-selected");
        selected = null;
      });
    });
    return;
  }

  if (challenge.type === "cloze" && challenge.sentence) {
    let expected = deps.collectExpectedAnswers(challenge);
    let sentence = wrapper.createEl("div", { attr: { style: "font-size:15px;line-height:1.8;color:var(--text-normal);margin-bottom:12px;padding:14px 16px;border-radius:10px;background:var(--background-secondary);border:1px solid var(--background-modifier-border)" } });
    sentence.appendChild(obsidian.sanitizeHTMLToDom(deps.renderClozeSentence(challenge.sentence, false)));
    let controls = wrapper.createEl("div", { attr: { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" } });
    let input = controls.createEl("input", { attr: { type: "text", placeholder: zh ? "輸入填空答案" : "Type the cloze answer", class: "qm-ch-input" } });
    let button = controls.createEl("button", { text: zh ? "送出" : "Submit", attr: { class: "qm-ch-btn", style: "width:auto;padding:10px 18px" } });
    let result = wrapper.createEl("div", { attr: { style: "margin-top:10px;font-size:13px;color:var(--text-muted)" } });
    let revealButton = null;
    let revealAnswer = () => {
      sentence.empty();
      sentence.appendChild(obsidian.sanitizeHTMLToDom(deps.renderClozeSentence(challenge.sentence, true)));
      result.textContent = (zh ? "正確答案：" : "Correct answer: ") + expected.join(" / ");
      if (revealButton) revealButton.disabled = true;
    };
    let submit = () => {
      if (deps.matchesExpectedAnswer(input.value, expected)) {
        revealAnswer();
        setSolved([button], onSolved);
      } else {
        handleWrong(button);
        result.textContent = zh ? "答案不正確。你可以再試一次，或直接顯示答案。" : "That is not correct. Try once more or reveal the answer.";
        if (challenge.reveal_answer !== false && !revealButton) {
          revealButton = controls.createEl("button", { text: deps.translateKey(settings, "SHOW_ANSWER"), attr: { style: "padding:10px 16px;border-radius:8px;background:#475569;color:white;border:none;cursor:pointer;font-size:13px;font-weight:700;white-space:nowrap" } });
          revealButton.addEventListener("click", revealAnswer);
        }
      }
    };
    button.addEventListener("click", submit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
    });
    return;
  }

  if ((challenge.type === "input" || challenge.type === "text") && (challenge.prompt || challenge.question)) {
    wrapper.createEl("p", { text: challenge.prompt || challenge.question, attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:10px" } });
    let expected = deps.collectExpectedAnswers(challenge);
    let controls = wrapper.createEl("div", { attr: { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" } });
    let input = controls.createEl("input", { attr: { type: "text", placeholder: zh ? "輸入答案" : "Type your answer", class: "qm-ch-input" } });
    let button = controls.createEl("button", { text: zh ? "送出" : "Submit", attr: { class: "qm-ch-btn", style: "width:auto;padding:10px 18px" } });
    let submit = () => {
      if (deps.matchesExpectedAnswer(input.value, expected)) {
        setSolved([button], onSolved);
      } else {
        handleWrong(button);
      }
    };
    button.addEventListener("click", submit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
    });
    return;
  }

  if (challenge.type === "image" && challenge.image) {
    let resource = deps.getQuestImageResource(app, challenge.image, sourcePath);
    if (!resource) {
      wrapper.createEl("p", { text: zh ? "找不到題目圖片。" : "Image not found for this challenge.", attr: { style: "color:var(--text-muted)" } });
      return;
    }
    wrapper.createEl("p", { text: challenge.prompt || challenge.question || (zh ? "請點擊正確區域。" : "Click the correct region."), attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:10px" } });
    let stage = wrapper.createEl("div", { attr: { style: "position:relative;display:inline-block;max-width:100%;border-radius:12px;overflow:hidden;border:1px solid var(--background-modifier-border)" } });
    let image = stage.createEl("img", { attr: { src: resource, style: "display:block;max-width:100%;height:auto" } });
    stage.addEventListener("click", (event) => {
      let rect = image.getBoundingClientRect();
      let x = (event.clientX - rect.left) / rect.width;
      let y = (event.clientY - rect.top) / rect.height;
      let correct =
        x >= (challenge.region_x ?? 0) &&
        y >= (challenge.region_y ?? 0) &&
        x <= (challenge.region_x ?? 0) + (challenge.region_width ?? 0) &&
        y <= (challenge.region_y ?? 0) + (challenge.region_height ?? 0);
      if (correct) {
        setTimeout(() => onSolved(), 300);
      } else {
        handleWrong(stage);
      }
    });
    return;
  }

  if (challenge.type === "image-occlusion" && challenge.image) {
    let expected = deps.collectExpectedAnswers(challenge);
    let resource = deps.getQuestImageResource(app, challenge.image, sourcePath);
    let revealButton = null;
    let feedbackEl = null;
    let geometryWarningEl = null;

    function getFeedback() {
      if (!feedbackEl) {
        feedbackEl = wrapper.createEl("div", { attr: { style: "margin-top:10px;padding:10px 14px;border-radius:8px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);font-size:13px;color:var(--text-muted)" } });
      }
      return feedbackEl;
    }

    function setGeometryWarning(text) {
      if (!text) {
        if (geometryWarningEl) {
          geometryWarningEl.remove();
          geometryWarningEl = null;
        }
        return;
      }

      if (!geometryWarningEl) {
        geometryWarningEl = wrapper.createEl("div", { attr: { style: "margin-bottom:12px;padding:12px 14px;border-radius:10px;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;font-size:13px;line-height:1.5" } });
      }
      geometryWarningEl.textContent = text;
    }

    function revealAnswer() {
      occluder.style.background = "rgba(34,197,94,0.82)";
      occluder.style.borderColor = "#22c55e";
      occluder.style.color = "#052e16";
      occluder.textContent = expected.join(" / ");
      getFeedback().textContent = (zh ? "正確答案：" : "Correct answer: ") + expected.join(" / ");
      if (revealButton) revealButton.disabled = true;
    }

    if (!resource) {
      wrapper.createEl("div", { text: zh ? "找不到圖片檔案。請使用 vault-relative 路徑，或相對於目前筆記的 note-relative 路徑，例如 Folder/assets/image.png 或 assets/image.png。" : "Image file not found. Use a vault-relative path or a note-relative path from the current note, for example Folder/assets/image.png or assets/image.png.", attr: { style: "padding:12px 14px;border-radius:10px;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;font-size:13px" } });
      return;
    }

    if (challenge.prompt) {
      wrapper.createEl("p", { text: challenge.prompt, attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:12px;line-height:1.5" } });
    }

    let stage = wrapper.createEl("div", { attr: { style: "position:relative;width:min(100%,760px);margin-bottom:12px;border-radius:14px;overflow:hidden;border:1px solid var(--background-modifier-border);background:var(--background-secondary)" } });
    let img = stage.createEl("img", { attr: { src: resource, alt: challenge.prompt || challenge.answer || "image occlusion", style: "display:block;width:100%;height:auto" } });
    let occluder = stage.createEl("div", { attr: { style: "position:absolute;background:rgba(15,23,42,0.82);border:2px solid rgba(255,255,255,0.85);border-radius:10px;display:none;align-items:center;justify-content:center;color:#f8fafc;font-weight:700;font-size:13px;text-align:center;padding:6px;box-sizing:border-box;pointer-events:none" } });
    occluder.textContent = zh ? "已遮蓋" : "Hidden";

    function syncOccluder() {
      let rect = resolveImageOcclusionRect(challenge, img.naturalWidth, img.naturalHeight);
      if (!rect) {
        occluder.style.display = "none";
        setGeometryWarning(
          zh
            ? "這張 image-occlusion 缺少有效的遮罩座標。請提供 region_x / region_y / region_width / region_height，或使用相容的 region_*_pct。"
            : "This image-occlusion challenge is missing a valid bbox. Provide region_x / region_y / region_width / region_height, or legacy region_*_pct values."
        );
        return;
      }

      occluder.style.display = "flex";
      occluder.style.left = rect.leftPct + "%";
      occluder.style.top = rect.topPct + "%";
      occluder.style.width = rect.widthPct + "%";
      occluder.style.height = rect.heightPct + "%";
      if (rect.wasClamped) {
        setGeometryWarning(
          zh
            ? "遮罩座標超出圖片邊界，已自動裁切到圖片範圍內。"
            : "The occlusion bbox exceeded the image bounds and was clamped to the visible image area."
        );
      } else {
        setGeometryWarning("");
      }
    }

    img.addEventListener("load", syncOccluder);
    if (img.complete) syncOccluder();

    let btnRow = wrapper.createEl("div", { attr: { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px" } });
    btnRow.createEl("button", { text: zh ? "查看原圖" : "View Source Image", attr: { style: "padding:8px 14px;border-radius:8px;background:#334155;color:white;border:none;cursor:pointer;font-size:12px;font-weight:700" } })
      .addEventListener("click", () => deps.openQuestLink(app, challenge.image, sourcePath));
    if (challenge.link) {
      btnRow.createEl("button", { text: zh ? "開啟來源筆記" : "Open Source Note", attr: { style: "padding:8px 14px;border-radius:8px;background:#475569;color:white;border:none;cursor:pointer;font-size:12px;font-weight:700" } })
        .addEventListener("click", () => deps.openQuestLink(app, challenge.link, sourcePath));
    }

    let inputRow = wrapper.createEl("div", { attr: { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" } });
    let input = inputRow.createEl("input", { attr: { type: "text", placeholder: zh ? "輸入被遮住的答案" : "Type the occluded answer", class: "qm-ch-input" } });
    let submitBtn = inputRow.createEl("button", { text: zh ? "送出" : "Submit", attr: { style: "padding:10px 20px;border-radius:8px;background:var(--interactive-accent);color:white;border:none;cursor:pointer;font-size:13px;font-weight:700;white-space:nowrap" } });

    let submit = () => {
      let val = input.value.trim();
      if (!val) return;
      if (deps.matchesExpectedAnswer(val, expected)) {
        input.style.borderColor = "#22c55e";
        submitBtn.style.background = "#22c55e";
        revealAnswer();
        getFeedback().textContent = zh ? "答對了" : "Correct";
        input.disabled = true;
        submitBtn.disabled = true;
        setTimeout(() => onSolved(), 500);
      } else {
        handleWrong(input);
        getFeedback().textContent = zh ? "答案不正確。你可以再試一次，或直接顯示答案。" : "That is not correct. Try once more or reveal the answer.";
        if (challenge.reveal_answer !== false && !revealButton) {
          revealButton = inputRow.createEl("button", { text: deps.translateKey(settings, "SHOW_ANSWER"), attr: { style: "padding:10px 16px;border-radius:8px;background:#475569;color:white;border:none;cursor:pointer;font-size:13px;font-weight:700;white-space:nowrap" } });
          revealButton.addEventListener("click", revealAnswer);
        }
      }
    };
    submitBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
    });
    return;
  }
}

function openQuestChapterModal(app, nodes, activeIndex, styleName, difficulty, settings, sourcePath, deps) {
  let modal = new obsidian.Modal(app);
  let currentIndex = activeIndex;
  let theme = deps.getQuestTheme(styleName, currentIndex, {
    ocean: { colors: [{ g1: "#60a5fa", g2: "#2563eb" }] },
    forest: { colors: [{ g1: "#4ade80", g2: "#16a34a" }] },
    galaxy: { colors: [{ g1: "#c084fc", g2: "#7c3aed" }] },
    "sky-island": { colors: [{ g1: "#7dd3fc", g2: "#38bdf8" }] }
  });

  function showComplete() {
    let zh = isZh(deps, settings);
    modal.contentEl.empty();
    modal.modalEl.style.cssText = "width:min(92vw,480px);max-width:none;max-height:90vh;overflow:hidden;display:flex;flex-direction:column";
    modal.contentEl.style.cssText = "padding:0;flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0";
    let wrap = modal.contentEl.createEl("div", { attr: { style: "flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 32px;text-align:center;gap:16px;" } });
    wrap.createEl("div", { attr: { style: "font-size:64px;line-height:1;" } }).textContent = "🏆";
    wrap.createEl("div", { attr: { style: "font-size:22px;font-weight:800;color:var(--text-normal);" } }).textContent = deps.t ? deps.t(settings, "QUEST_COMPLETE") : (zh ? "Quest 通關！🏆" : "Quest Complete! 🏆");
    wrap.createEl("div", { attr: { style: "font-size:13px;color:var(--text-muted);line-height:1.6;max-width:260px;" } }).textContent = `${nodes.length} ${zh ? "個章節全部完成" : "chapters completed"}`;
    let btn = wrap.createEl("button", { attr: { style: "margin-top:12px;border-radius:99px;padding:14px 32px;font-size:15px;font-weight:700;cursor:pointer;border:none;background:linear-gradient(135deg,#4f46e5,#818cf8);color:#fff;box-shadow:0 4px 16px rgba(79,70,229,0.4);" } });
    btn.textContent = zh ? "關閉" : "Close";
    btn.addEventListener("click", () => modal.close());
  }

  function render() {
    let node = nodes[currentIndex];
    let zh = isZh(deps, settings);
    modal.contentEl.empty();
    modal.modalEl.style.cssText = "width:min(92vw,820px);max-width:none;max-height:90vh;overflow:hidden;display:flex;flex-direction:column";
    modal.contentEl.style.cssText = "padding:0;flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0";

    modal.contentEl.createEl("div", { attr: { style: "height:6px;background:var(--background-modifier-border);flex-shrink:0" } })
      .createEl("div", { attr: { style: `height:100%;border-radius:0 4px 4px 0;width:${((currentIndex + 1) / nodes.length) * 100}%;background:linear-gradient(90deg,${theme.g1},${theme.g2});transition:width .5s` } });

    let content = modal.contentEl.createEl("div", { attr: { style: "padding:28px 32px;overflow-y:auto;flex:1;min-height:0" } });
    let header = content.createEl("div", { attr: { style: "display:flex;align-items:flex-start;gap:16px;margin-bottom:16px" } });
    header.createEl("span", { text: node.emoji || "📝", attr: { style: "font-size:36px;flex-shrink:0" } });
    let title = header.createEl("div");
    title.createEl("h2", { text: node.title || `${zh ? "章節" : "Chapter"} ${currentIndex + 1}`, attr: { style: "font-size:22px;font-weight:800;margin:0;line-height:1.3;color:var(--text-normal)" } });
    title.createEl("p", { text: `${zh ? "第" : "Chapter "}${currentIndex + 1}${zh ? " / " : " of "}${nodes.length}`, attr: { style: "margin:4px 0 0;font-size:12px;color:var(--text-muted)" } });

    if (node.summary) {
      content.createEl("p", { text: node.summary, attr: { style: "font-size:14px;line-height:1.7;color:var(--text-normal);margin-bottom:24px" } });
    }

    if (Array.isArray(node.points) && node.points.length > 0) {
      content.createEl("h3", { text: zh ? "重點整理" : "Key Takeaways", attr: { style: "font-size:11px;font-weight:700;color:var(--text-faint);letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px" } });
      node.points.forEach((point, index) => {
        let block = content.createEl("div", { attr: { style: "border-radius:12px;border:1px solid var(--background-modifier-border);background:var(--background-secondary);padding:16px 20px;margin-bottom:12px" } });
        let row = block.createEl("div", { attr: { style: "display:flex;align-items:flex-start;gap:12px;margin-bottom:8px" } });
        row.createEl("span", { text: String(index + 1), attr: { style: "flex-shrink:0;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:var(--interactive-accent);color:white" } });
        row.createEl("p", { text: point.title || "", attr: { style: "font-size:15px;font-weight:700;margin:0;color:var(--text-normal)" } });
        if (point.body) {
          block.createEl("p", { text: point.body, attr: { style: "font-size:14px;line-height:1.65;color:var(--text-normal);margin:0 0 0 36px" } });
        }
      });
    }

    if (node.challenge) {
      deps.renderQuestChallenge(content, node.challenge, difficulty, () => {
        markNodeCompleted(app, sourcePath, node.id);
        if (currentIndex < nodes.length - 1) {
          currentIndex += 1;
          render();
        } else {
          showComplete();
        }
      }, settings, app, sourcePath);
    }

    let footer = content.createEl("div", { attr: { style: "display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--background-modifier-border);padding-top:20px;margin-top:28px" } });
    let prev = footer.createEl("button", { text: zh ? "上一章" : "Previous", attr: { style: `border-radius:9999px;padding:8px 16px;font-size:14px;font-weight:600;color:var(--text-muted);background:transparent;border:none;cursor:pointer;visibility:${currentIndex === 0 ? "hidden" : "visible"}` } });
    let next = footer.createEl("button", { text: currentIndex === nodes.length - 1 ? (zh ? "完成" : "Done") : (zh ? "下一章" : "Next"), attr: { style: `border-radius:9999px;padding:8px 16px;font-size:14px;font-weight:700;color:white;border:none;cursor:pointer;background:linear-gradient(135deg,${theme.g1},${theme.g2})` } });
    prev.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        render();
      }
    });
    next.addEventListener("click", () => {
      if (currentIndex < nodes.length - 1) {
        if (!nodes[currentIndex].challenge) markNodeCompleted(app, sourcePath, nodes[currentIndex].id);
        currentIndex += 1;
        render();
      } else {
        if (!nodes[currentIndex].challenge) markNodeCompleted(app, sourcePath, nodes[currentIndex].id);
        showComplete();
      }
    });
  }

  modal.open();
  render();
}

module.exports = {
  renderQuestChallenge,
  openQuestChapterModal
};
