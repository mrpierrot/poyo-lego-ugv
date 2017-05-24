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

function stickStreamToSocketStream(Time,input$,type,period=60){
  return input$.compose(Time.throttle(period))
    .compose(dropRepeats((a, b) => a.rate == b.rate))
    .map((data) => ({
      messageType: type,
      message: { value: data.rate },
    }));
}

function main(sources) {

  const { DOM, socketIO, fullscreen, jsmpeg, Time } = sources;
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

  const directionMessage$ = stickStreamToSocketStream(Time,leftStick.value,'direction');
  const speedMessage$ = stickStreamToSocketStream(Time,rightStick.value,'speed');

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

export default function init({ socketUrl }) {
  const drivers = {
    DOM: makeDOMDriver('#app'),
    Time: timeDriver,
    socketIO: makeSocketIODriver(io(socketUrl, { secure: true })),
    fullscreen: makeFullscreenDriver(),
    jsmpeg: makeJSMpegDriver()
  };

  run(main, drivers);
}

