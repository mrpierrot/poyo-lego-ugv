import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { makeSocketIODriver } from 'cycle-socket.io';
import io from 'socket.io-client';
import { html } from 'snabbdom-jsx';
import { Pad, VERTICAL_PAD_MODE, HORIZONTAL_PAD_MODE } from 'components/Pad';


function main(sources) {

  const { DOM, socketIO } = sources;
  const start$ = DOM.select('.action-start').events('click');
  const stop$ = DOM.select('.action-stop').events('click');
  const incomingMessages$ = socketIO.get('ping').startWith('none');
  const startMessages$ = start$.map(eventData => ({
    messageType: 'start',
    message: eventData,
  }));

  const stopMessages$ = stop$.map(eventData => ({
    messageType: 'stop',
    message: eventData,
  }));

  const leftPad = isolate(Pad, { DOM: 'left-pad' })({ DOM, props$: xs.of({ rateX: 0, rateY: 0, mode: VERTICAL_PAD_MODE }) });
  const rightPad = isolate(Pad, { DOM: 'right-pad' })({ DOM, props$: xs.of({ rateX: 0, rateY: 0, mode: HORIZONTAL_PAD_MODE }) });


  const sinks = {
    DOM: xs.combine(incomingMessages$, leftPad.DOM, leftPad.value, rightPad.DOM, rightPad.value)
      .map(([msg, leftPadDOM, leftPadValue, rightPadDOM, rightPadValue]) =>
        <div className="gamepad-wrapper">
          <header className="gamepad-header">
            <div>{msg}</div>
            <button className="action-start">Start</button>
            <button className="action-stop">Stop</button>
            {leftPadValue.rateX} {leftPadValue.rateY}

          {rightPadValue.rateX} {rightPadValue.rateY}
          </header>
          <div className="gamepad">
            {leftPadDOM}
            <div className="camera-display"></div>
            {rightPadDOM}
          </div>

          
        </div>
      ),
    socketIO: xs.merge(startMessages$, stopMessages$)
  };
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  socketIO: makeSocketIODriver(io())
};

run(main, drivers);