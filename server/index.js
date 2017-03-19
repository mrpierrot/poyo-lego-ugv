const server = require('./server');

server.startServer(process.env.PORT || 3333,'./public',()=>{
    console.log('server started');  
})