// Which portraits and samples were synced, read from disk because the media module needs esbuild's loaders.
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const names = readdirSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "teachers"));
const withExt = (ext) => names.filter((n) => n.endsWith(ext)).map((n) => n.slice(0, -ext.length));

export const PREVIEWABLE = { portraits: withExt(".jpg"), samples: withExt(".mp3") };
