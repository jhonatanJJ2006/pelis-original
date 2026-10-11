import type { FunctionDefinition } from './registry';
import { getDefinition, callHandler } from './registry';
import { AuthError, type RequestCtx } from './lib/requireAdmin';

export class InvokeError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
  }
}

export interface InvokeOptions {
  name: string;
  args: unknown;
  ctx: RequestCtx;
}

export async function invoke({ name, args, ctx }: InvokeOptions): Promise<unknown> {
  const def = getDefinition(name);
  if (!def) {
    throw new InvokeError(`Function "${name}" not found`, 404);
  }
  let parsed: unknown = args ?? {};
  if (def.args) {
    const result = def.args.safeParse(args);
    if (!result.success) {
      throw new InvokeError(
        `Invalid args for "${name}": ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        400
      );
    }
    parsed = result.data;
  }
  try {
    return await callHandler(def, ctx, parsed);
  } catch (err) {
    if (err instanceof InvokeError) throw err;
    if (err instanceof AuthError) throw new InvokeError(err.message, err.status);
    const msg = err instanceof Error ? err.message : 'unknown error';
    if (msg.includes('No autenticado')) throw new InvokeError(msg, 401);
    if (msg.includes('Requiere rol admin')) throw new InvokeError(msg, 403);
    if (msg.includes('Requiere plan activo')) throw new InvokeError(msg, 403);
    if (msg.includes('Plan no encontrado') || msg.includes('No encontrado')) {
      throw new InvokeError(msg, 404);
    }
    throw new InvokeError(msg, 500);
  }
}

export { getDefinition };
export type { FunctionDefinition };
