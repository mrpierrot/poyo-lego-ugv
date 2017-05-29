import xs from 'xstream';

import ngrok from './index';

export function makeNgrokDriver(){

    return function ngrokDriver(actions$){

        actions$.addListener({
            next: outgoing => {

            },
            error: () => { },
            complete: () => { },
        });

        return {
            connect(options) { return xs.fromPromise(ngrok.connect(options));},
            disconnect() { return xs.fromPromise(ngrok.disconnect());},
            kill() { return xs.fromPromise(ngrok.kill());}
        }
    }

}