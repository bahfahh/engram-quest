// Which portraits and samples were synced, read from disk because the media module needs esbuild's loaders.
// Samples are inline (assets/teachers/) or in the download the picker fetches on first play.
import { readdirSync } from "node:fs";
import samplePack from "../../src/videos/teacher-samples.json";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const names = readdirSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "teachers"));
const withExt = (ext) => names.filter((n) => n.endsWith(ext)).map((n) => n.slice(0, -ext.length));

export const INLINE_SAMPLES = withExt(".mp3");
export const PREVIEWABLE = { portraits: withExt(".jpg"), samples: [...INLINE_SAMPLES, ...samplePack.ids] };
