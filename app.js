var express = require('express');

var app = express()
var server = app.listen(8080);
var io = require('socket.io').listen(server);

// Public assets
app.use("/styles", express.static(__dirname + '/public/styles'));
app.use("/scripts", express.static(__dirname + '/public/scripts'));
app.use("/images", express.static(__dirname + '/public/images'));

app.get('/', function(req, res){
  res.sendfile(__dirname + '/public/index.html');
});

// Prioritize sockets over xhr
io.configure(function(){
  io.set('transports', ['websocket', 'xhr-polling']);
});

io.configure('production', function(){
  io.set('log level', 1);
});

io.sockets.on('connection', function(socket){
  socket.on('join', function(channel, ack) {
    socket.get('channel', function(err, oldChannel){
      if(oldChannel){
        socket.leave(oldChannel);
      }
      socket.set('channel', channel, function(){
        socket.join(channel);
        ack();
      });
    });
  });
  
  socket.on('message', function(msg, ack) {
    socket.get('channel', function(err, channel) {
      if(err){
        socket.emit('error', err);
      }else if(channel){
        socket.broadcast.to(channel).emit('broadcast', msg);
        ack();
      }else{
        socket.emit('error', 'no channel');
      }
    });
  });
});

