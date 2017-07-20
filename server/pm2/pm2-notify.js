const pm2 = require('pm2');
const _ = require('lodash');
const conf = require('./dev.json');
const notifier = require('node-notifier');

const mainConf = conf.apps[0];

pm2.launchBus(function(err, bus) {

  if(err) {
    throw err
  }

  let lastError = null;

  bus.on('log:err', function(e) {
    if(e.process.name != mainConf.name)return;
    if(lastError != e.data){
        console.log('log:err : ',e.data);
        notifier.notify(`Server Error : ${e.data}`);
    }
    lastError = e.data
  })

});
