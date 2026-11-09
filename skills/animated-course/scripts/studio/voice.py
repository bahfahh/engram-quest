#!/usr/bin/env python3
"""script.json -> narration.wav + timeline.json + subtitles.vtt

Usage: python3 voice.py <projectDir>

script.json:
{
  "voices": {"teacher": {"voice": "zh-TW-YunJheNeural", "rate": "+0%", "pitch": "+0Hz"},
             "student": {"voice": "zh-TW-HsiaoYuNeural", "rate": "+8%", "pitch": "+20Hz"}},
  "leadIn": 0.6,            # silence before the first line (s)
  "tail": 1.5,              # silence after the last line (s)
  "defaultPause": 0.35,     # real silence after each line unless the line sets pauseAfter
                            # (each clip is trimmed to the speech itself, so these are true gaps)
  "lines": [
    {"id": "L01", "speaker": "student", "text": "欸，Docker 到底是什麼？", "pauseAfter": 0.4},
    {"id": "beat-recall", "silence": 2.5},                       # visual-only beat, no speech
    {"id": "L02", "speaker": "teacher", "text": "...", "sub": "字幕想跟念的不一樣時才填"},
    {"id": "L03", "speaker": "teacher", "text": "...", "rate": "+10%", "pitch": "+15Hz"}  # per-line override of the voice's rate/pitch
  ],
  "sfx": [{"file": "sfx/pop.wav", "line": "L02", "word": "Docker", "offset": 0.0, "gain": 0.25}]   # optional;
          # "word" anchors to that word's start in the line (else the line start); "offset" shifts it; or {"t": seconds}
}

Voice engine (reference/07-voice-and-language.md §1c): edge-tts by default. An AI voice is used when it is chosen
(VOICE_ENGINE or script.json "engine": edge|gemini|azure|custom) and configured (GEMINI_API_KEY;
AZURE_SPEECH_KEY + AZURE_SPEECH_REGION; TTS_CUSTOM_CMD). The choice is made while planning: resolve.cjs says whether
to ask the user (keys present, nothing fixed). "auto"/unset always means edge-tts, so nothing costs money by surprise.
Per-engine voice settings sit inside each voice: {"voice": ..., "rate": ..., "pitch": ..., "gemini": {"voice", "style"},
"azure": {"voice"}, "custom": {"voice", "style"}}. Engines without word timings are aligned with faster-whisper.
If the chosen engine fails or does not match the text, the WHOLE narration is redone with edge-tts (one voice per film).

timeline.json gives every line's start/end in seconds and, for spoken lines, word timings
("words": [{"text","start","end"}]) so visuals can land exactly when a word is said.
TTS results are cached in studio/.tts-cache, so re-running after editing one line is fast.
"""
import asyncio, base64, difflib, hashlib, json, os, re, shlex, ssl, subprocess, sys, tempfile, urllib.request, wave
import numpy as np
import edge_tts
import edge_tts.communicate as _c

# The container's outbound HTTPS goes through a proxy with its own CA.
_c._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")

SR = 24000
STUDIO = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(STUDIO, ".tts-cache")
# zh-TW-YunJheNeural fails intermittently (NoAudioReceived) for the same text that succeeds a minute
# later, so retry a lot per line, and run several rounds over the failed lines before giving up.
RETRIES = int(os.environ.get("TTS_RETRIES", 4))
ROUNDS = int(os.environ.get("TTS_ROUNDS", 6))
CA = "/root/.ccr/ca-bundle.crt"
_HTTPS = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()


# ------------------------------------------------------------------ engine choice
def pick_engine(spec):
    """Return (engine, reason). 'auto' uses an AI voice when one is configured, else edge-tts."""
    want = (os.environ.get("VOICE_ENGINE") or spec.get("engine") or "auto").lower()
    env = os.environ
    have = {"gemini": bool(env.get("GEMINI_API_KEY")),
            "azure": bool(env.get("AZURE_SPEECH_KEY") and env.get("AZURE_SPEECH_REGION")),
            "custom": bool(env.get("TTS_CUSTOM_CMD"))}
    if want == "edge":
        return "edge", "edge-tts requested"
    if want in have:
        return (want, f"{want} requested") if have[want] else ("edge", f"{want} requested but not configured -> edge-tts")
    # 'auto' never spends money on its own: the engine is chosen while planning (resolve.cjs engine.askUser)
    found = [e for e in ("gemini", "azure", "custom") if have[e]]
    if found:
        return "edge", (f"AI voice available ({', '.join(found)}) but no engine chosen in script.json -> edge-tts; "
                        "ask the user while planning and set \"engine\"")
    return "edge", "no AI voice configured -> edge-tts (default)"


def _lang(spec, voice):
    if spec.get("lang"):
        return spec["lang"].split("-")[0].lower()
    return voice.split("-")[0].lower() if "-" in voice else "zh"


# ------------------------------------------------------------------ alignment (engines without word timings)
_WHISPER = None
try:  # Traditional/Simplified: Whisper often writes Simplified for zh; compare in one script (pip install opencc-python-reimplemented)
    from opencc import OpenCC as _OpenCC
    _T2S = _OpenCC("t2s")
except Exception:
    _T2S = None
try:  # compare Chinese by sound, so ASR homophone slips (伺服器 heard as 四伏氣) still count (pip install pypinyin)
    from pypinyin import lazy_pinyin as _pinyin
except Exception:
    _pinyin = None
_DIG = dict(zip("0123456789", "零一二三四五六七八九"))


def _norm(c):
    """One character -> its comparison form (lower case, Simplified, digits as Chinese numerals). Always 1:1."""
    c = c.lower()
    if c in _DIG:
        return _DIG[c]
    if _T2S and not c.isascii():
        t = _T2S.convert(c)
        if len(t) == 1:
            c = t
    if _pinyin and not c.isascii():
        py = _pinyin(c)
        if py and py[0] != c:
            return py[0]
    return c


def _whisper():
    global _WHISPER
    if _WHISPER is None:
        from faster_whisper import WhisperModel
        _WHISPER = WhisperModel(os.environ.get("ALIGN_MODEL", "small"), device="cpu", compute_type="int8",
                                cpu_threads=int(os.environ.get("ALIGN_THREADS", 2)))
    return _WHISPER


def align_words(text, path, lang):
    """Word timings for a clip from faster-whisper, mapped back onto the script text.
    Returns (words, match): words = [{text,start,end}] with the script's own characters
    (one CJK character or one Latin word each); match = share of script characters the ASR heard."""
    audio = decode(path, sr=16000)
    segs, _ = _whisper().transcribe(audio, language=lang, word_timestamps=True, beam_size=5)
    heard = []  # (char, start, end)
    for sg in segs:
        for w in (sg.words or []):
            cs = [c for c in w.word.lower() if c.isalnum()]
            if not cs:
                continue
            step = (w.end - w.start) / len(cs)
            heard += [(_norm(c), w.start + i * step, w.start + (i + 1) * step) for i, c in enumerate(cs)]
    # script units: CJK chars one by one, Latin/digit runs as words
    units, cur = [], ""
    for ch in text:
        if ch.isascii() and ch.isalnum():
            cur += ch; continue
        if cur:
            units.append(cur); cur = ""
        if ch.isalnum():
            units.append(ch)
    if cur:
        units.append(cur)
    if not units:
        return [], 1.0
    tgt = [_norm(c) for u in units for c in u]
    src = [c for c, _, _ in heard]
    t_at = [None] * len(tgt)
    hit = [False] * len(tgt)
    sm = difflib.SequenceMatcher(None, src, tgt, autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            t_at[b + k] = (heard[a + k][1], heard[a + k][2]); hit[b + k] = True
    total_dur = len(audio) / 16000
    known = [i for i, v in enumerate(t_at) if v]
    for i in range(len(t_at)):  # interpolate characters the ASR missed
        if t_at[i]:
            continue
        prev = max([k for k in known if k < i], default=None); nxt = min([k for k in known if k > i], default=None)
        a = t_at[prev][1] if prev is not None else 0.0
        b = t_at[nxt][0] if nxt is not None else total_dur
        span = [k for k in range(i, len(t_at)) if not t_at[k] and (nxt is None or k < nxt)]
        step = (b - a) / max(1, len(span) + 0)
        for j, k in enumerate(span):
            t_at[k] = (a + j * step, a + (j + 1) * step)
    words, pos, heard_units = [], 0, 0
    for u in units:
        seg = t_at[pos:pos + len(u)]
        # a CJK character counts as heard if matched; a Latin word if at least half its letters matched
        heard_units += 1 if sum(hit[pos:pos + len(u)]) >= max(1, len(u) / 2) else 0
        pos += len(u)
        words.append({"text": u, "start": round(seg[0][0], 3), "end": round(seg[-1][1], 3)})
    return words, heard_units / len(units)


# ------------------------------------------------------------------ AI engines (one clip per call)
def _post(url, body, headers, timeout=120):
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout, context=_HTTPS) as r:
        return r.read()


def synth_gemini(text, v, out):
    g = v.get("gemini", {})
    body = {"model": os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts"),
            "input": [{"type": "user_input", "content": [{"type": "text", "text": text,
                       **({"annotations": [{"type": "speech_metadata", "style": g["style"]}]} if g.get("style") else {})}]}],
            "response_format": {"type": "audio"},
            "generation_config": {"speech_config": [{"voice": g.get("voice", "Kore")}]}}
    raw = _post("https://generativelanguage.googleapis.com/v1beta/interactions", json.dumps(body).encode(),
                {"x-goog-api-key": os.environ["GEMINI_API_KEY"], "Content-Type": "application/json"})
    res = json.loads(raw)
    data = None
    for st in res.get("steps", []):
        if st.get("type") == "model_output":
            for c in st.get("content", []):
                if c.get("type") == "audio" and c.get("data"):
                    data = c["data"]
    if not data:
        raise RuntimeError("gemini: no audio in response")
    open(out, "wb").write(base64.b64decode(data))


def synth_azure(text, v, out, rate, pitch):
    from xml.sax.saxutils import escape
    voice = v.get("azure", {}).get("voice", v["voice"])
    lang = "-".join(voice.split("-")[:2])
    ssml = (f"<speak version='1.0' xml:lang='{lang}'><voice name='{voice}'>"
            f"<prosody rate='{rate}' pitch='{pitch}'>{escape(text)}</prosody></voice></speak>")
    region = os.environ["AZURE_SPEECH_REGION"]
    raw = _post(f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1", ssml.encode("utf-8"),
                {"Ocp-Apim-Subscription-Key": os.environ["AZURE_SPEECH_KEY"], "Content-Type": "application/ssml+xml",
                 "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm", "User-Agent": "engram-voice"})
    open(out, "wb").write(raw)


def synth_custom(text, v, out, rate, pitch):
    c = v.get("custom", {})
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(text); tf = f.name
    cmd = os.environ["TTS_CUSTOM_CMD"].format(voice=shlex.quote(c.get("voice", v["voice"])), style=shlex.quote(c.get("style", "")),
                                              rate=shlex.quote(rate), pitch=shlex.quote(pitch), text_file=shlex.quote(tf), out=shlex.quote(out))
    try:
        subprocess.run(cmd, shell=True, check=True, timeout=300)
    finally:
        os.unlink(tf)
    if not os.path.exists(out) or os.path.getsize(out) < 1000:
        raise RuntimeError("custom engine wrote no audio")


ENGINE = "edge"; LANG = "zh"; MIN_MATCH = float(os.environ.get("ALIGN_MIN_MATCH", 0.7))


async def synth_any(text, v, rate, pitch):
    """One clip with the current ENGINE. Returns (audio path, words)."""
    if ENGINE == "edge":
        return await synth(text, v["voice"], rate, pitch)
    sub = v.get(ENGINE, {})
    key = hashlib.sha1(f"{ENGINE}|{json.dumps(sub, sort_keys=True)}|{v['voice']}|{rate}|{pitch}|{text}".encode()).hexdigest()[:20]
    wav, meta = f"{CACHE}/{ENGINE}-{key}.wav", f"{CACHE}/{ENGINE}-{key}.json"
    if os.path.exists(wav) and os.path.exists(meta):
        return wav, json.load(open(meta, encoding="utf-8"))
    last = None
    for attempt in range(max(1, min(RETRIES, 3))):
        try:
            if ENGINE == "gemini":
                await asyncio.to_thread(synth_gemini, text, v, wav)
            elif ENGINE == "azure":
                await asyncio.to_thread(synth_azure, text, v, wav, rate, pitch)
            else:
                await asyncio.to_thread(synth_custom, text, v, wav, rate, pitch)
            words, match = await asyncio.to_thread(align_words, text, wav, LANG)
            speech = trim(decode(wav))[0]
            per_unit = (len(speech) / SR) / max(1, len(words))
            # pass: clearly matched, or mostly matched with a plausible length (ASR slips on terms, but a
            # truncated or wrong clip is both short/long and badly matched)
            if not (match >= MIN_MATCH or (match >= 0.5 and 0.1 <= per_unit <= 0.8)):
                raise RuntimeError(f"{ENGINE}: speech does not match the text ({match:.0%} heard, {per_unit:.2f}s per unit)")
            json.dump(words, open(meta, "w", encoding="utf-8"), ensure_ascii=False)
            return wav, words
        except Exception as e:
            last = e
            if os.path.exists(wav):
                os.remove(wav)
            await asyncio.sleep(min(2 + attempt, 5))
    raise RuntimeError(f"{ENGINE} failed for {text!r}: {last}")


def _letters(s):
    return "".join(ch for ch in s.lower() if ch.isalnum())


def complete(text, words, min_cover=0.9):
    """edge-tts sometimes returns a partial stream (audio and word boundaries both stop early) without an error.
    A clip counts as complete when its word boundaries cover >= 90% of the text's letters/digits/CJK characters."""
    want = _letters(text)
    return not want or len(_letters("".join(w["text"] for w in words))) >= min_cover * len(want)


async def synth(text, voice, rate, pitch):
    key = hashlib.sha1(f"{voice}|{rate}|{pitch}|{text}".encode()).hexdigest()[:20]
    mp3, meta = f"{CACHE}/{key}.mp3", f"{CACHE}/{key}.json"
    if os.path.exists(mp3) and os.path.exists(meta):
        cached = json.load(open(meta, encoding="utf-8"))
        if complete(text, cached):
            return mp3, cached
        print(f"  re-synthesizing a truncated cached clip: {text[:50]!r}", flush=True)
    last = None
    for attempt in range(RETRIES):
        try:
            # YunJhe sometimes rejects one exact string every time but accepts it with trailing spaces,
            # so later attempts send a whitespace variant (same speech, same word boundaries).
            send = text + " " * (attempt % 3)
            comm = edge_tts.Communicate(send, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
            words, buf = [], bytearray()
            async for ch in comm.stream():
                if ch["type"] == "audio":
                    buf += ch["data"]
                elif ch["type"] == "WordBoundary":
                    words.append({"text": ch["text"], "start": ch["offset"] / 1e7,
                                  "end": (ch["offset"] + ch["duration"]) / 1e7})
            if not buf:
                raise RuntimeError("empty audio")
            if not complete(text, words):
                raise RuntimeError(f"truncated audio (word boundaries cover only part of the text)")
            open(mp3, "wb").write(buf)
            json.dump(words, open(meta, "w", encoding="utf-8"), ensure_ascii=False)
            return mp3, words
        except ValueError:  # a bad argument (e.g. an invalid rate/pitch) never succeeds: do not retry
            raise
        except Exception as e:  # network hiccups, empty or truncated audio
            last = e
            await asyncio.sleep(min(1 + attempt, 5))
    raise RuntimeError(f"TTS failed for {text!r}: {last}")


def decode(path, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(sr), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


def trim(audio):
    """Cut edge-tts's built-in silence (~0.2s before, ~1s after each clip). Returns (audio, seconds cut at start)."""
    frame = int(SR * 0.01)
    n = len(audio) // frame
    if n == 0:
        return audio, 0.0
    rms = np.sqrt((audio[:n * frame].reshape(n, frame) ** 2).mean(axis=1))
    loud = np.where(rms > 10 ** (-45 / 20))[0]
    if len(loud) == 0:
        return audio, 0.0
    a = max(0, loud[0] * frame - int(0.04 * SR))
    b = min(len(audio), (loud[-1] + 1) * frame + int(0.12 * SR))
    return audio[a:b], a / SR


def level(audio, target_db=-20.0):
    """Scale a clip so its speech RMS sits at target_db, so every voice/character plays at the same loudness."""
    frame = int(SR * 0.01)
    n = len(audio) // frame
    if n == 0:
        return audio
    rms = np.sqrt((audio[:n * frame].reshape(n, frame) ** 2).mean(axis=1))
    speech = rms[rms > 10 ** (-40 / 20)]
    if len(speech) == 0:
        return audio
    cur = float(np.sqrt((speech ** 2).mean()))
    return audio * float(np.clip(10 ** (target_db / 20) / cur, 0.25, 4.0))


def vtt_time(s):
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{sec:06.3f}"


async def prefetch(spec):
    """Synthesize every spoken line into the cache, a few lines at a time (TTS_PARALLEL, default 4),
    retrying failed lines over several rounds. A failing line never blocks the others."""
    voices = spec["voices"]
    # rate is "+N%" / "-N%", pitch is "+NHz" / "-NHz"; a wrong one fails every time, so stop before synthesising
    # (debug/issue-2026-11-03-animated-course-voice-rate-and-readcheck-reappear.md)
    bad = []
    for ln in spec["lines"]:
        if "silence" in ln:
            continue
        v = voices.get(ln.get("speaker"))
        if v is None:
            bad.append(f"{ln.get('id')}: unknown speaker {ln.get('speaker')!r}"); continue
        r, p = ln.get("rate", v.get("rate", "+0%")), ln.get("pitch", v.get("pitch", "+0Hz"))
        if not re.fullmatch(r"[+-]\d+%", str(r)):
            bad.append(f"{ln.get('id')}: rate {r!r} (expected like +4% or -10%)")
        if not re.fullmatch(r"[+-]\d+Hz", str(p)):
            bad.append(f"{ln.get('id')}: pitch {p!r} (expected like +0Hz or -20Hz)")
    if bad:
        sys.exit("script.json has invalid voice settings:\n  " + "\n  ".join(bad))
    sem = asyncio.Semaphore(int(os.environ.get("TTS_PARALLEL", 4)))
    errors = {}
    async def one(ln):
        v = voices[ln["speaker"]]
        async with sem:
            try:
                await synth_any(ln["text"], v, ln.get("rate", v.get("rate", "+0%")), ln.get("pitch", v.get("pitch", "+0Hz")))
                return None
            except ValueError as e:  # not a network problem: report it now
                sys.exit(f"TTS rejected {ln['id']}: {e}")
            except Exception as e:
                errors[ln["id"]] = e
                if ENGINE != "edge":
                    print(f"  {ln['id']}: {e}", flush=True)
                return ln
    todo = [ln for ln in spec["lines"] if "silence" not in ln]
    rounds = ROUNDS if ENGINE == "edge" else 2
    for rnd in range(rounds):
        failed = [ln for ln in await asyncio.gather(*(one(ln) for ln in todo)) if ln]
        if not failed:
            return
        print(f"round {rnd + 1}: {len(failed)} line(s) failed, retrying: " + ", ".join(l["id"] for l in failed), flush=True)
        todo = failed
        await asyncio.sleep(20 if ENGINE == "edge" else 3)
    ids = ", ".join(l["id"] for l in todo)
    if ENGINE != "edge":
        raise RuntimeError(f"{ENGINE} failed for: {ids}")
    last = "; ".join(f"{l['id']}: {errors.get(l['id'])}" for l in todo[:3])
    sys.exit(f"TTS still failing for: {ids} (last errors: {last}). Successful lines are cached; re-run voice.py to retry only these.")


async def main(project):
    os.makedirs(CACHE, exist_ok=True)
    spec = json.load(open(os.path.join(project, "script.json"), encoding="utf-8"))
    voices = spec["voices"]
    global ENGINE, LANG
    ENGINE, why = pick_engine(spec)
    LANG = _lang(spec, voices.get("teacher", next(iter(voices.values())))["voice"])
    print(f"voice engine: {ENGINE} ({why})", flush=True)
    if ENGINE != "edge":
        try:
            await prefetch(spec)
        except Exception as e:
            print(f"voice engine: {ENGINE} did not work ({e}); redoing the whole narration with edge-tts", flush=True)
            ENGINE = "edge"
    if ENGINE == "edge":
        await prefetch(spec)
    t = float(spec.get("leadIn", 0.6))
    default_pause = float(spec.get("defaultPause", 0.35))
    placed, out_lines = [], []
    for ln in spec["lines"]:
        if "silence" in ln:
            out_lines.append({"id": ln["id"], "speaker": None, "text": "", "start": round(t, 3),
                              "end": round(t + ln["silence"], 3)})
            t += float(ln["silence"])
            continue
        v = voices[ln["speaker"]]
        mp3, words = await synth_any(ln["text"], v, ln.get("rate", v.get("rate", "+0%")), ln.get("pitch", v.get("pitch", "+0Hz")))
        audio, lead = trim(decode(mp3))
        audio = level(audio)
        words = [{**w, "start": max(0.0, w["start"] - lead), "end": max(0.0, w["end"] - lead)} for w in words]
        t += float(ln.get("gapBefore", 0))
        start, dur = t, len(audio) / SR
        if words:  # word boundary ends can run a little past the trimmed audio
            dur = max(dur, words[-1]["end"])
        placed.append((start, audio))
        out_lines.append({"id": ln["id"], "speaker": ln["speaker"], "text": ln["text"],
                          "sub": ln.get("sub", ln["text"]), "start": round(start, 3), "end": round(start + dur, 3),
                          "words": [{"text": w["text"], "start": round(start + w["start"], 3),
                                     "end": round(start + w["end"], 3)} for w in words]})
        t = start + dur + float(ln.get("pauseAfter", default_pause))
    total = t + float(spec.get("tail", 1.5))

    mix = np.zeros(int(total * SR) + SR, dtype=np.float32)
    for start, audio in placed:
        i = int(start * SR)
        mix[i:i + len(audio)] += audio
    by_id = {l["id"]: l for l in out_lines}
    if spec.get("sfx"):  # keep a voice-only copy for A/B listening (deliver.py --dry)
        dry = mix[:int(total * SR)] * (0.98 / max(0.98, float(np.max(np.abs(mix))) or 1.0))
        with wave.open(os.path.join(project, "narration_dry.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((dry * 32767).astype(np.int16).tobytes())
    for fx in spec.get("sfx", []):
        if "line" in fx:
            ln_ = by_id[fx["line"]]; at = ln_["start"]
            if fx.get("word"):  # anchor to the first word boundary that starts with this text
                hit = [w for w in ln_.get("words", []) if _letters(w["text"]).startswith(_letters(fx["word"]))]
                if not hit:
                    raise SystemExit(f"sfx: word {fx['word']!r} not found in line {fx['line']}")
                at = hit[0]["start"]
            at += fx.get("offset", 0)
        else:
            at = fx["t"]
        audio = decode(os.path.join(project, fx["file"])) * float(fx.get("gain", 0.6))
        i = int(at * SR)
        seg = mix[i:i + len(audio)]
        seg += audio[:len(seg)]
    mix = mix[:int(total * SR)]
    peak = float(np.max(np.abs(mix))) or 1.0
    if peak > 0.98:
        mix *= 0.98 / peak
    with wave.open(os.path.join(project, "narration.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())

    timeline = {"duration": round(total, 3), "lines": out_lines}
    json.dump(timeline, open(os.path.join(project, "timeline.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    cues = ["WEBVTT", ""]
    n = 0
    for l in out_lines:
        if l["speaker"] is None or not l.get("sub"):
            continue
        n += 1
        cues += [str(n), f"{vtt_time(l['start'])} --> {vtt_time(l['end'])}", l["sub"], ""]
    open(os.path.join(project, "subtitles.vtt"), "w", encoding="utf-8").write("\n".join(cues))
    spoken = sum(1 for l in out_lines if l["speaker"])
    print(f"ok: {spoken} spoken lines, duration {total:.1f}s -> narration.wav, timeline.json, subtitles.vtt")


if __name__ == "__main__":
    asyncio.run(main(os.path.abspath(sys.argv[1])))
