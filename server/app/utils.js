import { html } from 'snabbdom-jsx';
import xs from 'xstream';
import eddystoneBeacon from 'eddystone-beacon';

export function htmlBoilerplate(content, title) {
    return (
        <html>
            <head>
                <title>Poyo</title>
                <meta charset="utf-8" />
                <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width, height=device-height, target-densitydpi=device-dpi" />
                <link rel="stylesheet" href="/app.css" />
            </head>
            <body>
                {content}
            </body>
        </html>
    );
}

export function dnsDriver() {

    return {
        getCurrentAddress() {
            return xs.create({
                start(listener) {
                    require('dns').lookup(require('os').hostname(), function (err, add, fam) {
                        if (err) {
                            listener.error(err);
                        } else {
                            listener.next(add);
                            listener.complete();
                        }
                    });
                },
                stop() {

                }
            })
        }
    }
}


function createEmitterOnProducer(target, name) {

    let eventListener = null;

    return {
        start(listener) {

            eventListener = (o) => listener.next(o);
            target.on(name, eventListener);
        },

        stop() {
            target.removeListener(name, eventListener);
        }
    }
}

function createEmitterOnceProducer(target, name) {

    let eventListener = null;

    return {
        start(listener) {
            eventListener = (o) => { 
                listener.next(o); 
                listener.complete();
             };
            target.once(name, eventListener);
        },
        stop(){}
    }
}


export function fromEvent(type, funcName = 'on') {


}

export function processDriver(actions$) {

    actions$.addListener({
        next: outgoing => {
            process[outgoing.call].apply(process, outgoing.args);
        },
        error: () => { },
        complete: () => { }, 
    });

    return {
        on(name) {
            return xs.create(createEmitterOnProducer(process, name))
        },
        once(name) {
            return xs.create(createEmitterOnceProducer(process, name))
        }
    }
}

export function makeEddystoneBeaconDriver() {

    return function eddystoneBeaconDriver(actions$) {

        actions$.addListener({
            next: outgoing => {
                eddystoneBeacon[outgoing.call].apply(eddystoneBeacon, outgoing.args);
            },
            error: () => { },
            complete: () => { },
        });

        return {

        }
    }
}

export function listen(server, port) {
    return new Promise((resolve, reject) => {
        server.listen(port, resolve);
    });
}

