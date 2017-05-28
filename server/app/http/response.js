
export function createResponseWrapper(res) {

    function _send(content, { statusCode = 200, headers = null, statusMessage = null } = {}) {
        return {
            res,
            content,
            headers,
            statusCode,
            statusMessage
        }
    }

    return {
        send: _send,
        json(content, { statusCode = 200, headers = null, statusMessage = null } = {}) {
            return _send(content, {
                statusCode,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                statusMessage
            });
        },
        html(content, { statusCode = 200, headers = null, statusMessage = null } = {}) {
            return _send(content, {
                statusCode,
                headers: {
                    'Content-Type': 'text/html',
                    ...headers
                },
                statusMessage
            });
        },
        text(content, { statusCode = 200, headers = null, statusMessage = null } = {}) {
            return _send(content, {
                statusCode,
                headers: {
                    'Content-Type': 'text/plain',
                    ...headers
                },
                statusMessage
            });
        },
        redirect(path, { statusCode = 302, headers = null, statusMessage = null } = {}) {
            return _send(null, {
                statusCode,
                headers: {
                    'Location': path,
                    ...headers
                },
                statusMessage
            });
        }
    }
}
