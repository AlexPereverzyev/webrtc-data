'use strict';

const SignalingChannel = require('./signaling_channel');
const PeerConnection = require('./peer_connection');
const [peerName, peerOffer] = process.argv.slice(2, 4);

console.log('peer starting - ' + peerName);

const signaling = new SignalingChannel(peerName);
signaling.start();

const peer = new PeerConnection([
  {
    urls: 'stun:stun.l.google.com:19302',
  },
  // {
  //   "url": "turn:example.com:3333?transport=udp",
  //   "urls": "turn:example.com:3333?transport=udp",
  //   "username": "username",
  //   "credential": "password"
  // },
]);

signaling.on('ready', async () => {
  if (peerOffer) {
    peer.start();
    peer.startData('ping-pong');
    peer.on('stopped', () => signaling.stop());
    peer.on('candidate', (candidate) => {
      signaling.send({
        type: 'candidate',
        name: peerOffer,
        data: candidate,
      });
    });

    signaling.send({
      type: 'offer',
      name: peerOffer,
      data: await peer.createOffer(),
    });
  }
});

signaling.on('message', async (message) => {
  if (message.type === 'offer') {
    console.log('offer received');

    peer.start();
    peer.on('stopped', () => signaling.stop());
    peer.on('candidate', (candidate) => {
      signaling.send({
        type: 'candidate',
        name: message.name,
        data: candidate,
      });
    });

    await peer.setDescription(message.data);

    signaling.send({
      type: 'answer',
      name: message.name,
      data: await peer.createAnswer(),
    });
    return;
  }

  if (message.type === 'answer') {
    console.log('answer received');
    await peer.setDescription(message.data);
    return;
  }

  if (message.type === 'candidate') {
    console.log('candidate received');
    await peer.setCandidate(message.data);
  }
});
