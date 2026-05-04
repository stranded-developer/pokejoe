'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getRedeemableProduct } from '@/lib/db';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type RedeemProduct = { id:string; name:string; category?:string; pointsCost:number; stock?:number; emoji?:string; imageUrl?:string; images?:string[]; description?:string; language?:string; badge?:string; };

const FALLBACK: Record<string,RedeemProduct> = {
  'r1': { id:'r1', name:'PSA Graded Slab', category:'Grading Service', pointsCost:50, emoji:'🏆', description:'Submit your pulled card for professional PSA grading. Includes slabbing, authentication, and grading. Final grade may vary based on card condition.' },
  'r2': { id:'r2', name:'Charizard ex Premium Box', category:'Sealed Product', pointsCost:30, emoji:'🔥', description:'Premium collection box featuring the iconic Charizard ex with exclusive promo cards and booster packs.' },
};

export default function RedeemDetailPage() {
  const { id } = useParams() as { id:string };
  const [product, setProduct] = useState<RedeemProduct|null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [waNumber, setWaNumber] = useState('62xxxxxxxxxx');

  useEffect(() => {
    getRedeemableProduct(id).then(data => {
      setProduct(data as RedeemProduct || FALLBACK[id] || null);
      setLoading(false);
    }).catch(() => { setProduct(FALLBACK[id]||null); setLoading(false); });
  }, [id]);

  useEffect(() => {
    getDoc(doc(db, 'config', 'whatsapp')).then(snap => {
      if (snap.exists()) setWaNumber(snap.data().phoneNumber);
    }).catch(() => {});
  }, []);

  if (loading) return (
    <><Navbar />
    <div style={{ paddingTop:'var(--nav-h)', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh', color:'#8892A8' }}>Loading...</div>
    </>
  );

  if (!product) return (
    <><Navbar />
    <div style={{ paddingTop:'var(--nav-h)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'80vh', gap:16 }}>
      <div style={{ fontSize:48 }}>😔</div>
      <div style={{ fontSize:14, color:'#8892A8' }}>Reward not found</div>
      <Link href="/redeem" style={{ color:'var(--gold)', textDecoration:'none', fontWeight:600 }}>← Back to Rewards</Link>
    </div></>
  );

  const imgs = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const waMsg = `Hi PokeJoe! I want to redeem: ${product.name} (${product.pointsCost} points). Please confirm my eligibility.`;

  return (
    <>
      <Navbar />
      <div style={{ paddingTop:'var(--nav-h)', minHeight:'100vh', background:'var(--white)' }}>

        <div className="breadcrumb">
          <Link href="/" style={{ color:'#8892A8', textDecoration:'none' }}>Home</Link> <span>›</span>
          <Link href="/redeem" style={{ color:'#8892A8', textDecoration:'none' }}>Redeem</Link> <span>›</span>
          <span style={{ color:'var(--black)' }}>{product.name}</span>
        </div>

        <div className="product-grid">
          {/* Image */}
          <div>
            <div style={{ background:'linear-gradient(135deg,#FDF8EC,#F0DFA0)', borderRadius:20, aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:140, position:'relative', overflow:'hidden' }}>
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
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(45deg,transparent 30%,rgba(212,160,23,0.1) 50%,transparent 70%)', animation:'shimmer 3s ease-in-out infinite' }} />
                  <span style={{ position:'relative', zIndex:1, animation:'cardFloat 5s ease-in-out infinite' }}>{product.emoji||'⭐'}</span>
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
            {product.category && (
              <div style={{ display:'inline-block', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gold)', background:'rgba(212,160,23,0.1)', border:'1px solid rgba(212,160,23,0.25)', padding:'5px 12px', borderRadius:4, marginBottom:14, fontWeight:500 }}>
                ⭐ {product.category}
              </div>
            )}

            <h1 style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(36px,6vw,52px)', lineHeight:0.95, color:'var(--black)', marginBottom:16 }}>
              {product.name.toUpperCase()}
            </h1>

            {/* Points cost */}
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:8, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(212,160,23,0.08)', border:'2px solid rgba(212,160,23,0.3)', padding:'12px 20px', borderRadius:12 }}>
                <span style={{ fontSize:28 }}>⭐</span>
                <div>
                  <div style={{ fontFamily:'var(--ff-mono)', fontSize:36, fontWeight:700, color:'var(--gold)', lineHeight:1 }}>{product.pointsCost}</div>
                  <div style={{ fontSize:11, color:'rgba(212,160,23,0.7)', letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:600 }}>Points Required</div>
                </div>
              </div>
              <div style={{ fontSize:13, color:'#8892A8', lineHeight:1.5 }}>
                = Rp {(product.pointsCost * 100000).toLocaleString('id-ID')}<br />
                <span style={{ fontSize:11 }}>in purchases</span>
              </div>
            </div>

            <hr style={{ border:'none', borderTop:'1px solid #EEF0F5', margin:'24px 0' }} />

            {product.description && (
              <p style={{ fontSize:14, color:'#5A6278', lineHeight:1.8, marginBottom:24, fontWeight:300 }}>{product.description}</p>
            )}

            <div className="redeem-stats-grid">
              {[
                { val: product.stock !== undefined ? (product.stock > 10 ? 'Available' : `${product.stock} left`) : 'Available', label:'Availability' },
                { val: product.language || 'Varies', label:'Language' },
              ].map((s,i)=>(
                <div key={i} style={{ background:'#F2F4F8', borderRadius:8, padding:'14px 16px', textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--ff-mono)', fontSize:16, fontWeight:700, color:'var(--black)' }}>{s.val}</div>
                  <div style={{ fontSize:10, color:'#8892A8', marginTop:3, textTransform:'uppercase', letterSpacing:'0.08em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* How to redeem */}
            <div style={{ background:'rgba(212,160,23,0.05)', border:'1px solid rgba(212,160,23,0.15)', borderRadius:10, padding:'16px 18px', marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--gold)', marginBottom:8, letterSpacing:'0.06em', textTransform:'uppercase' }}>How to Redeem</div>
              <ol style={{ fontSize:13, color:'#5A6278', lineHeight:1.8, paddingLeft:16 }}>
                <li>Make sure you have enough points in your vault</li>
                <li>Tap &quot;Redeem via WhatsApp&quot; below</li>
                <li>PokeJoe admin will verify and process your redemption</li>
                <li>Item will be added to your vault or shipped</li>
              </ol>
            </div>

            <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#25D366', color:'white', textDecoration:'none', padding:16, borderRadius:8, fontSize:14, fontWeight:600, marginBottom:12 }}>
              💬 Redeem via WhatsApp
            </a>

            <Link href="/vault" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'rgba(212,160,23,0.08)', border:'1px solid rgba(212,160,23,0.25)', color:'var(--gold)', textDecoration:'none', padding:'13px 16px', borderRadius:8, fontSize:14, fontWeight:600 }}>
              ⭐ Check My Points Balance
            </Link>

            <p style={{ fontSize:12, color:'#8892A8', marginTop:12, textAlign:'center' }}>
              📦 Redeemed items will be stored in your vault until you request a shipment.
            </p>
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