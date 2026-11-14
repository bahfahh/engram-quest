"use strict";

/**
 * Move a vault path (file or folder) to the trash the way the user's Obsidian "Deleted files"
 * setting says. Files the vault index knows go through fileManager.trashFile, which honours that
 * setting. AI-written data (engram-quest/…) is often not indexed yet, so getAbstractFileByPath
 * returns null; those go through the adapter, trying first the trash the user chose ("system" or
 * Obsidian's .trash), then the other one.
 * Resolves true when the path is gone (an absent path counts), false when no trash method worked —
 * nothing is then deleted permanently.
 */
async function trashVaultPath(app, path) {
  const indexed = app.vault.getAbstractFileByPath(path);
  if (indexed) {
    await app.fileManager.trashFile(indexed);
    return true;
  }
  const adapter = app.vault.adapter;
  if (!(await adapter.exists(path))) return true;
  let choice = null;
  try { choice = app.vault.getConfig && app.vault.getConfig("trashOption"); } catch { /* older Obsidian */ }
  const order = choice === "local" ? [adapter.trashLocal, adapter.trashSystem] : [adapter.trashSystem, adapter.trashLocal];
  for (const trash of order) {
    if (typeof trash !== "function") continue;
    try {
      if ((await trash.call(adapter, path)) !== false) return true;
    } catch (e) { console.warn("EngramQuest: trash failed for", path, e); }
  }
  return false;
}

module.exports = { trashVaultPath };
