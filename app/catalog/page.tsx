'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getProducts } from '@/lib/db';

type Product = { id:string; name:string; series?:string; price:number; stock?:number; emoji?:string; badge?:string; imageUrl?:string; images?:string[]; };

const FALLBACK: Product[] = [
  { id:'1', name:'Prismatic Evolutions Pack', series:'Scarlet & Violet', price:150000, stock:20, emoji:'🃏', badge:'HOT' },
  { id:'2', name:'Ascended Heroes Pack', series:'Scarlet & Violet', price:120000, stock:15, emoji:'⚡', badge:'NEW' },
  { id:'3', name:'Stellar Crown Pack', series:'Scarlet & Violet', price:130000, stock:10, emoji:'🌟' },
  { id:'4', name:'Charizard ex Premium Collection', series:'Obsidian Flames', price:450000, stock:5, emoji:'🔥', badge:'HOT' },
  { id:'5', name:'Paldean Fates Elite Trainer Box', series:'Scarlet & Violet', price:850000, stock:3, emoji:'📦' },
  { id:'6', name:'Paradox Rift Booster Box', series:'Scarlet & Violet', price:1200000, stock:2, emoji:'🌀', badge:'LIMITED' },
  { id:'7', name:'Mewtwo ex Premium Collection', series:'Scarlet & Violet', price:380000, stock:8, emoji:'💜' },
  { id:'8', name:'Ninja Spinner', series:'Accessories', price:85000, stock:50, emoji:'🌀' },
];

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState<Record<string, number>>({});

  useEffect(() => {
    getProducts().then(data => {
      setProducts(data.length ? data as Product[] : FALLBACK);
      setLoading(false);
    }).catch(() => { setProducts(FALLBACK); setLoading(false); });
  }, []);

  return (
    <>
      <Navbar />
      <div style={{ paddingTop:'var(--nav-h)', minHeight:'100vh', background:'white' }}>
        <div className="catalog-hero">
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(212,160,23,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.04) 1px, transparent 1px)', backgroundSize:'60px 60px' }} />
          <div style={{ position:'absolute', right:-20, top:'50%', transform:'translateY(-50%)', fontSize:200, opacity:0.04 }}>📦</div>
          <div style={{ position:'relative' }}>
            <div style={{ fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--gold)', marginBottom:10, fontWeight:500 }}>Sealed Products</div>
            <h1 style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(48px,8vw,72px)', lineHeight:0.92, color:'white', letterSpacing:'0.02em', marginBottom:12 }}>CATALOG</h1>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)', maxWidth:400, lineHeight:1.6 }}>Authentic sealed Pokémon TCG products. Purchase and store in your vault, or ship immediately.</p>
          </div>
        </div>

        <div className="catalog-body">
          {loading ? (
            <div style={{ textAlign:'center', padding:80, color:'#8892A8' }}>Loading products...</div>
          ) : (
            <div className="grid-4">
              {products.map(p => {
                const imgs = p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [];
                const idx = activeImg[p.id] || 0;
                return (
                  <Link key={p.id} href={`/catalog/${p.id}`} style={{ textDecoration:'none' }}>
                    <div style={{ background:'white', border:'1px solid #E4E8F0', borderRadius:12, overflow:'hidden', cursor:'pointer', transition:'all 0.25s' }}
                      onMouseEnter={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='var(--gold)'; el.style.transform='translateY(-3px)'; el.style.boxShadow='0 12px 40px rgba(212,160,23,0.1)'; }}
                      onMouseLeave={e => { const el=e.currentTarget as HTMLDivElement; el.style.borderColor='#E4E8F0'; el.style.transform='none'; el.style.boxShadow='none'; }}
                    >
                      <div style={{ width:'100%', aspectRatio:'1', background:'linear-gradient(135deg,#ECEEF5,#DDE0EC)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:64, position:'relative', overflow:'hidden' }}>
                        {p.badge && <div style={{ position:'absolute', top:10, left:10, zIndex:2, background:p.badge==='HOT'?'var(--red)':p.badge==='NEW'?'var(--blue2)':'var(--black)', color:'white', fontSize:9, fontWeight:600, padding:'4px 10px', borderRadius:20, letterSpacing:'0.08em' }}>{p.badge}</div>}
                        {imgs.length > 0 ? (
                          <>
                            <img src={imgs[idx]} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} />
                            {imgs.length > 1 && (
                              <>
                                <button onClick={e=>{ e.preventDefault(); setActiveImg(prev=>({...prev,[p.id]:(idx-1+imgs.length)%imgs.length})); }}
                                  style={{ position:'absolute', left:6, top:'50%', transform:'translateY(-50%)', zIndex:2, background:'rgba(0,0,0,0.4)', border:'none', color:'white', width:24, height:24, borderRadius:'50%', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
                                <button onClick={e=>{ e.preventDefault(); setActiveImg(prev=>({...prev,[p.id]:(idx+1)%imgs.length})); }}
                                  style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', zIndex:2, background:'rgba(0,0,0,0.4)', border:'none', color:'white', width:24, height:24, borderRadius:'50%', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
                                <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', display:'flex', gap:4, zIndex:2 }}>
                                  {imgs.map((_,i)=>(
                                    <div key={i} onClick={e=>{ e.preventDefault(); setActiveImg(prev=>({...prev,[p.id]:i})); }}
                                      style={{ width:5, height:5, borderRadius:'50%', background:i===idx?'white':'rgba(255,255,255,0.4)', cursor:'pointer' }} />
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <span style={{ animation:'cardFloat 6s ease-in-out infinite' }}>{p.emoji||'📦'}</span>
                        )}
                      </div>
                      <div style={{ padding:16 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:'var(--black)', marginBottom:4 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'#8892A8', marginBottom:10 }}>{p.series}</div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div style={{ fontSize:16, fontWeight:600, color:'var(--blue)' }}>Rp {p.price.toLocaleString('id-ID')}</div>
                          <div style={{ fontSize:10, color:'var(--gold)', fontWeight:600, background:'rgba(212,160,23,0.08)', padding:'3px 8px', borderRadius:4 }}>{Math.floor(p.price/100000)} pt</div>
                        </div>
                        {p.stock !== undefined && p.stock <= 5 && <div style={{ fontSize:11, color:'var(--red)', marginTop:8, fontWeight:500 }}>⚠️ Only {p.stock} left!</div>}
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