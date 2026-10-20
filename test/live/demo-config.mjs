import path from 'node:path';
import { pathToFileURL } from 'node:url';

const demo = process.env.MEDIASOUP_DEMO_DIR;
const { config } = await import(pathToFileURL(path.join(demo, 'server/config.example.mjs')));
config.http.listenIp = '127.0.0.1';
config.http.tls = {
  cert: process.env.LIVE_TEST_CERT,
  key: process.env.LIVE_TEST_KEY,
};
config.mediasoup.numWorkers = 2;
for (const info of config.mediasoup.webRtcServerOptions.listenInfos) {
  info.ip = '127.0.0.1';
  info.announcedAddress = '127.0.0.1';
}
config.mediasoup.plainTransportOptions.listenInfo.ip = '127.0.0.1';
config.mediasoup.plainTransportOptions.listenInfo.announcedAddress = '127.0.0.1';
export { config };
