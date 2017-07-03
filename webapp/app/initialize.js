import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import isolate from '@cycle/isolate';

import { html } from 'snabbdom-jsx';
import { Stick, VERTICAL_STICK_MODE, HORIZONTAL_STICK_MODE } from 'components/Stick';
import { makeFullscreenDriver } from 'drivers/fullscreen';
import { makeWSClientDriver } from 'cycle-ws';
import { makeJSMpegDriver } from 'drivers/jsmpeg';
import { timeDriver } from '@cycle/time';
import dropRepeats from 'xstream/extra/dropRepeats'

// Register the service worker if available.
/*if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(function(reg) {
        console.log('Successfully registered service worker', reg);
    }).catch(function(err) {
        console.warn('Error whilst registering service worker', err);
    });
}*/

function formatIOGet(socketIO, name) {
  return socketIO.get(name).map(data => ({ name: name, data }));
}

function stickStreamToSocketStream(Time, input$, type, period = 60) {
  return input$.compose(Time.throttle(period))
    .compose(dropRepeats((a, b) => a.rate == b.rate))
    .map((data) => ({
      messageType: type,
      message: { value: data.rate },
    }));
}

export default function init({ socketUrl }) {

  function main(sources) {

    const { DOM, socketClient, fullscreen, jsmpeg, Time } = sources;

    const socketCreate$ = xs.of({
      id: 'ws',
      action: 'create',
      url: socketUrl
    }) 

    const socket = socketClient.select('ws');



    const cameraPowerToggleAction$ = DOM.select('.action-camera-power-toggle').events('change').map(e => e.target.checked);
    const fullscreenToggleAction$ = DOM.select('.action-fullscreen-toggle').events('change').map(e => e.target.checked);
    const fullscreenChange$ = fullscreen.change();
    const ioConnect$ = socket.events('open').debug('open').mapTo({name:'open'});
    const ioDisconnect$ = socket.events('close').mapTo({name:'close'});

    const message$ = socket.events('message');
    const cameraData$ = message$.filter(o => o.data.name ==='camera:data').map( o => Float32Array.from(o.data.data.data));
    const cameraState$ = message$.filter(o => o.data.name === 'camera:state').startWith({name:'camera:state',data:'stopped'});
    const videoPlayer$ = jsmpeg();

    const ioStatus$ = xs.merge(ioConnect$, ioDisconnect$).startWith({ name: 'close' });

    const leftStick = isolate(Stick, { DOM: 'left-stick' })({ DOM, props$: xs.of({ mode: HORIZONTAL_STICK_MODE }) });
    const rightStick = isolate(Stick, { DOM: 'right-stick' })({ DOM, props$: xs.of({ mode: VERTICAL_STICK_MODE }) });

    const directionMessage$ = stickStreamToSocketStream(Time, leftStick.value, 'direction');
    const speedMessage$ = stickStreamToSocketStream(Time, rightStick.value, 'speed');

    const fullscreen$ = fullscreenToggleAction$.map(() => ({
      action: 'toggle'
    }));

    const cameraPowerToggle$ = socket.events('open').map( 
      ({socket}) => cameraPowerToggleAction$.map(
        checked => socket.json({name: checked ? 'camera:start':'camera:stop'})
      )
    ).flatten().debug();

    const sinks = {
      DOM: xs.combine(leftStick.DOM, rightStick.DOM, fullscreenChange$, videoPlayer$, cameraState$, ioStatus$)
        .map(([leftStickDOM, rightStickDOM, fsChange, videoPlayer, cameraState, ioStatus]) =>
          <div className="gamestick-wrapper">
            <header className="gamestick-header">
              <div className="checkbox">
                <input id="action-camera-power-toggle" type="checkbox" className="action-camera-power-toggle toggle-button" checked={cameraState == "streaming"} />
                <label htmlFor="action-camera-power-toggle">
                  <span className="toggle-button-inner"></span>
                  <span className="toggle-button-switch"></span>
                </label>
              </div>
              <div className={"io-status io-status-" + ioStatus.name}>{ioStatus.name}</div>
              <div className="checkbox">
                <input id="action-fullscreen-toggle" type="checkbox" className="action-fullscreen-toggle toggle-button" checked={fsChange.enabled} />
                <label htmlFor="action-fullscreen-toggle">
                  <span className="toggle-button-inner"></span>
                  <span className="toggle-button-switch"></span>
                </label>
              </div>
            </header>
            <div className="gamestick">
              {leftStickDOM}
              {videoPlayer.DOM}
              {rightStickDOM}
            </div>
          </div>
        ),
      socketClient: xs.merge(socketCreate$, directionMessage$, speedMessage$, cameraPowerToggle$),
      fullscreen: fullscreen$,
      jsmpeg: cameraData$
    };
    return sinks;
  }

  const drivers = {
    DOM: makeDOMDriver('#app'),
    Time: timeDriver,
    socketClient: makeWSClientDriver(WebSocket),
    fullscreen: makeFullscreenDriver(),
    jsmpeg: makeJSMpegDriver()
  };

  run(main, drivers);
}

