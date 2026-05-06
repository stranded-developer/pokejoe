'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getRedeemableProducts } from '@/lib/db';

type RedeemProduct = { id:string; name:string; category?:string; pointsCost:number; stock?:number; emoji?:string; badge?:string; imageUrl?:string; description?:string; };

const FALLBACK: RedeemProduct[] = [
  { id:'r1', name:'PSA Graded Slab',        category:'Grading Service', pointsCost:50, emoji:'🏆', badge:'POPULAR' },
  { id:'r2', name:'Charizard ex Premium Box',category:'Sealed Product',  pointsCost:30, emoji:'🔥' },
  { id:'r3', name:'PokeJoe Merch Tee',       category:'Merchandise',     pointsCost:15, emoji:'👕' },
  { id:'r4', name:'Booster Bundle x10',      category:'Sealed Product',  pointsCost:20, emoji:'📦', badge:'VALUE' },
  { id:'r5', name:'Elite Trainer Box',        category:'Sealed Product',  pointsCost:45, emoji:'📦' },
  { id:'r6', name:'Custom Playmat',           category:'Accessories',     pointsCost:25, emoji:'🎨' },
];

function StockPill({ stock }: { stock?: number }) {
  if (stock === undefined) return null;
  if (stock === 0)  return <span style={{ fontSize:10, fontWeight:700, color:'#E63946', background:'rgba(230,57,70,0.1)', border:'1px solid rgba(230,57,70,0.2)', padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' }}>✕ Out of stock</span>;
  if (stock <= 5)   return <span style={{ fontSize:10, fontWeight:700, color:'#D97706', background:'rgba(217,119,6,0.1)',  border:'1px solid rgba(217,119,6,0.2)',  padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' }}>⚠ {stock} left</span>;
return <span style={{ fontSize:10, fontWeight:600, color:'#16a34a', background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.18)', padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' }}>{stock} in stock</span>;
 
}

export default function RedeemPage() {
  const [products, setProducts] = useState<RedeemProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRedeemableProducts().then(data => {
      const items = data as RedeemProduct[];
      setProducts(items.length ? items : FALLBACK);
      setLoading(false);
    }).catch(() => { setProducts(FALLBACK); setLoading(false); });
  }, []);

  // Sort: available first, out-of-stock last
  const sorted = [...products].sort((a, b) => {
    if (a.stock === 0 && b.stock !== 0) return 1;
    if (b.stock === 0 && a.stock !== 0) return -1;
    return 0;
  });

  return (
    <>
      <Navbar />
      <div style={{ paddingTop:'var(--nav-h)', minHeight:'100vh', background:'white' }}>

        {/* Hero */}
        <div className="redeem-hero">
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(212,160,23,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.06) 1px, transparent 1px)', backgroundSize:'60px 60px' }} />
          <div style={{ position:'absolute', right:-20, top:'50%', transform:'translateY(-50%)', fontSize:200, opacity:0.05 }}>⭐</div>
          <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,160,23,0.15) 0%, transparent 70%)', top:-100, right:'10%', filter:'blur(60px)', pointerEvents:'none' }} />
          <div style={{ position:'relative' }}>
            <div style={{ fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gold)', marginBottom:10, fontWeight:500 }}>Points Rewards</div>
            <h1 style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(48px,8vw,72px)', lineHeight:0.92, color:'white', letterSpacing:'0.02em', marginBottom:12 }}>REDEEM</h1>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)', maxWidth:440, lineHeight:1.6, marginBottom:20 }}>Exchange your points for exclusive products, grading services, and merch. Every Rp 100,000 = 1 point.</p>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <Link href="/vault" style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--gold)', color:'var(--black)', textDecoration:'none', padding:'10px 20px', borderRadius:8, fontSize:13, fontWeight:700 }}>Check My Points →</Link>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)' }}>Redeem via WhatsApp after choosing an item</div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="catalog-body">
          {loading ? (
            <div style={{ textAlign:'center', padding:80, color:'#8892A8' }}>Loading rewards...</div>
          ) : (
            <div className="grid-4">
              {sorted.map(p => {
                const outOfStock = p.stock === 0;
                return (
                  <Link key={p.id} href={`/redeem/${p.id}`} style={{ textDecoration:'none' }}>
                    <div style={{ background:'white', border:'1px solid #E4E8F0', borderRadius:12, overflow:'hidden', cursor:'pointer', transition:'all 0.25s', opacity: outOfStock ? 0.6 : 1 }}
                      onMouseEnter={e => { if(!outOfStock){ const el=e.currentTarget as HTMLDivElement; el.style.borderColor='var(--gold)'; el.style.transform='translateY(-3px)'; el.style.boxShadow='0 12px 40px rgba(212,160,23,0.15)'; }}}
                      onMouseLeave={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#E4E8F0'; el.style.transform='none'; el.style.boxShadow='none'; }}>
                      <div style={{ width:'100%', aspectRatio:'1', background:'linear-gradient(135deg,#FDF8EC,#F5E8C0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:64, position:'relative', overflow:'hidden' }}>
                        {p.badge && <div style={{ position:'absolute', top:10, left:10, zIndex:2, background:p.badge==='POPULAR'?'var(--red)':p.badge==='VALUE'?'var(--blue2)':'var(--black)', color:'white', fontSize:9, fontWeight:600, padding:'4px 10px', borderRadius:20, letterSpacing:'0.08em' }}>{p.badge}</div>}
                        {outOfStock && (
                          <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.5)', zIndex:3, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div style={{ background:'rgba(230,57,70,0.9)', color:'white', fontSize:10, fontWeight:700, padding:'5px 12px', borderRadius:20, letterSpacing:'0.06em' }}>OUT OF STOCK</div>
                          </div>
                        )}
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} />
                          : <span style={{ animation:'cardFloat 6s ease-in-out infinite', position:'relative', zIndex:1 }}>{p.emoji||'⭐'}</span>
                        }
                        <div style={{ position:'absolute', inset:0, background:'linear-gradient(45deg,transparent 40%,rgba(212,160,23,0.07) 50%,transparent 60%)', pointerEvents:'none' }} />
                      </div>
                      <div style={{ padding:16 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:'var(--black)', marginBottom:4 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'#8892A8', marginBottom:10 }}>{p.category}</div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(212,160,23,0.1)', border:'1px solid rgba(212,160,23,0.25)', padding:'6px 12px', borderRadius:8 }}>
                            <span style={{ fontSize:14 }}>⭐</span>
                            <span style={{ fontSize:16, fontWeight:700, color:'var(--gold)', fontFamily:'var(--ff-mono)' }}>{p.pointsCost}</span>
                            <span style={{ fontSize:11, color:'rgba(212,160,23,0.7)', fontWeight:500 }}>pts</span>
                          </div>
                          {/* ── STOCK ── */}
                          <StockPill stock={p.stock} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes cardFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}`}</style>
    </>
  );
}