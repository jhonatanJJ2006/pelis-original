'use client';

import { usePathname } from 'next/navigation';
import { Header } from './components/header';
import { Footer } from './components/footer';
import { BottomTabBar } from './components/bottom-tab-bar';
import { useIsMobilePwa } from '@/hooks/use-is-mobile-pwa';
import { useIsInstalledApp } from '@/hooks/use-is-installed-app';
import { useIsTvDevice } from '@/hooks/use-is-tv-device';
import { useTabSwipe } from '@/hooks/use-tab-swipe';

function ProtectedLayoutClient({ children }: { children: React.ReactNode }) {
  const isMobilePwa = useIsMobilePwa();
  const isInstalledApp = useIsInstalledApp();
  const isTvDevice = useIsTvDevice();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isTV = pathname?.startsWith('/tv') ?? false;
  const tvChrome = isTvDevice || isTV;
  const showBrowserFooter = !tvChrome && !isInstalledApp;
  useTabSwipe();

  return (
    <div
      className={
        isTV ? 'h-dvh flex flex-col overflow-hidden bg-black' : 'min-h-screen flex flex-col'
      }
    >
      <Header
        minimalNav={isMobilePwa && !isTvDevice}
        sticky={!isHome && !isTV}
        tvMode={isTvDevice}
      />
      <main className={isTV ? 'flex-1 min-h-0' : 'flex-1'}>{children}</main>
      {showBrowserFooter && <Footer className="w-full" />}
      {!isTvDevice && (
        <div
          className="h-[calc(4.25rem+env(safe-area-inset-bottom))] shrink-0 md:hidden"
          aria-hidden
        />
      )}
      {!isTvDevice && <BottomTabBar />}
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayoutClient>{children}</ProtectedLayoutClient>;
}
