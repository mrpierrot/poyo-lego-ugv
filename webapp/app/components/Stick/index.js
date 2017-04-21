import xs from 'xstream';
import { html } from 'snabbdom-jsx';
import _ from 'lodash';

function borderRate(val){
    if(val < -1) return -1;
    if(val > 1) return 1;
    return val;
}

function intent(DOM) {
    const stick$ = DOM.select('.stick-base');
    const root$ = DOM.select('body');
    const touchStart$ = stick$.events('touchstart').debug();
    const touchEnd$ = root$.events('touchend').debug().mapTo(true);
    //const mouseLeave$ = root$.events('mouseleave').mapTo(true).debug();
    const touchMove$ = root$.events('touchmove');

    return touchStart$
        .map(touchStartEvent => {
            const { top, left, width, height } = touchStartEvent.currentTarget.getBoundingClientRect();
            const changedTouches = touchStartEvent.changedTouches;
            console.log(changedTouches)
            return touchMove$
                .filter(e => 
                    _.some(e.changedTouches,
                        (o) =>  _.some(changedTouches,a => a.identifier == o.identifier) 
                    )
                )
                .map(e => {
                    const rateX = (e.touches[0].clientX - left - width*0.5)/(width*0.5);
                    const rateY = (e.touches[0].clientY - top - height*0.5)/(height*0.5);
                    return { rateX, rateY }
                })
                .endWhen(touchEnd$.filter(e => 
                    _.some(e.changedTouches,
                        (o) =>  _.some(changedTouches,a => a.identifier == o.identifier) 
                    )
                ))
        })
        .flatten();
}

function model(action$, props$) {
    return props$
        .map((props) => action$
            .map(({ rateX, rateY }) => {
                switch(props.mode){
                    default:
                    case ALL_DIR_STICK_MODE: return { rateX:borderRate(rateX), rateY:borderRate(rateY) }
                    case VERTICAL_STICK_MODE: return { rateX:0, rateY:borderRate(rateY) }
                    case HORIZONTAL_STICK_MODE: return { rateX:borderRate(rateX), rateY:0 }
                }
                
            })
            .startWith(props)
        )
        .flatten()
        .remember();
}

function view(state$) {
    return (state$.map(({ rateX, rateY }) =>
        <div className="stick-base">
            <div className="stick-button" style={{ left: `calc(50% + ${rateX*50}%)`, top: `calc(50% + ${rateY*50}%)` }}></div>
        </div>
    ))
}


export function Stick({ DOM, props$ = xs.of({ rateX: 0, rateY: 0, mode: ALL_DIR_STICK_MODE }) }) {

    const action$ = intent(DOM);
    const state$ = model(action$, props$);
    const vdom$ = view(state$);

    const sinks = {
        DOM: vdom$,
        value: state$
    };

    return sinks;
}

export const VERTICAL_STICK_MODE = 'VERTICAL_STICK_MODE';
export const HORIZONTAL_STICK_MODE = 'HORIZONTAL_STICK_MODE';
export const ALL_DIR_STICK_MODE = 'ALL_DIR_STICK_MODE';