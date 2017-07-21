
import xs from 'xstream'
import fs from 'fs';
import os from 'os';
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
import Camera from './components/Camera';
import Controls from './components/Controls';
import NotFound from './components/NotFound';

const env = process.env.NODE_ENV || 'developement';
console.log('env : '+env);
console.log('FFMPEG_PATH : '+process.env.FFMPEG_PATH);

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

    const httpPort = port+1;
    const httpsPort = port;

    function main(sources) {

        const { router, dns, ngrok, proc, httpServer, socketServer, ffmpeg } = sources;

        const http = httpServer.select('http');
        const https = httpServer.select('https');
        const io = socketServer.select('io');

        const httpServerReady$ = http.events('ready');
        const httpsServerReady$ = https.events('ready');
        const httpsServerListening$ = https.events('listening');
        const httpServerRequest$ = http.events('request');
        const httpsServerRequest$ = https.events('request');
        const ioServerReady$ = io.events('ready');
        const ioConnection$ = io.events('connection');
        const killApp$ = proc.once('SIGINT'); 

        const httpServerCreate$ = xs.of({ 
            id: 'http',
            action: 'create',
            config: {
                port:httpPort
            }
        });

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
                port:httpsPort,
            }
        }));

        const httpServerClose$ = killApp$.mapTo({
            id:'http',
            action:'close'
        }); 

        const httpsServerClose$ = killApp$.mapTo({
            id:'https',
            action:'close'
        }); 

        const socketServerClose$ = killApp$.mapTo({
            id:'io',
            action:'close'
        });

        const httpsRootPath$ = dns.getCurrentAddress().map((address) => `https://${address}:${httpsPort}`);

        const httpRouter$ = httpRouter({ ...sources, request$: httpServerRequest$ }, {
            '/': sources => Gateway({ ...sources, props$: httpsRootPath$.map(rootPath => ({ appPath: `${rootPath}/app` })) }),
            '*': NotFound
        });

        const httpsRouter$ = httpRouter({ ...sources, request$: httpsServerRequest$ }, {
            '/app': sources => App({ ...sources, ioConnection$:ioConnection$, props$: httpsRootPath$.map(rootPath => ({ socketUrl: rootPath })) }),
            '*': NotFound
        });

        const controls = Controls({ ioConnection$ });
        const camera = Camera({ ioConnection$, ffmpeg });

        const httpResponse$ = httpRouter$.map(c => c.httpResponse).filter(o => !!o).compose(flattenConcurrently);
        const httpsResponse$ = httpsRouter$.map(c => c.httpResponse).filter(o => !!o).compose(flattenConcurrently);
        const socketResponse$ = camera.socketResponse;
        const ev3devOutput$ = controls.ev3devOutput;

        const eddystoneAdvertiseUrl$ = httpServerReady$.map( () => 
            ngrok.connect({ addr: httpPort, ...privateConf.ngrok })
            .map(url => ({
                call: 'advertiseUrl',
                args: [url, [beaconOptions]]
            }))
            .debug((action) => console.log(`ngrok ready at ${action.args[0]}`))
        ).flatten();

        const procKill$ = killApp$.map(() => {
            return ngrok.disconnect().mapTo(ngrok.kill()).flatten();
        }).flatten()
            .mapTo({ call: 'kill', args: [process.pid, 'SIGINT'] })
            .replaceError(err => xs.of({ call: 'kill', args: [process.pid, 'SIGINT'] }))
            .debug(() => console.log('ngrok clean up'));
 
        const sinks = { 
            log: xs.merge( 
                ioConnection$.mapTo('new connection'),
                killApp$.mapTo('stopping server'),
                httpServerCreate$.map(o => `create '${o.id} ready to listen ${o.config.port}`),
                httpsServerCreate$.map(o => `create '${o.id}`),
                httpsServerListening$.map(o => `'${o.id}' ready to listen ${httpsPort}`)
            ),
            httpServer: xs.merge( 
                httpServerCreate$,
                httpsServerCreate$,
                httpsServerListen$,
                httpServerClose$, 
                httpsServerClose$, 
                httpResponse$,
                httpsResponse$
            ),
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
        ffmpeg:makeFfmpegDriver(os.platform()==="darwin"?createMacOSCameraCommand:createRaspicamCommand)
    };

    run(main, drivers);

}