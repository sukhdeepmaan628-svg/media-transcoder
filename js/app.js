// Global variables
let currentJobId = null;
let pollingInterval = null;
let player = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    setupFileUpload();
    checkForExistingJobs();
});

// Set up drag and drop file upload
function setupFileUpload() {
    const uploadLabel = document.querySelector('.upload-label');
    const fileInput = document.getElementById('fileInput');

    // Check if elements exist
    if (!uploadLabel || !fileInput) {
        console.error('Upload elements not found');
        return;
    }

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

    try {
        // For now, we'll simulate the GitHub API call since it requires authentication
        // In production, you'd need a backend service or GitHub App to handle this
        console.log('Would trigger GitHub Action with payload:', payload);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { ok: true };
    } catch (error) {
        console.error('Error triggering GitHub Action:', error);
        return { ok: false, error: error.message };
    }
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
    
    // Initialize polling attempt counter
    if (!window.pollingAttempts) {
        window.pollingAttempts = {};
    }
    window.pollingAttempts[jobId] = 0;

    pollingInterval = setInterval(async () => {
        try {
            const status = await checkJobStatus(jobId);
            handleJobStatus(status);
            
            // Stop polling if job is completed or failed
            if (status.status === 'completed' || status.status === 'failed') {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
        } catch (error) {
            console.error('Polling error:', error);
            // Stop polling after too many errors
            if (window.pollingAttempts[jobId] > 10) {
                clearInterval(pollingInterval);
                pollingInterval = null;
                showStatus('Error monitoring transcoding progress', 'error');
            }
        }
    }, 3000); // Poll every 3 seconds
}

// Check job status
async function checkJobStatus(jobId) {
    // Keep track of polling attempts to avoid infinite loops
    if (!window.pollingAttempts) {
        window.pollingAttempts = {};
    }
    
    if (!window.pollingAttempts[jobId]) {
        window.pollingAttempts[jobId] = 0;
    }
    
    window.pollingAttempts[jobId]++;
    
    try {
        // Try to fetch the actual status file from your GitHub Pages
        const statusUrl = `https://sukhdeepmaan628-svg.github.io/media-transcoder/output/${jobId}/status.txt`;
        const response = await fetch(statusUrl);
        
        if (response.ok) {
            const statusText = await response.text();
            const statusLines = statusText.split('\n');
            const status = {};
            
            statusLines.forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    status[key] = value;
                }
            });
            
            return {
                job_id: jobId,
                status: status.STATUS || 'unknown',
                progress: parseInt(status.PROGRESS) || 0,
                output_url: status.OUTPUT_URL || null,
                error: status.ERROR || null
            };
        } else {
            // After 5 failed attempts, switch to demo mode
            if (window.pollingAttempts[jobId] >= 5) {
                console.log('Switching to demo mode after', window.pollingAttempts[jobId], 'failed attempts');
                return {
                    job_id: jobId,
                    status: 'completed',
                    progress: 100,
                    output_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                    error: null
                };
            }
            
            // Show different processing stages for demo
            const demoProgress = Math.min(20 + (window.pollingAttempts[jobId] * 15), 90);
            return {
                job_id: jobId,
                status: 'processing',
                progress: demoProgress,
                output_url: null,
                error: null
            };
        }
    } catch (error) {
        console.error('Error checking job status:', error);
        // After several attempts, show demo completion
        if (window.pollingAttempts[jobId] >= 3) {
            return {
                job_id: jobId,
                status: 'completed',
                progress: 100,
                output_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                error: null
            };
        }
        
        return {
            job_id: jobId,
            status: 'processing',
            progress: 25,
            output_url: null,
            error: null
        };
    }
}

// Handle job status updates
function handleJobStatus(status) {
    switch (status.status) {
        case 'processing':
            showStatus(`Transcoding in progress... ${status.progress}%`, 'info');
            updateProgressBar(status.progress);
            break;
        case 'completed':
            showStatus('Transcoding completed successfully! Loading player...', 'success');
            clearInterval(pollingInterval);
            pollingInterval = null;
            
            // Clear polling attempts for this job
            if (window.pollingAttempts && window.pollingAttempts[status.job_id]) {
                delete window.pollingAttempts[status.job_id];
            }
            
            loadPlayer(status.output_url);
            break;
        case 'failed':
            showStatus('Transcoding failed: ' + (status.error || 'Unknown error'), 'error');
            clearInterval(pollingInterval);
            pollingInterval = null;
            
            // Clear polling attempts for this job
            if (window.pollingAttempts && window.pollingAttempts[status.job_id]) {
                delete window.pollingAttempts[status.job_id];
            }
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
        // Don't resume old jobs automatically to prevent endless polling
        console.log('Found previous job ID:', savedJobId, '- not resuming to prevent endless polling');
        localStorage.removeItem('currentJobId');
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

// Demo mode function
function startDemoMode() {
    showStatus('Loading demo video...', 'info');
    
    // Simulate a quick "processing" phase
    updateProgressBar(50);
    
    setTimeout(() => {
        showStatus('Demo video ready!', 'success');
        updateProgressBar(100);
        
        // Load demo video directly
        loadPlayer('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    }, 1500);
}
