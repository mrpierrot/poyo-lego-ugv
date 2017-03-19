import xs from 'xstream';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import { makeSocketIODriver } from 'cycle-socket.io';
import io from 'socket.io-client';
import { html } from 'snabbdom-jsx';

function main({ DOM, socketIO }) {

  const incomingMessages$ = socketIO.get('ping');
  const outgoingMessages$ = xs.empty();
  /*const outgoingMessages$ = stream$.map(eventData => ({
    messageType: 'someEvent',
    message: eventData,
  })); 
  */


  const sinks = {
    DOM: incomingMessages$.map(i =>
      <h1>{i}</h1>
    ),
    socketIO: outgoingMessages$
  };
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  socketIO: makeSocketIODriver(io())
};

run(main, drivers);