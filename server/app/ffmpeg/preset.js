const ffmpeg = require('fluent-ffmpeg');

exports.createMacOSCamCommand = function createMacOSCamCommand() {
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