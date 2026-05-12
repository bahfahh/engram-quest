import Module from "node:module";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const obsidianMock = require("./__mocks__/obsidian.cjs");
const originalLoad = Module._load;

Module._load = function loadWithObsidianMock(request, parent, isMain) {
  if (request === "obsidian") return obsidianMock;
  return originalLoad.call(this, request, parent, isMain);
};
