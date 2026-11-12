"use strict";
// What a playlist row says about one video, so a learner can find their place at a glance.

const { t: c, interpolate: K } = require("../i18n");
const { videoProgress } = require("./data");

function fmtTime(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** kind: "playing" (the video on screen) | "done" | "progress" (stopped part-way) | "new". */
function rowStatus(t, meta, video, currentId) {
  if (video.id === currentId) return { kind: "playing", text: c(t, "VIDEO_PLAYING") };
  const p = videoProgress(meta, video.id);
  if (p.completed) return { kind: "done", text: c(t, "VIDEO_WATCHED") };
  if (p.position > 0) return { kind: "progress", text: K(c(t, "VIDEO_STOPPED_AT"), { time: fmtTime(p.position) }) };
  return { kind: "new", text: c(t, "VIDEO_NOT_STARTED") };
}

module.exports = { fmtTime, rowStatus };
