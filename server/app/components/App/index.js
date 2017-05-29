
import xs from 'xstream';

import Controls from './Controls';
import Camera from './Camera';
import Route from './Route';


function intent(path, router) {
    return router.get(path);
}

function model(action$, props$) {
    return props$.map(
        (props) => action$.map(
            ({ res }) => ({ socketUrl: props.socketUrl, res })
        )
    ).flatten();
}

function view(model$) {
    return model$.map(({ socketUrl, res }) =>
        res.render(htmlBoilerplate(
            <div>
                <div id="app"></div>
                <script src="/vendor.js"></script>
                <script src="/app.js"></script>
                <script>{`require('initialize').default({socketUrl:'${socketUrl}'});`}</script>
            </div>
        ), { beforeContent: "<!DOCTYPE html>" }
        )
    );
}

export default function App(path, { sources, props$ = xs.of({ appPath: null }) }) {

    const { socketServer, ffmpeg, router } = sources;

    const route = Route(path, { router, props$ });
    const controls = Controls({ socketServer });
    const camera = Camera({ socketServer, ffmpeg });

    const sinks = {
        router: route.router,
        socketServer: camera.socketServer,
        ev3dev: controls.ev3dev
    }
    return sinks;
}