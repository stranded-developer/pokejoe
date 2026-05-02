'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getProducts, getCustomer } from '@/lib/db';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Product = { id:string; name:string; series?:string; price:number; emoji?:string; badge?:string; imageUrl?:string; images?:string[]; };

const POKEMON = ['🔴 Charizard','⚡ Pikachu','💜 Mewtwo','🐲 Rayquaza','🔥 Charmander','🌊 Gyarados','🍃 Bulbasaur','❄️ Articuno'];
const SESSION_KEY = 'pokejoe_username';

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeImg, setActiveImg] = useState<Record<string,number>>({});
  const [waNumber, setWaNumber] = useState('62xxxxxxxxxx');

  // Auth state
  const [loggedInUser, setLoggedInUser] = useState<string|null>(null);
  const [loginInput, setLoginInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) setLoggedInUser(saved);
  }, []);

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

  async function handleLogin() {
    const username = loginInput.trim();
    if (!username) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const data = await getCustomer(username);
      if (data) {
        localStorage.setItem(SESSION_KEY, username);
        setLoggedInUser(username);
        setLoginInput('');
      } else {
        setLoginError('Username not found. Contact PokeJoe to get access.');
      }
    } catch {
      setLoginError('Something went wrong. Please try again.');
    }
    setLoginLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    setLoggedInUser(null);
    setLoginInput('');
    setLoginError('');
  }

  function goToVault() {
    router.push('/vault');
  }

  return (
    <>
      <Navbar loggedInUser={loggedInUser} onLogout={handleLogout} />

      {/* HERO */}
      <section style={{ background: 'var(--black)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', paddingTop: 'var(--nav-h)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(212,160,23,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,23,0.12) 0%, transparent 70%)', top: -100, right: '5%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', fontSize: 260, opacity: 0.04, right: -20, top: '50%', transform: 'translateY(-50%)', animation: 'float 8s ease-in-out infinite' }}>🐲</div>

        <div className="hero-main-layout">
          {/* Left: copy */}
          <div className="hero-content">
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 20, fontWeight: 500 }}>
              Indonesia&apos;s Premier TCG Vault
            </div>
            <h1 className="hero-title">
              YOUR<br /><span style={{ color: 'var(--gold)' }}>POKEMON</span><br />
              <span style={{ WebkitTextStroke: '2px rgba(255,255,255,0.25)', color: 'transparent' }}>VAULT</span>
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 480, marginBottom: 40, fontWeight: 300 }}>
              Rip &amp; ship, vault storage, and earn rewards with every purchase.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/catalog" style={{ background: 'var(--gold)', color: 'var(--black)', textDecoration: 'none', padding: '14px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>Browse Catalog →</Link>
              <Link href="/vault" style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)', textDecoration: 'none', padding: '14px 28px', borderRadius: 8, fontSize: 14 }}>My Vault</Link>
            </div>
          </div>

          {/* Right: login/points card */}
          <div className="hero-login-card">
            {loggedInUser ? (
              /* Logged-in state */
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(212,160,23,0.15)', border: '2px solid rgba(212,160,23,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>⭐</div>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Welcome back</div>
                <div style={{ fontFamily: 'var(--ff-display)', fontSize: 28, color: 'white', letterSpacing: '0.06em', marginBottom: 2 }}>
                  {loggedInUser.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginBottom: 24 }}>Session active</div>

                
              </div>
            ) : (
              /* Logged-out state */
              <>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8, fontWeight: 500 }}>Customer Access</div>
                  <div style={{ fontFamily: 'var(--ff-display)', fontSize: 26, color: 'white', letterSpacing: '0.04em', lineHeight: 1.1, marginBottom: 8 }}>VIEW YOUR POINTS</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>Enter your username to access your vault, points balance, and purchase history.</div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }} />

                <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>Username</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--ff-mono)', pointerEvents: 'none' }}>@</span>
                  <input
                    type="text"
                    placeholder="yourUsername"
                    value={loginInput}
                    onChange={e => { setLoginInput(e.target.value); setLoginError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${loginError ? 'rgba(230,57,70,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, padding: '12px 14px 12px 30px', color: 'white', fontFamily: 'var(--ff-mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    onFocus={e => { if (!loginError) (e.target as HTMLInputElement).style.borderColor = 'rgba(212,160,23,0.5)'; }}
                    onBlur={e => { if (!loginError) (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
                  />
                </div>

                {loginError && (
                  <div style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.2)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#FF6B75', marginBottom: 12 }}>
                    {loginError}
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  disabled={loginLoading || !loginInput.trim()}
                  style={{ width: '100%', background: loginLoading || !loginInput.trim() ? 'rgba(212,160,23,0.4)' : 'var(--gold)', color: 'var(--black)', border: 'none', padding: '13px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loginLoading || !loginInput.trim() ? 'not-allowed' : 'pointer', fontFamily: 'var(--ff-body)', letterSpacing: '0.04em', transition: 'background 0.2s' }}>
                  {loginLoading ? 'Checking...' : 'Enter Vault →'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <span style={{ fontSize: 16 }}>🔒</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>No password needed — your username is provided by PokeJoe admin.</span>
                </div>
              </>
            )}
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

        .hero-main-layout {
          display: flex;
          align-items: center;
          padding-bottom: 140px;
          gap: 40px;
        }
        .hero-content {
          position: relative;
          padding: 80px 60px 0 80px;
          flex: 1;
          max-width: 640px;
        }
        .hero-login-card {
          position: relative;
          flex-shrink: 0;
          width: 340px;
          margin-right: 80px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 32px 28px;
          backdrop-filter: blur(20px);
        }
        @media (max-width: 900px) {
          .hero-main-layout {
            flex-direction: column;
            padding-bottom: 160px;
            align-items: stretch;
          }
          .hero-content {
            padding: 48px 20px 0;
            max-width: none;
          }
          .hero-login-card {
            width: auto;
            margin: 0 20px;
          }
        }
      `}</style>
    </>
  );
}