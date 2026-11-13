// The Review Deck table view in a mid-width window (ticket-064). The deck name was the only column that
// could shrink while six number columns kept ~616px between them, so below that width the name column
// was zero wide and no deck could be told apart. Layout cannot be measured here, so this keeps the rules
// that drop number columns as the table narrows, and checks that every row marks those columns.
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const css = String(require("../src/styles/hub"));
const source = require("node:fs").readFileSync(require.resolve("../src/hub/review-tab.js"), "utf8");

describe("deck table at narrower widths", () => {
  it("sizes its columns from the table's own width, not inline styles", () => {
    expect(css).toMatch(/\.lh-tbl \{[^}]*container:lh-tbl \/ inline-size/);
    expect(source).not.toMatch(/grid-template-columns/);
  });

  it("drops due and new first, then total and mastered, keeping a floor for the name", () => {
    const mid = css.match(/@container lh-tbl \(max-width:760px\) \{([^\n]*)\}/);
    const narrow = css.match(/@container lh-tbl \(max-width:500px\) \{([^\n]*)\}/);
    // A px floor: header and rows have different font sizes, so an em floor would misalign them.
    expect(mid?.[1]).toMatch(/minmax\(112px,1fr\)/);
    expect(mid?.[1]).toMatch(/\.lh-tc-split \{ display:none; \}/);
    expect(narrow?.[1]).toMatch(/\.lh-tc-extra \{ display:none; \}/);
  });

  it("marks the same columns in the header and in every row", () => {
    expect(source.match(/lh-tc-split/g)).toHaveLength(4);
    expect(source.match(/lh-tc-extra/g)).toHaveLength(4);
  });
});
