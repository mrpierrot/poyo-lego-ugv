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

// Register the service worker if available.
/*if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(function(reg) {
        console.log('Successfully registered service worker', reg);
    }).catch(function(err) {
        console.warn('Error whilst registering service worker', err);
    });
}*/

function main(sources) {

  const { DOM, socketIO, fullscreen, jsmpeg } = sources;
  const startAction$ = DOM.select('.action-start').events('click');
  const stopAction$ = DOM.select('.action-stop').events('click');
  const fullscreenAction$ = DOM.select('.action-fullscreen').events('click');
  const fullscreenChange$ = fullscreen.change();
  const cameraData$ = socketIO.get('cam:data');
  const videoPlayer$ = jsmpeg();
  
  const leftStick = isolate(Stick, { DOM: 'left-stick' })({ DOM, props$: xs.of({ mode: HORIZONTAL_STICK_MODE }) });
  const rightStick = isolate(Stick, { DOM: 'right-stick' })({ DOM, props$: xs.of({ mode: VERTICAL_STICK_MODE }) });


  const fullscreen$ = fullscreenAction$.map(()=> ({
    action: 'toggle'
  }));

  const startMessages$ = startAction$.map(eventData => ({
    messageType: 'cam:start',
    message: eventData,
  }));

  const stopMessages$ = stopAction$.map(eventData => ({
    messageType: 'cam:stop',
    message: eventData,
  }));

  const directionMessage$ = leftStick.value.map((data) => ({
    messageType: 'direction',
    message: {value:data.rateX},
  }));

  const speedMessage$ = rightStick.value.map( data => ({
    messageType: 'speed',
    message: {value:data.rateY},
  }));

  const sinks = {
    DOM: xs.combine(leftStick.DOM, rightStick.DOM,fullscreenChange$,videoPlayer$)
      .map(([leftStickDOM, rightStickDOM,fsChange,videoPlayer]) =>
        <div className="gamestick-wrapper">
          <header className="gamestick-header">
            <button className="action-start button">Start</button>
            <button className="action-stop button">Stop</button>
            <button className="action-fullscreen button">Fullscreen</button>
            {fsChange.enabled}
          </header>
          <div className="gamestick">
            {leftStickDOM}
            <div className="camera-display">
              {videoPlayer.DOM}
            </div>
            {rightStickDOM}
          </div>
        </div>
      ),
    socketIO: xs.merge(directionMessage$,speedMessage$,startMessages$, stopMessages$),
    fullscreen: fullscreen$,
    jsmpeg: cameraData$
  };
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  socketIO: makeSocketIODriver(io()),
  fullscreen: makeFullscreenDriver(),
  jsmpeg:makeJSMpegDriver()
};

run(main, drivers);