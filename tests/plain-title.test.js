// A Synapse map node shows a card's front as one readable line (ticket-054). A front that is an image
// embed used to appear as raw `![[...]]` text, so the node did not say which card it was.
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { plainTitle } = require("../src/review/plain-title");

const EMBED = "![[../../1.領域/11.ai-coding/知識/ai cache/assets/現在主流做法/file-20260512093000.png]]";

describe("plainTitle", () => {
  it("leaves plain text as it is", () => {
    expect(plainTitle("git status 的用途？")).toBe("git status 的用途？");
  });

  it("is empty for a front that is only a picture, so the caller can name the card", () => {
    expect(plainTitle(EMBED)).toBe("");
    expect(plainTitle(`${EMBED}\n`)).toBe("");
    expect(plainTitle("![diagram](../assets/areas.png)")).toBe("");
    expect(plainTitle('<img src="a.png" width="300">')).toBe("");
  });

  it("keeps the words that come with a picture, on one line", () => {
    expect(plainTitle(`${EMBED}\n這張圖裡，哪個步驟會產生新的提交？`)).toBe("這張圖裡，哪個步驟會產生新的提交？");
    expect(plainTitle(`先看圖\n${EMBED}\n再回答`)).toBe("先看圖 再回答");
  });

  it("shows a link as its text and a wikilink as its alias or its file name", () => {
    expect(plainTitle("see [the docs](https://example.com/a/b) first")).toBe("see the docs first");
    expect(plainTitle("what is [[Git/Git 三個區域|三個區域]]?")).toBe("what is 三個區域?");
    expect(plainTitle("what is [[Git/Git 三個區域]]?")).toBe("what is Git 三個區域?");
  });

  it("drops the fence of a code block but keeps what is written inside, and a comparison sign", () => {
    expect(plainTitle("輸出是什麼？\n```js\nconsole.log(1 < 2)\n```")).toBe("輸出是什麼？ console.log(1 < 2)");
  });

  it("copes with nothing at all", () => {
    expect(plainTitle(undefined)).toBe("");
    expect(plainTitle(null)).toBe("");
  });
});
