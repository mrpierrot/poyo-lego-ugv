import xs from 'xstream';
import { html } from 'snabbdom-jsx';

function intent(DOM) {
    const pad$ = DOM.select('.pad-base');
    //pad$.events('mousedown').mapTo(true);
    return pad$.events('mousemove').map((e) => ({x: e.layerX,y: e.layerY}))
}

function model(action$, props$) {
    return props$
        .map((props) => action$
            .map(({x,y}) => ({ x, y }))
            .startWith(props)
        )
        .flatten();
}

function view(state$) {
    return (state$.map(({x,y}) =>
        <div className="pad-base">
            <div className="pad-button" style={{left:`${x}px`,top:`${y}px`}}></div>
        </div>
    ))
}

function _Pad({ DOM, props = xs.of({x:0,y:0}) }) {

    const action$ = intent(DOM);
    const state$ = model(action$, props);
    const vdom$ = view(state$);

    const sinks = {
        DOM: vdom$
        /*,
        value: state$.map(state => !!state.showResult)*/
    };

    return sinks;
}

export default _Pad;