import xs from 'xstream';
import adapt from '@cycle/run/lib/adapt';
import { createEventProducer } from '../cycle-driver-utils';


function request(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    }
}

function cancel() {
    if (document.cancelFullScreen) {
        document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
    }
}

function isEnabled() {
    if (document.fullscreenEnabled !== undefined) return document.fullscreenEnabled;
    if (document.mozFullscreenEnabled !== undefined) return document.mozFullscreenEnabled;
    if (document.webkitFullscreenEnabled !== undefined) return document.webkitFullscreenEnabled;
    return false;
}

function isFullscreenMode() {
    return (document.fullscreenElement
        || document.mozFullScreenElement
        || document.webkitFullscreenElement) != null;
}

export function makeFullscreenDriver() {

    return function fullscreenDriver(events$) {

        events$.addListener({
            next: outgoing => {
                const { action = 'toggle', element = document.documentElement } = outgoing;
                switch (action) {
                    case 'request': return request(element);
                    case 'cancel': return cancel();
                    case 'toggle':
                    default: !isFullscreenMode() ? request(element) : cancel();

                }
            },
            error: () => { },
            complete: () => { },
        });

        return {
            change() {
                return xs.create(
                        createEventProducer(document,
                            [
                                'webkitfullscreenchange',
                                'mozfullscreenchange',
                                'msfullscreenchange'
                            ], 
                            (e) => ({ event: e, enabled: isFullscreenMode() })
                        )
                    )
                    .startWith({ event: null, enabled: isFullscreenMode() })
            },
            error() {
                return xs.create(createEventProducer(document, 'fullscreenerror'))
            }
        }
    }
}