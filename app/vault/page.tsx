'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { getCustomer, getVaultItems } from '@/lib/db';

type Customer = {
  username: string;
  points: number;
  vaultActive: boolean;
  purchaseHistory: Array<{ description: string; amount: number; points: number; date: string; type?: string }>;
};

type VaultItem = {
  id: string;
  type?: string;
  status?: string;
  addedAt?: { seconds: number };
  // Live session
  liveTitle?: string;
  packs?: string[];
  photos?: string[];
  // Purchase
  productName?: string;
  productId?: string;
  price?: number;
  quantity?: number;
  totalPrice?: number;
  // Redemption
  pointsCost?: number;
  // Shared
  description?: string;
  imageUrl?: string;
};

const SESSION_KEY = 'pokejoe_username';

// ── Status badge ──────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  if (!status || status === 'On progress') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F2F4F8', border: '1px solid #E4E8F0', borderRadius: 20, padding: '5px 12px' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#B0B8CC', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#8892A8', letterSpacing: '0.04em' }}>On Progress</span>
      </div>
    );
  }
  if (status === 'In transit') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 20, padding: '5px 12px' }}>
        <span style={{ fontSize: 11 }}>🚚</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#D97706', letterSpacing: '0.04em' }}>In Transit</span>
      </div>
    );
  }
  if (status === 'Done') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 20, padding: '5px 12px' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', letterSpacing: '0.04em' }}>Done</span>
      </div>
    );
  }
  return null;
}

export default function VaultPage() {
  const [waNumber, setWaNumber] = useState('62xxxxxxxxxx');

  useEffect(() => {
    import('@/lib/firebase').then(({ db }) => {
      import('firebase/firestore').then(({ getDoc, doc }) => {
        getDoc(doc(db, 'config', 'whatsapp')).then(snap => {
          if (snap.exists()) setWaNumber(snap.data().phoneNumber);
        });
      });
    });
  }, []);

  const [step, setStep] = useState<'loading'|'login'|'vault'>('loading');
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer|null>(null);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [activeTab, setActiveTab] = useState<'points'|'items'|'redeem'>('points');

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) autoLogin(saved);
    else setStep('login');
  }, []);

  async function autoLogin(username: string) {
    setLoading(true);
    try {
      const data = await getCustomer(username.trim()) as Customer|null;
      if (data) {
        setCustomer(data);
        const items = await getVaultItems(username.trim()) as VaultItem[];
        setVaultItems(items);
        setStep('vault');
      } else {
        localStorage.removeItem(SESSION_KEY);
        setStep('login');
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setStep('login');
    }
    setLoading(false);
  }

  async function doLogin() {
    if (!loginInput.trim()) return;
    setLoading(true);
    setLoginError(false);
    try {
      const data = await getCustomer(loginInput.trim()) as Customer|null;
      if (data) {
        localStorage.setItem(SESSION_KEY, loginInput.trim());
        setCustomer(data);
        const items = await getVaultItems(loginInput.trim()) as VaultItem[];
        setVaultItems(items);
        setStep('vault');
      } else {
        setLoginError(true);
      }
    } catch { setLoginError(true); }
    setLoading(false);
  }

  function doLogout() {
    localStorage.removeItem(SESSION_KEY);
    setStep('login');
    setCustomer(null);
    setVaultItems([]);
    setLoginInput('');
    setLoginError(false);
  }

  function formatRp(n: number) { if (!n) return 'Rp 0'; return 'Rp ' + n.toLocaleString('id-ID'); }
  function formatDate(iso: string) { return new Date(iso).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }); }
  function formatTs(ts?: { seconds: number }) { if (!ts) return ''; return new Date(ts.seconds * 1000).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }); }

  if (step === 'loading') return (
    <>
      <Navbar />
      <div style={{ background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--ff-mono)' }}>Loading your vault...</div>
      </div>
    </>
  );

  if (step === 'login') return (
    <>
      <Navbar />
      <div style={{ background:'var(--black)', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', position:'relative', overflow:'hidden', padding:'20px' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(212,160,23,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.03) 1px, transparent 1px)', backgroundSize:'80px 80px' }} />
        <div style={{ position:'absolute', fontSize:320, opacity:0.03, bottom:-60, right:-40 }}>🐲</div>
        <div style={{ position:'absolute', fontSize:320, opacity:0.03, top:-60, left:-40, transform:'scaleX(-1)' }}>🔥</div>
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,160,23,0.06) 0%, transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />
        <div style={{ position:'relative', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'48px 44px', width:'100%', maxWidth:400, backdropFilter:'blur(20px)' }}>
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <div style={{ fontFamily:'var(--ff-display)', fontSize:40, color:'white', letterSpacing:'0.06em' }}>POKE<span style={{ color:'var(--gold)' }}>JOE</span></div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)', marginTop:4, fontWeight:300 }}>Customer Vault Access</div>
          </div>
          <hr style={{ border:'none', borderTop:'1px solid rgba(255,255,255,0.08)', marginBottom:28 }} />
          <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8, fontWeight:500 }}>Your Username</label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--ff-mono)', pointerEvents: 'none' }}>@</span>
            <input type="text" placeholder="yourUsername" value={loginInput} onChange={e => setLoginInput(e.target.value)} onKeyDown={e => e.key==='Enter' && doLogin()}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'13px 16px 13px 30px', color:'white', fontFamily:'var(--ff-mono)', fontSize:15, outline:'none', boxSizing:'border-box' }} />
          </div>
          <button onClick={doLogin} disabled={loading} style={{ width:'100%', background:'var(--gold)', color:'var(--black)', border:'none', padding:14, borderRadius:8, fontFamily:'var(--ff-body)', fontSize:15, fontWeight:600, cursor:'pointer', opacity:loading?0.7:1 }}>
            {loading ? 'Checking...' : 'Enter Vault →'}
          </button>
          {loginError && <div style={{ background:'rgba(230,57,70,0.12)', border:'1px solid rgba(230,57,70,0.25)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#FF6B75', marginTop:12, textAlign:'center' }}>Username not found. Contact PokeJoe to get access.</div>}
          <p style={{ textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.2)', marginTop:20, lineHeight:1.5 }}>No password needed — just your unique username provided by PokeJoe admin.</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Navbar loggedInUser={customer?.username} onLogout={doLogout} />
      <div style={{ background:'#F2F4F8', paddingTop:'var(--nav-h)', minHeight:'100vh' }}>

        {/* Tabs */}
        <div className="vault-tabs">
          {(['points','items','psa','redeem'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ height:52, display:'flex', alignItems:'center', fontSize:13, cursor:'pointer', background:'none', border:'none', borderBottom:activeTab===tab?'2px solid var(--gold)':'2px solid transparent', color:activeTab===tab?'var(--black)':'#8892A8', fontWeight:activeTab===tab?500:400, padding:'0 4px', transition:'all 0.2s', whiteSpace:'nowrap' }}>
              {tab==='points'?'Points & History':tab==='items'?'My Vault Items':tab==='psa'?'PSA Grading':'Redeem Points'}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="vault-header">
          <div>
            <div style={{ fontSize:13, color:'#8892A8', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:500 }}>Welcome back</div>
            <div style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(28px,6vw,48px)', color:'var(--black)', letterSpacing:'0.04em', lineHeight:1 }}>
              {customer?.username.toUpperCase()}<span style={{ color:'var(--gold)' }}>&apos;S VAULT</span>
            </div>
          </div>
          <button onClick={doLogout} style={{ background:'transparent', border:'1px solid #E0E4EE', color:'#8892A8', padding:'8px 16px', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'var(--ff-body)', flexShrink:0 }}>Logout</button>
        </div>

        {/* ── POINTS TAB ── */}
        {activeTab==='points' && (
          <>
            <div className="vault-points-card">
              <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,160,23,0.1) 0%, transparent 70%)', right:-50, top:-50 }} />
              <div style={{ position:'absolute', right:180, top:'50%', transform:'translateY(-50%)', fontSize:110, opacity:0.04 }}>⭐</div>
              <div>
                <div style={{ fontSize:11, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:8 }}>Points Balance</div>
                <div style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(48px,8vw,72px)', color:'var(--gold)', lineHeight:1 }}>
                  {customer?.points ?? 0} <span style={{ fontSize:20, color:'rgba(255,255,255,0.25)', marginLeft:4 }}>pts</span>
                </div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.25)', marginTop:6 }}>Rp 100,000 spent = 1 point</div>
              </div>
              <button onClick={() => setActiveTab('redeem')} style={{ background:'var(--gold)', color:'var(--black)', border:'none', padding:'14px 24px', borderRadius:8, fontFamily:'var(--ff-body)', fontSize:14, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                Redeem Points →
              </button>
            </div>

            <div className="vault-content">
              <div style={{ fontSize:12, letterSpacing:'0.12em', textTransform:'uppercase', color:'#8892A8', fontWeight:500, marginBottom:16 }}>Purchase History</div>
              {!customer?.purchaseHistory?.length ? (
                <div style={{ background:'white', border:'1px solid #E4E8F0', borderRadius:8, padding:32, textAlign:'center', color:'#8892A8', fontSize:14 }}>
                  No purchases yet. Start buying from PokeJoe! 🎴
                </div>
              ) : customer.purchaseHistory.slice().reverse().map((h,i) => {
                const isDeduction = h.type === 'deduction' || (typeof h.points === 'number' && h.points < 0);
                return (
                  <div key={i} style={{ background:'white', border:'1px solid #E4E8F0', borderRadius:8, padding:'16px 20px', marginBottom:8, display:'flex', alignItems:'center', gap:16 }}>
                    <div style={{ width:38, height:38, borderRadius:8, background: isDeduction ? 'rgba(212,160,23,0.08)' : '#F2F4F8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      {isDeduction ? '⭐' : '🃏'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:'var(--black)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.description}</div>
                      <div style={{ fontSize:11, color:'#B0B8CC', fontFamily:'var(--ff-mono)', marginTop:2 }}>{formatDate(h.date)}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      {h.amount > 0 && <div style={{ fontSize:15, fontWeight:600, color:'var(--black)' }}>{formatRp(h.amount)}</div>}
                      <div style={{ display:'inline-block', fontSize:12, color: isDeduction ? 'var(--red)' : 'var(--gold)', fontWeight:600, background: isDeduction ? 'rgba(230,57,70,0.08)' : 'rgba(212,160,23,0.08)', padding:'2px 8px', borderRadius:4, marginTop:3 }}>
                        {isDeduction ? '' : '+'}{h.points} pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── ITEMS TAB ── */}
        {activeTab==='items' && (
          <div className="vault-content">
            {!customer?.vaultActive && (
              <div style={{ background:'rgba(230,57,70,0.08)', border:'1px solid rgba(230,57,70,0.2)', borderRadius:8, padding:'12px 20px', marginBottom:20, fontSize:13, color:'var(--red)' }}>
                ⚠️ Your vault is currently inactive. Contact PokeJoe admin to reactivate.
              </div>
            )}
            {!vaultItems.length ? (
              <div style={{ background:'white', border:'1px solid #E4E8F0', borderRadius:8, padding:32, textAlign:'center', color:'#8892A8', fontSize:14 }}>
                Your vault is empty. Items appear here after a live session (updated H+1). 📦
              </div>
            ) : vaultItems.map(item => {

              // ── Purchase card ──────────────────────────────────
              if (item.type === 'purchase') {
                return (
                  <div key={item.id} style={{ background:'white', border:'1px solid #E4E8F0', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
                    {/* Header bar */}
                    <div style={{ background:'linear-gradient(90deg,rgba(39,81,163,0.07),rgba(39,81,163,0.02))', borderBottom:'1px solid rgba(39,81,163,0.1)', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      <span style={{ fontSize:15 }}>🛒</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'#3B5CC4', letterSpacing:'0.06em', textTransform:'uppercase' }}>Purchase</span>
                      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        {item.quantity && item.quantity > 1 && (
                          <span style={{ fontSize:11, color:'#8892A8', background:'#F2F4F8', border:'1px solid #E4E8F0', borderRadius:20, padding:'2px 8px' }}>×{item.quantity}</span>
                        )}
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                    {/* Body */}
                    <div style={{ padding:20, display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.productName} style={{ width:80, height:80, borderRadius:10, objectFit:'cover', flexShrink:0, border:'1px solid #E4E8F0' }} />
                        : <div style={{ width:80, height:80, borderRadius:10, background:'linear-gradient(135deg,#ECEEF5,#DDE0EC)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, flexShrink:0 }}>📦</div>
                      }
                      <div style={{ flex:1, minWidth:120 }}>
                        <div style={{ fontSize:16, fontWeight:700, color:'var(--black)', marginBottom:4 }}>{item.productName}</div>
                        {item.description && <div style={{ fontSize:13, color:'#7A8299', lineHeight:1.5, marginBottom:8 }}>{item.description}</div>}
                        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                          {item.totalPrice != null && <div style={{ fontSize:14, fontWeight:600, color:'var(--blue)' }}>Rp {item.totalPrice.toLocaleString('id-ID')}</div>}
                          {item.addedAt && <div style={{ fontSize:11, color:'#B0B8CC', fontFamily:'var(--ff-mono)' }}>{formatTs(item.addedAt)}</div>}
                        </div>
                      </div>
                    </div>
                    {/* Status footer */}
                    <StatusFooter status={item.status} waNumber={waNumber} />
                  </div>
                );
              }

              // ── Redemption card ────────────────────────────────
              if (item.type === 'redemption') {
                return (
                  <div key={item.id} style={{ background:'white', border:'2px solid rgba(212,160,23,0.25)', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
                    {/* Header bar */}
                    <div style={{ background:'linear-gradient(90deg,rgba(212,160,23,0.1),rgba(212,160,23,0.03))', borderBottom:'1px solid rgba(212,160,23,0.12)', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      <span style={{ fontSize:15 }}>⭐</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--gold)', letterSpacing:'0.06em', textTransform:'uppercase' }}>Redeemed Item</span>
                      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <div style={{ background:'rgba(212,160,23,0.12)', border:'1px solid rgba(212,160,23,0.25)', borderRadius:20, padding:'3px 10px', fontSize:11, color:'var(--gold)', fontWeight:700, fontFamily:'var(--ff-mono)' }}>
                          −{item.pointsCost} pts
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                    {/* Body */}
                    <div style={{ padding:20, display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.productName} style={{ width:80, height:80, borderRadius:10, objectFit:'cover', flexShrink:0, border:'1px solid #E4E8F0' }} />
                        : <div style={{ width:80, height:80, borderRadius:10, background:'linear-gradient(135deg,#FDF8EC,#F5E8C0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, flexShrink:0 }}>⭐</div>
                      }
                      <div style={{ flex:1, minWidth:120 }}>
                        <div style={{ fontSize:16, fontWeight:700, color:'var(--black)', marginBottom:4 }}>{item.productName}</div>
                        {item.description && <div style={{ fontSize:13, color:'#7A8299', lineHeight:1.5, marginBottom:8 }}>{item.description}</div>}
                        {item.addedAt && <div style={{ fontSize:11, color:'#B0B8CC', fontFamily:'var(--ff-mono)' }}>{formatTs(item.addedAt)}</div>}
                      </div>
                    </div>
                    {/* Status footer */}
                    <StatusFooter status={item.status} waNumber={waNumber} />
                  </div>
                );
              }

              // ── Live session card ──────────────────────────────
              return (
                <div key={item.id} style={{ background:'white', border:'1px solid #E4E8F0', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
                  {/* Header bar */}
                  <div style={{ background:'var(--red)', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'white', display:'inline-block', animation:'livepulse 1.2s infinite', flexShrink:0 }} />
                    <span style={{ fontSize:12, fontWeight:700, color:'white', letterSpacing:'0.06em' }}>LIVE</span>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.8)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{item.liveTitle}</span>
                    <div style={{ flexShrink:0, background:'white', borderRadius:20, padding:'2px 2px' }}>
  <StatusBadge status={item.status} />
</div>
                  </div>
                  {/* Body */}
                  <div style={{ padding:20 }}>
                    <div style={{ fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:'#8892A8', fontWeight:600, marginBottom:12 }}>Items Stored</div>
                    {item.packs?.map((pack, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#F8F9FC', borderRadius:8, marginBottom:6 }}>
                        <span style={{ fontSize:20 }}>📦</span>
                        <span style={{ fontSize:14, fontWeight:500, color:'var(--black)', flex:1 }}>{pack}</span>
                      </div>
                    ))}

                    {item.photos && item.photos.length > 0 && (
                      <div style={{ marginTop:20 }}>
                        <div style={{ fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:'#8892A8', fontWeight:600, marginBottom:12 }}>Photos</div>
                        <div className="vault-photo-grid">
                          {item.photos.map((url, i) => (
                            <img key={i} src={url} alt="vault" style={{ width:'100%', aspectRatio:'1', objectFit:'cover', borderRadius:8, border:'1px solid #E4E8F0' }} />
                          ))}
                        </div>
                      </div>
                    )}

                    {item.addedAt && (
                      <div style={{ marginTop:16, fontSize:11, color:'#B0B8CC', fontFamily:'var(--ff-mono)' }}>Added {formatTs(item.addedAt)}</div>
                    )}
                  </div>
                  {/* Status footer */}
                  <StatusFooter status={item.status} waNumber={waNumber} />
                </div>
              );
            })}
          </div>
        )}

                {/* ── PSA GRADING TAB ── */}
        {activeTab==='psa' && (
          <div className="vault-content">
            {vaultItems.filter(i => i.type === 'psa').length === 0 ? (
              <div style={{ background:'white', border:'1px solid #E4E8F0', borderRadius:8, padding:32, textAlign:'center', color:'#8892A8', fontSize:14 }}>
                No PSA grading submissions yet. Contact PokeJoe to submit cards for grading. 🏆
              </div>
            ) : vaultItems.filter(i => i.type === 'psa').map(item => (
              <div key={item.id} style={{ background:'white', border:'1px solid #E4E8F0', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
                {/* Header bar */}
                <div style={{ background:'linear-gradient(90deg,rgba(212,160,23,0.12),rgba(212,160,23,0.03))', borderBottom:'1px solid rgba(212,160,23,0.15)', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ fontSize:15 }}>🏆</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#B8860B', letterSpacing:'0.06em', textTransform:'uppercase' }}>PSA Grading</span>
                  <span style={{ fontSize:12, color:'rgba(0,0,0,0.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{item.liveTitle}</span>
                  <div style={{ flexShrink:0 }}>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
                {/* Body */}
                <div style={{ padding:20 }}>
                  <div style={{ fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:'#8892A8', fontWeight:600, marginBottom:12 }}>Cards Submitted</div>
                  {item.packs?.map((card, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#F8F9FC', borderRadius:8, marginBottom:6 }}>
                      <span style={{ fontSize:18 }}>🃏</span>
                      <span style={{ fontSize:14, fontWeight:500, color:'var(--black)', flex:1 }}>{card}</span>
                    </div>
                  ))}

                  {item.photos && item.photos.length > 0 && (
                    <div style={{ marginTop:20 }}>
                      <div style={{ fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:'#8892A8', fontWeight:600, marginBottom:12 }}>Photos</div>
                      <div className="vault-photo-grid">
                        {item.photos.map((url, i) => (
                          <img key={i} src={url} alt="psa" style={{ width:'100%', aspectRatio:'1', objectFit:'cover', borderRadius:8, border:'1px solid #E4E8F0' }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {item.addedAt && (
                    <div style={{ marginTop:16, fontSize:11, color:'#B0B8CC', fontFamily:'var(--ff-mono)' }}>Submitted {formatTs(item.addedAt)}</div>
                  )}
                </div>
                {/* Status footer */}
                <StatusFooter status={item.status} waNumber={waNumber} />
              </div>
            ))}
          </div>
        )}

        {/* ── REDEEM TAB ── */}
        {activeTab==='redeem' && (
          <div className="vault-content">
            <div style={{ background:'white', border:'1px solid #E4E8F0', borderRadius:12, padding:32, textAlign:'center' }}>
              <div style={{ fontFamily:'var(--ff-display)', fontSize:48, color:'var(--gold)', marginBottom:8 }}>{customer?.points ?? 0} PTS</div>
              <p style={{ fontSize:14, color:'#7A8299', marginBottom:24 }}>Browse redeemable products and contact PokeJoe via WhatsApp to redeem.</p>
              <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                <a href="/redeem" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--gold)', color:'var(--black)', textDecoration:'none', padding:'14px 28px', borderRadius:8, fontSize:14, fontWeight:600 }}>⭐ Browse Rewards</a>
                <a href={`https://wa.me/${waNumber}?text=Hi+PokeJoe!+I+want+to+redeem+my+points.`} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#25D366', color:'white', textDecoration:'none', padding:'14px 28px', borderRadius:8, fontSize:14, fontWeight:600 }}>💬 Redeem via WhatsApp</a>
              </div>
              <div style={{ marginTop:32, textAlign:'left' }}>
                <div style={{ fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', color:'#8892A8', fontWeight:500, marginBottom:12 }}>What you can redeem</div>
                {['PSA Graded Slabs','Sealed Booster Packs','Elite Trainer Boxes','Exclusive PokeJoe Merch'].map((item,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#5A6278', padding:'8px 0', borderBottom:i<3?'1px solid #EEF0F5':'none' }}>
                    <span style={{ color:'var(--gold)', fontWeight:700 }}>→</span> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes livepulse { 0%,100%{opacity:1;}50%{opacity:0.4;} }`}</style>
    </>
  );
}

// ── Status footer strip (bottom of each card) ─────────────────────
function StatusFooter({ status, waNumber }: { status?: string; waNumber: string }) {
  if (status === 'Done') {
    return (
      <div style={{ margin:'0 20px 20px', background:'rgba(22,163,74,0.06)', border:'1px solid rgba(22,163,74,0.15)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>✅</span>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#16a34a' }}>Completed</div>
          <div style={{ fontSize:11, color:'#8892A8', marginTop:1 }}>This item has been processed and delivered.</div>
        </div>
      </div>
    );
  }
  if (status === 'In transit') {
    return (
      <div style={{ margin:'0 20px 20px', background:'rgba(217,119,6,0.05)', border:'1px solid rgba(217,119,6,0.15)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:18 }}>🚚</span>
        <div style={{ flex:1, minWidth:120 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#D97706' }}>In Transit</div>
          <div style={{ fontSize:11, color:'#8892A8', marginTop:1 }}>Your item is on its way to you.</div>
        </div>
        <a href={`https://wa.me/${waNumber}?text=Hi+PokeJoe!+I+want+to+check+the+status+of+my+item.`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize:12, fontWeight:600, color:'#25D366', background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', padding:'6px 12px', borderRadius:8, textDecoration:'none', whiteSpace:'nowrap' }}>
          💬 Track via WhatsApp
        </a>
      </div>
    );
  }
  // On progress (default)
  return (
    <div style={{ margin:'0 20px 20px', background:'#F8F9FC', border:'1px solid #E4E8F0', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
      <span style={{ fontSize:18 }}>📦</span>
      <div style={{ flex:1, minWidth:120 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#5A6278' }}>Stored in your vault</div>
        <div style={{ fontSize:11, color:'#8892A8', marginTop:1 }}>Ready to ship whenever you&apos;re ready.</div>
      </div>
      <a href={`https://wa.me/${waNumber}?text=Hi+PokeJoe!+I+want+to+arrange+a+shipment+for+my+vault+items.`} target="_blank" rel="noopener noreferrer"
        style={{ fontSize:12, fontWeight:600, color:'#25D366', background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', padding:'6px 12px', borderRadius:8, textDecoration:'none', whiteSpace:'nowrap' }}>
        💬 Request Shipment
      </a>
    </div>
  );
}