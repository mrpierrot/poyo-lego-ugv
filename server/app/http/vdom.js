
const snabbdomInit = require('snabbdom-to-html/init');
const snabbdomModules = require('snabbdom-to-html/modules');

export default function vdom(modules=[
        snabbdomModules.class,
        snabbdomModules.props,
        snabbdomModules.attributes,
        snabbdomModules.style
    ]){
    return snabbdomInit(modules);
}
