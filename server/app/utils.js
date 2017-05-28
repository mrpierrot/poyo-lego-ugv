import { html } from 'snabbdom-jsx';

export function htmlBoilerplate(content, title, head) {
    return (
        <html>
            <head>
                <title>title</title>
                {head}
            </head>
            <body>
                {content}
            </body>
        </html>
    );
}