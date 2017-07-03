
import xs from 'xstream';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

export default function Camera(sources) {

    const { wsConnection$, ffmpeg } = sources;
    const camera$ = ffmpeg.stream();

    const cameraActions$ = wsConnection$.map(({socket}) => {
        const disconnection$ = socket.events('close');
        const message$ = socket.events('message').debug('msg');
        const cameraStop$ = message$.filter( o => o.data.name === 'camera:stop').endWhen(disconnection$);
        const cameraStart$ = message$.filter(o => o.data.name === 'camera:start').endWhen(disconnection$).debug('camera:start');

        return xs.merge(
            xs.of(socket.json({name: 'camera:state', data: 'stopped' })),
            cameraStart$.mapTo(socket.json({ name: 'camera:state', data: 'streaming' })),
            cameraStop$.mapTo(socket.json({ name: 'camera:state', data: 'stopped' })),
            cameraStart$.map(() => camera$.endWhen(cameraStop$))
                .flatten()
                .map( data => socket.json({
                    name: 'camera:data',
                    data
                }))
        );
    }).compose(flattenConcurrently);


    const sinks = {
        socketResponse: cameraActions$
    }

    return sinks;
}