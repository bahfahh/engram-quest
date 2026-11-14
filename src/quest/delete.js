"use strict";

const { trashVaultPath } = require("../vault-trash");
const { questStatePath } = require("./state");

// The plugin-owned progress file of a quest (engram-quest/state/…). It is written through the
// adapter, so the vault index may not know it yet — trashVaultPath covers both cases.
async function trashQuestProgress(app, stateKey) {
  const path = questStatePath(stateKey);
  if (!(await trashVaultPath(app, path))) throw new Error(`could not move ${path} to the trash`);
}

// Hub "delete" for a quest map package: its folder, then its progress file, so a map later
// created under the same slug does not inherit the old progress. Throws when either cannot be trashed.
async function deleteQuestPackage(app, item) {
  const dir = `engram-quest/quests/${item.slug}`;
  if (!(await trashVaultPath(app, dir))) throw new Error(`could not move ${dir} to the trash`);
  await trashQuestProgress(app, item.stateKey || dir);
}

module.exports = { deleteQuestPackage, trashQuestProgress };
