'use strict';
// GURMAD 24 server entry point. Zero runtime dependencies (Node.js 18+).
const { build } = require('./src/bootstrap');

if (require.main === module) {
  const { app, config } = build();
  app.listen(config.port).then(() => {
    console.log(`GURMAD 24 listening on port ${config.port}  [mode: ${config.demoMode ? 'DEMO_SANDBOX' : 'PILOT'}; payments: sandbox only; live dispatch: OFF]`);
  });
  const stop = () => app.shutdown().then(() => process.exit(0));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
module.exports = { build };
