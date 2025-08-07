
import React, { useEffect, useRef, useState } from 'react';
import { ocrImage, extractQueryFromText } from '../lib/ocr';

export default function CameraCapture({ onDetected }:{ onDetected: (q:string)=>void }){
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  useEffect(()=>{
    (async ()=>{
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e:any) {
        setError('Camera permission blocked. Use Upload instead, or allow camera access.');
      }
    })();
    return ()=>{
      const s = videoRef.current?.srcObject as MediaStream | undefined;
      s?.getTracks().forEach(t=>t.stop());
    }
  },[]);

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    setBusy(true);
    try {
      const text = await ocrImage(c);
      const q = extractQueryFromText(text) || text.split(/\s+/).slice(0,6).join(' ');
      onDetected(q);
    } catch(e:any) {
      setError('Could not read the card text. Try again or use Upload.');
    }
    setBusy(false);
  };

  return (
    <div>
      {error && <div className="small" style={{color:'#ef4444', marginBottom:8}}>{error}</div>}
      <video ref={videoRef} muted playsInline/>
      <canvas ref={canvasRef} style={{display:'none'}}/>
      <div className="row" style={{marginTop:8}}>
        <button className="button" onClick={capture} disabled={busy}>{busy?'Reading…':'Capture & Detect'}</button>
      </div>
    </div>
  );
}
