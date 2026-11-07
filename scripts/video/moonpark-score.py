"""Original score, effects and optional local narration for the 40-second opening."""
import json, pathlib, wave, numpy as np, os
P=pathlib.Path('outputs/moonpark-cinema');P.mkdir(parents=True,exist_ok=True)
SR=48000;N=40*SR;rng=np.random.default_rng(94);mix=np.zeros((N,2),np.float64)
def add(a,start,pan=0):
 i=int(start*SR);end=min(N,i+len(a));
 if i>=N:return
 a=np.asarray(a[:end-i]);mix[i:end,0]+=a*np.sqrt((1-pan)/2);mix[i:end,1]+=a*np.sqrt((1+pan)/2)
def tone(f,start,duration,amp=.12):
 t=np.arange(int(duration*SR))/SR;env=np.minimum(1,t/.08)*np.exp(-t/max(.2,duration*.35));
 a=(np.sin(2*np.pi*f*t)+.19*np.sin(2*np.pi*f*2*t)+.07*np.sin(2*np.pi*f*3*t))*env*amp;add(a,start,np.sin(start)*.2)
# Warm expanding chords: tentative in orbit, hopeful at the reveal, a lift under the mass driver.
for start,chord in [(0,[130.81,196,261.63,329.63]),(6,[110,164.81,220,329.63]),(14,[146.83,220,293.66,369.99]),(21,[130.81,196,261.63,392]),(29,[110,164.81,220,329.63]),(35,[130.81,196,261.63,329.63,523.25])]:
 dur=min(8,40-start);t=np.arange(int(dur*SR))/SR;env=np.minimum(1,t/1.4)*np.minimum(1,(dur-t)/1.7)
 a=sum(np.sin(2*np.pi*f*t+np.sin(t*.7)*.07) for f in chord)*env*.052;add(a,start)
for j in range(56):
 start=12+j*.48
 if start<39:
  tone([261.63,329.63,392,523.25,440,392,329.63,293.66][j%8],start,.7,.045 if start<21 else .065)
# Rocket burn: band-limited noise, a low engine fundamental and a controlled touchdown impact.
for start,dur in [(6,7.8),(35,4.5)]:
 t=np.arange(int(dur*SR))/SR;noise=rng.normal(0,1,len(t));noise=np.convolve(noise,np.ones(45)/45,mode='same');env=np.sin(np.pi*np.minimum(1,t/dur))**.7
 add((noise*.6+np.sin(2*np.pi*(43+3*np.sin(t))*t)*.055)*env,start)
for start in [13.8,21]:
 t=np.arange(int(.9*SR))/SR;add(np.sin(2*np.pi*(70*t-24*t*t))*np.exp(-t*7)*.13,start)
# Airy rail rush, a tiny comic popcorn rattle, and a final bright resolution.
t=np.arange(int(8*SR))/SR;noise=rng.normal(0,1,len(t));noise=np.convolve(noise,np.ones(14)/14,mode='same');add(noise*np.sin(np.pi*t/8)*.12,21)
for j in range(12):
 t=np.arange(int(.04*SR))/SR;add(rng.normal(0,.06,len(t))*np.exp(-t*90),33.3+j*.09,(-1)**j*.45)
for j,f in enumerate([261.63,329.63,392,523.25]):tone(f,36+j*.16,2.8,.075)
# Optional original narration. The installed local model is a production dependency, not a runtime dependency.
voice_root=pathlib.Path(os.environ.get('MOON_KOKORO_DIR','./.media-tools/kokoro'))
segments=[(1.0,'We came here to build a future.'),(7.0,'Then someone asked about the weekend.'),(14.6,'Welcome to Moonpark. Make room for a little wonder.'),(22.0,'One small launch. One giant scream.'),(29.2,'Nobody builds a dream alone.'),(33.1,'Mind the popcorn.'),(36.0,'Give the Moon a reason to smile.')]
try:
 from kokoro_onnx import Kokoro
 k=Kokoro(str(voice_root/'kokoro-v1.0.onnx'),str(voice_root/'voices-v1.0.bin'))
 for start,text in segments:
  voice,rate=k.create(text,voice='bm_george',speed=1.03,lang='en-gb');length=len(voice)/rate
  if start+length>40:raise RuntimeError('Narration crosses ending')
  audio=np.interp(np.arange(round(length*SR))/SR,np.arange(len(voice))/rate,voice)
  i=int(start*SR);end=min(N,i+len(audio));mix[i:end]*=.40;add(audio*.70,start)
  print(text,round(length,2),'seconds',flush=True)
 (P/'narration.json').write_text(json.dumps({'voice':'bm_george','model':'Kokoro ONNX v1.0','segments':[{'start':a,'text':b} for a,b in segments]},indent=2))
except ImportError:
 print('Narration unavailable: install kokoro-onnx and point MOON_KOKORO_DIR at its model files.')
fade=np.minimum(1,np.arange(N)/SR/.5)*np.minimum(1,(40-np.arange(N)/SR)/1.3);mix*=fade[:,None]
peak=np.max(np.abs(mix));mix*=.88/max(peak,.88)
with wave.open(str(P/'score-master.wav'),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())
print('Wrote original stereo score and effects',flush=True)
