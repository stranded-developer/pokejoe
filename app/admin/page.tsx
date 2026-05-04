'use client';
import { useState, useEffect, useCallback } from 'react';
import { getDoc, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  setVaultActive, addVaultItem, upsertProduct,
  deductPoints, upsertRedeemableProduct, deleteRedeemableProduct,
  addRedeemedVaultItem, getRedeemableProducts,
  addPointsManual, addVaultItemFromProduct,
} from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────
type Customer = {
  id: string; username: string; firstName?: string; lastName?: string;
  phone?: string; points: number; vaultActive: boolean;
  joinedAt?: { seconds: number } | string;
  purchaseHistory?: Array<{ description: string; amount: number; points: number; date: string; type?: string }>;
};
type Tab = 'customers' | 'vault' | 'points' | 'products' | 'rewards';
type ProdItem = { id: string; name: string; series?: string; price: number; stock?: number; emoji?: string; imageUrl?: string; description?: string; badge?: string; };
type RewardItem = { id: string; name: string; category?: string; pointsCost: number; stock?: number; emoji?: string; imageUrl?: string; description?: string; badge?: string; };

const ADMIN_SESSION_KEY = 'pokejoe_admin_authed';

function generateUsername(firstName: string, lastName: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const f = clean(firstName), l = clean(lastName);
  const base = (f.slice(0, 3) + l.slice(0, 3)).padEnd(6, 'x');
  const rand = Math.floor(Math.random() * 99).toString().padStart(2, '0');
  return base + rand;
}

function stockBadge(stock: number | undefined) {
  if (stock === undefined) return { label: '∞ unlimited', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)' };
  if (stock === 0) return { label: '✕ Out of stock', color: '#FF6B75', bg: 'rgba(230,57,70,0.12)' };
  if (stock <= 3) return { label: `⚠ ${stock} left`, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' };
  return { label: `${stock} in stock`, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' };
}

// ─── Shared styles ─────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
  padding: '10px 12px', color: 'white', fontFamily: 'var(--ff-body)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10,
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.3)',
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, marginTop: 8,
};
const btn: React.CSSProperties = {
  background: 'var(--gold)', color: 'var(--black)', border: 'none',
  padding: '10px 20px', borderRadius: 8, fontWeight: 600,
  cursor: 'pointer', fontSize: 13, marginTop: 8,
};
const sectionCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, padding: 28, marginBottom: 24,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 14, color: 'white', fontWeight: 700, marginBottom: 4,
};
const sectionSub: React.CSSProperties = {
  fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20,
};

// ─── Photo drop zone (reusable) ──────────────────────────────────────────────
function PhotoDropZone({ id, photos, setPhotos, single }: {
  id: string;
  photos: Array<{ file: File; preview: string; uploading: boolean }>;
  setPhotos: React.Dispatch<React.SetStateAction<Array<{ file: File; preview: string; uploading: boolean }>>>;
  single?: boolean;
}) {
  return (
    <>
      <div
        onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)'; }}
        onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
        onDrop={e => {
          e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)';
          const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
          if (!files.length) return;
          const mapped = files.map(f => ({ file: f, preview: URL.createObjectURL(f), uploading: false }));
          setPhotos(single ? [mapped[0]] : prev => [...prev, ...mapped]);
        }}
        style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 10, cursor: 'pointer', transition: 'border-color 0.2s' }}
        onClick={() => document.getElementById(id)?.click()}
      >
        <div style={{ fontSize: 24, marginBottom: 6 }}>🖼️</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          {single ? 'Click or drag to upload image' : 'Click or drag to upload images'}
        </div>
        <input id={id} type="file" accept="image/*" multiple={!single} style={{ display: 'none' }}
          onChange={e => {
            const files = Array.from(e.target.files || []);
            const mapped = files.map(f => ({ file: f, preview: URL.createObjectURL(f), uploading: false }));
            setPhotos(single ? [mapped[0]] : prev => [...prev, ...mapped]);
            e.target.value = '';
          }} />
      </div>
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((p, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {!p.uploading && (
                <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(230,57,70,0.85)', border: 'none', color: 'white', width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminPage() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [checkingPw, setCheckingPw] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(ADMIN_SESSION_KEY) === 'true') setAuthed(true);
  }, []);

  function handleAdminLogout() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setAuthed(false); setPw('');
  }

  async function doAuth() {
    setCheckingPw(true); setPwError(false);
    try {
      const snap = await getDoc(doc(db, 'config', 'admin'));
      if (pw === (snap.exists() ? snap.data().password : null)) {
        localStorage.setItem(ADMIN_SESSION_KEY, 'true'); setAuthed(true);
      } else setPwError(true);
    } catch { setPwError(true); }
    setCheckingPw(false);
  }

  // ── Global state ──────────────────────────────────────────────────────────
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
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, path);
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
    try {
      const data = await getRedeemableProducts();
      setRewards(data as RewardItem[]);
    } catch { setRewards([]); }
  }, []);

  useEffect(() => {
    if (authed) { loadCustomers(); loadProducts(); loadRewards(); }
  }, [authed, loadCustomers, loadProducts, loadRewards]);

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ background: '#080B10', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 360 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 24, color: 'white', letterSpacing: '0.08em', marginBottom: 4 }}>POKE<span style={{ color: 'var(--gold)' }}>JOE</span></div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 28 }}>Admin Panel</div>
        <input type="password" placeholder="Admin password" value={pw}
          onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && doAuth()}
          style={{ ...inp, marginBottom: 12 }} />
        {pwError && <div style={{ fontSize: 12, color: '#FF6B75', marginBottom: 10 }}>Wrong password.</div>}
        <button onClick={doAuth} disabled={checkingPw}
          style={{ ...btn, width: '100%', marginTop: 0, opacity: checkingPw ? 0.7 : 1 }}>
          {checkingPw ? 'Checking...' : 'Enter →'}
        </button>
      </div>
    </div>
  );

  const navItems: Array<{ key: Tab; icon: string; label: string; sub: string }> = [
    { key: 'customers', icon: '👥', label: 'Customers', sub: 'Accounts & profiles' },
    { key: 'vault', icon: '📦', label: 'Vault', sub: 'Add items & purchases' },
    { key: 'points', icon: '⭐', label: 'Points', sub: 'Add, deduct & redeem' },
    { key: 'products', icon: '🃏', label: 'Products', sub: 'Catalog management' },
    { key: 'rewards', icon: '🏆', label: 'Rewards', sub: 'Redeemable items' },
  ];

  const filteredCustomers = customers.filter(c => {
    const q = search.toLowerCase();
    return c.username?.toLowerCase().includes(q) || c.firstName?.toLowerCase().includes(q)
      || c.lastName?.toLowerCase().includes(q) || c.phone?.includes(q);
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
            {navItems.map(n => (
              <button key={n.key} onClick={() => { setTab(n.key); setSidebarOpen(false); }}
                style={{ background: tab === n.key ? 'rgba(212,160,23,0.12)' : 'transparent', border: tab === n.key ? '1px solid rgba(212,160,23,0.3)' : '1px solid rgba(255,255,255,0.08)', color: tab === n.key ? 'var(--gold)' : 'rgba(255,255,255,0.5)', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {n.icon} {n.label}
              </button>
            ))}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: tab === n.key ? 'var(--gold)' : 'rgba(255,255,255,0.35)', fontWeight: tab === n.key ? 600 : 400 }}>
                  <span>{n.icon}</span><span>{n.label}</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 2, paddingLeft: 24 }}>{n.sub}</div>
              </div>
            ))}
          </nav>
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', marginBottom: 8 }}>
              {customers.length} customers · {customers.reduce((a, c) => a + (c.points || 0), 0)} pts
            </div>
            <button onClick={handleAdminLogout} style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.2)', color: '#FF6B75', padding: '8px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              🚪 Logout
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, padding: 'clamp(20px, 4vw, 40px)', overflowY: 'auto', overflowX: 'hidden', maxWidth: '100%' }}>

          {/* ════════════════════════════════════════════════════════
              TAB: CUSTOMERS
              — Create accounts, manage profile, vault toggle
          ════════════════════════════════════════════════════════ */}
          {tab === 'customers' && <CustomersTab
            customers={customers} filteredCustomers={filteredCustomers}
            loading={loading} search={search} setSearch={setSearch}
            expanded={expanded} setExpanded={setExpanded}
            showToast={showToast} loadCustomers={loadCustomers}
            setTab={setTab}
          />}

          {/* ════════════════════════════════════════════════════════
              TAB: VAULT
              — Section A: Add from live session (free-form)
              — Section B: Add from product purchase (catalog item,
                           decrements stock, optional auto-points)
          ════════════════════════════════════════════════════════ */}
          {tab === 'vault' && <VaultTab
            customers={customers} products={products}
            showToast={showToast} loadCustomers={loadCustomers}
            loadProducts={loadProducts} uploadPhoto={uploadPhoto}
          />}

          {/* ════════════════════════════════════════════════════════
              TAB: POINTS
              — Section A: Add / Deduct points (manual, exact pts)
              — Section B: Redeem via reward product (deducts pts,
                           adds to vault, decrements reward stock)
          ════════════════════════════════════════════════════════ */}
          {tab === 'points' && <PointsTab
            customers={customers} rewards={rewards}
            showToast={showToast} loadCustomers={loadCustomers}
            loadRewards={loadRewards}
          />}

          {/* ════════════════════════════════════════════════════════
              TAB: PRODUCTS
              — Catalog products (sealed): add / edit / delete
          ════════════════════════════════════════════════════════ */}
          {tab === 'products' && <ProductsTab
            products={products} showToast={showToast}
            loadProducts={loadProducts} uploadPhoto={uploadPhoto}
          />}

          {/* ════════════════════════════════════════════════════════
              TAB: REWARDS
              — Redeemable items: add / edit / delete
          ════════════════════════════════════════════════════════ */}
          {tab === 'rewards' && <RewardsTab
            rewards={rewards} showToast={showToast}
            loadRewards={loadRewards} uploadPhoto={uploadPhoto}
          />}

        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#0D0F14', color: 'white', padding: '12px 20px', borderRadius: 8, fontSize: 14, zIndex: 9999, borderLeft: '3px solid var(--gold)', maxWidth: 'calc(100vw - 48px)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          {toast}
        </div>
      )}

      <style>{`
        /* ── Sidebar / topbar ── */
        @media (max-width: 768px) {
          .admin-topbar          { display: block  !important; }
          .admin-sidebar-desktop { display: none   !important; }
        }
        @media (min-width: 769px) {
          .admin-topbar          { display: none   !important; }
          .admin-sidebar-desktop { display: flex   !important; }
        }

        /* ── Grid helpers ── */
        .stats-grid  { display:grid; grid-template-columns:repeat(auto-fit,minmax(148px,1fr)); gap:12px; margin-bottom:24px; }
        .two-col     { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .three-col   { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
        @media(max-width:600px){ .two-col,.three-col { grid-template-columns:1fr; } }

        /* ── Customer table ── */
        .cust-table-head {
          display:grid;
          grid-template-columns:32px 1fr 1fr 80px 50px 80px 90px;
          gap:8px; padding:10px 16px;
          border-bottom:1px solid rgba(255,255,255,0.04);
        }
        .cust-row {
          display:grid;
          grid-template-columns:32px 1fr 1fr 80px 50px 80px 90px;
          gap:8px; padding:12px 16px; align-items:center; cursor:pointer;
          border-bottom:1px solid rgba(255,255,255,0.03); transition:background 0.15s;
        }
        .cust-row:hover { background:rgba(255,255,255,0.025); }
        /* mobile: show on mobile, hide on desktop */
        .cust-hide-desktop { display:none; }
        @media(max-width:860px){
          .cust-table-head { display:none; }
          .cust-row { grid-template-columns:1fr auto; grid-template-rows:auto auto; gap:4px 8px; }
          .cust-hide-mobile  { display:none !important; }
          .cust-hide-desktop { display:block; }
        }

        /* ── Photo grid ── */
        .photo-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px; }
        @media(max-width:480px){ .photo-grid { grid-template-columns:repeat(3,1fr); } }

        /* ── Qty stepper ── */
        .qty-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

        /* ── List item rows (products / rewards) ── */
        .list-item-row { display:flex; align-items:center; gap:14px; }
        @media(max-width:520px){
          .list-item-row { flex-wrap:wrap; gap:10px; }
          .list-item-actions { width:100%; justify-content:flex-end; }
        }

        /* ── Reward picker (points tab) ── */
        .reward-picker-card {
          display:flex; align-items:center; gap:14px;
          padding:12px 14px; border-radius:10px; cursor:pointer; transition:all 0.15s;
        }
        @media(max-width:480px){ .reward-picker-card { gap:10px; padding:10px 12px; } }

        /* ── Mode toggle ── */
        .mode-toggle { display:flex; border-radius:8px; border:1px solid rgba(255,255,255,0.08); overflow:hidden; width:fit-content; margin-bottom:20px; }
        @media(max-width:480px){ .mode-toggle { width:100%; } .mode-toggle button { flex:1; } }

        /* ── Section width cap ── */
        .section-wide { max-width:760px; }
        @media(max-width:860px){ .section-wide { max-width:100%; } }

        .row-hover:hover { background:rgba(255,255,255,0.025) !important; }
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
  showToast: (m: string) => void; loadCustomers: () => void;
  setTab: (t: Tab) => void;
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
      for (let i = 0; i < 10; i++) {
        if (!(await getDoc(doc(db, 'customers', username))).exists()) break;
        username = generateUsername(firstName, lastName);
      }
      await setDoc(doc(db, 'customers', username), {
        username, firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(),
        points: 0, vaultActive: true, joinedAt: new Date().toISOString(), purchaseHistory: [],
      });
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

      {/* Stats */}
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

      {/* ── Create new customer ── */}
      <div style={sectionCard}>
        <div style={sectionTitle}>➕ New Customer</div>
        <div style={sectionSub}>Auto-generates a username from first + last name</div>
        <div className="three-col">
          <div>
            <label style={lbl}>First Name</label>
            <input placeholder="Joe" value={firstName} onChange={e => { setFirstName(e.target.value); setCreateError(''); }} style={{ ...inp, marginBottom: 0 }} />
          </div>
          <div>
            <label style={lbl}>Last Name</label>
            <input placeholder="Smith" value={lastName} onChange={e => { setLastName(e.target.value); setCreateError(''); }} style={{ ...inp, marginBottom: 0 }} />
          </div>
          <div>
            <label style={lbl}>Phone Number</label>
            <input placeholder="08123456789" value={phone} onChange={e => { setPhone(e.target.value); setCreateError(''); }} style={{ ...inp, marginBottom: 0 }} />
          </div>
        </div>
        {firstName && lastName && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
            Preview username: <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--gold)' }}>@{generateUsername(firstName, lastName)}</span>
          </div>
        )}
        {createError && <div style={{ fontSize: 12, color: '#FF6B75', marginTop: 10, padding: '8px 12px', background: 'rgba(230,57,70,0.08)', borderRadius: 6 }}>{createError}</div>}
        <button onClick={handleCreate} disabled={creating} style={{ ...btn, opacity: creating ? 0.7 : 1, marginTop: 14 }}>
          {creating ? 'Creating...' : 'Create Customer →'}
        </button>
      </div>

      {/* ── Customer list ── */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <input placeholder="🔍  Search username, name or phone..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 14px', color: 'white', fontFamily: 'var(--ff-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>{filteredCustomers.length} results</span>
        </div>

        {/* Header row — hidden on mobile via CSS */}
        <div className="cust-table-head">
          {['#', 'Username', 'Name', 'Points', 'Ord.', 'Vault', 'Actions'].map((h, i) => (
            <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {loading
          ? <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
          : filteredCustomers.length === 0
            ? <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>{search ? 'No results.' : 'No customers yet.'}</div>
            : filteredCustomers.map((c, i) => (
              <div key={c.id}>
                <div onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="cust-row"
                  style={{ background: expanded === c.id ? 'rgba(212,160,23,0.04)' : 'transparent' }}>
                  <div className="cust-hide-mobile" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--ff-mono)' }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 13, color: 'var(--gold)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{c.username}
                    {/* on mobile, show name inline below username */}
                    <div className="cust-hide-desktop" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--ff-body)', fontWeight: 400, marginTop: 2 }}>{c.firstName} {c.lastName}</div>
                  </div>
                  <div className="cust-hide-mobile" style={{ fontSize: 13, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.firstName} {c.lastName}</div>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>{c.points} pts</div>
                  <div className="cust-hide-mobile" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{c.purchaseHistory?.length || 0}</div>
                  <div onClick={e => e.stopPropagation()}>
                    <button onClick={() => setVaultActive(c.username, !c.vaultActive).then(() => { showToast(`Vault ${!c.vaultActive ? 'activated' : 'deactivated'}`); loadCustomers(); })}
                      style={{ background: c.vaultActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: c.vaultActive ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)', color: c.vaultActive ? '#22C55E' : 'rgba(255,255,255,0.4)', padding: '4px 8px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {c.vaultActive ? '● On' : '○ Off'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setTab('points')}
                      style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)', color: 'var(--gold)', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>⭐</button>
                    <button onClick={() => setTab('vault')}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>📦</button>
                  </div>
                </div>

                {/* Expanded row */}
                {expanded === c.id && (
                  <div style={{ padding: '16px 20px 20px', background: 'rgba(212,160,23,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {editing === c.id ? (
                      <div style={{ maxWidth: 560 }}>
                        <div className="three-col" style={{ marginBottom: 12 }}>
                          {[
                            { label: 'First Name', val: editFirst, set: setEditFirst },
                            { label: 'Last Name', val: editLast, set: setEditLast },
                            { label: 'Phone', val: editPhone, set: setEditPhone },
                          ].map((f, fi) => (
                            <div key={fi}>
                              <div style={{ ...lbl, marginTop: 0 }}>{f.label}</div>
                              <input value={f.val} onChange={e => f.set(e.target.value)}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,160,23,0.4)', borderRadius: 8, padding: '9px 12px', color: 'white', fontFamily: 'var(--ff-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={async () => {
                            const { updateDoc, doc: fd } = await import('firebase/firestore');
                            await updateDoc(fd(db, 'customers', c.id), { firstName: editFirst, lastName: editLast, phone: editPhone });
                            showToast(`✓ @${c.username} updated`); setEditing(null); loadCustomers();
                          }} style={{ background: 'var(--gold)', color: 'var(--black)', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Save</button>
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
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>
                          Joined: {c.joinedAt ? new Date(c.joinedAt as string).toLocaleDateString('id-ID') : '—'} · {c.purchaseHistory?.length || 0} history records
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => { setEditing(c.id); setEditFirst(c.firstName || ''); setEditLast(c.lastName || ''); setEditPhone(c.phone || ''); }}
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️ Edit Profile</button>
                          <button onClick={() => setVaultActive(c.username, !c.vaultActive).then(() => { showToast(`Vault ${!c.vaultActive ? 'activated' : 'deactivated'}`); loadCustomers(); })}
                            style={{ background: c.vaultActive ? 'rgba(255,255,255,0.04)' : 'rgba(34,197,94,0.1)', border: c.vaultActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(34,197,94,0.3)', color: c.vaultActive ? 'rgba(255,255,255,0.5)' : '#22C55E', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                            {c.vaultActive ? '⏸ Deactivate Vault' : '▶ Activate Vault'}
                          </button>
                          {deleting === c.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, color: '#FF6B75' }}>Delete @{c.username}?</span>
                              <button onClick={async () => {
                                const { deleteDoc, doc: fd } = await import('firebase/firestore');
                                await deleteDoc(fd(db, 'customers', c.id));
                                showToast(`@${c.username} deleted`); setDeleting(null); setExpanded(null); loadCustomers();
                              }} style={{ background: 'var(--red)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Yes, Delete</button>
                              <button onClick={() => setDeleting(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleting(c.id)} style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.2)', color: '#FF6B75', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑 Delete</button>
                          )}
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
// VAULT TAB
// — Section A: Live session (free-form packs + photos)
// — Section B: Product purchase (from catalog, decrements stock,
//              optional auto loyalty points)
// ═══════════════════════════════════════════════════════════════════
function VaultTab({ customers, products, showToast, loadCustomers, loadProducts, uploadPhoto }: {
  customers: Customer[]; products: ProdItem[];
  showToast: (m: string) => void; loadCustomers: () => void;
  loadProducts: () => void;
  uploadPhoto: (f: File, folder: string) => Promise<string>;
}) {
  // Section A state
  const [vaultUser, setVaultUser] = useState('');
  const [vaultTitle, setVaultTitle] = useState('');
  const [vaultPacks, setVaultPacks] = useState('');
  const [vaultPhotos, setVaultPhotos] = useState<Array<{ file: File; preview: string; uploading: boolean }>>([]);

  // Section B state
  const [purchaseUser, setPurchaseUser] = useState('');
  const [purchaseProductId, setPurchaseProductId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [purchaseDesc, setPurchaseDesc] = useState('');
  const [purchaseAutoPoints, setPurchaseAutoPoints] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const selectedProduct = products.find(p => p.id === purchaseProductId);
  const totalPrice = selectedProduct ? selectedProduct.price * purchaseQty : 0;
  const pointsPreview = Math.floor(totalPrice / 100000);

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(24px,5vw,32px)', color: 'white', letterSpacing: '0.04em' }}>VAULT</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Add items to a customer&apos;s vault — live session or product purchase</div>
      </div>

      {/* ── Section A: Live session ── */}
      <div style={sectionCard}>
        <div style={sectionTitle}>📡 Live Session Items</div>
        <div style={sectionSub}>Add items pulled from a live rip session. Free-form packs list + optional photos.</div>

        <label style={lbl}>Customer Username</label>
        <select value={vaultUser} onChange={e => setVaultUser(e.target.value)} style={inp}>
          <option value="">— select customer —</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.id} ({c.firstName} {c.lastName})</option>)}
        </select>

        <label style={lbl}>Live Session Title</label>
        <input placeholder="LIVE Rip n Ship — 20/05/2026" value={vaultTitle} onChange={e => setVaultTitle(e.target.value)} style={inp} />

        <label style={lbl}>Packs / Items (one per line)</label>
        <textarea placeholder={'5x Ascended Heroes Pack\n2x Prismatic Evolutions Pack'} value={vaultPacks} onChange={e => setVaultPacks(e.target.value)} rows={4} style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />

        <label style={lbl}>Session Photos (optional)</label>
        <PhotoDropZone id="vault-live-photos" photos={vaultPhotos} setPhotos={setVaultPhotos} />

        <button onClick={async () => {
          if (!vaultUser || !vaultTitle || !vaultPacks) { showToast('⚠️ Fill in all required fields'); return; }
          const check = await getDoc(doc(db, 'customers', vaultUser.toLowerCase()));
          if (!check.exists()) { showToast(`❌ "@${vaultUser}" not found`); return; }
          let photoUrls: string[] = [];
          if (vaultPhotos.length > 0) {
            setVaultPhotos(prev => prev.map(p => ({ ...p, uploading: true })));
            photoUrls = await Promise.all(vaultPhotos.map(p => uploadPhoto(p.file, `vault/${vaultUser.toLowerCase()}`)));
          }
          const packs = vaultPacks.split('\n').map(s => s.trim()).filter(Boolean);
          await addVaultItem(vaultUser, { liveTitle: vaultTitle, packs, photos: photoUrls });
          showToast(`✓ Live items added to @${vaultUser}`);
          setVaultUser(''); setVaultTitle(''); setVaultPacks(''); setVaultPhotos([]);
        }} style={btn}>Add Live Items to Vault →</button>
      </div>

      {/* ── Section B: Product purchase ── */}
      <div style={{ ...sectionCard, borderColor: 'rgba(212,160,23,0.15)' }}>
        <div style={sectionTitle}>🛒 Product Purchase</div>
        <div style={sectionSub}>
          Add a catalog product to a customer&apos;s vault. Automatically decrements product stock.
          Optionally awards loyalty points (Rp 100,000 = 1 pt).
        </div>

        <div className="two-col">
          <div>
            <label style={lbl}>Customer</label>
            <select value={purchaseUser} onChange={e => setPurchaseUser(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
              <option value="">— select customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.id} ({c.firstName} {c.lastName})</option>)}
            </select>
            {purchaseUser && (() => {
              const found = customers.find(c => c.id === purchaseUser);
              return found ? <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, fontFamily: 'var(--ff-mono)' }}>Balance: {found.points} pts</div> : null;
            })()}
          </div>
          <div>
            <label style={lbl}>Product (Catalog)</label>
            <select value={purchaseProductId} onChange={e => { setPurchaseProductId(e.target.value); setPurchaseQty(1); }} style={{ ...inp, marginBottom: 0 }}>
              <option value="">— select product —</option>
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.stock === 0}>
                  {p.name}{typeof p.stock === 'number' ? ` — stock: ${p.stock}` : ''}{p.stock === 0 ? ' (OUT)' : ''}
                </option>
              ))}
            </select>
            {selectedProduct && (
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Rp {selectedProduct.price.toLocaleString('id-ID')}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: stockBadge(selectedProduct.stock).color }}>{stockBadge(selectedProduct.stock).label}</span>
              </div>
            )}
          </div>
        </div>

        {selectedProduct && (
          <>
            <div className="two-col" style={{ marginTop: 4 }}>
              <div>
                <label style={lbl}>Quantity</label>
                <div className="qty-row">
                  <button onClick={() => setPurchaseQty(q => Math.max(1, q - 1))}
                    style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <input type="number" min={1} max={selectedProduct.stock ?? 999} value={purchaseQty}
                    onChange={e => setPurchaseQty(Math.max(1, Math.min(selectedProduct.stock ?? 999, parseInt(e.target.value) || 1)))}
                    style={{ width: 60, padding: '7px 0', textAlign: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: 'white', fontFamily: 'var(--ff-mono)', fontSize: 15, fontWeight: 700, outline: 'none' }} />
                  <button onClick={() => setPurchaseQty(q => Math.min(selectedProduct.stock ?? 999, q + 1))}
                    style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
              <div>
                <label style={lbl}>Total Price</label>
                <div style={{ padding: '8px 0', fontFamily: 'var(--ff-mono)', fontSize: 18, color: 'var(--gold)', fontWeight: 700 }}>
                  Rp {totalPrice.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <label style={lbl}>Note / Description (optional)</label>
            <input placeholder="e.g. LIVE Batch #12 purchase" value={purchaseDesc} onChange={e => setPurchaseDesc(e.target.value)} style={inp} />

            {/* Auto-points checkbox */}
            <div style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={purchaseAutoPoints} onChange={e => setPurchaseAutoPoints(e.target.checked)}
                  style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer', accentColor: 'var(--gold)' }} />
                <div>
                  <div style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>Auto-award loyalty points</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                    Rp 100,000 = 1 pt
                    {purchaseAutoPoints && pointsPreview > 0 && (
                      <span style={{ marginLeft: 10, color: 'var(--gold)', fontWeight: 700 }}>→ +{pointsPreview} pts will be awarded</span>
                    )}
                  </div>
                </div>
              </label>
            </div>

            {/* Summary */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              <strong style={{ color: 'white' }}>Summary: </strong>
              Add <strong style={{ color: 'var(--gold)' }}>{selectedProduct.name} ×{purchaseQty}</strong> to <strong style={{ color: 'var(--gold)' }}>@{purchaseUser || '...'}</strong>&apos;s vault
              · Stock −{purchaseQty}
              {purchaseAutoPoints && pointsPreview > 0 ? <> · <span style={{ color: '#22C55E' }}>+{pointsPreview} pts</span></> : null}
            </div>
          </>
        )}

        <button
          disabled={purchaseLoading || !purchaseUser || !purchaseProductId}
          onClick={async () => {
            if (!selectedProduct) return;
            setPurchaseLoading(true);
            try {
              await addVaultItemFromProduct(purchaseUser, {
                productId: selectedProduct.id,
                productName: selectedProduct.name,
                price: selectedProduct.price,
                quantity: purchaseQty,
                description: purchaseDesc,
                imageUrl: selectedProduct.imageUrl,
                autoAddPoints: purchaseAutoPoints,
              });
              showToast(`✓ "${selectedProduct.name}" ×${purchaseQty} added to @${purchaseUser}${purchaseAutoPoints && pointsPreview > 0 ? ` · +${pointsPreview} pts` : ''}`);
              setPurchaseProductId(''); setPurchaseQty(1); setPurchaseDesc(''); setPurchaseAutoPoints(false);
              loadProducts(); loadCustomers();
            } catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Error')); }
            setPurchaseLoading(false);
          }}
          style={{ ...btn, opacity: purchaseLoading || !purchaseUser || !purchaseProductId ? 0.5 : 1, cursor: purchaseLoading || !purchaseUser || !purchaseProductId ? 'not-allowed' : 'pointer' }}>
          {purchaseLoading ? 'Adding...' : '🛒 Add Purchase to Vault →'}
        </button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// POINTS TAB
// — Section A: Add / Deduct points (manual exact amount)
// — Section B: Redeem reward product (auto deducts pts,
//              adds to vault, decrements reward stock)
// ═══════════════════════════════════════════════════════════════════
function PointsTab({ customers, rewards, showToast, loadCustomers, loadRewards }: {
  customers: Customer[]; rewards: RewardItem[];
  showToast: (m: string) => void; loadCustomers: () => void; loadRewards: () => void;
}) {
  // Section A state
  const [pointsMode, setPointsMode] = useState<'add' | 'deduct'>('add');
  const [pointsUser, setPointsUser] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsDesc, setPointsDesc] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);

  // Section B state
  const [redeemUser, setRedeemUser] = useState('');
  const [redeemProduct, setRedeemProduct] = useState<RewardItem | null>(null);
  const [redeemQty, setRedeemQty] = useState(1);
  const [redeemLoading, setRedeemLoading] = useState(false);

  const selectedCustomerA = customers.find(c => c.id === pointsUser);
  const selectedCustomerB = customers.find(c => c.username.toLowerCase() === redeemUser.toLowerCase());
  const totalRedeemCost = redeemProduct ? redeemProduct.pointsCost * redeemQty : 0;
  const hasEnoughPoints = selectedCustomerB ? selectedCustomerB.points >= totalRedeemCost : false;

  async function handlePointsSubmit() {
    const pts = parseInt(pointsAmount, 10);
    if (!pts || pts <= 0) { showToast('⚠️ Enter a valid point amount'); return; }
    if (!pointsUser) { showToast('⚠️ Select a customer'); return; }
    setPointsLoading(true);
    try {
      if (pointsMode === 'add') {
        await addPointsManual(pointsUser, pts, pointsDesc || 'Manual admin addition');
        showToast(`✓ +${pts} pts added to @${pointsUser}`);
      } else {
        await deductPoints(pointsUser, pts, pointsDesc || 'Manual admin deduction');
        showToast(`✓ −${pts} pts deducted from @${pointsUser}`);
      }
      setPointsAmount(''); setPointsDesc(''); loadCustomers();
    } catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Error')); }
    setPointsLoading(false);
  }

  async function handleRedeem() {
    if (!redeemUser || !redeemProduct) { showToast('⚠️ Select a customer and reward'); return; }
    if (!selectedCustomerB) { showToast('❌ Customer not found'); return; }
    if (!hasEnoughPoints) { showToast(`❌ @${redeemUser} only has ${selectedCustomerB.points} pts, needs ${totalRedeemCost} pts`); return; }
    if (redeemProduct.stock !== undefined && redeemProduct.stock < redeemQty) {
      showToast(`❌ Only ${redeemProduct.stock} in stock`); return;
    }
    setRedeemLoading(true);
    try {
      await deductPoints(redeemUser, totalRedeemCost, `Redemption ×${redeemQty}: ${redeemProduct.name}`);
      await addRedeemedVaultItem(redeemUser, {
        productName: redeemProduct.name,
        pointsCost: totalRedeemCost,
        quantity: redeemQty,
        description: redeemProduct.description || '',
        imageUrl: redeemProduct.imageUrl || '',
        redeemableProductId: redeemProduct.id,
      });
      showToast(`✓ Redeemed ×${redeemQty} "${redeemProduct.name}" for @${redeemUser} (−${totalRedeemCost} pts)`);
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

      {/* ── Section A: Add / Deduct ── */}
      <div style={sectionCard}>
        <div style={sectionTitle}>⭐ Add / Deduct Points</div>
        <div style={sectionSub}>Manually adjust a customer&apos;s point balance. Enter the exact number of points — no auto-conversion.</div>

        {/* Mode toggle */}
        <div className="mode-toggle">
          {(['add', 'deduct'] as const).map(mode => (
            <button key={mode} onClick={() => setPointsMode(mode)}
              style={{ padding: '10px 24px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: pointsMode === mode ? (mode === 'add' ? '#16a34a' : 'var(--red)') : 'rgba(255,255,255,0.04)',
                color: pointsMode === mode ? 'white' : 'rgba(255,255,255,0.4)' }}>
              {mode === 'add' ? '➕ Add Points' : '➖ Deduct Points'}
            </button>
          ))}
        </div>

        <div className="two-col">
          <div>
            <label style={lbl}>Customer</label>
            <select value={pointsUser} onChange={e => setPointsUser(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
              <option value="">— select customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.id} ({c.firstName} {c.lastName})</option>)}
            </select>
            {selectedCustomerA && (
              <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, fontFamily: 'var(--ff-mono)' }}>
                Current: {selectedCustomerA.points} pts
              </div>
            )}
          </div>
          <div>
            <label style={lbl}>Points to {pointsMode === 'add' ? 'Add' : 'Deduct'}</label>
            <input type="number" min={1} value={pointsAmount} onChange={e => setPointsAmount(e.target.value)}
              placeholder="e.g. 5"
              style={{ ...inp, fontFamily: 'var(--ff-mono)', fontSize: 18, fontWeight: 700, color: pointsMode === 'add' ? '#22C55E' : '#FF6B75', marginBottom: 0 }} />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Exact points — no IDR conversion</div>
          </div>
        </div>

        <label style={lbl}>Description / Note</label>
        <input placeholder={pointsMode === 'add' ? 'e.g. Bonus for live event attendance' : 'e.g. Refund adjustment'}
          value={pointsDesc} onChange={e => setPointsDesc(e.target.value)} style={inp} />

        {selectedCustomerA && pointsAmount && pointsMode === 'deduct' && parseInt(pointsAmount) > selectedCustomerA.points && (
          <div style={{ fontSize: 12, color: '#FF6B75', marginBottom: 10, padding: '8px 12px', background: 'rgba(230,57,70,0.08)', borderRadius: 6 }}>
            ❌ Insufficient balance — @{pointsUser} only has {selectedCustomerA.points} pts
          </div>
        )}

        <button onClick={handlePointsSubmit} disabled={pointsLoading || !pointsUser || !pointsAmount}
          style={{ ...btn, marginTop: 4,
            background: pointsMode === 'add' ? '#16a34a' : 'var(--red)',
            opacity: pointsLoading || !pointsUser || !pointsAmount ? 0.5 : 1,
            cursor: pointsLoading || !pointsUser || !pointsAmount ? 'not-allowed' : 'pointer' }}>
          {pointsLoading ? 'Processing...' : pointsMode === 'add' ? `➕ Add ${pointsAmount || '—'} pts` : `➖ Deduct ${pointsAmount || '—'} pts`}
        </button>
      </div>

      {/* ── Section B: Redeem reward ── */}
      <div style={{ ...sectionCard, borderColor: 'rgba(212,160,23,0.15)' }}>
        <div style={sectionTitle}>🏆 Redeem Reward Product</div>
        <div style={sectionSub}>
          Process a reward redemption — deducts points, adds item to customer&apos;s vault, and decrements reward stock.
        </div>

        <label style={lbl}>Customer Username</label>
        <input placeholder="joesmi42" value={redeemUser} onChange={e => setRedeemUser(e.target.value)} style={inp} />
        {selectedCustomerB && (
          <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 12, marginTop: -6, fontFamily: 'var(--ff-mono)' }}>
            Balance: {selectedCustomerB.points} pts
          </div>
        )}

        <label style={lbl}>Select Reward</label>
        {rewards.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', padding: 16, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 10 }}>
            No rewards yet. Add some in the 🏆 Rewards tab.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            {rewards.map(r => {
              const sb = stockBadge(r.stock);
              const isSelected = redeemProduct?.id === r.id;
              const outOfStock = r.stock === 0;
              return (
                <div key={r.id}
                  className="reward-picker-card"
                  onClick={() => { if (!outOfStock) { setRedeemProduct(isSelected ? null : r); setRedeemQty(1); } }}
                  style={{
                    border: isSelected ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.08)',
                    background: isSelected ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.02)',
                    cursor: outOfStock ? 'not-allowed' : 'pointer', opacity: outOfStock ? 0.4 : 1 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: 'linear-gradient(135deg,#FDF8EC,#F5E8C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
                    {r.imageUrl ? <img src={r.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : r.emoji || '⭐'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2, display: 'flex', gap: 8 }}>
                      <span>{r.category}</span>
                      <span style={{ color: sb.color, background: sb.bg, padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>{sb.label}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--ff-mono)', color: 'var(--gold)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>⭐ {r.pointsCost}</div>
                  {isSelected && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: 'var(--black)', fontSize: 11, fontWeight: 700 }}>✓</span></div>}
                </div>
              );
            })}
          </div>
        )}

        {/* Qty + summary when product selected */}
        {redeemProduct && (
          <div style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.2)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <div className="qty-row" style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 28 }}>Qty</span>
              <button onClick={() => setRedeemQty(q => Math.max(1, q - 1))}
                style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <input type="number" min={1} max={redeemProduct.stock ?? 99} value={redeemQty}
                onChange={e => setRedeemQty(Math.max(1, Math.min(redeemProduct.stock ?? 99, parseInt(e.target.value) || 1)))}
                style={{ width: 60, padding: '6px 0', textAlign: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: 'white', fontFamily: 'var(--ff-mono)', fontSize: 16, fontWeight: 700, outline: 'none' }} />
              <button onClick={() => setRedeemQty(q => Math.min(redeemProduct.stock ?? 99, q + 1))}
                style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              {redeemProduct.stock !== undefined && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>max {redeemProduct.stock}</span>}
            </div>

            {/* Cost row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{redeemQty} × ⭐{redeemProduct.pointsCost}</div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>⭐ {totalRedeemCost} pts</div>
            </div>

            {/* Balance check */}
            {redeemUser && selectedCustomerB && (
              <div style={{ fontSize: 12, color: hasEnoughPoints ? '#22C55E' : '#FF6B75' }}>
                {hasEnoughPoints
                  ? `✅ @${selectedCustomerB.username} has ${selectedCustomerB.points} pts — ${selectedCustomerB.points - totalRedeemCost} remaining after`
                  : `❌ @${selectedCustomerB.username} only has ${selectedCustomerB.points} pts — needs ${totalRedeemCost - selectedCustomerB.points} more`}
              </div>
            )}
          </div>
        )}

        {redeemProduct && redeemUser && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
            Will add <strong style={{ color: 'white' }}>×{redeemQty} {redeemProduct.name}</strong> to <strong style={{ color: 'var(--gold)' }}>@{redeemUser}</strong>&apos;s vault · stock −{redeemQty} · deduct <span style={{ color: '#FF6B75' }}>−{totalRedeemCost} pts</span>
          </div>
        )}

        <button onClick={handleRedeem}
          disabled={redeemLoading || !redeemProduct || !redeemUser || !hasEnoughPoints}
          style={{ ...btn, opacity: redeemLoading || !redeemProduct || !redeemUser || !hasEnoughPoints ? 0.5 : 1, cursor: redeemLoading || !redeemProduct || !redeemUser || !hasEnoughPoints ? 'not-allowed' : 'pointer' }}>
          {redeemLoading ? 'Processing...' : `⭐ Process Redemption${redeemProduct ? ` (×${redeemQty})` : ''}`}
        </button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PRODUCTS TAB
// ═══════════════════════════════════════════════════════════════════
function ProductsTab({ products, showToast, loadProducts, uploadPhoto }: {
  products: ProdItem[]; showToast: (m: string) => void;
  loadProducts: () => void; uploadPhoto: (f: File, folder: string) => Promise<string>;
}) {
  const [prodName, setProdName] = useState('');
  const [prodSeries, setProdSeries] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodEmoji, setProdEmoji] = useState('📦');
  const [prodBadge, setProdBadge] = useState('');
  const [prodPhotos, setProdPhotos] = useState<Array<{ file: File; preview: string; uploading: boolean }>>([]);
  const [editingProd, setEditingProd] = useState<string | null>(null);
  const [deletingProd, setDeletingProd] = useState<string | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdSeries, setEditProdSeries] = useState('');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdStock, setEditProdStock] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdBadge, setEditProdBadge] = useState('');
  const [editProdPhoto, setEditProdPhoto] = useState<{ file: File; preview: string; uploading: boolean } | null>(null);

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(24px,5vw,32px)', color: 'white', letterSpacing: '0.04em' }}>PRODUCTS</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Catalog sealed products — shown in shop & used for vault purchases</div>
      </div>

      {/* Add form */}
      <div style={sectionCard}>
        <div style={sectionTitle}>➕ Add New Product</div>
        <div style={sectionSub}>Added products appear in the catalog and can be purchased through the Vault tab.</div>

        <div className="two-col">
          <div>
            <label style={lbl}>Product Name</label>
            <input placeholder="Prismatic Evolutions Pack" value={prodName} onChange={e => setProdName(e.target.value)} style={{ ...inp, marginBottom: 0 }} />
          </div>
          <div>
            <label style={lbl}>Series / Category</label>
            <input placeholder="Scarlet & Violet" value={prodSeries} onChange={e => setProdSeries(e.target.value)} style={{ ...inp, marginBottom: 0 }} />
          </div>
          <div>
            <label style={lbl}>Price (Rp)</label>
            <input type="number" placeholder="150000" value={prodPrice} onChange={e => setProdPrice(e.target.value)} style={{ ...inp, marginBottom: 0 }} />
          </div>
          <div>
            <label style={lbl}>Stock</label>
            <input type="number" placeholder="20" value={prodStock} onChange={e => setProdStock(e.target.value)} style={{ ...inp, marginBottom: 0 }} />
          </div>
        </div>
        <div className="two-col" style={{ marginTop: 4 }}>
          <div>
            <label style={lbl}>Emoji Icon</label>
            <input placeholder="📦" value={prodEmoji} onChange={e => setProdEmoji(e.target.value)} style={{ ...inp, width: 80, marginBottom: 0 }} />
          </div>
          <div>
            <label style={lbl}>Badge (optional)</label>
            <select value={prodBadge} onChange={e => setProdBadge(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
              <option value="">None</option>
              <option value="HOT">HOT</option>
              <option value="NEW">NEW</option>
              <option value="SALE">SALE</option>
            </select>
          </div>
        </div>
        <label style={lbl}>Description</label>
        <textarea placeholder="Product description..." value={prodDesc} onChange={e => setProdDesc(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} />
        <label style={lbl}>Product Photos</label>
        <PhotoDropZone id="prod-photos" photos={prodPhotos} setPhotos={setProdPhotos} />
        <button onClick={async () => {
          if (!prodName || !prodPrice) { showToast('⚠️ Name and price required'); return; }
          let imageUrl = '';
          if (prodPhotos.length > 0) {
            setProdPhotos(prev => prev.map(p => ({ ...p, uploading: true })));
            imageUrl = await uploadPhoto(prodPhotos[0].file, 'products');
          }
          await upsertProduct(null, { name: prodName, series: prodSeries, price: parseFloat(prodPrice), stock: parseInt(prodStock) || 0, description: prodDesc, emoji: prodEmoji, badge: prodBadge || null, ...(imageUrl && { imageUrl }) });
          showToast(`✓ "${prodName}" added`);
          setProdName(''); setProdSeries(''); setProdPrice(''); setProdStock(''); setProdDesc(''); setProdEmoji('📦'); setProdBadge(''); setProdPhotos([]);
          loadProducts();
        }} style={btn}>Add Product →</button>
      </div>

      {/* Product list */}
      <div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16, fontWeight: 600 }}>ALL PRODUCTS ({products.length})</div>
        {products.length === 0
          ? <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', padding: 20, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>No products yet.</div>
          : products.map((p: ProdItem) => {
            const sb = stockBadge(p.stock);
            return (
              <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                {editingProd === p.id ? (
                  <div>
                    <div className="two-col" style={{ marginBottom: 8 }}>
                      <div><label style={lbl}>Name</label><input value={editProdName} onChange={e => setEditProdName(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
                      <div><label style={lbl}>Series</label><input value={editProdSeries} onChange={e => setEditProdSeries(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
                      <div><label style={lbl}>Price (Rp)</label><input type="number" value={editProdPrice} onChange={e => setEditProdPrice(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
                      <div><label style={lbl}>Stock</label><input type="number" value={editProdStock} onChange={e => setEditProdStock(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
                    </div>
                    <label style={lbl}>Badge</label>
                    <select value={editProdBadge} onChange={e => setEditProdBadge(e.target.value)} style={{ ...inp, width: 120 }}>
                      <option value="">None</option>
                      <option value="HOT">HOT</option>
                      <option value="NEW">NEW</option>
                      <option value="SALE">SALE</option>
                    </select>
                    <label style={lbl}>Description</label>
                    <textarea value={editProdDesc} onChange={e => setEditProdDesc(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
                    <label style={lbl}>Replace Image</label>
                    <div style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 8, padding: 14, textAlign: 'center', marginBottom: 10, cursor: 'pointer' }}
                      onClick={() => document.getElementById(`edit-prod-${p.id}`)?.click()}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Click to upload new image</div>
                      <input id={`edit-prod-${p.id}`} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) setEditProdPhoto({ file: f, preview: URL.createObjectURL(f), uploading: false }); e.target.value = ''; }} />
                    </div>
                    {editProdPhoto && (
                      <div style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                        <img src={editProdPhoto.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => setEditProdPhoto(null)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(230,57,70,0.85)', border: 'none', color: 'white', width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={async () => {
                        let imageUrl = p.imageUrl || '';
                        if (editProdPhoto) {
                          if (p.imageUrl) { try { const { ref, deleteObject } = await import('firebase/storage'); const { storage } = await import('@/lib/firebase'); await deleteObject(ref(storage, p.imageUrl)); } catch { } }
                          imageUrl = await uploadPhoto(editProdPhoto.file, 'products');
                        }
                        await upsertProduct(p.id, { name: editProdName, series: editProdSeries, price: parseFloat(editProdPrice), stock: parseInt(editProdStock) || 0, description: editProdDesc, badge: editProdBadge || null, imageUrl });
                        showToast(`✓ "${editProdName}" updated`); setEditingProd(null); setEditProdPhoto(null); loadProducts();
                      }} style={{ background: 'var(--gold)', color: 'var(--black)', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Save</button>
                      <button onClick={() => { setEditingProd(null); setEditProdPhoto(null); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="list-item-row">
                    <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                      {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.emoji || '📦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{p.name}</div>
                        {p.badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: p.badge === 'HOT' ? 'rgba(230,57,70,0.2)' : 'rgba(39,81,163,0.2)', color: p.badge === 'HOT' ? '#FF6B75' : '#7E9FF5', letterSpacing: '0.06em' }}>{p.badge}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span>{p.series}</span>
                        <span>Rp {p.price?.toLocaleString('id-ID')}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: sb.color, background: sb.bg, padding: '2px 8px', borderRadius: 20 }}>{sb.label}</span>
                      </div>
                    </div>
                    <div className="list-item-actions" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setEditingProd(p.id); setEditProdName(p.name); setEditProdSeries(p.series || ''); setEditProdPrice(String(p.price)); setEditProdStock(String(p.stock || 0)); setEditProdDesc(p.description || ''); setEditProdBadge(p.badge || ''); }}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>
                      {deletingProd === p.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#FF6B75' }}>Delete?</span>
                          <button onClick={async () => {
                            if (p.imageUrl) { try { const { ref, deleteObject } = await import('firebase/storage'); const { storage } = await import('@/lib/firebase'); await deleteObject(ref(storage, p.imageUrl)); } catch { } }
                            const { deleteDoc, doc: fd } = await import('firebase/firestore'); await deleteDoc(fd(db, 'products', p.id));
                            showToast(`"${p.name}" deleted`); setDeletingProd(null); loadProducts();
                          }} style={{ background: 'var(--red)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Yes</button>
                          <button onClick={() => setDeletingProd(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingProd(p.id)} style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.2)', color: '#FF6B75', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REWARDS TAB
// ═══════════════════════════════════════════════════════════════════
function RewardsTab({ rewards, showToast, loadRewards, uploadPhoto }: {
  rewards: RewardItem[]; showToast: (m: string) => void;
  loadRewards: () => void; uploadPhoto: (f: File, folder: string) => Promise<string>;
}) {
  const [rwName, setRwName] = useState('');
  const [rwCategory, setRwCategory] = useState('');
  const [rwPoints, setRwPoints] = useState('');
  const [rwStock, setRwStock] = useState('');
  const [rwDesc, setRwDesc] = useState('');
  const [rwEmoji, setRwEmoji] = useState('⭐');
  const [rwBadge, setRwBadge] = useState('');
  const [rwPhotos, setRwPhotos] = useState<Array<{ file: File; preview: string; uploading: boolean }>>([]);
  const [editingRw, setEditingRw] = useState<string | null>(null);
  const [deletingRw, setDeletingRw] = useState<string | null>(null);
  const [editRwName, setEditRwName] = useState('');
  const [editRwCategory, setEditRwCategory] = useState('');
  const [editRwPoints, setEditRwPoints] = useState('');
  const [editRwStock, setEditRwStock] = useState('');
  const [editRwDesc, setEditRwDesc] = useState('');
  const [editRwBadge, setEditRwBadge] = useState('');
  const [editRwPhoto, setEditRwPhoto] = useState<{ file: File; preview: string; uploading: boolean } | null>(null);

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(24px,5vw,32px)', color: 'white', letterSpacing: '0.04em' }}>REWARDS</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Redeemable items — customers spend points to claim these</div>
      </div>

      {/* Add form */}
      <div style={{ ...sectionCard, borderColor: 'rgba(212,160,23,0.12)' }}>
        <div style={sectionTitle}>➕ Add New Reward</div>
        <div style={sectionSub}>Rewards are redeemed via the Points tab or by the customer in their vault.</div>

        <div className="two-col">
          <div>
            <label style={lbl}>Reward Name</label>
            <input placeholder="PSA Graded Slab" value={rwName} onChange={e => setRwName(e.target.value)} style={{ ...inp, marginBottom: 0 }} />
          </div>
          <div>
            <label style={lbl}>Category</label>
            <input placeholder="Grading Service" value={rwCategory} onChange={e => setRwCategory(e.target.value)} style={{ ...inp, marginBottom: 0 }} />
          </div>
          <div>
            <label style={lbl}>Points Required ⭐</label>
            <input type="number" placeholder="50" value={rwPoints} onChange={e => setRwPoints(e.target.value)} style={{ ...inp, marginBottom: 0 }} />
          </div>
          <div>
            <label style={lbl}>Stock</label>
            <input type="number" placeholder="10" value={rwStock} onChange={e => setRwStock(e.target.value)} style={{ ...inp, marginBottom: 0 }} />
          </div>
        </div>
        <div className="two-col" style={{ marginTop: 4 }}>
          <div>
            <label style={lbl}>Emoji Icon</label>
            <input placeholder="⭐" value={rwEmoji} onChange={e => setRwEmoji(e.target.value)} style={{ ...inp, width: 80, marginBottom: 0 }} />
          </div>
          <div>
            <label style={lbl}>Badge (optional)</label>
            <select value={rwBadge} onChange={e => setRwBadge(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
              <option value="">None</option>
              <option value="POPULAR">POPULAR</option>
              <option value="VALUE">VALUE</option>
              <option value="LIMITED">LIMITED</option>
            </select>
          </div>
        </div>
        <label style={lbl}>Description</label>
        <textarea placeholder="Reward description..." value={rwDesc} onChange={e => setRwDesc(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} />
        <label style={lbl}>Reward Photo</label>
        <PhotoDropZone id="rw-photos" photos={rwPhotos} setPhotos={setRwPhotos} />
        <button onClick={async () => {
          if (!rwName || !rwPoints) { showToast('⚠️ Name and points required'); return; }
          let imageUrl = '';
          if (rwPhotos.length > 0) {
            setRwPhotos(prev => prev.map(p => ({ ...p, uploading: true })));
            imageUrl = await uploadPhoto(rwPhotos[0].file, 'redeemable');
          }
          await upsertRedeemableProduct(null, { name: rwName, category: rwCategory, pointsCost: parseInt(rwPoints) || 0, stock: parseInt(rwStock) || 0, description: rwDesc, emoji: rwEmoji, badge: rwBadge || null, ...(imageUrl && { imageUrl }) });
          showToast(`✓ "${rwName}" reward added`);
          setRwName(''); setRwCategory(''); setRwPoints(''); setRwStock(''); setRwDesc(''); setRwEmoji('⭐'); setRwBadge(''); setRwPhotos([]);
          loadRewards();
        }} style={btn}>Add Reward →</button>
      </div>

      {/* Rewards list */}
      <div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16, fontWeight: 600 }}>ALL REWARDS ({rewards.length})</div>
        {rewards.length === 0
          ? <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', padding: 20, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>No rewards yet.</div>
          : rewards.map((r: RewardItem) => {
            const sb = stockBadge(r.stock);
            return (
              <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,160,23,0.1)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                {editingRw === r.id ? (
                  <div>
                    <div className="two-col" style={{ marginBottom: 8 }}>
                      <div><label style={lbl}>Name</label><input value={editRwName} onChange={e => setEditRwName(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
                      <div><label style={lbl}>Category</label><input value={editRwCategory} onChange={e => setEditRwCategory(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
                      <div><label style={lbl}>Points Required ⭐</label><input type="number" value={editRwPoints} onChange={e => setEditRwPoints(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
                      <div><label style={lbl}>Stock</label><input type="number" value={editRwStock} onChange={e => setEditRwStock(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
                    </div>
                    <label style={lbl}>Badge</label>
                    <select value={editRwBadge} onChange={e => setEditRwBadge(e.target.value)} style={{ ...inp, width: 140 }}>
                      <option value="">None</option>
                      <option value="POPULAR">POPULAR</option>
                      <option value="VALUE">VALUE</option>
                      <option value="LIMITED">LIMITED</option>
                    </select>
                    <label style={lbl}>Description</label>
                    <textarea value={editRwDesc} onChange={e => setEditRwDesc(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
                    <label style={lbl}>Replace Image</label>
                    <div style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 8, padding: 14, textAlign: 'center', marginBottom: 10, cursor: 'pointer' }}
                      onClick={() => document.getElementById(`edit-rw-${r.id}`)?.click()}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Click to upload new image</div>
                      <input id={`edit-rw-${r.id}`} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) setEditRwPhoto({ file: f, preview: URL.createObjectURL(f), uploading: false }); e.target.value = ''; }} />
                    </div>
                    {editRwPhoto && (
                      <div style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                        <img src={editRwPhoto.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => setEditRwPhoto(null)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(230,57,70,0.85)', border: 'none', color: 'white', width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={async () => {
                        let imageUrl = r.imageUrl || '';
                        if (editRwPhoto) {
                          if (r.imageUrl) { try { const { ref, deleteObject } = await import('firebase/storage'); const { storage } = await import('@/lib/firebase'); await deleteObject(ref(storage, r.imageUrl)); } catch { } }
                          imageUrl = await uploadPhoto(editRwPhoto.file, 'redeemable');
                        }
                        await upsertRedeemableProduct(r.id, { name: editRwName, category: editRwCategory, pointsCost: parseInt(editRwPoints) || 0, stock: parseInt(editRwStock) || 0, description: editRwDesc, badge: editRwBadge || null, imageUrl });
                        showToast(`✓ "${editRwName}" updated`); setEditingRw(null); setEditRwPhoto(null); loadRewards();
                      }} style={{ background: 'var(--gold)', color: 'var(--black)', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Save</button>
                      <button onClick={() => { setEditingRw(null); setEditRwPhoto(null); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="list-item-row">
                    <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg,#FDF8EC,#F5E8C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                      {r.imageUrl ? <img src={r.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : r.emoji || '⭐'}
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{r.name}</div>
                        {r.badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(212,160,23,0.15)', color: 'var(--gold)', letterSpacing: '0.06em' }}>{r.badge}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span>{r.category}</span>
                        <span style={{ color: 'var(--gold)', fontWeight: 700 }}>⭐ {r.pointsCost} pts</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: sb.color, background: sb.bg, padding: '2px 8px', borderRadius: 20 }}>{sb.label}</span>
                      </div>
                    </div>
                    <div className="list-item-actions" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setEditingRw(r.id); setEditRwName(r.name); setEditRwCategory(r.category || ''); setEditRwPoints(String(r.pointsCost)); setEditRwStock(String(r.stock || 0)); setEditRwDesc(r.description || ''); setEditRwBadge(r.badge || ''); }}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>
                      {deletingRw === r.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#FF6B75' }}>Delete?</span>
                          <button onClick={async () => {
                            if (r.imageUrl) { try { const { ref, deleteObject } = await import('firebase/storage'); const { storage } = await import('@/lib/firebase'); await deleteObject(ref(storage, r.imageUrl)); } catch { } }
                            await deleteRedeemableProduct(r.id);
                            showToast(`"${r.name}" deleted`); setDeletingRw(null); loadRewards();
                          }} style={{ background: 'var(--red)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Yes</button>
                          <button onClick={() => setDeletingRw(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingRw(r.id)} style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.2)', color: '#FF6B75', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </>
  );
}