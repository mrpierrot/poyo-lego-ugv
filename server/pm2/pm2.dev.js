const pm2 = require('pm2');
const _ = require('lodash');
const conf = require('./dev.json')

const NAME = 'soul';

const NOTIFY_APP = {
    name: "notify",
    script: "./pm2/pm2-notify.js",
    max_memory_restart: "100M"
}

function startApp(app) {
    return new Promise(function(resolve, reject){
        pm2.start(app, function (err, apps) {
            if (err){
                console.log(err);
                reject(err);
            }
            else resolve(apps)
        });
    });
}

pm2.connect(true,function (err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }

    Promise.all([
        startApp(conf.apps[0]),
        startApp(NOTIFY_APP)
    ])
        .then(() => {
            console.log('apps launched')
           // pm2.disconnect();
        });

});


