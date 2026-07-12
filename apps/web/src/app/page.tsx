import { HomePageClient } from './(protected)/components/home-page-client';
import { Header } from './(protected)/components/header';
import { Footer } from './(protected)/components/footer';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header sticky={false} />
      <main className="flex-1">
        <HomePageClient />
      </main>
      <Footer />
    </div>
  );
}
