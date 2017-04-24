import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { makeSocketIODriver } from 'cycle-socket.io';
import io from 'socket.io-client';
import { html } from 'snabbdom-jsx';
import { Stick, VERTICAL_STICK_MODE, HORIZONTAL_STICK_MODE } from 'components/Stick';
import { makeFullscreenDriver } from 'drivers/fullscreen';

// Register the service worker if available.
/*if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(function(reg) {
        console.log('Successfully registered service worker', reg);
    }).catch(function(err) {
        console.warn('Error whilst registering service worker', err);
    });
}*/

function main(sources) {

  const { DOM, socketIO, fullscreen } = sources;
  const start$ = DOM.select('.action-start').events('click');
  const stop$ = DOM.select('.action-stop').events('click');
  const incomingMessages$ = socketIO.get('ping').startWith('none');
  const startMessages$ = start$.map(eventData => ({
    messageType: 'start',
    message: eventData,
  }));

  const fullscreen$ = DOM.select('.action-fullscreen').events('click');

  const stopMessages$ = stop$.map(eventData => ({
    messageType: 'stop',
    message: eventData,
  }));

  const leftStick = isolate(Stick, { DOM: 'left-stick' })({ DOM, props$: xs.of({ rateX: 0, rateY: 0, mode: VERTICAL_STICK_MODE }) });
  const rightStick = isolate(Stick, { DOM: 'right-stick' })({ DOM, props$: xs.of({ rateX: 0, rateY: 0, mode: HORIZONTAL_STICK_MODE }) });


  const sinks = {
    DOM: xs.combine(incomingMessages$, leftStick.DOM, leftStick.value, rightStick.DOM, rightStick.value)
      .map(([msg, leftStickDOM, leftStickValue, rightStickDOM, rightStickValue]) =>
        <div className="gamestick-wrapper">
          <header className="gamestick-header">
            <div>{msg}</div>
            <button className="action-start">Start</button>
            <button className="action-stop">Stop</button>
            <button className="action-fullscreen">Fullscreen</button>
            <div>{leftStickValue.rateX} {leftStickValue.rateY}</div>
            <div>{rightStickValue.rateX} {rightStickValue.rateY}</div>
          </header>
          <div className="gamestick">
            {leftStickDOM}
            <div className="camera-display"></div>
            {rightStickDOM}
          </div>
        </div>
      ),
    socketIO: xs.merge(startMessages$, stopMessages$),
    fullscreen: fullscreen$
  };
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  socketIO: makeSocketIODriver(io()),
  fullscreen: makeFullscreenDriver()
};

run(main, drivers);