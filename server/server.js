const express = require('express');

exports.startServer = (port, path, callback)=>{
    const app = express();
    const http = require('http').Server(app);
    const io = require('socket.io')(http);
    const publicPath = __dirname +'/'+ path;

    console.log("path : "+path);

    app.use(express.static(publicPath));

    app.get('/', function(req, res){
        res.sendFile(publicPath+'/index.html');
    });

    io.on('connection', (socket) => {
        console.log('a user connected'); 
        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });

    http.listen(port, callback); 
};

