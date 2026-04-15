"""Remove green screen (chroma key) from image, output transparent PNG."""
import sys
from PIL import Image

def key_out_green(in_path, out_path, tolerance=80):
    img = Image.open(in_path).convert('RGBA')
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if g > 150 and g > r + tolerance and g > b + tolerance:
                pixels[x, y] = (0, 0, 0, 0)
            elif g > r and g > b and (g - max(r, b)) > 40:
                fade = max(0, 255 - (g - max(r, b)) * 4)
                pixels[x, y] = (r, g, b, fade)
    img.save(out_path, 'PNG')
    print(f'OK: {out_path}')

if __name__ == '__main__':
    key_out_green(sys.argv[1], sys.argv[2])
