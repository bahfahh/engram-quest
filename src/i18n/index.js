"use strict";

const DICT = {
  en: {
    LANGUAGE: "Language",
    LANGUAGE_DESC: "Choose the plugin UI language.",
    LANGUAGE_ENGLISH: "English",
    LANGUAGE_ZH_TW: "Traditional Chinese",
    LANGUAGE_SYSTEM: "Follow Obsidian",
    SETTINGS_TITLE: "EngramQuest",
    SETTINGS_APPEARANCE: "Appearance",
    SETTINGS_THEME_NAME: "Visual theme",
    SETTINGS_THEME_DESC: "Choose the EngramQuest visual style. Reopen the window to fully apply it.",
    SETTINGS_THEME_BRIGHT: "Bright Sky Island (Default)",
    SETTINGS_THEME_DARK: "Dark Mode",
    SETTINGS_THEME_MINIMAL: "Minimal",
    SETTINGS_REVIEW_DECK: "Review Deck",
    SETTINGS_FLASHCARD_TAGS_NAME: "Flashcard tag prefixes",
    SETTINGS_FLASHCARD_TAGS_DESC: "Choose which tag prefixes count as Review Deck notes. Separate multiple prefixes with spaces or new lines. Example: flashcards card azure-card. Deck name = the first segment after the prefix (flashcards/azure -> deck azure).",
    SETTINGS_SR_SCAN_NAME: "Include legacy `::` notes",
    SETTINGS_SR_SCAN_DESC: "Migration mode for existing flashcard-note users. When enabled, notes without matching flashcard tags can also become decks based on their folder name. Default: off.",
    SETTINGS_MAX_INTERVAL_NAME: "Maximum review interval (days)",
    SETTINGS_MAX_INTERVAL_DESC: "Upper bound for review intervals. After this limit, intervals stop growing. Default: 36525 (~100 years).",
    SETTINGS_RETENTION_NAME: "Target retention rate",
    SETTINGS_RETENTION_DESC: "FSRS target recall probability (0.70-0.99). Higher = more frequent reviews. Default: 0.90 (90%).",
    AGAIN: "Again",
    HARD: "Hard",
    GOOD: "Good",
    EASY: "Easy",
    RECALL: "Recall",
    SHOW_ANSWER: "Show Answer",
    TRY_AGAIN: "Try Again",
    VIEW_SOURCE_IMAGE: "View Source Image",
    OPEN_SOURCE_NOTE: "Open Source Note",
    HINT_NEXT: "Next Hint",
    NO_HINT: "No hint available",
    DAYS: "d",
    TOTAL: "Total",
    DUE: "Due Today",
    MASTERED: "Mastered",
    RATE: "Progress",
    ANSWER: "Answer",
    MEMORY_MAP: "Memory Map",
    RESET: "Reset",
    BACK: "Back",
    REVIEW_COMPLETE: "Review complete!",
    RIBBON_TOOLTIP: "EngramQuest",
    HUB_TITLE: "ENGRAM-QUEST",
    TAB_REVIEW: "Review Deck",
    TAB_MEMORY: "Memory Map",
    TAB_QUEST: "Quest Map",
    STUDY_ALL: "Review Ready",
    HELP_TITLE: "EngramQuest Guide",
    HELP_OPEN: "Open help",
    HUB_CLOSE: "Close",
    SEARCH_REVIEW: "Search decks...",
    SEARCH_MEMORY: "Search memory maps...",
    SEARCH_QUEST: "Search quests...",
    FILTER_ALL: "All",
    FILTER_DUE: "Due",
    FILTER_NEW: "New",
    FILTER_DONE: "Done",
    READY: "Ready",
    READY_HELP: "Ready = due + new. Total = every card stored in the deck.",
    READY_NOW: "Ready now",
    NOTHING_READY: "Nothing ready",
    ALL_SCHEDULED: "All {total} cards are scheduled for later.",
    BROWSE_ALL: "Browse all",
    BROWSE_ONLY: "Browse only",
    BROWSE_NOTE: "Browse mode does not change scheduling.",
    PREVIOUS: "Previous",
    NEXT: "Next",
    BACK_TO_QUESTION: "Back to question",
    FILTER_ALL_TAGS: "All tags",
    FILTER_ALL_DIFFICULTIES: "All difficulties",
    DIFF_EASY: "Easy",
    DIFF_MEDIUM: "Medium",
    DIFF_HARD: "Hard",
    EMPTY_DECKS: "No flashcard decks found.\nAsk AI to generate a Review Deck, or add matching flashcard tags in Settings.",
    EMPTY_FILTERED_DECKS: "No decks match the current filters.",
    EMPTY_MEMORIES: "No memory maps found.\nAsk AI to generate a -memory.canvas file first.",
    EMPTY_FILTERED_MEMORIES: "No memory maps match the current filters.",
    EMPTY_QUESTS: "No quest maps found.\nAsk AI to generate a -quest.md file first.",
    EMPTY_FILTERED_QUESTS: "No quests match the current filters.",
    OPEN_MAP: "Open Map",
    OPEN_QUEST: "Open Quest",
    CATEGORY: "Style",
    COUNT_UNIT: "items",
    CARD_COUNT_UNIT: "cards",
    MASTERY_RATE: "{percent}% mastered",
    NO_CARDS_TO_REVIEW: "No cards are ready to review.",
    NO_READY_IN_DECK: '"{deck}" has {total} cards, but none are due or new right now.',
    HELP_REVIEW_TAG: "Long-term memory",
    HELP_QUEST_TAG: "Structured learning",
    HELP_MEMORY_TAG: "Deep understanding",
    HELP_SCIENCE_TAG: "Why it works",
    HELP_SETTINGS_TAG: "Customize",
    HELP_AI_TAG: "AI shortcuts",
    HELP_FAQ_TAG: "FAQ",
    HELP_AI_SETUP_TAG: "AI setup",
    SETTINGS_AI_SKILLS: "AI Skills",
    SETTINGS_AI_SKILLS_DESC: "Install project-local skills or rules for Claude Code, Codex, Gemini CLI, and Cursor. Files stay inside this vault and never write to user-scope folders.",
    SETTINGS_AI_SKILLS_BUTTON: "Install skills",
    SKILLS_INSTALL_TITLE: "Install EngramQuest skills",
    SKILLS_INSTALL_DESC: "Choose an AI tool. The plugin installs project-local files for quest-map, review-deck, and memory-map.",
    SKILLS_INSTALL_PROJECT_LOCAL: "These files only work when you open the AI tool from this vault.",
    SKILLS_STATUS_NOT_INSTALLED: "Not installed",
    SKILLS_STATUS_INSTALLED: "Installed",
    SKILLS_STATUS_UPDATE: "Update available",
    SKILLS_PREVIEW_BUTTON: "Review install",
    SKILLS_PREVIEW_TITLE: "Review file changes",
    SKILLS_PREVIEW_DESC: "Only EngramQuest managed files will be created or replaced.",
    SKILLS_ACTION_CREATE: "create",
    SKILLS_ACTION_REPLACE: "replace",
    SKILLS_ACTION_UNCHANGED: "unchanged",
    SKILLS_CONFIRM_INSTALL: "Install now",
    SKILLS_INSTALL_DONE: "EngramQuest skills installed for {tool}.",
    SKILLS_NEXT_STEP: "Next step: open {tool} from this vault folder.",
    SKILLS_TOOL_CLAUDE: "Claude Code",
    SKILLS_TOOL_CODEX: "Codex",
    SKILLS_TOOL_GEMINI: "Gemini CLI",
    SKILLS_TOOL_CURSOR: "Cursor",
    SKILLS_TARGET_PATH: "Target path",
    SKILLS_MODULES: "Modules",
    SKILLS_MODAL_LOADING: "Checking installed status...",
    SKILLS_AI_SETUP_TITLE: "AI setup",
    SKILLS_AI_SETUP_COPY: "Use Settings -> Install skills to add project-local instructions for Claude Code, Codex, Gemini CLI, or Cursor. Run the tool from this vault so it can see the installed files.",
    SETTINGS_AUTO_UPDATE_SKILLS_NAME: "Auto update installed skills",
    SETTINGS_AUTO_UPDATE_SKILLS_DESC: "If EngramQuest already installed managed skills or rules in this vault, update them automatically when the plugin loads.",
  },
  "zh-tw": {
    LANGUAGE: "語言",
    LANGUAGE_DESC: "選擇插件介面語言。",
    LANGUAGE_ENGLISH: "English",
    LANGUAGE_ZH_TW: "繁體中文",
    LANGUAGE_SYSTEM: "跟隨 Obsidian",
    SETTINGS_TITLE: "EngramQuest",
    SETTINGS_APPEARANCE: "外觀",
    SETTINGS_THEME_NAME: "視覺主題",
    SETTINGS_THEME_DESC: "選擇 EngramQuest 的視覺風格。若要完整套用，請重新開啟視窗。",
    SETTINGS_THEME_BRIGHT: "Bright Sky Island（預設）",
    SETTINGS_THEME_DARK: "深色模式",
    SETTINGS_THEME_MINIMAL: "極簡",
    SETTINGS_REVIEW_DECK: "Review Deck",
    SETTINGS_FLASHCARD_TAGS_NAME: "Flashcard tag 前綴",
    SETTINGS_FLASHCARD_TAGS_DESC: "設定哪些 tag 前綴會被視為 Review Deck 筆記。可用空白或換行分隔多個前綴，例如 flashcards card azure-card。Deck 名稱會取前綴後的第一段，例如 flashcards/azure 會歸到 deck azure。",
    SETTINGS_SR_SCAN_NAME: "納入舊版 `::` 筆記",
    SETTINGS_SR_SCAN_DESC: "提供給既有 flashcard 筆記使用者的相容模式。開啟後，即使沒有符合 tag 的筆記，也能依資料夾名稱納入 deck。預設關閉。",
    SETTINGS_MAX_INTERVAL_NAME: "最大複習間隔（天）",
    SETTINGS_MAX_INTERVAL_DESC: "複習間隔的上限。超過這個值後，間隔不再繼續成長。預設 36525（約 100 年）。",
    SETTINGS_RETENTION_NAME: "目標保留率",
    SETTINGS_RETENTION_DESC: "FSRS 目標回想率（0.70-0.99）。數值越高，複習越頻繁。預設 0.90（90%）。",
    AGAIN: "重來",
    HARD: "困難",
    GOOD: "普通",
    EASY: "簡單",
    RECALL: "回想",
    SHOW_ANSWER: "顯示答案",
    TRY_AGAIN: "再試一次",
    VIEW_SOURCE_IMAGE: "查看來源圖片",
    OPEN_SOURCE_NOTE: "開啟來源筆記",
    HINT_NEXT: "下一個提示",
    NO_HINT: "沒有可用提示",
    DAYS: "天",
    TOTAL: "總數",
    DUE: "今日到期",
    MASTERED: "已掌握",
    RATE: "進度",
    ANSWER: "答案",
    MEMORY_MAP: "Memory Map",
    RESET: "重設",
    BACK: "返回",
    REVIEW_COMPLETE: "複習完成！",
    RIBBON_TOOLTIP: "EngramQuest",
    HUB_TITLE: "ENGRAM-QUEST",
    TAB_REVIEW: "Review Deck",
    TAB_MEMORY: "Memory Map",
    TAB_QUEST: "Quest Map",
    STUDY_ALL: "複習已就緒卡片",
    HELP_TITLE: "EngramQuest 指南",
    HELP_OPEN: "開啟說明",
    HUB_CLOSE: "關閉",
    SEARCH_REVIEW: "搜尋複習牌組...",
    SEARCH_MEMORY: "搜尋記憶地圖...",
    SEARCH_QUEST: "搜尋任務地圖...",
    FILTER_ALL: "全部",
    FILTER_DUE: "到期",
    FILTER_NEW: "新卡",
    FILTER_DONE: "已完成",
    READY: "可複習",
    READY_HELP: "可複習 = 到期 + 新卡。總數 = deck 內所有卡片。",
    READY_NOW: "現在可複習",
    NOTHING_READY: "目前沒有可複習卡片",
    ALL_SCHEDULED: "全部 {total} 張卡片都排在之後。",
    BROWSE_ALL: "瀏覽全部",
    BROWSE_ONLY: "僅瀏覽",
    BROWSE_NOTE: "瀏覽模式不會改變排程。",
    PREVIOUS: "上一張",
    NEXT: "下一張",
    BACK_TO_QUESTION: "回到題目",
    FILTER_ALL_TAGS: "全部標籤",
    FILTER_ALL_DIFFICULTIES: "全部難度",
    DIFF_EASY: "簡單",
    DIFF_MEDIUM: "普通",
    DIFF_HARD: "困難",
    EMPTY_DECKS: "找不到 flashcard decks。\n請先讓 AI 產生 Review Deck，或在設定中填入符合的 flashcard tags。",
    EMPTY_FILTERED_DECKS: "目前篩選條件下沒有 decks。",
    EMPTY_MEMORIES: "找不到 memory maps。\n請先讓 AI 產生 -memory.canvas 檔案。",
    EMPTY_FILTERED_MEMORIES: "目前篩選條件下沒有 memory maps。",
    EMPTY_QUESTS: "找不到 Quest Maps。\n請先讓 AI 產生 -quest.md 檔案。",
    EMPTY_FILTERED_QUESTS: "目前篩選條件下沒有 quests。",
    OPEN_MAP: "開啟地圖",
    OPEN_QUEST: "開啟任務",
    CATEGORY: "風格",
    COUNT_UNIT: "個",
    CARD_COUNT_UNIT: "張卡",
    MASTERY_RATE: "已掌握 {percent}%",
    NO_CARDS_TO_REVIEW: "目前沒有可複習卡片。",
    NO_READY_IN_DECK: "「{deck}」共有 {total} 張卡，但目前沒有到期或新卡。",
    HELP_REVIEW_TAG: "長期記憶",
    HELP_QUEST_TAG: "結構化學習",
    HELP_MEMORY_TAG: "深度理解",
    HELP_SCIENCE_TAG: "原理",
    HELP_SETTINGS_TAG: "自訂",
    HELP_AI_TAG: "AI 快捷方式",
    HELP_FAQ_TAG: "FAQ",
    HELP_AI_SETUP_TAG: "AI 設定",
    SETTINGS_AI_SKILLS: "AI Skills",
    SETTINGS_AI_SKILLS_DESC: "安裝給 Claude Code、Codex、Gemini CLI、Cursor 用的專案內技能或規則。這些檔案只會留在目前 vault，不會寫到使用者全域資料夾。",
    SETTINGS_AI_SKILLS_BUTTON: "安裝 skills",
    SKILLS_INSTALL_TITLE: "安裝 EngramQuest skills",
    SKILLS_INSTALL_DESC: "選擇一個 AI 工具。插件會安裝 quest-map、review-deck、memory-map 的專案內檔案。",
    SKILLS_INSTALL_PROJECT_LOCAL: "這些檔案只在你從這個 vault 開啟 AI 工具時生效。",
    SKILLS_STATUS_NOT_INSTALLED: "未安裝",
    SKILLS_STATUS_INSTALLED: "已安裝",
    SKILLS_STATUS_UPDATE: "可更新",
    SKILLS_PREVIEW_BUTTON: "預覽安裝內容",
    SKILLS_PREVIEW_TITLE: "預覽檔案變更",
    SKILLS_PREVIEW_DESC: "只會建立或取代 EngramQuest 管理的檔案。",
    SKILLS_ACTION_CREATE: "建立",
    SKILLS_ACTION_REPLACE: "取代",
    SKILLS_ACTION_UNCHANGED: "不變",
    SKILLS_CONFIRM_INSTALL: "立即安裝",
    SKILLS_INSTALL_DONE: "已為 {tool} 安裝 EngramQuest skills。",
    SKILLS_NEXT_STEP: "下一步：請從這個 vault 資料夾啟動 {tool}。",
    SKILLS_TOOL_CLAUDE: "Claude Code",
    SKILLS_TOOL_CODEX: "Codex",
    SKILLS_TOOL_GEMINI: "Gemini CLI",
    SKILLS_TOOL_CURSOR: "Cursor",
    SKILLS_TARGET_PATH: "目標路徑",
    SKILLS_MODULES: "模組",
    SKILLS_MODAL_LOADING: "正在檢查安裝狀態...",
    SKILLS_AI_SETUP_TITLE: "AI 設定",
    SKILLS_AI_SETUP_COPY: "請到設定中的 Install skills，為 Claude Code、Codex、Gemini CLI 或 Cursor 加入專案內指令。之後要從這個 vault 啟動工具，才能讀到這些檔案。",
    SETTINGS_AUTO_UPDATE_SKILLS_NAME: "自動更新已安裝的 skills",
    SETTINGS_AUTO_UPDATE_SKILLS_DESC: "如果這個 vault 已安裝由 EngramQuest 管理的 skills 或 rules，插件載入時會自動更新。",
  },
};

/**
 * Normalize a raw language string to a supported locale key.
 * @param {string} lang
 * @returns {"en"|"zh-tw"|"system"}
 */
function normalizeLocale(lang) {
  const s = String(lang || "").toLowerCase();
  if (s === "system") return "system";
  if (s.startsWith("zh")) return "zh-tw";
  if (DICT[s]) return s;
  return "en";
}

/**
 * Resolve the active locale from a settings object.
 * Pass `momentLocale` (string) to support system-locale detection without
 * importing moment directly (keeps this module free of Obsidian deps).
 * @param {object|null} settings
 * @param {string} [momentLocale]
 * @returns {"en"|"zh-tw"}
 */
function getLocale(settings, momentLocale) {
  const raw = normalizeLocale((settings && settings.language) || "en");
  if (raw !== "system") return raw;
  return normalizeLocale(momentLocale || "en");
}

/**
 * Interpolate `{key}` placeholders in a string.
 * @param {string} str
 * @param {object|null} vars
 * @returns {string}
 */
function interpolate(str, vars) {
  if (!vars) return str;
  return String(str).replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v != null ? v : `{${k}}`;
  });
}

/**
 * Translate a key using the settings locale.
 * @param {object|null} settings
 * @param {string} key
 * @param {object|null} [vars]
 * @param {string} [momentLocale]
 * @returns {string}
 */
function t(settings, key, vars, momentLocale) {
  const locale = getLocale(settings, momentLocale);
  const raw = (DICT[locale] || DICT.en)[key] ?? DICT.en[key] ?? key;
  return interpolate(raw, vars);
}

/**
 * Alternate arg order: t(key, settings, vars) — kept for back-compat.
 */
function tAlt(key, settings, vars, momentLocale) {
  return t(settings, key, vars, momentLocale);
}

module.exports = { DICT, normalizeLocale, getLocale, interpolate, t, tAlt };
