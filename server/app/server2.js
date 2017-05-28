
import fs from 'fs';
const { makeController } = require('./controller');

import ngrok from './ngrok-promise';
import eddystoneBeacon from 'eddystone-beacon';
import privateConf from '../private.json';
import serveStatic from 'serve-static';
import { html } from 'snabbdom-jsx';
import { makeApp } from 'cyclic-http-server';
//import { makeApp } from './http/driver';

import xs from 'xstream'
import flattenConcurrently from 'xstream/extra/flattenConcurrently';
import { run } from '@cycle/run';
import { makeSocketIOServerDriver } from 'cycle-socket.io-server';
import { makeEv3devDriver } from 'cycle-ev3dev';
import { makeFfmpegDriver } from'./ffmpeg/driver';
import { createMacOSCameraCommand, createRaspicamCommand } from './ffmpeg/preset';
import { dnsDriver } from './utils';

import Gateway from './components/Gateway';

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

        const {router,dns} = sources;

        const gateway = Gateway('/',{
            router,
            props$:dns.getCurrentAddress().map((address) => ({appPath:`https://${address}:${port}/app`})
        )});

        const notFound$ = router.notFound().map( ({req,res}) => {
            return res.text(`404 url '${req.url}' not found`,{statusCode:404});
        });

        const sinks = {
            router:xs.merge(gateway.router,notFound$)
        }

        return sinks;
    }

    const app = makeApp({
        middlewares:[serveStatic('./public')]
    })

    const https = require('https').createServer(httpsOptions, app.router);
    const http = require('http').createServer(app.router);
    const io = require('socket.io')(https);

    https.listen(port, callback);
    http.listen(HTTP_PORT, () => {
        console.log("http started on " + HTTP_PORT);
    });

    const drivers = {
        router: app.driver,
        dns:dnsDriver,
        //socketServer: makeSocketIOServerDriver(io),
        //ev3dev: makeEv3devDriver(),
        //ffmpeg: makeFfmpegDriver(createMacOSCameraCommand)
        //ffmpeg:makeFfmpegDriver(createRaspicamCommand)
    };

    run(main, drivers);

}