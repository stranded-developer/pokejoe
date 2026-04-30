import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "PokeJoe — Indonesia's Premier TCG Vault",
  description: 'Premium Pokémon TCG rip & ship, vault storage, and sealed products.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}