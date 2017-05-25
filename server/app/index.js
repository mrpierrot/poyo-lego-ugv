const server = require('./server2');
const port = process.env.PORT || 3333;
server.startServer(port,'./public',()=>{
    console.log('https server started on port ',port);  
});



/*
import httpServerDriver from './http/driver';
import xs from 'xstream';

const http = httpServerDriver();

http.listen({port:4444}).addListener({
    next(){
        console.log('server started')
    },
    complete(){

    },
    error(){

    }
})*/
