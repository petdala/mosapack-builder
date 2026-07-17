#!/usr/bin/env python3
"""MosaPack Optimize pipeline (prototype) — MediaPipe segmentation + face detection,
detector suite, face-anchored corrections, size-adaptive. Engine-faithful mosaic sim.
Reusable: optimize_photo(path, size_in) -> dict with images + issue report."""
import numpy as np, cv2, warnings
warnings.filterwarnings("ignore")
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
from skimage import color as skcolor
import mediapipe as mp
import optimize_demo as od   # palette, to_mosaic, render_grid, label, SIZES

_seg=mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=1)
_fd=mp.solutions.face_detection.FaceDetection(model_selection=1,min_detection_confidence=0.4)

def load(path):
    im=Image.open(path); im=ImageOps.exif_transpose(im).convert("RGB")
    return im

def segment(img):
    arr=np.asarray(img)
    sc=1024/max(img.size)
    small=cv2.resize(arr,(int(img.size[0]*sc),int(img.size[1]*sc)))
    m=_seg.process(small).segmentation_mask
    m=(np.clip(m,0,1)*255).astype(np.uint8)
    m=cv2.resize(m,img.size)
    # clean + feather
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    m=cv2.GaussianBlur(m,(0,0),2)
    return Image.fromarray(m)

def face_box(img):
    arr=np.asarray(img); r=_fd.process(arr)
    if not r.detections: return None, 0
    n=len(r.detections)
    b=max(r.detections,key=lambda d:d.location_data.relative_bounding_box.width).location_data.relative_bounding_box
    W,H=img.size
    x0=max(0,int(b.xmin*W)); y0=max(0,int(b.ymin*H))
    x1=min(W,int((b.xmin+b.width)*W)); y1=min(H,int((b.ymin+b.height)*H))
    return (x0,y0,x1,y1), n

# ---------------- detectors → issue report ----------------
def analyze(img, mask, fbox, nfaces):
    a=np.asarray(img,float); W,H=img.size
    lum=0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]
    m=np.asarray(mask)>127
    rep={}
    rep['resolution']=f"{W}x{H}"
    rep['faces']=nfaces
    fillpct=100*m.sum()/m.size
    rep['subject_fill_pct']=round(fillpct,1)
    # face exposure vs frame
    if fbox:
        x0,y0,x1,y1=fbox
        fl=lum[y0:y1,x0:x1]
        rep['face_luma']=round(float(fl.mean()),1)
        rep['frame_luma']=round(float(lum.mean()),1)
        rep['backlit']= fl.mean() < lum.mean()-12
        # blur: variance of Laplacian on face crop
        fg=cv2.cvtColor(np.asarray(img)[y0:y1,x0:x1],cv2.COLOR_RGB2GRAY)
        rep['face_sharpness']=round(float(cv2.Laplacian(fg,cv2.CV_64F).var()),0)
        rep['blurry']= rep['face_sharpness']<60
    else:
        rep['face_luma']=None; rep['backlit']=False; rep['blurry']=False
    # clipping
    rep['clipped_hi_pct']=round(100*(lum>250).mean(),1)
    # contrast
    sub_lum=lum[m] if m.sum()>1000 else lum
    rep['contrast_std']=round(float(sub_lum.std()),1)
    rep['low_contrast']= sub_lum.std()<38
    # color cast on skin (within subject)
    r,g,b=a[...,0],a[...,1],a[...,2]
    skin=m&(r>80)&(r>=g)&(g>=b)&((r-b)>10)&((r-b)<120)
    if skin.sum()>300:
        mr,mg,mb=a[...,0][skin].mean(),a[...,1][skin].mean(),a[...,2][skin].mean()
        gm=(mr+mg+mb)/3
        rep['green_cast']= mg> gm*1.06
        rep['skin_rgb']=(round(mr),round(mg),round(mb))
    else:
        rep['green_cast']=False; rep['skin_rgb']=None
    # busy background: edge density outside subject
    edges=cv2.Laplacian(cv2.cvtColor(np.asarray(img),cv2.COLOR_RGB2GRAY),cv2.CV_64F)
    bg=~m
    rep['bg_busy']= (np.abs(edges)[bg].mean() if bg.sum() else 0) > 8
    # resolution adequacy for 24"
    rep['low_res_for_24']= min(W,H) < 1200
    return rep

# ---------------- corrections ----------------
def correct_tone(img, mask, fbox):
    a=np.asarray(img,float); W,H=img.size
    m=(np.asarray(mask).astype(float)/255.0)
    sub=m>0.5
    # skin-anchored WB (prefer face box skin)
    r,g,b=a[...,0],a[...,1],a[...,2]
    if fbox:
        x0,y0,x1,y1=fbox; fmask=np.zeros((H,W),bool); fmask[y0:y1,x0:x1]=True
    else:
        fmask=sub
    skin=fmask&sub&(r>80)&(r>=g)&(g>=b)&((r-b)>10)&((r-b)<120)
    ref= skin if skin.sum()>200 else sub
    if ref.sum()>200:
        means=[a[...,c][ref].mean() for c in range(3)]; gm=sum(means)/3
        for c in range(3):
            corr=1+((gm/max(1.0,means[c]))-1)*0.6
            a[...,c]=np.clip(a[...,c]*np.where(sub,corr,1.0),0,255)
    # backlight lift on subject (gamma), stronger if face is dark
    lum=(0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2])/255.0
    gamma=0.80
    if fbox:
        fl=lum[fbox[1]:fbox[3],fbox[0]:fbox[2]].mean()
        if fl<0.42: gamma=0.68
    gain=np.where(sub,(np.power(np.clip(lum,1e-3,1),gamma)/np.clip(lum,1e-3,1)),1.0)
    for c in range(3): a[...,c]=np.clip(a[...,c]*gain,0,255)
    # Subject-wide skin WARM-SHIFT: shadowed skin (arms/neck) reads cool and maps to
    # Light Blue/Gray. Nudge skin-classified subject pixels warmer (drop B, lift R a touch)
    # so they land on Tan/Nougat instead of cool tiles.
    r,g,b=a[...,0],a[...,1],a[...,2]
    sk=sub&(r>60)&(r>=g-6)&(g>=b-6)&((r-b)>0)&((r-b)<150)
    if sk.sum()>200:
        a[...,2][sk]=np.clip(a[...,2][sk]*0.93,0,255)
        a[...,0][sk]=np.clip(a[...,0][sk]*1.03,0,255)
    # SKIN-TARGET exposure: lift detected skin toward palette Tan/Light-Nougat range
    # (~190 mean) so faces render as skin, not dark brown. Soft, subject-scoped.
    r,g,b=a[...,0],a[...,1],a[...,2]
    # Confine the lift to a feathered FACE-BOX region and to skin-like pixels only,
    # so arms/shoulders don't over-brighten into cool tiles. Keep it warm.
    face_soft=np.zeros((H,W),float)
    if fbox:
        x0,y0,x1,y1=fbox
        pad=int(0.18*(y1-y0)); yy0,yy1=max(0,y0-pad),min(H,y1+pad); xx0,xx1=max(0,x0-pad),min(W,x1+pad)
        face_soft[yy0:yy1,xx0:xx1]=1.0
        face_soft=np.asarray(Image.fromarray((face_soft*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(25)),float)/255.0
    else:
        face_soft=sub.astype(float)
    skinish=((r>70)&(r>=g)&(g>=b)&((r-b)>8)&((r-b)<140)).astype(float)
    skin2=(face_soft>0.2)&(skinish>0)&sub
    if skin2.sum()>150:
        sm=(0.299*r[skin2]+0.587*g[skin2]+0.114*b[skin2]).mean()
        target=185.0
        if sm<target:
            k=min(1.55,target/max(30.0,sm))
            w=face_soft*skinish*sub
            gainc=[1+(k-1)*w, 1+(k*0.985-1)*w, 1+(k*0.94-1)*w]  # warm-preserving (less on B)
            for c in range(3): a[...,c]=np.clip(a[...,c]*gainc[c],0,255)
    return Image.fromarray(a.astype(np.uint8))

def portrait_fill(img, mask, fill):
    m=np.asarray(mask)>110; ys,xs=np.where(m)
    if len(xs)==0: return od.square_crop_center(img)
    x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
    cx,cy=(x0+x1)/2,(y0+y1)/2; subj=max(x1-x0,y1-y0)
    side=int(min(img.size[0],img.size[1],subj/fill))
    L=int(max(0,min(img.size[0]-side,cx-side/2))); T=int(max(0,min(img.size[1]-side,cy-side/2)))
    return img.crop((L,T,L+side,T+side)), (L,T,side)

# size-adaptive policy: fill fraction, bg mode, sharpen
POLICY={6:(0.86,'flatten',60),12:(0.78,'flatten',90),18:(0.72,'flatten',110),24:(0.64,'flatten',120)}

def bg_treat(img, mask, mode, bg_name="White"):
    a=np.asarray(img,float)
    # HARD binary mask (eroded) — no feather. Edge tiles average subject+white to a
    # warm light tone instead of blending into cool intermediate blues.
    mk=mask.resize(img.size).filter(ImageFilter.MinFilter(11))
    m=(np.asarray(mk)>128).astype(float)[...,None]
    if mode=='flatten':
        bg=np.ones_like(a)*od.hex2rgb(dict(od.PALETTE)[bg_name])
    else:
        blur=np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(22)),float)
        lg=blur.mean(2,keepdims=True); bg=blur*0.30+lg*0.70
    return Image.fromarray((a*m+bg*(1-m)).astype(np.uint8))

def optimize_photo(path, size_in):
    img=load(path); mask=segment(img); fbox,nf=face_box(img)
    rep=analyze(img,mask,fbox,nf)
    fill,bgmode,sharp=POLICY[size_in]
    toned=correct_tone(img,mask,fbox)
    treated=bg_treat(toned,mask,bgmode)
    crop,_=portrait_fill(treated,mask,fill)
    crop=ImageEnhance.Contrast(crop).enhance(1.08)
    crop=ImageEnhance.Color(crop).enhance(1.06)
    crop=crop.filter(ImageFilter.UnsharpMask(radius=2,percent=sharp,threshold=2))
    return {'optimized_input':crop,'mask':mask,'report':rep,'fbox':fbox}
