var socket = io.connect('http://' + document.location.host);

$(function(){
  $('.rooms a').click(function(){
    $('.rooms a').removeClass('current');
    $(this).addClass('current')
    var room = $(this).attr('id');
    socket.emit('join', room);
  });
  
  $('.rooms a:eq(0)').trigger('click'); // Join first room (Addition)
  
  $('#rename').click(function() {
    var name = $('#name').val();
    socket.emit('name', name);
  });
  
  $('#guess').click(function(){
    $('#answer').focus();
    var answer = $('#answer').val();
    socket.emit('answer', answer, function(correct){
      console.log('CORRECT', correct);
    });
  });
  
  socket.on('connect', function(){
    socket.id = socket.socket.sessionid;
  });
  
  socket.on('error', function(err){
    alert('error: ' + err);
  });
  
  var previous_problem, previous_leaderboard;
  
  function same_problem(problem){
    if(!_.isEqual(problem, previous_problem)) {
      previous_problem = problem;
      return false;
    }
    return true;
  }
  
  function same_leaderboard(leaderboard){
    if(!_.isEqual(leaderboard, previous_leaderboard)) {
      previous_leaderboard = leaderboard;
      return false;
    }
    return true;
  }
  
  socket.on('state', function(state){
    // Redraw problem if it changes
    if(!same_problem(state.problem, previous_problem)){
      $('#problem').text(state.problem.a + ' ' + state.problem.sign + ' ' + state.problem.b);
      $('#answer').val('').focus();
    }
    
    // Redraw leaderboard if it changes
    if(!same_leaderboard(state.leaderboard, previous_leaderboard)){
      $('#leaderboard').empty();
      $(state.leaderboard).each(function(i, member){
        $('#leaderboard').append('<li ' + (member.id == socket.id ? 'class="you"' : '') + '>' + member.name + ' ' + member.score + '</li>');
      });
    }
  });
});
