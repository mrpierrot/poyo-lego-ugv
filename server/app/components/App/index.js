
import xs from 'xstream';

import Controls from './Controls';
import Camera from './Camera';
import Route from './Route';

export default function App(sources) {

    const { wsConnection$, ffmpeg, request$, props$ = xs.of({ appPath: null }) } = sources;

    const route = Route({request$, props$});
    const controls = Controls({ wsConnection$ });
    const camera = Camera({ wsConnection$, ffmpeg });

    const sinks = {
        httpResponse: route.httpResponse,
        socketResponse: camera.socketResponse,
        ev3devOutput: controls.ev3devOutput
    }
    return sinks;
}