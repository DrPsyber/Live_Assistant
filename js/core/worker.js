console.log('Worker script loading...');

// Use dynamic imports to avoid module loading issues
let pipeline, AutoProcessor, AutoModelForAudioFrameClassification;

async function initializeTransformers() {
    console.log('Dynamically importing transformers...');
    console.log('Worker origin:', self.location.origin);
    console.log('Worker location:', self.location.href);
    
    try {
        // Use local import first to avoid CORS issues with internal workers
        console.log('Attempting local import from node_modules...');
        const transformers = await import('@huggingface/transformers');
        pipeline = transformers.pipeline;
        AutoProcessor = transformers.AutoProcessor;
        AutoModelForAudioFrameClassification = transformers.AutoModelForAudioFrameClassification;
        console.log('Worker imports loaded successfully via local package');
    } catch (error) {
        console.error('Local import failed with error:', error.name, error.message);
        console.log('Attempting fallback to CDN import...');
        try {
            // Fallback to CDN import (may still have CORS issues)
            const transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.2.3/dist/transformers.min.js');
            pipeline = transformers.pipeline;
            AutoProcessor = transformers.AutoProcessor;
            AutoModelForAudioFrameClassification = transformers.AutoModelForAudioFrameClassification;
            console.log('Worker imports loaded successfully via CDN fallback');
        } catch (fallbackError) {
            console.error('CDN fallback also failed:', fallbackError.name, fallbackError.message);
            throw new Error(`Both local and CDN imports failed. Local error: ${error.message}. CDN error: ${fallbackError.message}`);
        }
    }
}

console.log('Worker basic script loaded successfully');

const PER_DEVICE_CONFIG = {
    webgpu: {
        dtype: {
            encoder_model: 'fp32',
            decoder_model_merged: 'q4',
        },
        device: 'webgpu',
    },
    wasm: {
        dtype: 'q8',
        device: 'wasm',
    },
};

// Constants for audio processing
const SAMPLE_RATE = 16000;
const CHUNK_DURATION = 1; // seconds
const CHUNK_OVERLAP = 1; // seconds
const CHUNK_SAMPLES = CHUNK_DURATION * SAMPLE_RATE;
const OVERLAP_SAMPLES = CHUNK_OVERLAP * SAMPLE_RATE;

class AudioProcessor {
    constructor() {
        this.buffer = new Float32Array(0);
        this.isProcessing = false;
        this.currentSpeakers = new Map(); // Track active speakers
        this.lastChunkEnd = 0;
    }

    // Add new audio data to the buffer
    addAudio(audioData) {
        const newBuffer = new Float32Array(this.buffer.length + audioData.length);
        newBuffer.set(this.buffer);
        newBuffer.set(audioData, this.buffer.length);
        this.buffer = newBuffer;
    }

    // Get the next chunk of audio for processing
    getNextChunk() {
        if (this.buffer.length < CHUNK_SAMPLES) {
            return null;
        }

        // Get chunk with overlap
        const chunk = this.buffer.slice(0, CHUNK_SAMPLES + OVERLAP_SAMPLES);
        
        // Remove processed samples, keeping overlap for next chunk
        this.buffer = this.buffer.slice(CHUNK_SAMPLES);
        
        return chunk;
    }

    // Reset the processor state
    reset() {
        this.buffer = new Float32Array(0);
        this.isProcessing = false;
        this.currentSpeakers.clear();
        this.lastChunkEnd = 0;
    }
}

class PipelineSingeton {
    static asr_model_id = 'onnx-community/whisper-base_timestamped';
    static asr_instance = null;

    static segmentation_model_id = 'onnx-community/pyannote-segmentation-3.0';
    static segmentation_instance = null;
    static segmentation_processor = null;

    static audioProcessor = new AudioProcessor();

    static async getInstance(progress_callback = null, device = 'webgpu') {
        this.asr_instance ??= pipeline('automatic-speech-recognition', this.asr_model_id, {
            ...PER_DEVICE_CONFIG[device],
            progress_callback,
            chunk_length_s: CHUNK_DURATION,
            stride_length_s: CHUNK_DURATION - CHUNK_OVERLAP,
        });

        this.segmentation_processor ??= AutoProcessor.from_pretrained(this.segmentation_model_id, {
            progress_callback,
        });
        this.segmentation_instance ??= AutoModelForAudioFrameClassification.from_pretrained(this.segmentation_model_id, {
            device: 'wasm',
            dtype: 'fp32',
            progress_callback,
        });

        return Promise.all([this.asr_instance, this.segmentation_processor, this.segmentation_instance]);
    }
}

async function load({ device }) {
    console.log('Worker: load called with device:', device);
    
    try {
        // First initialize the transformers library
        await initializeTransformers();
        
        self.postMessage({
            status: 'loading',
            data: `Loading models (${device})...`
        });

        // Throttle progress messages to prevent infinite loop
        let lastProgressTime = 0;
        const progressThrottle = (progress) => {
            const now = Date.now();
            if (now - lastProgressTime > 1000) { // Only send progress every 1 second
                console.log('Worker progress:', progress);
                self.postMessage(progress);
                lastProgressTime = now;
            }
        };

        const [transcriber, segmentation_processor, segmentation_model] = await PipelineSingeton.getInstance(progressThrottle, device);

        if (device === 'webgpu') {
            self.postMessage({
                status: 'loading',
                data: 'Compiling shaders and warming up model...'
            });

            await transcriber(new Float32Array(16_000), {
                language: 'en',
            });
        }

        self.postMessage({ status: 'loaded' });
        console.log('Worker: Models loaded successfully');
    } catch (error) {
        console.error('Error loading transformers:', error);
        self.postMessage({
            status: 'error',
            data: 'Failed to load AI models: ' + error.message
        });
    }
}

async function processAudioChunk(transcriber, processor, model, audioChunk, language) {
    const [transcript, segments] = await Promise.all([
        transcriber(audioChunk, {
            language,
            return_timestamps: 'word',
        }),
        segment(processor, model, audioChunk)
    ]);

    return { transcript, segments };
}

async function segment(processor, model, audio) {
    const inputs = await processor(audio);
    const { logits } = await model(inputs);
    const segments = processor.post_process_speaker_diarization(logits, audio.length)[0];

    // Attach labels
    for (const segment of segments) {
        segment.label = model.config.id2label[segment.id];
    }

    return segments;
}

async function startStreaming({ language }) {
    console.log('Worker: startStreaming called with language:', language);
    
    // Initialize audio processor if it exists
    if (PipelineSingeton.audioProcessor) {
        PipelineSingeton.audioProcessor.reset();
    }
    
    console.log('Worker: sending streaming status');
    self.postMessage({
        status: 'streaming',
        data: 'Started streaming mode'
    });
    console.log('Worker: sending ready status');
    // Signal that the worker is ready to receive audio data
    self.postMessage({ status: 'ready' });
    console.log('Worker: startStreaming completed');
}

async function processStream({ chunk, language }) {
    console.log('Worker: processStream called with chunk length:', chunk.length);
    
    // Check if audio processor is available
    if (!PipelineSingeton.audioProcessor) {
        console.warn('Worker: Audio processor not available, using fallback');
        
        // Fallback: process the chunk directly
        try {
            const [transcriber, segmentation_processor, segmentation_model] = await PipelineSingeton.getInstance();
            const result = await processAudioChunk(transcriber, segmentation_processor, segmentation_model, chunk, language);
            
            console.log('Worker: Posting result to main');
            self.postMessage({
                status: 'partial',
                result
            });
        } catch (error) {
            console.error('Worker: Processing error:', error);
            self.postMessage({
                status: 'error',
                data: error.message
            });
        }
        return;
    }

    const processor = PipelineSingeton.audioProcessor;
    processor.addAudio(chunk);

    if (processor.isProcessing) {
        return; // Skip if already processing a chunk
    }

    const audioChunk = processor.getNextChunk();
    if (!audioChunk) {
        return; // Not enough audio data yet
    }

    processor.isProcessing = true;
    try {
        const [transcriber, segmentation_processor, segmentation_model] = await PipelineSingeton.getInstance();
        const result = await processAudioChunk(transcriber, segmentation_processor, segmentation_model, audioChunk, language);
        
        // Adjust timestamps relative to the overall stream
        const timeOffset = processor.lastChunkEnd;
        if (result.transcript && result.transcript.chunks) {
            for (const chunk of result.transcript.chunks) {
                chunk.timestamp[0] += timeOffset;
                chunk.timestamp[1] += timeOffset;
            }
        }
        if (result.segments) {
            for (const segment of result.segments) {
                segment.start += timeOffset;
                segment.end += timeOffset;
            }
        }

        processor.lastChunkEnd = timeOffset + CHUNK_DURATION;

        console.log('Worker: Posting result to main');
        self.postMessage({
            status: 'partial',
            result
        });
    } catch (error) {
        console.error('Worker: Processing error:', error);
        self.postMessage({
            status: 'error',
            data: error.message
        });
    } finally {
        processor.isProcessing = false;
    }
}

async function stopStreaming(data = { language: 'en' }) {
    // Process any remaining audio in the buffer
    const processor = PipelineSingeton.audioProcessor;
    if (processor.buffer.length > 0) {
        const [transcriber, segmentation_processor, segmentation_model] = await PipelineSingeton.getInstance();
        const result = await processAudioChunk(transcriber, segmentation_processor, segmentation_model, processor.buffer, data.language);
        
        self.postMessage({
            status: 'partial',
            result
        });
    }

    processor.reset();
    self.postMessage({
        status: 'stopped',
        data: 'Streaming stopped'
    });
}

// Listen for messages from the main thread
self.addEventListener('message', async (e) => {
    console.log('Worker: Received data from main');
    const { type, data } = e.data;

    switch (type) {
        case 'load':
            await load(data);
            break;

        case 'startStream':
            await startStreaming(data);
            break;

        case 'stream':
            await processStream(data);
            break;

        case 'stopStream':
            await stopStreaming(data);
            break;
    }
});
