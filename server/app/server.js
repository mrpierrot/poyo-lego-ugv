
import xs from 'xstream'
import fs from 'fs';
import ngrok from './ngrok';
import eddystoneBeacon from 'eddystone-beacon';
import privateConf from '../private.json';
import serveStatic from 'serve-static';
import io from 'socket.io';
import { html } from 'snabbdom-jsx';
import { run } from '@cycle/run';
import { makeLogDriver } from './log';
import { makeEv3devDriver } from 'cycle-ev3dev';
import { makeFfmpegDriver } from './ffmpeg/driver';
import { makeNgrokDriver } from './ngrok/driver';
import { makeApp } from 'cyclic-http-server';
import { makeHttpServerDriver, Router } from 'cycle-node-http-server';
import { makeNetDriver, ioServer, httpServer, httpRouter } from 'cycle-net';
import { createMacOSCameraCommand, createRaspicamCommand } from './ffmpeg/preset';
import { dnsDriver, listen, processDriver, makeEddystoneBeaconDriver, vdom } from './utils';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

import Gateway from './components/Gateway';
import App from './components/App';
import NotFound from './components/NotFound';

const securedConfig = {
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

        const https = httpServer.select('https');
        const io = socketServer.select('io');

        const httpsServerReady$ = https.events('ready');
        const httpsServerListening$ = https.events('listening');
        const httpsServerRequest$ = https.events('request');
        const ioServerReady$ = io.events('ready');
        const ioConnection$ = io.events('connection');
        const serverRequest$ =  httpsServerRequest$;
        const killApp$ = proc.once('SIGUSR2'); 

        const httpsServerCreate$ = xs.of({ 
            id: 'https',
            action: 'create',
            secured: true,
            securedConfig
        });

        const socketServerCreate$ = httpsServerReady$.map(({ server }) => ({
            id: 'io',
            action: 'create',
            config: {
                server: server 
            }
        })); 

        const httpsServerListen$ = xs.combine(httpsServerReady$,ioServerReady$).map( ([{id,server}]) => ({ 
            id,
            server,
            action: 'listen',
            config: {
                port,
            }
        }));

        const httpsServerClose$ = killApp$.mapTo({
            id:'https',
            action:'close'
        }); 

        const socketServerClose$ = killApp$.mapTo({
            id:'io',
            action:'close'
        });

        const httpRootPath$ = dns.getCurrentAddress().map((address) => `https://${address}:${port}`);
        const wsRootPath$ = dns.getCurrentAddress().map((address) => `https://${address}:${port}`);

        const router$ = httpRouter({ ...sources, request$: serverRequest$ }, {
            '/': sources => Gateway({ ...sources, props$: httpRootPath$.map(rootPath => ({ appPath: `${rootPath}/app` })) }),
            '/app': sources => App({ ...sources, ioConnection$:ioConnection$, props$: wsRootPath$.map(rootPath => ({ socketUrl: rootPath })) }),
            '*': NotFound
        });

        const httpResponse$ = router$.map(c => c.httpResponse).filter(o => !!o).compose(flattenConcurrently);
        const socketResponse$ = router$.map(c => c.socketResponse).filter(o => !!o).compose(flattenConcurrently);
        const ev3devOutput$ = router$.map(c => c.ev3devOutput).filter(o => !!o).compose(flattenConcurrently);

        const eddystoneAdvertiseUrl$ = ngrok.connect({ addr: port, ...privateConf.ngrok }).map(url => ({
            call: 'advertiseUrl',
            args: [url, [beaconOptions]]
        })).debug((action) => console.log(`ngrok ready at ${action.args[0]}`));

        const procKill$ = killApp$.map(() => {
            return ngrok.disconnect().mapTo(ngrok.kill()).flatten();
        }).flatten()
            .mapTo({ call: 'kill', args: [process.pid, 'SIGUSR2'] })
            .replaceError(err => xs.of({ call: 'kill', args: [process.pid, 'SIGUSR2'] }))
            .debug(() => console.log('ngrok clean up'));

        const sinks = { 
            log: xs.merge( 
                ioConnection$.mapTo('new connection'),
                killApp$.mapTo('stoping server'),
                httpsServerCreate$.map(o => `create '${o.id}`),
                httpsServerListening$.map(o => `'${o.id}' ready to listen ${port}`)
            ),
            httpServer: xs.merge( httpsServerCreate$,httpsServerListen$,httpsServerClose$, httpResponse$),
            socketServer: xs.merge(socketServerCreate$,socketServerClose$, socketResponse$),
            ev3dev: ev3devOutput$,
            eddystone: eddystoneAdvertiseUrl$, 
            proc: procKill$
        }

        return sinks;
    }

    const drivers = {
        log: makeLogDriver(), 
        dns: dnsDriver,
        httpServer: makeNetDriver(httpServer({ middlewares: [serveStatic('./public')], render: vdom() })),
        socketServer: makeNetDriver(ioServer(io)),
        proc: processDriver,
        ngrok: makeNgrokDriver(),
        eddystone: makeEddystoneBeaconDriver(),
        ev3dev: makeEv3devDriver(),
        ffmpeg: makeFfmpegDriver(createMacOSCameraCommand)
        //ffmpeg:makeFfmpegDriver(createRaspicamCommand)
    };

    run(main, drivers);

}