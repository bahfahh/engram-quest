// Subtitles on the player page (ticket-042). In Obsidian the Hub page is app://obsidian.md and a
// vault file's resource URL is app://<id>/…: another origin. A <video> may play from there, but the
// browser fetches a <track> same-origin only, so a subtitle file attached by its resource URL is
// blocked and nothing shows. The page is drawn here the way both Video Academy and Recall Films draw
// it (tests/helpers/player-page.js), on a vault whose resource URLs are on that other origin.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveObjectURL } from "node:buffer";
import { VAULT_ORIGIN, VTT, drawn, drawPlayer, vault } from "./helpers/player-page.js";

const tracks = (root) => drawn(root).filter((el) => el.tag === "track");

describe("player subtitles", () => {
  let revoke;
  beforeEach(() => {
    revoke = vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("gives the track the file's text on the page's own origin, never the vault resource URL", async () => {
    const body = await drawPlayer(vault());
    const [track] = tracks(body);
    expect(track, "a video with subtitles gets a track").toBeTruthy();
    expect(track.attrs.kind).toBe("subtitles");
    expect(track.attrs.src.startsWith(VAULT_ORIGIN)).toBe(false);
    expect(track.attrs.src.startsWith("blob:")).toBe(true);
    const blob = resolveObjectURL(track.attrs.src);
    expect(blob.type).toBe("text/vtt");
    expect(await blob.text()).toBe(VTT);
  });

  it("starts with subtitles showing", async () => {
    const [track] = tracks(await drawPlayer(vault()));
    expect(track.track.mode).toBe("showing");
  });

  it("starts with subtitles off when Video settings say so, and keeps the track for the player's own menu", async () => {
    const [track] = tracks(await drawPlayer(vault({ settings: { subtitles: false } })));
    expect(track.track.mode).toBe("hidden");
  });

  it("releases the Blob URL once the browser has read the cues, or failed to", async () => {
    for (const outcome of ["load", "error"]) {
      revoke.mockClear();
      const [track] = tracks(await drawPlayer(vault()));
      expect(revoke).not.toHaveBeenCalled();
      track.fire(outcome);
      expect(revoke.mock.calls).toEqual([[track.attrs.src]]);
    }
  });

  it("makes no Blob URL for a player that left the page while the file was being read", async () => {
    const create = vi.spyOn(URL, "createObjectURL");
    let video;
    await drawPlayer(vault(), { whileReading: (body) => { video = drawn(body).find((el) => el.tag === "video"); video.remove(); } });
    expect(create).not.toHaveBeenCalled();
    expect(video.children).toEqual([]);
  });

  it("plays without a track when the subtitle file is not on this device", async () => {
    const body = await drawPlayer(vault({ vtt: null }));
    expect(tracks(body)).toEqual([]);
    expect(drawn(body).some((el) => el.tag === "video")).toBe(true);
  });

  it("reads no subtitle file for a video that has none (recall films)", async () => {
    const adapter = vault({ subtitles: null });
    const body = await drawPlayer(adapter);
    expect(tracks(body)).toEqual([]);
    expect(adapter.reads.filter((path) => path.endsWith(".vtt"))).toEqual([]);
  });
});
