'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { href: '/', label: 'HOME' },
    { href: '/catalog', label: 'CATALOG' },
    { href: '/vault', label: 'MY VAULT' },
  ];

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 'var(--nav-h)', background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: '20px',
      }}>
        <Link href="/" style={{ fontFamily: 'var(--ff-display)', fontSize: 28, color: 'var(--black)', letterSpacing: '0.06em', textDecoration: 'none', flexShrink: 0 }}>
          POKE<span style={{ color: 'var(--gold)' }}>JOE</span>
        </Link>

        {/* Desktop links */}
        <div className="nav-desktop-links" style={{ display: 'flex', gap: 28, flex: 1 }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} style={{
              fontSize: 13, color: pathname === l.href ? 'var(--gold)' : 'rgba(0,0,0,0.45)',
              textDecoration: 'none', letterSpacing: '0.04em', fontWeight: 500,
            }}>{l.label}</Link>
          ))}
        </div>

        {/* Desktop right */}
        <div className="nav-desktop-links" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

        {/* Hamburger */}
        <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)} style={{
          marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
          display: 'none', flexDirection: 'column', gap: 5, padding: 4,
        }}>
          <span style={{ display: 'block', width: 22, height: 2, background: 'var(--black)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translateY(7px)' : 'none' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: 'var(--black)', borderRadius: 2, opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: 'block', width: 22, height: 2, background: 'var(--black)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none' }} />
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="nav-mobile-menu" style={{
          position: 'fixed', top: 'var(--nav-h)', left: 0, right: 0, zIndex: 99,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={{
              fontSize: 15, color: pathname === l.href ? 'var(--gold)' : 'var(--black)',
              textDecoration: 'none', letterSpacing: '0.04em', fontWeight: 500,
              padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}>{l.label}</Link>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
            background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.25)',
            padding: '7px 14px', borderRadius: 20, width: 'fit-content', fontSize: 11, color: '#E63946', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', animation: 'livepulse 1.4s ease-in-out infinite', display: 'inline-block' }} />
            LIVE
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .nav-desktop-links { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}