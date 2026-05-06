'use client';
import { useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addVaultItem, addVaultItemFromProduct, getVaultItems, updateVaultItemStatus, deleteVaultItem } from '@/lib/db';
import type { Customer, ProdItem, VaultItem } from './admin-utils';
import { stockBadge, STATUS_OPTIONS, statusStyle, inp, lbl, btn, sectionCard, sectionTitle, sectionSub, PhotoDropZone } from './admin-utils';

// ═══════════════════════════════════════════════════════════════════
// VAULT TAB — Add items (live session + product purchase)
// ═══════════════════════════════════════════════════════════════════
export function VaultTab({ customers, products, showToast, loadCustomers, loadProducts, uploadPhoto }: {
  customers: Customer[]; products: ProdItem[];
  showToast: (m: string) => void; loadCustomers: () => void;
  loadProducts: () => void; uploadPhoto: (f: File, folder: string) => Promise<string>;
}) {
  // Section A — live session
  const [vaultUser, setVaultUser] = useState('');
  const [vaultTitle, setVaultTitle] = useState('');
  const [vaultPacks, setVaultPacks] = useState('');
  const [vaultStatus, setVaultStatus] = useState<string>('On progress');
  const [vaultPhotos, setVaultPhotos] = useState<Array<{ file: File; preview: string; uploading: boolean }>>([]);

  // Section B — product purchase
  const [purchaseUser, setPurchaseUser] = useState('');
  const [purchaseProductId, setPurchaseProductId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [purchaseDesc, setPurchaseDesc] = useState('');
  const [purchaseAutoPoints, setPurchaseAutoPoints] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<string>('On progress');
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

        <label style={lbl}>Status</label>
        <StatusPicker value={vaultStatus} onChange={setVaultStatus} />

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
          await addVaultItem(vaultUser, { liveTitle: vaultTitle, packs, photos: photoUrls, status: vaultStatus });
          showToast(`✓ Live items added to @${vaultUser}`);
          setVaultUser(''); setVaultTitle(''); setVaultPacks(''); setVaultPhotos([]); setVaultStatus('On progress');
        }} style={btn}>Add Live Items to Vault →</button>
      </div>

      {/* ── Section B: Product purchase ── */}
      <div style={{ ...sectionCard, borderColor: 'rgba(212,160,23,0.15)' }}>
        <div style={sectionTitle}>🛒 Product Purchase</div>
        <div style={sectionSub}>Add a catalog product to a customer&apos;s vault. Automatically decrements product stock. Optionally awards loyalty points (Rp 100,000 = 1 pt).</div>

        <div className="two-col">
          <div>
            <label style={lbl}>Customer</label>
            <select value={purchaseUser} onChange={e => setPurchaseUser(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
              <option value="">— select customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.id} ({c.firstName} {c.lastName})</option>)}
            </select>
            {purchaseUser && (() => { const f = customers.find(c => c.id === purchaseUser); return f ? <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, fontFamily: 'var(--ff-mono)' }}>Balance: {f.points} pts</div> : null; })()}
          </div>
          <div>
            <label style={lbl}>Product (Catalog)</label>
            <select value={purchaseProductId} onChange={e => { setPurchaseProductId(e.target.value); setPurchaseQty(1); }} style={{ ...inp, marginBottom: 0 }}>
              <option value="">— select product —</option>
              {products.map(p => <option key={p.id} value={p.id} disabled={p.stock === 0}>{p.name}{typeof p.stock === 'number' ? ` — stock: ${p.stock}` : ''}{p.stock === 0 ? ' (OUT)' : ''}</option>)}
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
                  <button onClick={() => setPurchaseQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <input type="number" min={1} max={selectedProduct.stock ?? 999} value={purchaseQty} onChange={e => setPurchaseQty(Math.max(1, Math.min(selectedProduct.stock ?? 999, parseInt(e.target.value) || 1)))} style={{ width: 60, padding: '7px 0', textAlign: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: 'white', fontFamily: 'var(--ff-mono)', fontSize: 15, fontWeight: 700, outline: 'none' }} />
                  <button onClick={() => setPurchaseQty(q => Math.min(selectedProduct.stock ?? 999, q + 1))} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
              <div>
                <label style={lbl}>Total Price</label>
                <div style={{ padding: '8px 0', fontFamily: 'var(--ff-mono)', fontSize: 18, color: 'var(--gold)', fontWeight: 700 }}>Rp {totalPrice.toLocaleString('id-ID')}</div>
              </div>
            </div>

            <label style={lbl}>Note / Description (optional)</label>
            <input placeholder="e.g. LIVE Batch #12 purchase" value={purchaseDesc} onChange={e => setPurchaseDesc(e.target.value)} style={inp} />

            <label style={lbl}>Status</label>
            <StatusPicker value={purchaseStatus} onChange={setPurchaseStatus} />

            <div style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={purchaseAutoPoints} onChange={e => setPurchaseAutoPoints(e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer', accentColor: 'var(--gold)' }} />
                <div>
                  <div style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>Auto-award loyalty points</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                    Rp 100,000 = 1 pt
                    {purchaseAutoPoints && pointsPreview > 0 && <span style={{ marginLeft: 10, color: 'var(--gold)', fontWeight: 700 }}>→ +{pointsPreview} pts will be awarded</span>}
                  </div>
                </div>
              </label>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              <strong style={{ color: 'white' }}>Summary: </strong>
              Add <strong style={{ color: 'var(--gold)' }}>{selectedProduct.name} ×{purchaseQty}</strong> to <strong style={{ color: 'var(--gold)' }}>@{purchaseUser || '...'}</strong>&apos;s vault · Stock −{purchaseQty}
              {purchaseAutoPoints && pointsPreview > 0 ? <> · <span style={{ color: '#22C55E' }}>+{pointsPreview} pts</span></> : null}
            </div>
          </>
        )}

        <button disabled={purchaseLoading || !purchaseUser || !purchaseProductId}
          onClick={async () => {
            if (!selectedProduct) return;
            setPurchaseLoading(true);
            try {
              await addVaultItemFromProduct(purchaseUser, { productId: selectedProduct.id, productName: selectedProduct.name, price: selectedProduct.price, quantity: purchaseQty, description: purchaseDesc, imageUrl: selectedProduct.imageUrl, autoAddPoints: purchaseAutoPoints, status: purchaseStatus });
              showToast(`✓ "${selectedProduct.name}" ×${purchaseQty} added to @${purchaseUser}${purchaseAutoPoints && pointsPreview > 0 ? ` · +${pointsPreview} pts` : ''}`);
              setPurchaseProductId(''); setPurchaseQty(1); setPurchaseDesc(''); setPurchaseAutoPoints(false); setPurchaseStatus('On progress');
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
// VAULT VIEWER TAB — View, update status, delete vault items per customer
// ═══════════════════════════════════════════════════════════════════
export function VaultViewerTab({ customers, showToast }: {
  customers: Customer[]; showToast: (m: string) => void;
}) {
  const [selectedUser, setSelectedUser] = useState('');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'live' | 'purchase' | 'redemption'>('all');

  async function loadItems(username: string) {
    if (!username) { setItems([]); return; }
    setLoadingItems(true);
    try {
      const data = await getVaultItems(username) as VaultItem[];
      setItems(data);
    } catch { showToast('❌ Failed to load vault items'); setItems([]); }
    setLoadingItems(false);
  }

  async function handleStatusChange(item: VaultItem, newStatus: string) {
    if (!selectedUser) return;
    setUpdatingId(item.id);
    try {
      await updateVaultItemStatus(selectedUser, item.id, newStatus);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
      showToast(`✓ Status updated to "${newStatus}"`);
    } catch { showToast('❌ Failed to update status'); }
    setUpdatingId(null);
  }

  async function handleDelete(item: VaultItem) {
    if (!selectedUser) return;
    setDeletingId(null);
    try {
      await deleteVaultItem(selectedUser, item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      showToast('✓ Item deleted');
    } catch { showToast('❌ Failed to delete item'); }
  }

  const filtered = items.filter(i => filterType === 'all' || i.type === filterType || (!i.type && filterType === 'live'));
  const selectedCustomer = customers.find(c => c.id === selectedUser);

  function typeLabel(type?: string) {
    if (type === 'purchase')   return { icon: '🛒', label: 'Purchase', color: '#7E9FF5', bg: 'rgba(39,81,163,0.15)' };
    if (type === 'redemption') return { icon: '⭐', label: 'Redeemed', color: 'var(--gold)', bg: 'rgba(212,160,23,0.12)' };
    return                            { icon: '📡', label: 'Live Session', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' };
  }

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(24px,5vw,32px)', color: 'white', letterSpacing: '0.04em' }}>VAULT VIEWER</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>View and manage vault items for any customer</div>
      </div>

      <div style={sectionCard}>
        <div style={sectionTitle}>👤 Select Customer</div>
        <div style={{ ...sectionSub, marginBottom: 12 }}>Choose a customer to view their vault contents</div>
        <div className="two-col">
          <div>
            <label style={lbl}>Customer</label>
            <select value={selectedUser} onChange={e => { setSelectedUser(e.target.value); loadItems(e.target.value); setFilterType('all'); }} style={{ ...inp, marginBottom: 0 }}>
              <option value="">— select customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.id} ({c.firstName} {c.lastName})</option>)}
            </select>
          </div>
          {selectedCustomer && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Balance: <span style={{ color: 'var(--gold)', fontWeight: 700, fontFamily: 'var(--ff-mono)' }}>{selectedCustomer.points} pts</span></div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Vault: <span style={{ color: selectedCustomer.vaultActive ? '#22C55E' : '#FF6B75' }}>{selectedCustomer.vaultActive ? '● Active' : '○ Inactive'}</span></div>
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {([['all', 'All Items'], ['live', '📡 Live'], ['purchase', '🛒 Purchases'], ['redemption', '⭐ Redeemed']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilterType(val as typeof filterType)}
                style={{ padding: '7px 14px', borderRadius: 20, border: filterType === val ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)', background: filterType === val ? 'rgba(212,160,23,0.12)' : 'transparent', color: filterType === val ? 'var(--gold)' : 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontWeight: filterType === val ? 600 : 400 }}>
                {label} {val === 'all' ? `(${items.length})` : `(${items.filter(i => i.type === val || (!i.type && val === 'live')).length})`}
              </button>
            ))}
          </div>

          {loadingItems ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading vault items...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
              {items.length === 0 ? `@${selectedUser}'s vault is empty.` : 'No items match this filter.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {filtered.map(item => {
                const tl = typeLabel(item.type);
                const ss = statusStyle(item.status);
                const isUpdating = updatingId === item.id;
                const isDeleting = deletingId === item.id;

                return (
                  <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: tl.color, background: tl.bg, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{tl.icon} {tl.label}</span>
                      <div style={{ flex: 1, fontSize: 13, color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.liveTitle || item.productName || '—'}
                        {item.quantity && item.quantity > 1 && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> ×{item.quantity}</span>}
                      </div>
                      {item.addedAt && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap', flexShrink: 0 }}>{new Date(item.addedAt.seconds * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
                    </div>

                    <div style={{ padding: '14px 16px' }}>
                      {item.packs && item.packs.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Packs / Items</div>
                          {item.packs.map((pack, i) => (
                            <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', padding: '5px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginBottom: 4 }}>📦 {pack}</div>
                          ))}
                        </div>
                      )}

                      {(item.type === 'purchase' || item.type === 'redemption') && (
                        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                          {item.imageUrl && <img src={item.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 100 }}>
                            {item.description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{item.description}</div>}
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              {item.totalPrice != null && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Rp {item.totalPrice.toLocaleString('id-ID')}</span>}
                              {item.pointsCost != null && <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>−{item.pointsCost} pts</span>}
                            </div>
                          </div>
                        </div>
                      )}

                      {item.photos && item.photos.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                          {item.photos.map((url, i) => (
                            <img key={i} src={url} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: ss.color, background: ss.bg, border: `1px solid ${ss.border}`, padding: '4px 12px', borderRadius: 20 }}>
                          {item.status || 'On progress'}
                        </div>
                        {STATUS_OPTIONS.filter(s => s !== (item.status || 'On progress')).map(s => {
                          const st = statusStyle(s);
                          return (
                            <button key={s} onClick={() => handleStatusChange(item, s)} disabled={isUpdating}
                              style={{ fontSize: 11, fontWeight: 500, color: st.color, background: 'transparent', border: `1px solid ${st.border}`, padding: '4px 10px', borderRadius: 20, cursor: isUpdating ? 'wait' : 'pointer', opacity: isUpdating ? 0.5 : 1, transition: 'all 0.15s' }}>
                              → {s}
                            </button>
                          );
                        })}
                        <div style={{ flex: 1 }} />
                        {isDeleting ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#FF6B75' }}>Delete?</span>
                            <button onClick={() => handleDelete(item)} style={{ background: 'var(--red)', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Yes</button>
                            <button onClick={() => setDeletingId(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(item.id)} style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.2)', color: '#FF6B75', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>🗑 Delete</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!selectedUser && (
        <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          Select a customer above to view their vault
        </div>
      )}
    </>
  );
}

// ─── Status picker (3-way toggle) ────────────────────────────────────────────
function StatusPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', width: 'fit-content' }}>
      {STATUS_OPTIONS.map(s => {
        const st = statusStyle(s);
        const active = value === s;
        return (
          <button key={s} onClick={() => onChange(s)}
            style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400, background: active ? st.bg : 'rgba(255,255,255,0.03)', color: active ? st.color : 'rgba(255,255,255,0.3)', borderRight: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {s}
          </button>
        );
      })}
    </div>
  );
}