"use strict";
// Would showing this text give part of a card's answer away? Pure; used by the Synapse map, which
// can be opened before the answer is shown (src/review/synapse-graph.js).
//
// Both texts are read the way a person reads them: markup, link targets, file names and the stamp
// a video card's answer ends with are dropped, and so are everyday words. What is left is compared
// term by term, in both directions, so a text that names one part of a long answer is caught as
// well as an answer quoted whole. Latin words are compared as whole words; CJK text has no word
// breaks, so it is compared as runs of characters. Whatever the question itself already says is
// not a secret. Where the two pull apart, this errs on the side of hiding.

// The line a card made from a video ends with (src/videos/rewatch.js reads the time from it).
const VIDEO_STAMP = /^[ \t]*(?:影片|video)[ \t]*[:：].*[（(]\d+:\d{2}[)）][ \t]*$/gim;
const FILE_NAME = /[^\s()[\]]+\.(?:png|jpe?g|gif|webp|svg|bmp|avif|mp4|webm|mp3|wav|pdf|md|canvas|html)\b/gi;
// Han, kana and hangul letters; CJK punctuation (「」。、) sits between these ranges and ends a run.
const CJK = "\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\u3041-\\u3096\\u30a1-\\u30fa\\u30fc\\uac00-\\ud7af";
const CJK_RUN = new RegExp(`[${CJK}]+`, "g");
const SPACE_INSIDE_CJK = new RegExp(`([${CJK}])\\s+(?=[${CJK}])`, "g");

// Words that carry no part of an answer. Kept to function words and the labels answers are
// organised under; a domain word is never listed, however common it is in one vault.
const STOP_WORDS = new Set((
  "a an the this that these those it its is are was were be been being am do does did done doing have has had having " +
  "and or but nor so yet if then than else when while where which who whom whose what why how " +
  "of in on at by for from to into onto with without within about over under between through during before after above below " +
  "not no yes can could may might must shall should will would " +
  "i you he she we they me him her us them my your his our their one two three first second next last " +
  "all any both each every few many more most much other some such only own same too very just also still even again " +
  "there here up down out off as per via vs etc eg ie " +
  "use uses used using make makes made get gets got set sets put take takes way ways thing things " +
  "example examples note notes summary definition answer question because since both another"
).split(" "));
const STOP_PHRASES = (
  "為什麼 是什麼 什麼 怎麼樣 怎麼 如何 哪些 哪個 哪裡 多少 是否 是不是 有沒有 能不能 可不可以 " +
  "因為 所以 如果 那麼 但是 可是 不過 然後 接著 而且 並且 以及 或者 或是 還是 就是 也是 只是 而是 不是 不會 不能 不要 不用 沒有 " +
  "可以 可能 應該 必須 需要 能夠 已經 還有 只有 只要 一定 比較 非常 一樣 一些 一個 一種 一下 一起 這個 那個 這些 那些 這樣 那樣 這種 那種 這裡 那裡 " +
  "我們 你們 他們 它們 自己 大家 時候 情況 例如 比如 像是 包括 包含 使用 進行 透過 通過 根據 對於 關於 至於 " +
  "首先 最後 之後 之前 以後 以前 同時 另外 此外 其中 其實 當然 目前 現在 一開始 " +
  "本質 例子 重點 定義 原因 結果 做法 步驟 注意 補充 說明 總結 結論 用途 好處 壞處 優點 缺點 差別 差異 " +
  // Simplified forms of the same words
  "为什么 是什么 什么 怎么样 怎么 这个 那个 这些 那些 这样 那样 这种 那种 这里 那里 因为 如果 那么 但是 然后 而且 并且 还是 没有 应该 必须 已经 还有 时候 情况 我们 你们 他们 它们 进行 通过 根据 对于 关于 本质 重点 定义 结果 步骤 补充 说明 总结 结论 好处 坏处 优点 缺点 差别 差异"
).split(" ");
const FUNCTION_CHARS = "的了是在和與与或及就都也而但把被嗎吗呢吧啊著着這这那很們们個个些於于之";
const STOP_CJK = new RegExp(`${[...STOP_PHRASES].sort((a, b) => b.length - a.length).join("|")}|[${FUNCTION_CHARS}]`, "g");

const SHORT_ANSWER = 3; // an answer of this many terms or fewer: each of them is the answer
const WORD = 5;         // a shared Latin word this long counts on its own
const ACRONYM = 3;      // so does a shared abbreviation this long (RNA, TCP); AI, ID, DB are in every other card
const RUN = 4;          // a shared run of this many CJK characters counts on its own

/** The text as a reader takes it in: no markup, no link targets or file names, no video stamp. */
function readable(text) {
  return String(text || "")
    .replace(VIDEO_STAMP, "\n")
    .replace(/^[ \t]*(?:`{3,}|~{3,}).*$/gm, "\n") // the fence around a code block, with its language name
    .replace(/<[^>]*>/g, "\n")
    .replace(/&#?[a-z0-9]+;/gi, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)|!\[\[[^\]]*\]\]/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_, target, alias) => ` ${alias || target.split("/").pop()} `)
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(FILE_NAME, " ")
    .normalize("NFKC");
}

/**
 * words  Latin words and numbers in order, without everyday words: { word, acronym }
 * runs   stretches of CJK characters between punctuation, everyday words and function characters
 */
function termsOf(text) {
  const plain = readable(text);
  const words = [];
  for (const [raw] of plain.matchAll(/[A-Za-z0-9]+/g)) {
    let word = raw.toLowerCase();
    // A plural reads as its singular. Applied to both texts alike, so an odd result ("basi") still matches itself.
    if (word.length > 3 && word.endsWith("s") && !/(?:ss|us)$/.test(word)) word = word.slice(0, -1);
    if (word.length < 2 || STOP_WORDS.has(word)) continue;
    words.push({ word, acronym: /[A-Z]/.test(raw) && raw === raw.toUpperCase() });
  }
  const runs = [];
  for (const [stretch] of plain.replace(SPACE_INSIDE_CJK, "$1").matchAll(CJK_RUN)) {
    for (const run of stretch.replace(STOP_CJK, " ").split(" ")) if (run.length >= 2) runs.push(run);
  }
  return { words, runs, count: new Set(words.map((w) => w.word)).size + runs.length };
}

/** The shared term that gives the answer away, or null. */
function leakingTerm(text, answer, question = "") {
  const secret = termsOf(answer);
  if (!secret.count) return null;
  const shown = termsOf(text);
  const asked = termsOf(question);
  const short = secret.count <= SHORT_ANSWER;

  // Latin: a shared word counts when it is long, an abbreviation of three letters or more, one of
  // a short answer's few words, or the second of two shared words in a row.
  const acronyms = new Map();
  for (const { word, acronym } of secret.words) acronyms.set(word, acronym || acronyms.get(word) || false);
  const known = new Set(asked.words.map((w) => w.word));
  let previous = false;
  for (const { word, acronym } of shown.words) {
    const shared = acronyms.has(word) && !known.has(word);
    const abbreviation = (acronym || acronyms.get(word)) && word.length >= ACRONYM;
    if (shared && (short || previous || abbreviation || word.length >= WORD)) return word;
    previous = shared;
  }

  // CJK: a shared run of four characters counts; a shorter one only when it is a whole term on
  // one side (three characters, or two when the answer is short).
  const said = asked.runs.join(" ");
  const whole = short ? 2 : 3;
  const pieces = new Set();
  for (const run of secret.runs) {
    for (let size = whole; size <= RUN; size++) for (let i = 0; i + size <= run.length; i++) pieces.add(run.slice(i, i + size));
  }
  const secretTerms = secret.runs.filter((run) => run.length < RUN && run.length >= whole);
  for (const run of shown.runs) {
    if (run.length < RUN && run.length >= whole && pieces.has(run) && !said.includes(run)) return run;
    for (let i = 0; i + RUN <= run.length; i++) {
      const piece = run.slice(i, i + RUN);
      if (pieces.has(piece) && !said.includes(piece)) return piece;
    }
    const inside = secretTerms.find((term) => run.includes(term) && !said.includes(term));
    if (inside) return inside;
  }
  return null;
}

function leaksAnswer(text, answer, question = "") {
  return leakingTerm(text, answer, question) !== null;
}

module.exports = { leaksAnswer, leakingTerm, termsOf };
