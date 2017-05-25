import xs from 'xstream';
import switchPath from 'switch-path';

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

function createHTTPRequestProducer(http) {
    let _listener = null;

    return {
        start(listener) {
            _listener = (req, res) => {
                listener.next()
            };
            http.createServer(_listener)
        },
        stop() {

        }
    }
}

export default function makeHttpServerDriver() {
    return function httpServerDriver(input$) {

        input$.addListener({
            next({req,res,content}) {

                res.end(content)
            },
            complete() {

            },
            error() {

            }
        })

        const routes = {};
        const http = require('http').createServer((req, res) => {
            const { path, value } = switchPath(req.url, routes);
            value(req,res);

        })

        return {
            match(path) {
                return xs.create({
                    start(listener) {
                        routes[path] = (req, res) => listener.next({req, res});
                    },
                    stop() {
                        delete routes[path];
                    }
                })

            },
            get(path){

            },
            post(path) {

            },
            listen({ port, hostname, backlog }) {
                return xs.create(createHTTPListenerProducer(http, { port, hostname, backlog }))
            }
        }
    }
}
