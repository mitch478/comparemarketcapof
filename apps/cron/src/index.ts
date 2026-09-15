import { app } from './app';
import './env';
import { refreshSnapshot } from './refresh';

export default {
  fetch: app.fetch,
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(refreshSnapshot(env, `cron ${controller.cron}`));
  },
} satisfies ExportedHandler<Env>;
