# webrtc-data

Web RTC peer-to-peer data channel communication with Node.js and Web Socket signaling.

## Pre-Requisites

Signaling Web Socket server should be accessible by all peers and in simplest form can be deployed on the same local host with peers. It's role is to enable peers to negotiate connection parameters. 

If you are planning to connect peers in different networks (non-local) - STUN server is required. Fortunately, it's available for free, eg: from Google and other companies.

In more rare cases (CGNAT, network configuration), peers are unable to connect with each other via external IPs and ports. When configured, TURN server is used as a fallback communication channel, however it's available as paid service and you will have to obtain and configure access credentials for each peer (see `peer.js`, `PeerConnection` constructor).

## Usage Example

Assuming you are launching everything (signaling and peers) from local host and the same directory, foollow the steps:

- install dependencies: `npm install`
- start signaling endpoint: `npm run signal`
- start peer *B* (waits for offer from peer *A*): `npm run peer B`
- start peer *A* (sends an offer to peer *B*): `npm run peer A B`

After the connection is established, peer *A* starts data channel that is used by peers to exchange `ping-pong` messages. 

## References

https://www.npmjs.com/package/wrtc
https://hpbn.co/webrtc/
https://webrtc.org/getting-started
https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
