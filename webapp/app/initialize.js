import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import isolate from '@cycle/isolate';
import io from 'socket.io-client';

import { html } from 'snabbdom-jsx';
import { Stick, VERTICAL_STICK_MODE, HORIZONTAL_STICK_MODE } from 'components/Stick';
import { makeFullscreenDriver } from 'drivers/fullscreen';
import { makeNetDriver, ioClient } from 'cycle-net';
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



export default function init({ socketUrl }) {

  function main(sources) {

    const { DOM, socketClient, fullscreen, jsmpeg, Time } = sources;

    const socketCreate$ = xs.of({
      id: 'io',
      action: 'create',
      url: socketUrl
    })

    const socket = socketClient.select('io');

    const cameraPowerToggleAction$ = DOM.select('.action-camera-power-toggle').events('change').map(e => e.target.checked);
    const fullscreenToggleAction$ = DOM.select('.action-fullscreen-toggle').events('change').map(e => e.target.checked);
    const fullscreenChange$ = fullscreen.change();
    const ioReady$ = socket.events('ready');

    function socketEvent(name) {
      return ioReady$.map(({ socket }) => socket.events(name)).flatten()
    }

    function stickStreamToSocketStream(ioReady$, input$, type, period = 60) {
      return ioReady$.map(
        ({ socket }) => input$.compose(Time.throttle(period))
          .compose(dropRepeats((a, b) => a.rate == b.rate))
          .map(data => socket.send(type, { value: data.rate }))
      ).flatten();
    }

    const ioConnect$ = socket.events('connect');
    const ioDisconnect$ = socket.events('disconnect');
    const ioReconnect$ = socket.events('reconnect');
    const ioReconnectError$ = socket.events('reconnect_error');
    const ioReconnectFailed$ = socket.events('reconnect_failed');
    const ioReconnectAttempt$ = socket.events('reconnect_attempt');
    const ioReconnecting$ = socket.events('reconnecting');

    const cameraData$ = socket.events('camera:data').map(o => o.data);
    const cameraState$ = socket.events('camera:state').startWith({ name: 'camera:state', data: 'stopped' });
    const videoPlayer$ = jsmpeg();

    const ioStatus$ = xs.merge(
      ioConnect$,
      ioDisconnect$,
      ioReconnecting$,
      ioReconnect$
    )
      .debug()
      .map(e => ({ name: e.event }))
      .startWith({ name: 'disconnect' }).debug();

    const leftStick = isolate(Stick, { DOM: 'left-stick' })({ DOM, props$: xs.of({ mode: HORIZONTAL_STICK_MODE }) });
    const rightStick = isolate(Stick, { DOM: 'right-stick' })({ DOM, props$: xs.of({ mode: VERTICAL_STICK_MODE }) });

    const directionMessage$ = stickStreamToSocketStream(ioReady$, leftStick.value, 'direction');
    const speedMessage$ = stickStreamToSocketStream(ioReady$, rightStick.value, 'speed');

    const fullscreen$ = fullscreenToggleAction$.map(() => ({
      action: 'toggle'
    }));

    const cameraPowerToggle$ = ioReady$.map(
      ({ socket }) => cameraPowerToggleAction$.map(
        checked => socket.send(checked ? 'camera:start' : 'camera:stop')
      )
    ).flatten();

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
    socketClient: makeNetDriver(ioClient(io)),
    fullscreen: makeFullscreenDriver(),
    jsmpeg: makeJSMpegDriver()
  };

  run(main, drivers);
}

