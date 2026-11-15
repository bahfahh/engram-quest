"""Speech recognition check of a narration file: python3 asr.py <narration.wav>   (English: ASR_LANG=en python3 asr.py …)

Decodes the file with ffmpeg to 16 kHz mono, so timestamps are real seconds.
Only 2 runs at a time across the machine (others wait their turn): it is CPU heavy.
"""
import os, subprocess, sys, time
import numpy as np
from faster_whisper import WhisperModel

try:
    import fcntl

    def try_lock(f):
        try:
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return True
        except BlockingIOError:
            return False
except ImportError:  # Windows has no fcntl; a byte-range lock does the same job
    import msvcrt

    def try_lock(f):
        try:
            msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
            return True
        except OSError:
            return False

# The OS drops the lock when the process ends, however it ends.
STUDIO = os.path.dirname(os.path.abspath(__file__))
lock = None
while lock is None:
    for i in range(2):
        f = open(os.path.join(STUDIO, f".asr-slot-{i}"), "a+")  # "a+": never truncate a slot another run holds
        f.seek(0)
        if try_lock(f):
            lock = f
            break
        f.close()
    if lock is None:
        time.sleep(5)

m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=2)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
LANG = os.environ.get("ASR_LANG", "zh")   # ASR_LANG=en for English narration
# Keep the prompt neutral and subject-free: naming terms biases the model into "hearing" them correctly.
# ASR_PROMPT overrides it (e.g. to describe the speaking style, never to list the terms you are checking).
PROMPT = os.environ.get("ASR_PROMPT") or {"zh": "以下是台灣中文的教學影片旁白。", "en": "A teaching video."}[LANG]
segs, _ = m.transcribe(audio, language=LANG, initial_prompt=PROMPT)
for s in segs:
    print(f"[{s.start:6.1f}] {s.text.strip()}", flush=True)
