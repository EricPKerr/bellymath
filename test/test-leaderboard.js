var should = require('should');
var __ = require('underscore');
var io = require('socket.io-client');
var url = 'http://localhost:8080';
var options = {
  'transports': ['websocket'],
  'force new connection': true
};

describe('Leaderboard', function(){
  it('Should validate correct answer', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'addition');
      client.on('state', function(state){
        client.emit('answer', state.problem.id, state.problem.a + state.problem.b, function(val){
          val.should.equal(true);
          client.disconnect();
          done();
        });
      });
    });
  });
  
  it('Should invalidate correct answer', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'addition');
      client.on('state', function(state){
        client.emit('answer', state.problem.id, state.problem.a + state.problem.b + 10, function(val){
          val.should.equal(false);
          client.disconnect();
          done();
        });
      });
    });
  });
  
  it('Should reject answer to incorrect problem', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'addition');
      client.on('state', function(state){
        client.emit('answer', state.problem.id + 10, state.problem.a + state.problem.b, function(val){
          val.should.equal(false);
          client.disconnect();
          done();
        });
      });
    });
  });
  
  it('Should increment users score on correct answer', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'addition');
      client.on('state', function(state){
        client.emit('answer', state.problem.id, state.problem.a + state.problem.b, function(val){
          val.should.equal(true);
          client.on('state', function(state){
            state.leaderboard.length.should.equal(1);
            state.leaderboard[0].score.should.equal(1);
            client.disconnect();
            done();
          });
        });
      });
    });
  });
  
  it('Should decrement users score on incorrect answer', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'addition');
      client.on('state', function(state){
        client.emit('answer', state.problem.id, state.problem.a + state.problem.b + 10, function(val){
          val.should.equal(false);
          client.on('state', function(state){
            state.leaderboard.length.should.equal(1);
            state.leaderboard[0].score.should.equal(-1);
            client.disconnect();
            done();
          });
        });
      });
    });
  });
  
  it('Should not change score when answering wrong/previous problem', function(done){
    var client = io.connect(url, options);
    client.on('connect', function(data){
      client.emit('join', 'addition');
      client.on('state', function(state){
        client.emit('answer', state.problem.id + 10, state.problem.a + state.problem.b, function(val){
          val.should.equal(false);
          client.on('state', function(state){
            state.leaderboard.length.should.equal(1);
            state.leaderboard[0].score.should.equal(0);
            client.disconnect();
            done();
          });
        });
      });
    });
  });
  
  it('Should update leaderboard when another client gets correct answer', function(done){
    var client1 = io.connect(url, options), client2;
    var client1_id, client2_id;
    
    client1.on('connect', function(data){
      client1_id = client1.socket.sessionid;
      client1.emit('join', 'addition', function(){
        client2 = io.connect(url, options);
        client2.on('connect', function(data){
          client2_id = client2.socket.sessionid;
          client2.emit('join', 'addition');
          client2.on('state', function(state){
            client2.emit('answer', state.problem.id, state.problem.a + state.problem.b, function(val){
              val.should.equal(true);
            });
          });
        });
      });
      
      var num_updates = 0;
      client1.on('state', function(state){
        num_updates++;
        if(state.leaderboard.length == 2){
          __.each(state.leaderboard, function(member, i){
            if(member.score == 1){
              member.id.should.equal(client2_id);
              i.should.equal(0);
              num_updates.should.equal(3); // When we join, when client2 joins, finally when client2 answers
              client2.disconnect();
              client1.disconnect();
              done();
            }
          });
        }
      })
    });
  });
  
  it('Should update leaderboard when another client changes rooms', function(done){
    var client1 = io.connect(url, options), client2;
    var client1_id, client2_id;
    
    client1.on('connect', function(data){
      client1_id = client1.socket.sessionid;
      client1.emit('join', 'addition', function(){
        client2 = io.connect(url, options);
        client2.on('connect', function(data){
          client2_id = client2.socket.sessionid;
          client2.emit('join', 'addition', function(){
            client2.emit('join', 'subtraction');
          });
        });
      });
      
      var num_states = 0;
      client1.on('state', function(state){
        num_states++;
        leaders = state.leaderboard, num_members = leaders.length;
        
        if(num_states == 1){
          num_members.should.equal(1);
          leaders[0].id.should.equal(client1_id);
        } else if(num_states == 2){
          num_members.should.equal(2);
          if(leaders[0].id == client1_id){
            leaders[1].id.should.equal(client2_id);
          } else if(leaders[0].id == client2_id){
            leaders[1].id.should.equal(client1_id);
          } else {
            throw "Invalid Leaderboard";
          }
        } else if(num_states == 3){
          num_members.should.equal(1);
          leaders[0].id.should.equal(client1_id);
          client2.disconnect();
          client1.disconnect();
          done();
        }
      });
    });
  });
  
  it('Should update leaderboard when another client disconnects', function(done){
    var client1 = io.connect(url, options), client2;
    var client1_id, client2_id;
    
    client1.on('connect', function(data){
      client1_id = client1.socket.sessionid;
      client1.emit('join', 'addition', function(){
        client2 = io.connect(url, options);
        client2.on('connect', function(data){
          client2_id = client2.socket.sessionid;
          client2.emit('join', 'addition', function(){
            client2.disconnect();
          });
        });
      });
      
      var num_states = 0;
      client1.on('state', function(state){
        num_states++;
        leaders = state.leaderboard, num_members = leaders.length;
        if(num_states == 1){
          num_members.should.equal(1);
          leaders[0].id.should.equal(client1_id);
        } else if(num_states == 2){
          num_members.should.equal(2);
          if(leaders[0].id == client1_id){
            leaders[1].id.should.equal(client2_id);
          } else if(leaders[0].id == client2_id){
            leaders[1].id.should.equal(client1_id);
          } else {
            throw "Invalid Leaderboard";
          }
        } else if(num_states == 3){
          num_members.should.equal(1);
          leaders[0].id.should.equal(client1_id);
          client2.disconnect();
          client1.disconnect();
          done();
        }
      });
    });
  });
});