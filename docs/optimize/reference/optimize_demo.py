#!/usr/bin/env python3
"""
MosaPack Optimize-layer prototype + faithful mosaic simulator.
- Mosaic sim mirrors builder-v7 mosaic.ts: square crop -> downsample to NxN ->
  auto-exposure luma stretch -> True Color style (sat 1.0, contrast 1.05) ->
  nearest palette by CIEDE2000 (same distance the engine uses).
- Demonstrates CURRENT path vs OPTIMIZE path (segment -> flatten bg -> portrait-fill
  crop -> mild face enhance) and reports how the tile budget is spent.
Drop-in for a real photo: set SRC=<path>, MASK=<path or None to auto via rembg>.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from skimage import color as skcolor

PALETTE = [
 ("Black","#1B1B1B"),("White","#F4F4F4"),("Light Gray","#BFC5CA"),("Dark Gray","#7A838C"),
 ("Tan","#D9C49F"),("Light Nougat","#E7C6B1"),("Reddish Brown","#7B3F00"),("Blue","#1653A4"),
 ("Medium Nougat","#CC8E68"),("Red","#C40000"),("Yellow","#F1D54E"),("Green","#589E61"),
 ("Very Light Gray","#DBE1E6"),("Medium Gray","#9CA3A8"),("Dark Brown","#4E2D1B"),("Orange","#E58E2A"),
 ("Dark Green","#2B5B3D"),("Light Blue","#7EAED6"),("Very Dark Gray","#4A4E52"),("Dark Tan","#C2B280"),
 ("Dark Red","#8B0000"),("Bright Red","#FF0000"),("Bright Green","#75B844"),("Sand Green","#8DA59B"),
 ("Magenta","#B3277E"),
]
def hex2rgb(h): h=h.lstrip('#'); return np.array([int(h[i:i+2],16) for i in (0,2,4)],float)
PAL_RGB = np.array([hex2rgb(h) for _,h in PALETTE])
PAL_LAB = skcolor.rgb2lab(PAL_RGB.reshape(1,-1,3)/255.0).reshape(-1,3)
PAL_NAME = [n for n,_ in PALETTE]
SUBJECT_NAMES = {"Tan","Light Nougat","Medium Nougat","Reddish Brown","Dark Brown","Dark Tan",
                 "Magenta","Red","Bright Red","Orange"}  # skin/hair/warm-accent proxies

SIZES = {6:16, 12:32, 18:48, 24:64}

def auto_exposure_style(arr):
    """arr float HxWx3 0..255. Mirror engine: luma stretch + True Color (sat 1.0, contrast 1.05)."""
    lum = 0.299*arr[...,0]+0.587*arr[...,1]+0.114*arr[...,2]
    lo,hi = lum.min(), lum.max(); rng=max(40.0,hi-lo)
    a=(arr-lo)/rng*255.0
    contr=1.05
    a=(a-128)*contr+128
    return np.clip(a,0,255)

def to_mosaic(img_rgb, N):
    """img_rgb: PIL Image. Returns NxN palette-index grid + counts."""
    small=img_rgb.resize((N,N), Image.BILINEAR)
    arr=np.asarray(small,float)[...,:3]
    arr=auto_exposure_style(arr)
    lab=skcolor.rgb2lab(arr.reshape(1,-1,3)/255.0).reshape(-1,3)
    # nearest palette by CIEDE2000
    d=np.stack([skcolor.deltaE_ciede2000(lab, np.tile(PAL_LAB[i],(lab.shape[0],1))) for i in range(len(PALETTE))],1)
    idx=d.argmin(1).reshape(N,N)
    return idx

def render_grid(idx, tile=18, gap=True):
    N=idx.shape[0]; g=2 if gap else 0
    out=Image.new("RGB",(N*tile,N*tile),(250,250,250))
    dr=ImageDraw.Draw(out)
    for y in range(N):
        for x in range(N):
            c=tuple(PAL_RGB[idx[y,x]].astype(int))
            dr.rectangle([x*tile,y*tile,(x+1)*tile-g,(y+1)*tile-g],fill=c)
    return out

def square_crop_center(img):
    w,h=img.size; s=min(w,h)
    return img.crop(((w-s)//2,(h-s)//2,(w-s)//2+s,(h-s)//2+s))

def portrait_fill_crop(img, mask, fill_frac=0.80):
    """Zoom-crop square so subject bbox fills fill_frac of the square."""
    m=np.asarray(mask)>127
    ys,xs=np.where(m)
    if len(xs)==0: return square_crop_center(img)
    x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
    cx,cy=(x0+x1)/2,(y0+y1)/2
    subj=max(x1-x0,y1-y0)
    side=int(min(img.size[0],img.size[1], subj/fill_frac))
    L=int(max(0,min(img.size[0]-side, cx-side/2)))
    T=int(max(0,min(img.size[1]-side, cy-side/2)))
    return img.crop((L,T,L+side,T+side))

def exposure_wb_fix(img, mask):
    """Backlight lift + gray-world white balance, applied to the SUBJECT only.
    Fixes muddy/dark faces on backlit shots before mosaic conversion."""
    a=np.asarray(img,float)
    m=np.asarray(mask.resize(img.size)).astype(float)/255.0
    sub=m>0.5
    if sub.sum()>50:
        r,g,b=a[...,0],a[...,1],a[...,2]
        # SKIN-anchored WB (not whole-subject): use only skin-like subject pixels,
        # so the teal shirt / pink headband don't skew the correction.
        skin=sub&(r>80)&(r>=g)&(g>=b)&((r-b)>10)&((r-b)<120)
        ref= skin if skin.sum()>200 else sub
        means=[a[...,c][ref].mean() for c in range(3)]
        gm=sum(means)/3.0
        for c in range(3):
            corr=gm/max(1.0,means[c]); corr=1+(corr-1)*0.6  # gentle
            a[...,c]=np.clip(a[...,c]*np.where(sub,corr,1.0),0,255)
        # gentle backlight lift on subject (gamma 0.82)
        lum=(0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2])/255.0
        gain=np.where(sub,(np.power(np.clip(lum,1e-3,1),0.82)/np.clip(lum,1e-3,1)),1.0)
        for c in range(3): a[...,c]=np.clip(a[...,c]*gain,0,255)
    return Image.fromarray(a.astype(np.uint8))

def optimize(img, mask, bg_name="Very Light Gray", fill_frac=0.80, enhance=True):
    """Optimize layer: exposure/WB fix -> flatten background -> portrait-fill -> enhance."""
    img=exposure_wb_fix(img, mask)
    # erode mask edge slightly to avoid a bg-colored halo fringe after downsample
    from PIL import ImageMorph
    mk=mask.resize(img.size).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(1))
    m=np.asarray(mk).astype(float)/255.0
    m3=np.dstack([m]*3)
    bg=np.ones_like(np.asarray(img,float))*hex2rgb(dict(PALETTE)[bg_name])
    comp=(np.asarray(img,float)*m3 + bg*(1-m3)).astype(np.uint8)
    out=Image.fromarray(comp)
    out=portrait_fill_crop(out, mask, fill_frac)
    if enhance:
        out=ImageEnhance.Contrast(out).enhance(1.10)
        out=ImageEnhance.Color(out).enhance(1.16)
        out=out.filter(ImageFilter.UnsharpMask(radius=2,percent=90,threshold=2))
    return out

# ---------- synthetic representative scene (subject-on-sunlit-foliage) ----------
def synth_scene(W=1500,H=2000, seed=7):
    rng=np.random.default_rng(seed)
    # sunlit green foliage background: green base + noise + bright bokeh
    base=np.zeros((H,W,3),float); base[...,1]=150; base[...,0]=90; base[...,2]=70
    base+=rng.normal(0,26,(H,W,3))
    bg=Image.fromarray(np.clip(base,0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))
    dr=ImageDraw.Draw(bg,"RGBA")
    for _ in range(120):
        r=int(rng.integers(20,90)); x=int(rng.integers(0,W)); y=int(rng.integers(0,H))
        b=int(rng.integers(160,240))
        dr.ellipse([x-r,y-r,x+r,y+r],fill=(b,255,b,40))
    bg=bg.filter(ImageFilter.GaussianBlur(6))
    scene=bg.copy(); dr=ImageDraw.Draw(scene)
    mask=Image.new("L",(W,H),0); md=ImageDraw.Draw(mask)
    # Representative loose framing: small subject, upper-center, big green margins
    # (mirrors the real photo + the 84%-green golden fixture).
    cx=int(W*0.52); topy=int(H*0.24); S=0.52  # scale of subject
    def E(box,fill): dr.ellipse(box,fill=fill); md.ellipse(box,fill=255)
    def R(box,fill): dr.rectangle(box,fill=fill); md.rectangle(box,fill=255)
    # short shoulders (teal shirt) — head-and-shoulders only
    E([cx-int(200*S*1.6), topy+int(430*S), cx+int(200*S*1.6), topy+int(760*S)],(70,200,175))
    # hair (auburn)
    E([cx-int(250*S), topy-int(40*S), cx+int(250*S), topy+int(470*S)],(150,80,45))
    # face (skin)
    E([cx-int(190*S), topy+int(60*S), cx+int(190*S), topy+int(520*S)],(224,178,150))
    # headband (hot pink)
    R([cx-int(200*S), topy+int(70*S), cx+int(200*S), topy+int(150*S)],(240,55,140))
    # eyes + smile (drawn on scene only; tiny at this scale)
    dr.ellipse([cx-int(95*S), topy+int(250*S), cx-int(45*S), topy+int(300*S)], fill=(60,90,80))
    dr.ellipse([cx+int(45*S), topy+int(250*S), cx+int(95*S), topy+int(300*S)], fill=(60,90,80))
    dr.arc([cx-int(90*S), topy+int(300*S), cx+int(90*S), topy+int(430*S)], 20,160, fill=(120,60,60), width=8)
    return scene, mask

def label(img, text, h=46):
    from PIL import ImageFont
    w=img.size[0]; strip=Image.new("RGB",(w,h),(20,20,20)); d=ImageDraw.Draw(strip)
    d.text((10,10),text,fill=(255,255,255))
    out=Image.new("RGB",(w,img.size[1]+h),(20,20,20)); out.paste(strip,(0,0)); out.paste(img,(0,h)); return out

def subject_share(idx):
    names=[PAL_NAME[i] for i in idx.flatten()]
    subj=sum(1 for n in names if n in SUBJECT_NAMES)
    return subj, idx.size, 100.0*subj/idx.size

if __name__=="__main__":
    import sys
    scene, mask = synth_scene()
    scene.save("/home/claude/demo_source.png");
    cur_crop=square_crop_center(scene)
    cur_mask=square_crop_center(mask)
    opt_img=optimize(scene, mask)
    # mask that matches the optimized (portrait-fill) crop
    flat_for_mask=Image.fromarray((np.asarray(mask)).astype(np.uint8))
    opt_mask=portrait_fill_crop(mask.convert("RGB"), mask, 0.80).convert("L")
    opt_img.save("/home/claude/demo_optimized_source.png")

    def mask_share(m_img,N):
        mm=np.asarray(m_img.resize((N,N),Image.BILINEAR))>127
        return 100.0*mm.sum()/mm.size

    DISP=288
    cols=[]
    print(f"{'size':>5} | {'tiles':>6} | {'CURRENT subject tiles':>22} | {'OPTIMIZED subject tiles':>24}")
    print("-"*66)
    for inch,N in SIZES.items():
        cur=to_mosaic(cur_crop,N); opt=to_mosaic(opt_img,N)
        cs=mask_share(cur_mask,N); os=mask_share(opt_mask,N)
        print(f'{str(inch)+chr(34):>5} | {N*N:6d} | {cs:20.0f}% | {os:22.0f}%')
        tile=max(4, DISP//N)
        cimg=render_grid(cur,tile).resize((DISP,DISP),Image.NEAREST)
        oimg=render_grid(opt,tile).resize((DISP,DISP),Image.NEAREST)
        col=Image.new("RGB",(DISP, DISP*2+80),(20,20,20))
        col.paste(label(cimg,f'{inch}"  CURRENT'),(0,0))
        col.paste(label(oimg,f'{inch}"  OPTIMIZED'),(0,DISP+40))
        cols.append(col)
    grid=Image.new("RGB",(sum(c.size[0] for c in cols)+10*(len(cols)+1), cols[0].size[1]+20),(20,20,20))
    x=10
    for c in cols: grid.paste(c,(x,10)); x+=c.size[0]+10
    grid.save("/home/claude/demo_comparison.png")
    print("\nsaved: demo_comparison.png, demo_source.png, demo_optimized_source.png")
