const pm2 = require('pm2');
const _ = require('lodash');
const conf = require('./pm2.json')

const NAME = 'soul';

function startApp(app){
    return new Promise((resolve,reject)=>{
        pm2.start(app, function (err, apps) {
            if (err) reject(err);
            else resolve(apps)
        });
    });

}

pm2.connect(function (err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }

    Promise.all(conf.apps.map((app)=> startApp(app)))
        .then(() => {
            console.log('apps launched')
            pm2.disconnect();
        });
    
});


