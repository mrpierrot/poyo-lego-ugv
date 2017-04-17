import xs from 'xstream';
import { html } from 'snabbdom-jsx';

function intent(DOM) {
    const pad$ = DOM.select('.pad-base');
    const root$ = DOM.select(':root');
    const mouseDown$ = pad$.events('mousedown');
    const mouseUp$ = root$.events('mouseup').mapTo(true).debug();
    //const mouseLeave$ = root$.events('mouseleave').mapTo(true).debug();
    const mouseMove$ = root$.events('mousemove');

    return mouseDown$
        .map(mouseDownEvent => {
            const { top, left } = mouseDownEvent.target.getBoundingClientRect();
            return mouseMove$
                .map(e => {
                    const xx = e.clientX - left;
                    const yy = e.clientY - top;
                    return { x: xx, y: yy }
                })
                .endWhen(mouseUp$)
        })
        .flatten();
}

function model(action$, props$) {
    return props$
        .map((props) => action$
            .map(({ x, y }) => ({ x, y }))
            .startWith(props)
        )
        .flatten();
}

function view(state$) {
    return (state$.map(({ x, y }) =>
        <div className="pad-base">
            <div className="pad-button" style={{ left: `${x}px`, top: `${y}px` }}></div>
        </div>
    ))
}


function _Pad({ DOM, props = xs.of({ x: 0, y: 0 }) }) {

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