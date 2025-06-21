/**
 * DEBUG LOGS ADDED: SpeechRecognitionManager integration check
 */
// Initialize state
let worker = null;
let audioContext = null;
let mediaStream = null;
let sourceNode = null;
let audioWorkletNode = null;
let isRecording = false;
let isWorkerReadyForStream = false;

// SpeechRecognitionManager debug
console.log('[DEBUG] Checking SpeechRecognitionManager on window:', !!window.SpeechRecognitionManager);
let speechManager = null;
if (window.SpeechRecognitionManager) {
    speechManager = new window.SpeechRecognitionManager();
    window.speechManager = speechManager;
    console.log('[DEBUG] SpeechRecognitionManager instantiated:', !!speechManager);
    // Optionally, check if supported
    console.log('[DEBUG] SpeechRecognitionManager.isSupported:', window.SpeechRecognitionManager.isSupported());
} else {
    console.warn('[DEBUG] SpeechRecognitionManager not found on window');
}

// Constants
const SAMPLE_RATE = 16000;
const PROCESSOR_BUFFER_SIZE = 4096;

// DOM Elements
const statusEl = document.getElementById('status');
const progressEl = document.getElementById('progress');
console.log('[DEBUG] statusEl:', statusEl, 'progressEl:', progressEl);
if (!statusEl) {
    console.error('[ERROR] statusEl not found in DOM!');
}
if (!progressEl) {
    console.error('[ERROR] progressEl not found in DOM!');
}
const languageSelect = document.getElementById('language');

// Debug log for record button presence
const recordButton = document.getElementById('toggle');
console.log('[DEBUG] main.js: recordButton:', recordButton);

const transcriptEl = document.getElementById('transcript');

// Check for WebGPU support
async function hasWebGPU() {
    if (!navigator.gpu) {
        return false;
    }
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch (e) {
        return false;
    }
}

// Initialize the worker
async function initializeWorker() {
    const device = await hasWebGPU() ? 'webgpu' : 'wasm';
    const workerUrl = new URL('./worker.js', import.meta.url);
    console.log('[DEBUG] Initializing worker with device:', device, 'Resolved worker.js URL:', workerUrl);
    worker = new Worker(workerUrl, { type: 'module' });
    
    worker.onerror = (error) => {
        console.error('Worker error:', error, 'Resolved worker.js URL:', workerUrl);
    };
    
    worker.onmessage = (e) => {
        console.log('Main: Received result from worker');
        const { status, data, result } = e.data;
        
        switch (status) {
            case 'loading':
                updateProgress({ message: data });
                break;
            case 'loaded':
                updateProgress({ message: 'Ready to record' });
                break;
            case 'streaming':
                updateProgress({ message: 'Started streaming...' });
                break;
            case 'ready':
                isWorkerReadyForStream = true;
                connectAudioPipeline();
                break;
            case 'partial':
                updateTranscript(result);
                break;
            case 'stopped':
                updateProgress({ message: 'Recording stopped' });
                break;
            case 'error':
                showError(data);
                break;
            default:
                if (data && data.progress) {
                    updateProgress(data);
                }
        }
    };

    // Initialize the worker with device type
    console.log('Sending load message to worker');
    worker.postMessage({
        type: 'load',
        data: { device }
    });
}

// Update progress display
function updateProgress(data) {
    const { message, progress } = data;
    console.log('[DEBUG] updateProgress called. statusEl:', statusEl, 'progressEl:', progressEl, 'data:', data);
    if (!statusEl) {
        console.error('[ERROR] statusEl is null in updateProgress!');
    }
    if (!progressEl) {
        console.error('[ERROR] progressEl is null in updateProgress!');
    }
    if (statusEl) statusEl.textContent = message;
    
    if (progress && progress.length > 0 && progressEl) {
        progressEl.innerHTML = progress
            .map(item => `
                <div class="mb-2">
                    <div class="text-sm text-gray-600">${item.name}</div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-indigo-600 h-2.5 rounded-full" style="width: ${item.progress}%"></div>
                    </div>
                </div>
            `).join('');
    }
}

// Create HTML for a transcript segment
function createSegmentHTML(speaker, text) {
    const speakerLabel = speaker ? 
        `<span class="font-semibold text-indigo-600">${speaker}</span>: ` : 
        '';
    return `
        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
            ${speakerLabel}
            <span class="text-gray-800">${text}</span>
        </div>
    `;
}

// Update transcript with new results
let sentenceBuffer = window.sentenceBuffer || '';
let lastSentIndex = window.lastSentIndex || 0;
let lastDisplayedSentence = window.lastDisplayedSentence || '';

function updateTranscript(result) {
    // Enhanced input validation and logging for debugging
    if (!result || typeof result !== 'object') {
        console.error('[ERROR] updateTranscript: Invalid result object', result);
        return;
    }
    if (!result.transcript || typeof result.transcript !== 'object') {
        console.warn('[WARN] updateTranscript: Missing or invalid transcript property', result);
        return;
    }
    if (!Array.isArray(result.segments)) {
        console.warn('[WARN] updateTranscript: Missing or invalid segments array', result);
        return;
    }
    if (!Array.isArray(result.transcript.chunks)) {
        console.warn('[WARN] updateTranscript: transcript.chunks is not an array', result.transcript);
        return;
    }
    console.debug('[DEBUG] updateTranscript called with:', result);

    // Validate transcript chunks structure
    for (const [i, chunk] of result.transcript.chunks.entries()) {
        if (!chunk || typeof chunk.text !== 'string') {
            console.warn(`[WARN] updateTranscript: transcript chunk at index ${i} is malformed:`, chunk);
        }
    }

    const { transcript, segments } = result;

    // Combine transcription chunks into a single string
    let combinedText = '';
    for (const chunk of transcript.chunks) {
        // Debug: log chunk structure
        console.log('[DEBUG] Transcript chunk:', chunk);

        // Remove all [BLANK _AUDIO] tags from chunk.text and from all segment texts
        if (!chunk.text) continue;
        const cleanedText = chunk.text.replace(/\[BLANK _AUDIO\]/g, '').trim();
        if (cleanedText.length === 0) continue;
        combinedText += cleanedText + ' ';
    }
    // Remove [BLANK _AUDIO] from all segment texts as well
    if (Array.isArray(segments)) {
        for (let seg of segments) {
            if (seg.text) {
                seg.text = seg.text.replace(/\[BLANK _AUDIO\]/g, '').trim();
            }
        }
    }

    // --- Sentence detection and LLM send logic ---
    sentenceBuffer += combinedText;
    // Find all complete sentences using regex (ends with . ! ?)
    const sentenceRegex = /[^.!?]*[.!?]/g;
    let match;
    let sentences = [];
    while ((match = sentenceRegex.exec(sentenceBuffer)) !== null) {
        sentences.push(match[0].trim());
    }
    // Add any remaining buffer as a sentence candidate (for cases with no punctuation)
    const remainder = sentenceBuffer.slice(sentenceRegex.lastIndex).trim();
    if (remainder.length > 0) {
        sentences.push(remainder);
    }

    // Only send new sentences (not previously sent)
    let bufferedText = '';
    const questionWords = [
        'who', 'what', 'when', 'where', 'why', 'how', 'is', 'are', 'can', 'could', 'would', 'should', 'do', 'does', 'did', 'will', 'won\'t', 'shall', 'may', 'might'
    ];
    const MIN_BUFFER_LENGTH = 200; // characters

    for (let i = lastSentIndex; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (sentence.length > 0) {
            bufferedText += sentence + ' ';
            // Heuristic: send if sentence starts with a question word or buffer is long
            const firstWord = sentence.trim().split(' ')[0]?.toLowerCase();
            const isQuestion = questionWords.includes(firstWord);
            if (isQuestion || bufferedText.length > MIN_BUFFER_LENGTH) {
                if (window.apiClient && window.appState) {
                    const selectedModel = window.appState.getState('selectedModel');
                    const filesContext = window.appState.getUploadedFilesContext ? window.appState.getUploadedFilesContext() : '';
                    const systemPrompt = ''; // Set as needed
                    window.apiClient.generateResponse(bufferedText.trim(), selectedModel, systemPrompt, filesContext)
                        .then(response => {
                            console.log('LLM response:', response);
                            // DEBUG: Show AI response in UI
                            const replyEl = document.getElementById('reply');
                            let aiResponseText = typeof response === 'string' ? response : (response?.reply || JSON.stringify(response));
                            if (replyEl) {
                                replyEl.textContent = aiResponseText;
                                console.log('[DEBUG] Set replyEl.textContent:', replyEl.textContent);
                            } else {
                                console.error('[ERROR] Could not find reply element in DOM');
                            }
                            // Record AI Response in Response History
                            if (window.appState && typeof window.appState.addToHistory === 'function') {
                                window.appState.addToHistory(aiResponseText, 'AI Response', window.appState.getState('selectedModel'));
                            }
                        })
                        .catch(err => {
                            console.error('LLM API error:', err);
                        });
                }
                bufferedText = ''; // Reset buffer after sending
            }
        }
        // Move previous displayed sentence to history if it exists
        if (lastDisplayedSentence && window.appState && typeof window.appState.addToHistory === 'function') {
            window.appState.addToHistory(lastDisplayedSentence, '', window.appState.getState('selectedModel'));
            // Optionally, re-render history list if needed
            if (window.uiManager && typeof window.uiManager.renderHistoryList === 'function') {
                window.uiManager.renderHistoryList();
            }
        }
        // Show only the latest sentence in the Transcription box
        const lastObjectionEl = document.getElementById('lastObjection');
        if (lastObjectionEl) {
            lastObjectionEl.textContent = `You: ${sentence}`;
        }
        lastDisplayedSentence = sentence;
    }
    lastSentIndex = sentences.length;

    // Keep only the remainder (incomplete sentence) in the buffer
    const lastMatch = sentenceRegex.lastIndex;
    sentenceBuffer = lastMatch > 0 ? sentenceBuffer.slice(lastMatch) : sentenceBuffer;

    // Store buffer and index globally for next call
    window.sentenceBuffer = sentenceBuffer;
    window.lastSentIndex = lastSentIndex;
    window.lastDisplayedSentence = lastDisplayedSentence;
}

// Format time in seconds to MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Show error message
function showError(error) {
    statusEl.innerHTML = `<div class="text-red-600">${error}</div>`;
}

// Connect audio pipeline when worker is ready
function connectAudioPipeline() {
    console.log('connectAudioPipeline called - sourceNode:', !!sourceNode, 'audioWorkletNode:', !!audioWorkletNode, 'isWorkerReadyForStream:', isWorkerReadyForStream);
    if (sourceNode && audioWorkletNode && isWorkerReadyForStream) {
        sourceNode.connect(audioWorkletNode);
        console.log('Audio pipeline connected successfully');
    } else {
        console.log('Cannot connect audio pipeline - missing requirements');
    }
}

// Start recording
async function startRecording() {
    try {
        console.log('Starting recording...');
        // Get audio stream
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: SAMPLE_RATE
            }
        });

        // Create audio context and load audio worklet
        audioContext = new AudioContext({
            sampleRate: SAMPLE_RATE,
            latencyHint: 'interactive'
        });

        // Load the audio worklet module
        let audioProcessorUrl;
        try {
            audioProcessorUrl = new URL('./audio-processor.js', import.meta.url);
            console.log('[DEBUG] Attempting to load AudioWorklet module at:', audioProcessorUrl);
            await audioContext.audioWorklet.addModule(audioProcessorUrl);
            console.log('AudioWorklet module loaded successfully at:', audioProcessorUrl);
        } catch (e) {
            console.error('Failed to load AudioWorklet module:', e, 'Resolved audio-processor.js URL:', audioProcessorUrl);
            showError('Failed to load audio processor: ' + e.message);
            return;
        }

        sourceNode = audioContext.createMediaStreamSource(mediaStream);
        audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-processor');

        // Handle audio data from the worklet
        audioWorkletNode.port.onmessage = (event) => {
            console.log('Main: Received data from worklet');
            const { type, data } = event.data;
            if (type === 'audioData') {
                console.log('Main: Sending data to worker');
                // Create a copy of the audio data to ensure it's serializable
                const audioDataCopy = new Float32Array(data);
                worker.postMessage({
                    type: 'stream',
                    data: {
                        chunk: audioDataCopy,
                        language: languageSelect.value
                    }
                }, [audioDataCopy.buffer]);
            }
        };

        // Start streaming mode - audio will connect after worker signals ready
        isWorkerReadyForStream = false;
        console.log('Sending startStream message to worker');
        worker.postMessage({
            type: 'startStream',
            data: { language: languageSelect.value }
        });

        // Update UI
        isRecording = true;
        recordButton.textContent = 'Stop Recording';
        recordButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
        recordButton.classList.add('bg-red-600', 'hover:bg-red-700');
        
        // Clear previous transcript
        if (transcriptEl) {
            transcriptEl.innerHTML = '';
        } else {
            console.error('[ERROR] transcriptEl is null in startRecording! Check if #transcript exists in the DOM.');
        }

    } catch (err) {
        showError('Error accessing microphone: ' + err.message);
    }
}

// Stop recording
function stopRecording() {
    // Stop media stream
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }

    // Disconnect and cleanup audio nodes
    if (sourceNode && audioWorkletNode) {
        sourceNode.disconnect();
        audioWorkletNode.disconnect();
    }

    // Close audio context
    if (audioContext) {
        audioContext.close();
    }

    // Stop streaming mode
    worker.postMessage({ 
        type: 'stopStream',
        data: { language: languageSelect.value }
    });

    // Reset state
    mediaStream = null;
    audioContext = null;
    sourceNode = null;
    audioWorkletNode = null;
    isRecording = false;
    isWorkerReadyForStream = false;

    // Update UI
    recordButton.textContent = 'Record';
    recordButton.classList.remove('bg-red-600', 'hover:bg-red-700');
    recordButton.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
}

// Handle recording button
if (recordButton) {
    recordButton.addEventListener('click', () => {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });
} else {
    console.error('[ERROR] main.js: recordButton not found in DOM. Please check the element ID or HTML.');
}

// Initialize the application
initializeWorker();
