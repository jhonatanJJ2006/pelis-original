/**
 * Registry of every query/mutation/action in the system.
 *
 * Each entry declares which tables it reads (for queries) or writes
 * (for mutations). The SSE broadcaster uses this metadata to know
 * which connected clients to invalidate when a table changes.
 */

import type { z } from 'zod';

export type QueryTables = string[];
export type MutationTables = string[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyZod = z.ZodType<any, any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerFn = (ctx: { userId: string | null; isAdmin: boolean }, args: any) => Promise<any>;

export interface QueryDefinition {
  kind: 'query';
  name: string;
  reads: QueryTables;
  args?: AnyZod;
  handler: HandlerFn;
}

export interface MutationDefinition {
  kind: 'mutation';
  name: string;
  writes: MutationTables;
  args?: AnyZod;
  handler: HandlerFn;
}

export interface ActionDefinition {
  kind: 'action';
  name: string;
  reads?: QueryTables;
  writes?: MutationTables;
  args?: AnyZod;
  handler: HandlerFn;
}

export type FunctionDefinition =
  | QueryDefinition
  | MutationDefinition
  | ActionDefinition;

const registry = new Map<string, FunctionDefinition>();

export function register<T extends FunctionDefinition>(def: T): T {
  if (registry.has(def.name)) {
    throw new Error(`Function "${def.name}" is already registered`);
  }
  registry.set(def.name, def);
  return def;
}

export function getDefinition(name: string): FunctionDefinition | undefined {
  return registry.get(name);
}

export function getRegistry(): ReadonlyMap<string, FunctionDefinition> {
  return registry;
}

export function listFunctions(): FunctionDefinition[] {
  return Array.from(registry.values());
}

export function getTablesForFunction(name: string): string[] {
  const def = registry.get(name);
  if (!def) return [];
  if (def.kind === 'query') return def.reads;
  return def.writes ?? [];
}

export function readsTable(name: string, table: string): boolean {
  const def = registry.get(name);
  if (!def || def.kind === 'mutation') return false;
  return (def.reads ?? []).includes(table);
}

export function callHandler(
  def: FunctionDefinition,
  ctx: { userId: string | null; isAdmin: boolean },
  args: unknown,
): Promise<unknown> {
  return def.handler(ctx, args);
}