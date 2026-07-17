#!/usr/bin/env python3
"""Scenario robustness: degrade the real photo into common problem cases,
show the detector report fires and the pipeline self-adjusts. 18" renders."""
import numpy as np, json
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw
import optimize_demo as od, mp_pipeline as P
from real_render import saliency_crop

base=P.load("real.png")

def make_loose(img):
    # simulate far-away subject: shrink subject into a larger green frame
    W,H=img.size; canvas=Image.new("RGB",(int(W*1.9),int(H*1.9)))
    # fill with blurred green background sampled from corners
    bg=img.crop((0,0,W//3,H//3)).resize(canvas.size).filter(ImageFilter.GaussianBlur(25))
    canvas.paste(bg,(0,0))
    small=img.resize((int(W*0.62),int(H*0.62)))
    canvas.paste(small,((canvas.size[0]-small.size[0])//2,(canvas.size[1]-small.size[1])//3))
    return canvas

def make_dark(img):  return ImageEnhance.Brightness(img).enhance(0.5)
def make_lowres(img):
    W,H=img.size; return img.resize((520,int(520*H/W))).resize((W,H))
def make_cast(img):
    a=np.asarray(img,float); a[...,1]=np.clip(a[...,1]*1.22,0,255); a[...,2]=np.clip(a[...,2]*0.9,0,255)
    return Image.fromarray(a.astype(np.uint8))

SCEN={'loose framing':make_loose,'underexposed/backlit':make_dark,'low-resolution':make_lowres,'green color cast':make_cast}
N=48; DISP=300; cols=[]
for name,fn in SCEN.items():
    safe=name.replace(" ","_").replace("/","-")
    path=f"/home/claude/scen_{safe}.png"
    v=fn(base); v.save(path)
    P_=P
    mask=P_.segment(v); fbox,nf=P_.face_box(v); rep=P_.analyze(v,mask,fbox,nf)
    # optimized 18"
    o=P_.optimize_photo(path,18)
    cur=saliency_crop(v)
    cm=od.to_mosaic(cur,N); om=od.to_mosaic(o['optimized_input'],N)
    flags=[k for k in['backlit','blurry','low_contrast','green_cast','low_res_for_24'] if str(rep.get(k))=='True' or rep.get(k) is True]
    print(f"[{name}] fill={rep['subject_fill_pct']}% faces={rep['faces']} flags={flags}")
    tile=max(4,DISP//N)
    ci=od.render_grid(cm,tile).resize((DISP,DISP),Image.NEAREST)
    oi=od.render_grid(om,tile).resize((DISP,DISP),Image.NEAREST)
    col=Image.new("RGB",(DISP,DISP*2+120),(20,20,20)); dr=ImageDraw.Draw(col)
    col.paste(od.label(ci,f'{name}  — CURRENT'),(0,0))
    col.paste(od.label(oi,f'{name}  — OPTIMIZED'),(0,DISP+46))
    dr.text((6,DISP*2+96),("detected: "+(", ".join(flags) if flags else "clean")),fill=(180,220,180))
    cols.append(col)
grid=Image.new("RGB",(sum(c.size[0] for c in cols)+10*(len(cols)+1),cols[0].size[1]+20),(20,20,20))
x=10
for c in cols: grid.paste(c,(x,10)); x+=c.size[0]+10
grid.save("/home/claude/scenario_sheet.png"); print("saved scenario_sheet.png")
