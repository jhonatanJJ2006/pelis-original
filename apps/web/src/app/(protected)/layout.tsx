'use client';

import { usePathname } from 'next/navigation';
import { Header } from './components/header';
import { Footer } from './components/footer';
import { BottomTabBar } from './components/bottom-tab-bar';
import { useIsMobilePwa } from '@/hooks/use-is-mobile-pwa';
import { useTabSwipe } from '@/hooks/use-tab-swipe';

function ProtectedLayoutClient({ children }: { children: React.ReactNode }) {
  const isMobilePwa = useIsMobilePwa();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isTV = pathname?.startsWith('/tv') ?? false;
  useTabSwipe();

  if (isTV) {
    return <div className="min-h-screen bg-black">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header minimalNav={isMobilePwa} sticky={!isHome} />
      <main className="flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      {!isHome && <Footer className="hidden md:block" />}
      <BottomTabBar />
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayoutClient>{children}</ProtectedLayoutClient>;
}
