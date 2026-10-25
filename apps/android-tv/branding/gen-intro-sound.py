"""Sonido original de entrada de Pelis TV (sintetizado, ~2,6 s). Salida: pelis_intro.wav"""
import numpy as np, wave
SR=44100; D=2.6; n=int(SR*D); t=np.arange(n)/SR
rng=np.random.default_rng(7)
def env(a,d,start=0.0):
    e=np.zeros(n); s=int(start*SR); tt=t[s:]-start
    e[s:]=np.minimum(tt/a,1.0)*np.exp(-np.maximum(tt-a,0)/d); return e
# 1) whoosh: ruido filtrado con corte que sube (filtro de un polo variable)
noise=rng.standard_normal(n)
cut=200+3800*np.clip(t/0.8,0,1)**2
alpha=1-np.exp(-2*np.pi*cut/SR)
lp=np.zeros(n); y=0.0
for i in range(n):
    y+=alpha[i]*(noise[i]-y); lp[i]=y
hp=lp-np.convolve(lp,np.ones(32)/32,'same')
wenv=np.clip(t/0.75,0,1)**2*np.exp(-np.maximum(t-0.75,0)/0.12)
whoosh=hp*wenv*0.45
# 2) golpe grave suave
boom=np.sin(2*np.pi*(52+20*np.exp(-(t-0.75).clip(0)/0.05))*t)*env(0.01,0.45,0.75)*0.55
# 3) acorde tipo campana (Re mayor con novena), parciales inarmónicos suaves
notes=[146.83,220.0,293.66,369.99,440.0,659.25]
L=np.zeros(n); R=np.zeros(n)
for k,f in enumerate(notes):
    e=env(0.06+0.02*k,0.9-0.06*k,0.74+0.025*k)
    tone=(np.sin(2*np.pi*f*t)+0.35*np.sin(2*np.pi*2.0*f*t)*np.exp(-t/0.6)+0.12*np.sin(2*np.pi*3.01*f*t))
    g=0.22/(1+0.15*k); pan=0.3+0.4*(k/(len(notes)-1))
    L+=tone*e*g*(1-pan)*2; R+=np.sin(2*np.pi*f*1.002*t)*e*g*pan*2+0.35*np.sin(2*np.pi*2*f*t)*e*g*pan
# 4) brillo agudo (shimmer)
sh=np.sin(2*np.pi*1318.5*t)*np.sin(2*np.pi*5*t)**2*env(0.2,0.5,0.85)*0.05
L+=whoosh+boom+sh; R+=whoosh*0.95+boom+sh
# reverb sencilla: retardos con realimentación
def rev(x):
    out=x.copy()
    for d,g in [(0.029,0.35),(0.037,0.3),(0.041,0.28),(0.053,0.25)]:
        k=int(d*SR); y=np.zeros_like(x)
        for i in range(k,len(x)): y[i]=x[i]+g*y[i-k]
        out+=0.18*y
    return out
L=rev(L); R=rev(R)
fade=np.ones(n); fo=int(0.5*SR); fade[-fo:]=np.linspace(1,0,fo)**2
st=np.stack([L*fade,R*fade],1); st/=np.abs(st).max()/0.7  # pico -3 dBFS aprox
pcm=(st*32767).astype(np.int16)
w=wave.open('pelis_intro.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
