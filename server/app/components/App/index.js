
import xs from 'xstream';
import { html } from 'snabbdom-jsx';
import { htmlBoilerplate } from '../../utils';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';
import { TACHO_MOTOR, MOTOR_3,MOTOR_2,MOTOR_1, SPEED_SP, CMD_RUN_TO_ABS_POS,CMD_RUN_FOREVER, COMMAND, CMD_STOP, POSITION_SP } from 'cycle-ev3dev/src/constants';
  

const SPEED_MAX = 500;
const DIR_POS_MAX = 80;
const DIR_SPEED_MAX = 150;

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

    const action$ = intent(path, router);
    const model$ = model(action$, props$);
    const view$ = view(model$);

    const connection$ = socketServer.connect();
    const camera$ = ffmpeg.stream();

    const ev3devActions$ = connection$.map(socket => {
        const disconnection$ = socket.events('disconnect');

        return xs.merge(
            socket.events('speed').map((event) => ({
                [TACHO_MOTOR]: {
                    [MOTOR_1]: [
                        { attr: SPEED_SP, value: Math.round(event.data.value * SPEED_MAX) },
                        { attr: COMMAND, value: CMD_RUN_FOREVER }
                    ],
                    [MOTOR_2]: [
                        { attr: SPEED_SP, value: Math.round(event.data.value * SPEED_MAX) },
                        { attr: COMMAND, value: CMD_RUN_FOREVER }
                    ]
                }
            })),
            socket.events('direction').map((event) => ({
                [TACHO_MOTOR]: {
                    [MOTOR_3]: [
                        { attr: SPEED_SP, value: DIR_SPEED_MAX },
                        { attr: POSITION_SP, value: Math.round(event.data.value * DIR_POS_MAX) },
                        { attr: COMMAND, value: CMD_RUN_TO_ABS_POS }
                    ]
                }
            }))
        ).endWhen(disconnection$);
    }).compose(flattenConcurrently);

    const cameraActions$ = connection$.map(socket => {
        const disconnection$ = socket.events('disconnect');
        const cameraStop$ = socket.events('camera:stop').endWhen(disconnection$);
        const cameraStart$ = socket.events('camera:start').endWhen(disconnection$);

        return xs.merge(
            xs.of({ socket, name: 'camera:state', data: 'stopped' }),
            cameraStart$.mapTo({ socket, name: 'camera:state', data: 'streaming' }),
            cameraStop$.mapTo({ socket, name: 'camera:state', data: 'stopped' }),
            cameraStart$.map(() => camera$.endWhen(cameraStop$))
                .flatten()
                .map((data) => ({
                    socket,
                    name: 'camera:data',
                    data
                }))
        );
    }).compose(flattenConcurrently);


    const sinks = {
        router: view$,
        socketServer: cameraActions$,
        ev3dev: ev3devActions$
    }
    return sinks;
}