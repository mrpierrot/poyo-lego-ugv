const xs = require('xstream').default,
    { run } = require('@cycle/run'),
    { makeSocketIOServerDriver } = require('./drivers/socket.io-server'),
    { makeEv3devDriver } = require('./drivers/ev3dev');

exports.makeController = function makeController(io){

    function main(sources) {

        const { socketServer } = sources;
        const connection$ = socketServer.connect();
        
        const ev3devActions$ = connection$.map( socket$ => {
            const disconnection$ = socket$.get('disconnect');
            return xs.merge(
                socket$.get('speed'),
                socket$.get('direction')
            ).endWhen(disconnection$);
        }).flatten()
        
        const sinks = {
            socketServer: xs.merge(),
            ev3dev: ev3devActions$.debug()
        };
        return sinks;
    }

    const drivers = {
        socketServer:makeSocketIOServerDriver(io),
        ev3dev:makeEv3devDriver()
    };

    run(main, drivers);
}

