const ffmpeg = require('fluent-ffmpeg');

exports.createMacOSCameraCommand = function createMacOSCameraCommand() {
    return ffmpeg().input("0")
        .inputFormat("avfoundation")
        .inputFPS(30)
        .outputOptions([
            '-f mpegts',
            '-codec:v mpeg1video',
            '-s 320x180',
            '-b:v 1000k',
            '-bf 0'
        ])
};
// ffmpeg -f avfoundation -framerate 30 -i "0" -target pal-vcd ./test.mpg

exports.createRaspicamCommand = function createRaspicamCommand() {
    return ffmpeg().input("/dev/video0")
        .inputOptions([
            '-f v4l2',
            '-framerate 25',
            '-video_size 640x480'
        ])
        .outputOptions([
            '-f mpegts',
            '-codec:v mpeg1video',
            '-s 640x480',
            '-b:v 1000k',
            '-bf 0'
        ])
};
// ffmpeg -f v4l2 -framerate 25 -video_size 640x480 -i /dev/video0 -f mpegts -codec:v mpeg1video -s 640x480 -b:v 1000k -bf 0 http://localhost:8081/un-mot-de-passe/320/240/
