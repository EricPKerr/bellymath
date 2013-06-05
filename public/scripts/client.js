var socket = io.connect('http://' + document.location.host);

var addMessage = function(msg) {
  $('<li>' + msg + '</li>').appendTo('#messages');
};

$(function(){
  $('.rooms a').click(function(){
    var room = $(this).attr('id');
    socket.emit('join', room, function(){
      alert('Joined: ' + room);
    });
  });
  
  $('.rooms a:eq(0)').trigger('click');
  
  $('#rename').click(function() {
    var name = $('#name').val();
    socket.emit('name', name);
  });
  
  socket.on('error', function(err){
    addMessage('error: ' + err);
  });
  
  socket.on('state', function(state){
    console.log(state);
  });
});
