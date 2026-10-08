#!/usr/bin/env python3
"""
Hoodie preview + editor photos from ONE photo of a white hoodie on a plain
coloured background (the founder's pink shot, 1080 x 1080).

  python3 scripts/mockup-hoodie.py <hoodie-on-pink.png>

Writes public/mockups/:
  hoodie-front.webp              the photo as-is (preview, white)
  hoodie-front-grey.webp         garment recoloured to heather grey (stand-in)
  hoodie-editor-front.webp       cut-out, zoomed to the chest (editor background)
  hoodie-editor-front-grey.webp  the same in grey
The print box (x 320-725, y 365-662 = 300 x 220 mm) and the editor crop
(x 92-952, y 83-943) are in src/features/editor/mockup/{specs,garment-guide}.ts.
Replace the grey files by name when real grey photos exist.
Needs numpy, opencv-python, scipy.
"""
import sys, cv2, numpy as np
from scipy.ndimage import binary_fill_holes
import argparse
ap=argparse.ArgumentParser(); ap.add_argument("photo", help="hoodie on a plain coloured (e.g. pink) background, 1080 x 1080"); a=ap.parse_args()
pink=cv2.imread(a.photo)
hsv=cv2.cvtColor(pink,cv2.COLOR_BGR2HSV)
m=(hsv[...,1]<70).astype(np.uint8)
m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
m=binary_fill_holes(m).astype(np.uint8)
n,lab,st,_=cv2.connectedComponentsWithStats(m); k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); m=(lab==k).astype(np.uint8)
m=cv2.erode(m,np.ones((3,3),np.uint8))                     # drop the pink fringe
alpha=cv2.GaussianBlur(m.astype(np.float32)*255,(0,0),0.9)
# de-spill: garment pixels near the edge lose the pink cast (neutral = min channel)
garment=pink.copy()
edge=(cv2.dilate(m,np.ones((7,7),np.uint8))-cv2.erode(m,np.ones((7,7),np.uint8)))>0
mn=pink.min(axis=2,keepdims=True); garment[edge]=np.repeat(mn,3,axis=2)[edge]

L=cv2.cvtColor(garment,cv2.COLOR_BGR2GRAY).astype(np.float32)
white=np.percentile(L[m>0],97)
nrm=np.clip(L/white,0,1.06)
def tint(hexs,k):
    r,g,b=[int(hexs[i:i+2],16) for i in (1,3,5)]
    return np.clip(np.array([b,g,r],np.float32)*(nrm**k)[...,None]*1.05,0,255)
grey=tint("#B4B7BC",2.2)          # stronger folds than a straight scale
a3=(alpha/255)[...,None]
cv2.imwrite("public/mockups/hoodie-front.webp",pink,[cv2.IMWRITE_WEBP_QUALITY,88])
cv2.imwrite("public/mockups/hoodie-front-grey.webp",np.clip(pink*(1-a3)+grey*a3,0,255).astype(np.uint8),[cv2.IMWRITE_WEBP_QUALITY,88])
X0,Y0,SZ=92,83,860
def editor(bgr,name):
    rgba=np.dstack([bgr.astype(np.uint8),alpha.astype(np.uint8)])
    out=cv2.resize(rgba[Y0:Y0+SZ,X0:X0+SZ],(1080,1080),interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(f"public/mockups/{name}",out,[cv2.IMWRITE_WEBP_QUALITY,88])
editor(garment,"hoodie-editor-front.webp")
editor(grey,"hoodie-editor-front-grey.webp")
