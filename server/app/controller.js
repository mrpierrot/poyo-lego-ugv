const xs = require('xstream').default,
    { run } = require('@cycle/run'),
    { makeSocketIOServerDriver } = require('cycle-socket.io-server'),
    { makeEv3devDriver } = require('cycle-ev3dev'),
    { makeFfmpegDriver } = require('./ffmpeg/driver'),
    { createMacOSCamCommand } = require('./ffmpeg/preset');

exports.makeController = function makeController(io){

    function main(sources) {

        const { socketServer, ffmpeg } = sources;
        const connection$ = socketServer.connect();
        
        const ev3devActions$ = connection$.map( socket => {
            const disconnection$ = socket.events('disconnect');
            return xs.merge(
                socket.events('speed'),
                socket.events('direction')
            ).endWhen(disconnection$);
        }).flatten();

        const camActions$ = connection$.map( socket => {
            const disconnection$ = socket.events('disconnect');

            const camStop$ = socket.events('cam:stop');
            const camStart$ = socket.events('cam:start')
                .mapTo(ffmpeg.stream(createMacOSCamCommand()).endWhen(camStop$))
                .flatten()
                .map((data) => ({
                    socket,
                    name:'cam:data',
                    data
                }))
                .endWhen(disconnection$);
            return camStart$
        }).flatten();
        
        const sinks = {
            socketServer: camActions$,
            /*ev3dev: ev3devActions$.debug()*/
        };
        return sinks;
    }

    const drivers = {
        socketServer:makeSocketIOServerDriver(io),
        ev3dev:makeEv3devDriver(),
        ffmpeg:makeFfmpegDriver()
    };

    run(main, drivers);
}

