
import xs from 'xstream';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

export default function Camera(sources) {

    const { socketServer, ffmpeg } = sources;
    const connection$ = socketServer.connect();
    const camera$ = ffmpeg.stream();

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
        socketServer: cameraActions$
    }

    return sinks;
}