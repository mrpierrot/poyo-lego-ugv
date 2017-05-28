const express = require('express');
const fs = require('fs');
const { makeController } = require('./controller');
const cons = require('consolidate');
const ngrok = require('./ngrok-promise');
const eddystoneBeacon = require('eddystone-beacon');
const privateConf = require('../private.json');
const serveStatic = require('serve-static');
import { html } from 'snabbdom-jsx';
import { makeApp } from 'cyclic-http-server';
//import { makeApp } from './http/driver';

const xs = require('xstream').default,
    flattenConcurrently = require('xstream/extra/flattenConcurrently').default,
    { run } = require('@cycle/run'),
    { makeSocketIOServerDriver } = require('cycle-socket.io-server'),
    { makeEv3devDriver } = require('cycle-ev3dev'),
    { makeFfmpegDriver } = require('./ffmpeg/driver'),
    { createMacOSCameraCommand, createRaspicamCommand } = require('./ffmpeg/preset');


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

        const {httpServer} = sources;

        const gateway = Gateway('/',{httpServer,props$:xs.of({localIpUrl:'test'})});


        const notFound$ = httpServer.notFound().map( ({req,res}) => {
            return res.text(`404 url '${req.url}' not found`,{statusCode:404});
        });

        const sinks = {
            httpServer:xs.merge(gateway.httpServer,notFound$)
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
        httpServer: app.driver,
        //socketServer: makeSocketIOServerDriver(io),
        //ev3dev: makeEv3devDriver(),
        //ffmpeg: makeFfmpegDriver(createMacOSCameraCommand)
        //ffmpeg:makeFfmpegDriver(createRaspicamCommand)
    };

    run(main, drivers);

}