'use client';

import { Header } from './components/header';
import { Footer } from './components/footer';
import { BottomTabBar } from './components/bottom-tab-bar';
import { PwaUpdateBanner } from '@/components/pwa-update-banner';
import { useIsMobilePwa } from '@/hooks/use-is-mobile-pwa';
import { useTabSwipe } from '@/hooks/use-tab-swipe';
import { cn } from '@pelis/ui/utils';

function ProtectedLayoutClient({ children }: { children: React.ReactNode }) {
  const isMobilePwa = useIsMobilePwa();
  useTabSwipe(isMobilePwa);

  return (
    <div className="min-h-screen flex flex-col">
      <Header minimalNav={isMobilePwa} />
      <PwaUpdateBanner />
      <main className={cn('flex-1', isMobilePwa && 'pb-20')}>{children}</main>
      {!isMobilePwa && <Footer />}
      {isMobilePwa && <BottomTabBar />}
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayoutClient>{children}</ProtectedLayoutClient>;
}
