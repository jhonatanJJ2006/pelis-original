import { auth } from '@pelis/db/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = auth().handler;

export const GET = handler;
export const POST = handler;
