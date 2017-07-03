
import xs from 'xstream'
import fs from 'fs';
import ngrok from './ngrok';
import eddystoneBeacon from 'eddystone-beacon';
import privateConf from '../private.json';
import serveStatic from 'serve-static';
import Websocket from 'ws';
import { html } from 'snabbdom-jsx';
import { run } from '@cycle/run';
import { makeLogDriver } from './log';
import { makeEv3devDriver } from 'cycle-ev3dev';
import { makeFfmpegDriver } from './ffmpeg/driver';
import { makeNgrokDriver } from './ngrok/driver';
import { makeApp } from 'cyclic-http-server';
import { makeHttpServerDriver, Router } from 'cycle-node-http-server';
import { makeWSServerDriver } from 'cycle-ws';
import { createMacOSCameraCommand, createRaspicamCommand } from './ffmpeg/preset';
import { dnsDriver, listen, processDriver, makeEddystoneBeaconDriver, vdom } from './utils';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

import Gateway from './components/Gateway';
import App from './components/App';
import NotFound from './components/NotFound';

const securedOptions = {
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

        const { router, dns, ngrok, proc, httpServer, socketServer } = sources;

        const http = httpServer.select('http');
        const https = httpServer.select('https');
        const wss = socketServer.select('wss');

        const httpServerReady$ = http.events('ready');
        const httpsServerReady$ = https.events('ready');
        const httpServerRequest$ = http.events('request');
        const httpsServerRequest$ = https.events('request');
        const wsConnection$ = wss.events('connection');
        const serverRequest$ = xs.merge(httpServerRequest$, httpsServerRequest$);

        const httpCreate$ = xs.of({
            id: 'http',
            action: 'create',
            port: HTTP_PORT
        });

        const httpsCreate$ = xs.of({
            id: 'https',
            action: 'create',
            port: port,
            secured: true,
            securedOptions
        });

       const socketServerCreate$ = httpsServerReady$.map(({ instance }) => ({
            id: 'wss',
            action: 'create',
            config: {
                server: instance
            }
        }));

        const httpRootPath$ = dns.getCurrentAddress().map((address) => `https://${address}:${port}`);
        const wsRootPath$ = dns.getCurrentAddress().map((address) => `wss://${address}:${port}`);

        const router$ = Router({ ...sources, request$: serverRequest$ }, {
            '/': sources => Gateway({ ...sources, props$: httpRootPath$.map(rootPath => ({ appPath: `${rootPath}/app` })) }),
            '/app': sources => App({ ...sources, wsConnection$, props$: wsRootPath$.map(rootPath => ({ socketUrl: rootPath })) }),
            '*': NotFound
        });

        const httpResponse$ = router$.map(c => c.httpResponse).filter( o => !!o).compose(flattenConcurrently);
        const socketResponse$ = router$.map(c => c.socketResponse).filter( o => !!o).compose(flattenConcurrently);
        const ev3devOutput$ = router$.map(c => c.ev3devOutput).filter( o => !!o).compose(flattenConcurrently);

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
            log: xs.merge(
                httpCreate$.map(o => `create '${o.id}' at ${o.port}`),
                httpsCreate$.map(o => `create '${o.id}' at ${o.port}`),
                httpServerReady$.map(o => `'${o.instanceId}' ready to listen`),
                httpsServerReady$.map(o => `'${o.instanceId}' ready to listen`)
            ),
            httpServer: xs.merge(httpCreate$, httpsCreate$, httpResponse$),
            socketServer: xs.merge(socketServerCreate$, socketResponse$),
            ev3dev: ev3devOutput$,
            eddystone: eddystoneAdvertiseUrl$,
            proc: procKill$
        }

        return sinks;
    }

    const drivers = {
        log: makeLogDriver(),
        dns: dnsDriver,
        httpServer: makeHttpServerDriver({ middlewares: [serveStatic('./public')], render: vdom() }),
        socketServer: makeWSServerDriver(Websocket.Server),
        proc: processDriver,
        ngrok: makeNgrokDriver(),
        eddystone: makeEddystoneBeaconDriver(),
        ev3dev: makeEv3devDriver(),
        ffmpeg: makeFfmpegDriver(createMacOSCameraCommand)
        //ffmpeg:makeFfmpegDriver(createRaspicamCommand)
    };

    run(main, drivers);

}