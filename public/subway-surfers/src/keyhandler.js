// Keyboard state. Endless-runner overhaul: no console spam, supports
// Arrow keys, WASD, Space (jump), Down/S (slide), Up/W (jump).
$(document).keydown(function(event){
  statusKeys[event.keyCode] = true;
});
$(document).keyup(function(event){
  statusKeys[event.keyCode] = false;
});
