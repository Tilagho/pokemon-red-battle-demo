"""Generates simple PLACEHOLDER opponent sprites (28x28 drawn, scaled 2x to 56x56).
Replace assets/sprites/charmander_placeholder.png / squirtle_placeholder.png with real art later."""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sprites')
K = (16, 16, 24, 255)

def outline(img):
    w, h = img.size
    px = img.load()
    src = img.copy().load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] == 0:
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] and src[nx, ny] != K:
                        px[x, y] = K
                        break
    return img

def save(img, name):
    img = outline(img).resize((56, 56), Image.NEAREST)
    img.save(os.path.join(OUT, name))

# --- Charmander-ish (fire lizard, faces left) ---
im = Image.new('RGBA', (28, 28), (0,0,0,0)); d = ImageDraw.Draw(im)
O=(240,128,48,255); C=(248,216,120,255); R=(232,48,32,255); Y=(255,232,64,255)
d.line([(17,21),(21,19),(23,15),(23,11)], fill=O, width=2)          # tail
d.ellipse([20,4,26,11], fill=R); d.ellipse([21,6,25,11], fill=Y)    # flame
d.ellipse([8,12,19,24], fill=O)                                      # body
d.ellipse([10,15,16,23], fill=C)                                     # belly
d.ellipse([4,2,15,12], fill=O)                                       # head
d.rectangle([9,23,11,25], fill=O); d.rectangle([15,23,17,25], fill=O)# feet
d.rectangle([7,15,9,16], fill=O)                                     # arm
d.point([(7,6),(7,7)], fill=K); d.point([(6,6)], fill=(255,255,255,255))  # eye
d.point([(5,10),(6,10),(7,10)], fill=K)                              # mouth
save(im, 'charmander_placeholder.png')

# --- Squirtle-ish (water turtle, faces left) ---
im = Image.new('RGBA', (28, 28), (0,0,0,0)); d = ImageDraw.Draw(im)
B=(104,176,232,255); S=(176,104,48,255); C=(240,224,152,255); W=(255,255,255,255)
d.ellipse([18,14,25,20], fill=B); d.ellipse([20,15,23,18], fill=(0,0,0,0))  # curly tail
d.ellipse([9,11,22,25], fill=S)                                      # shell
d.ellipse([8,13,16,24], fill=C)                                      # belly plate
d.line([(8,18),(15,18)], fill=(200,176,104,255))
d.ellipse([3,2,15,13], fill=B)                                       # head
d.rectangle([9,23,11,25], fill=B); d.rectangle([16,23,18,25], fill=B)
d.rectangle([5,15,8,17], fill=B)                                     # arm
d.point([(6,6),(6,7),(7,7)], fill=(160,40,40,255)); d.point([(7,6)], fill=W)
d.point([(4,10),(5,11),(6,11)], fill=K)
save(im, 'squirtle_placeholder.png')
print('ok')
