const express = require('express');
const fs = require('fs');
const { makeController } = require('./controller');
const cons = require('consolidate');
const ngrok = require('./ngrok-promise');
const eddystoneBeacon = require('eddystone-beacon');
const private = require('../private.json');


const httpsOptions = {
    key: fs.readFileSync(__dirname + '/..' + private.ssl.key),
    cert: fs.readFileSync(__dirname + '/..' + private.ssl.cert)
};

const beaconOptions = {
    name: 'Poyo',    // set device name when advertising (Linux only)
    txPowerLevel: -22, // override TX Power Level, default value is -21,
    tlmCount: 2,       // 2 TLM frames
    tlmPeriod: 10      // every 10 advertisements
};

const HTTP_PORT = 8080;

exports.startServer = (port, path, callback) => {
    require('dns').lookup(require('os').hostname(), function (err, add, fam) {

        const localIPUrl = `https://${add}:${port}`;
        const app = express();
        const https = require('https').createServer(httpsOptions, app);
        const http = require('http').createServer(app);
        const io = require('socket.io')(https);
        const publicPath = __dirname + '/../' + path;

        app.use(express.static(publicPath));
        app.get('/app', function (req, res) {
            cons.handlebars(__dirname + '/templates/app.html', { socketUrl: localIPUrl })
                .then(function (html) {
                    res.send(html);
                })
                .catch(function (err) {
                    throw err;
                });
        });

        app.get('/', function (req, res) {
            cons.handlebars(__dirname + '/templates/index.html', { localIPUrl })
                .then(function (html) {
                    res.send(html);
                })
                .catch(function (err) {
                    throw err;
                });
        });

        https.listen(port, callback);
        http.listen(HTTP_PORT, () => {
            console.log("http started on " + HTTP_PORT);
        });

        makeController(io);

        ngrok.connect(Object.assign({ addr: HTTP_PORT }, private.ngrok))
            .then(url => {
                console.log("App available on " + url);
                eddystoneBeacon.advertiseUrl(url, [beaconOptions]);
            }).catch(err => {
                console.error(err);
            }) 
    })

    /**
     * Nodemon clean up
     */
    process.once('SIGUSR2', function () {
        ngrok.disconnect()
            .then(() => ngrok.kill()) 
            .then(()=>{
            console.log('ngrok cleaned up'); 
            process.kill(process.pid, 'SIGUSR2');
        }).catch(err => {
            console.error(err);
            process.kill(process.pid, 'SIGUSR2'); 
        })
    });
};






