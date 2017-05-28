
import xs from 'xstream';
import { html } from 'snabbdom-jsx';
import {htmlBoilerplate} from '../../utils';


function intent(path,router){
    return  router.get(path);
}

function model(action$,props$){
    return props$.map(
            (props) => action$.map(
                ({res}) => ({appPath:props.appPath,res})
            )
        ).flatten().remember();
}

function view(model$){
    return model$.map(({appPath,res})=>
        res.render(htmlBoilerplate(
            <div>
                <a href={appPath}>GO</a>
            </div>
            ),{beforeContent:"<!DOCTYPE html>"}
        )
    );
}

export default function Gateway(path,{router,props$=xs.of({appPath:null})}){

    const action$ = intent(path,router);
    const model$ = model(action$,props$);
    const view$ = view(model$);

    const sinks = {
        router:view$ 
    }
    return sinks;
}