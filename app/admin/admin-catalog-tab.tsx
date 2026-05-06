'use client';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { upsertProduct, upsertRedeemableProduct, deleteRedeemableProduct } from '@/lib/db';
import type { ProdItem, RewardItem } from './page';
import { stockBadge, inp, lbl, btn, sectionCard, sectionTitle, sectionSub, PhotoDropZone } from './page';

// ═══════════════════════════════════════════════════════════════════
// PRODUCTS TAB
// ═══════════════════════════════════════════════════════════════════
export function ProductsTab({ products, showToast, loadProducts, uploadPhoto }: {
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
  const [prodCardsPerPack, setProdCardsPerPack] = useState('');
  const [prodLanguage, setProdLanguage] = useState('');
  const [prodPhotos, setProdPhotos] = useState<Array<{ file: File; preview: string; uploading: boolean }>>([]);
  const [editingProd, setEditingProd] = useState<string | null>(null);
  const [deletingProd, setDeletingProd] = useState<string | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdSeries, setEditProdSeries] = useState('');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdStock, setEditProdStock] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdBadge, setEditProdBadge] = useState('');
  const [editProdCardsPerPack, setEditProdCardsPerPack] = useState('');
  const [editProdLanguage, setEditProdLanguage] = useState('');
  const [editProdPhoto, setEditProdPhoto] = useState<{ file: File; preview: string; uploading: boolean } | null>(null);

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(24px,5vw,32px)', color: 'white', letterSpacing: '0.04em' }}>PRODUCTS</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Catalog sealed products — shown in shop & used for vault purchases</div>
      </div>

      <div style={sectionCard}>
        <div style={sectionTitle}>➕ Add New Product</div>
        <div style={sectionSub}>Added products appear in the catalog and can be purchased through the Vault tab.</div>
        <div className="two-col">
          <div><label style={lbl}>Product Name</label><input placeholder="Prismatic Evolutions Pack" value={prodName} onChange={e => setProdName(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
          <div><label style={lbl}>Series / Category</label><input placeholder="Scarlet & Violet" value={prodSeries} onChange={e => setProdSeries(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
          <div><label style={lbl}>Price (Rp)</label><input type="number" placeholder="150000" value={prodPrice} onChange={e => setProdPrice(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
          <div><label style={lbl}>Stock</label><input type="number" placeholder="20" value={prodStock} onChange={e => setProdStock(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
        </div>
        <div className="two-col" style={{ marginTop: 4 }}>
          <div><label style={lbl}>Emoji Icon</label><input placeholder="📦" value={prodEmoji} onChange={e => setProdEmoji(e.target.value)} style={{ ...inp, width: 80, marginBottom: 0 }} /></div>
          <div>
            <label style={lbl}>Badge (optional)</label>
            <select value={prodBadge} onChange={e => setProdBadge(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
              <option value="">None</option><option value="HOT">HOT</option><option value="NEW">NEW</option><option value="SALE">SALE</option>
            </select>
          </div>
          <div><label style={lbl}>Cards Per Pack</label><input type="number" placeholder="10" value={prodCardsPerPack} onChange={e => setProdCardsPerPack(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
          <div>
            <label style={lbl}>Language</label>
            <select value={prodLanguage} onChange={e => setProdLanguage(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
              <option value="">English</option><option value="English">English</option><option value="Japanese">Japanese</option><option value="Indonesian">Indonesian</option><option value="Korean">Korean</option><option value="Chinese">Chinese</option>
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
          if (prodPhotos.length > 0) { setProdPhotos(prev => prev.map(p => ({ ...p, uploading: true }))); imageUrl = await uploadPhoto(prodPhotos[0].file, 'products'); }
          await upsertProduct(null, { name: prodName, series: prodSeries, price: parseFloat(prodPrice), stock: parseInt(prodStock) || 0, description: prodDesc, emoji: prodEmoji, badge: prodBadge || null, cardsPerPack: parseInt(prodCardsPerPack) || null, language: prodLanguage || 'English', ...(imageUrl && { imageUrl }) });
          showToast(`✓ "${prodName}" added`);
          setProdName(''); setProdSeries(''); setProdPrice(''); setProdStock(''); setProdDesc(''); setProdEmoji('📦'); setProdBadge(''); setProdCardsPerPack(''); setProdLanguage(''); setProdPhotos([]);
          loadProducts();
        }} style={btn}>Add Product →</button>
      </div>

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
                      <div><label style={lbl}>Cards Per Pack</label><input type="number" value={editProdCardsPerPack} onChange={e => setEditProdCardsPerPack(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
                      <div>
                        <label style={lbl}>Language</label>
                        <select value={editProdLanguage} onChange={e => setEditProdLanguage(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
                          <option value="English">English</option><option value="Japanese">Japanese</option><option value="Indonesian">Indonesian</option><option value="Korean">Korean</option><option value="Chinese">Chinese</option>
                        </select>
                      </div>
                    </div>
                    <label style={lbl}>Badge</label>
                    <select value={editProdBadge} onChange={e => setEditProdBadge(e.target.value)} style={{ ...inp, width: 120 }}>
                      <option value="">None</option><option value="HOT">HOT</option><option value="NEW">NEW</option><option value="SALE">SALE</option>
                    </select>
                    <label style={lbl}>Description</label>
                    <textarea value={editProdDesc} onChange={e => setEditProdDesc(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
                    <label style={lbl}>Replace Image</label>
                    <div style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 8, padding: 14, textAlign: 'center', marginBottom: 10, cursor: 'pointer' }} onClick={() => document.getElementById(`edit-prod-${p.id}`)?.click()}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Click to upload new image</div>
                      <input id={`edit-prod-${p.id}`} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setEditProdPhoto({ file: f, preview: URL.createObjectURL(f), uploading: false }); e.target.value = ''; }} />
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
                        if (editProdPhoto) { if (p.imageUrl) { try { const { ref, deleteObject } = await import('firebase/storage'); const { storage } = await import('@/lib/firebase'); await deleteObject(ref(storage, p.imageUrl)); } catch { } } imageUrl = await uploadPhoto(editProdPhoto.file, 'products'); }
                        await upsertProduct(p.id, { name: editProdName, series: editProdSeries, price: parseFloat(editProdPrice), stock: parseInt(editProdStock) || 0, description: editProdDesc, badge: editProdBadge || null, cardsPerPack: parseInt(editProdCardsPerPack) || null, language: editProdLanguage || 'English', imageUrl });
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
                        <span>{p.series}</span><span>Rp {p.price?.toLocaleString('id-ID')}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: sb.color, background: sb.bg, padding: '2px 8px', borderRadius: 20 }}>{sb.label}</span>
                      </div>
                    </div>
                    <div className="list-item-actions" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setEditingProd(p.id); setEditProdName(p.name); setEditProdSeries(p.series || ''); setEditProdPrice(String(p.price)); setEditProdStock(String(p.stock || 0)); setEditProdDesc(p.description || ''); setEditProdBadge(p.badge || ''); setEditProdCardsPerPack(p.cardsPerPack ? String(p.cardsPerPack) : ''); setEditProdLanguage(p.language || 'English'); }}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>
                      {deletingProd === p.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#FF6B75' }}>Delete?</span>
                          <button onClick={async () => { if (p.imageUrl) { try { const { ref, deleteObject } = await import('firebase/storage'); const { storage } = await import('@/lib/firebase'); await deleteObject(ref(storage, p.imageUrl)); } catch { } } const { deleteDoc, doc: fd } = await import('firebase/firestore'); await deleteDoc(fd(db, 'products', p.id)); showToast(`"${p.name}" deleted`); setDeletingProd(null); loadProducts(); }} style={{ background: 'var(--red)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Yes</button>
                          <button onClick={() => setDeletingProd(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>No</button>
                        </div>
                      ) : <button onClick={() => setDeletingProd(p.id)} style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.2)', color: '#FF6B75', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑</button>}
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
export function RewardsTab({ rewards, showToast, loadRewards, uploadPhoto }: {
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
  const [rwCardsPerPack, setRwCardsPerPack] = useState('');
  const [rwLanguage, setRwLanguage] = useState('');
  const [rwPhotos, setRwPhotos] = useState<Array<{ file: File; preview: string; uploading: boolean }>>([]);
  const [editingRw, setEditingRw] = useState<string | null>(null);
  const [deletingRw, setDeletingRw] = useState<string | null>(null);
  const [editRwName, setEditRwName] = useState('');
  const [editRwCategory, setEditRwCategory] = useState('');
  const [editRwPoints, setEditRwPoints] = useState('');
  const [editRwStock, setEditRwStock] = useState('');
  const [editRwDesc, setEditRwDesc] = useState('');
  const [editRwBadge, setEditRwBadge] = useState('');
  const [editRwCardsPerPack, setEditRwCardsPerPack] = useState('');
  const [editRwLanguage, setEditRwLanguage] = useState('');
  const [editRwPhoto, setEditRwPhoto] = useState<{ file: File; preview: string; uploading: boolean } | null>(null);

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 'clamp(24px,5vw,32px)', color: 'white', letterSpacing: '0.04em' }}>REWARDS</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Redeemable items — customers spend points to claim these</div>
      </div>

      <div style={{ ...sectionCard, borderColor: 'rgba(212,160,23,0.12)' }}>
        <div style={sectionTitle}>➕ Add New Reward</div>
        <div style={sectionSub}>Rewards are redeemed via the Points tab or by the customer in their vault.</div>
        <div className="two-col">
          <div><label style={lbl}>Reward Name</label><input placeholder="PSA Graded Slab" value={rwName} onChange={e => setRwName(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
          <div><label style={lbl}>Category</label><input placeholder="Grading Service" value={rwCategory} onChange={e => setRwCategory(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
          <div><label style={lbl}>Points Required ⭐</label><input type="number" placeholder="50" value={rwPoints} onChange={e => setRwPoints(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
          <div><label style={lbl}>Stock</label><input type="number" placeholder="10" value={rwStock} onChange={e => setRwStock(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
        </div>
        <div className="two-col" style={{ marginTop: 4 }}>
          <div><label style={lbl}>Emoji Icon</label><input placeholder="⭐" value={rwEmoji} onChange={e => setRwEmoji(e.target.value)} style={{ ...inp, width: 80, marginBottom: 0 }} /></div>
          <div>
            <label style={lbl}>Badge (optional)</label>
            <select value={rwBadge} onChange={e => setRwBadge(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
              <option value="">None</option><option value="POPULAR">POPULAR</option><option value="VALUE">VALUE</option><option value="LIMITED">LIMITED</option>
            </select>
          </div>
          <div><label style={lbl}>Cards Per Pack</label><input type="number" placeholder="10" value={rwCardsPerPack} onChange={e => setRwCardsPerPack(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
          <div>
            <label style={lbl}>Language</label>
            <select value={rwLanguage} onChange={e => setRwLanguage(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
              <option value="">Varies</option><option value="English">English</option><option value="Japanese">Japanese</option><option value="Indonesian">Indonesian</option><option value="Korean">Korean</option><option value="Chinese">Chinese</option>
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
          if (rwPhotos.length > 0) { setRwPhotos(prev => prev.map(p => ({ ...p, uploading: true }))); imageUrl = await uploadPhoto(rwPhotos[0].file, 'redeemable'); }
          await upsertRedeemableProduct(null, { name: rwName, category: rwCategory, pointsCost: parseInt(rwPoints) || 0, stock: parseInt(rwStock) || 0, description: rwDesc, emoji: rwEmoji, badge: rwBadge || null, cardsPerPack: parseInt(rwCardsPerPack) || null, language: rwLanguage || null, ...(imageUrl && { imageUrl }) });
          showToast(`✓ "${rwName}" reward added`);
          setRwName(''); setRwCategory(''); setRwPoints(''); setRwStock(''); setRwDesc(''); setRwEmoji('⭐'); setRwBadge(''); setRwCardsPerPack(''); setRwLanguage(''); setRwPhotos([]);
          loadRewards();
        }} style={btn}>Add Reward →</button>
      </div>

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
                      <div><label style={lbl}>Cards Per Pack</label><input type="number" value={editRwCardsPerPack} onChange={e => setEditRwCardsPerPack(e.target.value)} style={{ ...inp, marginBottom: 0 }} /></div>
                      <div>
                        <label style={lbl}>Language</label>
                        <select value={editRwLanguage} onChange={e => setEditRwLanguage(e.target.value)} style={{ ...inp, marginBottom: 0 }}>
                          <option value="">Varies</option><option value="English">English</option><option value="Japanese">Japanese</option><option value="Indonesian">Indonesian</option><option value="Korean">Korean</option><option value="Chinese">Chinese</option>
                        </select>
                      </div>
                    </div>
                    <label style={lbl}>Badge</label>
                    <select value={editRwBadge} onChange={e => setEditRwBadge(e.target.value)} style={{ ...inp, width: 140 }}>
                      <option value="">None</option><option value="POPULAR">POPULAR</option><option value="VALUE">VALUE</option><option value="LIMITED">LIMITED</option>
                    </select>
                    <label style={lbl}>Description</label>
                    <textarea value={editRwDesc} onChange={e => setEditRwDesc(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
                    <label style={lbl}>Replace Image</label>
                    <div style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 8, padding: 14, textAlign: 'center', marginBottom: 10, cursor: 'pointer' }} onClick={() => document.getElementById(`edit-rw-${r.id}`)?.click()}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Click to upload new image</div>
                      <input id={`edit-rw-${r.id}`} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setEditRwPhoto({ file: f, preview: URL.createObjectURL(f), uploading: false }); e.target.value = ''; }} />
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
                        if (editRwPhoto) { if (r.imageUrl) { try { const { ref, deleteObject } = await import('firebase/storage'); const { storage } = await import('@/lib/firebase'); await deleteObject(ref(storage, r.imageUrl)); } catch { } } imageUrl = await uploadPhoto(editRwPhoto.file, 'redeemable'); }
                        await upsertRedeemableProduct(r.id, { name: editRwName, category: editRwCategory, pointsCost: parseInt(editRwPoints) || 0, stock: parseInt(editRwStock) || 0, description: editRwDesc, badge: editRwBadge || null, cardsPerPack: parseInt(editRwCardsPerPack) || null, language: editRwLanguage || null, imageUrl });
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
                      <button onClick={() => { setEditingRw(r.id); setEditRwName(r.name); setEditRwCategory(r.category || ''); setEditRwPoints(String(r.pointsCost)); setEditRwStock(String(r.stock || 0)); setEditRwDesc(r.description || ''); setEditRwBadge(r.badge || ''); setEditRwCardsPerPack(r.cardsPerPack ? String(r.cardsPerPack) : ''); setEditRwLanguage(r.language || ''); }}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>
                      {deletingRw === r.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#FF6B75' }}>Delete?</span>
                          <button onClick={async () => { if (r.imageUrl) { try { const { ref, deleteObject } = await import('firebase/storage'); const { storage } = await import('@/lib/firebase'); await deleteObject(ref(storage, r.imageUrl)); } catch { } } await deleteRedeemableProduct(r.id); showToast(`"${r.name}" deleted`); setDeletingRw(null); loadRewards(); }} style={{ background: 'var(--red)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Yes</button>
                          <button onClick={() => setDeletingRw(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>No</button>
                        </div>
                      ) : <button onClick={() => setDeletingRw(r.id)} style={{ background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.2)', color: '#FF6B75', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>🗑</button>}
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