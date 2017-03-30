import xs from 'xstream';
import { html } from 'snabbdom-jsx';

function intent(DOM){
    return DOM.select('.pad-button').events('mousemove').map((e)=>{
        console.log(e);
        return e;
    })
}

function model(action$,props$){
    return action$
}

function view(state$){
    return state$
}

function _Pad({DOM,props}) {

    const action$ = intent(DOM);
    const state$ = model(action$,props);
    const vdom$ = view(state$);

    const sinks = {
        DOM: vdom$.map((o) => <div>
            <div className="pad-button"></div>
        </div>)
        /*,
        value: state$.map(state => !!state.showResult)*/
    };

    return sinks;
}

export default _Pad;