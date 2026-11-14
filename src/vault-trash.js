"use strict";

/**
 * Move a vault path (file or folder) to the trash the way the user's Obsidian "Deleted files"
 * setting says. Files the vault index knows go through fileManager.trashFile, which honours that
 * setting. AI-written data (engram-quest/…) is often not indexed yet, so getAbstractFileByPath
 * returns null; those go through the adapter: OS trash, then the vault-local .trash.
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
  for (const trash of [adapter.trashSystem, adapter.trashLocal]) {
    if (typeof trash !== "function") continue;
    try {
      if ((await trash.call(adapter, path)) !== false) return true;
    } catch (e) { console.warn("EngramQuest: trash failed for", path, e); }
  }
  return false;
}

module.exports = { trashVaultPath };
