import xs from 'xstream';
import switchPath from 'switch-path';
import _ from 'lodash';

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

function createResponseWrapper(res) {

    function _send(content, { statusCode=200, headers=null, statusMessage=null }={}) {
        return {
            res,
            content,
            headers,
            statusCode,
            statusMessage
        }
    }

    return {
        send:_send,
        toJson(content, { statusCode=200, headers = null, statusMessage=null }={}) {
            return _send(content, {
                statusCode,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                statusMessage
            });
        },
        toHtml(content, { statusCode=200, headers = null, statusMessage=null }={}) {
             return _send(content, {
                statusCode,
                headers: {
                    'Content-Type': 'text/html',
                    ...headers
                },
                statusMessage
            });
        },
        toText(content, { statusCode=200, headers = null, statusMessage=null }={}) {
             return _send(content, {
                statusCode,
                headers: {
                    'Content-Type': 'text/plain',
                    ...headers
                },
                statusMessage
            });
        },
        redirect(path){

        }
    }
}

export default function makeHttpServerDriver() {
    return function httpServerDriver(input$) {

        input$.addListener({
            next({ res, content, header = null, statusCode = 200, statusMessage = null }) {
                res.writeHead(statusCode, statusMessage, header);
                res.end(content);
            },
            complete() {

            },
            error() {

            }
        })

        const routes = {};
        const http = require('http').createServer((req, res) => {
            const { path, value } = switchPath(req.url, routes);
            if (value) {
                //console.log(res);
                value(req, createResponseWrapper(res));
            } else {
                // 404
                res.writeHead(404);
                res.end(`${req.url} not found`);
            }


        })

        const RE_PARAMS = /:([a-z0-9]+)/ig;
        const RE_PARAMS_2 = /:([a-z0-9]+)/ig;

        function _match(path) {
            return xs.create({
                start(listener) {
                    RE_PARAMS.lastIndex = 0;
                    if (RE_PARAMS.test(path)) {
                        RE_PARAMS.lastIndex = 0;
                        const keys = [];
                        let key = null
                        while (key = RE_PARAMS.exec(path)) {
                            keys.push(key[1]);
                        }

                        routes[path] = (...params) => (req, res) => listener.next({ req, res, params: _.zipObject(keys, params) });
                    } else {
                        routes[path] = (req, res) => listener.next({ req, res, params: null });
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
            get(path) {

            },
            post(path) {

            },
            listen({ port, hostname, backlog }) {
                return xs.create(createHTTPListenerProducer(http, { port, hostname, backlog }))
            }
        }
    }
}
