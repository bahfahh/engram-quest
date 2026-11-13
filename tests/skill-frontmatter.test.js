// A skill's frontmatter is parsed as YAML by the user's AI tool. A plain (unquoted) multi-line
// description breaks on ": ", and the tool then loads the skill without a description or not at all.
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const skillsDir = path.resolve(__dirname, "..", "skills");
const skills = fs.readdirSync(skillsDir).filter((name) => fs.existsSync(path.join(skillsDir, name, "skills.md")));

describe("skill frontmatter", () => {
  it.each(skills)("%s has a name and a description YAML can read", (name) => {
    const text = fs.readFileSync(path.join(skillsDir, name, "skills.md"), "utf8").replace(/\r\n/g, "\n");
    const frontmatter = (text.match(/^---\n([\s\S]*?)\n---\n/) || [])[1];
    expect(frontmatter).toBeTruthy();
    expect(frontmatter).toMatch(/^name: \S+$/m);
    const [, style, body] = frontmatter.match(/^description:[ \t]*([>|][+-]?)?[ \t]*(.*(?:\n[ \t]+.*)*)$/m) || [];
    expect(body && body.trim()).toBeTruthy();
    // A block scalar (> or |) may hold anything; a plain scalar may not hold ": " or end a line with ":".
    if (!style) expect(body).not.toMatch(/:(?: |$)/m);
  });
});
