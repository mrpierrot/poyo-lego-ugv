
import xs from 'xstream';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

export default function Camera(sources) {

    const { ioConnection$, ffmpeg } = sources;
    const camera$ = ffmpeg.stream();

    const cameraActions$ = ioConnection$.map(({ socket }) => {
        const disconnection$ = socket.events('disconnect');
        const cameraStop$ = socket.events('camera:stop').endWhen(disconnection$);
        const cameraStart$ = socket.events('camera:start').endWhen(disconnection$).debug('camera:start');

        return xs.merge(
            xs.of(socket.send('camera:state', 'stopped')),
            cameraStart$.mapTo(socket.send('camera:state', 'streaming')),
            cameraStop$.mapTo(socket.send('camera:state', 'stopped')),
            cameraStart$.map(() => camera$.endWhen(cameraStop$))
                .flatten()
                .map(data => socket.send('camera:data', data))
        );
    }).compose(flattenConcurrently);


    const sinks = {
        socketResponse: cameraActions$
    }

    return sinks;
}