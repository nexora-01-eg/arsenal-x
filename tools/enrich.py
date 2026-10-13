"""Phase 19 — deterministic enrichment worker (READ-ONLY on the arsenal).

Extracts representative frames + measured visual/audio descriptors and
writes enrichment records + preview thumbnails into the Arsenal-X project
data dir. Original assets are never modified.

Run with the Al-Montier venv python (PyAV/Pillow/numpy/cv2):
  python tools/enrich.py --limit-video 80 --limit-image 300 --limit-sfx 150
  python tools/enrich.py --resume            # continue from checkpoint
  python tools/enrich.py --rebuild           # discard cache, start over

Design: deterministic sampling, per-asset failure isolation, JSONL records,
checkpoint resume, stable enrichment identity (path+size+mtime+version).
semantic_status is PARTIAL at best (measured descriptors only); nothing is
ever labeled ENRICHED without a real semantic analyzer.
"""
import argparse
import hashlib
import json
import os
import sys
import time

ANALYZER_VERSION = "enrich-1.0.0"
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data", "enrichment")
RECORDS = os.path.join(DATA, "records.jsonl")
CHECKPOINT = os.path.join(DATA, "checkpoint.json")
FRAMES = os.path.join(DATA, "frames")

ARSENAL = os.environ.get(
    "ARSENAL_ROOT", r"F:\Arsenal")
VIDEO_ROOTS = ["MH - محتوى بصري/02-فيديو", "05_VideoAssets"]
IMAGE_ROOTS = ["MH - محتوى بصري/01-صور"]
SFX_ROOTS = ["مؤثرات صوتية", "_projects/sfx-transitions-pack",
             "موسيقى"]
VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
AUDIO_EXTS = {".mp3", ".wav", ".ogg", ".flac"}
FRAME_FRACS = (0.25, 0.5, 0.75)


def fingerprint(path, size, mtime):
    h = hashlib.sha256()
    h.update(path.encode("utf-8", "ignore"))
    h.update(str(size).encode())
    h.update(str(mtime).encode())
    h.update(ANALYZER_VERSION.encode())
    return h.hexdigest()[:32]


def load_checkpoint():
    try:
        return json.load(open(CHECKPOINT, encoding="utf-8"))
    except (OSError, ValueError):
        return {"version": ANALYZER_VERSION, "done": {}}


def save_checkpoint(cp):
    tmp = CHECKPOINT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cp, f, ensure_ascii=False)
    os.replace(tmp, CHECKPOINT)


def iter_targets():
    import collections
    vids, imgs, auds = [], [], []
    for root in VIDEO_ROOTS + IMAGE_ROOTS + SFX_ROOTS:
        base = os.path.join(ARSENAL, root)
        if not os.path.isdir(base):
            continue
        for dp, _, fns in os.walk(base):
            for fn in sorted(fns):
                ext = os.path.splitext(fn)[1].lower()
                p = os.path.join(dp, fn)
                rel = os.path.relpath(p, ARSENAL)
                if ext in VIDEO_EXTS:
                    vids.append(rel)
                elif ext in IMAGE_EXTS and root in IMAGE_ROOTS:
                    imgs.append(rel)
                elif ext in AUDIO_EXTS and root in SFX_ROOTS:
                    auds.append(rel)
    return sorted(vids), sorted(imgs), sorted(auds)


def frame_descriptors(img_small):
    import cv2
    import numpy as np
    g = cv2.cvtColor(img_small, cv2.COLOR_RGB2GRAY)
    mean = img_small.reshape(-1, 3).mean(axis=0)
    brightness = float(g.mean() / 255.0)
    hsv = cv2.cvtColor(img_small, cv2.COLOR_RGB2HSV)
    saturation = float(hsv[:, :, 1].mean() / 255.0)
    edges = cv2.Canny(g, 100, 200)
    edge_density = float((edges > 0).mean())
    sharpness = float(cv2.Laplacian(g, cv2.CV_64F).var())
    # palette: 2-bit per channel buckets, top 3
    q = (img_small // 85).reshape(-1, 3)
    keys, counts = np.unique([int(r) * 1000000 + int(gg) * 1000 + int(b)
                              for r, gg, b in q], return_counts=True)
    top = sorted(zip(counts, keys), reverse=True)[:3]
    palette = [f"#{int(k // 1000000) * 85:02x}{int((k // 1000) % 1000) * 85:02x}"
               f"{int(k % 1000) * 85:02x}" for _, k in top]
    r_, g_, b_ = [float(x) for x in mean]
    return {
        "brightness": round(brightness, 3),
        "saturation": round(saturation, 3),
        "edge_density": round(edge_density, 4),
        "sharpness": round(sharpness, 1),
        "mean_rgb": [round(r_, 1), round(g_, 1), round(b_, 1)],
        "palette": palette,
        "dark": bool(brightness < 0.25),
        "bright": bool(brightness > 0.75),
        "blue_dominant": bool(b_ > r_ * 1.15 and b_ > g_ * 1.15),
        "warm": bool(r_ > b_ * 1.15),
    }


def dhash(g):
    import cv2
    small = cv2.resize(g, (9, 8), interpolation=cv2.INTER_LINEAR)
    bits = (small[:, 1:] > small[:, :-1]).flatten()
    return "".join("1" if b else "0" for b in bits)


def enrich_video(rel, thumb_dir):
    import av
    import cv2
    import numpy as np
    from PIL import Image
    p = os.path.join(ARSENAL, rel)
    c = av.open(p)
    try:
        vs = next(s for s in c.streams if s.type == "video")
        dur = (c.duration or 0) / 1e6
        meta = {"duration": round(dur, 3),
                "width": vs.width, "height": vs.height,
                "fps": round(float(vs.average_rate), 3) if vs.average_rate else None,
                "codec": vs.codec_context.name if vs.codec_context else "",
                "audio_present": any(s.type == "audio" for s in c.streams)}
        frames = []
        prev = None
        targets = sorted(dur * f for f in FRAME_FRACS)
        ti = 0
        for frame in c.decode(vs):
            ft = float(frame.time) if frame.time is not None else -1.0
            while ti < len(targets) and ft >= targets[ti] - 0.05:
                got = frame.to_ndarray(format="rgb24")
                small = cv2.resize(got, (160, 90),
                                   interpolation=cv2.INTER_AREA)
                desc = frame_descriptors(small)
                g = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
                desc["dhash"] = dhash(g)
                if prev is not None:
                    desc["delta_prev"] = round(float(np.abs(
                        g.astype(int) - prev.astype(int)).mean() / 255.0), 4)
                prev = g
                im = Image.fromarray(got)
                im.thumbnail((320, 320))
                fp = os.path.join(thumb_dir, f"{len(frames)}.jpg")
                im.save(fp, quality=80)
                frames.append({"frac": FRAME_FRACS[ti],
                               "t": round(targets[ti], 2),
                               "thumb": os.path.relpath(fp, DATA), **desc})
                ti += 1
                if ti >= len(targets):
                    break
            if ti >= len(targets):
                break
        # aggregate evidence
        import statistics
        agg = {}
        if frames:
            agg["brightness_med"] = round(statistics.median(
                f["brightness"] for f in frames), 3)
            agg["dark_frames"] = sum(1 for f in frames if f["dark"])
            agg["static"] = all(f.get("delta_prev", 1) < 0.02
                                for f in frames[1:]) if len(frames) > 1 else None
        return {"kind": "video", "technical": meta, "frames": frames,
                "aggregate": agg}
    finally:
        c.close()


def enrich_image(rel, thumb_dir):
    import cv2
    from PIL import Image
    p = os.path.join(ARSENAL, rel)
    with Image.open(p) as im:
        im.load()
        meta = {"width": im.width, "height": im.height,
                "format": im.format or "", "mode": im.mode,
                "alpha": bool(im.mode in ("RGBA", "LA", "PA"))}
        rgb = im.convert("RGB").resize((160, 160))
        import numpy as np
        desc = frame_descriptors(np.asarray(rgb))
        im.thumbnail((320, 320))
        fp = os.path.join(thumb_dir, "thumb.jpg")
        im.convert("RGB").save(fp, quality=80)
        thumb_rel = os.path.relpath(fp, DATA)
    return {"kind": "image", "technical": meta, "descriptors": desc,
            "thumb": thumb_rel}


def enrich_audio(rel):
    import av
    import numpy as np
    p = os.path.join(ARSENAL, rel)
    c = av.open(p)
    try:
        astream = next(s for s in c.streams if s.type == "audio")
        cc = astream.codec_context
        res = av.AudioResampler(format="s16", layout="mono", rate=8000)
        blocks, total = [], 0.0
        for frame in c.decode(astream):
            for rf in res.resample(frame) or []:
                a = np.frombuffer(bytes(rf.planes[0]),
                                  dtype=np.int16).astype(np.float32) / 32768.0
                blocks.append(a)
                total += len(a) / 8000.0
                if total >= 30.0:
                    break
            if total >= 30.0:
                break
        x = np.concatenate(blocks) if blocks else np.zeros(1, dtype=np.float32)
        rms = float(np.sqrt((x ** 2).mean()))
        zc = float(((x[1:] >= 0) != (x[:-1] >= 0)).mean())
        win = x[:80000]
        spec = np.abs(np.fft.rfft(win * np.hanning(len(win))))
        freqs = np.fft.rfftfreq(len(win), 1 / 8000.0)
        centroid = float((spec * freqs).sum() / max(spec.sum(), 1e-9))
        w = 4000
        nw = max(len(x) // w, 1)
        env = np.array([np.sqrt((x[i * w:(i + 1) * w] ** 2).mean())
                        for i in range(nw)])
        dyn = float(env.std() / max(env.mean(), 1e-9))
        dur = (c.duration or 0) / 1e6
        labels = []
        if dur <= 5.0 and dyn > 0.8:
            labels.append("transient_heavy")
        if dur > 60.0:
            labels.append("longform")
        return {"kind": "audio",
                "technical": {"duration": round(dur, 3),
                              "codec": cc.name if cc else "",
                              "sample_rate": cc.sample_rate if cc else None,
                              "channels": cc.channels if cc else None},
                "descriptors": {"rms": round(rms, 4),
                                "peak": round(float(np.abs(x).max()), 3),
                                "zcr": round(zc, 4),
                                "centroid_hz": round(centroid, 1),
                                "dynamics": round(dyn, 3)},
                "labels": labels}
    finally:
        c.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit-video", type=int, default=80)
    ap.add_argument("--limit-image", type=int, default=300)
    ap.add_argument("--limit-sfx", type=int, default=150)
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--rebuild", action="store_true")
    args = ap.parse_args()
    os.makedirs(DATA, exist_ok=True)
    os.makedirs(FRAMES, exist_ok=True)
    if args.rebuild:
        for f in (RECORDS, CHECKPOINT):
            if os.path.exists(f):
                os.remove(f)
    cp = load_checkpoint()
    if cp.get("version") != ANALYZER_VERSION:
        cp = {"version": ANALYZER_VERSION, "done": {}}
    vids, imgs, auds = iter_targets()
    jobs = ([("video", r) for r in vids[:args.limit_video]] +
            [("image", r) for r in imgs[:args.limit_image]] +
            [("audio", r) for r in auds[:args.limit_sfx]])
    print(f"pool: {len(vids)}v/{len(imgs)}i/{len(auds)}a; "
          f"jobs this run: {len(jobs)}", flush=True)
    done = ok = failed = skipped = 0
    out = open(RECORDS, "a", encoding="utf-8")
    t0 = time.time()
    try:
        for kind, rel in jobs:
            p = os.path.join(ARSENAL, rel)
            try:
                st = os.stat(p)
            except OSError as e:
                out.write(json.dumps(
                    {"relPath": rel, "status": "failed",
                     "error": f"stat: {e}",
                     "semantic_status": "UNKNOWN"}, ensure_ascii=False) + "\n")
                failed += 1
                continue
            fp = fingerprint(rel, st.st_size, int(st.st_mtime))
            prev = cp["done"].get(rel)
            if prev and prev.get("fingerprint") == fp:
                skipped += 1
                continue
            tdir = os.path.join(FRAMES, fp)
            os.makedirs(tdir, exist_ok=True)
            try:
                if kind == "video":
                    body = enrich_video(rel, tdir)
                elif kind == "image":
                    body = enrich_image(rel, tdir)
                else:
                    body = enrich_audio(rel)
                rec = {"relPath": rel, "status": "ok",
                       "analyzer": ANALYZER_VERSION,
                       "fingerprint": fp,
                       "enrichment_id": f"enr-{fp[:16]}",
                       "size": st.st_size,
                       "semantic_status": "PARTIAL",
                       "semantic_labels": [],
                       **body}
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                cp["done"][rel] = {"fingerprint": fp,
                                   "enrichment_id": rec["enrichment_id"]}
                ok += 1
            except Exception as e:  # failure isolation per asset
                out.write(json.dumps(
                    {"relPath": rel, "status": "failed",
                     "error": f"{type(e).__name__}: {str(e)[:200]}",
                     "analyzer": ANALYZER_VERSION, "fingerprint": fp,
                     "semantic_status": "UNKNOWN"}, ensure_ascii=False) + "\n")
                failed += 1
            done += 1
            if done % 25 == 0:
                save_checkpoint(cp)
                print(f"  {done}/{len(jobs)} ok={ok} failed={failed} "
                      f"skipped={skipped} {time.time()-t0:.0f}s", flush=True)
    finally:
        out.close()
        save_checkpoint(cp)
    print(f"DONE jobs={len(jobs)} ok={ok} failed={failed} skipped={skipped} "
          f"{time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
