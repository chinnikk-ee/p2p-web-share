import { loadConfig } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { createSignalingServer } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel, !config.isProduction);
  const server = createSignalingServer(config, logger);

  const { host, port } = await server.listen();
  logger.info({ host, port, nodeEnv: config.nodeEnv }, 'signaling server listening');

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'shutting down');
    server
      .close()
      .then(() => process.exit(0))
      .catch((err: unknown) => {
        logger.error({ err }, 'error during shutdown');
        process.exit(1);
      });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'unhandled rejection');
    process.exit(1);
  });
}

main().catch((err: unknown) => {
  // Config/boot failure: print plainly since the logger may not exist yet.
  console.error('Failed to start signaling server:\n', err instanceof Error ? err.message : err);
  process.exit(1);
});
