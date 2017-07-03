export default function NotFound(sources) {

    const { request$ } = sources;
    const view$ = request$.map( req => req.response.text(`404 url '${req.url}' not found`, { statusCode: 404 }));

    const sinks = {
        httpResponse: view$
    }
    return sinks;
}