'use strict';

const EventEmitter = require('events');
const WebSocket = require('ws');

class SignalingChannel extends EventEmitter {
  constructor(name = 'peer_' + Math.random().toString().substring(2, 10)) {
    super();
    this.name = name;
  }

  start() {
    this.ws = new WebSocket('ws://localhost:8080');

    this.ws.on('error', (err) => {
      console.error(err);
      this.ws.removeAllListeners();
      this.ws.on('error', function suppress() {});
      this.ws.terminate();
      this.ws = null;

      console.log('reconnecting');
      setTimeout(() => this.start(), 2 * 1000);
    });

    this.ws.on('open', () => {
      console.log('connected');
      this.ws.send(JSON.stringify({ type: 'client hello', name: this.name }));
      this.emit('connected');
    });

    this.ws.on('close', () => {
      console.log('disconnected');
      this.ws.removeAllListeners();
      this.ws = null;

      this.emit('disconnected');

      console.log('reconnecting');
      setTimeout(() => this.start(), 2 * 1000);
    });

    this.ws.on('message', (data) => {
      const payload = data.toString();

      console.log('received - %s', payload);

      const msg = JSON.parse(payload);

      if (msg.type === 'server hello') {
        console.log('ready');
        this.emit('ready');
        return;
      }

      this.emit('message', msg);
    });

    console.log('signaling started');
  }

  stop() {
    if (!this.ws) {
      return;
    }

    this.ws.close();
    this.ws.removeAllListeners();
    this.ws = null;

    console.log('signaling stopped');
  }

  send(message) {
    if (!this.ws) {
      return false;
    }

    this.ws.send(JSON.stringify(message));
    return true;
  }
}

module.exports = SignalingChannel;
