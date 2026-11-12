"use strict";
// Light-mode primary-button palette (ADR-09 in doc/features/video-academy/ADR.md): soft violet #6D5BD0,
// hover #5B48B8, white text. Dark mode keeps its indigo buttons; the Boss button is untouched.
// !important is required: Obsidian's own button rules (and some inline styles) out-rank plain
// class selectors, which is how "Continue mission" ended up with dark text on a violet fill.

module.exports = `
body:not(.theme-dark) .lh-subtab.active,
body:not(.theme-dark) .lh-review-tab.active,
body:not(.theme-dark) .lh-quest-open-primary,
body:not(.theme-dark) .lh-pill-recall,
body:not(.theme-dark) .lh-edit-save-btn,
body:not(.theme-dark) .lh-btn-primary { background:#6D5BD0 !important; border-color:#6D5BD0 !important; color:#ffffff !important; }
body:not(.theme-dark) .lh-subtab.active:hover,
body:not(.theme-dark) .lh-review-tab.active:hover,
body:not(.theme-dark) .lh-quest-open-primary:hover,
body:not(.theme-dark) .lh-pill-recall:hover,
body:not(.theme-dark) .lh-edit-save-btn:hover,
body:not(.theme-dark) .lh-btn-primary:hover { background:#5B48B8 !important; border-color:#5B48B8 !important; color:#ffffff !important; }
body:not(.theme-dark) .lh-review-tab.active,
body:not(.theme-dark) .lh-quest-open-primary,
body:not(.theme-dark) .lh-pill-recall,
body:not(.theme-dark) .lh-edit-save-btn { box-shadow:0 4px 12px rgba(109,91,208,.28) !important; }
.theme-dark .lh-btn-primary { background:#5B5BD6 !important; border-color:#5B5BD6 !important; color:#ffffff !important; }
.theme-dark .lh-btn-primary:hover { background:#6C6CE0 !important; border-color:#6C6CE0 !important; }
.theme-dark .lh-quest-open-primary { color:#ffffff !important; }
`;
