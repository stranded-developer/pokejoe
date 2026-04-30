'use client';
import { useState, useEffect, useCallback } from 'react';
import { getDoc, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAllCustomers, addPoints, setVaultActive, addVaultItem, upsertProduct } from '@/lib/db';

type Customer = { id:string; username:string; firstName?:string; lastName?:string; phone?:string; points:number; vaultActive:boolean; joinedAt?:{seconds:number}; purchaseHistory?:Array<{description:string;amount:number;points:number;date:string}>; };
type Tab = 'customers'|'vault'|'products';

type ProdItem = { id:string; name:string; series?:string; price:number; stock?:number; emoji?:string; imageUrl?:string; description?:string; };


function generateUsername(firstName: string, lastName: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const f = clean(firstName);
  const l = clean(lastName);
  const base = (f.slice(0,3) + l.slice(0,3)).padEnd(6, 'x');
  const rand = Math.floor(Math.random() * 99).toString().padStart(2, '0');

  
  return base + rand;
}



export default function AdminPage() {
  const [products, setProducts] = useState<ProdItem[]>([]);
const [prodLoading, setProdLoading] = useState(false);
const [editingProd, setEditingProd] = useState<string|null>(null);
const [deletingProd, setDeletingProd] = useState<string|null>(null);
const [editProdName, setEditProdName] = useState('');
const [editProdSeries, setEditProdSeries] = useState('');
const [editProdPrice, setEditProdPrice] = useState('');
const [editProdStock, setEditProdStock] = useState('');
const [editProdDesc, setEditProdDesc] = useState('');
const [editProdPhoto, setEditProdPhoto] = useState<{file:File;preview:string;uploading:boolean}|null>(null);
  const [prodPhotos, setProdPhotos] = useState<Array<{file:File; preview:string; uploading:boolean}>>([]);
  const [vaultPhotos, setVaultPhotos] = useState<Array<{file:File; preview:string; uploading:boolean}>>([]);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [editing, setEditing] = useState<string|null>(null);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string|null>(null);
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [checkingPw, setCheckingPw] = useState(false);
  const [tab, setTab] = useState<Tab>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  // New customer form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [ptsUser, setPtsUser] = useState('');
  const [ptsAmount, setPtsAmount] = useState('');
  const [ptsDesc, setPtsDesc] = useState('');
  const [vaultUser, setVaultUser] = useState('');
  const [vaultTitle, setVaultTitle] = useState('');
  const [vaultPacks, setVaultPacks] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodSeries, setProdSeries] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodEmoji, setProdEmoji] = useState('📦');

  function showToast(msg:string) { setToast(msg); setTimeout(()=>setToast(''),3000); }



   const loadCustomers = useCallback(async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'customers'));
    setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[]);
    setLoading(false);
  }, []);
  
  const loadProducts = useCallback(async () => {
  setProdLoading(true);
  const { getDocs, collection: col } = await import('firebase/firestore');
  const snap = await getDocs(col(db, 'products'));
  setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ProdItem[]);
  setProdLoading(false);
}, []);

useEffect(() => { if (authed) { loadCustomers(); loadProducts(); } }, [authed, loadCustomers, loadProducts]);


 

  async function doAuth() {
    setCheckingPw(true);
    setPwError(false);
    try {
      const snap = await getDoc(doc(db, 'config', 'admin'));
      const correct = snap.exists() ? snap.data().password : null;
      if (pw === correct) { setAuthed(true); } else { setPwError(true); }
    } catch { setPwError(true); }
    setCheckingPw(false);
  }

  async function handleCreateCustomer() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setCreateError('All fields are required.'); return;
    }
    setCreating(true);
    setCreateError('');
    try {
      // Check if phone already exists
      const snap = await getDocs(collection(db, 'customers'));
      const existing = snap.docs.find(d => d.data().phone === phone.trim());
      if (existing) {
        setCreateError(`Phone already registered as @${existing.data().username}`);
        setCreating(false); return;
      }

      // Generate unique username
      let username = generateUsername(firstName, lastName);
      let attempts = 0;
      while (attempts < 10) {
        const check = await getDoc(doc(db, 'customers', username));
        if (!check.exists()) break;
        username = generateUsername(firstName, lastName);
        attempts++;
      }

      await setDoc(doc(db, 'customers', username), {
        username,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        points: 0,
        vaultActive: true,
        joinedAt: new Date().toISOString(),
        purchaseHistory: [],
      });

      showToast(`Customer created! Username: @${username}`);
      setFirstName(''); setLastName(''); setPhone('');
      loadCustomers();
    } catch (e: unknown) {
      setCreateError((e as Error).message || 'Error creating customer');
    }
    setCreating(false);
  }

  if (!authed) return (
    <div style={{ background:'#080B10', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'40px 36px', width:360 }}>
        <div style={{ fontFamily:'var(--ff-display)', fontSize:24, color:'white', letterSpacing:'0.08em', marginBottom:4 }}>POKE<span style={{ color:'var(--gold)' }}>JOE</span></div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:28 }}>Admin Panel</div>
        <input type="password" placeholder="Admin password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doAuth()}
          style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'12px 14px', color:'white', fontFamily:'var(--ff-mono)', fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:12 }} />
        {pwError && <div style={{ fontSize:12, color:'#FF6B75', marginBottom:10 }}>Wrong password.</div>}
        <button onClick={doAuth} style={{ width:'100%', background:'var(--gold)', color:'var(--black)', border:'none', padding:12, borderRadius:8, fontWeight:600, cursor:'pointer', fontSize:14, opacity:checkingPw?0.7:1 }}>
          {checkingPw ? 'Checking...' : 'Enter'}
        </button>
      </div>
    </div>
  );

  const inp = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'10px 12px', color:'white', fontFamily:'var(--ff-body)' as const, fontSize:13, outline:'none', boxSizing:'border-box' as const, marginBottom:10 };
  const lbl = { display:'block', fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase' as const, marginBottom:5, marginTop:8 };
  const btn = { background:'var(--gold)', color:'var(--black)', border:'none', padding:'10px 20px', borderRadius:8, fontWeight:600 as const, cursor:'pointer' as const, fontSize:13, marginTop:8 };
  const ptsCalc = ptsAmount ? Math.floor(parseFloat(ptsAmount)/100000) : 0;

  const navItems = [
    { key:'customers' as Tab, icon:'👥', label:'Customers' },
    { key:'vault' as Tab, icon:'📦', label:'Add Vault Items' },
    { key:'products' as Tab, icon:'🃏', label:'Products' },
  ];

  return (
    <div style={{ background:'#080B10', minHeight:'100vh', display:'flex' }}>
      {/* Sidebar */}
      <div style={{ background:'#060810', width:220, borderRight:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'24px 20px', fontFamily:'var(--ff-display)', fontSize:20, color:'white', letterSpacing:'0.08em', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          POKE<span style={{ color:'var(--gold)' }}>JOE</span>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:'0.2em', textTransform:'uppercase', marginTop:2, fontFamily:'var(--ff-body)', fontWeight:400 }}>Back Office</div>
        </div>
        <nav style={{ padding:'12px 0', flex:1 }}>
          {navItems.map(n => (
            <div key={n.key} onClick={()=>setTab(n.key)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 20px', fontSize:13, cursor:'pointer', color:tab===n.key?'var(--gold)':'rgba(255,255,255,0.35)', background:tab===n.key?'rgba(212,160,23,0.06)':'transparent', borderLeft:tab===n.key?'2px solid var(--gold)':'2px solid transparent' }}>
              {n.icon} {n.label}
            </div>
          ))}
        </nav>
        <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={()=>setAuthed(false)} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.3)', padding:'6px 14px', borderRadius:6, fontSize:12, cursor:'pointer' }}>Logout</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, padding:32, overflowY:'auto' }}>

        {tab==='customers' && <>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontFamily:'var(--ff-display)', fontSize:32, color:'white', letterSpacing:'0.04em' }}>CUSTOMERS</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Manage accounts, points & vault status</div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
            {[
              { label:'Total Customers', val:customers.length, color:'white' },
              { label:'Points Issued', val:customers.reduce((a,c)=>a+(c.points||0),0)+' pts', color:'var(--gold)' },
              { label:'Vaults Active', val:customers.filter(c=>c.vaultActive).length, color:'var(--green)' },
              { label:'Total Accounts', val:customers.length, color:'white' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:20 }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>{s.label}</div>
                <div style={{ fontFamily:'var(--ff-display)', fontSize:36, color:s.color, lineHeight:1 }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* New customer form */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:24, marginBottom:24 }}>
            <div style={{ fontSize:14, color:'white', fontWeight:600, marginBottom:16 }}>+ New Customer</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={lbl}>First Name</label>
                <input placeholder="Joe" value={firstName} onChange={e=>{setFirstName(e.target.value);setCreateError('');}} style={{ ...inp, marginBottom:0 }} />
              </div>
              <div>
                <label style={lbl}>Last Name</label>
                <input placeholder="Smith" value={lastName} onChange={e=>{setLastName(e.target.value);setCreateError('');}} style={{ ...inp, marginBottom:0 }} />
              </div>
              <div>
                <label style={lbl}>Phone Number</label>
                <input placeholder="08123456789" value={phone} onChange={e=>{setPhone(e.target.value);setCreateError('');}} style={{ ...inp, marginBottom:0 }} />
              </div>
            </div>
            {firstName && lastName && (
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginBottom:12 }}>
                Preview username: <span style={{ fontFamily:'var(--ff-mono)', color:'var(--gold)' }}>@{generateUsername(firstName, lastName)}</span> (final may vary)
              </div>
            )}
            {createError && <div style={{ fontSize:12, color:'#FF6B75', marginBottom:10, padding:'8px 12px', background:'rgba(230,57,70,0.08)', borderRadius:6 }}>{createError}</div>}
            <button onClick={handleCreateCustomer} disabled={creating} style={{ ...btn, opacity:creating?0.7:1 }}>
              {creating ? 'Creating...' : 'Create Customer'}
            </button>
          </div>

          {/* Add points */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:24, marginBottom:24 }}>
            <div style={{ fontSize:14, color:'white', fontWeight:600, marginBottom:4 }}>Add Points — Auto Conversion</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginBottom:16 }}>Rp 100,000 = 1 point</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto 1fr', gap:12, alignItems:'end' }}>
              <div><label style={lbl}>Customer Username</label><input placeholder="joesmi42" value={ptsUser} onChange={e=>setPtsUser(e.target.value)} style={{ ...inp, marginBottom:0 }} /></div>
              <div><label style={lbl}>Purchase Amount (Rp)</label><input type="number" placeholder="5000000" value={ptsAmount} onChange={e=>setPtsAmount(e.target.value)} style={{ ...inp, marginBottom:0 }} /></div>
              <div style={{ textAlign:'center', paddingBottom:2 }}><div style={{ fontSize:20, color:'var(--gold)' }}>→</div><div style={{ fontSize:10, color:'rgba(255,255,255,0.2)' }}>Rp 100K = 1pt</div></div>
              <div><label style={lbl}>Points to Add</label><input readOnly value={ptsCalc} style={{ ...inp, marginBottom:0, color:'var(--gold)', fontFamily:'var(--ff-mono)', fontWeight:700 }} /></div>
            </div>
            <div style={{ marginTop:12 }}><label style={lbl}>Description</label><input placeholder="e.g. Prismatic Pack x5 — LIVE 20/05/2026" value={ptsDesc} onChange={e=>setPtsDesc(e.target.value)} style={{ ...inp, marginBottom:0 }} /></div>
            <button onClick={async()=>{ if(!ptsUser||!ptsAmount)return; try{ const pts=await addPoints(ptsUser,parseFloat(ptsAmount),ptsDesc||`Purchase Rp ${ptsAmount}`); showToast(`+${pts} pts added to ${ptsUser} ✓`); setPtsUser('');setPtsAmount('');setPtsDesc(''); loadCustomers(); }catch(e:unknown){ showToast((e as Error).message||'Error'); } }} style={btn}>Add Points</button>
          </div>

          

          {/* Customer table */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, overflow:'hidden' }}>
            {/* Search bar */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <input
                placeholder="🔍  Search username, name or phone..."
                value={search}
                onChange={e=>setSearch(e.target.value)}
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'10px 14px', color:'white', fontFamily:'var(--ff-body)', fontSize:13, outline:'none', boxSizing:'border-box' as const }}
              />
            </div>

            {/* Header */}
            <div style={{ display:'grid', gridTemplateColumns:'40px 1fr 1fr 100px 80px 120px 140px', padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              {['#','Username','Name','Points','Orders','Vault','Actions'].map((h,i)=>(
                <div key={i} style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{h}</div>
              ))}
            </div>

            {loading ? <div style={{ padding:32, textAlign:'center', color:'rgba(255,255,255,0.3)' }}>Loading...</div>
            : (() => {
              const filtered = customers.filter(c => {
                const q = search.toLowerCase();
                return (
                  c.username?.toLowerCase().includes(q) ||
                  c.firstName?.toLowerCase().includes(q) ||
                  c.lastName?.toLowerCase().includes(q) ||
                  c.phone?.includes(q)
                );
              });
              if (filtered.length === 0) return <div style={{ padding:32, textAlign:'center', color:'rgba(255,255,255,0.3)' }}>{search ? 'No results found.' : 'No customers yet.'}</div>;
              return filtered.map((c,i) => (
                <div key={c.id}>
                  {/* Row */}
                  <div
                    onClick={()=>setExpanded(expanded===c.id ? null : c.id)}
                    style={{ display:'grid', gridTemplateColumns:'40px 1fr 1fr 100px 80px 120px 140px', padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'center', cursor:'pointer', background:expanded===c.id?'rgba(212,160,23,0.04)':'transparent', transition:'background 0.15s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=expanded===c.id?'rgba(212,160,23,0.06)':'rgba(255,255,255,0.02)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background=expanded===c.id?'rgba(212,160,23,0.04)':'transparent'}
                  >
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.2)', fontFamily:'var(--ff-mono)' }}>{String(i+1).padStart(2,'0')}</div>
                    <div style={{ fontFamily:'var(--ff-mono)', fontSize:13, color:'var(--gold)', fontWeight:700 }}>@{c.username}</div>
                    <div style={{ fontSize:13, color:'white' }}>{c.firstName} {c.lastName}</div>
                    <div style={{ fontFamily:'var(--ff-mono)', fontSize:13, color:'var(--gold)', fontWeight:700 }}>{c.points} pts</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{c.purchaseHistory?.length||0}</div>
                    <div onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>setVaultActive(c.username,!c.vaultActive).then(()=>{ showToast(`Vault ${!c.vaultActive?'activated':'deactivated'}`); loadCustomers(); })} style={{ background:c.vaultActive?'rgba(34,197,94,0.15)':'rgba(255,255,255,0.06)', border:c.vaultActive?'1px solid rgba(34,197,94,0.3)':'1px solid rgba(255,255,255,0.1)', color:c.vaultActive?'var(--green)':'rgba(255,255,255,0.4)', padding:'5px 12px', borderRadius:20, fontSize:11, cursor:'pointer', fontWeight:600 }}>
                        {c.vaultActive?'● Active':'○ Off'}
                      </button>
                    </div>
                    <div style={{ display:'flex', gap:6 }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>{ setPtsUser(c.username); }} style={{ background:'rgba(212,160,23,0.1)', border:'1px solid rgba(212,160,23,0.2)', color:'var(--gold)', padding:'5px 10px', borderRadius:6, fontSize:11, cursor:'pointer' }}>+ pts</button>
                      <button onClick={()=>{ setVaultUser(c.username); setTab('vault'); }} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', padding:'5px 10px', borderRadius:6, fontSize:11, cursor:'pointer' }}>Vault</button>
                    </div>
                  </div>

                                  {/* Expanded detail */}
                {expanded===c.id && (
                  <div style={{ padding:'16px 20px 20px 60px', background:'rgba(212,160,23,0.03)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    {editing===c.id ? (
                      // Edit mode
                      <div style={{ maxWidth:600 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
                          <div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>First Name</div>
                            <input value={editFirst} onChange={e=>setEditFirst(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(212,160,23,0.4)', borderRadius:8, padding:'10px 12px', color:'white', fontFamily:'var(--ff-body)', fontSize:13, outline:'none', boxSizing:'border-box' as const }} />
                          </div>
                          <div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Last Name</div>
                            <input value={editLast} onChange={e=>setEditLast(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(212,160,23,0.4)', borderRadius:8, padding:'10px 12px', color:'white', fontFamily:'var(--ff-body)', fontSize:13, outline:'none', boxSizing:'border-box' as const }} />
                          </div>
                          <div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Phone</div>
                            <input value={editPhone} onChange={e=>setEditPhone(e.target.value)} style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(212,160,23,0.4)', borderRadius:8, padding:'10px 12px', color:'white', fontFamily:'var(--ff-body)', fontSize:13, outline:'none', boxSizing:'border-box' as const }} />
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={async()=>{
                            const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
                            await updateDoc(firestoreDoc(db, 'customers', c.id), { firstName: editFirst, lastName: editLast, phone: editPhone });
                            showToast(`${c.username} updated ✓`);
                            setEditing(null);
                            loadCustomers();
                          }} style={{ background:'var(--gold)', color:'var(--black)', border:'none', padding:'8px 18px', borderRadius:6, fontWeight:600, cursor:'pointer', fontSize:13 }}>Save</button>
                          <button onClick={()=>setEditing(null)} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', padding:'8px 18px', borderRadius:6, cursor:'pointer', fontSize:13 }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                    <div style={{ maxWidth:600 }}>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:12 }}>
                        {[
                          { label:'First Name', val:c.firstName||'—' },
                          { label:'Last Name', val:c.lastName||'—' },
                          { label:'Phone', val:c.phone||'—' },
                        ].map((f,i)=>(
                          <div key={i} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'12px 16px' }}>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>{f.label}</div>
                            <div style={{ fontSize:14, color:'white', fontWeight:500 }}>{f.val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div style={{ fontSize:12, color:'rgba(255,255,255,0.2)' }}>
                          Joined: {c.joinedAt ? new Date(c.joinedAt as unknown as string).toLocaleDateString('id-ID') : '—'} · {c.purchaseHistory?.length||0} purchases
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={()=>{ setEditing(c.id); setEditFirst(c.firstName||''); setEditLast(c.lastName||''); setEditPhone(c.phone||''); }}
                            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', padding:'6px 14px', borderRadius:6, cursor:'pointer', fontSize:12 }}>
                            ✏️ Edit
                          </button>
                          <button onClick={()=>setVaultActive(c.username, !c.vaultActive).then(()=>{ showToast(`Vault ${!c.vaultActive?'activated':'deactivated'}`); loadCustomers(); })}
                            style={{ background:c.vaultActive?'rgba(255,255,255,0.04)':'rgba(34,197,94,0.1)', border:c.vaultActive?'1px solid rgba(255,255,255,0.1)':'1px solid rgba(34,197,94,0.3)', color:c.vaultActive?'rgba(255,255,255,0.5)':'var(--green)', padding:'6px 14px', borderRadius:6, cursor:'pointer', fontSize:12 }}>
                            {c.vaultActive ? '⏸ Deactivate' : '▶ Activate'}
                          </button>
                          {deleting===c.id ? (
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <span style={{ fontSize:12, color:'#FF6B75' }}>Delete @{c.username}?</span>
                              <button onClick={async()=>{
                                const { deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');
                                await deleteDoc(firestoreDoc(db, 'customers', c.id));
                                showToast(`@${c.username} deleted`);
                                setDeleting(null);
                                setExpanded(null);
                                loadCustomers();
                              }} style={{ background:'var(--red)', color:'white', border:'none', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>Yes, Delete</button>
                              <button onClick={()=>setDeleting(null)} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:12 }}>Cancel</button>
                            </div>
                          ) : (
                            <button onClick={()=>setDeleting(c.id)}
                              style={{ background:'rgba(230,57,70,0.08)', border:'1px solid rgba(230,57,70,0.2)', color:'#FF6B75', padding:'6px 14px', borderRadius:6, cursor:'pointer', fontSize:12 }}>
                              🗑 Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                )}
                </div>
              ));
            })()}
          </div>
        </>}

        {tab==='vault' && <>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontFamily:'var(--ff-display)', fontSize:32, color:'white' }}>ADD VAULT ITEMS</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Add items from a live session to a customer&apos;s vault</div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:28, maxWidth:700 }}>
            <label style={lbl}>Customer Username</label>
            <input placeholder="joesmi42" value={vaultUser} onChange={e=>setVaultUser(e.target.value)} style={inp} />
            <label style={lbl}>Live Session Title</label>
            <input placeholder="LIVE Rip n Ship 20/05/2026" value={vaultTitle} onChange={e=>setVaultTitle(e.target.value)} style={inp} />
            <label style={lbl}>Packs / Items (one per line)</label>
            <textarea placeholder={'5x Ascended Heroes Pack\n2x Prismatic Evolutions Pack'} value={vaultPacks} onChange={e=>setVaultPacks(e.target.value)} rows={5} style={{ ...inp, resize:'vertical' as const, lineHeight:1.6 }} />

            {/* Photo upload */}
            <label style={lbl}>Photos</label>
            <div
              onDragOver={e=>{ e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; }}
              onDragLeave={e=>{ (e.currentTarget as HTMLDivElement).style.borderColor='rgba(255,255,255,0.1)'; }}
              onDrop={async e=>{
                e.preventDefault();
                (e.currentTarget as HTMLDivElement).style.borderColor='rgba(255,255,255,0.1)';
                const files = Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/'));
                if(!files.length) return;
                setVaultPhotos(prev=>[...prev, ...files.map(f=>({ file:f, preview:URL.createObjectURL(f), uploading:false }))]);
              }}
              style={{ border:'2px dashed rgba(255,255,255,0.1)', borderRadius:10, padding:24, textAlign:'center', marginBottom:10, transition:'border-color 0.2s', cursor:'pointer' }}
              onClick={()=>document.getElementById('vault-photo-input')?.click()}
            >
              <div style={{ fontSize:28, marginBottom:8 }}>📸</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>Click or drag & drop images here</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', marginTop:4 }}>JPG, PNG, WEBP supported</div>
              <input
                id="vault-photo-input"
                type="file"
                accept="image/*"
                multiple
                style={{ display:'none' }}
                onChange={e=>{
                  const files = Array.from(e.target.files||[]);
                  setVaultPhotos(prev=>[...prev, ...files.map(f=>({ file:f, preview:URL.createObjectURL(f), uploading:false }))]);
                  e.target.value='';
                }}
              />
            </div>

            {/* Photo previews */}
            {vaultPhotos.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                {vaultPhotos.map((p,i)=>(
                  <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
                    <img src={p.preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    {p.uploading && (
                      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'white' }}>
                        Uploading...
                      </div>
                    )}
                    {!p.uploading && (
                      <button
                        onClick={()=>setVaultPhotos(prev=>prev.filter((_,j)=>j!==i))}
                        style={{ position:'absolute', top:4, right:4, background:'rgba(230,57,70,0.8)', border:'none', color:'white', width:22, height:22, borderRadius:'50%', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button onClick={async()=>{
              if(!vaultUser||!vaultTitle||!vaultPacks) return;
              const check = await getDoc(doc(db, 'customers', vaultUser.toLowerCase()));
              if(!check.exists()) { showToast(`❌ Username "@${vaultUser}" not found`); return; }

              // Upload photos
              let photoUrls: string[] = [];
              if(vaultPhotos.length > 0) {
                setVaultPhotos(prev=>prev.map(p=>({...p, uploading:true})));
                const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                const { storage } = await import('@/lib/firebase');
                photoUrls = await Promise.all(
                  vaultPhotos.map(async(p)=>{
                    const ext = p.file.name.split('.').pop();
                    const path = `vault/${vaultUser.toLowerCase()}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                    const storageRef = ref(storage, path);
                    await uploadBytes(storageRef, p.file);
                    return getDownloadURL(storageRef);
                  })
                );
              }

              const packs = vaultPacks.split('\n').map(s=>s.trim()).filter(Boolean);
              await addVaultItem(vaultUser, { liveTitle:vaultTitle, packs, photos:photoUrls });
              showToast(`Vault item added for ${vaultUser} ✓`);
              setVaultUser(''); setVaultTitle(''); setVaultPacks('');
              setVaultPhotos([]);
            }} style={btn}>Add to Vault</button>
          </div>
        </>}

        {tab==='products' && <>
  <div style={{ marginBottom:28 }}>
    <div style={{ fontFamily:'var(--ff-display)', fontSize:32, color:'white' }}>PRODUCTS</div>
    <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Add or manage catalog products</div>
  </div>

  {/* Add form */}
  <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:28, maxWidth:700, marginBottom:32 }}>
    <div style={{ fontSize:14, color:'white', fontWeight:600, marginBottom:16 }}>+ Add New Product</div>
    <label style={lbl}>Product Name</label>
    <input placeholder="Prismatic Evolutions Pack" value={prodName} onChange={e=>setProdName(e.target.value)} style={inp} />
    <label style={lbl}>Series / Category</label>
    <input placeholder="Scarlet & Violet" value={prodSeries} onChange={e=>setProdSeries(e.target.value)} style={inp} />
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      <div><label style={lbl}>Price (Rp)</label><input type="number" placeholder="150000" value={prodPrice} onChange={e=>setProdPrice(e.target.value)} style={inp} /></div>
      <div><label style={lbl}>Stock</label><input type="number" placeholder="20" value={prodStock} onChange={e=>setProdStock(e.target.value)} style={inp} /></div>
    </div>
    <label style={lbl}>Emoji Icon (fallback if no photo)</label>
    <input placeholder="📦" value={prodEmoji} onChange={e=>setProdEmoji(e.target.value)} style={{ ...inp, width:80 }} />
    <label style={lbl}>Description</label>
    <textarea placeholder="Product description..." value={prodDesc} onChange={e=>setProdDesc(e.target.value)} rows={3} style={{ ...inp, resize:'vertical' as const }} />
    <label style={lbl}>Product Photo</label>
    <div
      onDragOver={e=>{ e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor='var(--gold)'; }}
      onDragLeave={e=>{ (e.currentTarget as HTMLDivElement).style.borderColor='rgba(255,255,255,0.1)'; }}
      onDrop={e=>{ e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor='rgba(255,255,255,0.1)'; const files=Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/')); if(!files.length)return; setProdPhotos(files.map(f=>({file:f,preview:URL.createObjectURL(f),uploading:false}))); }}
      style={{ border:'2px dashed rgba(255,255,255,0.1)', borderRadius:10, padding:24, textAlign:'center', marginBottom:10, transition:'border-color 0.2s', cursor:'pointer' }}
      onClick={()=>document.getElementById('prod-photo-input')?.click()}
    >
      <div style={{ fontSize:28, marginBottom:8 }}>🖼️</div>
      <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>Click or drag & drop product image</div>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', marginTop:4 }}>JPG, PNG, WEBP supported</div>
      <input id="prod-photo-input" type="file" accept="image/*" multiple style={{ display:'none' }}
        onChange={e=>{ const files=Array.from(e.target.files||[]); setProdPhotos(files.map(f=>({file:f,preview:URL.createObjectURL(f),uploading:false}))); e.target.value=''; }} />
    </div>
    {prodPhotos.length > 0 && (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {prodPhotos.map((p,i)=>(
          <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
            <img src={p.preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            {p.uploading && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'white' }}>Uploading...</div>}
            {!p.uploading && <button onClick={()=>setProdPhotos(prev=>prev.filter((_,j)=>j!==i))} style={{ position:'absolute', top:4, right:4, background:'rgba(230,57,70,0.8)', border:'none', color:'white', width:22, height:22, borderRadius:'50%', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>}
          </div>
        ))}
      </div>
    )}
    <button onClick={async()=>{
      if(!prodName||!prodPrice) return;
      let imageUrl = '';
      if(prodPhotos.length > 0) {
        setProdPhotos(prev=>prev.map(p=>({...p,uploading:true})));
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('@/lib/firebase');
        const p = prodPhotos[0];
        const ext = p.file.name.split('.').pop();
        const path = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, p.file);
        imageUrl = await getDownloadURL(storageRef);
      }
      await upsertProduct(null, { name:prodName, series:prodSeries, price:parseFloat(prodPrice), stock:parseInt(prodStock)||0, description:prodDesc, emoji:prodEmoji, ...(imageUrl && { imageUrl }) });
      showToast(`"${prodName}" added ✓`);
      setProdName(''); setProdSeries(''); setProdPrice(''); setProdStock(''); setProdDesc(''); setProdPhotos([]);
      loadProducts();
    }} style={btn}>Add Product</button>
  </div>

  {/* Product list */}
  <div style={{ maxWidth:700 }}>
    <div style={{ fontSize:14, color:'white', fontWeight:600, marginBottom:16 }}>All Products ({products.length})</div>
    {prodLoading ? (
      <div style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>Loading...</div>
    ) : products.length === 0 ? (
      <div style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>No products yet.</div>
    ) : products.map((p: ProdItem) => (
      <div key={p.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:16, marginBottom:12 }}>
        {editingProd===p.id ? (
          // Edit mode
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div><label style={lbl}>Name</label><input value={editProdName} onChange={e=>setEditProdName(e.target.value)} style={{ ...inp, marginBottom:0 }} /></div>
              <div><label style={lbl}>Series</label><input value={editProdSeries} onChange={e=>setEditProdSeries(e.target.value)} style={{ ...inp, marginBottom:0 }} /></div>
              <div><label style={lbl}>Price (Rp)</label><input type="number" value={editProdPrice} onChange={e=>setEditProdPrice(e.target.value)} style={{ ...inp, marginBottom:0 }} /></div>
              <div><label style={lbl}>Stock</label><input type="number" value={editProdStock} onChange={e=>setEditProdStock(e.target.value)} style={{ ...inp, marginBottom:0 }} /></div>
            </div>
            <div><label style={lbl}>Description</label><textarea value={editProdDesc} onChange={e=>setEditProdDesc(e.target.value)} rows={2} style={{ ...inp, resize:'vertical' as const }} /></div>

            {/* New image upload for edit */}
            <label style={lbl}>Replace Image (optional)</label>
            <div style={{ border:'2px dashed rgba(255,255,255,0.1)', borderRadius:8, padding:16, textAlign:'center', marginBottom:10, cursor:'pointer' }}
              onClick={()=>document.getElementById(`edit-prod-photo-${p.id}`)?.click()}>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>Click to upload new image</div>
              <input id={`edit-prod-photo-${p.id}`} type="file" accept="image/*" style={{ display:'none' }}
                onChange={e=>{ const f=e.target.files?.[0]; if(f) setEditProdPhoto({file:f,preview:URL.createObjectURL(f),uploading:false}); e.target.value=''; }} />
            </div>
            {editProdPhoto && (
              <div style={{ position:'relative', width:80, height:80, borderRadius:8, overflow:'hidden', marginBottom:10 }}>
                <img src={editProdPhoto.preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                <button onClick={()=>setEditProdPhoto(null)} style={{ position:'absolute', top:2, right:2, background:'rgba(230,57,70,0.8)', border:'none', color:'white', width:18, height:18, borderRadius:'50%', cursor:'pointer', fontSize:10 }}>×</button>
              </div>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={async()=>{
                let imageUrl = p.imageUrl || '';
                if(editProdPhoto) {
                  const { ref, uploadBytes, getDownloadURL, deleteObject } = await import('firebase/storage');
                  const { storage } = await import('@/lib/firebase');
                  // Delete old image if exists
                  if(p.imageUrl) {
                    try {
                      const oldRef = ref(storage, p.imageUrl);
                      await deleteObject(oldRef);
                    } catch {}
                  }
                  const ext = editProdPhoto.file.name.split('.').pop();
                  const path = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                  const storageRef = ref(storage, path);
                  await uploadBytes(storageRef, editProdPhoto.file);
                  imageUrl = await getDownloadURL(storageRef);
                }
                await upsertProduct(p.id, { name:editProdName, series:editProdSeries, price:parseFloat(editProdPrice), stock:parseInt(editProdStock)||0, description:editProdDesc, imageUrl });
                showToast(`"${editProdName}" updated ✓`);
                setEditingProd(null); setEditProdPhoto(null);
                loadProducts();
              }} style={{ background:'var(--gold)', color:'var(--black)', border:'none', padding:'8px 16px', borderRadius:6, fontWeight:600, cursor:'pointer', fontSize:13 }}>Save</button>
              <button onClick={()=>{ setEditingProd(null); setEditProdPhoto(null); }} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', padding:'8px 16px', borderRadius:6, cursor:'pointer', fontSize:13 }}>Cancel</button>
            </div>
          </div>
        ) : (
          // View mode
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:64, height:64, borderRadius:8, overflow:'hidden', flexShrink:0, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
              {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : p.emoji||'📦'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, color:'white', fontWeight:600 }}>{p.name}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{p.series} · Rp {p.price?.toLocaleString('id-ID')} · Stock: {p.stock??'—'}</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={()=>{ setEditingProd(p.id); setEditProdName(p.name); setEditProdSeries(p.series||''); setEditProdPrice(String(p.price)); setEditProdStock(String(p.stock||0)); setEditProdDesc(p.description||''); }}
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:12 }}>✏️ Edit</button>
              {deletingProd===p.id ? (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:11, color:'#FF6B75' }}>Delete?</span>
                  <button onClick={async()=>{
                    // Delete image from storage if exists
                    if(p.imageUrl) {
                      try {
                        const { ref, deleteObject } = await import('firebase/storage');
                        const { storage } = await import('@/lib/firebase');
                        await deleteObject(ref(storage, p.imageUrl));
                      } catch {}
                    }
                    const { deleteDoc, doc: fd } = await import('firebase/firestore');
                    await deleteDoc(fd(db, 'products', p.id));
                    showToast(`"${p.name}" deleted`);
                    setDeletingProd(null);
                    loadProducts();
                  }} style={{ background:'var(--red)', color:'white', border:'none', padding:'5px 10px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600 }}>Yes</button>
                  <button onClick={()=>setDeletingProd(null)} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)', padding:'5px 10px', borderRadius:6, cursor:'pointer', fontSize:11 }}>No</button>
                </div>
              ) : (
                <button onClick={()=>setDeletingProd(p.id)} style={{ background:'rgba(230,57,70,0.08)', border:'1px solid rgba(230,57,70,0.2)', color:'#FF6B75', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:12 }}>🗑 Delete</button>
              )}
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
</>}

      </div>

      {toast && <div style={{ position:'fixed', bottom:24, right:24, background:'var(--black)', color:'white', padding:'12px 20px', borderRadius:8, fontSize:14, zIndex:9999, borderLeft:'3px solid var(--gold)' }}>{toast}</div>}
    </div>
  );
}