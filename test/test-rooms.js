var should = require('should');
var io = require('socket.io-client');
var url = 'http://localhost:8080';
var options = {
  'transports': ['websocket'],
  'force new connection': true
};

describe('Room Members', function(){
  it('Should accept valid rooms', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'addition', function(){
        client.emit('join', 'subtraction', function(){
          client.emit('join', 'multiplication', function(){
            client.disconnect();
            done();
          });
        });
      });
    });
  });
  
  it('Should reject invalid rooms', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      // four invalid rooms
      client.emit('join', '123');
      client.emit('join', 'Addition');
      client.emit('join', '');
      client.emit('join', false);
      
      // one valid room
      client.emit('join', 'addition');
      
      var invalid_rooms = 0;
      client.on('error', function(err){
        err.should.equal('Invalid Room');
        if(++invalid_rooms == 4){
          client.disconnect();
          done();
        }
      });
    });
  });
  
  it('Shouldnt accept answers if not in a room', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('answer', '123', 12);
      client.on('error', function(err){
        client.disconnect();
        err.should.equal('No Room');
        done();
      });
    });
  });
  
  it('Should generate Addition problem', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'addition');
      client.on('state', function(state){
        client.disconnect();
        state.problem.sign.should.equal('+');
        state.problem.answer.should.equal(state.problem.a + state.problem.b);
        done();
      });
    });
  });
  
  it('Should generate Subtraction problem', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'subtraction');
      client.on('state', function(state){
        client.disconnect();
        state.problem.sign.should.equal('-');
        state.problem.answer.should.equal(state.problem.a - state.problem.b);
        done();
      });
    });
  });
  
  it('Should generate Multiplication problem', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'multiplication');
      client.on('state', function(state){
        client.disconnect();
        state.problem.sign.should.equal('x');
        state.problem.answer.should.equal(state.problem.a * state.problem.b);
        done();
      });
    });
  });
  
  it('Should create a new anonymous member', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'addition');
      client.on('state', function(state){
        client.disconnect();
        state.leaderboard.length.should.equal(1);
        state.leaderboard[0].name.substr(0, 6).should.equal('User: ');
        done();
      });
    });
  });
  
  it('Should rename member in room', function(done){
    var client = io.connect(url, options);
    var name = 'NEW NAME';
    client.on('connect', function(data){
      client.emit('join', 'addition', function(){
        client.emit('name', name);
        client.on('state', function(state){
          client.disconnect();
          state.leaderboard.length.should.equal(1);
          state.leaderboard[0].name.should.equal(name);
          done();
        });
      });
    });
  });
  
  it('Should change rooms', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'addition', function(){
        client.emit('join', 'subtraction');
      });
      
      var state_num = 0;
      client.on('state', function(state){
        state_num++;
        if(state_num == 1){
          state.name.should.equal('Addition');
        } else if(state_num == 2){
          state.name.should.equal('Subtraction');
          client.disconnect();
          done();
        }
      })
    });
  });
  
  it('Should show previous connections in leaderboard', function(done){
    var client1 = io.connect(url, options);
    client1.on('connect', function(data){
      client1.emit('join', 'addition', function(){
        var client2 = io.connect(url, options);
        client2.on('connect', function(data){
          client2.emit('join', 'addition', function(){
            var client3 = io.connect(url, options);
            client3.on('connect', function(data){
              client3.emit('join', 'addition');
              client3.on('state', function(state){
                state.leaderboard.length.should.equal(3);
                client3.disconnect();
                client2.disconnect();
                client1.disconnect();
                done();
              });
            });
          });
        });
      });
    });
  });
  
});