const xs = require('xstream').default;
const {adapt} = require('@cycle/run/lib/adapt');


function SocketWrapper(socket, events$) {

    events$.addListener({
        next: outgoing => {
            console.log(outgoing);
        },
        error: () => { },
        complete: () => { },
    });

    return {
        get(eventName) {
            return adapt(xs.create({
                start(listener) {
                    socket.on(eventName, (data) => {
                        listener.next({ name: eventName, data });
                    });
                },

                stop() {

                }
            }))
        }
    }
}

exports.makeSocketIOServerDriver = function makeSocketIOServerDriver(io) {

    return function socketIOServerDriver(events$) {

        function connect() {

            return adapt(xs.create({
                start(listener) {
                    io.on('connection', (socket) => {

                        listener.next(SocketWrapper(socket, events$));
                    });
                },

                stop() {

                }
            }));

        }


        return {
            connect: connect
        }

    }
}