var express = require('express');
var __ = require('underscore');

var app = express();
var port = 8080;
var server = app.listen(port);
var io = require('socket.io').listen(server);

// Public assets
app.use("/styles", express.static(__dirname + '/public/styles'));
app.use("/scripts", express.static(__dirname + '/public/scripts'));

// Static app
app.get('/', function(req, res){
  res.sendfile(__dirname + '/public/index.html');
});

// Minimal Logging
io.set('log level', 2);

// Prioritize sockets over xhr
io.set('transports', [ 'websocket', 'xhr-polling' ]);

var Member = function(id){
  this.id = id;
  this.name = "";
  this.score = 0;
}

var Room = function(name, calculate){
  var members = {}; // keyed list of Member objects (socket.id -> Member)
  var problem = {} // object with a, b, answer properties
  
  function rand(from, to){
    return Math.floor(Math.random() * (to - from + 1) + from);
  }
  
  function generate(){
    problem.a = rand(-5, 15);
    problem.b = rand(-5, 15);
    problem.answer = calculate(problem.a, problem.b);
    console.log(name, problem);
  }
  generate();
  
  function isMember(member_id){
    return (member_id in members);
  }
  
  function renameMember(member_id, name){
    members[member_id].name = name;
  }
  
  function addMember(member){
    members[member.id] = member;
    member.score = 0;
  }
  
  function removeMember(member_id){
    var member = members[member_id];
    delete members[member_id];
    return member;
  }
  
  function leaderboard(){
    return __.sortBy(members, function(member){
      return -1 * member.score;
    });
  }
  
  function toJSON(){
    return {
      name: name,
      problem: problem,
      leaderboard: leaderboard()
    }
  }
  
  return {
    isMember: isMember,
    addMember: addMember,
    removeMember: removeMember,
    renameMember: renameMember,
    toJSON: toJSON
  }
};

var rooms = {
  addition: new Room('Addition', function(a, b){
    return a + b;
  }),
  subtraction: new Room('Subtraction', function(a, b){
    return a - b;
  }),
  multiplication: new Room('Multiplication', function(a, b){
    return a * b;
  })
}



io.sockets.on('connection', function(socket){
  
  function broadcast(room){
    socket.broadcast.to(room).emit('state', rooms[room].toJSON());
  }
  
  function emit(room){
    socket.emit('state', rooms[room].toJSON());
  }
  
  socket.on('name', function(name, ack){
    socket.set('name', name, function(){
      socket.get('room', function(err, room){
        rooms[room].renameMember(socket.id, name);
        broadcast(room);
        emit(room);
        //ack();
      });
    });
  });
  
  socket.on('join', function(room, ack){
    if(!(room in rooms)){
      socket.emit('error', 'Invald Room');
      return;
    }
    socket.get('room', function(err, previous){
      var member;
      if(previous){
        socket.leave(previous);
        member = rooms[previous].removeMember(socket.id);
        broadcast(previous); // Tell everyone else we left
      } else {
        member = new Member(socket.id);
      }
      socket.set('room', room, function(){
        socket.join(room);
        rooms[room].addMember(member);
        emit(room); // Update our current socket
        ack();
      });
    });
  });
  
  socket.on('disconnect', function(){
    socket.get('room', function(err, room){
      if(!room) return; // No room to broadcast to
      rooms[room].removeMember(socket.id);
      broadcast(room); // Tell everyone else we left
    });
  });
  
  socket.on('message', function(msg, ack) {
    socket.get('room', function(err, room) {
      if(err){
        socket.emit('error', err);
      }else if(room){
        socket.broadcast.to(room).emit('broadcast', msg);
        ack();
      }else{
        socket.emit('error', 'No Room');
      }
    });
  });
});

console.log('Server is running on port %d...', port);

