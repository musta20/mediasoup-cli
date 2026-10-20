const path = require('node:path');
const { createRequire } = require('node:module');
const demoRequire = createRequire(path.join(process.env.MEDIASOUP_DEMO_DIR, 'server/package.json'));
const { observer } = require('../..');
// Preloaded before the demo creates its first worker. Use its own mediasoup instance.
const handle = observer(demoRequire('mediasoup'), { host: '127.0.0.1', port: 0 });
handle.ready.then(({ port }) => console.log(`CLI_OBSERVER_READY ${port}`));
