from PIL import Image
import os

src = os.path.join(os.path.dirname(__file__), "..", "public", "nap-orbit-logo.png")
out_dir = os.path.join(os.path.dirname(__file__), "..", "public")
im = Image.open(src).convert("RGBA")
w, h = im.size
px = im.load()

def is_orbit_color(r, g, b, a):
    if a < 40:
        return False
    # skip white / near-white
    if r > 230 and g > 230 and b > 230:
        return False
    # skip black / dark gray text
    if r < 55 and g < 55 and b < 55:
        return False
    # cyan → purple orbit mark: strong blue or magenta, not neutral gray
    chroma = max(r, g, b) - min(r, g, b)
    if chroma < 40:
        return False
    # cyan/blue family or purple/magenta family
    cyanish = b > 120 and g > 80 and r < 200
    purplish = b > 100 and r > 80 and g < 180
    return cyanish or purplish

xs, ys = [], []
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if is_orbit_color(r, g, b, a):
            xs.append(x)
            ys.append(y)

if not xs:
    raise SystemExit("no O found")

minx, maxx = min(xs), max(xs)
miny, maxy = min(ys), max(ys)
print("bbox", minx, miny, maxx, maxy, "size", maxx - minx + 1, maxy - miny + 1)
print("pixels", len(xs))

# Prefer a tight square around the O (orbit ring extends slightly past circle)
cx = (minx + maxx) / 2
cy = (miny + maxy) / 2
half = max(maxx - minx, maxy - miny) / 2 + 6
minx = max(0, int(cx - half))
miny = max(0, int(cy - half))
maxx = min(w - 1, int(cx + half))
maxy = min(h - 1, int(cy + half))

crop = im.crop((minx, miny, maxx + 1, maxy + 1))
# Make true transparent bg: turn near-white to alpha 0
pixels = crop.load()
cw, ch = crop.size
for y in range(ch):
    for x in range(cw):
        r, g, b, a = pixels[x, y]
        if r > 245 and g > 245 and b > 245:
            pixels[x, y] = (255, 255, 255, 0)

side = max(cw, ch)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(crop, ((side - cw) // 2, (side - ch) // 2), crop)

sq.save(os.path.join(out_dir, "favicon-source.png"))
for size, name in [
    (16, "favicon-16x16.png"),
    (32, "favicon-32x32.png"),
    (48, "favicon-48x48.png"),
    (180, "apple-touch-icon.png"),
    (192, "android-chrome-192x192.png"),
    (512, "android-chrome-512x512.png"),
]:
    sq.resize((size, size), Image.Resampling.LANCZOS).save(os.path.join(out_dir, name))

ico_sizes = [(16, 16), (32, 32), (48, 48)]
ico_imgs = [sq.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
ico_imgs[0].save(os.path.join(out_dir, "favicon.ico"), format="ICO", sizes=ico_sizes)
print("done side=", side, "crop=", cw, ch)
