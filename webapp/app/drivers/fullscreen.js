import xs from 'xstream';
import adapt from '@cycle/run/lib/adapt';


function request(element){
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    }
}

function cancel(){
    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
}

function isEnabled(){
    if(document.fullscreenEnabled !== undefined)return document.fullscreenEnabled;
    if(document.mozFullscreenEnabled !== undefined)return document.mozFullscreenEnabled;
    if(document.webkitFullscreenEnabled !== undefined)return document.webkitFullscreenEnabled;
}

function isFullscreenMode(){
    return !document.fullscreenElement 
    && !document.mozFullScreenElement 
    && !document.webkitFullscreenElement;
}

export function makeFullscreenDriver() {

    return function fullscreenDriver(events$) {

        events$.addListener({
            next: outgoing => {
                const {action = 'toggle',element = document.documentElement } = outgoing;
                switch(action){
                    case 'request': return request(element);
                    case 'cancel': return cancel();
                    default: isFullscreenMode()?request(element):cancel();

                }
            },
            error: () => { },
            complete: () => { },
        });
    }
}