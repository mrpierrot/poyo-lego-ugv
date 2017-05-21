const express = require('express');
const fs = require('fs');
const { makeController } = require('./app/controller');
const cons = require('consolidate');

const options = {
    key: fs.readFileSync(__dirname + '/certs/key.pem'),
    cert: fs.readFileSync(__dirname + '/certs/cert.pem')
};

const SOCKET_PORT = 6969;

exports.startServer = (port, path, callback) => {
    require('dns').lookup(require('os').hostname(), function (err, add, fam) {
        
        const socketUrl = `http://${add}:${SOCKET_PORT}`;
        console.log('socketUrl: ' + socketUrl);
        const app = express();
        //const https = require('https').createServer(options, app);
        const https = require('http').createServer(app);
        const io = require('socket.io')();
        io.listen(6969);
        const publicPath = __dirname + '/' + path;

        app.use(express.static(publicPath));

        app.get('/', function (req, res) {

            cons.handlebars(__dirname+'/views/index.html', { socketUrl })
            .then(function (html) {
                res.send(html);
            })
            .catch(function (err) {
                throw err;
            });

            //res.sendFile(publicPath + '/index.html');
        });

        https.listen(port, callback);

        makeController(io);

    })
};






