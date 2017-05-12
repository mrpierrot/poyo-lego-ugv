exports.createEventProducer = function createEventProducer(element,name,transform = (e) => e){
    let eventlistener = null;

    function addListener(pElement,pName,pEventlistener){
        if(Array.isArray(pName)){
            pName.forEach((n) => pElement.addEventListener(n,pEventlistener))
        }else{
            pElement.addEventListener(pName,pEventlistener);
        }
    }

    function removeListener(pElement,pName,pEventlistener){
        if(pEventlistener)return;
        if(Array.isArray(pName)){
            pName.forEach((n) => pElement.removeEventListener(n,pEventlistener))
        }else{
            pElement.removeEventListener(pName,pEventlistener);
        }
    }

    return {
        start(listener){
            removeListener(element,name,eventlistener);
            eventlistener = (e) => listener.next(transform(e));
            addListener(element,name,eventlistener);
        },
        stop(){
            removeListener(element,name,eventlistener);
        }
    }
}

exports.createSimpleProducer = function createSimpleProducer() {
    let _listerner = null;
    return {

        dispatchError(error) {
            if(_listerner)_listerner.error(error);
        },

        dispatchNext(data) {
            if(_listerner)_listerner.next(data);
        },

        dispatchComplete(data) {
            if(_listerner)_listerner.complete(data);
        },

        start(listener) {
            _listerner = listener;
        },
        stop() {
            if(_listerner)_listerner=null;
        }
    }
}