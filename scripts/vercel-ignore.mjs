// @ts-check
/**
 * Vercel Ignored Build Step
 * Exit 0 = cancelar deploy | Exit 1 = continuar con build
 *
 * Reglas:
 * 1. Solo despliega si es un Pull Request hacia la rama `v2`
 * 2. Si el PR es válido, usa turbo-ignore para omitir builds sin cambios en @pelis/web
 *
 * Variables de entorno reconocidas:
 *   - VERCEL_GIT_PULL_REQUEST_ID (string | undefined)
 *   - VERCEL_GIT_COMMIT_REF      (string | undefined)
 *   - VERCEL_GIT_REPO_OWNER      (string | undefined)
 *   - VERCEL_GIT_REPO_SLUG       (string | undefined)
 *   - GITHUB_TOKEN               (opcional, priorizado sobre VERCEL_GIT_ACCESS_TOKEN)
 *   - VERCEL_GIT_ACCESS_TOKEN    (opcional)
 *
 * @module scripts/vercel-ignore
 */

import { spawnSync } from 'node:child_process';

const TARGET_BRANCH = 'v2';
const WORKSPACE = '@pelis/web';

/**
 * @typedef {Object} PullRequest
 * @property {{ ref?: string }} [base]
 */

/**
 * Consulta a la API de GitHub el `base.ref` del PR actual.
 * Devuelve `null` si no hay PR, si faltan vars, o si la API falla.
 *
 * @param {NodeJS.ProcessEnv} env
 * @returns {Promise<string | null>}
 */
async function getPullRequestBaseRef(env) {
  const prId = env.VERCEL_GIT_PULL_REQUEST_ID;
  const owner = env.VERCEL_GIT_REPO_OWNER;
  const repo = env.VERCEL_GIT_REPO_SLUG;

  if (!prId || !owner || !repo) {
    return null;
  }

  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'pelis-vercel-ignore',
  };

  const token = env.GITHUB_TOKEN || env.VERCEL_GIT_ACCESS_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prId}`, {
    headers,
  });

  if (!response.ok) {
    console.log(`No se pudo consultar el PR #${prId} (${response.status}).`);
    return null;
  }

  const pullRequest = /** @type {PullRequest} */ (await response.json());
  return pullRequest.base?.ref ?? null;
}

/**
 * Lanza `turbo-ignore` para decidir si el build es necesario.
 * Sale con `process.exit(result.status ?? 1)`.
 *
 * @returns {void}
 */
function runTurboIgnore() {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(command, ['turbo-ignore', WORKSPACE], {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    console.log(`turbo-ignore falló (${result.error.message}). Continuando con deploy.`);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

/**
 * Punto de entrada. Cancela deploy si no es PR hacia `v2`; en caso contrario,
 * delega en `turbo-ignore`.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const { env } = process;
  const prId = env.VERCEL_GIT_PULL_REQUEST_ID;
  const ref = env.VERCEL_GIT_COMMIT_REF;

  console.log(`Rama: ${ref ?? 'desconocida'}`);
  console.log(`PR ID: ${prId || '(ninguno)'}`);

  if (!prId) {
    console.log('⊘ Deploy cancelado: no es un Pull Request.');
    process.exit(0);
  }

  const baseRef = await getPullRequestBaseRef(env);

  if (!baseRef) {
    console.log('⚠ No se pudo verificar la rama destino del PR. Continuando con deploy.');
    runTurboIgnore();
    return;
  }

  if (baseRef !== TARGET_BRANCH) {
    console.log(`⊘ Deploy cancelado: el PR apunta a "${baseRef}", no a "${TARGET_BRANCH}".`);
    process.exit(0);
  }

  console.log(`✓ PR #${prId} hacia "${TARGET_BRANCH}" — evaluando cambios en ${WORKSPACE}...`);
  runTurboIgnore();
}

main().catch((error) => {
  console.error('Error en vercel-ignore:', error);
  process.exit(1);
});
