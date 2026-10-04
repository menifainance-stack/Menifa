"""Procedural, fully original background tracks for reels (no third-party samples)."""
import numpy as np, wave, sys

SR = 48000

def env(n, a=0.005, d=0.2):
    t = np.arange(n) / SR
    e = np.minimum(t / a, 1.0) * np.exp(-t / d)
    return e

def kick(n):
    t = np.arange(n) / SR
    f = 120 * np.exp(-t * 30) + 45
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9)

def snare(n, rng):
    t = np.arange(n) / SR
    return (rng.standard_normal(n) * 0.6 * np.exp(-t * 22) + np.sin(2*np.pi*190*t) * 0.4 * np.exp(-t * 30))

def hat(n, rng):
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    x = np.diff(np.concatenate([[0], x]))  # crude high-pass
    return x * np.exp(-t * 70) * 0.35

def note(freq, n, kind="saw", decay=0.4):
    t = np.arange(n) / SR
    if kind == "saw":
        x = sum(np.sin(2*np.pi*freq*k*t)/k for k in range(1, 8))
    elif kind == "square":
        x = sum(np.sin(2*np.pi*freq*k*t)/k for k in range(1, 9, 2))
    else:
        x = np.sin(2*np.pi*freq*t) + 0.3*np.sin(2*np.pi*freq*2*t)
    return x * env(n, 0.01, decay)

def midi(m): return 440 * 2 ** ((m - 69) / 12)

STYLES = [
    # (bpm, root midi, progression (semitone offsets of chord roots), minor?)
    dict(bpm=104, root=57, prog=[0, -4, -7, -2], minor=True, seed=1),   # A minor, chill-pop
    dict(bpm=118, root=60, prog=[0, 7, 9, 5], minor=False, seed=2),     # C major, upbeat
    dict(bpm=96,  root=62, prog=[0, -2, -5, -7], minor=True, seed=3),   # D minor, lo-fi
    dict(bpm=124, root=55, prog=[0, 5, 7, 3], minor=False, seed=4),     # G, energetic
]

def make(style, seconds, path):
    rng = np.random.default_rng(style["seed"])
    n = int(seconds * SR); out = np.zeros(n + 6 * SR)
    beat = 60 / style["bpm"]; step = beat / 2
    third = 3 if style["minor"] else 4
    mel_scale = [0, 2, third, 5, 7, 9 if not style["minor"] else 8, 12]
    duck = np.ones(n + 6 * SR)
    t = 0.0; i = 0
    while t < seconds:
        s = int(t * SR)
        bar = int(t / (beat * 4)); ch = style["prog"][bar % len(style["prog"])]
        r = style["root"] + ch
        # drums
        if i % 2 == 0:
            k = kick(int(0.4 * SR)); out[s:s+len(k)] += k * 0.9
            d = np.linspace(0.35, 1, int(0.18 * SR)); duck[s:s+len(d)] = np.minimum(duck[s:s+len(d)], d)
        if i % 4 == 2:
            sn = snare(int(0.25 * SR), rng); out[s:s+len(sn)] += sn * 0.45
        h = hat(int(0.06 * SR), rng); out[s:s+len(h)] += h * (0.9 if i % 2 else 0.5)
        # bass on every beat
        if i % 2 == 0:
            b = note(midi(r - 12), int(beat * SR), "square", 0.25); out[s:s+len(b)] += b * 0.22
        # chord pad each bar
        if i % 8 == 0:
            L = int(beat * 4 * SR)
            for iv in (0, third, 7):
                c = note(midi(r + iv), L, "saw", 1.6); out[s:s+L] += c * 0.05
        # melody pluck
        if rng.random() < 0.55:
            m = r + 12 + mel_scale[rng.integers(len(mel_scale))]
            p = note(midi(m), int(step * 1.6 * SR), "sine", 0.18); out[s:s+len(p)] += p * 0.16
        t += step; i += 1
    out = out[:n] * duck[:n]
    fade = int(1.2 * SR); out[-fade:] *= np.linspace(1, 0, fade)
    out[:int(0.05*SR)] *= np.linspace(0, 1, int(0.05*SR))
    out = out / (np.max(np.abs(out)) + 1e-9) * 0.85
    pcm = (np.stack([out, np.roll(out, 240)], 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

if __name__ == "__main__":
    idx, secs, path = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3]
    make(STYLES[idx % len(STYLES)], secs, path)
