'use strict';

const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 8080 });
const clients = new Map();

wss.on('listening', function listening() {
  console.log('Web Socket server is listening on localhost:8080');
});

wss.on('connection', function connection(ws) {
  console.log('connected');

  ws.on('error', function error(err) {
    console.error(err);

    clients.delete(ws.clientName);

    ws.removeAllListeners();
    ws.on('error', function suppress() {});
    ws.terminate();
  });

  ws.on('close', function close() {
    console.log('disconnected - ' + ws.clientName);

    clients.delete(ws.clientName);
  });

  ws.on('message', function message(data) {
    const payload = data.toString();

    console.log('received - %s', payload);

    const msg = JSON.parse(payload);

    // handle hello

    if (msg.type === 'client hello') {
      ws.clientName = msg.name;
      clients.set(ws.clientName, ws);
      ws.send(JSON.stringify({ type: 'server hello' }));
      return;
    }

    // relay message

    const fromClient = ws.clientName;
    const toClient = clients.get(msg.name);

    if (toClient) {
      toClient.send(
        JSON.stringify({
          ...msg,
          name: fromClient,
        })
      );

      console.log('relayed ' + msg.type);
    } else {
      console.log('no such client - ' + msg.name);
    }
  });
});
