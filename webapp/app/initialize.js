import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { makeSocketIODriver } from 'cycle-socket.io';
import io from 'socket.io-client';
import { html } from 'snabbdom-jsx';
import { Stick, VERTICAL_STICK_MODE, HORIZONTAL_STICK_MODE } from 'components/Stick';
import { makeFullscreenDriver } from 'drivers/fullscreen';
import { makeJSMpegDriver } from 'drivers/jsmpeg';
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

function flowControledStream(input$, mapping, delay = 100, isEqual = (a, b) => a.message.value == b.message.value) {
  const memoryInput$ = input$.remember();
  return xs.periodic(delay).map(() => {
    return memoryInput$.take(1).map(mapping);
  }).flatten().compose(dropRepeats(isEqual));
}

function main(sources) {

  const { DOM, socketIO, fullscreen, jsmpeg } = sources;
  const cameraPowerToggleAction$ = DOM.select('.action-camera-power-toggle').events('change').map(e => e.target.checked);
  const fullscreenToggleAction$ = DOM.select('.action-fullscreen-toggle').events('change').map(e => e.target.checked);
  const fullscreenChange$ = fullscreen.change();
  const ioConnect$ = formatIOGet(socketIO, 'connect');
  const ioDisconnect$ = formatIOGet(socketIO, 'disconnect');
  const cameraData$ = socketIO.get('camera:data');
  const cameraState$ = socketIO.get('camera:state');
  const videoPlayer$ = jsmpeg();

  const ioStatus$ = xs.merge(ioConnect$, ioDisconnect$).startWith({ name: 'disconnect' });

  const leftStick = isolate(Stick, { DOM: 'left-stick' })({ DOM, props$: xs.of({ mode: HORIZONTAL_STICK_MODE }) });
  const rightStick = isolate(Stick, { DOM: 'right-stick' })({ DOM, props$: xs.of({ mode: VERTICAL_STICK_MODE }) });

  const fullscreen$ = fullscreenToggleAction$.map(() => ({
    action: 'toggle'
  }));

  const cameraPowerToggle$ = cameraPowerToggleAction$.map(
    checked => checked ?
      {
        messageType: 'camera:start'
      } :
      {
        messageType: 'camera:stop'
      });

  const directionMessage$ = flowControledStream(leftStick.value, (data) => ({
    messageType: 'direction',
    message: { value: data.rateX },
  }));

  const speedMessage$ = flowControledStream(rightStick.value, (data) => ({
    messageType: 'speed',
    message: { value: data.rateY },
  }));

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
    socketIO: xs.merge(directionMessage$, speedMessage$, cameraPowerToggle$),
    fullscreen: fullscreen$,
    jsmpeg: cameraData$
  };
  return sinks;
}

export default function init({ socketUrl }){
  const drivers = {
    DOM: makeDOMDriver('#app'),
    socketIO: makeSocketIODriver(io(socketUrl)),
    fullscreen: makeFullscreenDriver(),
    jsmpeg: makeJSMpegDriver()
  };

  run(main, drivers);
}

