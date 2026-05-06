'use client';
import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Customer = {
  id: string; username: string; firstName?: string; lastName?: string;
  phone?: string; points: number; vaultActive: boolean;
  joinedAt?: { seconds: number } | string;
  purchaseHistory?: Array<{ description: string; amount: number; points: number; date: string; type?: string }>;
};
export type Tab = 'customers' | 'vault' | 'vaultviewer' | 'points' | 'products' | 'rewards' | 'psa';
export type ProdItem = { id: string; name: string; series?: string; price: number; stock?: number; emoji?: string; imageUrl?: string; description?: string; badge?: string; cardsPerPack?: number; language?: string; };
export type RewardItem = { id: string; name: string; category?: string; pointsCost: number; stock?: number; emoji?: string; imageUrl?: string; description?: string; badge?: string; cardsPerPack?: number; language?: string; };
export type VaultItem = { id: string; type?: string; status?: string; addedAt?: { seconds: number }; liveTitle?: string; packs?: string[]; photos?: string[]; productName?: string; productId?: string; price?: number; quantity?: number; totalPrice?: number; pointsCost?: number; description?: string; imageUrl?: string; };

export const STATUS_OPTIONS = ['On progress', 'In transit', 'Done'] as const;

export function statusStyle(status?: string) {
  if (status === 'Done')       return { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.25)' };
  if (status === 'In transit') return { color: '#D97706', bg: 'rgba(217,119,6,0.1)',   border: 'rgba(217,119,6,0.25)' };
  return                              { color: '#8892A8', bg: 'rgba(136,146,168,0.1)', border: 'rgba(136,146,168,0.2)' };
}

export function generateUsername(firstName: string, lastName: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const f = clean(firstName), l = clean(lastName);
  const base = (f.slice(0, 3) + l.slice(0, 3)).padEnd(6, 'x');
  return base + Math.floor(Math.random() * 99).toString().padStart(2, '0');
}

export function stockBadge(stock: number | undefined) {
  if (stock === undefined) return { label: '∞ unlimited', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)' };
  if (stock === 0)         return { label: '✕ Out of stock', color: '#FF6B75', bg: 'rgba(230,57,70,0.12)' };
  if (stock <= 3)          return { label: `⚠ ${stock} left`, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' };
  return                          { label: `${stock} in stock`, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' };
}

export const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', color: 'white', fontFamily: 'var(--ff-body)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 };
export const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, marginTop: 8 };
export const btn: React.CSSProperties = { background: 'var(--gold)', color: 'var(--black)', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, marginTop: 8 };
export const sectionCard: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 28, marginBottom: 24 };
export const sectionTitle: React.CSSProperties = { fontSize: 14, color: 'white', fontWeight: 700, marginBottom: 4 };
export const sectionSub: React.CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 };

// ─── Photo drop zone ──────────────────────────────────────────────
export function PhotoDropZone({ id, photos, setPhotos, single }: {
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
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{single ? 'Click or drag to upload image' : 'Click or drag to upload images'}</div>
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
              {!p.uploading && <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(230,57,70,0.85)', border: 'none', color: 'white', width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}