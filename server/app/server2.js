const express = require('express');
const fs = require('fs');
const { makeController } = require('./controller');
const cons = require('consolidate');
const ngrok = require('./ngrok-promise');
const eddystoneBeacon = require('eddystone-beacon');
const privateConf = require('../private.json');

const xs = require('xstream').default,
    flattenConcurrently = require('xstream/extra/flattenConcurrently').default,
    { run } = require('@cycle/run'),
    { makeSocketIOServerDriver } = require('cycle-socket.io-server'),
    { makeEv3devDriver } = require('cycle-ev3dev'),
    { makeFfmpegDriver } = require('./ffmpeg/driver'),
    { createMacOSCameraCommand, createRaspicamCommand } = require('./ffmpeg/preset');


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

import makeHttpServerDriver from './http/driver';


exports.startServer = (port, path, callback) => {

    function main(sources) {

        const {httpServer} = sources;
        const test$ = httpServer.match('/lol').map( ({req,res}) => {
            return {
                res,
                content: 'plop'
            };
        })

        httpServer.listen({port:port}).addListener({
            next(){
                console.log('server started')
            },
            complete(){

            },
            error(){

            }
        })


        const sinks = {
            httpServer:test$
        }

        return sinks;
    }

    const drivers = {
        httpServer: makeHttpServerDriver(),
        //socketServer: makeSocketIOServerDriver(io),
        //ev3dev: makeEv3devDriver(),
        //ffmpeg: makeFfmpegDriver(createMacOSCameraCommand)
        //ffmpeg:makeFfmpegDriver(createRaspicamCommand)
    };

    run(main, drivers);

}