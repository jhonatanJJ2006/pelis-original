from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
F="/usr/share/fonts/truetype/sand-box/google/Playfair Display SC/PlayfairDisplaySC-Regular.ttf"
BG=(11,11,13); PANEL=(20,20,24); GOLD=(196,163,90); IVORY=(229,225,228)
def gold_fill(w,h):
    g=Image.new("RGB",(w,h)); px=g.load()
    stops=[(0,(224,201,138)),(0.45,(245,200,66)),(1,(196,163,90))]
    for y in range(h):
        for x in range(w):
            t=(x/w+y/h)/2
            for (a,ca),(b,cb) in zip(stops,stops[1:]):
                if a<=t<=b:
                    u=(t-a)/(b-a); px[x,y]=tuple(int(ca[i]+(cb[i]-ca[i])*u) for i in range(3)); break
    return g
def draw_P(img, cx, cy, height):
    S=4; W,H=img.size
    mask=Image.new("L",(W*S,H*S),0); d=ImageDraw.Draw(mask)
    font=ImageFont.truetype(F,int(height*S*1.32))
    bbox=d.textbbox((0,0),"P",font=font)
    tw,th=bbox[2]-bbox[0],bbox[3]-bbox[1]
    d.text((cx*S-tw/2-bbox[0], cy*S-th/2-bbox[1]),"P",font=font,fill=255)
    mask=mask.resize((W,H),Image.LANCZOS)
    img.paste(gold_fill(W,H),(0,0),mask)
def tile(size, full=True):
    """Marca: losa negra redondeada + panel con filo dorado (como el favicon web) + P serif dorada."""
    S=4; s=size*S
    im=Image.new("RGBA",(s,s),(0,0,0,0)); d=ImageDraw.Draw(im)
    if full: d.rounded_rectangle([0,0,s-1,s-1],radius=int(s*96/512),fill=BG)
    m=int(s*84/512)
    d.rounded_rectangle([m,m,s-m,s-m],radius=int(s*64/512),fill=PANEL,outline=GOLD,width=max(1,int(s*3/512)))
    # filo tipo letterbox bajo la P
    bw=int(s*0.22); by=int(s*0.71)
    d.rounded_rectangle([s//2-bw//2,by,s//2+bw//2,by+max(2,int(s*6/512))],radius=3,fill=GOLD)
    im=im.resize((size,size),Image.LANCZOS)
    draw_P(im,size/2,size*0.475,size*0.36)
    return im
def adaptive_fg(px):
    # 108dp lienzo; zona segura 66dp: la marca (sin losa) ocupa ~72dp centrada
    im=Image.new("RGBA",(px,px),(0,0,0,0))
    inner=tile(int(px*80/108),full=False)
    im.alpha_composite(inner,((px-inner.width)//2,(px-inner.height)//2))
    return im
def banner(w=320,h=180):
    S=3; im=Image.new("RGBA",(w*S,h*S),BG+(255,)); d=ImageDraw.Draw(im)
    d.rectangle([0,0,w*S,h*S],fill=BG)
    im=im.resize((w,h),Image.LANCZOS)
    t=tile(112); im.alpha_composite(t,(22,(h-112)//2))
    # wordmark
    big=Image.new("L",(w*S,h*S),0); dd=ImageDraw.Draw(big)
    font=ImageFont.truetype(F,46*S); x=148*S; y=50*S
    for ch in "PELIS":
        dd.text((x,y),ch,font=font,fill=255); x+=dd.textlength(ch,font=font)+6*S
    big=big.resize((w,h),Image.LANCZOS); im.paste(gold_fill(w,h),(0,0),big)
    d=ImageDraw.Draw(im); small=ImageFont.truetype(F,15)
    d.line([(150,112),(298,112)],fill=GOLD,width=1)
    d.text((150,120),"TELEVISIÓN",font=small,fill=IVORY)
    return im
out="res"; dens={"mdpi":1,"hdpi":1.5,"xhdpi":2,"xxhdpi":3,"xxxhdpi":4}
for k,f in dens.items():
    os.makedirs(f"{out}/mipmap-{k}",exist_ok=True)
    tile(int(48*f)).save(f"{out}/mipmap-{k}/ic_launcher.png")
    tile(int(48*f)).save(f"{out}/mipmap-{k}/ic_launcher_round.png")
    adaptive_fg(int(108*f)).save(f"{out}/mipmap-{k}/ic_launcher_foreground.png")
os.makedirs(f"{out}/drawable-xhdpi",exist_ok=True); banner().save(f"{out}/drawable-xhdpi/tv_banner.png")
os.makedirs(f"{out}/drawable-nodpi",exist_ok=True); tile(192).save(f"{out}/drawable-nodpi/pelis_mark.png")
tile(512).save("preview-icon.png"); banner().resize((960,540),Image.LANCZOS).save("preview-banner.png")
