
import fs from 'fs';
const { makeController } = require('./controller');

import ngrok from './ngrok';
import eddystoneBeacon from 'eddystone-beacon';
import privateConf from '../private.json';
import serveStatic from 'serve-static';
import { html } from 'snabbdom-jsx';
import { makeApp } from 'cyclic-http-server';
import xs from 'xstream'
import { run } from '@cycle/run';
import { makeSocketIOServerDriver } from 'cycle-socket.io-server';
import { makeEv3devDriver } from 'cycle-ev3dev';
import { makeFfmpegDriver } from './ffmpeg/driver';
import { makeNgrokDriver } from './ngrok/driver';
import { createMacOSCameraCommand, createRaspicamCommand } from './ffmpeg/preset';
import { dnsDriver, listen, processDriver, makeEddystoneBeaconDriver } from './utils';

import Gateway from './components/Gateway';
import App from './components/App';

const httpsOptions = {
    key: fs.readFileSync(__dirname + '/..' + privateConf.ssl.key),
    cert: fs.readFileSync(__dirname + '/..' + privateConf.ssl.cert)
};

const beaconOptions = {
    name: 'Poyo',    // set device name when advertising (Linux only)
    txPowerLevel: -22, // override TX Power Level, default value is -21,
    tlmCount: 2,       // 2 TLM frames
    tlmPeriod: 10      // every 10 advertisements
};

const HTTP_PORT = 8080;

exports.startServer = (port, path, callback) => {

    function main(sources) {

        const { router, dns, ngrok, proc } = sources;

        const rootPath$ = dns.getCurrentAddress().map((address) => `https://${address}:${port}`);

        const gateway = Gateway('/', {
            sources,
            props$: rootPath$.map(rootPath => ({ appPath: `${rootPath}/app` }))
        });

        const app = App('/app', {
            sources,
            props$: rootPath$.map(rootPath => ({ socketUrl: rootPath }))
        });

        const notFound$ = router.notFound().map(({ req, res }) => {
            return res.text(`404 url '${req.url}' not found`, { statusCode: 404 });
        });

        const eddystoneAdvertiseUrl$ = ngrok.connect({ addr: HTTP_PORT, ...privateConf.ngrok }).map(url => ({
            call: 'advertiseUrl',
            args: [url, [beaconOptions]]
        })).debug((action) => console.log(`ngrok ready at ${action.args[0]}`));

        const procKill$ = proc.once('SIGUSR2').map(() => {
            return ngrok.disconnect().mapTo(ngrok.kill()).flatten();
        }).flatten()
            .mapTo({ call: 'kill', args: [process.pid, 'SIGUSR2'] })
            .replaceError(err => xs.of({ call: 'kill', args: [process.pid, 'SIGUSR2'] }))
            .debug(() => console.log('ngrok clean up'));

        const sinks = {
            router: xs.merge(gateway.router, app.router, notFound$),
            socketServer: app.socketServer,
            ev3dev: app.ev3dev,
            eddystone: eddystoneAdvertiseUrl$,
            proc: procKill$
        }

        return sinks;
    }

    const app = makeApp({
        middlewares: [serveStatic('./public')]
    })

    const https = require('https').createServer(httpsOptions, app.router);
    const http = require('http').createServer(app.router);
    const io = require('socket.io')(https);

    listen(http, HTTP_PORT)
        .then(listen(https, port))
        .then(() => {
            callback({ httpPort: HTTP_PORT, httpsPort: port });
        });

    const drivers = {
        router: app.driver,
        dns: dnsDriver,
        socketServer: makeSocketIOServerDriver(io),
        proc: processDriver,
        ngrok: makeNgrokDriver(),
        eddystone: makeEddystoneBeaconDriver(),
        ev3dev: makeEv3devDriver(),
        ffmpeg: makeFfmpegDriver(createMacOSCameraCommand)
        //ffmpeg:makeFfmpegDriver(createRaspicamCommand)
    };

    run(main, drivers);

}