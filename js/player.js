// Video player management
let videoPlayer = null;
let idleTimer = null;
const IDLE_TIMEOUT = 300000; // 5 minutes

function initializePlayer(streamUrl) {
    // Dispose existing player if any
    if (videoPlayer) {
        videoPlayer.dispose();
    }

    videoPlayer = videojs('videoPlayer', {
        controls: true,
        fluid: true,
        responsive: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        plugins: {
            hotkeys: {
                volumeStep: 0.1,
                seekStep: 5,
                enableModifiersForNumbers: false
            }
        }
    });

    // Handle different stream types
    if (streamUrl.endsWith('.m3u8')) {
        // HLS stream
        if (videoPlayer.tech().hls) {
            videoPlayer.src({
                src: streamUrl,
                type: 'application/x-mpegURL'
            });
        } else if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(streamUrl);
            hls.attachMedia(videoPlayer.tech().el());
        }
    } else if (streamUrl.endsWith('.mpd')) {
        // DASH stream
        videoPlayer.src({
            src: streamUrl,
            type: 'application/dash+xml'
        });
    } else {
        // Regular MP4 or other formats
        videoPlayer.src({
            src: streamUrl,
            type: 'video/mp4'
        });
    }

    // Set up event listeners
    setupPlayerEvents();
    
    // Start idle monitoring
    startIdleMonitoring();
}

function setupPlayerEvents() {
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
        showStatus('Playback error: Please try refreshing the page', 'error');
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
        // Trigger cleanup GitHub Action
        await fetch('/api/cleanup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                job_id: currentJobId,
                action: 'cleanup'
            })
        });
        
        // Clear local state
        currentJobId = null;
        localStorage.removeItem('currentJobId');
        
        // Hide player
        document.getElementById('playerSection').style.display = 'none';
        
        showStatus('Resources cleaned up successfully', 'success');
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

// Export for use in other scripts
window.playerUtils = {
    initializePlayer,
    triggerCleanup
};
