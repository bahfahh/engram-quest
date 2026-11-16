// Recall film order on the Recall tab: a newly made film must come first by default, and grouping by
// period ranks a period by the month it reaches, so "2026-07..2026-11" is not buried under "2026-08".
import { describe, it, expect } from "vitest";
import { sortFilms, cardPeriod, watchState } from "../src/videos/episodic-order.js";

const films = [
  { id: "aug-long", period: "2026-08", createdAt: "2026-11-01T17:51:37Z" },
  { id: "aug-wall", period: "2026-08", createdAt: "2026-11-01T07:47:13Z" },
  { id: "jul-nov-a", period: "2026-07..2026-11", createdAt: "2026-11-16T13:26:32Z" },
  { id: "jul-nov-b", period: "2026-07..2026-11", createdAt: "2026-11-16T13:30:26Z" },
  { id: "nov", period: "2026-11", createdAt: "2026-11-13T09:31:54Z" },
  { id: "may-jul", period: "2026-05..2026-07", createdAt: "2026-10-31T08:10:09Z" },
];
const meta = { progress: { "aug-wall": { lastViewed: "2026-11-15T00:00:00Z" }, nov: { lastViewed: "2026-11-10T00:00:00Z" } } };
const ids = (sort) => sortFilms(films, meta, sort).map((f) => f.id);

describe("recall film order", () => {
  it("puts the newest made film first by default", () => {
    expect(ids("newest")).toEqual(["jul-nov-b", "jul-nov-a", "nov", "aug-long", "aug-wall", "may-jul"]);
    expect(ids("oldest")).toEqual(["may-jul", "aug-wall", "aug-long", "nov", "jul-nov-a", "jul-nov-b"]);
  });

  it("groups by the month a period reaches, the later start first when they end together", () => {
    expect(ids("period")).toEqual(["nov", "jul-nov-b", "jul-nov-a", "aug-long", "aug-wall", "may-jul"]);
  });

  it("buckets a film by watch state: finished beats a saved position, an opened but unplayed film is new", () => {
    const m = { progress: { a: { completed: true, position: 30 }, b: { position: 12 }, c: { position: 0, lastViewed: "2026-11-01T00:00:00Z" } } };
    expect(["a", "b", "c", "d"].map((id) => watchState(m, { id }))).toEqual(["done", "watching", "new", "new"]);
  });

  it("keeps films with no period or no date in the list, last", () => {
    const loose = [{ id: "dated", period: "2026-10", createdAt: "2026-11-01T00:00:00Z" }, { id: "bare" }];
    expect(sortFilms(loose, {}, "newest").map((f) => f.id)).toEqual(["dated", "bare"]);
    expect(sortFilms(loose, {}, "period").map((f) => f.id)).toEqual(["dated", "bare"]);
  });

  it("shortens a same-year range on a card and keeps a range across years whole", () => {
    expect(cardPeriod("2026-07..2026-11")).toBe("2026-07–11");
    expect(cardPeriod("2025-11..2026-02")).toBe("2025-11–2026-02");
    expect(cardPeriod("2026-08")).toBe("2026-08");
  });

  it("lists recently watched films first, the unwatched after them newest first", () => {
    expect(ids("watched")).toEqual(["aug-wall", "nov", "jul-nov-b", "jul-nov-a", "aug-long", "may-jul"]);
  });
});
