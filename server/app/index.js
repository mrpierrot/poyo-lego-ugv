const server = require('./server');
const port = process.env.PORT || 3333;
server.startServer(port,'./public',(data)=>{
    if(data){
        const {httpPort,httpsPort} = data;
        console.log(`Server http running on ${httpPort}`);
        console.log(`Server https running on ${httpsPort}`);
    }
})
