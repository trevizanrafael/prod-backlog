const socket = io();
const videoGrid = document.getElementById('videoGrid');
const joinBtn = document.getElementById('joinBtn');
const roomIdInput = document.getElementById('roomId');

let localStream;
const peers = {}; // userId -> RTCPeerConnection

// Configuration for ICE servers (STUN)
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

// Start
async function start() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        addVideoStream(localStream, 'You', true);

        // Setup socket listeners after we have the stream
        setupSocketListeners();
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Could not access camera/microphone. Please allow permissions.');
    }
}

function setupSocketListeners() {
    // Join room handling
    joinBtn.addEventListener('click', () => {
        const roomId = roomIdInput.value;
        if (!roomId) return;

        console.log('Joining room:', roomId);
        socket.emit('join-room', roomId, socket.id);

        // Disable inputs and show controls
        joinBtn.style.display = 'none';
        roomIdInput.style.display = 'none';
        document.getElementById('roomStatus').style.display = 'flex';
        document.getElementById('currentRoomName').textContent = roomId;
        document.getElementById('controlsBar').style.display = 'flex';
    });

    // Media Controls
    document.getElementById('micBtn').addEventListener('click', (e) => {
        const enabled = localStream.getAudioTracks()[0].enabled;
        if (enabled) {
            localStream.getAudioTracks()[0].enabled = false;
            e.currentTarget.classList.add('active-off');
            e.currentTarget.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
        } else {
            localStream.getAudioTracks()[0].enabled = true;
            e.currentTarget.classList.remove('active-off');
            e.currentTarget.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
        }
    });

    document.getElementById('cameraBtn').addEventListener('click', (e) => {
        const enabled = localStream.getVideoTracks()[0].enabled;
        if (enabled) {
            localStream.getVideoTracks()[0].enabled = false;
            e.currentTarget.classList.add('active-off');
            e.currentTarget.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21l-9-9m9 9v-2.48l-2-2"></path><path d="M21 7l-7 5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"></path></svg>`;
        } else {
            localStream.getVideoTracks()[0].enabled = true;
            e.currentTarget.classList.remove('active-off');
            e.currentTarget.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
        }
    });

    document.getElementById('leaveBtn').addEventListener('click', () => {
        window.location.reload();
    });

    // Another user connected -> Initiate call (Create Offer)
    socket.on('user-connected', (userId) => {
        console.log('User connected:', userId);
        connectToNewUser(userId, localStream);
    });

    // User disconnected -> Close connection
    socket.on('user-disconnected', (userId) => {
        if (peers[userId]) {
            peers[userId].close();
            delete peers[userId];
            removeVideoElement(userId);
        }
    });

    // Handle signals (Offer, Answer, ICE Candidate)
    socket.on('signal', async (data) => {
        const { callerId, signal } = data;

        if (!peers[callerId]) {
            // Received invite (Offer) from someone completely new to us
            // Or we are the one receiving the connection request
            peers[callerId] = createPeerConnection(callerId, localStream);
        }

        const peer = peers[callerId];

        try {
            if (signal.type === 'offer') {
                await peer.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                socket.emit('signal', {
                    target: callerId,
                    callerId: socket.id,
                    signal: peer.localDescription
                });
            } else if (signal.type === 'answer') {
                await peer.setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.candidate) {
                await peer.addIceCandidate(new RTCIceCandidate(signal));
            }
        } catch (e) {
            console.error('Error handling signal:', e);
        }
    });
}

function createPeerConnection(targetUserId, stream) {
    const peer = new RTCPeerConnection(rtcConfig);

    // Add local tracks to connection
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    // Handle incoming stream
    peer.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            addVideoStream(event.streams[0], targetUserId, false);
        }
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', {
                target: targetUserId,
                callerId: socket.id,
                signal: event.candidate
            });
        }
    };

    peers[targetUserId] = peer;
    return peer;
}

async function connectToNewUser(userId, stream) {
    const peer = createPeerConnection(userId, stream);

    // Create Offer
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit('signal', {
        target: userId,
        callerId: socket.id,
        signal: peer.localDescription
    });
}

function addVideoStream(stream, userId, isLocal) {
    // Check if video already exists
    const existing = document.getElementById(`video-${userId}`);
    if (existing) return;

    const div = document.createElement('div');
    div.className = 'video-card';
    div.id = `wrapper-${userId}`;

    // Use user ID (or "You" for local) as label
    const label = isLocal ? "You" : `User ${userId.substr(0, 4)}`;

    div.innerHTML = `
        <video id="video-${userId}" playsinline ${isLocal ? 'muted' : ''} autoplay></video>
        <div class="user-label">${label}</div>
    `;

    videoGrid.appendChild(div);
    const video = document.getElementById(`video-${userId}`);
    video.srcObject = stream;
}

function removeVideoElement(userId) {
    const wrapper = document.getElementById(`wrapper-${userId}`);
    if (wrapper) wrapper.remove();
}

// Initialize
start();
