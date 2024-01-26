const express = require('express');
const expressWs = require('express-ws');
require('dotenv').config();

const app = express();
expressWs(app);

// Global variables for the server
let enemies = [];
let playerSpawnPoints = [];
let clients = [];

app.ws('/api/socket', (ws, req) => {
  console.log('A user connected');

  let currentPlayer = {};
  currentPlayer.name = 'unknown';

  ws.on('message', data => {
    console.log('Message from client:', data);
    ws.send(`Server: ${data}`);
  });

  ws.on('close', () => {
    console.log('A user disconnected');
  });

  ws.on('player connect', () => {
    console.log(currentPlayer.name + ' recv: player connect');
    for (let i = 0; i < clients.length; i++) {
      const playerConnected = {
        name: clients[i].name,
        position: clients[i].position,
        rotation: clients[i].position,
        health: clients[i].health,
      };
      ws.emit('other player connected', playerConnected);
      console.log(currentPlayer.name + ' emit: other player connected: ' + JSON.stringify(playerConnected));
    }
  });

  ws.on('play', data => {
    console.log(currentPlayer.name + ' recv: play: ' + JSON.stringify(data));
    if (clients.length === 0) {
      const numberOfEnemies = data.enemySpawnPoints.length;
      enemies = [];
      data.enemySpawnPoints.forEach(enemySpawnPoint => {
        const enemy = {
          name: guid(),
          position: enemySpawnPoint.position,
          rotation: enemySpawnPoint.rotation,
          health: 100,
        };
        enemies.push(enemy);
      });

      playerSpawnPoints = [];
      data.playerSpawnPoints.forEach(_playerSpawnPoint => {
        const playerSpawnPoint = {
          position: _playerSpawnPoint.position,
          rotation: _playerSpawnPoint.rotation,
        };
        playerSpawnPoints.push(playerSpawnPoint);
      });
    }

    const enemiesResponse = {
      enemies: enemies,
    };

    console.log(currentPlayer.name + ' emit: enemies: ' + JSON.stringify(enemiesResponse));
    ws.emit('enemies', enemiesResponse);

    const randomSpawnPoint = playerSpawnPoints[Math.floor(Math.random() * playerSpawnPoints.length)];

    currentPlayer = {
      name: data.name,
      position: randomSpawnPoint.position,
      rotation: randomSpawnPoint.rotation,
      health: 100,
    };

    clients.push(currentPlayer);

    console.log(currentPlayer.name + ' emit: play: ' + JSON.stringify(currentPlayer));
    ws.emit('play', currentPlayer);

    ws.broadcast.emit('other player connected', currentPlayer);
  });

  ws.on('player move', data => {
    console.log('recv: move: ' + JSON.stringify(data));
    currentPlayer.position = data.position;
    ws.broadcast.emit('player move', currentPlayer);
  });

  ws.on('player turn', data => {
    console.log('recv: turn: ' + JSON.stringify(data));
    currentPlayer.rotation = data.rotation;
    ws.broadcast.emit('player turn', currentPlayer);
  });

  ws.on('player shoot', () => {
    console.log(currentPlayer.name + ' recv: shoot');
    const data = {
      name: currentPlayer.name,
    };
    console.log(currentPlayer.name + ' bcst: shoot: ' + JSON.stringify(data));
    ws.emit('player shoot', data);
    ws.broadcast.emit('player shoot', data);
  });

  ws.on('health', data => {
    console.log(currentPlayer.name + ' recv: health: ' + JSON.stringify(data));

    if (data.from === currentPlayer.name) {
      let indexDamaged = 0;

      if (!data.isEnemy) {
        clients = clients.map((client, index) => {
          if (client.name === data.name) {
            indexDamaged = index;
            client.health -= data.healthChange;
          }
          return client;
        });
      } else {
        enemies = enemies.map((enemy, index) => {
          if (enemy.name === data.name) {
            indexDamaged = index;
            enemy.health -= data.healthChange;
          }
          return enemy;
        });
      }

      const response = {
        name: !data.isEnemy ? clients[indexDamaged].name : enemies[indexDamaged].name,
        health: !data.isEnemy ? clients[indexDamaged].health : enemies[indexDamaged].health,
      };

      console.log(currentPlayer.name + ' bcst: health: ' + JSON.stringify(response));
      ws.emit('health', response);
      ws.broadcast.emit('health', response);
    }
  });

  ws.on('disconnect', () => {
    console.log(currentPlayer.name + ' recv: disconnect ' + currentPlayer.name);
    ws.broadcast.emit('other player disconnected', currentPlayer);
    console.log(currentPlayer.name + ' bcst: other player disconnected ' + JSON.stringify(currentPlayer));

    for (let i = 0; i < clients.length; i++) {
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
console.log(process.env.PORT);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
