'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getProduct } from '@/lib/db';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Product = { id:string; name:string; series?:string; price:number; stock?:number; description?:string; emoji?:string; badge?:string; imageUrl?:string; images?:string[]; cardsPerPack?:number; language?:string; };

const FALLBACK: Record<string,Product> = {
  '1': { id:'1', name:'Prismatic Evolutions Pack', series:'Scarlet & Violet', price:150000, stock:20, emoji:'🃏', description:'The highly anticipated Prismatic Evolutions expansion featuring stunning Eevee evolutions. Each pack contains 10 cards with a guaranteed rare or better.', cardsPerPack:10, language:'English' },
  '2': { id:'2', name:'Ascended Heroes Pack', series:'Scarlet & Violet', price:120000, stock:15, emoji:'⚡', description:'Brand new expansion with powerful ex Pokémon and rare Illustration Rare cards.', cardsPerPack:10, language:'English' },
  '3': { id:'3', name:'Stellar Crown Pack', series:'Scarlet & Violet', price:130000, stock:10, emoji:'🌟', description:'Stellar Crown features new Stellar-type Pokémon ex cards with stunning artwork.', cardsPerPack:10, language:'English' },
  '4': { id:'4', name:'Charizard ex Premium Collection', series:'Obsidian Flames', price:450000, stock:5, emoji:'🔥', description:'Premium collection featuring the iconic Charizard ex with exclusive promo cards and booster packs.', cardsPerPack:10, language:'English' },
};

export default function ProductPage() {
  const { id } = useParams() as { id:string };
  const [product, setProduct] = useState<Product|null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [waNumber, setWaNumber] = useState('62xxxxxxxxxx');



  useEffect(() => {
    getProduct(id).then(data => {
      setProduct(data as Product || FALLBACK[id] || null);
      setLoading(false);
    }).catch(() => { setProduct(FALLBACK[id]||null); setLoading(false); });
  }, [id]);

  useEffect(() => {
  getDoc(doc(db, 'config', 'whatsapp')).then(snap => {
    if (snap.exists()) setWaNumber(snap.data().phoneNumber);
  }).catch(() => {});
}, []);

  if (loading) return <><Navbar /><div style={{ paddingTop:'var(--nav-h)', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh', color:'#8892A8' }}>Loading...</div></>;
  if (!product) return <><Navbar /><div style={{ paddingTop:'var(--nav-h)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'80vh', gap:16 }}><div style={{ fontSize:48 }}>😔</div><Link href="/catalog" style={{ color:'var(--blue2)', textDecoration:'none' }}>← Back to Catalog</Link></div></>;

  const imgs = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const waMsg = `Hi PokeJoe! I want to order: ${product.name} (Rp ${product.price.toLocaleString('id-ID')}). Please confirm availability.`;
  
  return (
    <>
      <Navbar />
      <div style={{ paddingTop:'var(--nav-h)', minHeight:'100vh', background:'var(--white)' }}>
        <div className="breadcrumb">
          <Link href="/" style={{ color:'#8892A8', textDecoration:'none' }}>Home</Link> <span>›</span>
          <Link href="/catalog" style={{ color:'#8892A8', textDecoration:'none' }}>Catalog</Link> <span>›</span>
          <span style={{ color:'var(--black)' }}>{product.name}</span>
        </div>

        <div className="product-grid">
          {/* Images */}
          <div>
            <div style={{ background:'linear-gradient(135deg,#E8EBF5,#D5DAE8)', borderRadius:20, aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:140, position:'relative', overflow:'hidden' }}>
              {imgs.length > 0 ? (
                <>
                  <img src={imgs[activeImg]} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} />
                  {imgs.length > 1 && (
                    <>
                      <button onClick={()=>setActiveImg(i=>(i-1+imgs.length)%imgs.length)}
                        style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', zIndex:2, background:'rgba(0,0,0,0.4)', border:'none', color:'white', width:36, height:36, borderRadius:'50%', cursor:'pointer', fontSize:20, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
                      <button onClick={()=>setActiveImg(i=>(i+1)%imgs.length)}
                        style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', zIndex:2, background:'rgba(0,0,0,0.4)', border:'none', color:'white', width:36, height:36, borderRadius:'50%', cursor:'pointer', fontSize:20, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(45deg,transparent 30%,rgba(255,255,255,0.08) 50%,transparent 70%)', animation:'shimmer 3s ease-in-out infinite' }} />
                  <span style={{ position:'relative', zIndex:1, animation:'cardFloat 5s ease-in-out infinite' }}>{product.emoji||'📦'}</span>
                </>
              )}
            </div>

            {imgs.length > 1 && (
              <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
                {imgs.map((url,i)=>(
                  <div key={i} onClick={()=>setActiveImg(i)} style={{ width:64, height:64, borderRadius:8, overflow:'hidden', border:i===activeImg?'2px solid var(--gold)':'2px solid transparent', cursor:'pointer', flexShrink:0 }}>
                    <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ paddingTop:8 }}>
            {product.series && <div style={{ display:'inline-block', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'#8892A8', background:'#F2F4F8', padding:'5px 12px', borderRadius:4, marginBottom:14, fontWeight:500 }}>{product.series}</div>}
            <h1 style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(36px,6vw,52px)', lineHeight:0.95, color:'var(--black)', marginBottom:6 }}>{product.name.toUpperCase()}</h1>
            <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:8, flexWrap:'wrap' }}>
              <div style={{ fontSize:32, fontWeight:700, color:'var(--blue)', fontFamily:'var(--ff-mono)' }}>Rp {product.price.toLocaleString('id-ID')}</div>
              <div style={{ background:'rgba(212,160,23,0.08)', border:'1px solid rgba(212,160,23,0.2)', color:'var(--gold)', fontSize:12, fontWeight:600, padding:'5px 12px', borderRadius:20 }}>Earn {Math.floor(product.price/100000)} pts</div>
            </div>
            <hr style={{ border:'none', borderTop:'1px solid #EEF0F5', margin:'24px 0' }} />
            {product.description && <p style={{ fontSize:14, color:'#5A6278', lineHeight:1.8, marginBottom:24, fontWeight:300 }}>{product.description}</p>}
            <div className="product-stats-grid">
              {[
                { val:product.cardsPerPack?`${product.cardsPerPack}`:'10', label:'Cards/Pack' },
                { val:product.language||'English', label:'Language' },
                { val:product.stock!==undefined?(product.stock>10?'In Stock':`${product.stock} left`):'In Stock', label:'Availability' },
              ].map((s,i)=>(
                <div key={i} style={{ background:'#F2F4F8', borderRadius:8, padding:'14px 16px', textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--ff-mono)', fontSize:18, fontWeight:700, color:'var(--black)' }}>{s.val}</div>
                  <div style={{ fontSize:10, color:'#8892A8', marginTop:3, textTransform:'uppercase', letterSpacing:'0.08em' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#25D366', color:'white', textDecoration:'none', padding:16, borderRadius:8, fontSize:14, fontWeight:600 }}>
              💬 Order via WhatsApp
            </a>
            <p style={{ fontSize:12, color:'#8892A8', marginTop:12, textAlign:'center' }}>📦 We can store your purchase in your vault until you&apos;re ready to ship.</p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes cardFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
        @keyframes shimmer{0%{transform:translateX(-100%);}100%{transform:translateX(100%);}}
      `}</style>
    </>
  );
}