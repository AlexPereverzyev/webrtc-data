'use strict';

const EventEmitter = require('events');
const RTCPeerConnection = require('wrtc').RTCPeerConnection;

class PeerConnection extends EventEmitter {
  constructor(iceServers) {
    super();
    this.iceServers = iceServers;
  }

  start() {
    if (this.peerConnection) {
      throw new Error('peer conenction already started');
    }

    this.peerConnection = new RTCPeerConnection({
      sdpSemantics: 'unified-plan',
      iceServers: this.iceServers,
    });

    this.peerConnection.addEventListener(
      'signalingstatechange',
      ({ target }) => {
        console.log('ICE signaling - ' + target.signalingState);
      }
    );

    this.peerConnection.addEventListener(
      'icegatheringstatechange',
      ({ target }) => {
        console.log('ICE gathering - ' + target.iceGatheringState);
      }
    );

    this.peerConnection.addEventListener(
      'iceconnectionstatechange',
      ({ target }) => {
        console.log('ICE connection - ' + target.iceConnectionState);

        this._onConnectionState(target.iceConnectionState);
      }
    );

    this.peerConnection.addEventListener('icecandidate', ({ candidate }) => {
      if (!candidate) {
        console.log('ICE complete');
        return;
      }
      console.log('ICE candidate - ' + candidate.type);

      candidate.candidate = PeerConnection._format(candidate.candidate);
      if (!candidate.candidate) {
        return;
      }

      this.emit('candidate', candidate);
    });

    this.peerConnection.addEventListener('icecandidateerror', (error) => {
      console.error('ICE candidate error - ' + error.errorText);
    });

    this.peerConnection.addEventListener('datachannel', ({ channel }) => {
      console.log('WRTC data channel - ' + channel.label);

      this.dataChannel = channel;
      this.dataChannel.addEventListener('message', ({ data }) => {
        console.log('WRTC message - ' + data);
        this._onMessage(data);
      });

      this._onDataChannel();
    });

    console.log('WRTC connection started');

    this.emit('started');
    return true;
  }

  startData(name) {
    if (!this.peerConnection) {
      throw new Error('peer conenction should be started first');
    }

    this.dataChannel = this.peerConnection.createDataChannel(name);
    this.dataChannel.addEventListener('message', ({ data }) => {
      console.log('WRTC message - ' + data);
      this._onMessage(data);
    });

    console.log('WRTC data started');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this._tryEmitStopped()) {
      return;
    }

    if (this.dataChannel) {
      this.dataChannel.addEventListener('close', () => {
        console.log('WRTC data stopped');

        PeerConnection._unsubscribeAll(this.dataChannel);
        this.dataChannel = null;

        this._tryEmitStopped();
      });

      this.dataChannel.close();
      console.log('WRTC data stopping');
    }

    if (this.peerConnection) {
      this.peerConnection.addEventListener(
        'iceconnectionstatechange',
        ({ target }) => {
          if (target.iceConnectionState !== 'closed') {
            return;
          }

          console.log('WRTC connection stopped');

          PeerConnection._unsubscribeAll(this.peerConnection);
          this.peerConnection = null; // important

          this._tryEmitStopped();
        }
      );

      this.peerConnection.close();
      console.log('WRTC connection stopping');
    }
  }

  send(data) {
    if (!this.dataChannel) {
      return false;
    }
    if (this.dataChannel.readyState !== 'open') {
      return false;
    }

    this.dataChannel.send(data);
    return true;
  }

  async createOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return {
      type: this.peerConnection.localDescription.type,
      sdp: PeerConnection._format(this.peerConnection.localDescription.sdp),
    };
  }

  async createAnswer() {
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return {
      type: this.peerConnection.localDescription.type,
      sdp: PeerConnection._format(this.peerConnection.localDescription.sdp),
    };
  }

  async setDescription(data) {
    await this.peerConnection.setRemoteDescription(data);
  }

  async setCandidate(data) {
    await this.peerConnection.addIceCandidate(data);
  }

  _onConnectionState(state) {
    if (state === 'disconnected' || state === 'failed') {
      this.stop();
    }
  }

  _onDataChannel() {
    this.interval = setInterval(() => this.send('ping'), 1000);
  }

  _onMessage(data) {
    if (data === 'ping') {
      this.send('pong');
    }
  }

  _tryEmitStopped() {
    if (!this.dataChannel && !this.peerConnection) {
      this.emit('stopped');
      this.removeAllListeners();
      return true;
    }
    return false;
  }

  static _unsubscribeAll(eventTarget) {
    if (eventTarget) {
      Object.keys(eventTarget._listeners).forEach((k) =>
        eventTarget._listeners[k].clear()
      );
    }
  }

  // here you can filter out candidates based on some condition, eg: exclude host candidates
  static _format(sdp) {
    return sdp
      .split('\r\n')
      // .filter((l) => !l.includes('typ host'))
      .join('\r\n');
  }
}

module.exports = PeerConnection;
