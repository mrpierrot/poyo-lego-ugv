const express = require('express');
const ev3dev = require('ev3dev-lang');
const fs = require('fs');

const options = {
    key: fs.readFileSync(__dirname+'/certs/key.pem'),
    cert: fs.readFileSync(__dirname+'/certs/cert.pem')
};

exports.startServer = (port, path, callback) => {
    const app = express();
    const https = require('https').createServer(options, app);
    const io = require('socket.io')(https);
    const publicPath = __dirname + '/' + path;

   
    app.use(express.static(publicPath));

    app.get('/', function (req, res) {
        res.sendFile(publicPath + '/index.html');
    });

    const motor = new ev3dev.Motor('spi0.1:MA');

    io.on('connection', (socket) => {
        console.log('a user connected');
        socket.emit('connected');
        setInterval(() => {
            socket.emit('ping', 'pong');
        }, 1000);
        socket.on('start', () => {
            console.log('start');
            if (motor.connected) {
                console.log('motor connected');
                motor.runForever();
            }else{
                console.log('motor not connected');
            }
        });
        socket.on('stop', () => {
            console.log('stop');
            if (motor.connected) {
                console.log('motor connected');
                motor.stop();
            }else{
                console.log('motor not connected');
            }
        });
        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });

    https.listen(port, callback);
};

