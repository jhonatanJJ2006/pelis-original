import dns from 'node:dns';
import type { LookupFunction } from 'node:net';
import { Agent } from 'undici';

/**
 * Some home-router resolvers fail (EAI_AGAIN / NXDOMAIN) for the rotating
 * anime CDN zones (e.g. `*.echovideo.to`). Try the system resolver first and,
 * on failure, ask public resolvers directly so the proxy keeps working.
 */
const publicResolver = new dns.promises.Resolver({ timeout: 4000, tries: 2 });
publicResolver.setServers(['1.1.1.1', '8.8.8.8', '9.9.9.9']);

export const fallbackLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, options, (err, address, family) => {
    if (!err) {
      callback(null, address, family);
      return;
    }
    publicResolver
      .resolve4(hostname)
      .then((addresses) => {
        const first = addresses[0];
        if (!first) throw err;
        if (typeof options === 'object' && options && 'all' in options && options.all) {
          (callback as unknown as (e: null, a: Array<{ address: string; family: number }>) => void)(
            null,
            addresses.map((address) => ({ address, family: 4 }))
          );
        } else {
          callback(null, first, 4);
        }
      })
      .catch(() => callback(err, '', 0));
  });
};

let agent: Agent | null = null;

/** Shared keep-alive dispatcher for third-party stream upstreams. */
export function getUpstreamDispatcher(): Agent {
  if (!agent) {
    agent = new Agent({
      connect: { lookup: fallbackLookup, timeout: 10_000 },
      keepAliveTimeout: 30_000,
      connections: 64,
      headersTimeout: 20_000,
      bodyTimeout: 30_000,
    });
  }
  return agent;
}
