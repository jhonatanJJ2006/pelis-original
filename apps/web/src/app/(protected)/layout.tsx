'use client';

import { usePathname } from 'next/navigation';
import { Header } from './components/header';
import { Footer } from './components/footer';
import { BottomTabBar } from './components/bottom-tab-bar';
import { TvInstallBar } from './components/tv-install-bar';
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
  const showBrowserFooter = !isTV && !isInstalledApp;
  const showTvInstallBar = isTvDevice && !isInstalledApp && !isTV;
  useTabSwipe();

  return (
    <div
      className={
        isTV ? 'h-dvh flex flex-col overflow-hidden bg-black' : 'min-h-screen flex flex-col'
      }
    >
      <Header minimalNav={isMobilePwa} sticky={!isHome && !isTV} />
      <main
        className={
          isTV
            ? 'flex-1 min-h-0 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0'
            : 'flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0'
        }
      >
        {children}
      </main>
      {showBrowserFooter && <Footer className="w-full" />}
      {showTvInstallBar && <TvInstallBar />}
      <BottomTabBar />
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayoutClient>{children}</ProtectedLayoutClient>;
}
