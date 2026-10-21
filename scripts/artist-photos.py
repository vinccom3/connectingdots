# usage: SRC=<folder with originals>/ python3 scripts/artist-photos.py public/assets/artists
# One look for every artist photo: same 4:5 crop at the same face scale, toned monochrome, soft grain.
import sys, numpy as np
from PIL import Image, ImageFilter
import os
U=os.environ.get('SRC', 'photos-src/')  # folder with the originals, not in the repo
OUT=sys.argv[1]
# eye midpoint (x, y) and eye-to-chin distance, measured in source pixels
SRC={
 'amrita': ('d9d74e42-image.jpg', 979, 676, 248),
 'reirei': ('88a397e3-image.jpg', 1056, 889, 270),
 '9oases': ('492315b6-image.jpg', 818, 824, 309),
 'hasert': ('b10d5c2a-image.jpg', 1170, 667, 268),
}
K=6.0; EYE=.40; W,H=800,1000
rng=np.random.default_rng(7)
# Toned into the site instead of hard black and white: shadows sit on the background violet-black,
# highlights stop at the warm off-white of the text, contrast stays soft.
SHADOW=np.array([18,15,28],np.float32)/255    # a touch above --bg #07060c, so faces never drown
LIGHT=np.array([212,206,198],np.float32)/255  # under --fg #f2eee6, so the photo never outshines the type
def curve(x):
    x=np.clip(x,0,1)
    s=x*x*(3-2*x)
    return .78*x+.22*s                         # barely an S: tone, not punch
for name,(f,ex,ey,d) in SRC.items():
    im=Image.open(U+f).convert('RGB')
    ch=d*K; cw=ch*.8
    box=(ex-cw/2, ey-ch*EYE, ex+cw/2, ey-ch*EYE+ch)
    box=tuple(int(round(v)) for v in box)
    assert box[0]>=0 and box[1]>=0 and box[2]<=im.width and box[3]<=im.height, (name, box, im.size)
    im=im.crop(box).resize((W,H), Image.LANCZOS)
    a=np.asarray(im).astype(np.float32)/255
    L=a[...,0]*.36+a[...,1]*.50+a[...,2]*.14                 # panchromatic film, skin a touch brighter
    lo,hi=np.percentile(L,.5),np.percentile(L,99.8)
    L=(L-lo)/max(hi-lo,1e-3)
    L=curve(L)
    # halation-ish softness: a little of a blurred copy on top
    soft=np.asarray(Image.fromarray((L*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)/255
    L=L*.86+np.maximum(L,soft)*.14
    # vignette
    yy,xx=np.mgrid[0:H,0:W]; r=np.sqrt(((xx-W/2)/(W*.62))**2+((yy-H*.44)/(H*.62))**2)
    L*=1-.30*np.clip(r-.5,0,1)**1.3
    # grain: clumped, strongest in the mid-tones
    g=rng.normal(0,1,(H,W)).astype(np.float32)
    g=np.asarray(Image.fromarray(((g*40)+128).clip(0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7))).astype(np.float32)/255-.5
    L+=g*.10*(.35+1.3*L*(1-L))
    L=np.clip(L,0,1)[...,None]
    rgb=SHADOW+(LIGHT-SHADOW)*L
    out=Image.fromarray((rgb*255).clip(0,255).astype(np.uint8),'RGB')
    out.save(f'{OUT}/{name}.jpg', quality=82, optimize=True, progressive=True)
    print(name, box)
