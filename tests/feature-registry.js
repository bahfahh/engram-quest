// The features EngramQuest ships, and which ones need Pro. README, the Hub help,
// the first-run guides and the Pro dialog must describe exactly this list;
// tests/feature-docs.test.js checks the docs and the code against it.

module.exports = {
  // Hub tabs, in sidebar order. `pro: true` hides the tab without a licence.
  tabs: [
    { id: "review", pro: false, en: ["Review Deck"], zh: ["Review Deck"] },
    { id: "explainer", pro: true, en: ["Deep Dive"], zh: ["深入解析"] },
    { id: "memory", pro: false, en: ["Memory Map"], zh: ["Memory Map"] },
    { id: "episodic", pro: false, en: ["Recall Films"], zh: ["情境回顧"] },
    { id: "lesson", pro: false, en: ["Lesson Academy", "Lessons"], zh: ["教材"] },
    { id: "quest", pro: false, en: ["Quest Map"], zh: ["Quest Map"] },
    { id: "video", pro: false, en: ["Video Academy"], zh: ["影片學院"] },
    { id: "achievement", pro: false, en: ["Achievements"], zh: ["成就"] },
  ],
  // What Pro adds. `module` is the skill the installer only gives Pro users.
  pro: [
    { id: "anchors", module: "synapse", en: ["Synapse"], zh: ["Synapse"] },
    { id: "explain", module: "explainer", en: ["Deep Dive"], zh: ["深入解析"] },
    { id: "time", en: ["Time-boxed"], zh: ["限時複習"] },
    { id: "video", module: "episodic-review", en: ["teachers", "recall films"], zh: ["老師", "情境回顧片"] },
  ],
};
