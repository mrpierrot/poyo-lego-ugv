import xs from 'xstream';
import { html } from 'snabbdom-jsx';
import adapt from '@cycle/run/lib/adapt';
import { createEventProducer } from '../../cycle-driver-utils';
import { createXstreamSource } from './source';
require('jsmpeg');

export function makeJSMpegDriver() {

    return function jsmpegDriver(events$) {

        return (containerClassName="camera-display") => {
            const player = new window.JSMpeg.Player(null, {source:createXstreamSource(events$),disableGl:false});
            return xs.of({
                player,
                DOM: <div className={containerClassName} hook={{insert:vnode => { vnode.elm.appendChild(player.renderer.canvas)}}}></div>
            });
        }
    }
}