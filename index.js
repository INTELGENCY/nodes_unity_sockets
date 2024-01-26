var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
require('dotenv').config();
// global variables for the server
var enemies = [];
var playerSpawnPoints = [];
var clients = [];
const PORT = process.env.PORT || 3001;
server.listen(PORT);

io.on('connection', function (socket) {
  console.log('connected');
  var currentPlayer = {};
  currentPlayer.name = 'unknown';
  socket.on('player connect', function () {
    for (var i = 0; i < clients.length; i++) {
      var playerConnected = {
        name: clients[i].name,
        position: clients[i].position,
        rotation: clients[i].position,
        health: clients[i].health,
      };
      // in your current game, we need to tell you about the other players.
      socket.emit('other player connected', playerConnected);
    }
  });
  socket.on('play', function (data) {
    // if this is the first person to join the game init the enemies
    if (clients.length === 0) {
      numberOfEnemies = data.enemySpawnPoints.length;
      enemies = [];
      data.enemySpawnPoints.forEach(function (enemySpawnPoint) {
        var enemy = {
          name: guid(),
          position: enemySpawnPoint.position,
          rotation: enemySpawnPoint.rotation,
          health: 100,
        };
        enemies.push(enemy);
      });
      playerSpawnPoints = [];
      data.playerSpawnPoints.forEach(function (_playerSpawnPoint) {
        var playerSpawnPoint = {
          position: _playerSpawnPoint.position,
          rotation: _playerSpawnPoint.rotation,
        };
        playerSpawnPoints.push(playerSpawnPoint);
      });
    }
    var enemiesResponse = {
      enemies: enemies,
    };
    // we always will send the enemies when the player joins
    socket.emit('enemies', enemiesResponse);
    var randomSpawnPoint = playerSpawnPoints[Math.floor(Math.random() * playerSpawnPoints.length)];
    currentPlayer = {
      name: data.name,
      position: randomSpawnPoint.position,
      rotation: randomSpawnPoint.rotation,
      health: 100,
    };
    clients.push(currentPlayer);
    // in your current game, tell you that you have joined
    socket.emit('play', currentPlayer);
    // in your current game, we need to tell the other players about you.
    socket.broadcast.emit('other player connected', currentPlayer);
  });
  socket.on('player move', function (data) {
    currentPlayer.position = data.position;
    socket.broadcast.emit('player move', currentPlayer);
  });
  socket.on('player turn', function (data) {
    currentPlayer.rotation = data.rotation;
    socket.broadcast.emit('player turn', currentPlayer);
  });
  socket.on('player shoot', function () {
    var data = {
      name: currentPlayer.name,
    };
    socket.emit('player shoot', data);
    socket.broadcast.emit('player shoot', data);
  });
  socket.on('health', function (data) {
    // only change the health once, we can do this by checking the originating player
    if (data.from === currentPlayer.name) {
      var indexDamaged = 0;
      if (!data.isEnemy) {
        clients = clients.map(function (client, index) {
          if (client.name === data.name) {
            indexDamaged = index;
            client.health -= data.healthChange;
          }
          return client;
        });
      } else {
        enemies = enemies.map(function (enemy, index) {
          if (enemy.name === data.name) {
            indexDamaged = index;
            enemy.health -= data.healthChange;
          }
          return enemy;
        });
      }
      var response = {
        name: !data.isEnemy ? clients[indexDamaged].name : enemies[indexDamaged].name,
        health: !data.isEnemy ? clients[indexDamaged].health : enemies[indexDamaged].health,
      };
      socket.emit('health', response);
      socket.broadcast.emit('health', response);
    }
  });
  socket.on('disconnect', function () {
    socket.broadcast.emit('other player disconnected', currentPlayer);
    for (var i = 0; i < clients.length; i++) {
      if (clients[i].name === currentPlayer.name) {
        clients.splice(i, 1);
      }
    }
  });
});
console.log('--- server is running ...');
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
