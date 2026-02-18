'use client';

import { useState, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const COUNTRIES = [
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
];
const DEVICES = [
  { id: 'desktop', name: 'Desktop', icon: '🖥️' },
  { id: 'iphone', name: 'iPhone', icon: '📱' },
  { id: 'android', name: 'Android', icon: '🤖' },
];
const CATEGORIES = ['All', 'Electronics', 'Home & Garden', 'Health & Beauty', 'Fashion', 'Sports', 'General'];
const SORT_OPTIONS = [
  { value: 'saturation_asc', label: '↑ Saturation (Low first)' },
  { value: 'saturation_desc', label: '↓ Saturation (High first)' },
  { value: 'price_asc', label: '↑ Price (Cheap first)' },
  { value: 'price_desc', label: '↓ Price (Expensive first)' },
  { value: 'reviews_desc', label: '↓ Reviews (Most first)' },
  { value: 'rating_desc', label: '↓ Rating (Best first)' },
];
const ttStyle = { background: '#1a1b26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13 };

// ===== COMPONENTS =====
const SatBadge = ({ level, score }) => {
  const c = { low: ['#10b981','rgba(16,185,129,0.15)','rgba(16,185,129,0.35)'], medium: ['#f59e0b','rgba(245,158,11,0.15)','rgba(245,158,11,0.35)'], high: ['#ef4444','rgba(239,68,68,0.15)','rgba(239,68,68,0.35)'] }[level] || ['#888','rgba(136,136,136,0.15)','rgba(136,136,136,0.35)'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:c[1], border:`1px solid ${c[2]}`, borderRadius:20, padding:'4px 14px', fontSize:13, fontWeight:700, letterSpacing:0.5, color:c[0], whiteSpace:'nowrap' }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:c[0], boxShadow:`0 0 6px ${c[0]}`, display:'inline-block' }} />
      {level.toUpperCase()} · {score}
    </span>
  );
};

const ProductImage = ({ src, name, size = 56 }) => {
  const [err, setErr] = useState(false);
  if (!src || err) return <div style={{ width:size, height:size, borderRadius:10, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.4, flexShrink:0 }}>📦</div>;
  return <img src={src} alt={name||''} onError={()=>setErr(true)} style={{ width:size, height:size, borderRadius:10, objectFit:'cover', background:'rgba(255,255,255,0.05)', flexShrink:0 }} />;
};

// ===== MAIN =====
export default function Home() {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('us');
  const [device, setDevice] = useState('desktop');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('saturation_asc');
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [loadingAlts, setLoadingAlts] = useState(false);
  const [showAgent, setShowAgent] = useState(false);

  useEffect(() => { fetch('/api/agent').then(r=>r.json()).then(d=>setAgentStatus(d.agent)).catch(()=>{}); }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true); setError(null); setSelected(null); setAiAnalysis(null); setAlternatives([]);
    try {
      const res = await fetch(`/api/search?${new URLSearchParams({ q:query, country, device })}`);
      const data = await res.json();
      if (data.success && data.products?.length > 0) { setProducts(data.products); setAiAnalysis(data.aiAnalysis); }
      else { setError(data.error || 'No products found.'); setProducts([]); }
    } catch { setError('Search failed. Please try again.'); setProducts([]); }
    finally { setLoading(false); }
  }, [query, country, device]);

  const findAlts = useCallback(async (name) => {
    setLoadingAlts(true); setAlternatives([]);
    try { const res = await fetch(`/api/alternatives?${new URLSearchParams({ product:name, country, device })}`); const data = await res.json(); if (data.alternatives?.length>0) setAlternatives(data.alternatives); }
    catch {} finally { setLoadingAlts(false); }
  }, [country, device]);

  const filtered = products
    .filter(p => category === 'All' || p.category === category)
    .sort((a,b) => {
      switch(sortBy) {
        case 'saturation_asc': return (a.saturationScore||0)-(b.saturationScore||0);
        case 'saturation_desc': return (b.saturationScore||0)-(a.saturationScore||0);
        case 'price_asc': return (a.price||0)-(b.price||0);
        case 'price_desc': return (b.price||0)-(a.price||0);
        case 'reviews_desc': return (b.reviews||0)-(a.reviews||0);
        case 'rating_desc': return (b.rating||0)-(a.rating||0);
        default: return 0;
      }
    });

  const lowCount = filtered.filter(p=>p.saturation==='low').length;
  const medCount = filtered.filter(p=>p.saturation==='medium').length;
  const highCount = filtered.filter(p=>p.saturation==='high').length;

  return (
    <div style={{ minHeight:'100vh', background:'#08090d', color:'#e2e8f0', fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* ===== HEADER ===== */}
      <header style={{ padding:'16px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(8,9,13,0.92)', backdropFilter:'blur(20px)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 0 20px rgba(99,102,241,0.3)' }}>⚡</div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, letterSpacing:-0.5 }}>Product<span style={{ color:'#818cf8' }}>Spy</span></div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:1.5, textTransform:'uppercase' }}>AI-Powered Research Agent</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={()=>setShowAgent(!showAgent)} style={{ padding:'7px 16px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', border:'1px solid rgba(16,185,129,0.35)', background:showAgent?'rgba(16,185,129,0.15)':'rgba(16,185,129,0.05)', color:'#10b981', transition:'all 0.2s' }}>
              {agentStatus?.status==='active'?'🧠 AI Agent Active':'🧠 AI Agent'}
            </button>
            <div style={{ display:'flex', gap:4 }}>
              {DEVICES.map(d=>(
                <button key={d.id} onClick={()=>setDevice(d.id)} style={{ padding:'7px 14px', borderRadius:8, fontSize:13, cursor:'pointer', border:device===d.id?'1px solid rgba(99,102,241,0.5)':'1px solid rgba(255,255,255,0.08)', background:device===d.id?'rgba(99,102,241,0.12)':'transparent', color:device===d.id?'#a5b4fc':'rgba(255,255,255,0.4)', transition:'all 0.2s' }}>
                  {d.icon} {d.name}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:4 }}>
              {COUNTRIES.map(c=>(
                <button key={c.code} onClick={()=>setCountry(c.code)} title={c.name} style={{ padding:'7px 10px', borderRadius:8, fontSize:16, cursor:'pointer', border:country===c.code?'1px solid rgba(99,102,241,0.5)':'1px solid rgba(255,255,255,0.08)', background:country===c.code?'rgba(99,102,241,0.12)':'transparent', opacity:country===c.code?1:0.5, transition:'all 0.2s' }}>
                  {c.flag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div style={{ padding:'28px 24px', maxWidth:1200, margin:'0 auto' }}>

        {/* ===== AGENT PANEL ===== */}
        {showAgent && (
          <div className="fade-up" style={{ marginBottom:24, padding:24, borderRadius:14, background:'rgba(16,185,129,0.04)', border:'1px solid rgba(16,185,129,0.12)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#10b981' }}>🧠 AI Agent Dashboard</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)' }}>
                {agentStatus?.status==='active'?'✅ Claude API connected':'⚠️ Basic Mode — add ANTHROPIC_API_KEY'}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
              {[{l:'Products Tracked',v:agentStatus?.productsTracked||0,c:'#10b981'},{l:'Insights',v:agentStatus?.totalInsights||0,c:'#818cf8'},{l:'Searches',v:agentStatus?.totalSearches||0,c:'#f59e0b'},{l:'Last Learned',v:agentStatus?.lastLearned?new Date(agentStatus.lastLearned).toLocaleDateString():'Never',c:'#e2e8f0',small:true}].map(s=>(
                <div key={s.l} style={{ padding:16, borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:6 }}>{s.l}</div>
                  <div style={{ fontSize:s.small?14:28, fontWeight:800, color:s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SEARCH ===== */}
        <div style={{ display:'flex', gap:10, marginBottom:24, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:6 }}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSearch()}
            placeholder="Search Google Shopping... (e.g. portable fan, sunset lamp)"
            style={{ flex:1, padding:'14px 20px', background:'transparent', border:'none', color:'#e2e8f0', fontSize:16, outline:'none' }} />
          <button onClick={handleSearch} disabled={loading} style={{ padding:'14px 28px', borderRadius:10, border:'none', cursor:loading?'wait':'pointer', background:loading?'rgba(99,102,241,0.3)':'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontSize:15, fontWeight:700, boxShadow:loading?'none':'0 4px 20px rgba(99,102,241,0.25)', transition:'all 0.2s', whiteSpace:'nowrap' }}>
            {loading?<span style={{animation:'pulse 1s infinite'}}>Searching...</span>:'🔍 Search'}
          </button>
        </div>

        {/* ===== ERROR ===== */}
        {error && <div style={{ padding:'14px 18px', marginBottom:20, borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)', color:'#fca5a5', fontSize:14 }}>⚠️ {error}</div>}

        {/* ===== AI INSIGHTS ===== */}
        {aiAnalysis && (
          <div className="fade-up" style={{ marginBottom:24, padding:20, borderRadius:14, background:'rgba(99,102,241,0.04)', border:'1px solid rgba(99,102,241,0.12)' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#818cf8', marginBottom:10 }}>🧠 AI Agent Analysis</div>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.6, marginBottom:12 }}>{aiAnalysis.summary}</p>
            {aiAnalysis.topOpportunities?.length>0 && (
              <div style={{ marginBottom:10, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>Top Opportunities:</span>
                {aiAnalysis.topOpportunities.map((o,i)=>(
                  <span key={i} style={{ fontSize:13, padding:'4px 12px', borderRadius:12, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:'#10b981' }}>{o.name} ({o.score}/10)</span>
                ))}
              </div>
            )}
            {aiAnalysis.suggestedSearches?.length>0 && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>Try:</span>
                {aiAnalysis.suggestedSearches.map((s,i)=>(
                  <span key={i} onClick={()=>setQuery(s)} style={{ cursor:'pointer', fontSize:13, padding:'4px 12px', borderRadius:12, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#a5b4fc' }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== STATS ===== */}
        {filtered.length>0 && (
          <div className="stats-row" style={{ display:'flex', gap:14, marginBottom:24, flexWrap:'wrap' }}>
            {[{icon:'📦',label:'Products',value:filtered.length,color:'#818cf8'},{icon:'🟢',label:'Low Saturation',value:lowCount,color:'#10b981'},{icon:'🟡',label:'Medium',value:medCount,color:'#f59e0b'},{icon:'🔴',label:'High Saturation',value:highCount,color:'#ef4444'}].map(s=>(
              <div key={s.label} style={{ flex:1, minWidth:160, padding:'18px 22px', borderRadius:12, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:6 }}>{s.icon} {s.label}</div>
                <div style={{ fontSize:32, fontWeight:800, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ===== CHARTS ===== */}
        {filtered.length>0 && (
          <div className="charts-grid" style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:24 }}>
            <div style={{ padding:20, borderRadius:12, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:14 }}>📊 Saturation Scores</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={filtered.slice(0,10).map(p=>({ name:p.name?.substring(0,14)||'?', score:p.saturationScore||0, sat:p.saturation }))}>
                  <XAxis dataKey="name" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={ttStyle} />
                  <Bar dataKey="score" radius={[6,6,0,0]}>
                    {filtered.slice(0,10).map((p,i)=><Cell key={i} fill={p.saturation==='low'?'#10b981':p.saturation==='medium'?'#f59e0b':'#ef4444'} opacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ padding:20, borderRadius:12, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:14, alignSelf:'flex-start' }}>🎯 Distribution</div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={[{name:'Low',value:lowCount||0,fill:'#10b981'},{name:'Med',value:medCount||0,fill:'#f59e0b'},{name:'High',value:highCount||0,fill:'#ef4444'}]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {[{fill:'#10b981'},{fill:'#f59e0b'},{fill:'#ef4444'}].map((c,i)=><Cell key={i} fill={c.fill}/>)}
                  </Pie>
                  <Tooltip contentStyle={ttStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', gap:16, marginTop:8 }}>
                {[{n:'Low',c:'#10b981',v:lowCount},{n:'Med',c:'#f59e0b',v:medCount},{n:'High',c:'#ef4444',v:highCount}].map(s=>(
                  <div key={s.n} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'rgba(255,255,255,0.45)' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:s.c, display:'inline-block' }} />{s.n}: {s.v}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== FILTERS ===== */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CATEGORIES.map(c=>(
              <button key={c} onClick={()=>setCategory(c)} style={{ padding:'7px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:category===c?'1px solid rgba(99,102,241,0.5)':'1px solid rgba(255,255,255,0.08)', background:category===c?'rgba(99,102,241,0.12)':'transparent', color:category===c?'#a5b4fc':'rgba(255,255,255,0.4)', transition:'all 0.15s' }}>
                {c}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'8px 14px', borderRadius:8, fontSize:13, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#a5b4fc', outline:'none', cursor:'pointer' }}>
            {SORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* ===== PRODUCT TABLE ===== */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, overflow:'hidden' }}>
          {/* Header */}
          <div className="product-grid-header" style={{ display:'grid', gridTemplateColumns:'64px 2.2fr 0.8fr 0.7fr 0.8fr 1fr 80px', padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:11, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:1.5 }}>
            <span></span><span>Product</span><span>Price</span><span>Sellers</span><span>Rating</span><span>Saturation</span><span>Link</span>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ padding:60, textAlign:'center' }}>
              <div style={{ width:44, height:44, borderRadius:'50%', margin:'0 auto 16px', border:'3px solid rgba(99,102,241,0.2)', borderTopColor:'#6366f1', animation:'spin 0.8s linear infinite' }} />
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:15 }}>Searching Google Shopping for "<span style={{color:'#a5b4fc'}}>{query}</span>"...</div>
              <div style={{ color:'rgba(255,255,255,0.2)', fontSize:13, marginTop:6 }}>{DEVICES.find(d=>d.id===device)?.icon} {device} · {COUNTRIES.find(c=>c.code===country)?.flag} {country.toUpperCase()}</div>
            </div>
          )}

          {/* Products */}
          {!loading && filtered.map((p,idx)=>(
            <div key={p.id||idx} className="product-grid-row"
              onClick={()=>{setSelected(p);findAlts(p.name);}}
              style={{ display:'grid', gridTemplateColumns:'64px 2.2fr 0.8fr 0.7fr 0.8fr 1fr 80px', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer', background:selected?.id===p.id?'rgba(99,102,241,0.07)':'transparent', borderLeft:selected?.id===p.id?'3px solid #6366f1':'3px solid transparent', transition:'all 0.15s' }}
              onMouseEnter={e=>{if(selected?.id!==p.id) e.currentTarget.style.background='rgba(255,255,255,0.02)';}}
              onMouseLeave={e=>{if(selected?.id!==p.id) e.currentTarget.style.background='transparent';}}
            >
              <ProductImage src={p.imageUrl} name={p.name} size={56} />
              <div style={{ paddingLeft:10, overflow:'hidden' }}>
                <div style={{ fontSize:15, fontWeight:600, color:'#e2e8f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{p.store||p.category}</div>
              </div>
              <div className="mobile-hide" style={{ fontWeight:700, color:'#e2e8f0', fontSize:15 }}>{p.price>0?`$${p.price.toFixed(2)}`:'N/A'}</div>
              <div className="mobile-hide" style={{ fontSize:14, color:'rgba(255,255,255,0.45)' }}>{p.sellers||'—'}</div>
              <div className="mobile-hide" style={{ fontSize:14, color:'rgba(255,255,255,0.45)' }}>{p.rating>0?`⭐ ${p.rating}`:'-'} {p.reviews>0?<span style={{color:'rgba(255,255,255,0.25)',fontSize:12}}>({p.reviews})</span>:''}</div>
              <div className="mobile-hide"><SatBadge level={p.saturation||'medium'} score={p.saturationScore||0} /></div>
              <div className="mobile-hide">
                {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ fontSize:13, color:'#818cf8', textDecoration:'none', padding:'5px 12px', borderRadius:6, border:'1px solid rgba(99,102,241,0.25)', display:'inline-block' }}>View →</a>}
              </div>
              {/* Mobile-only meta row */}
              <div className="mobile-meta" style={{ display:'none' }}>
                <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{p.price>0?`$${p.price.toFixed(2)}`:'N/A'}</span>
                <SatBadge level={p.saturation||'medium'} score={p.saturationScore||0} />
                {p.rating>0 && <span style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>⭐ {p.rating}</span>}
              </div>
            </div>
          ))}

          {/* Empty */}
          {!loading && filtered.length===0 && (
            <div style={{ padding:70, textAlign:'center', color:'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
              <div style={{ fontSize:16, fontWeight:600 }}>Search for products to get started</div>
              <div style={{ fontSize:14, color:'rgba(255,255,255,0.2)', marginTop:6 }}>Try: "portable neck fan", "led strip lights", "sunset lamp"</div>
            </div>
          )}
        </div>

        <div style={{ textAlign:'center', padding:'28px 0 16px', fontSize:12, color:'rgba(255,255,255,0.12)' }}>ProductSpy v2.0 · AI-Powered Product Research Agent</div>
      </div>

      {/* ===== DETAIL PANEL ===== */}
      {selected && (
        <>
          <div onClick={()=>setSelected(null)} style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.55)', zIndex:90 }} />
          <div className="slide-in detail-panel" style={{ position:'fixed', top:0, right:0, bottom:0, width:480, zIndex:100, background:'linear-gradient(180deg,#0f1015 0%,#0a0b10 100%)', borderLeft:'1px solid rgba(255,255,255,0.06)', boxShadow:'-20px 0 60px rgba(0,0,0,0.5)', overflowY:'auto', padding:28 }}>

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
              <div style={{ display:'flex', gap:14, alignItems:'center', flex:1, overflow:'hidden' }}>
                <ProductImage src={selected.imageUrl} name={selected.name} size={64} />
                <div style={{ overflow:'hidden' }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', lineHeight:1.3 }}>{selected.name}</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:4 }}>{selected.store||selected.category}</div>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', width:36, height:36, borderRadius:8, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
            </div>

            <div style={{ marginBottom:20 }}><SatBadge level={selected.saturation||'medium'} score={selected.saturationScore||0} /></div>

            {/* View Product */}
            {selected.link && (
              <a href={selected.link} target="_blank" rel="noopener noreferrer" style={{ display:'block', textAlign:'center', padding:'14px', borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', textDecoration:'none', fontSize:15, fontWeight:700, marginBottom:20, boxShadow:'0 4px 20px rgba(99,102,241,0.3)' }}>
                View Product on Google Shopping →
              </a>
            )}

            {/* Price */}
            <div style={{ padding:18, borderRadius:12, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)', marginBottom:16 }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:12 }}>💰 Price Analysis</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[{l:'MIN',v:selected.minPrice,c:'#10b981'},{l:'AVG',v:selected.avgPrice,c:'#f59e0b'},{l:'MAX',v:selected.maxPrice,c:'#ef4444'}].map(p=>(
                  <div key={p.l} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:1.2 }}>{p.l}</div>
                    <div style={{ fontSize:24, fontWeight:800, color:p.c }}>${(p.v||0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Competition */}
            <div style={{ padding:18, borderRadius:12, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)', marginBottom:16 }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:12 }}>🏪 Competition</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {[{l:'SELLERS',v:selected.sellers||0},{l:'ADS',v:selected.ads||0},{l:'REVIEWS',v:(selected.reviews||0).toLocaleString()},{l:'RATING',v:selected.rating>0?`⭐ ${selected.rating}`:'N/A'}].map(s=>(
                  <div key={s.l}>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', letterSpacing:1 }}>{s.l}</div>
                    <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0' }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alternatives */}
            <div style={{ padding:18, borderRadius:12, background:'rgba(99,102,241,0.04)', border:'1px solid rgba(99,102,241,0.12)' }}>
              <div style={{ fontSize:12, color:'rgba(165,180,252,0.65)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:12 }}>🔄 Unbranded Alternatives</div>
              {loadingAlts && <div style={{ textAlign:'center', padding:20, color:'rgba(255,255,255,0.35)', fontSize:14 }}><span style={{animation:'pulse 1s infinite'}}>🧠 AI Agent finding alternatives...</span></div>}
              {!loadingAlts && alternatives.length===0 && <div style={{ textAlign:'center', padding:16, color:'rgba(255,255,255,0.2)', fontSize:13 }}>No alternatives found yet.</div>}
              {alternatives.slice(0,5).map((alt,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:i<4?'1px solid rgba(255,255,255,0.04)':'none' }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center', flex:1, overflow:'hidden' }}>
                    <ProductImage src={alt.imageUrl} name={alt.name} size={48} />
                    <div style={{ overflow:'hidden' }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'#c7d2fe', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{alt.name}</div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{alt.store||'Various'} {alt.rating>0?`· ⭐${alt.rating}`:''} {alt.reviews>0?`(${alt.reviews})`:''}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                    <span style={{ fontSize:16, fontWeight:800, color:'#a5b4fc' }}>{alt.price>0?`$${alt.price.toFixed(2)}`:''}</span>
                    {alt.link && <a href={alt.link} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ fontSize:12, color:'#818cf8', textDecoration:'none', padding:'4px 10px', borderRadius:6, border:'1px solid rgba(99,102,241,0.25)' }}>→</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
