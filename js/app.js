// Global variables
let currentJobId = null;
let pollingInterval = null;
let player = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupFileUpload();
    checkForExistingJobs();
});

// Set up drag and drop file upload
function setupFileUpload() {
    const uploadLabel = document.querySelector('.upload-label');
    const fileInput = document.getElementById('fileInput');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadLabel.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadLabel.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadLabel.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        uploadLabel.classList.add('highlight');
    }

    function unhighlight(e) {
        uploadLabel.classList.remove('highlight');
    }

    uploadLabel.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            fileInput.files = files;
            handleFileUpload({ target: { files: files } });
        }
    }
}

// Process media URL
async function processMediaUrl() {
    const url = document.getElementById('mediaUrl').value.trim();
    if (!url) {
        showStatus('Please enter a valid media URL', 'error');
        return;
    }

    if (!isValidMediaUrl(url)) {
        showStatus('Please enter a valid media URL (supported: direct media links, YouTube, etc.)', 'error');
        return;
    }

    showStatus('Starting transcoding process...', 'info');
    await startTranscoding({ type: 'url', source: url });
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!isValidMediaFile(file)) {
        showStatus('Please select a valid media file', 'error');
        return;
    }

    showStatus('Uploading file...', 'info');
    
    try {
        const uploadedUrl = await uploadFile(file);
        showStatus('File uploaded successfully. Starting transcoding...', 'info');
        await startTranscoding({ type: 'file', source: uploadedUrl, filename: file.name });
    } catch (error) {
        showStatus('Error uploading file: ' + error.message, 'error');
    }
}

// Validate media URL
function isValidMediaUrl(url) {
    try {
        new URL(url);
        const mediaExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.m4v', '.3gp', '.mp3', '.m4a', '.wav', '.flac'];
        const lowerUrl = url.toLowerCase();
        
        // Check for direct media file URLs
        if (mediaExtensions.some(ext => lowerUrl.includes(ext))) {
            return true;
        }
        
        // Check for supported platforms
        const supportedPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv'];
        return supportedPlatforms.some(platform => lowerUrl.includes(platform));
    } catch {
        return false;
    }
}

// Validate media file
function isValidMediaFile(file) {
    const validTypes = [
        'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo',
        'video/webm', 'video/x-flv', 'video/3gpp', 'video/x-matroska',
        'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/flac'
    ];
    
    return validTypes.includes(file.type) || file.size < 500 * 1024 * 1024; // 500MB limit
}

// Upload file to GitHub repository
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    // This is a simplified example. In a real implementation, you'd need to:
    // 1. Use GitHub API to upload the file to your repository
    // 2. Handle authentication (GitHub token)
    // 3. Return the raw file URL
    
    // For now, we'll simulate with a blob URL
    return URL.createObjectURL(file);
}

// Start transcoding process
async function startTranscoding(mediaData) {
    try {
        currentJobId = generateJobId();
        
        // Trigger GitHub Action via repository dispatch
        const response = await triggerGitHubAction(mediaData, currentJobId);
        
        if (response.ok) {
            showStatus('Transcoding job started. Monitoring progress...', 'info');
            startPolling(currentJobId);
        } else {
            throw new Error('Failed to start transcoding job');
        }
    } catch (error) {
        showStatus('Error starting transcoding: ' + error.message, 'error');
    }
}

// Trigger GitHub Action
async function triggerGitHubAction(mediaData, jobId) {
    const payload = {
        event_type: 'transcode_media',
        client_payload: {
            job_id: jobId,
            source: mediaData.source,
            type: mediaData.type,
            filename: mediaData.filename || null,
            timestamp: Date.now()
        }
    };

    // This would need to be implemented with proper GitHub API calls
    // For demonstration, we'll simulate the API call
    return new Promise(resolve => {
        setTimeout(() => resolve({ ok: true }), 1000);
    });
}

// Generate unique job ID
function generateJobId() {
    return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Start polling for job status
function startPolling(jobId) {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }

    pollingInterval = setInterval(async () => {
        try {
            const status = await checkJobStatus(jobId);
            handleJobStatus(status);
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 5000); // Poll every 5 seconds
}

// Check job status
async function checkJobStatus(jobId) {
    // This would check the GitHub Actions API or a status file
    // For demo purposes, we'll simulate different statuses
    const statuses = ['processing', 'processing', 'processing', 'completed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
        job_id: jobId,
        status: randomStatus,
        progress: randomStatus === 'processing' ? Math.floor(Math.random() * 90) + 10 : 100,
        output_url: randomStatus === 'completed' ? 'https://example.com/output/playlist.m3u8' : null,
        error: randomStatus === 'failed' ? 'Transcoding failed' : null
    };
}

// Handle job status updates
function handleJobStatus(status) {
    switch (status.status) {
        case 'processing':
            showStatus(`Transcoding in progress... ${status.progress}%`, 'info');
            updateProgressBar(status.progress);
            break;
        case 'completed':
            showStatus('Transcoding completed successfully!', 'success');
            clearInterval(pollingInterval);
            loadPlayer(status.output_url);
            break;
        case 'failed':
            showStatus('Transcoding failed: ' + (status.error || 'Unknown error'), 'error');
            clearInterval(pollingInterval);
            break;
    }
}

// Show status message
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = `
        <div class="status ${type}">
            ${message}
            ${type === 'info' && message.includes('progress') ? '<div class="progress-container"><div class="progress-bar" id="progressBar"></div></div>' : ''}
        </div>
    `;
}

// Update progress bar
function updateProgressBar(progress) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }
}

// Check for existing jobs on page load
function checkForExistingJobs() {
    // Check if there are any running jobs and resume polling
    const savedJobId = localStorage.getItem('currentJobId');
    if (savedJobId) {
        currentJobId = savedJobId;
        showStatus('Resuming monitoring of existing job...', 'info');
        startPolling(savedJobId);
    }
}

// Load video player
function loadPlayer(streamUrl) {
    document.getElementById('playerSection').style.display = 'block';
    initializePlayer(streamUrl);
    
    // Scroll to player
    document.getElementById('playerSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}
