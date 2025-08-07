
import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import dynamic from 'next/dynamic';

const CameraCapture = dynamic(()=>import('../components/CameraCapture'), { ssr:false });
const ImageUpload = dynamic(()=>import('../components/ImageUpload'), { ssr:false });

type PriceRow = { source: string; raw?: number|null; nm?: number|null; psa10?: number|null; lastUpdated: string };

function Sparkline({ data }:{ data:number[] }){
  const w = 240, h = 60, p = 6;
  if (!data || !data.length) return <div className="small">No sold data</div>;
  const min = Math.min(...data), max = Math.max(...data);
  const norm = (v:number)=> (h - p) - ((v-min)/(max-min||1))*(h-2*p);
  const step = (w-2*p)/Math.max(1, data.length-1);
  const pts = data.map((v,i)=>`${p + i*step},${norm(v)}`).join(' ');
  return (<svg className="spark" viewBox={`0 0 ${w} ${h}`}><polyline fill="none" stroke="currentColor" strokeWidth="2" points={pts}/></svg>);
}

export default function Home() {
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  const [scanMode, setScanMode] = useState<'camera'|'upload'|'manual'>('camera');
  const [signalProfile, setSignalProfile] = useState<'Conservative'|'Aggressive'>('Conservative');
  const [alertEmail, setAlertEmail] = useState<string>('fridmantest@gmail.com');
  const [regions] = useState<string[]>(['US','JP','S-CH','KR']);

  const [query, setQuery] = useState<string>('Seismitoad ex 214/162');
  const [psaUrl, setPsaUrl] = useState<string>('');
  const [pop10, setPop10] = useState<number|null>(null);
  const [popUpdated, setPopUpdated] = useState<string|null>(null);

  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [series, setSeries] = useState<number[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<number>(50);
  const [recommendation, setRecommendation] = useState<'HOLD'|'SELL'|'WATCH'>('WATCH');
  const [conviction, setConviction] = useState<number>(0.5);
  const [loading, setLoading] = useState<boolean>(false);
  const [detected, setDetected] = useState<string>('');

  useEffect(()=>{
    document.documentElement.classList.toggle('dark', theme==='dark');
    document.body.classList.toggle('dark', theme==='dark');
  },[theme]);

  const repaint = async (q:string) => {
    setLoading(true);
    try {
      const [pr, nw, st, se] = await Promise.all([
        fetch('/api/prices?q='+encodeURIComponent(q)).then(r=>r.json()),
        fetch('/api/news?q='+encodeURIComponent(q)).then(r=>r.json()),
        fetch('/api/sentiment?q='+encodeURIComponent(q)).then(r=>r.json()),
        fetch('/api/ebay-solds?q='+encodeURIComponent(q)).then(r=>r.json()),
      ]);
      setPrices(pr.rows || []);
      setNews(nw.items || []);
      setSentiment(st.score ?? 50);
      setSeries(se.series || []);
    } catch(e) { console.warn(e); }
    setLoading(false);
  };

  const onDetected = (q:string) => {
    const clean = q.replace(/\s+/g,' ').trim();
    if (!clean) return;
    setDetected(clean);
    setQuery(clean);
    repaint(clean);
  };

  const fetchPop = async () => {
    if(!psaUrl) return;
    try {
      const res = await fetch('/api/psa?url='+encodeURIComponent(psaUrl));
      const j = await res.json();
      setPop10(j.pop10 ?? null);
      setPopUpdated(j.lastUpdated || null);
    } catch(e){}
  };

  useEffect(()=>{ repaint(query); },[]);

  useEffect(()=>{
    const momentum = (prices.find(p=>p.source==='eBay sold (7d median)')?.raw ?? 0) > 0 ? 0.6 : 0.4;
    const senti = sentiment/100;
    const scarcity = pop10 ? (pop10 < 200 ? 0.7 : pop10 < 500 ? 0.55 : 0.45) : 0.5;
    const base = (momentum*0.35 + senti*0.35 + scarcity*0.30);
    const adj = signalProfile==='Conservative' ? base*0.9 : base*1.1;
    setConviction(adj);
    if (adj > 0.66) setRecommendation('HOLD');
    else if (adj < 0.34) setRecommendation('SELL');
    else setRecommendation('WATCH');
  }, [prices, sentiment, signalProfile, pop10]);

  return (
    <div className="container">
      <div className="topbar">
        <div className="left">
          <div style={{fontWeight:800}}>Pokémon Card Pump Radar</div>
          <span className="badge">PSA only</span>
          <span className="badge">Regions: {regions.join(', ')}</span>
          <span className="badge">Reddit Sentiment</span>
        </div>
        <div className="row">
          <input className="input" value={query} onChange={e=>setQuery(e.target.value)} style={{width:320}} placeholder="e.g., Charizard 4/102"/>
          <button className="button" onClick={()=>repaint(query)}>{loading?'Loading…':'Refresh'}</button>
          <button className="iconbtn" aria-label="Toggle theme" onClick={()=>setTheme(theme==='light'?'dark':'light')}>
            {theme==='light' ? <Sun size={18}/> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <div className="grid cols-12">
        {/* LEFT: Scan / Identify */}
        <div className="card" style={{gridColumn:'span 3'}}>
          <h3>Scan / Identify</h3>
          <div className="content">
            <div className="row">
              <button className={`button ${scanMode==='camera'?'':'ghost'}`} onClick={()=>setScanMode('camera')}>Camera</button>
              <button className={`button ${scanMode==='upload'?'':'ghost'}`} onClick={()=>setScanMode('upload')}>Upload</button>
              <button className={`button ${scanMode==='manual'?'':'ghost'}`} onClick={()=>setScanMode('manual')}>Manual</button>
            </div>

            {scanMode==='camera' && <div style={{marginTop:12}}><CameraCapture onDetected={onDetected}/></div>}
            {scanMode==='upload' && <div style={{marginTop:12}}><ImageUpload onDetected={onDetected}/></div>}
            {scanMode==='manual' && (
              <div style={{marginTop:12}}>
                <input className="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Card name / set / number"/>
                <div className="row" style={{marginTop:8}}>
                  <button className="button" onClick={()=>repaint(query)}>Lookup</button>
                </div>
              </div>
            )}
            {!!detected && <div className="small" style={{marginTop:8}}>Detected: <b>{detected}</b></div>}
          </div>
        </div>

        {/* Identified Card box simplified */}
        <div className="card" style={{gridColumn:'span 3'}}>
          <h3>Identified Card</h3>
          <div className="content">
            <div className="title" style={{marginTop:8}}>{query}</div>
            <div className="row" style={{marginTop:8}}>
              <span className="badge">PSA focus</span>
              <span className="badge">Regions: {regions.join(', ')}</span>
              <span className="badge">Reddit Sentiment</span>
            </div>
            <div style={{marginTop:12}} className="small">PSA Pop URL</div>
            <div className="row" style={{marginTop:6}}>
              <input className="input" value={psaUrl} onChange={e=>setPsaUrl(e.target.value)} placeholder="Paste PSA population report URL"/>
              <button className="button" onClick={fetchPop}>Fetch POP</button>
            </div>
            {pop10 !== null && (
              <div className="small" style={{marginTop:6}}>POP 10: <b>{pop10}</b> {popUpdated ? `· Updated ${new Date(popUpdated).toLocaleString()}` : ''}</div>
            )}
          </div>
        </div>

        {/* CENTER: Market */}
        <div className="card" style={{gridColumn:'span 6'}}>
          <div className="hdr"><h3>Market Overview</h3></div>
          <div className="content">
            <div className="kpi">
              {prices.map((p, i)=>(
                <div className="tile" key={i}>
                  <div className="title">{p.source}</div>
                  <div className="small">Updated {p.lastUpdated}</div>
                  <div className="kpi" style={{gridTemplateColumns:'repeat(3,1fr)',marginTop:8}}>
                    <div><div className="small">Raw</div><div className="title">${p.raw ?? '—'}</div></div>
                    <div><div className="small">NM</div><div className="title">${p.nm ?? '—'}</div></div>
                    <div><div className="small">PSA 10</div><div className="title">{p.psa10?`$${p.psa10}`:'—'}</div></div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:12}}>
              <div className="small">eBay solds (recent)</div>
              <Sparkline data={series} />
            </div>
          </div>
        </div>

        {/* RIGHT: Action */}
        <div className="card" style={{gridColumn:'span 5'}}>
          <h3>Action</h3>
          <div className="content">
            <div className="tile signal">
              <div className="small">Signal ({signalProfile})</div>
              <div style={{fontSize:28,fontWeight:800}}>{recommendation}</div>
              <div className="small">Conviction {(conviction*100).toFixed(0)}%</div>
            </div>
            <div style={{marginTop:12}} className="small">Why</div>
            <ul>
              <li>Price momentum vs 30–90d baseline</li>
              <li>Reddit chatter trend & credibility</li>
              <li>Scarcity (PSA POP 10)</li>
            </ul>
            <div className="row" style={{marginTop:12}}>
              <select className="select" value={signalProfile} onChange={(e)=>setSignalProfile(e.target.value as any)}>
                <option>Conservative</option>
                <option>Aggressive</option>
              </select>
              <input className="input" placeholder="Buy $" />
              <input className="input" placeholder="Sell $" />
              <input className="input" placeholder="PSA target" />
            </div>
            <div style={{marginTop:12}} className="small">Email alerts</div>
            <div className="row" style={{marginTop:8}}>
              <input className="input" value={alertEmail} onChange={(e)=>setAlertEmail(e.target.value)} placeholder="you@example.com" />
              <button className="button" onClick={()=>alert('Alerts enabled (stub). Use /api/alert once SMTP is configured.')}>Enable Alerts</button>
            </div>
          </div>
        </div>

        {/* News */}
        <div className="card" style={{gridColumn:'span 12'}}>
          <h3>News & Chatter</h3>
          <div className="content">
            <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
              <div>
                {news.map((n:any, i:number)=>(
                  <div key={i} className="tile" style={{marginBottom:12}}>
                    <div className="small">{n.source} · {n.time}</div>
                    <div className="title"><a href={n.url} target="_blank" rel="noreferrer">{n.title}</a></div>
                  </div>
                ))}
              </div>
              <div>
                <div className="tile">
                  <div className="title">Sentiment Index</div>
                  <div className="small" style={{marginTop:4}}>Reddit weighted last 72h</div>
                  <div className="progress" style={{marginTop:8}}>
                    <div style={{width: `${sentiment}%`}} />
                  </div>
                </div>
                <div className="tile" style={{marginTop:12}}>
                  <div className="title">Catalysts</div>
                  <div className="small">Automatic leak/rotation/news flags</div>
                  <ul>
                    <li>Possible character/set synergy (placeholder)</li>
                    <li>Rotation window risk (placeholder)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="container">
        <div className="small">Live OCR + camera/upload. If camera is blocked, use Upload. Be polite with refresh.</div>
      </footer>
    </div>
  );
}
