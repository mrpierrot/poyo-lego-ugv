import xs from 'xstream';
import adapt from '@cycle/run/lib/adapt';
import { createEventProducer } from '../../cycle-driver-utils';

export function makeJSMpegDriver() {

    return function jsmpegDriver(events$) {

        events$.addListener({
            next: outgoing => {
                console.log(outgoing);
            },
            error: () => { },
            complete: () => { },
        });

        return {
            create(canvas){
                const player = new JSMpeg.Player(url, {canvas: canvas,disableGl:true});
            }
        }
    }
}