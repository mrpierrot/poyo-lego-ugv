const xs = require('xstream').default;

function createStreamProducer(command) {

    let dataListener = null,
        errorListener = null,
        endListener = null;
    let ffstream = null;

    command.on('error',() => {
        console.log('ffmpeg : off')
    });
    return {
        start(listener){
            dataListener = (o) => listener.next(o);
            errorListener = (o) => listener.error(o);
            endListener = (o) => listener.complete(o);
            ffstream = command.pipe();
            ffstream.on('data',dataListener);
            ffstream.on('error',errorListener);
            ffstream.on('end',endListener);
            ffstream.on('close',endListener);
        },

        stop(){
            command.kill();
            ffstream.removeListener('data',dataListener);
            ffstream.removeListener('error',errorListener);
            ffstream.removeListener('end',endListener);
            ffstream.removeListener('close',endListener);
           
        }
    }
}

exports.makeFfmpegDriver = function makeFfmpegDriver(){

    return function ffmpegDriver(actions$){

        actions$.addListener({
            next: outgoing => {
               if(!outgoing.command) throw new Error("ffmpeg driver : 'command' not defined");
               if(!outgoing.action) throw new Error("ffmpeg driver : 'action' not defined");
               const action = outgoing.command[outgoing.action];
               if(typeof action !== 'function') throw new Error(`ffmpeg driver : action ${outgoing.action} not a ffmpeg function`);
               action.apply(outgoing.command,outgoing.params);
            },
            error: () => { },
            complete: () => { },
        });

        return {
            stream(command) {
                return xs.create(createStreamProducer(command));
            }
        }
    }

}

// sudo service uv4l_raspicam restart
// ffmpeg -f v4l2 -framerate 25 -video_size 640x480 -i /dev/video0 -f mpegts -codec:v mpeg1video -s 640x480 -b:v 1000k -bf 0 http://localhost:8081/un-mot-de-passe/320/240/

// ffmpeg -f avfoundation -framerate 30 -i "0" -target pal-vcd ./test.mpg