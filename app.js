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

function rand(from, to){
  return Math.floor(Math.random() * (to - from + 1) + from);
}

var member_autoinc = 0;

var Member = function(id){
  this.id = id;
  this.name = "User: " + (++member_autoinc);
  this.score = 0;
}

var Room = function(name, sign, calculate){
  var members = {}; // keyed list of Member objects (socket.id -> Member)
  var problem = {
    sign: sign
  }
  
  function generate(){
    problem.a = rand(-10, 15);
    problem.b = rand(-10, 15);
    problem.id = rand(0, 999999999);
    problem.answer = calculate(problem.a, problem.b);
  }
  generate();
  
  function isMember(member_id){
    return (member_id in members);
  }
  
  function renameMember(member_id, name){
    members[member_id].name = name;
  }
  
  function addMember(member){
    member.score = 0;
    members[member.id] = member;
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
  
  function checkAnswer(member_id, problem_id, answer){
    if(problem_id != problem.id) return false;
    
    if(answer == problem.answer){
      members[member_id].score++;
      generate();
      return true;
    }
    members[member_id].score--;
    return false;
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
    checkAnswer: checkAnswer,
    toJSON: toJSON
  }
};

var rooms = {
  addition: new Room('Addition', '+', function(a, b){
    return a + b;
  }),
  subtraction: new Room('Subtraction', '-', function(a, b){
    return a - b;
  }),
  multiplication: new Room('Multiplication', 'x', function(a, b){
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
  
  socket.on('name', function(name, next){
    if(name.length == 0 || name.length > 14){
      socket.emit('error', 'Username too ' + (name.length == 0 ? 'short' : 'long') + '!');
      return;
    }
    socket.set('name', name, function(){
      socket.get('room', function(err, room){
        rooms[room].renameMember(socket.id, name);
        broadcast(room);
        emit(room);
        if(next) next();
      });
    });
  });
  
  socket.on('join', function(room, next){
    if(!(room in rooms)){
      socket.emit('error', 'Invalid Room');
      return;
    }
    socket.get('room', function(err, previous){
      if(err){
        socket.emit('error', err);
        return;
      }
      var member;
      if(previous){
        socket.leave(previous);
        member = rooms[previous].removeMember(socket.id);
        broadcast(previous); // Tell everyone else we left
      } else {
        member = new Member(socket.id);
      }
      socket.emit('identify', member.name);
      socket.set('room', room, function(){
        socket.join(room);
        rooms[room].addMember(member);
        emit(room); // Update our current socket
        broadcast(room); // Tell everyone else we joined
        if(next) next();
      });
    });
  });
  
  socket.on('disconnect', function(){
    socket.get('room', function(err, room){
      if(err){
        socket.emit('error', err);
      } else if(!room){
        socket.emit('error', 'No Room');
      } else {
        rooms[room].removeMember(socket.id);
        broadcast(room); // Tell everyone else we left
      }
    });
  });
  
  socket.on('answer', function(problem_id, answer, correct){
    socket.get('room', function(err, room){
      if(err){
        socket.emit('error', err);
      } else if(!room){
        socket.emit('error', 'No Room');
      } else {
        // Check answer, update member, and call client fn
        correct(rooms[room].checkAnswer(socket.id, problem_id, answer));
        
        broadcast(room);
        emit(room);
      }
    });
  });
});

console.log('Server is running on port %d...', port);

