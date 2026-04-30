'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const links = [
    { href: '/', label: 'HOME' },
    { href: '/catalog', label: 'CATALOG' },
    { href: '/vault', label: 'MY VAULT' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 'var(--nav-h)', background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', padding: '0 40px', gap: '40px',
    }}>
      <Link href="/" style={{ fontFamily: 'var(--ff-display)', fontSize: 28, color: 'var(--black)', letterSpacing: '0.06em', textDecoration: 'none', flexShrink: 0 }}>
        POKE<span style={{ color: 'var(--gold)' }}>JOE</span>
      </Link>
      <div style={{ display: 'flex', gap: 28, flex: 1 }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            fontSize: 13, color: pathname === l.href ? 'var(--gold)' : 'rgba(0,0,0,0.45)',
            textDecoration: 'none', letterSpacing: '0.04em', fontWeight: 500,
          }}>{l.label}</Link>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.25)',
          padding: '5px 12px', borderRadius: 20, fontSize: 11, color: '#E63946', fontWeight: 600, letterSpacing: '0.08em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', animation: 'livepulse 1.4s ease-in-out infinite', display: 'inline-block' }} />
          LIVE
        </div>
        <Link href="/vault" style={{
          background: 'transparent', border: '1px solid rgba(0,0,0,0.15)', color: 'var(--black)',
          padding: '8px 18px', borderRadius: 6, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', letterSpacing: '0.04em', textDecoration: 'none',
        }}>MY VAULT</Link>
      </div>
    </nav>
  );
}