var socket = io.connect('http://' + document.location.host);

$(function(){
  $('.rooms a').click(function(){
    if($(this).hasClass('current')) return;
    $('.rooms a').removeClass('current');
    $(this).addClass('current')
    var room = $(this).attr('id');
    socket.emit('join', room);
  });
  
  $('.rooms a:eq(0)').trigger('click'); // Join first room (Addition)
  
  $('#rename').submit(function(){
    var name = $('#rename input').val();
    socket.emit('name', name, function(){
      $.cookie('name', name);
    });
    return false;
  });
  
  $('#answer').submit(function(){
    $('#answer input').focus();
    var answer = $('#answer input').val();
    if(answer.length == 0) return false;
    var current = previous_problem;
    socket.emit('answer', current.id, answer, function(correct){
      $.notify(current.a + ' ' + current.sign + ' ' + current.b + (correct ? ' = ' : " isn't ") + answer, {
        style: correct ? 'correct' : 'incorrect',
        autoHideDelay: 4000,
        className: correct ? 'correct' : 'incorrect'
      });
    });
    return false;
  });
  
  socket.on('connect', function(){
    socket.id = socket.socket.sessionid;
  });
  
  socket.on('error', function(err){
    alert('error: ' + err);
  });
  
  socket.on('identify', function(name){
    $('#rename input').val(name);
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
      $('#problem_a').text(state.problem.a);
      $('#problem_sign').text(state.problem.sign);
      $('#problem_b').text(state.problem.b);
      $('#answer input').val('').focus();
    }
    
    // Redraw leaderboard if it changes
    if(!same_leaderboard(state.leaderboard, previous_leaderboard)){
      $('#leaderboard').empty();
      $(state.leaderboard).each(function(i, member){
        $('#leaderboard').append('<li ' + (member.id == socket.id ? 'class="you"' : '') + '><span class="score">' + member.score + '</span>' + member.name + '</li>');
      });
    }
  });
});

$.notify.addStyle('correct', {
  html: '<div><h3>Correct</h3><div data-notify-text /></div>'
});

$.notify.addStyle('incorrect', {
  html: '<div><h3>Incorrect</h3><div data-notify-text /></div>'
});

