const xs = require('xstream').default;

function createStreamProducer(commandMaker) {

    let dataListener = null,
        errorListener = null,
        endListener = null;
    let ffstream = null;

    let command;
    return {
        start(listener){
            console.log('ffmpeg:start');
            dataListener = (o) => listener.next(o);
            errorListener = (o) => listener.error(o);
            endListener = (o) => listener.complete(o);
            command = commandMaker()
            command.on('error',(e) => {
                console.log('ffmpeg : off',e)
            });
            ffstream = command.pipe();
            ffstream.on('data',dataListener);
            ffstream.on('error',errorListener);
            ffstream.on('end',endListener);
            ffstream.on('close',endListener);
        },

        stop(){
            console.log('ffmpeg:stop');
            command.kill();
            ffstream.removeListener('data',dataListener);
            ffstream.removeListener('error',errorListener);
            ffstream.removeListener('end',endListener);
            ffstream.removeListener('close',endListener);
            command = null;
           
        }
    }
}

exports.makeFfmpegDriver = function makeFfmpegDriver(commandMaker){

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
            stream() {
                return xs.create(createStreamProducer(commandMaker));
            }
        }
    }

}

// sudo service uv4l_raspicam restart
// ffmpeg -f v4l2 -framerate 25 -video_size 640x480 -i /dev/video0 -f mpegts -codec:v mpeg1video -s 640x480 -b:v 1000k -bf 0 http://localhost:8081/un-mot-de-passe/320/240/

// ffmpeg -f avfoundation -framerate 30 -i "0" -target pal-vcd ./test.mpg