import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import { makeSocketIODriver } from 'cycle-socket.io';
import io from 'socket.io-client';
import { html } from 'snabbdom-jsx';
import Pad from 'components/Pad';

function main({ DOM, socketIO }) {

  const start$ = DOM.select('.action-start').events('click');
  const stop$ = DOM.select('.action-stop').events('click');
  const incomingMessages$ = socketIO.get('ping');
  const startMessages$ = start$.map(eventData => ({
    messageType: 'start',
    message: eventData,
  }));

  const stopMessages$ = stop$.map(eventData => ({
    messageType: 'stop',
    message: eventData,
  }));  

  const aPad = Pad({DOM});
  
  const sinks = {
    DOM: incomingMessages$.map(i =>
      <div>
        <h1>{i}</h1>
        <button className="action-start">Start</button>
        <button className="action-stop">Stop</button>
        {aPad.DOM}
      </div>
    ),
    socketIO: xs.merge(startMessages$,stopMessages$)
  };
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  socketIO: makeSocketIODriver(io())
};

run(main, drivers);