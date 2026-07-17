#!/usr/bin/env python3
"""Real-photo render: current engine (saliency auto-crop) vs Optimize layer
(rembg segmentation -> flatten bg -> portrait-fill -> enhance), at 6/12/18/24"."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from skimage import color as skcolor
import optimize_demo as od   # reuse palette, to_mosaic, render_grid, label, SIZES

SRC="real.png"

def saliency_crop(img):
    """Mirror mosaic.ts computeSaliency + autoCrop (scale 1): center square on
    edge-energy centroid with skin bonus + mild center prior."""
    N=48
    small=img.resize((N,N),Image.BILINEAR); d=np.asarray(small,float)
    lum=0.299*d[...,0]+0.587*d[...,1]+0.114*d[...,2]
    w=np.zeros((N,N))
    for y in range(1,N-1):
        for x in range(1,N-1):
            gx=lum[y,x+1]-lum[y,x-1]; gy=lum[y+1,x]-lum[y-1,x]
            e=np.hypot(gx,gy)
            r,g,b=d[y,x]
            if r>90 and r>g and g>b and 18<r-b<130: e*=1.9
            cd=np.hypot(x/N-0.5,y/N-0.5); e*=1-cd*0.7
            w[y,x]=e
    sw=w.sum()
    cx=(w*np.arange(N)[None,:]).sum()/sw/N
    cy=(w*np.arange(N)[:,None]).sum()/sw/N
    W,H=img.size; side=min(W,H)
    L=int(max(0,min(W-side, cx*W-side/2))); T=int(max(0,min(H-side, cy*H-side/2)))
    return img.crop((L,T,L+side,T+side))

def segment(img):
    """Offline subject mask via GrabCut, initialized from a saliency-derived box."""
    import cv2
    full=img
    scale=720.0/max(img.size)
    img=img.resize((int(img.size[0]*scale),int(img.size[1]*scale)),Image.BILINEAR)
    arr=np.asarray(img)[...,:3][:,:,::-1].copy()  # RGB->BGR
    H,W=arr.shape[:2]
    # saliency centroid to place the init rect
    N=48; small=img.resize((N,N),Image.BILINEAR); d=np.asarray(small,float)
    lum=0.299*d[...,0]+0.587*d[...,1]+0.114*d[...,2]
    gy,gx=np.gradient(lum); e=np.hypot(gx,gy)
    r,g,b=d[...,0],d[...,1],d[...,2]
    skin=(r>90)&(r>g)&(g>b)&((r-b)>18)&((r-b)<130); e=e*np.where(skin,1.9,1.0)
    ys,xs=np.mgrid[0:N,0:N]; sw=e.sum()
    cx=(e*xs).sum()/sw/N; cy=(e*ys).sum()/sw/N
    # rect: generous box around subject (portrait, upper-center)
    bw,bh=int(W*0.66),int(H*0.72)
    L=int(np.clip(cx*W-bw/2,0,W-bw)); T=int(np.clip(cy*H-bh*0.42,0,H-bh))
    rect=(L,T,bw,bh)
    mask=np.zeros((H,W),np.uint8); bgd=np.zeros((1,65),np.float64); fgd=np.zeros((1,65),np.float64)
    cv2.grabCut(arr,mask,rect,bgd,fgd,5,cv2.GC_INIT_WITH_RECT)
    m=np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
    m=cv2.medianBlur(m,7)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    return Image.fromarray(m).resize(full.size,Image.BILINEAR).filter(ImageFilter.GaussianBlur(3))

def mask_share(mask_img,N):
    mm=np.asarray(mask_img.resize((N,N),Image.BILINEAR))>110
    return 100.0*mm.sum()/mm.size

if __name__=="__main__":
    img=Image.open(SRC).convert("RGB")
    # CURRENT: saliency auto-crop (engine default)
    cur=saliency_crop(img); cur_mask_full=None
    # segmentation (real)
    mask=segment(img)
    mask.save("/home/claude/real_mask.png")
    cur_mask=saliency_crop(mask.convert("RGB")).convert("L")
    # OPTIMIZED
    opt=od.optimize(img, mask, bg_name="Very Light Gray", fill_frac=0.82)
    opt.save("/home/claude/real_optimized_source.png")
    opt_mask=od.portrait_fill_crop(mask.convert("RGB"), mask, 0.82).convert("L")

    DISP=300; cols=[]
    print(f"{'size':>5} | {'tiles':>6} | {'CURRENT subj%':>14} | {'OPTIMIZED subj%':>16}")
    print("-"*52)
    for inch,N in od.SIZES.items():
        cm=od.to_mosaic(cur,N); om=od.to_mosaic(opt,N)
        cs=mask_share(cur_mask,N); os=mask_share(opt_mask,N)
        print(f'{str(inch)+chr(34):>5} | {N*N:6d} | {cs:13.0f}% | {os:15.0f}%')
        tile=max(4,DISP//N)
        ci=od.render_grid(cm,tile).resize((DISP,DISP),Image.NEAREST)
        oi=od.render_grid(om,tile).resize((DISP,DISP),Image.NEAREST)
        col=Image.new("RGB",(DISP,DISP*2+90),(20,20,20))
        col.paste(od.label(ci,f'{inch}"  CURRENT'),(0,0))
        col.paste(od.label(oi,f'{inch}"  OPTIMIZED'),(0,DISP+46))
        cols.append(col)
    grid=Image.new("RGB",(sum(c.size[0] for c in cols)+10*(len(cols)+1),cols[0].size[1]+20),(20,20,20))
    x=10
    for c in cols: grid.paste(c,(x,10)); x+=c.size[0]+10
    grid.save("/home/claude/real_comparison.png")
    # also make an input transformation strip: original crop vs optimized source
    strip=Image.new("RGB",(DISP*2+30,DISP+50),(20,20,20))
    strip.paste(od.label(cur.resize((DISP,DISP)),"current auto-crop"),(10,0))
    strip.paste(od.label(opt.resize((DISP,DISP)),"optimized input"),(DISP+20,0))
    strip.save("/home/claude/real_input_transform.png")
    print("\nsaved: real_comparison.png, real_input_transform.png, real_optimized_source.png, real_mask.png")
