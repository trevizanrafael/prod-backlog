const socket = io();
const videoGrid = document.getElementById('videoGrid');
const joinBtn = document.getElementById('joinBtn');
const roomIdInput = document.getElementById('roomId');

let localStream;
let screenStream;
let isSharing = false;
let screenSocket; // Secondary socket for screen share

// Store peer connections for the main socket
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
        addVideoStream(localStream, 'You', true); // Use 'You' as ID for local to make it predictable

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
        const btn = e.currentTarget;
        const icon = btn.querySelector('i');

        if (enabled) {
            localStream.getAudioTracks()[0].enabled = false;
            btn.classList.add('active-off');
            icon.className = 'fas fa-microphone-slash';
        } else {
            localStream.getAudioTracks()[0].enabled = true;
            btn.classList.remove('active-off');
            icon.className = 'fas fa-microphone';
        }
    });

    document.getElementById('cameraBtn').addEventListener('click', (e) => {
        const enabled = localStream.getVideoTracks()[0].enabled;
        const btn = e.currentTarget;
        const icon = btn.querySelector('i');

        if (enabled) {
            localStream.getVideoTracks()[0].enabled = false;
            btn.classList.add('active-off');
            icon.className = 'fas fa-video-slash';
        } else {
            localStream.getVideoTracks()[0].enabled = true;
            btn.classList.remove('active-off');
            icon.className = 'fas fa-video';
        }
    });

    document.getElementById('leaveBtn').addEventListener('click', () => {
        window.location.reload();
    });

    // Share Screen Toggle
    document.getElementById('shareBtn').addEventListener('click', () => {
        if (!isSharing) {
            startScreenShare();
        } else {
            stopScreenShare();
        }
    });

    // Chat Logic
    const chatPanel = document.getElementById('chatPanel');
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    chatToggleBtn.addEventListener('click', () => {
        chatPanel.style.right = '0';
    });

    closeChatBtn.addEventListener('click', () => {
        chatPanel.style.right = '-320px';
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInput.value;
        if (message.trim()) {
            const roomId = roomIdInput.value || document.getElementById('currentRoomName').innerText;
            socket.emit('send-chat-message', roomId, message);
            appendMessage('You', message);
            chatInput.value = '';
        }
    });

    socket.on('receive-chat-message', (data) => {
        appendMessage(`User ${data.senderId.substr(0, 4)}`, data.message);
        if (chatPanel.style.right !== '0px') {
            chatToggleBtn.style.color = '#3b82f6'; // Highlight button if closed
            setTimeout(() => chatToggleBtn.style.color = '', 2000);
        }
    });

    // ================== SIGNALING LOGIC (Main Socket) ==================

    // Another user connected -> Initiate call (Create Offer)
    socket.on('user-connected', (userId) => {
        console.log('User connected:', userId);

        // Prevent loopback: Do not connect to my own screen share socket!
        if (screenSocket && userId === screenSocket.id) {
            console.log('Ignoring my own screen share socket');
            return;
        }

        // Pass my metadata (User)
        connectToNewUser(userId, localStream, socket, peers, { type: 'user' });
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
        handleSignal(data, socket, peers, localStream, { type: 'user' });
    });
}

// Reuseable Signaling Handler
async function handleSignal(data, ioSocket, peerMap, stream, myMetadata) {
    const { callerId, signal, metadata } = data;

    // metadata is the REMOTE user's metadata

    if (!peerMap[callerId]) {
        // Received invite (Offer)
        peerMap[callerId] = createPeerConnection(callerId, stream, ioSocket, metadata);
    }

    const peer = peerMap[callerId];

    try {
        if (signal.type === 'offer') {
            await peer.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            ioSocket.emit('signal', {
                target: callerId,
                callerId: ioSocket.id,
                signal: peer.localDescription,
                signal: peer.localDescription,
                metadata: myMetadata
            });
        } else if (signal.type === 'answer') {
            await peer.setRemoteDescription(new RTCSessionDescription(signal));

            // If we receive an answer with metadata, we should update the UI
            // because ontrack might have fired before we had metadata
            if (metadata && metadata.type === 'screen') {
                const videoCard = document.getElementById(`wrapper-${callerId}`);
                if (videoCard) {
                    if (!videoCard.classList.contains('screen-share')) {
                        videoCard.classList.add('screen-share');
                        const labelDiv = videoCard.querySelector('.user-label');
                        const parentId = metadata.parentUser || callerId;
                        labelDiv.innerHTML = `<i class="fas fa-desktop"></i> Sharing of User ${parentId.substr(0, 4)}`;
                    }
                }
            }
        } else if (signal.candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(signal));
        }
    } catch (e) {
        console.error('Error handling signal:', e);
    }
}

function createPeerConnection(targetUserId, stream, ioSocket, remoteMetadata) {
    const peer = new RTCPeerConnection(rtcConfig);

    // Add local tracks to connection
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    // Handle incoming stream
    peer.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            addVideoStream(event.streams[0], targetUserId, false, remoteMetadata);
        }
    };

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
        if (event.candidate) {
            ioSocket.emit('signal', {
                target: targetUserId,
                callerId: ioSocket.id, // My socket ID
                signal: event.candidate,
                // Metadata isn't strictly needed for ICE, but consistent
                // Actually ICE signal handler doesn't read metadata, just adds candidate.
            });
        }
    };

    // peers[targetUserId] = peer; // Caller handles storage
    return peer;
}

async function connectToNewUser(userId, stream, ioSocket, peerMap, myMetadata) {
    // We don't know remote metadata yet, will get it in Answer? 
    // Actually, we initiated, so we don't have it. It's fine, ontrack usually comes after?
    // Wait, ontrack fires when tracks arrive.
    // If we initiate, we will receive Answer, then eventually media.

    // We pass null for remoteMetadata. addVideoStream handles missing metadata defaults.
    const peer = createPeerConnection(userId, stream, ioSocket, null);
    peerMap[userId] = peer;

    // Create Offer
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    ioSocket.emit('signal', {
        target: userId,
        callerId: ioSocket.id,
        signal: peer.localDescription,
        metadata: myMetadata
    });
}

// ================== SCREEN SHARE (Ghost User) ==================

async function startScreenShare() {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });

        // 1. Create a NEW socket connection
        screenSocket = io();
        const screenPeers = {}; // Store peers for this socket

        // 2. Metadata for this "user"
        const screenMetadata = {
            type: 'screen',
            parentUser: socket.id
        };

        // 3. Connect and Join Room
        screenSocket.on('connect', () => {
            const roomId = roomIdInput.value || document.getElementById('currentRoomName').innerText;
            console.log('Screen Socket connected:', screenSocket.id);
            screenSocket.emit('join-room', roomId, screenSocket.id);
        });

        // 4. Handle signaling for the screen socket
        screenSocket.on('user-connected', (userId) => {
            console.log('User sees new user (from screen socket):', userId);
            // Initiate call FROM screen TO user
            connectToNewUser(userId, screenStream, screenSocket, screenPeers, screenMetadata);
        });

        screenSocket.on('signal', (data) => {
            handleSignal(data, screenSocket, screenPeers, screenStream, screenMetadata);
        });

        // Handle stop sharing from browser UI
        screenStream.getVideoTracks()[0].onended = () => stopScreenShare();

        isSharing = true;
        document.getElementById('shareBtn').classList.add('active-off');
        document.getElementById('shareBtn').style.color = '#3b82f6';
        document.getElementById('shareBtn').innerHTML = '<i class="fas fa-desktop"></i>'; // Ensure icon

        // Local Preview (Optional, usually we see our own screen anyway, prevents mirror effect confusion)
        // But users like to see what they are sharing.
        // We can add it as a video card manually.
        addVideoStream(screenStream, 'Me-Screen', true, { type: 'screen' });

    } catch (error) {
        console.error("Error sharing screen:", error);
    }
}

function stopScreenShare() {
    if (!isSharing) return;

    // Stop tracks
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
    }

    // Disconnect ghost socket
    if (screenSocket) {
        screenSocket.disconnect();
        screenSocket = null;
    }

    // Remove local preview
    removeVideoElement('Me-Screen');

    isSharing = false;
    document.getElementById('shareBtn').classList.remove('active-off');
    document.getElementById('shareBtn').style.color = '';
}


// ================== UI HELPERS ==================

function appendMessage(sender, message) {
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = '0.5rem';
    msgDiv.style.color = 'white';
    msgDiv.style.fontSize = '0.9rem';
    msgDiv.innerHTML = `<strong style="color: #3b82f6;">${sender}:</strong> <span style="color: #e2e8f0;">${message}</span>`;
    document.getElementById('chatMessages').appendChild(msgDiv);
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
}

function addVideoStream(stream, userId, isLocal, metadata) {
    // Check if video already exists
    const existing = document.getElementById(`video-${userId}`);
    if (existing) return;

    let label = `User ${userId.substr(0, 4)}`;
    let iconClass = 'fa-user-circle';
    let wrapperClass = 'video-card';

    if (isLocal) {
        if (userId === 'Me-Screen') {
            label = "You (Sharing)";
            iconClass = 'fa-desktop';
            wrapperClass += ' screen-share';
        } else {
            label = "You";
            iconClass = 'fa-user';
        }
    } else if (metadata && metadata.type === 'screen') {
        const parentId = metadata.parentUser || userId; // Fallback
        label = `Sharing of User ${parentId.substr(0, 4)}`;
        iconClass = 'fa-desktop';
        wrapperClass += ' screen-share'; // Adds no-mirror logic
    }

    const div = document.createElement('div');
    div.className = wrapperClass;
    div.id = `wrapper-${userId}`;

    div.innerHTML = `
        <video id="video-${userId}" playsinline ${isLocal ? 'muted' : ''} autoplay></video>
        <div class="user-label">
            <i class="fas ${iconClass}"></i> ${label}
        </div>
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
