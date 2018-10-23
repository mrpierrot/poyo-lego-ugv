
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


const layoutStyles = {
    width: "100vw",
    height: "100vh",
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center",
    flexDirection: "column"
}

const buttonStyles = {
    textDecoration: "none",
    fontSize: "3rem",
    color: "white",
    fontWeight: "bold",
    backgroundColor: "darkgray",
    padding:"1rem",
    borderRadius: "1rem",
    boxShadow: "5px 5px 0px 0px rgba(99, 137, 222, 0.36)"
}

const titleStyle = {
    paddingBottom: "1rem",
    fontSize: "1.5rem"
}

function view(model$) {
    return model$.map(({ appPath, res }) =>
        res.render(htmlBoilerplate(
            <div style={layoutStyles}>
                <div style={titleStyle}>Poyo</div>
                <a style={buttonStyles} href={appPath} >GO</a>
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