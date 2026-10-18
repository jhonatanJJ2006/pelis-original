import { NextResponse } from 'next/server';
import { readAppAvailability } from '@/lib/app-availability';

/** Siempre leer disco: version.json / APK versions cambian en deploy sin rebuild. */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await readAppAvailability(), {
    headers: {
      // Deploy local (Movies + tunnel): el modal de update necesita la versión
      // fresca del disco, no un JSON cacheado 5 minutos en el borde.
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}
