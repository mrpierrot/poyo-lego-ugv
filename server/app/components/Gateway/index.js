
import xs from 'xstream';
import { html } from 'snabbdom-jsx';
import {htmlBoilerplate} from '../../utils';


function intent(path,httpServer){
    return  httpServer.get(path);
}

function model(action$,props$){
    return props$.map(
            (props) => action$.map(
                ({res}) => ({localIpUrl:props.localIpUrl,res})
            )
        ).flatten().remember();
}

function view(model$){
    return model$.map(({localIpUrl,res})=>
        res.render(htmlBoilerplate(
            <div>
                <a href={`${localIpUrl}/app`}>GO</a>
            </div>
            ),{beforeContent:"<!DOCTYPE html>"}
        )
    );
}

export default function Gateway(path,{httpServer,props$=xs.of({localIpUrl:null})}){

    const action$ = intent(path,httpServer);
    const model$ = model(action$,props$);
    const view$ = view(model$);

    const sinks = {
        httpServer:view$ 
    }
    return sinks;
}