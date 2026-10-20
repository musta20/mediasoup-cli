const assert = require('node:assert/strict');
const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { chromium } = require('playwright');
const { Client } = require('../dist/cli/client');

const exec = promisify(execFile);
const root = path.resolve(__dirname, '..');
const demo = process.env.MEDIASOUP_DEMO_DIR && path.resolve(process.env.MEDIASOUP_DEMO_DIR);
const artifacts = path.resolve(process.env.LIVE_TEST_ARTIFACTS || path.join(root, '.live-test-artifacts'));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const processes = [];
const manual = process.argv.includes('--manual');
const report = { mode: manual ? 'manual' : 'automated', checks: [], browserErrors: [] };
let browser;
let client;
let configBefore;
let configSaved = false;

async function until(label, test, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await test();
    if (value) return value;
    await delay(200);
  }
  throw new Error(`Timed out: ${label}`);
}

function start(name, args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const log = fs.createWriteStream(path.join(artifacts, `${name}.log`));
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  const state = { child, text: '', exited: false };
  child.stdout.on('data', (data) => { state.text += data; });
  child.stderr.on('data', (data) => { state.text += data; });
  child.on('error', (error) => { state.error = error; });
  child.on('exit', () => { state.exited = true; });
  child.on('close', () => log.end());
  processes.push(state);
  return state;
}

async function ready(processState, pattern) {
  return until('server startup', () => {
    if (processState.error) throw processState.error;
    if (processState.exited) throw new Error(processState.text);
    return processState.text.match(pattern);
  }, 60000);
}

function passed(name) {
  report.checks.push(name);
  console.log(`PASS ${name}`);
}

async function main() {
  if (!demo) throw new Error('Set MEDIASOUP_DEMO_DIR to an installed versatica/mediasoup-demo checkout. See test/live/README.md.');
  fs.mkdirSync(artifacts, { recursive: true });
  configBefore = fs.readFileSync(path.join(root, 'config.env'));
  configSaved = true;
  const cert = path.join(artifacts, 'localhost-cert.pem');
  const key = path.join(artifacts, 'localhost-key.pem');
  await exec('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert,
    '-days', '2', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1']);
  const env = {
    ...process.env,
    MEDIASOUP_DEMO_DIR: demo,
    CONFIG_FILE: path.join(root, 'test/live/demo-config.mjs'),
    LIVE_TEST_CERT: cert,
    LIVE_TEST_KEY: key,
    DEBUG: 'mediasoup-demo-server:INFO* mediasoup-demo-server:ERROR* mediasoup:ERROR*',
    // The browser demo's signaling URL uses 4443.
    HTTP_LISTEN_PORT: '4443',
    VITE_LISTEN_PORT: '5555',
    DEV: '',
    LOCAL: '',
    TERMINAL: 'false',
  };
  const server = start('server', ['--require', path.join(root, 'test/live/observer.cjs'), 'bin/mediasoup-demo-server'], path.join(demo, 'server'), env);
  const port = Number((await ready(server, /CLI_OBSERVER_READY (\d+)/))[1]);
  await ready(server, /Server started/);
  const app = start('app', ['node_modules/vite/bin/vite.js', '--host', 'localhost'], path.join(demo, 'app'), env);
  await ready(app, /https:\/\/localhost:5555/);

  client = new Client({ host: '127.0.0.1', port });
  await client.waitForConnection(5000);
  report.server = await client.request({ cmd: 'hello' });
  const baseline = await client.request({ cmd: 'summary' });
  assert.equal(baseline.counts.worker, 2);
  assert.equal(baseline.counts.webRtcServer, 2);
  assert.equal(baseline.counts.router, 0);
  const events = [];
  client.on('event', (event) => events.push(event));
  await client.request({ cmd: 'subscribe', topic: 'events' });
  passed('observer detects real workers and WebRTC servers');

  browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }),
    headless: !manual || process.argv.includes('--headless'),
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
      '--ignore-certificate-errors', '--autoplay-policy=no-user-gesture-required'],
  });
  report.browser = browser.version();
  const pages = [];
  const roomId = `cli-live-${Date.now()}`;
  for (const displayName of ['Alice', 'Bob']) {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, permissions: ['camera', 'microphone'] });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.browserErrors.push(error.message));
    await page.goto(`https://localhost:5555/?${new URLSearchParams({ roomId, displayName, webcam: 'true', mic: 'true', forceVP8: 'true' })}`);
    await page.waitForFunction(() => window.STORE?.getState().room.state === 'connected', null, { timeout: 60000 });
    await page.waitForFunction(() => window.CLIENT?._micProducer && window.CLIENT?._webcamProducer, null, { timeout: 30000 });
    pages.push(page);
  }
  const [alice, bob] = pages;
  const aliceId = await alice.evaluate(() => window.STORE.getState().me.id);
  const bobId = await bob.evaluate(() => window.STORE.getState().me.id);
  const producers = await until('four live RTP producers', async () => {
    const list = await client.request({ cmd: 'list', kind: 'producer' });
    return list.length === 4 && list.every((p) => p.consumers === 1) && list;
  });
  assert.equal(producers.filter((p) => p.mediaKind === 'audio' && p.codec === 'opus').length, 2);
  assert.equal(producers.filter((p) => p.mediaKind === 'video' && p.codec === 'VP8').length, 2);
  passed('two fake-camera users produce Opus audio and VP8 simulcast video');

  if (manual) {
    console.log(`\nAlice and Bob are connected with synthetic camera and microphone streams.`);
    console.log(`Demo: https://localhost:5555/?roomId=${roomId}`);
    console.log(`CLI:  node dist/index.js --host 127.0.0.1 --port ${port}`);
    console.log(`Run the CLI in a second terminal from ${root}.`);
    console.log('Mute, disable video, send chat or leave using the browser controls.');
    console.log('Press Enter here to stop the demo and close its browser windows.');
    await new Promise((resolve) => {
      const stop = () => {
        process.stdin.off('data', stop);
        process.stdin.off('end', stop);
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
        browser.off('disconnected', stop);
        process.stdin.pause();
        resolve();
      };
      process.stdin.once('data', stop);
      process.stdin.once('end', stop);
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
      browser.once('disconnected', stop);
      process.stdin.resume();
    });
    return;
  }

  for (const page of pages) {
    await page.waitForFunction(async () => {
      const pc = window.CLIENT?._recvTransport?._handler?._pc;
      if (!pc) return false;
      const stats = [...(await pc.getStats()).values()];
      return stats.some((s) => s.type === 'inbound-rtp' && s.kind === 'video' && s.framesDecoded > 0)
        && stats.some((s) => s.type === 'inbound-rtp' && s.kind === 'audio' && s.bytesReceived > 0);
    }, null, { timeout: 30000 });
  }
  for (const page of pages) {
    await page.waitForFunction(() => {
      const video = document.querySelector('[data-component="Peer"] video');
      return video && !video.classList.contains('hidden') && video.videoWidth > 0 && !video.paused;
    });
  }
  passed('both browsers receive audio, decode remote video frames and display remote camera');
  await alice.screenshot({ path: path.join(artifacts, 'alice.png'), fullPage: true });
  await bob.screenshot({ path: path.join(artifacts, 'bob.png'), fullPage: true });
  const transports = await client.request({ cmd: 'list', kind: 'transport' });
  const webRtc = transports.filter((t) => t.type === 'webrtc');
  assert.equal(webRtc.length, 4);
  assert.ok(webRtc.every((t) => ['connected', 'completed'].includes(t.iceState) && t.dtlsState === 'connected'));
  assert.ok(webRtc.every((t) => t.webRtcServerId));
  passed('CLI reports connected ICE/DTLS transports and WebRTC server links');

  const cli = async (args, json = true) => {
    const { stdout } = await exec(process.execPath, [path.join(root, 'dist/index.js'), '--host', '127.0.0.1', '--port', String(port), '--no-color', ...args, ...(json ? ['--json'] : [])], { timeout: 15000 });
    return json ? JSON.parse(stdout) : stdout;
  };
  const baseArgs = [path.join(root, 'dist/index.js'), '--host', '127.0.0.1', '--port', String(port), '--no-color'];
  const workerList = await cli(['show', 'workers']);
  let logging = await cli(['logLevel', 'debug']);
  assert.equal(logging.workers.length, 2);
  assert.ok(logging.workers.every((worker) => worker.ok));
  logging = await cli(['logTags', 'ice', 'dtls', `--workerId=${workerList[0].id}`]);
  assert.deepEqual(logging.workers, [{ workerId: workerList[0].id, ok: true }]);
  assert.deepEqual(logging.settings, { logTags: ['ice', 'dtls'] });
  assert.ok((await cli(['logTags', '--clear'])).workers.every((worker) => worker.ok));
  assert.ok((await cli(['logLevel', 'error'])).workers.every((worker) => worker.ok));
  passed('logging commands update real workers, target one pid, clear tags and restore error level');

  for (const mode of ['shell', 'exit', 'ctrl-c', 'ctrl-d']) {
    const { stdout } = await exec('python3', [
      path.join(root, 'test/live/tty-repl.py'), mode, process.execPath,
      ...baseArgs, ...(mode === 'shell' ? [] : ['repl']),
    ], { timeout: 45000 });
    fs.writeFileSync(path.join(artifacts, `tty-repl-${mode}.json`), stdout);
    assert.equal(JSON.parse(stdout).exitCode, 0);
  }
  passed('native REPL in a real PTY: live worker dumps, await, multiline, errors, exit keys and shell return');

  let replText = '';
  let replPrompts = 0;
  const onRepl = (event) => {
    if (event.type === 'output') replText += event.text;
    if (event.type === 'prompt') replPrompts++;
  };
  const evalLine = async (line) => {
    const before = replPrompts;
    replText = '';
    await client.request({ cmd: 'replInput', line });
    await until('REPL evaluation', () => replPrompts > before);
    return replText;
  };
  client.on('repl', onRepl);
  await client.request({ cmd: 'replStart' });
  try {
    await until('REPL prompt', () => replPrompts > 0);
    const target = producers.find((producer) => producer.mediaKind === 'video');
    await evalLine(`await get(${JSON.stringify(target.id)}).pause()`);
    assert.equal((await cli(['inspect', target.id])).summary.paused, true);
    await evalLine(`await get(${JSON.stringify(target.id)}).resume()`);
    assert.equal((await cli(['inspect', target.id])).summary.paused, false);
    assert.match(await evalLine(`(await get(${JSON.stringify(target.id)}).getStats())[0].type`), /inbound-rtp/);
  } finally {
    await client.request({ cmd: 'replStop' });
    client.off('repl', onRepl);
  }
  passed('REPL pauses and resumes a real video producer and reads its RTP stats');

  const ndjson = (state) => state.text.slice(0, state.text.lastIndexOf('\n')).split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const watch = start('watch', [...baseArgs, 'watch', 'tree', '--table', '--json', '--interval=200ms'], root, env);
  const following = start('events', [...baseArgs, 'watch', 'events', '--json'], root, env);
  await until('watch JSON frames', () => ndjson(watch).length >= 2);
  assert.ok(ndjson(watch).every((frame) => Array.isArray(frame) && frame.length === 2 && frame.every((node) => node.summary.kind === 'worker')));
  await until('event follower backlog', () => ndjson(following).length > 0);
  passed('watch tree --table streams valid NDJSON tree snapshots against the real server');
  for (const key of ['q', 'ctrl-c']) {
    const { stdout } = await exec('python3', [path.join(root, 'test/live/tty-watch.py'), key, process.execPath, ...baseArgs, 'watch', 'tree', '--table', '--interval=200ms'], { timeout: 20000 });
    fs.writeFileSync(path.join(artifacts, `tty-${key}.json`), stdout);
    assert.equal(JSON.parse(stdout).exitCode, 0);
  }
  passed('fullscreen tree table stops with q and Ctrl+C and restores screen and cursor');

  const summary = await cli(['summary']);
  report.connected = summary;
  assert.equal(summary.counts.producer, 4);
  assert.equal(summary.counts.consumer, 4);
  assert.ok(summary.counts.dataProducer >= 4);
  assert.ok(summary.counts.dataConsumer >= 2);
  const tree = await cli(['tree']);
  assert.equal(tree.length, 2);
  const [router] = await cli(['show', 'routers']);
  const subtree = await cli(['tree', router.id]);
  assert.deepEqual(await cli(['tree', router.id, '--table']), subtree);
  const tableText = await cli(['tree', '--table', '--routerId=' + router.id], false);
  assert.ok(tableText.includes('│ Object'));
  assert.ok(tableText.includes('Type / Codec'));
  assert.ok(tableText.includes('connected'));
  const fullTable = await cli(['tree', router.id, '--table', '--full'], false);
  assert.ok(fullTable.includes(producers[0].id));
  fs.writeFileSync(path.join(artifacts, 'tree-table.txt'), tableText);
  passed('tree table renders real hierarchy, states, scores, filters and full ids without changing JSON');
  const inspect = await cli(['inspect', producers[0].id.slice(0, 8)]);
  assert.equal(inspect.summary.id, producers[0].id);
  assert.equal(inspect.children.consumer.length, 1);
  const found = await cli(['find', `peerId=${aliceId}`]);
  assert.ok(found.length >= 2);
  const filtered = await cli(['show', 'consumers', `--producerId=${producers[0].id}`]);
  assert.equal(filtered.length, 1);
  const dump = await cli(['dump', producers[0].id]);
  assert.equal(dump.id, producers[0].id);
  fs.writeFileSync(path.join(artifacts, 'tree.txt'), await cli(['tree'], false));
  fs.writeFileSync(path.join(artifacts, 'producers.txt'), await cli(['show', 'producers'], false));
  passed('real CLI commands: summary, tree, inspect, find, filters, dump and tables');

  for (const producer of producers) {
    const stats = await until('nonzero RTP producer stats', async () => {
      const data = await cli(['stats', producer.id]);
      return data.stats.some((s) => s.packetCount > 0 && s.byteCount > 0 && s.bitrate > 0) && data;
    });
    report.rtpStats ??= [];
    report.rtpStats.push(stats);
  }
  passed('CLI stats show real RTP packets, bytes and bitrate for all four producers');

  await bob.waitForFunction(() => [...window.CLIENT._dataConsumers.values()].some((c) => c.label === 'chat'));
  await bob.evaluate(() => {
    window.__liveMessages = [];
    for (const consumer of window.CLIENT._dataConsumers.values()) {
      if (consumer.label === 'chat') consumer.on('message', (message) => window.__liveMessages.push(message));
    }
  });
  await alice.evaluate(() => window.CLIENT.sendChatMessage('cli-live-chat'));
  await bob.waitForFunction(() => window.__liveMessages.includes('cli-live-chat'));
  passed('real SCTP data channel delivers chat between browser users');

  const mic = producers.find((p) => p.appData.peerId === aliceId && p.mediaKind === 'audio');
  await alice.evaluate(() => window.CLIENT.muteMic());
  await until('paused producer', async () => (await cli(['inspect', mic.id])).summary.paused);
  await until('pause event', () => events.some((e) => e.id === mic.id && e.event === 'pause'));
  await alice.evaluate(() => window.CLIENT.unmuteMic());
  await until('resumed producer', async () => !(await cli(['inspect', mic.id])).summary.paused);
  await until('resume event', () => events.some((e) => e.id === mic.id && e.event === 'resume'));
  await until('CLI event follower pause/resume', () => ['pause', 'resume'].every((name) => ndjson(following).some((e) => e.id === mic.id && e.event === name)));
  for (const state of [watch, following]) {
    const exited = new Promise((resolve) => state.child.once('close', resolve));
    state.child.kill('SIGINT');
    assert.equal(await exited, 0);
  }
  passed('browser mute/unmute appears in CLI state, live events and CLI event follower');

  await bob.evaluate(() => window.CLIENT.close());
  await until('departed peer removed', async () => {
    const list = await cli(['show', 'producers']);
    return list.length === 2 && list.every((p) => p.appData.peerId !== bobId && p.consumers === 0);
  });
  assert.equal((await cli(['show', 'consumers'])).length, 0);
  passed('leaving peer removes its producers and all associated consumers');
  await alice.evaluate(() => window.CLIENT.close());
  await until('room fully cleaned up', async () => {
    const result = await cli(['summary']);
    return ['router', 'transport', 'producer', 'consumer', 'dataProducer', 'dataConsumer'].every((k) => result.counts[k] === 0);
  });
  report.after = await cli(['summary']);
  report.events = events;
  assert.ok(events.some((e) => e.event === 'closed' && e.kind === 'producer'));
  assert.deepEqual(report.browserErrors, []);
  passed('empty room cleans up every media object while workers remain healthy');
}

(async () => {
  try {
    await main();
  } catch (error) {
    report.error = error.stack;
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    client?.close();
    for (const { child } of processes.reverse()) {
      if (child.exitCode !== null || child.signalCode !== null) continue;
      const closed = new Promise((resolve) => child.once('close', resolve));
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      await closed;
      clearTimeout(timer);
    }
    if (configSaved) fs.writeFileSync(path.join(root, 'config.env'), configBefore);
    if (fs.existsSync(artifacts)) fs.writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`Artifacts: ${artifacts}`);
  }
})();
