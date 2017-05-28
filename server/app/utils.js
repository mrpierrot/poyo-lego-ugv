import { html } from 'snabbdom-jsx';
import xs from 'xstream';

export function htmlBoilerplate(content, title, head) {
    return (
        <html>
            <head>
                <title>title</title>
                <meta charset="utf-8" />
                <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width, height=device-height, target-densitydpi=device-dpi"/>
                <link rel="stylesheet" href="/app.css" />
                {head}
            </head>
            <body>
                {content}
            </body>
        </html>
    );
} 

export function dnsDriver(){

    return {
        getCurrentAddress(){
            return xs.create({
                start(listener){
                    require('dns').lookup(require('os').hostname(), function (err, add, fam) {
                        if(err){
                            listener.error(err);
                        }else{
                            listener.next(add);
                            listener.complete();
                        }
                    });
                },
                stop(){

                }
            })
        }
    }
}