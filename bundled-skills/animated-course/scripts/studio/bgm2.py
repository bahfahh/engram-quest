#!/usr/bin/env python3
"""Intro / outro music for a narrated lesson (the middle stays music-free).

  python3 bgm2.py <video.mp4> <music.mp3> <out.mp4> [--vtt in.vtt out.vtt] [options]

Shape (YouTube-style):
  intro  : the first frame is held for --solo s (default 3) with the music alone at --full LUFS (default -22);
           the music then sits far under the dialogue (--duck dB, default -18) and fades out over 4 s,
           finishing --until s (default 14) after the speech starts.
  middle : no music.
  outro  : the music fades in under the last --outro s of speech (default 14), rises after the last line,
           the last frame is held for --tail s (default 5) and the music fades out over the last 3 s.
           The whole ending sits --outro-level dB (default -3) under the intro level.
Default track for the course videos: Morning (Kevin MacLeod, CC BY 4.0).
The narration is untouched; the mix is loudness-normalised to -16 LUFS. --vtt shifts the subtitles by --solo; --height 720 makes a web copy.
"""
import json, os, re, subprocess, sys, tempfile
import numpy as np

a = sys.argv[1:]
video, music, out = a[:3]
opt = lambda k, d: float(a[a.index('--' + k) + 1]) if '--' + k in a else d
solo, until, outro, tail = opt('solo', 3.0), opt('until', 14.0), opt('outro', 14.0), opt('tail', 5.0)
full, duck = opt('full', -22.0), opt('duck', -18.0)
outro_rel = opt('outro-level', -3.0)  # the ending sits this many dB under the intro (a slightly quieter ending)
height = int(opt('height', 0))  # e.g. 720 for a web copy; 0 keeps the source size
SR = 48000

def pcm(path, ch):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, ch).copy()

def lufs_of(x):
    tmp = tempfile.mktemp(suffix='.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', str(x.shape[1]), '-ar', str(SR), '-i', '-', tmp],
                   input=x.astype(np.float32).tobytes(), check=True)
    err = subprocess.run(['ffmpeg', '-nostats', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    os.remove(tmp)
    return float(re.findall(r'^\s+I:\s+(-?[\d.]+) LUFS', err, re.M)[-1])

voice = pcm(video, 1)[:, 0]
n_in, n_tail = int(solo * SR), int(tail * SR)
voice = np.concatenate([np.zeros(n_in, np.float32), voice, np.zeros(n_tail, np.float32)])
N = len(voice); t = np.arange(N) / SR

# speech activity from 20 ms RMS, smoothed with attack 60 ms / release 700 ms
hop = SR // 50
rms = np.sqrt(np.add.reduceat(voice ** 2, np.arange(0, N, hop)) / hop)
act = (rms > 10 ** (-45 / 20)).astype(float)
env = np.zeros_like(act); g = 0.0
for i, v in enumerate(act):
    k = 1 - np.exp(-1 / (0.06 * 50)) if v > g else 1 - np.exp(-1 / (0.7 * 50))
    g += (v - g) * k; env[i] = g
speaking = np.interp(t, np.arange(len(env)) * hop / SR, env)
spoken = np.flatnonzero(act)
first, last = spoken[0] * hop / SR, (spoken[-1] + 1) * hop / SR

# where the music lives
sec = np.zeros(N)
fade_in_end = first + until
sec = np.where(t <= fade_in_end - 4, 1.0, sec)
m = (t > fade_in_end - 4) & (t < fade_in_end)
sec[m] = np.cos((t[m] - (fade_in_end - 4)) / 4 * np.pi / 2) ** 2
o0 = last - outro
m = (t >= o0) & (t < o0 + 3); sec[m] = np.maximum(sec[m], np.sin((t[m] - o0) / 3 * np.pi / 2) ** 2)
sec[t >= o0 + 3] = 1.0
m = t > N / SR - 3; sec[m] *= np.cos((t[m] - (N / SR - 3)) / 3 * np.pi / 2) ** 2
sec[t < 0.4] *= t[t < 0.4] / 0.4

gain = sec * (1 - speaking * (1 - 10 ** (duck / 20)))
gain[t >= o0] *= 10 ** (outro_rel / 20)

# music: intro uses the start of the track; the outro uses the start of the track again so it begins on a phrase
mus = pcm(music, 2)
mus *= 10 ** ((full - lufs_of(mus[: SR * 60])) / 20)
track = np.zeros((N, 2), np.float32)
L1 = int(min(len(mus), fade_in_end * SR)); track[:L1] = mus[:L1]
s0 = int(max(0, o0) * SR); L2 = min(len(mus), N - s0); track[s0:s0 + L2] = mus[:L2]
mix = track * gain[:, None] + voice[:, None]

wav = tempfile.mktemp(suffix='.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', wav], input=mix.astype(np.float32).tobytes(), check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', wav, '-filter_complex',
                f'[0:v]tpad=start_mode=clone:start_duration={solo}:stop_mode=clone:stop_duration={tail}'
                + (f',scale=-2:{height}:flags=lanczos' if height else '') + '[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]',
                '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                # full size = the vault's commit spec (AGENTS.md: H.264 CRF 26, maxrate 1800k, AAC 128k), so a delivered film can be
                # committed as is (no second lossy pass); --height = a smaller web copy
                *(['-preset', 'medium', '-crf', '29'] if height else ['-preset', 'slow', '-crf', '26', '-maxrate', '1800k', '-bufsize', '3600k']),
                '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', out], check=True)
os.remove(wav)

if '--vtt' in a:
    vin, vout = a[a.index('--vtt') + 1], a[a.index('--vtt') + 2]
    def shift(m):
        h, mi, s = int(m.group(1)), int(m.group(2)), float(m.group(3)) + solo
        tot = h * 3600 + mi * 60 + s
        return f'{int(tot // 3600):02d}:{int(tot % 3600 // 60):02d}:{tot % 60:06.3f}'
    txt = open(vin, encoding='utf-8').read()
    open(vout, 'w', encoding='utf-8').write(re.sub(r'(\d{2}):(\d{2}):(\d{2}\.\d{3})', shift, txt))
print(f'ok: {out}  intro music until {fade_in_end:.1f}s, outro from {o0:.1f}s, total {N / SR:.1f}s')
