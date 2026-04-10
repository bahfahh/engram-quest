"use strict";

const obsidian = require("obsidian");

function isZh(deps, settings) {
  return deps.getLanguage(settings) === "zh-tw";
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

function renderQuestChallenge(container, challenge, difficulty, onSolved, settings, app, deps) {
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
        }).addEventListener("click", () => deps.openQuestLink(app, challenge.link));
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
    let grid = wrapper.createEl("div", { attr: { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px" } });
    let left = grid.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:6px" } });
    let right = grid.createEl("div", { attr: { style: "display:flex;flex-direction:column;gap:6px" } });
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
    sentence.innerHTML = deps.renderClozeSentence(challenge.sentence, false);
    let controls = wrapper.createEl("div", { attr: { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" } });
    let input = controls.createEl("input", { attr: { type: "text", placeholder: zh ? "輸入填空答案" : "Type the cloze answer", class: "qm-ch-input" } });
    let button = controls.createEl("button", { text: zh ? "送出" : "Submit", attr: { class: "qm-ch-btn", style: "width:auto;padding:10px 18px" } });
    let result = wrapper.createEl("div", { attr: { style: "margin-top:10px;font-size:13px;color:var(--text-muted)" } });
    let submit = () => {
      if (deps.matchesExpectedAnswer(input.value, expected)) {
        sentence.innerHTML = deps.renderClozeSentence(challenge.sentence, true);
        result.textContent = (zh ? "正確答案：" : "Correct answer: ") + expected.join(" / ");
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
    let resource = deps.getQuestImageResource(app, challenge.image);
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
    let resource = deps.getQuestImageResource(app, challenge.image);
    let revealButton = null;
    let feedbackEl = null;

    function getFeedback() {
      if (!feedbackEl) {
        feedbackEl = wrapper.createEl("div", { attr: { style: "margin-top:10px;padding:10px 14px;border-radius:8px;background:var(--background-secondary);border:1px solid var(--background-modifier-border);font-size:13px;color:var(--text-muted)" } });
      }
      return feedbackEl;
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
      wrapper.createEl("div", { text: zh ? "找不到圖片檔案，請檢查圖片路徑。" : "Image file not found. Check the image path.", attr: { style: "padding:12px 14px;border-radius:10px;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;font-size:13px" } });
      return;
    }

    if (challenge.prompt) {
      wrapper.createEl("p", { text: challenge.prompt, attr: { style: "font-size:14px;font-weight:600;color:var(--text-normal);margin-bottom:12px;line-height:1.5" } });
    }

    let stage = wrapper.createEl("div", { attr: { style: "position:relative;width:min(100%,760px);margin-bottom:12px;border-radius:14px;overflow:hidden;border:1px solid var(--background-modifier-border);background:var(--background-secondary)" } });
    let img = stage.createEl("img", { attr: { src: resource, alt: challenge.prompt || challenge.answer || "image occlusion", style: "display:block;width:100%;height:auto" } });
    let occluder = stage.createEl("div", { attr: { style: "position:absolute;background:rgba(15,23,42,0.82);border:2px solid rgba(255,255,255,0.85);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#f8fafc;font-weight:700;font-size:13px;text-align:center;padding:6px;box-sizing:border-box" } });
    occluder.textContent = zh ? "已遮蓋" : "Hidden";

    function positionOccluder() {
      let W = img.naturalWidth || img.width || 1;
      let H = img.naturalHeight || img.height || 1;
      occluder.style.left   = ((challenge.region_x      || 0) / W * 100) + "%";
      occluder.style.top    = ((challenge.region_y      || 0) / H * 100) + "%";
      occluder.style.width  = ((challenge.region_width  || 120) / W * 100) + "%";
      occluder.style.height = ((challenge.region_height || 60)  / H * 100) + "%";
    }
    if (img.complete) {
      positionOccluder();
    } else {
      img.addEventListener("load", positionOccluder, { once: true });
    }

    let btnRow = wrapper.createEl("div", { attr: { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px" } });
    btnRow.createEl("button", { text: zh ? "查看原圖" : "View Source Image", attr: { style: "padding:8px 14px;border-radius:8px;background:#334155;color:white;border:none;cursor:pointer;font-size:12px;font-weight:700" } })
      .addEventListener("click", () => deps.openQuestLink(app, challenge.image));
    if (challenge.link) {
      btnRow.createEl("button", { text: zh ? "開啟來源筆記" : "Open Source Note", attr: { style: "padding:8px 14px;border-radius:8px;background:#475569;color:white;border:none;cursor:pointer;font-size:12px;font-weight:700" } })
        .addEventListener("click", () => deps.openQuestLink(app, challenge.link));
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

function openQuestChapterModal(app, nodes, activeIndex, styleName, difficulty, settings, deps) {
  let modal = new obsidian.Modal(app);
  let currentIndex = activeIndex;
  let theme = deps.getQuestTheme(styleName, currentIndex, {
    ocean: { colors: [{ g1: "#60a5fa", g2: "#2563eb" }] },
    forest: { colors: [{ g1: "#4ade80", g2: "#16a34a" }] },
    galaxy: { colors: [{ g1: "#c084fc", g2: "#7c3aed" }] },
    "sky-island": { colors: [{ g1: "#7dd3fc", g2: "#38bdf8" }] }
  });

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
        if (currentIndex < nodes.length - 1) {
          currentIndex += 1;
          render();
        } else {
          modal.close();
        }
      }, settings, app);
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
        currentIndex += 1;
        render();
      } else {
        modal.close();
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
