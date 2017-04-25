import xs from 'xstream';
import { html } from 'snabbdom-jsx';
import _ from 'lodash';

function borderRate(val){
    if(val < -1) return -1;
    if(val > 1) return 1;
    return val;
}

function modeToClasses(mode){
    switch(mode){
        case VERTICAL_STICK_MODE: return 'vertical';
        case HORIZONTAL_STICK_MODE: return 'horizontal';
    }
    return 'vertical horizontal';
}

function intent(DOM) {
    const stick$ = DOM.select('.stick-base');
    const root$ = DOM.select('body');
    const touchStart$ = stick$.events('touchstart');
    const touchEnd$ = root$.events('touchend');
    const touchcancel$ = root$.events('touchcancel');
    const touchMove$ = root$.events('touchmove');

    return touchStart$
        .map(touchStartEvent => {
            const { top, left, width, height } = touchStartEvent.currentTarget.getBoundingClientRect();
            const targetTouches = touchStartEvent.targetTouches;
            return touchMove$
                .filter(e => 
                    _.some(e.targetTouches,
                        (o) =>  _.some(targetTouches,a => a.identifier == o.identifier) 
                    )
                )
                .map(e => {
                    return { 
                        x:e.targetTouches[0].clientX,
                        y:e.targetTouches[0].clientY,
                        top, left, width, height 
                    }
                })
                .endWhen(xs.merge(touchEnd$,touchcancel$).filter(e => 
                    _.some(e.changedTouches,
                        (o) =>  _.some(targetTouches,a => a.identifier == o.identifier)
                    )
                ))
        })
        .flatten();
}

function model(action$, props$) {
    return props$
        .map((props) => action$
            .map(({ x,y,top, left, width, height }) => {
                const padding = props.padding;
                const w = width - padding*2;
                const h = height - padding*2;
                const rateX = (x - left - w*0.5 - padding )/(w*0.5);
                const rateY = (y - top - h*0.5 - padding)/(h*0.5);
                switch(props.mode){
                    default:
                    case ALL_DIR_STICK_MODE: return { rateX:borderRate(rateX), rateY:borderRate(rateY), mode:props.mode, padding }
                    case VERTICAL_STICK_MODE: return { rateX:0, rateY:borderRate(rateY), mode:props.mode, padding }
                    case HORIZONTAL_STICK_MODE: return { rateX:borderRate(rateX), rateY:0, mode:props.mode, padding }
                }
                
            })
            .startWith(props)
        )
        .flatten()
        .remember();
}

function view(state$) {
    return (state$.map(({ rateX, rateY, mode, padding }) =>
        <div className={"stick-base "+modeToClasses(mode)}>
            <div className="stick-decorator-1"></div>
            <div className="stick-decorator-2"></div>
            <div className="stick-button" style={{ left: `calc(50% + ${rateX} * (50% - ${padding}px))`, top: `calc(50% + ${rateY} * (50% - ${padding}px))` }}></div>
        </div>
    ))
}

export function Stick({ DOM, props$ = xs.of({})}) {
    const defaultProps$ = xs.of({ rateX: 0, rateY: 0, mode: ALL_DIR_STICK_MODE,padding: 16 });
    const newProps$ = xs.combine( defaultProps$, props$ ).map(([a,b]) => ({...a,...b})).debug()
    const action$ = intent(DOM);
    const state$ = model(action$, newProps$);
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