const peerConnections = {};
const config = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

const socket = io.connect(window.location.origin);
const params = new URLSearchParams(window.location.search);
const watcher = params.get("watcher");

socket.on("answer", (id, description) => {
  peerConnections[id].setRemoteDescription(description);
});

socket.on("watcher", () => {
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[watcher] = peerConnection;

  let stream = videoElement.srcObject;
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", watcher, event.candidate);
    }
  };

  peerConnection
    .createOffer()
    .then((sdp) => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("offer", watcher, peerConnection.localDescription);
    });
});

socket.on("candidate", (id, candidate) => {
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("disconnectPeer", (id) => {
  peerConnections[id].close();
  delete peerConnections[id];
});

window.onbeforeunload = () => {
  socket.close();
};

const videoElement = document.querySelector("video");

getStream();

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  const constraints = {
    audio: true,
    video: true,
  };
  return navigator.mediaDevices
    .getDisplayMedia(constraints)
    .then(gotStream)
    .catch(handleError);
}

function gotStream(stream) {
  window.stream = stream;
  videoElement.srcObject = stream;
  socket.emit("broadcaster", watcher);
}

function handleError(error) {
  console.error("Error: ", error);
}
