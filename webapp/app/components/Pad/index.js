import xs from 'xstream';
import { html } from 'snabbdom-jsx';

function borderRate(val){
    if(val < -1) return -1;
    if(val > 1) return 1;
    return val;
}

function intent(DOM) {
    const pad$ = DOM.select('.pad-base');
    const root$ = DOM.select(':root');
    const mouseDown$ = pad$.events('mousedown');
    const mouseUp$ = root$.events('mouseup').mapTo(true);
    //const mouseLeave$ = root$.events('mouseleave').mapTo(true).debug();
    const mouseMove$ = root$.events('mousemove');

    return mouseDown$
        .map(mouseDownEvent => {
            const { top, left, width, height } = mouseDownEvent.currentTarget.getBoundingClientRect();
            return mouseMove$
                .map(e => {
                    const rateX = (e.clientX - left - width*0.5)/(width*0.5);
                    const rateY = (e.clientY - top - height*0.5)/(height*0.5);
                    return { rateX, rateY }
                })
                .endWhen(mouseUp$)
        })
        .flatten();
}

function model(action$, props$) {
    return props$
        .map((props) => action$
            .map(({ rateX, rateY }) => ({ rateX:borderRate(rateX), rateY:borderRate(rateY) }))
            .startWith(props)
        )
        .flatten()
        .remember();
}

function view(state$) {
    return (state$.map(({ rateX, rateY }) =>
        <div className="pad-base">
            <div className="pad-button" style={{ left: `calc(50% + ${rateX*50}%)`, top: `calc(50% + ${rateY*50}%)` }}></div>
        </div>
    ))
}


function _Pad({ DOM, props = xs.of({ rateX: 0, rateY: 0 }) }) {

    const action$ = intent(DOM);
    const state$ = model(action$, props);
    const vdom$ = view(state$);

    const sinks = {
        DOM: vdom$,
        value: state$
    };

    return sinks;
}

export default _Pad;