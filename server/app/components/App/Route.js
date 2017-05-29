
import xs from 'xstream';
import { html } from 'snabbdom-jsx';
import { htmlBoilerplate } from '../../utils';

function intent(path, router) {
    return router.get(path);
}

function model(action$, props$) {
    return props$.map(
        (props) => action$.map(
            ({ res }) => ({ socketUrl: props.socketUrl, res })
        )
    ).flatten();
}

function view(model$) {
    return model$.map(({ socketUrl, res }) =>
        res.render(htmlBoilerplate(
            <div>
                <div id="app"></div>
                <script src="/vendor.js"></script>
                <script src="/app.js"></script>
                <script>{`require('initialize').default({socketUrl:'${socketUrl}'});`}</script>
            </div>
        ), { beforeContent: "<!DOCTYPE html>" }
        )
    );
}

export default function Route(path, sources) {

    const { router, props$ = xs.of({ appPath: null }) } = sources;

    const action$ = intent(path, router);
    const model$ = model(action$, props$);
    const view$ = view(model$);

    const sinks = {
        router: view$,
    }
    return sinks;
}