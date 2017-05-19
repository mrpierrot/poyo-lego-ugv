const xs = require('xstream').default,
    flattenConcurrently = require('xstream/extra/flattenConcurrently').default,
    { run } = require('@cycle/run'),
    { TACHO_MOTOR, MOTOR_3,MOTOR_2,MOTOR_1, SPEED_SP, CMD_RUN_TO_ABS_POS,CMD_RUN_FOREVER, COMMAND, CMD_STOP, POSITION_SP } = require('cycle-ev3dev/src/constants'),
    { makeSocketIOServerDriver } = require('cycle-socket.io-server'),
    { makeEv3devDriver } = require('cycle-ev3dev'),
    { makeFfmpegDriver } = require('./ffmpeg/driver'),
    { createMacOSCameraCommand,createRaspicamCommand } = require('./ffmpeg/preset');

const SPEED_MAX = 500;
const DIR_POS_MAX = 80;
const DIR_SPEED_MAX = 300;

exports.makeController = function makeController(io){

    function main(sources) {

        const { socketServer, ffmpeg } = sources;
        const connection$ = socketServer.connect();
        const camera$ = ffmpeg.stream();
        
        const ev3devActions$ = connection$.map( socket => {
            const disconnection$ = socket.events('disconnect');

            return xs.merge(
                socket.events('speed').map((event) => ({
                    [TACHO_MOTOR]: {
                        [MOTOR_1]: [
                            { attr: SPEED_SP, value: Math.round(event.data.value*SPEED_MAX) },
                            { attr: COMMAND, value: CMD_RUN_FOREVER }
                        ],
                        [MOTOR_2]: [
                            { attr: SPEED_SP, value: Math.round(event.data.value*SPEED_MAX) },
                            { attr: COMMAND, value: CMD_RUN_FOREVER }
                        ]
                    }
                })),
                socket.events('direction').map((event) => ({
                    [TACHO_MOTOR]: {
                        [MOTOR_3]: [
                            { attr: SPEED_SP, value: DIR_SPEED_MAX },
                            { attr: POSITION_SP, value: Math.round(event.data.value*DIR_POS_MAX) },
                            { attr: COMMAND, value: CMD_RUN_TO_ABS_POS }
                        ]
                    }
                }))
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
            ev3dev: ev3devActions$
        };
        return sinks;
    }

    const drivers = {
        socketServer:makeSocketIOServerDriver(io),
        ev3dev:makeEv3devDriver(),
        //ffmpeg:makeFfmpegDriver(createMacOSCameraCommand)
        ffmpeg:makeFfmpegDriver(createRaspicamCommand)
    };

    run(main, drivers);
}

