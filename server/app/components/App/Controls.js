
import xs from 'xstream';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';
import { TACHO_MOTOR, MOTOR_3, MOTOR_2, MOTOR_1, SPEED_SP, CMD_RUN_TO_ABS_POS, CMD_RUN_FOREVER, COMMAND, CMD_STOP, POSITION_SP } from 'cycle-ev3dev/src/constants';

const SPEED_MAX = 500;
const DIR_POS_MAX = 80;
const DIR_SPEED_MAX = 150;

function speed(value) {
    return ({
        [TACHO_MOTOR]: {
            [MOTOR_1]: [
                { attr: SPEED_SP, value: Math.round(value * SPEED_MAX) },
                { attr: COMMAND, value: CMD_RUN_FOREVER }
            ],
            [MOTOR_2]: [
                { attr: SPEED_SP, value: Math.round(value * SPEED_MAX) },
                { attr: COMMAND, value: CMD_RUN_FOREVER }
            ]
        }
    });
}

function direction(value) {
    return ({
        [TACHO_MOTOR]: {
            [MOTOR_3]: [
                { attr: SPEED_SP, value: DIR_SPEED_MAX },
                { attr: POSITION_SP, value: Math.round(value * DIR_POS_MAX) },
                { attr: COMMAND, value: CMD_RUN_TO_ABS_POS }
            ]
        }
    })
}

export default function Controls(sources) {

    const { socketServer } = sources;
    const connection$ = socketServer.connect();

    const ev3devActions$ = connection$.map(socket => {
        const disconnection$ = socket.events('disconnect');
        return xs.merge(
            socket.events('speed').map((event) => speed(event.data.value)),
            socket.events('direction').map((event) => direction(event.data.value))
        ).endWhen(disconnection$);
    }).compose(flattenConcurrently);

    const sinks = {
        ev3dev: ev3devActions$
    }

    return sinks;
}