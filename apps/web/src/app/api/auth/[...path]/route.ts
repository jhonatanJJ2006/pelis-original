import { handler } from '@/lib/auth';
import type { NextRequest } from 'next/server';

async function handleAuth(request: NextRequest) {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    return handler.GET(request);
  }
  return handler.POST(request);
}

export const GET = handleAuth;
export const POST = handleAuth;
