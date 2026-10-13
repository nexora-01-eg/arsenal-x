import type { Metadata } from 'next';
import './globals.css';
import { Crosshair, Wrench, Search, Briefcase, Layers, Compass } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Arsenal X — ترسانة الأصول',
  description: 'لوحة تحكم أصول NEXORA — كل عنصر له كود X مرجعي قابل للنسخ',
};

const NAV = [
  { href: '/#cats', label: 'الفئات' },
  { href: '/fonts', label: 'الخطوط' },
  { href: '/images', label: 'الصور' },
  { href: '/backgrounds', label: 'خلفيات' },
  { href: '/video', label: 'الفيديو' },
  { href: '/music', label: 'الموسيقى' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="noise flex min-h-screen flex-col bg-[var(--bg)] text-white">
        {/* nav */}
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#08080d]/75 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="group flex items-center gap-3">
              <span className="gold-ring flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 text-gold transition-transform group-hover:rotate-12">
                <Crosshair size={22} />
              </span>
              <span className="leading-none">
                <span className="gold-text block text-lg font-black tracking-tight">Arsenal X</span>
                <span className="block text-[10px] tracking-[0.3em] text-muted">NEXORA ARSENAL</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm lg:flex">
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-white/60 transition-all hover:bg-gold/10 hover:text-gold"
              >
                <Search size={14} /> بحث
              </Link>              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-full px-4 py-2 text-white/60 transition-all hover:bg-gold/10 hover:text-gold"
                >
                  {n.label}
                </Link>
              ))}
                <Link
                  href="/search"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-white/60 transition-all hover:bg-gold/10 hover:text-gold"
                >
                  <Search size={14} /> بحث
                </Link>
                <Link
                  href="/workspace"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-white/60 transition-all hover:bg-gold/10 hover:text-gold"
                >
                  <Briefcase size={14} /> مساحتي
                </Link>
                <Link
                  href="/collections"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-white/60 transition-all hover:bg-gold/10 hover:text-gold"
                >
                  <Layers size={14} /> مجموعات
                </Link>
                <Link
                  href="/discover"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-white/60 transition-all hover:bg-gold/10 hover:text-gold"
                >
                  <Compass size={14} /> اكتشف
                </Link>
            </nav>
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs text-gold lg:hidden"
            >
              <Wrench size={14} />
              أدواتي
            </Link>
          </div>
          {/* gold hairline */}
          <div className="h-px bg-gradient-to-l from-transparent via-gold/40 to-transparent" />
        </header>

        {/* ambient background */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-48 left-1/2 h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-gold/[0.07] blur-[120px]" />
          <div className="absolute right-[-10rem] top-1/3 h-[24rem] w-[24rem] rounded-full bg-[#3b2f8f]/20 blur-[120px]" />
          <div className="absolute bottom-[-12rem] left-[-8rem] h-[22rem] w-[22rem] rounded-full bg-gold/[0.05] blur-[110px]" />
        </div>

        <main className="relative z-10 flex-1">{children}</main>

        <footer className="relative z-10 mt-10 border-t border-white/[0.06]">
          <div className="h-px bg-gradient-to-l from-transparent via-gold/40 to-transparent" />
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-6 py-8 text-center">
            <span className="gold-text text-base font-black">Arsenal X</span>
            <span className="text-[11px] tracking-[0.25em] text-muted">NEXORA · SINGLE FINAL EDITION · X-CODE SYSTEM</span>
            <span className="mt-1 flex items-center gap-4 text-[11px] text-muted">
              <Link href="/vault" className="transition-colors hover:text-gold">الخزانة</Link>
              <Link href="/gaps" className="transition-colors hover:text-gold">الفجوات</Link>
              <Link href="/system" className="transition-colors hover:text-gold">النظام</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
