const xs = require('xstream').default,
    { run } = require('@cycle/run'),
    { makeSocketIOServerDriver } = require('cycle-socket.io-server'),
    { makeEv3devDriver } = require('cycle-ev3dev');

exports.makeController = function makeController(io){

    function main(sources) {

        const { socketServer } = sources;
        const connection$ = socketServer.connect();
        
        const ev3devActions$ = connection$.map( socket => {
            const disconnection$ = socket.events('disconnect');
            return xs.merge(
                socket.events('speed'),
                socket.events('direction')
            ).endWhen(disconnection$);
        }).flatten();
        
        const sinks = {
           /* socketServer: ping$,
            ev3dev: ev3devActions$.debug()*/
        };
        return sinks;
    }

    const drivers = {
        socketServer:makeSocketIOServerDriver(io),
        ev3dev:makeEv3devDriver()
    };

    run(main, drivers);
}

