#!/usr/bin/env python3
"""qa_music.py — 用數據檢查產生的配樂（我們聽不到，所以全部用量測）。

  nice -n 10 python3 qa_music.py demo/*.wav            # 每個 wav 旁邊要有 music_gen 產生的 .json / .notes.tsv
  輸出：每段一張 <名>.png（波形＋頻譜圖＋段落/和弦標記），demo/qa_report.md、demo/qa_report.json

檢查項目
  響度／true peak  ffmpeg ebur128（獨立於產生器自己的量測）
  頻譜            各頻段能量（相對全頻）：<40 Hz 轟鳴、5 kHz 以上刺耳；2–8 kHz 1/3 八度突起（共振）
  雜訊            2–16 kHz 頻譜平坦度（嘶聲/白噪音會很平）、樂段中最安靜 10% 的電平
  爆音／喀噠聲     7 kHz 高通後的尖峰 / 局部 RMS，再扣掉音符起音時間；取樣尾端／loop 接縫
  音符表          調外音、同時發聲的音數、旋律級進比例、最大跳進、強拍非和弦音、與伴奏的小二度摩擦
"""
import csv, json, os, re, subprocess, sys
import numpy as np
from scipy import signal
from scipy.ndimage import uniform_filter1d, maximum_filter1d

SR = 48000


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def ebur(path):
    err = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = err[err.rfind('Summary:'):]
    g = lambda pat: float(re.search(pat, s, re.S).group(1))
    return dict(I=g(r'I:\s+(-?[\d.]+) LUFS'), LRA=g(r'LRA:\s+(-?[\d.]+) LU'), TP=g(r'True peak:\s+Peak:\s+(-?[\d.inf]+) dBFS'))


def bands(x):
    m = x.mean(1)
    f, p = signal.welch(m, SR, nperseg=8192)
    tot = p.sum()
    edges = [(0, 40, 'sub<40'), (40, 120, '40-120'), (120, 500, '120-500'), (500, 2000, '500-2k'), (2000, 5000, '2k-5k'),
             (5000, 10000, '5k-10k'), (10000, 24000, '>10k')]
    out = {name: round(10 * np.log10(p[(f >= lo) & (f < hi)].sum() / tot + 1e-12), 1) for lo, hi, name in edges}
    # 1/3-octave levels 1–10 kHz: any band sticking out of its neighbours (resonance / harshness)
    cs = 1000 * 2 ** (np.arange(0, 10.5) / 3)
    lv = np.array([10 * np.log10(p[(f >= c / 2 ** (1 / 6)) & (f < c * 2 ** (1 / 6))].sum() + 1e-20) for c in cs])
    bump = [(round(float(c)), round(float(lv[i] - (lv[i - 1] + lv[i + 1]) / 2), 1), round(float(lv[i] - 10 * np.log10(tot)), 1))
            for i, c in enumerate(cs) if 0 < i < len(cs) - 1]
    worst = max(bump, key=lambda b: b[1])          # (centre Hz, dB above neighbours, band level dB re total)
    cen = float((f * p).sum() / tot)
    return out, worst, round(cen)


def noise_check(x, body):
    m = x.mean(1)[body[0]:body[1]]
    n = 2048
    fr = np.fft.rfftfreq(n, 1 / SR)
    sel = (fr >= 2000) & (fr <= 16000)
    flat, lv = [], []
    win = np.hanning(n)
    for i in range(0, len(m) - n, n):
        seg = m[i:i + n]
        r = np.sqrt(np.mean(seg ** 2))
        lv.append(20 * np.log10(r + 1e-12))
        if r < 10 ** (-60 / 20):
            continue
        P = np.abs(np.fft.rfft(seg * win)) ** 2
        P = P[sel] + 1e-20
        flat.append(np.exp(np.mean(np.log(P))) / np.mean(P))
    flat = np.array(flat) if flat else np.array([0.0])
    lv = lv or [-120.0]
    return dict(hf_flatness_median=round(float(np.median(flat)), 3), hf_flat_frames_pct=round(float(np.mean(flat > 0.3) * 100), 2),
                quiet10_dbfs=round(float(np.percentile(lv, 10)), 1))


def clicks(x, onsets):
    sos = signal.butter(4, 7000, 'highpass', fs=SR, output='sos')
    hp = np.abs(signal.sosfilt(sos, x, axis=0)).max(1)
    loc = np.sqrt(np.maximum(uniform_filter1d(hp ** 2, int(0.02 * SR)), 0)) + 1e-9
    ratio = hp / loc
    cand = np.flatnonzero((ratio > 9) & (hp > 10 ** (-66 / 20)))
    events = []
    for i in cand:
        if not events or i - events[-1][0] > int(0.005 * SR):
            events.append([i, ratio[i], hp[i]])
    on = np.array(sorted(onsets)) if onsets else np.array([-1.0])
    unexpl = []
    for i, r, a in events:
        t = i / SR
        if np.min(np.abs(on - t)) > 0.03:
            unexpl.append((round(t, 3), round(float(r), 1), round(float(20 * np.log10(a)), 1)))
    # sample-level discontinuity: second difference vs its local level
    d2 = np.abs(np.diff(x, 2, axis=0)).max(1)
    l2 = np.sqrt(np.maximum(uniform_filter1d(d2 ** 2, int(0.01 * SR)), 0)) + 1e-9
    jumps = np.flatnonzero((d2 / l2 > 14) & (d2 > 10 ** (-70 / 20)))
    j_ev = []
    for i in jumps:
        if not j_ev or i - j_ev[-1] > int(0.005 * SR):
            j_ev.append(i)
    j_un = [round(i / SR, 3) for i in j_ev if np.min(np.abs(on - i / SR)) > 0.03]
    return dict(hf_spikes=len(events), hf_spikes_unexplained=unexpl[:20], n_unexplained=len(unexpl),
                d2_jumps=len(j_ev), d2_jumps_unexplained=j_un[:20], n_d2_unexplained=len(j_un))


def notes_check(tsv, meter):
    rows = list(csv.DictReader(open(tsv), delimiter='\t'))
    for r in rows:
        r['t'] = float(r['time_s']); r['hold'] = float(r['hold_s']); r['midi'] = int(r['midi']); r['b'] = float(r['beat'])
    n = len(rows)
    dur = max(r['t'] + r['hold'] for r in rows) if rows else 1
    outk = [r for r in rows if r['in_key'] == 'NO']
    borrowed = [r for r in rows if r['in_key'] == 'borrowed']
    # polyphony: 0.25 s after each onset, distinct pitches still held (pedal/legato overlaps and release tails not counted)
    poly, pcs = [], []
    ts = np.array([r['t'] for r in rows]); te = np.array([r['t'] + r['hold'] for r in rows]); mm = np.array([r['midi'] for r in rows])
    for r in rows:
        s = (ts <= r['t'] + 1e-4) & (te > r['t'] + 0.25)
        poly.append(len(set(mm[s]))); pcs.append(len(set(mm[s] % 12)))
    mel = [r for r in rows if r['role'] in ('mel',)]
    by_layer = {}
    for r in mel:
        by_layer.setdefault(r['layer'], []).append(r)
    ivs = []
    for lay, rs in by_layer.items():
        rs.sort(key=lambda r: r['t'])
        for a, b in zip(rs, rs[1:]):
            if b['t'] - a['t'] < 6:                        # same phrase-ish
                ivs.append(abs(b['midi'] - a['midi']))
    ivs = np.array(ivs) if ivs else np.array([0])
    strong_nct = [r for r in mel if (abs((r['b'] - 1) % meter) < 1e-6 or (meter == 4 and abs(r['b'] - 3) < 1e-6)) and r['chord_tone'] == 'no']
    # minor-second rubs between a melody note and accompaniment notes held at that moment (strong beats)
    rubs = 0
    acc = [r for r in rows if r['role'] not in ('mel', 'mel8va', 'motif', 'echo', 'sparkle')]
    at = np.array([r['t'] for r in acc]) if acc else np.zeros(0)
    ae = np.array([r['t'] + r['hold'] for r in acc]) if acc else np.zeros(0)
    am = np.array([r['midi'] for r in acc]) if acc else np.zeros(0)
    for r in mel:
        if not (abs((r['b'] - 1) % meter) < 1e-6):
            continue
        s = (at <= r['t'] + 0.03) & (ae > r['t'] + 0.10)          # ignore <100 ms pedal/legato overlaps
        hi_, lo_ = np.maximum(am[s], r['midi']), np.minimum(am[s], r['midi'])
        if np.any((hi_ - lo_) % 12 == 1):                       # minor 2nd / minor 9th (major 7ths are allowed colour)
            rubs += 1
    gaps = []
    for lay, rs in by_layer.items():
        for a, b in zip(rs, rs[1:]):
            gaps.append(b['t'] - (a['t'] + a['hold']))
    return dict(notes=n, notes_per_s=round(n / dur, 2), out_of_key=len(outk), out_of_key_examples=[(r['time_s'], r['note'], r['chord']) for r in outk[:5]],
                borrowed=len(borrowed), max_poly=int(max(poly) if poly else 0), p95_poly=float(np.percentile(poly, 95)) if poly else 0,
                max_pcs=int(max(pcs) if pcs else 0), mel_notes=len(mel), mel_step_pct=round(float(np.mean(ivs <= 2) * 100), 1),
                mel_third_pct=round(float(np.mean((ivs >= 3) & (ivs <= 4)) * 100), 1), mel_leaps_ge5=int(np.sum(ivs >= 5)),
                mel_max_leap=int(ivs.max()), mel_strong_nct=len(strong_nct), mel_m2_rubs=rubs,
                mel_rests_ge1s=int(sum(g >= 1.0 for g in gaps)), onsets=[r['t'] for r in rows])


def plot(path, x, meta, q, out_png):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    m = x.mean(1)
    t = np.arange(len(m)) / SR
    fig = plt.figure(figsize=(16, 7.5), dpi=100)
    gs = fig.add_gridspec(3, 1, height_ratios=[1.1, 2.6, 0.45], hspace=0.12)
    ax1 = fig.add_subplot(gs[0])
    hop = 480
    n = len(m) // hop
    seg = x[:n * hop].reshape(n, hop, 2)
    tt = np.arange(n) * hop / SR
    for ch, col in ((0, '#3b6ea8'), (1, '#c9783a')):
        ax1.fill_between(tt, seg[:, :, ch].min(1), seg[:, :, ch].max(1), color=col, alpha=0.55, lw=0, label='LR'[ch])
    st = np.sqrt(np.maximum(uniform_filter1d(m ** 2, int(3 * SR))[::hop][:n], 0)) + 1e-9
    ax1b = ax1.twinx()
    ax1b.plot(tt, 20 * np.log10(st), color='#333', lw=1.0)
    ax1b.set_ylim(-70, 0); ax1b.set_ylabel('3 s RMS dBFS', fontsize=8)
    ax1.set_xlim(0, t[-1]); ax1.set_ylim(-1, 1); ax1.set_ylabel('wave')
    ax1.legend(loc='upper right', fontsize=7)
    ax1.set_xticklabels([])
    title = f"{os.path.basename(path)}   mood={meta.get('mood')} seed={meta.get('seed')} density={meta.get('density')}   " \
            f"{meta.get('key')}  {meta.get('bpm')} bpm {meta.get('meter')}   I={q['loud']['I']} LUFS  TP={q['loud']['TP']} dBTP  LRA={q['loud']['LRA']}"
    ax1.set_title(title, fontsize=10, loc='left')
    ax2 = fig.add_subplot(gs[1])
    f, ts, S = signal.spectrogram(m, SR, nperseg=4096, noverlap=3072, scaling='spectrum')
    S = 10 * np.log10(S + 1e-14)
    vmax = np.percentile(S, 99.7)
    ax2.pcolormesh(ts, f, S, shading='auto', cmap='magma', vmin=vmax - 80, vmax=vmax)
    ax2.set_yscale('log'); ax2.set_ylim(30, 20000); ax2.set_xlim(0, t[-1])
    ax2.set_ylabel('Hz (log)')
    ax2.set_xticklabels([])
    ax3 = fig.add_subplot(gs[2])
    ax3.set_xlim(0, t[-1]); ax3.set_ylim(0, 1); ax3.set_yticks([])
    chart = meta.get('chart', [])
    last_part = None
    for r in chart:
        ax3.axvline(r['t'], color='#bbb', lw=0.6)
        ax3.text(r['t'] + 0.15, 0.25, r['chord'], fontsize=6.5, rotation=0)
        if r['part'] != last_part:
            ax3.text(r['t'] + 0.15, 0.68, r['part'] + (' (minor)' if r.get('mode') == 'minor' else ''), fontsize=8, weight='bold', color='#a33')
            ax2.axvline(r['t'], color='w', lw=0.5, alpha=0.5)
            last_part = r['part']
    ax3.set_xlabel('seconds')
    b = q['bands']
    fig.text(0.01, 0.005, 'bands dB rel. total: ' + '  '.join(f'{k} {v}' for k, v in b.items()) +
             f"   | 1/3-oct worst bump {q['bump'][1]} dB @ {q['bump'][0]} Hz ({q['bump'][2]} dB re total) | unexplained HF spikes {q['clicks']['n_unexplained']}", fontsize=8)
    fig.savefig(out_png, bbox_inches='tight')
    plt.close(fig)


def check(path):
    base = os.path.splitext(path)[0]
    meta = json.load(open(base + '.json')) if os.path.exists(base + '.json') else {}
    x = load(path)
    meter = int(str(meta.get('meter', '4/4')).split('/')[0])
    q = dict(file=path, loud=ebur(path))
    q['bands'], q['bump'], q['centroid_hz'] = bands(x)
    d = len(x) / SR
    body = (int(min(2.0, 0.15 * d) * SR), len(x) - int(min(3.0, 0.2 * d) * SR))
    q['noise'] = noise_check(x, body)
    nc = notes_check(base + '.notes.tsv', meter) if os.path.exists(base + '.notes.tsv') else None
    q['clicks'] = clicks(x, nc['onsets'] if nc else [])
    if nc:
        nc.pop('onsets')
    q['notes'] = nc
    q['dur'] = round(len(x) / SR, 2)
    q['end_rms_dbfs'] = round(float(20 * np.log10(np.sqrt(np.mean(x[-int(0.3 * SR):] ** 2)) + 1e-12)), 1)
    q['start_peak_dbfs'] = round(float(20 * np.log10(np.abs(x[:int(0.05 * SR)]).max() + 1e-12)), 1)
    # dead air: longest stretch (inside the body) where the 400 ms RMS stays under -50 dBFS
    m2 = x.mean(1) ** 2
    r400 = 10 * np.log10(np.maximum(uniform_filter1d(m2, int(0.4 * SR)), 0)[::480] + 1e-14)
    b0, b1 = body[0] // 480, max(body[0] // 480 + 1, body[1] // 480)
    low = r400[b0:b1] < -50
    run = best = 0
    for v in low:
        run = run + 1 if v else 0
        best = max(best, run)
    q['longest_gap_s'] = round(best * 480 / SR, 2)
    q['dc'] = round(float(np.abs(x.mean(0)).max()), 6)
    q['lr_corr'] = round(float(np.corrcoef(x[:, 0], x[:, 1])[0, 1]), 3)
    q['gen_stats'] = meta.get('stats')
    flags = []
    L = q['loud']
    tgt = TARGET if TARGET is not None else meta.get('lufs_target', -20)
    if tgt is not None and abs(L['I'] - tgt) > 0.5: flags.append(f"loudness {L['I']} vs target {tgt}")
    if L['TP'] > -1.0: flags.append(f"true peak {L['TP']} > -1 dBTP")
    if q['bands']['sub<40'] > -30: flags.append('low rumble (<40 Hz)')
    if q['bands']['5k-10k'] > -16 or q['bands']['>10k'] > -26: flags.append('bright/harsh top end')
    if q['bands']['2k-5k'] > -8: flags.append('strong 2-5 kHz (piercing)')
    if q['bump'][1] > 6 and q['bump'][2] > -24 and meta.get('mood') != 'chime':      # a peak that is both narrow AND loud (a chime IS one tone)
        flags.append(f'1/3-oct resonance {q["bump"]}')
    if q['noise']['hf_flat_frames_pct'] > 5: flags.append('noise-like HF frames')
    if q['clicks']['n_unexplained'] > 0: flags.append(f"{q['clicks']['n_unexplained']} unexplained HF spikes")
    if q['clicks']['n_d2_unexplained'] > 0: flags.append(f"{q['clicks']['n_d2_unexplained']} unexplained sample jumps")
    if q['end_rms_dbfs'] > -60: flags.append('does not end in silence')
    if q['longest_gap_s'] > 2.0: flags.append(f"{q['longest_gap_s']} s of near-silence (< -50 dBFS) inside the piece")
    if nc:
        if nc['out_of_key']: flags.append(f"{nc['out_of_key']} out-of-key notes")
        if nc['max_pcs'] > 6: flags.append(f"{nc['max_pcs']} pitch classes at once")
        if nc['mel_notes'] >= 6 and nc['mel_step_pct'] < 45: flags.append('melody mostly leaps')   # 1–5 isolated tones are not a melody
        if nc['mel_max_leap'] > 9: flags.append(f"melody leap {nc['mel_max_leap']} st")
        if nc['mel_strong_nct']: flags.append(f"{nc['mel_strong_nct']} strong-beat non-chord tones")
    q['flags'] = flags
    plot(path, x, meta, q, os.path.join(OUTDIR, os.path.basename(base) + '.png') if OUTDIR else base + '.png')
    return q


OUTDIR = None   # --out-dir <dir>: write png and reports there instead of next to the wav
TARGET = None   # --target -16.5: loudness target for a finished mix (default: the target in the wav's .json, else -20)


def main():
    global OUTDIR, TARGET
    args = sys.argv[1:]
    if '--out-dir' in args:
        i = args.index('--out-dir'); OUTDIR = args[i + 1]; del args[i:i + 2]; os.makedirs(OUTDIR, exist_ok=True)
    if '--target' in args:
        i = args.index('--target'); TARGET = float(args[i + 1]); del args[i:i + 2]
    files = [f for f in args if f.endswith('.wav')]
    res = [check(f) for f in files]
    outdir = OUTDIR or (os.path.dirname(os.path.abspath(files[0])) if files else '.')
    json.dump(res, open(os.path.join(outdir, 'qa_report.json'), 'w'), ensure_ascii=False, indent=1)
    lines = ['# 配樂品質檢查（全部是量測數據，沒有人耳試聽）', '',
             '| 檔案 | LUFS | TP dBTP | LRA | <40Hz | 5–10k | >10k | 1/3oct 突起（相對鄰帶 @頻率，該帶相對全頻） | HF 平坦度 | 不明尖峰 | 調外音 | 最多同時音 | 同時音級 | 旋律級進% | 最大跳進 | 強拍非和弦音 | 小二度摩擦 | 結尾 dBFS | 最長近無聲 s | 旗標 |',
             '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
    for q in res:
        nc = q['notes'] or {}
        lines.append('| {} | {} | {} | {} | {} | {} | {} | {} dB@{} ({}) | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |'.format(
            os.path.basename(q['file']), q['loud']['I'], q['loud']['TP'], q['loud']['LRA'], q['bands']['sub<40'], q['bands']['5k-10k'],
            q['bands']['>10k'], q['bump'][1], q['bump'][0], q['bump'][2], q['noise']['hf_flatness_median'], q['clicks']['n_unexplained'] + q['clicks']['n_d2_unexplained'],
            nc.get('out_of_key'), nc.get('max_poly'), nc.get('max_pcs'), nc.get('mel_step_pct'), nc.get('mel_max_leap'), nc.get('mel_strong_nct'),
            nc.get('mel_m2_rubs'), q['end_rms_dbfs'], q['longest_gap_s'], '; '.join(q['flags']) or 'ok'))
    open(os.path.join(outdir, 'qa_report.md'), 'w').write('\n'.join(lines) + '\n')
    for q in res:
        print(os.path.basename(q['file']), q['loud'], 'flags:', q['flags'] or 'ok')


if __name__ == '__main__':
    main()
