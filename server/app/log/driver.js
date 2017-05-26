exports.makeLogDriver = function makeLogDriver(){

    return function logDriver(inputs$){

        inputs$.addListener({
            next: outgoing => {
                console.log(outgoing);
            },
            error: () => { },
            complete: () => { },
        });

    }

}