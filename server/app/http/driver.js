import xs from 'xstream';
import switchPath from 'switch-path';
import _ from 'lodash';
import vdom from './vdom';
import { createResponseWrapper } from './response';

function createHTTPListenerProducer(http, { port, hostname, backlog, options }) {
    let _listener = null;

    return {
        start(listener) {
            _listener = () => listener.next();
            http.listen(port, hostname, backlog, _listener);
        },
        stop() {

        }
    }
}

function applyMiddlewares(middlewares,req,res){

    return new Promise((resolve,reject)=>{

        const size = middlewares?middlewares.length:0;
        let i = -1;

        function next(){
            i++;
            if(i < size ){
                middlewares[i](req,res,next);
            }else{
                resolve();
            }
        }

        next();
    })
}

export default function makeHttpServerDriver({ middlewares=[], render=vdom() } = {}) {

    return function httpServerDriver(input$) {

        input$.addListener({
            next({ res, content, headers = null, statusCode = 200, statusMessage = null }) {
                res.writeHead(statusCode, statusMessage || '', headers);
                res.end(content);
            },
            complete() {

            },
            error() {

            }
        })

        const routes = {};
        const http = require('http').createServer((req, res) => {
            applyMiddlewares(middlewares,req,res).then(()=>{
                 const { path, value } = switchPath(req.url, routes);
                if (value && value(req, createResponseWrapper(res,render))) {

                } else {
                    if (routes['*']) {
                        routes['*'](req, createResponseWrapper(res,render));
                    } else {
                        // 404
                        res.writeHead(404);
                        res.end(`${req.url} not found`);
                    }
                }
            });
        })

        const RE_PARAMS = /:([a-z0-9]+)/ig;
        const RE_PARAMS_2 = /:([a-z0-9]+)/ig;

        function _match(path, methods = '*') {
            return xs.create({
                start(listener) {

                    function _send(req, res, params) {
                        const valid = methods === '*' || req.method === methods || (Array.isArray(methods) && methods.indexOf(req.method) >= 0)
                        if (valid) listener.next({ req, res, params });
                        return valid;
                    }

                    RE_PARAMS.lastIndex = 0;
                    if (RE_PARAMS.test(path)) {
                        RE_PARAMS.lastIndex = 0;
                        const keys = [];
                        let key = null
                        while (key = RE_PARAMS.exec(path)) {
                            keys.push(key[1]);
                        }

                        routes[path] = (...params) => (req, res) => _send(req, res, _.zipObject(keys, params));
                    } else {
                        routes[path] = (req, res) => _send(req, res, null);
                    }

                },
                stop() {
                    delete routes[path];
                }
            })
        }

        return {
            match: _match,
            notFound() {
                return _match('*');
            },
            get(path, methods = []) {
                return _match(path, ['GET', ...methods]);
            },
            post(path) {
                return _match(path, ['POST', ...methods]);
            },
            listen({ port, hostname, backlog }) {
                return xs.create(createHTTPListenerProducer(http, { port, hostname, backlog }))
            }
        }
    }
}
