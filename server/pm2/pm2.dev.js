const pm2 = require('pm2');
const _ = require('lodash');
const conf = require('./dev.json');
const notifier = require('node-notifier');
const mainConf = conf.apps[0];

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
        startApp(conf.apps[0])
    ])
        .then(() => {
            console.log('apps launched')
        });

});

pm2.launchBus(function(err, bus) {

  if(err) {
    throw err
  }

  let lastError = null;

  bus.on('log:out', function(e) {
    console.log('log:out : ',e.data);
  })

  bus.on('log:err', function(e) {
    if(e.process.name != mainConf.name)return;
    if(lastError != e.data){
        notifier.notify(`Server Error : ${e.data}`);
    }
    lastError = e.data
  })

});



