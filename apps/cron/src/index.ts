import { app } from './app';
import './env';

/**
 * Phase 0 stub. Phase 1 replaces the body of `refreshSnapshot` with the CoinGecko
 * refresh (fetch → zod validate → KV write, never overwriting on failure).
 */
async function refreshSnapshot(env: Env, trigger: string): Promise<void> {
  console.log(`[cron] refresh triggered (${trigger}) — provider not wired yet (phase 0); source=${env.SNAPSHOT_SOURCE}`);
}

export default {
  fetch: app.fetch,
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(refreshSnapshot(env, controller.cron));
  },
} satisfies ExportedHandler<Env>;
