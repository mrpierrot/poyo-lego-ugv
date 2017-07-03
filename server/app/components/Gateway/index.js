
import xs from 'xstream';
import { html } from 'snabbdom-jsx';
import { htmlBoilerplate } from '../../utils';


function intent(request$) {
    return request$.map( req => req.response);
}

function model(action$, props$) {
    return props$.map(
        (props) => action$.map(
            (res) => ({ appPath: props.appPath, res })
        )
    ).flatten();
}

function view(model$) {
    return model$.map(({ appPath, res }) =>
        res.render(htmlBoilerplate(
            <div>
                <a href={appPath}>GO</a>
            </div>
        ), { beforeContent: "<!DOCTYPE html>" }
        )
    );
}

export default function Gateway(sources) {

    const { request$, props$ = xs.of({ appPath: null }) } = sources;
    const action$ = intent(request$);
    const model$ = model(action$, props$);
    const view$ = view(model$);

    const sinks = {
        httpResponse: view$
    }
    return sinks;
}