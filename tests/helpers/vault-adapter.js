// An in-memory stand-in for `app.vault.adapter`: a flat { path: text } map with folders implied by
// the paths. It has no write methods on purpose (the code under test must only read), keeps a log of
// what was read and listed, and records how many reads were ever in flight at once.
export function vaultAdapter(files = {}) {
  const under = (dir) => Object.keys(files).filter((p) => p.startsWith(dir + "/"));
  const adapter = {
    files,
    reads: [],
    lists: [],
    maxInFlight: 0,
    failList: new Set(), // folders whose listing throws although they exist
    async exists(p) { return p in files || under(p).length > 0; },
    async read(p) {
      adapter.reads.push(p);
      adapter.inFlight = (adapter.inFlight || 0) + 1;
      adapter.maxInFlight = Math.max(adapter.maxInFlight, adapter.inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      adapter.inFlight--;
      if (!(p in files)) throw new Error(`ENOENT ${p}`);
      return files[p];
    },
    async list(dir) {
      adapter.lists.push(dir);
      if (adapter.failList.has(dir)) throw new Error(`EIO ${dir}`);
      const rest = under(dir).map((p) => p.slice(dir.length + 1));
      if (!rest.length) throw new Error(`ENOENT ${dir}`);
      return {
        files: rest.filter((r) => !r.includes("/")).map((r) => `${dir}/${r}`),
        folders: [...new Set(rest.filter((r) => r.includes("/")).map((r) => `${dir}/${r.split("/")[0]}`))],
      };
    },
  };
  return adapter;
}

export const json = (value) => JSON.stringify(value);
