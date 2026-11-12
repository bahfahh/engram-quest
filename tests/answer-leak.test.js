// Tests for src/review/answer-leak.js: would showing this text give part of the card's answer away?

import { describe, it, expect } from "vitest";
import { leaksAnswer, leakingTerm, termsOf } from "../src/review/answer-leak.js";

describe("termsOf", () => {
  it("reads Latin words without everyday words and CJK text as runs between punctuation and function words", () => {
    expect(termsOf("「網站」的問題。").runs).toEqual(["網站", "問題"]);
    expect(termsOf("The status of two APIs").words).toEqual([{ word: "status", acronym: false }, { word: "api", acronym: false }]);
    expect(termsOf("失敗 門檻（threshold）").runs).toEqual(["失敗門檻"]);
  });
});

describe("leaksAnswer: a two-letter abbreviation is too common to be the answer by itself", () => {
  const long = "Split the work: the AI agent drafts the migration, a reviewer checks the schema, and the pipeline runs the tests before anything ships.";

  it("lets it pass in a long answer and catches it in a short one", () => {
    expect(leaksAnswer("AI 寫程式的工作流", long)).toBe(false);
    expect(leaksAnswer("AI 寫程式的工作流", "AI")).toBe(true);
    expect(leaksAnswer("ID 怎麼產生", "先查 DB 再回傳結果，並把這次查詢記到稽核紀錄，方便之後追蹤是誰在什麼時間改了哪一筆。")).toBe(false);
  });

  it("still catches a longer abbreviation and names the term it found", () => {
    expect(leakingTerm("API 設計原則", "Expose it through a versioned API so that clients keep working while the schema changes underneath.")).toBe("api");
    expect(leakingTerm("同屬 CI gate 的判斷", "失敗門檻")).toBe(null);
  });
});

describe("leaksAnswer: short terms and acronyms", () => {
  it("matches a short Latin term as a whole word, whatever its width or case", () => {
    expect(leaksAnswer("RNA polymerase", "RNA")).toBe(true);
    expect(leaksAnswer("ＡＴＰ is energy", "ATP")).toBe(true);
    expect(leaksAnswer("TCP/IP 模型", "TCP")).toBe(true);
    expect(leaksAnswer("ATP synthase", "ATP (adenosine triphosphate)")).toBe(true);
    expect(leaksAnswer("rna polymerase", "RNA")).toBe(true);
  });

  it("does not find a short term inside a longer word", () => {
    expect(leaksAnswer("International standards", "RNA")).toBe(false);
    expect(leaksAnswer("It depends on the setup", "end-to-end")).toBe(false);
    expect(leaksAnswer("Catalog of services", "ATP")).toBe(false);
  });

  it("matches a short CJK term standing on its own in either text", () => {
    expect(leaksAnswer("粒線體的結構", "粒線體負責產能")).toBe(true);
    expect(leaksAnswer("複製 DNA", "DNA 複製")).toBe(true);
    expect(leaksAnswer("什麼是快取？", "快取")).toBe(true);
  });
});

describe("leaksAnswer: both directions, word by word", () => {
  it("finds the answer inside the text and the text inside the answer", () => {
    expect(leaksAnswer("Mitochondria structure", "The mitochondria")).toBe(true);
    expect(leaksAnswer("The mitochondria", "Mitochondria are the site of oxidative phosphorylation")).toBe(true);
  });

  it("finds a phrase taken from inside a long answer", () => {
    const answer = "Most ATP is made in the inner membrane, where the electron transport chain drives oxidative phosphorylation and a proton gradient powers ATP synthase.";
    expect(leaksAnswer("Oxidative phosphorylation", answer)).toBe(true);
    expect(leaksAnswer("The proton gradient", answer)).toBe(true);
    expect(leaksAnswer("Both happen in the same organelle", answer)).toBe(false);
  });

  it("treats a plural as the same word", () => {
    expect(leaksAnswer("Setting thresholds", "the failure threshold")).toBe(true);
  });
});

describe("leaksAnswer: what is not the answer", () => {
  it("ignores the stamp a video card's answer ends with", () => {
    const answer = "失敗門檻：指標低於門檻就不通過。\n\n影片：第 4 課 評測流程（2:15）";
    expect(leaksAnswer("回顧片重提這個評測流程", answer)).toBe(false);
    expect(leaksAnswer("這支影片示範同一個做法", answer)).toBe(false);
    expect(leaksAnswer("Video walkthrough of the evaluation flow", "The failure threshold.\n\nVideo: Lesson 4 evaluation flow (2:15)")).toBe(false);
    expect(leaksAnswer("兩者都靠失敗門檻", answer)).toBe(true);
  });

  it("ignores image embeds, link targets and file names", () => {
    expect(leaksAnswer("User profile page", "See the diagram.\n![](assets/user/file-0193.png)")).toBe(false);
    expect(leaksAnswer("File upload limits", "![[assets/pipeline/file-2231.png]]\nThe gate blocks the merge.")).toBe(false);
    expect(leaksAnswer("Redis 的用法", "照[官方文件](https://example.com/redis/guide)設定失敗門檻")).toBe(false);
    expect(leaksAnswer("官方文件怎麼寫", "照[官方文件](https://example.com/redis/guide)設定失敗門檻")).toBe(true);
    expect(leaksAnswer("資料庫的種類", "見 [[資料庫/索引設計|索引設計]] 的第二節")).toBe(false);
    expect(leaksAnswer("索引設計原則", "見 [[資料庫/索引設計|索引設計]] 的第二節")).toBe(true);
  });

  it("ignores the line that opens a code block, and keeps what is in the block", () => {
    const answer = "流程如下：\n```mermaid\nflowchart LR\n  build --> evaluate --> gate\n```";
    expect(leaksAnswer("用 Mermaid 畫架構圖", answer)).toBe(false);
    expect(leaksAnswer("Evaluate 階段在做什麼", answer)).toBe(true);
  });

  it("ignores everyday words in both languages", () => {
    expect(leaksAnswer("What is the best way of doing this", "It is the failure threshold of the gate, which is set for each run")).toBe(false);
    expect(leaksAnswer("為什麼可以這樣做", "因為可以重複使用，所以比較快")).toBe(false);
    expect(leaksAnswer("兩者本質相同", "**本質**：每一層做完都審過才往下走。\n**例子**：先審腳本再審分鏡。")).toBe(false);
    expect(leaksAnswer("Another example of the same idea", "Example: the run fails when a metric drops.")).toBe(false);
  });

  it("does not count what the question already says", () => {
    expect(leaksAnswer("RNA polymerase", "RNA polymerase II", "Which RNA polymerase transcribes mRNA?")).toBe(false);
    expect(leaksAnswer("粒線體的結構", "粒線體負責產能", "粒線體的功能是什麼？")).toBe(false);
    expect(leaksAnswer("產能的過程", "粒線體負責產能", "粒線體的功能是什麼？")).toBe(true);
  });

  it("in a long answer, lets a short everyday word pass but not a marked term", () => {
    const answer = "先在本機跑一次，確認輸出沒有變，再把結果和上一版比對；如果分數掉超過門檻，就擋下這次合併並通知負責的人。";
    expect(leaksAnswer("輸出格式的規定", answer)).toBe(false);
    expect(leaksAnswer("分數怎麼算", answer)).toBe(false);
    expect(leaksAnswer("擋下這次合併的條件", answer)).toBe(true);
  });

  it("stays quiet when there is no answer to protect", () => {
    expect(leaksAnswer("anything", "")).toBe(false);
    expect(leaksAnswer("anything", "<br>")).toBe(false);
    expect(leaksAnswer("是否啟用", "是")).toBe(false);
    expect(leaksAnswer("", "失敗門檻")).toBe(false);
  });
});
