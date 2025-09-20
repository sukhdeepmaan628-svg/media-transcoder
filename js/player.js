// Video player management
let videoPlayer = null;
let idleTimer = null;
const IDLE_TIMEOUT = 300000; // 5 minutes

function initializePlayer(streamUrl) {
    console.log('Initializing player with URL:', streamUrl);
    
    // Dispose existing player if any
    if (videoPlayer && typeof videoPlayer.dispose === 'function') {
        try {
            videoPlayer.dispose();
            videoPlayer = null;
        } catch (e) {
            console.warn('Error disposing previous player:', e);
        }
    }

    // Wait a moment for disposal to complete
    setTimeout(() => {
        try {
            videoPlayer = videojs('videoPlayer', {
                controls: true,
                fluid: true,
                responsive: true,
                playbackRates: [0.5, 1, 1.25, 1.5, 2],
                html5: {
                    vhs: {
                        overrideNative: true
                    }
                }
            });

            // Set source based on URL type
            if (streamUrl.includes('.m3u8')) {
                // HLS stream
                videoPlayer.src({
                    src: streamUrl,
                    type: 'application/x-mpegURL'
                });
            } else if (streamUrl.includes('.mpd')) {
                // DASH stream
                videoPlayer.src({
                    src: streamUrl,
                    type: 'application/dash+xml'
                });
            } else {
                // Regular video file
                videoPlayer.src({
                    src: streamUrl,
                    type: 'video/mp4'
                });
            }

            // Set up event listeners
            setupPlayerEvents();
            
            // Start idle monitoring
            startIdleMonitoring();
            
            console.log('Player initialized successfully');
        } catch (error) {
            console.error('Error initializing player:', error);
            showStatus('Error initializing video player: ' + error.message, 'error');
        }
    }, 100);
}

function setupPlayerEvents() {
    if (!videoPlayer) return;

    videoPlayer.ready(() => {
        console.log('Player ready');
    });

    videoPlayer.on('play', () => {
        console.log('Video started playing');
        resetIdleTimer();
    });

    videoPlayer.on('pause', () => {
        console.log('Video paused');
        startIdleTimer();
    });

    videoPlayer.on('ended', () => {
        console.log('Video ended');
        handleVideoEnd();
    });

    videoPlayer.on('error', (error) => {
        console.error('Player error:', error);
        const errorMessage = videoPlayer.error() ? videoPlayer.error().message : 'Unknown playback error';
        showStatus('Playback error: ' + errorMessage, 'error');
    });

    // Monitor user activity
    document.addEventListener('mousemove', resetIdleTimer);
    document.addEventListener('keydown', resetIdleTimer);
    document.addEventListener('click', resetIdleTimer);
}

function startIdleMonitoring() {
    startIdleTimer();
}

function startIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        handleIdle();
    }, IDLE_TIMEOUT);
}

function resetIdleTimer() {
    clearTimeout(idleTimer);
    startIdleTimer();
}

function handleVideoEnd() {
    showStatus('Video playback completed. Cleaning up resources...', 'info');
    setTimeout(() => {
        triggerCleanup();
    }, 5000);
}

function handleIdle() {
    if (videoPlayer && !videoPlayer.paused()) {
        return; // Don't cleanup if video is still playing
    }
    
    showStatus('Session idle. Cleaning up resources to save costs...', 'info');
    triggerCleanup();
}

async function triggerCleanup() {
    try {
        console.log('Triggering cleanup for job:', currentJobId);
        
        // In a real implementation, this would call your cleanup API
        // For now, we'll just clean up the local state
        
        // Clear local state
        if (currentJobId) {
            localStorage.removeItem('currentJobId');
            currentJobId = null;
        }
        
        // Clear any polling intervals
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        
        // Hide player
        const playerSection = document.getElementById('playerSection');
        if (playerSection) {
            playerSection.style.display = 'none';
        }
        
        // Dispose video player
        if (videoPlayer && typeof videoPlayer.dispose === 'function') {
            videoPlayer.dispose();
            videoPlayer = null;
        }
        
        showStatus('Session ended and resources cleaned up', 'success');
        
        // Clear status after a few seconds
        setTimeout(() => {
            const statusDiv = document.getElementById('status');
            if (statusDiv) {
                statusDiv.innerHTML = '';
            }
        }, 3000);
        
    } catch (error) {
        console.error('Cleanup error:', error);
        showStatus('Error during cleanup: ' + error.message, 'error');
    }
}

// Export for use in other scripts
window.playerUtils = {
    initializePlayer,
    triggerCleanup
};
