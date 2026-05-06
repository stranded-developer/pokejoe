'use client';
import { useState, useEffect, useCallback } from 'react';
import { getDoc, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  setVaultActive, addRedeemedVaultItem, getRedeemableProducts,
  addPointsManual, deductPoints,
} from '@/lib/db';
import { VaultTab, VaultViewerTab, PsaGradingTab } from './admin-vault-tab';
import { ProductsTab, RewardsTab } from './admin-catalog-tab';
import {
  Customer, Tab, ProdItem, RewardItem,
  generateUsername, stockBadge,
  inp, lbl, btn, sectionCard, sectionTitle, sectionSub,
} from './admin-utils';


const ADMIN_SESSION_KEY = 'pokejoe_admin_authed';

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminPage() {

  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [checkingPw, setCheckingPw] = useState(false);

  useEffect(() => { if (localStorage.getItem(ADMIN_SESSION_KEY) === 'true') setAuthed(true); }, []);

  function handleAdminLogout() { localStorage.removeItem(ADMIN_SESSION_KEY); setAuthed(false); setPw(''); }

  async function doAuth() {
    setCheckingPw(true); setPwError(false);
    try {
      const snap = await getDoc(doc(db, 'config', 'admin'));
      if (pw === (snap.exists() ? snap.data().password : null)) { localStorage.setItem(ADMIN_SESSION_KEY, 'true'); setAuthed(true); }
      else setPwError(true);
    } catch { setPwError(true); }
    setCheckingPw(false);
  }

  const [tab, setTab] = useState<Tab>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProdItem[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  async function uploadPhoto(file: File, folder: string): Promise<string> {
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('@/lib/firebase');
    const ext = file.name.split('.').pop();
    const storageRef = ref(storage, `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'customers'));
    setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[]);
    setLoading(false);
  }, []);

  const loadProducts = useCallback(async () => {
    const snap = await getDocs(collection(db, 'products'));
    setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ProdItem[]);
  }, []);

  const loadRewards = useCallback(async () => {
    try { setRewards((await getRedeemableProducts()) as RewardItem[]); } catch { setRewards([]); }
  }, []);

  useEffect(() => { if (authed) { loadCustomers(); loadProducts(); loadRewards(); } }, [authed, loadCustomers, loadProducts, loadRewards]);

  if (!authed) return (
    <div style={{ background: '#080B10', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 360 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 24, color: 'white', letterSpacing: '0.08em', marginBottom: 4 }}>POKE<span style={{ color: 'var(--gold)' }}>JOE</span></div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 28 }}>Admin Panel</div>
        <input type="password" placeholder="Admin password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAuth()} style={{ ...inp, marginBottom: 12 }} />
        {pwError && <div style={{ fontSize: 12, color: '#FF6B75', marginBottom: 10 }}>Wrong password.</div>}
        <button onClick={doAuth} disabled={checkingPw} style={{ ...btn, width: '100%', marginTop: 0, opacity: checkingPw ? 0.7 : 1 }}>{checkingPw ? 'Checking...' : 'Enter →'}</button>
      </div>
    </div>
  );

  const navItems: Array<{ key: Tab; icon: string; label: string; sub: string }> = [
    { key: 'customers',   icon: '👥', label: 'Customers',    sub: 'Accounts & profiles' },
    { key: 'vault',       icon: '📦', label: 'Vault',        sub: 'Add items & purchases' },
    { key: 'vaultviewer', icon: '🔍', label: 'Vault Viewer', sub: 'View & manage items' },
    { key: 'psa', icon: '🏆', label: 'PSA Grading', sub: 'Grading submissions' },
    { key: 'points',      icon: '⭐', label: 'Points',       sub: 'Add, deduct & redeem' },
    { key: 'products',    icon: '🃏', label: 'Products',     sub: 'Catalog management' },
    { key: 'rewards',     icon: '🏆', label: 'Rewards',      sub: 'Redeemable items' },
    
  ];

  const filteredCustomers = customers.filter(c => {
    const q = search.toLowerCase();
    return c.username?.toLowerCase().includes(q) || c.firstName?.toLowerCase().includes(q) || c.lastName?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  return (
    <div style={{ background: '#080B10', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Mobile topbar ── */}
      <div className="admin-topbar" style={{ display: 'none' }}>
        <div style={{ background: '#060810', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 20, color: 'white', letterSpacing: '0.08em' }}>POKE<span style={{ color: 'var(--gold)' }}>JOE</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdminLogout} style={{ background: 'rgba(230,57,70,0.15)', border: '1px solid rgba(230,57,70,0.25)', color: '#FF6B75', padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Logout</button>
            <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: 6, fontSize: 18, cursor: 'pointer' }}>☰</button>
          </div>
        </div>
        {sidebarOpen && (
          <div style={{ background: '#060810', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', padding: '8px 12px', gap: 4, overflowX: 'auto' }}>
            {navItems.map(n => <button key={n.key} onClick={() => { setTab(n.key); setSidebarOpen(false); }} style={{ background: tab === n.key ? 'rgba(212,160,23,0.12)' : 'transparent', border: tab === n.key ? '1px solid rgba(212,160,23,0.3)' : '1px solid rgba(255,255,255,0.08)', color: tab === n.key ? 'var(--gold)' : 'rgba(255,255,255,0.5)', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{n.icon} {n.label}</button>)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* ── Desktop Sidebar ── */}
        <div className="admin-sidebar-desktop" style={{ background: '#060810', width: 230, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, color: 'white', letterSpacing: '0.08em' }}>POKE<span style={{ color: 'var(--gold)' }}>JOE</span></div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2, fontFamily: 'var(--ff-body)' }}>Back Office</div>
          </div>
          <nav style={{ padding: '16px 0', flex: 1, overflowY: 'auto' }}>
            {navItems.map(n => (
              <div key={n.key} onClick={() => setTab(n.key)} style={{ padding: '10px 20px', cursor: 'pointer', borderLeft: tab === n.key ? '2px solid var(--gold)' : '2px solid transparent', background: tab === n.key ? 'rgba(212,160,23,0.06)' : 'transparent', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: tab === n.key ? 'var(--gold)' : 'rgba(255,255,255,0.35)', fontWeight: tab === n.key ? 600 : 400 }}><span>{n.icon}</span><span>{n.label}</span></div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 2, paddingLeft: 24 }}>{n.sub}</div>
              </div>
            ))}
          </nav>
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', marginBottom: 8 }}>{customers.length} customers · {customers.reduce((a, c) => a + (c.points || 0), 0)} pts</div>
            <button onClick={handleAdminLogout} style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.2)', color: '#FF6B75', padding: '8px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'left' }}>🚪 Logout</button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, padding: 'clamp(20px, 4vw, 40px)', overflowY: 'auto', overflowX: 'hidden', maxWidth: '100%' }}>
          {tab === 'customers'   && <CustomersTab customers={customers} filteredCustomers={filteredCustomers} loading={loading} search={search} setSearch={setSearch} expanded={expanded} setExpanded={setExpanded} showToast={showToast} loadCustomers={loadCustomers} setTab={setTab} />}
          {tab === 'vault'       && <VaultTab customers={customers} products={products} showToast={showToast} loadCustomers={loadCustomers} loadProducts={loadProducts} uploadPhoto={uploadPhoto} />}
          {tab === 'vaultviewer' && <VaultViewerTab customers={customers} showToast={showToast} />}
          {tab === 'points'      && <PointsTab customers={customers} rewards={rewards} showToast={showToast} loadCustomers={loadCustomers} loadRewards={loadRewards} addRedeemedVaultItem={addRedeemedVaultItem} />}
          {tab === 'products'    && <ProductsTab products={products} showToast={showToast} loadProducts={loadProducts} uploadPhoto={uploadPhoto} />}
          {tab === 'rewards'     && <RewardsTab rewards={rewards} showToast={showToast} loadRewards={loadRewards} uploadPhoto={uploadPhoto} />}
          {tab === 'psa'         && <PsaGradingTab customers={customers} showToast={showToast} uploadPhoto={uploadPhoto} />}
        </div>
      </div>

      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#0D0F14', color: 'white', padding: '12px 20px', borderRadius: 8, fontSize: 14, zIndex: 9999, borderLeft: '3px solid var(--gold)', maxWidth: 'calc(100vw - 48px)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>{toast}</div>}

      <style>{`
        @media(max-width:768px){.admin-topbar{display:block!important;}.admin-sidebar-desktop{display:none!important;}}
        @media(min-width:769px){.admin-topbar{display:none!important;}.admin-sidebar-desktop{display:flex!important;}}
        .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:12px;margin-bottom:24px;}
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
        @media(max-width:600px){.two-col,.three-col{grid-template-columns:1fr;}}
        .cust-table-head{display:grid;grid-template-columns:32px 1fr 1fr 80px 50px 80px 90px;gap:8px;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.04);}
        .cust-row{display:grid;grid-template-columns:32px 1fr 1fr 80px 50px 80px 90px;gap:8px;padding:12px 16px;align-items:center;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.03);transition:background 0.15s;}
        .cust-row:hover{background:rgba(255,255,255,0.025);}
        .cust-hide-desktop{display:none;}
        @media(max-width:860px){.cust-table-head{display:none;}.cust-row{grid-template-columns:1fr auto;grid-template-rows:auto auto;gap:4px 8px;}.cust-hide-mobile{display:none!important;}.cust-hide-desktop{display:block;}}
        .photo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;}
        @media(max-width:480px){.photo-grid{grid-template-columns:repeat(3,1fr);}}
        .qty-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
        .list-item-row{display:flex;align-items:center;gap:14px;}
        @media(max-width:520px){.list-item-row{flex-wrap:wrap;gap:10px;}.list-item-actions{width:100%;justify-content:flex-end;}}
        .reward-picker-card{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:10px;cursor:pointer;transition:all 0.15s;}
        @media(max-width:480px){.reward-picker-card{gap:10px;padding:10px 12px;}}
        .mode-toggle{display:flex;border-radius:8px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;width:fit-content;margin-bottom:20px;}
        @media(max-width:480px){.mode-toggle{width:100%;}.mode-toggle button{flex:1;}}
        .section-wide{max-width:760px;}
        @media(max-width:860px){.section-wide{max-width:100%;}}
        .row-hover:hover{background:rgba(255,255,255,0.025)!important;}
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CUSTOMERS TAB
// ═══════════════════════════════════════════════════════════════════
function CustomersTab({ customers, filteredCustomers, loading, search, setSearch, expanded, setExpanded, showToast, loadCustomers, setTab }: {
  customers: Customer[]; filteredCustomers: Customer[]; loading: boolean;
  search: string; setSearch: (v: string) => void;
  expanded: string | null; setExpanded: (v: string | null) => void;
  showToast: (m: string) => void; loadCustomers: () => void; setTab: (t: Tab) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleCreate() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) { setCreateError('All fields are required.'); return; }
    setCreating(true); setCreateError('');
    try {
      const snap = await getDocs(collection(db, 'customers'));
      const existing = snap.docs.find(d => d.data().phone === phone.trim());
      if (existing) { setCreateError(`Phone already registered as @${existing.data().username}`); setCreating(false); return; }
      let username = generateUsername(firstName, lastName);
      for (let i = 0; i < 10; i++) { if (!(await getDoc(doc(db, 'customers', username))).exists()) break; username = generateUsername(firstName, lastName); }
      await setDoc(doc(db, 'customers', username), { username, firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), points: 0, vaultActive: true, joinedAt: new Date().toISOString(), purchaseHistory: [] });
      showToast(`✓ Created @${username}`);
      setFirstName(''); setLastName(''); setPhone(''); loadCustomers();
    } catch (e: unknown) { setCreateError((e as Error).message || 'Error'); }
    setCreating(false);
  }

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(24px,5vw,32px)', color: 'white', letterSpacing: '0.04em' }}>CUSTOMERS</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Manage accounts, profiles, and vault status</div>
      </div>
      <div className="stats-grid">
        {[
          { label: 'Total Customers', val: customers.length, color: 'white' },
          { label: 'Points in Circulation', val: `${customers.reduce((a, c) => a + (c.points || 0), 0)} pts`, color: 'var(--gold)' },
          { label: 'Vaults Active', val: customers.filter(c => c.vaultActive).length, color: '#22C55E' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(22px,4vw,32px)', color: s.color, lineHeight: 1 }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={sectionCard}>
        <div style={sectionTitle}>➕ New Customer</div>
        <div style={sectionSub}>Auto-generates a username from first + last name</div>
        <div className="three-col">
          <div><label style={lbl}>First Name</label><input placeholder="Joe" value={firstName} onChange={e => { setFirstName(e.target.value); setCreateError(''); }} style={{ ...inp, marginBottom: 0 }} /></div>
          <div><label style={lbl}>Last Name</label><input placeholder="Smith" value={lastName} onChange={e => { setLastName(e.target.value); setCreateError(''); }} style={{ ...inp, marginBottom: 0 }} /></div>
          <div><label style={lbl}>Phone Number</label><input placeholder="08123456789" value={phone} onChange={e => { setPhone(e.target.value); setCreateError(''); }} style={{ ...inp, marginBottom: 0 }} /></div>
        </div>
        {firstName && lastName && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>Preview: <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--gold)' }}>@{generateUsername(firstName, lastName)}</span></div>}
        {createError && <div style={{ fontSize: 12, color: '#FF6B75', marginTop: 10, padding: '8px 12px', background: 'rgba(230,57,70,0.08)', borderRadius: 6 }}>{createError}</div>}
        <button onClick={handleCreate} disabled={creating} style={{ ...btn, opacity: creating ? 0.7 : 1, marginTop: 14 }}>{creating ? 'Creating...' : 'Create Customer →'}</button>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <input placeholder="🔍  Search username, name or phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 14px', color: 'white', fontFamily: 'var(--ff-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>{filteredCustomers.length} results</span>
        </div>
        <div className="cust-table-head">{['#', 'Username', 'Name', 'Points', 'Ord.', 'Vault', 'Actions'].map((h, i) => <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</div>)}</div>
        {loading ? <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
          : filteredCustomers.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>{search ? 'No results.' : 'No customers yet.'}</div>
          : filteredCustomers.map((c, i) => (
            <div key={c.id}>
              <div onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="cust-row" style={{ background: expanded === c.id ? 'rgba(212,160,23,0.04)' : 'transparent' }}>
                <div className="cust-hide-mobile" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--ff-mono)' }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 13, color: 'var(--gold)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  @{c.username}
                  <div className="cust-hide-desktop" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--ff-body)', fontWeight: 400, marginTop: 2 }}>{c.firstName} {c.lastName}</div>
                </div>
                <div className="cust-hide-mobile" style={{ fontSize: 13, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.firstName} {c.lastName}</div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>{c.points} pts</div>
                <div className="cust-hide-mobile" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{c.purchaseHistory?.length || 0}</div>
                <div onClick={e => e.stopPropagation()}>
                  <button onClick={() => setVaultActive(c.username, !c.vaultActive).then(() => { showToast(`Vault ${!c.vaultActive ? 'activated' : 'deactivated'}`); loadCustomers(); })} style={{ background: c.vaultActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: c.vaultActive ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)', color: c.vaultActive ? '#22C55E' : 'rgba(255,255,255,0.4)', padding: '4px 8px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.vaultActive ? '● On' : '○ Off'}</button>
                </div>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setTab('points')} style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)', color: 'var(--gold)', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>⭐</button>
                  <button onClick={() => setTab('vault')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>📦</button>
                </div>
              </div>
              {expanded === c.id && (
                <div style={{ padding: '16px 20px 20px', background: 'rgba(212,160,23,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {editing === c.id ? (
                    <div style={{ maxWidth: 560 }}>
                      <div className="three-col" style={{ marginBottom: 12 }}>
                        {[{ label: 'First Name', val: editFirst, set: setEditFirst }, { label: 'Last Name', val: editLast, set: setEditLast }, { label: 'Phone', val: editPhone, set: setEditPhone }].map((f, fi) => (
                          <div key={fi}><div style={{ ...lbl, marginTop: 0 }}>{f.label}</div><input value={f.val} onChange={e => f.set(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,160,23,0.4)', borderRadius: 8, padding: '9px 12px', color: 'white', fontFamily: 'var(--ff-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} /></div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={async () => { const { updateDoc, doc: fd } = await import('firebase/firestore'); await updateDoc(fd(db, 'customers', c.id), { firstName: editFirst, lastName: editLast, phone: editPhone }); showToast(`✓ @${c.username} updated`); setEditing(null); loadCustomers(); }} style={{ background: 'var(--gold)', color: 'var(--black)', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Save</button>
                        <button onClick={() => setEditing(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ maxWidth: 560 }}>
                      <div className="three-col" style={{ marginBottom: 14 }}>
                        {[{ label: 'First Name', val: c.firstName || '—' }, { label: 'Last Name', val: c.lastName || '—' }, { label: 'Phone', val: c.phone || '—' }].map((f, fi) => (
                          <div key={fi} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{f.label}</div>
                            <div style={{ fontSize: 13, color: 'white', fontWeight: 500 }}>{f.val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>Joined: {c.joinedAt ? new Date(c.joinedAt as string).toLocaleDateString('id-ID') : '—'} · {c.purchaseHistory?.length || 0} history records</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => { setEditing(c.id); setEditFirst(c.firstName || ''); setEditLast(c.lastName || ''); setEditPhone(c.phone || ''); }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️ Edit Profile</button>
                        <button onClick={() => setVaultActive(c.username, !c.vaultActive).then(() => { showToast(`Vault ${!c.vaultActive ? 'activated' : 'deactivated'}`); loadCustomers(); })} style={{ background: c.vaultActive ? 'rgba(255,255,255,0.04)' : 'rgba(34,197,94,0.1)', border: c.vaultActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(34,197,94,0.3)', color: c.vaultActive ? 'rgba(255,255,255,0.5)' : '#22C55E', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>{c.vaultActive ? '⏸ Deactivate Vault' : '▶ Activate Vault'}</button>
                        {deleting === c.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#FF6B75' }}>Delete @{c.username}?</span>
                            <button onClick={async () => { const { deleteDoc, doc: fd } = await import('firebase/firestore'); await deleteDoc(fd(db, 'customers', c.id)); showToast(`@${c.username} deleted`); setDeleting(null); setExpanded(null); loadCustomers(); }} style={{ background: 'var(--red)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Yes, Delete</button>
                            <button onClick={() => setDeleting(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                          </div>
                        ) : <button onClick={() => setDeleting(c.id)} style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.2)', color: '#FF6B75', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑 Delete</button>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// POINTS TAB
// ═══════════════════════════════════════════════════════════════════
function PointsTab({ customers, rewards, showToast, loadCustomers, loadRewards, addRedeemedVaultItem }: {
  customers: Customer[]; rewards: RewardItem[];
  showToast: (m: string) => void; loadCustomers: () => void; loadRewards: () => void;
  addRedeemedVaultItem: typeof import('@/lib/db').addRedeemedVaultItem;
}) {
  const [pointsMode, setPointsMode] = useState<'add' | 'deduct'>('add');
  const [pointsUser, setPointsUser] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsDesc, setPointsDesc] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);
  const [redeemUser, setRedeemUser] = useState('');
  const [redeemProduct, setRedeemProduct] = useState<RewardItem | null>(null);
  const [redeemQty, setRedeemQty] = useState(1);
  const [redeemLoading, setRedeemLoading] = useState(false);

  const selA = customers.find(c => c.id === pointsUser);
  const selB = customers.find(c => c.username.toLowerCase() === redeemUser.toLowerCase());
  const totalCost = redeemProduct ? redeemProduct.pointsCost * redeemQty : 0;
  const enough = selB ? selB.points >= totalCost : false;

  async function handlePts() {
    const pts = parseInt(pointsAmount, 10);
    if (!pts || pts <= 0 || !pointsUser) { showToast('⚠️ Fill in all fields'); return; }
    setPointsLoading(true);
    try {
      if (pointsMode === 'add') { await addPointsManual(pointsUser, pts, pointsDesc || 'Manual admin addition'); showToast(`✓ +${pts} pts to @${pointsUser}`); }
      else { await deductPoints(pointsUser, pts, pointsDesc || 'Manual admin deduction'); showToast(`✓ −${pts} pts from @${pointsUser}`); }
      setPointsAmount(''); setPointsDesc(''); loadCustomers();
    } catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Error')); }
    setPointsLoading(false);
  }

  async function handleRedeem() {
    if (!redeemUser || !redeemProduct || !selB) { showToast('⚠️ Select customer and reward'); return; }
    if (!enough) { showToast(`❌ @${redeemUser} only has ${selB.points} pts`); return; }
    if (redeemProduct.stock !== undefined && redeemProduct.stock < redeemQty) { showToast(`❌ Only ${redeemProduct.stock} in stock`); return; }
    setRedeemLoading(true);
    try {
      await deductPoints(redeemUser, totalCost, `Redemption ×${redeemQty}: ${redeemProduct.name}`);
      await addRedeemedVaultItem(redeemUser, { productName: redeemProduct.name, pointsCost: totalCost, quantity: redeemQty, description: redeemProduct.description || '', imageUrl: redeemProduct.imageUrl || '', redeemableProductId: redeemProduct.id });
      showToast(`✓ Redeemed ×${redeemQty} "${redeemProduct.name}" for @${redeemUser} (−${totalCost} pts)`);
      setRedeemUser(''); setRedeemProduct(null); setRedeemQty(1);
      loadCustomers(); loadRewards();
    } catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Error')); }
    setRedeemLoading(false);
  }

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(24px,5vw,32px)', color: 'white', letterSpacing: '0.04em' }}>POINTS</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Manually manage points and process reward redemptions</div>
      </div>

      <div style={sectionCard}>
        <div style={sectionTitle}>⭐ Add / Deduct Points</div>
        <div style={sectionSub}>Enter the exact number of points — no auto-conversion.</div>
        <div className="mode-toggle">
          {(['add', 'deduct'] as const).map(m => <button key={m} onClick={() => setPointsMode(m)} style={{ padding: '10px 24px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s', background: pointsMode === m ? (m === 'add' ? '#16a34a' : 'var(--red)') : 'rgba(255,255,255,0.04)', color: pointsMode === m ? 'white' : 'rgba(255,255,255,0.4)' }}>{m === 'add' ? '➕ Add Points' : '➖ Deduct Points'}</button>)}
        </div>
        <div className="two-col">
          <div>
            <label style={lbl}>Customer</label>
            <select value={pointsUser} onChange={e => setPointsUser(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
              <option value="">— select customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.id} ({c.firstName} {c.lastName})</option>)}
            </select>
            {selA && <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, fontFamily: 'var(--ff-mono)' }}>Current: {selA.points} pts</div>}
          </div>
          <div>
            <label style={lbl}>Points to {pointsMode === 'add' ? 'Add' : 'Deduct'}</label>
            <input type="number" min={1} value={pointsAmount} onChange={e => setPointsAmount(e.target.value)} placeholder="e.g. 5" style={{ ...inp, fontFamily: 'var(--ff-mono)', fontSize: 18, fontWeight: 700, color: pointsMode === 'add' ? '#22C55E' : '#FF6B75', marginBottom: 0 }} />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Exact points — no IDR conversion</div>
          </div>
        </div>
        <label style={lbl}>Description / Note</label>
        <input placeholder={pointsMode === 'add' ? 'e.g. Bonus for attendance' : 'e.g. Refund adjustment'} value={pointsDesc} onChange={e => setPointsDesc(e.target.value)} style={inp} />
        {selA && pointsAmount && pointsMode === 'deduct' && parseInt(pointsAmount) > selA.points && <div style={{ fontSize: 12, color: '#FF6B75', marginBottom: 10, padding: '8px 12px', background: 'rgba(230,57,70,0.08)', borderRadius: 6 }}>❌ Insufficient — @{pointsUser} only has {selA.points} pts</div>}
        <button onClick={handlePts} disabled={pointsLoading || !pointsUser || !pointsAmount} style={{ ...btn, marginTop: 4, background: pointsMode === 'add' ? '#16a34a' : 'var(--red)', opacity: pointsLoading || !pointsUser || !pointsAmount ? 0.5 : 1, cursor: pointsLoading || !pointsUser || !pointsAmount ? 'not-allowed' : 'pointer' }}>
          {pointsLoading ? 'Processing...' : pointsMode === 'add' ? `➕ Add ${pointsAmount || '—'} pts` : `➖ Deduct ${pointsAmount || '—'} pts`}
        </button>
      </div>

      <div style={{ ...sectionCard, borderColor: 'rgba(212,160,23,0.15)' }}>
        <div style={sectionTitle}>🏆 Redeem Reward Product</div>
        <div style={sectionSub}>Deducts points, adds item to vault, decrements reward stock.</div>
        <label style={lbl}>Customer Username</label>
        <input placeholder="joesmi42" value={redeemUser} onChange={e => setRedeemUser(e.target.value)} style={inp} />
        {selB && <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 12, marginTop: -6, fontFamily: 'var(--ff-mono)' }}>Balance: {selB.points} pts</div>}
        <label style={lbl}>Select Reward</label>
        {rewards.length === 0
          ? <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', padding: 16, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 10 }}>No rewards yet. Add some in the 🏆 Rewards tab.</div>
          : <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
              {rewards.map(r => {
                const sb = stockBadge(r.stock);
                const isSel = redeemProduct?.id === r.id;
                const oos = r.stock === 0;
                return (
                  <div key={r.id} className="reward-picker-card" onClick={() => { if (!oos) { setRedeemProduct(isSel ? null : r); setRedeemQty(1); } }} style={{ border: isSel ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.08)', background: isSel ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.02)', cursor: oos ? 'not-allowed' : 'pointer', opacity: oos ? 0.4 : 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: 'linear-gradient(135deg,#FDF8EC,#F5E8C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
                      {r.imageUrl ? <img src={r.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : r.emoji || '⭐'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2, display: 'flex', gap: 8 }}><span>{r.category}</span><span style={{ color: sb.color, background: sb.bg, padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>{sb.label}</span></div>
                    </div>
                    <div style={{ fontFamily: 'var(--ff-mono)', color: 'var(--gold)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>⭐ {r.pointsCost}</div>
                    {isSel && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: 'var(--black)', fontSize: 11, fontWeight: 700 }}>✓</span></div>}
                  </div>
                );
              })}
            </div>}
        {redeemProduct && (
          <div style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.2)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <div className="qty-row" style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 28 }}>Qty</span>
              <button onClick={() => setRedeemQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <input type="number" min={1} max={redeemProduct.stock ?? 99} value={redeemQty} onChange={e => setRedeemQty(Math.max(1, Math.min(redeemProduct.stock ?? 99, parseInt(e.target.value) || 1)))} style={{ width: 60, padding: '6px 0', textAlign: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: 'white', fontFamily: 'var(--ff-mono)', fontSize: 16, fontWeight: 700, outline: 'none' }} />
              <button onClick={() => setRedeemQty(q => Math.min(redeemProduct.stock ?? 99, q + 1))} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              {redeemProduct.stock !== undefined && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>max {redeemProduct.stock}</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{redeemQty} × ⭐{redeemProduct.pointsCost}</div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>⭐ {totalCost} pts</div>
            </div>
            {redeemUser && selB && <div style={{ fontSize: 12, color: enough ? '#22C55E' : '#FF6B75' }}>{enough ? `✅ @${selB.username} has ${selB.points} pts — ${selB.points - totalCost} remaining after` : `❌ @${selB.username} only has ${selB.points} pts — needs ${totalCost - selB.points} more`}</div>}
          </div>
        )}
        {redeemProduct && redeemUser && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>Will add <strong style={{ color: 'white' }}>×{redeemQty} {redeemProduct.name}</strong> to <strong style={{ color: 'var(--gold)' }}>@{redeemUser}</strong>&apos;s vault · stock −{redeemQty} · deduct <span style={{ color: '#FF6B75' }}>−{totalCost} pts</span></div>}
        <button onClick={handleRedeem} disabled={redeemLoading || !redeemProduct || !redeemUser || !enough} style={{ ...btn, opacity: redeemLoading || !redeemProduct || !redeemUser || !enough ? 0.5 : 1, cursor: redeemLoading || !redeemProduct || !redeemUser || !enough ? 'not-allowed' : 'pointer' }}>
          {redeemLoading ? 'Processing...' : `⭐ Process Redemption${redeemProduct ? ` (×${redeemQty})` : ''}`}
        </button>
      </div>
    </>
  );
}