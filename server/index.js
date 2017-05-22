const server = require('./server');
const port = process.env.PORT || 3333;
server.startServer(port,'./public',()=>{
    console.log('https server started on port ',port);  
})