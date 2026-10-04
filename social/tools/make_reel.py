"""Turn a carousel folder (01.jpg..NN.jpg) into a 9:16 Instagram reel with original music."""
import glob, subprocess, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import music

def build(folder, out_mp4, style_idx):
    imgs = sorted(glob.glob(f"{folder}/*.jpg"))
    n = len(imgs)
    first, each, xf = 3.2, 2.6, 0.35
    durs = [first] + [each] * (n - 1)
    total = sum(durs) - xf * (n - 1)
    wav = out_mp4.replace(".mp4", ".wav")
    silent = style_idx < 0
    if not silent: music.make(music.STYLES[style_idx % len(music.STYLES)], total, wav)
    args = ["ffmpeg", "-y", "-loglevel", "error"]
    for img, d in zip(imgs, durs):
        args += ["-loop", "1", "-framerate", "30", "-t", f"{d}", "-i", img]
    if not silent: args += ["-i", wav]
    f = []
    for i in range(n):
        f.append(f"[{i}:v]split[a{i}][b{i}];"
                 f"[a{i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:2,eq=brightness=-0.18[bg{i}];"
                 f"[b{i}]scale=1080:-2[fg{i}];"
                 f"[bg{i}][fg{i}]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1[v{i}]")
    prev, off = "v0", 0.0
    for i in range(1, n):
        off += durs[i - 1] - xf
        trans = "slideleft" if i % 2 else "smoothleft"
        f.append(f"[{prev}][v{i}]xfade=transition={trans}:duration={xf}:offset={off:.3f}[x{i}]")
        prev = f"x{i}"
    args += ["-filter_complex", ";".join(f), "-map", f"[{prev}]"] + ([] if silent else ["-map", f"{n}:a"]) + [
             "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30",
             "-b:v", "3500k", "-maxrate", "4500k", "-bufsize", "9000k", "-g", "60",
] + (["-an"] if silent else ["-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-shortest"]) + ["-movflags", "+faststart", out_mp4]
    subprocess.run(args, check=True)
    if not silent: os.remove(wav)
    return total

if __name__ == "__main__":
    print(build(sys.argv[1], sys.argv[2], int(sys.argv[3])))
