'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getProducts } from '@/lib/db';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Product = { id:string; name:string; series?:string; price:number; emoji?:string; badge?:string; imageUrl?:string; images?:string[]; };

const POKEMON = ['🔴 Charizard','⚡ Pikachu','💜 Mewtwo','🐲 Rayquaza','🔥 Charmander','🌊 Gyarados','🍃 Bulbasaur','❄️ Articuno'];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeImg, setActiveImg] = useState<Record<string,number>>({});
  const [waNumber, setWaNumber] = useState('62xxxxxxxxxx');

  useEffect(() => {
    getDoc(doc(db, 'config', 'whatsapp')).then(snap => {
      if (snap.exists()) setWaNumber(snap.data().phoneNumber);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getProducts().then(data => {
      setProducts((data as Product[]).slice(0, 4));
    }).catch(() => {});
  }, []);

  return (
    <>
      <Navbar />

      {/* HERO */}
      <section style={{ background: 'var(--black)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', paddingTop: 'var(--nav-h)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(212,160,23,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,23,0.12) 0%, transparent 70%)', top: -100, right: '5%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', fontSize: 260, opacity: 0.04, right: -20, top: '50%', transform: 'translateY(-50%)', animation: 'float 8s ease-in-out infinite' }}>🐲</div>

        <div className="hero-content">
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 20, fontWeight: 500 }}>
            Indonesia&apos;s Premier TCG Vault
          </div>
          <h1 className="hero-title">
            YOUR<br /><span style={{ color: 'var(--gold)' }}>POKEMON</span><br />
            <span style={{ WebkitTextStroke: '2px rgba(255,255,255,0.25)', color: 'transparent' }}>VAULT</span>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 480, marginBottom: 40, fontWeight: 300 }}>
            Rip & ship, vault storage, and earn rewards with every purchase.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/catalog" style={{ background: 'var(--gold)', color: 'var(--black)', textDecoration: 'none', padding: '14px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>Browse Catalog →</Link>
            <Link href="/vault" style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)', textDecoration: 'none', padding: '14px 28px', borderRadius: 8, fontSize: 14 }}>My Vault</Link>
          </div>
        </div>

        <div className="hero-stats">
          {[['200+','Customers'],['5,000+','Packs Ripped'],['Rp 100K','= 1 Point'],['H+1','Vault Update']].map(([n,l],i) => (
            <div key={i} style={{ flex: 1, padding: '24px 40px', borderRight: i<3?'1px solid rgba(255,255,255,0.07)':'none' }}>
              <div style={{ fontFamily: 'var(--ff-display)', fontSize: 36, color: 'var(--gold)', lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* POINTS BANNER */}
      <div className="points-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#5A6278', flexWrap: 'wrap' }}>
          ⭐ Your Points:
          <span style={{ fontFamily: 'var(--ff-mono)', background: 'white', border: '1px solid #D0D5E0', padding: '4px 12px', borderRadius: 4, color: '#8892A8' }}>0 pts — Log in to view</span>
        </div>
        <Link href="/vault" style={{ background: 'var(--black)', color: 'white', textDecoration: 'none', padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500, flexShrink: 0 }}>Log In</Link>
      </div>

      {/* CATALOG PREVIEW */}
      <section className="section-pad" style={{ background: 'white' }}>
        <div className="catalog-header">
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10, fontWeight: 500 }}>Featured Products</div>
            <h2 style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(36px,6vw,52px)', lineHeight: 0.95 }}>SEALED PRODUCTS</h2>
          </div>
          <Link href="/catalog" style={{ fontSize: 13, color: 'var(--blue2)', textDecoration: 'none', fontWeight: 500 }}>View All →</Link>
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'#8892A8', fontSize:14 }}>Loading products...</div>
        ) : (
          <div className="grid-4">
            {products.map(p => {
              const imgs = p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [];
              const idx = activeImg[p.id] || 0;
              return (
                <Link key={p.id} href={`/catalog/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'white', border: '1px solid #E4E8F0', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor='var(--gold)'; el.style.transform='translateY(-3px)'; el.style.boxShadow='0 12px 40px rgba(212,160,23,0.1)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor='#E4E8F0'; el.style.transform='none'; el.style.boxShadow='none'; }}
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
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', marginBottom: 4 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#8892A8', marginBottom: 10 }}>{p.series}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--blue)' }}>Rp {p.price.toLocaleString('id-ID')}</div>
                        <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600, background: 'rgba(212,160,23,0.08)', padding: '3px 8px', borderRadius: 4 }}>{Math.floor(p.price/100000)} pt</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* POKEMON STRIP */}
      <div className="pokemon-strip">
        {POKEMON.map((p,i) => {
          const [emoji, ...rest] = p.split(' ');
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, opacity: 0.5, padding: 12, transition: 'opacity 0.2s', cursor: 'default' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity='1'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity='0.5'}
            >
              <div style={{ fontSize: 'clamp(24px, 4vw, 40px)', marginBottom: 6 }}>{emoji}</div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--silver)', fontWeight: 500 }}>{rest.join(' ')}</div>
            </div>
          );
        })}
      </div>

      {/* HOW IT WORKS */}
      <section className="section-pad" style={{ background: 'var(--black)' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10, fontWeight: 500 }}>How It Works</div>
        <h2 style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(36px,6vw,52px)', color: 'white' }}>RIP. VAULT. REDEEM.</h2>
        <div className="hiw-grid">
          {[
            { n:'01', icon:'📦', t:'Purchase Packs', d:'Buy sealed products through our live streams or catalog.' },
            { n:'02', icon:'🏪', t:'We Store It', d:'Your pulls are safely stored in your personal vault.' },
            { n:'03', icon:'✨', t:'Earn Points', d:'Every Rp 100,000 spent earns 1 point. Redeem for rewards.' },
            { n:'04', icon:'🚚', t:'Ship Anytime', d:'Request a shipment whenever you like. We pack carefully.' },
          ].map((s,i) => (
            <div key={i} style={{ padding: '36px 28px', borderRight: i<3?'1px solid rgba(255,255,255,0.07)':'none' }}>
              <div style={{ fontFamily: 'var(--ff-display)', fontSize: 64, color: 'rgba(212,160,23,0.12)', lineHeight: 1, marginBottom: 16 }}>{s.n}</div>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'white', marginBottom: 8 }}>{s.t}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: 'var(--black)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px var(--px) 32px' }}>
        <div className="footer-inner">
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 28, color: 'white' }}>POKE<span style={{ color: 'var(--gold)' }}>JOE</span></div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© 2026 PokeJoe. All rights reserved.</div>
          <a href={`https://wa.me/${waNumber}`} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', padding: '7px 16px', borderRadius: 20, fontSize: 12, color: '#25D366', fontWeight: 500, textDecoration: 'none' }}>💬 WhatsApp</a>
        </div>
      </footer>

      <style>{`
        @keyframes cardFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
        @keyframes float{0%,100%{transform:translateY(-50%) translateX(0);}50%{transform:translateY(-52%) translateX(-8px);}}
      `}</style>
    </>
  );
}