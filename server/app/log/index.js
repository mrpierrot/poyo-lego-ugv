import xs from 'xstream';

import ngrok from './index';

export function makeLogDriver(){

    return function logDriver(messages$){

        messages$.addListener({
            next: message => {
                console.log(message);
            },
            error: (e) => { console.error(e) },
            complete: () => { },
        });

    }

}