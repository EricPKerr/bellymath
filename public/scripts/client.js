var socket = io.connect('http://' + document.location.host);

var addMessage = function(msg) {
  $('<li>' + msg + '</li>').appendTo('#messages');
};

$(function(){
  $('.rooms a').click(function(){
    var room = $(this).attr('id');
    socket.emit('join', room);
  });
  
  $('.rooms a:eq(0)').trigger('click');
  
  $('#rename').click(function() {
    var name = $('#name').val();
    socket.emit('name', name);
  });
  
  $('#guess').click(function(){
    var answer = $('#answer').val();
    socket.emit('answer', answer, function(correct){
      console.log('CORRECT', correct);
    });
  });
  
  socket.on('error', function(err){
    alert('error: ' + err);
  });
  
  socket.on('state', function(state){
    console.log(state);
    $('#problem').text(state.problem.a + ' ' + state.problem.sign + ' ' + state.problem.b);
    $('#leaderboard').empty();
    $(state.leaderboard).each(function(i, member){
      console.log(member.name + ' ' + member.score);
      $('#leaderboard').append('<li>' + member.name + ' ' + member.score + '</li>');
    });
  });
});
