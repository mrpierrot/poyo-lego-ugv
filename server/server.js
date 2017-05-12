const express = require('express');
const ev3dev = require('ev3dev-lang');
const fs = require('fs');
const { makeController } = require('./app/controller');

const options = {
    key: fs.readFileSync(__dirname+'/certs/key.pem'),
    cert: fs.readFileSync(__dirname+'/certs/cert.pem')
};

exports.startServer = (port, path, callback) => {
    const app = express();
    //const https = require('https').createServer(options, app);
    const https = require('http').createServer(app);
    const io = require('socket.io')(https);
    const publicPath = __dirname + '/' + path;
   
    app.use(express.static(publicPath));

    app.get('/', function (req, res) {
        res.sendFile(publicPath + '/index.html');
    });

    https.listen(port, callback);

    makeController(io);
};

