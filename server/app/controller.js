const xs = require('xstream').default,
    flattenConcurrently = require('xstream/extra/flattenConcurrently').default,
    { run } = require('@cycle/run'),
    { makeSocketIOServerDriver } = require('cycle-socket.io-server'),
    { makeEv3devDriver } = require('cycle-ev3dev'),
    { makeFfmpegDriver } = require('./ffmpeg/driver'),
    { createMacOSCameraCommand,createRaspicamCommand } = require('./ffmpeg/preset');


exports.makeController = function makeController(io){

    function main(sources) {

        const { socketServer, ffmpeg } = sources;
        const connection$ = socketServer.connect();
        const camera$ = ffmpeg.stream();
        
        const ev3devActions$ = connection$.map( socket => {
            const disconnection$ = socket.events('disconnect');
            return xs.merge(
                socket.events('speed'),
                socket.events('direction')
            ).endWhen(disconnection$);
        }).compose(flattenConcurrently);

        const cameraActions$ = connection$.map( socket => {
            const disconnection$ = socket.events('disconnect');
            const cameraStop$ = socket.events('camera:stop').endWhen(disconnection$);
            const cameraStart$ = socket.events('camera:start').endWhen(disconnection$);

            return xs.merge(
                xs.of({socket,name:'camera:state',data:'stopped'}),
                cameraStart$.mapTo({socket,name:'camera:state',data:'streaming'}),
                cameraStop$.mapTo({socket,name:'camera:state',data:'stopped'}),
                cameraStart$.map(() => camera$.endWhen(cameraStop$))
                    .flatten()
                    .map((data) => ({
                        socket,
                        name:'camera:data',
                        data
                    }))
                );
        }).compose(flattenConcurrently);

        const sinks = {
            socketServer: cameraActions$,
            /*ev3dev: ev3devActions$.debug()*/
        };
        return sinks;
    }

    const drivers = {
        socketServer:makeSocketIOServerDriver(io),
        ev3dev:makeEv3devDriver(),
        ffmpeg:makeFfmpegDriver(createMacOSCameraCommand)
        //ffmpeg:makeFfmpegDriver(createRaspicamCommand)
    };

    run(main, drivers);
}

