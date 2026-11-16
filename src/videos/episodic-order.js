"use strict";
// Order and watch state of recall films on the Recall tab (src/videos/episodic.js). Kept apart from the
// tab so the ordering rules can be tested without the player and its assets.

const data = require("./data");

const periodOf = (video) => video.period || String(video.createdAt || "").slice(0, 7);
const byNewest = (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
// "2026-07..2026-11" ends in 2026-11: a period ranks by the month it reaches, then by where it starts.
const periodEnd = (period) => period.split("..").pop();
const byPeriod = (a, b) => periodEnd(b).localeCompare(periodEnd(a)) || b.localeCompare(a);
// On a card: "2026-07–11" when both ends share a year, so a range fits a phone-width card.
const cardPeriod = (period) => String(period || "").replace(/^(\d{4})-(\d{2})\.\.\1-(\d{2})$/, "$1-$2–$3").replace("..", "–");

/** Films latest period first (by the month it reaches); one period can hold several films, newest made first. */
function groupByPeriod(films) {
  const groups = new Map();
  for (const film of films) {
    const key = periodOf(film);
    groups.set(key, [...(groups.get(key) || []), film]);
  }
  return [...groups].sort(([a], [b]) => byPeriod(a, b)).map(([period, list]) => ({ period, films: list.sort(byNewest) }));
}

/** The films in the chosen order; "period" is the grouped order flattened. */
function sortFilms(films, meta, sort) {
  if (sort === "period") return groupByPeriod(films).flatMap((group) => group.films);
  const list = [...films].sort(byNewest);
  if (sort === "oldest") return list.reverse();
  if (sort === "watched") {
    const seen = (f) => String(data.videoProgress(meta, f.id).lastViewed || "");
    return list.sort((a, b) => seen(b).localeCompare(seen(a)));
  }
  return list;
}

/** "done" | "watching" | "new", the same buckets as the Video Academy shelf. */
function watchState(meta, film) {
  const p = data.videoProgress(meta, film.id);
  return p.completed ? "done" : p.position > 0 ? "watching" : "new";
}

module.exports = { periodOf, cardPeriod, groupByPeriod, sortFilms, watchState };
