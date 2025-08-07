
import React, { useRef, useState } from 'react';
import { ocrImage, extractQueryFromText } from '../lib/ocr';

export default function ImageUpload({ onDetected }:{ onDetected:(q:string)=>void }){
  const [preview, setPreview] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPreview(url);
    setBusy(true);
    try {
      const text = await ocrImage(f);
      const q = extractQueryFromText(text) || f.name.replace(/\.(png|jpg|jpeg|webp)$/i,'');
      onDetected(q);
    } catch(e:any) {
      setError('Could not read text from that image. Try a clearer photo.');
    }
    setBusy(false);
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={onFile} />
      {preview && <img src={preview} className="preview" alt="preview" style={{marginTop:8}}/>}
      {busy && <div className="small">Reading image…</div>}
      {error && <div className="small" style={{color:'#ef4444'}}>{error}</div>}
    </div>
  );
}
