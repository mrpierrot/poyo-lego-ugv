const ngrok = require('ngrok');

function callbackToPromise(self,func){

    return (...params) => new Promise(
        (resolve,reject) => {
            func.apply(self,[...params,function(...cbParams){
                const err = cbParams.shift();
                if(err){
                    reject(err);
                }else{
                    resolve.apply(null,cbParams);
                }
            }])
        }
    );
}

exports.connect = callbackToPromise(ngrok,ngrok.connect);
exports.disconnect = callbackToPromise(ngrok,ngrok.disconnect);
exports.kill = callbackToPromise(ngrok,ngrok.kill);