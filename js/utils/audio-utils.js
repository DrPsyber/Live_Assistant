// Audio Processing Utilities
export class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.sourceNode = null;
        this.dataArray = null;
        this.visualizerBars = [];
        this.visualizerInitialized = false;
    }

    async initAudioContext(sampleRate = 16000) {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: 'interactive',
                sampleRate: sampleRate
            });
            return this.audioContext;
        } catch (error) {
            console.error('Failed to initialize audio context with sample rate:', sampleRate, error);
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    latencyHint: 'interactive'
                });
                console.log('Using default sample rate:', this.audioContext.sampleRate);
                return this.audioContext;
            } catch (fallbackError) {
                throw new Error('Failed to initialize audio context: ' + fallbackError.message);
            }
        }
    }

    convertToWav(audioBuffer) {
        const numOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numOfChannels * 2;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);

        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numOfChannels, true);
        view.setUint32(24, audioBuffer.sampleRate, true);
        view.setUint32(28, audioBuffer.sampleRate * 2 * numOfChannels, true);
        view.setUint16(32, numOfChannels * 2, true);
        view.setUint16(34, 16, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, length, true);

        const data = new Float32Array(audioBuffer.getChannelData(0));
        let offset = 44;
        for (let i = 0; i < data.length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    setupVisualizer(stream, containerElement) {
        if (!this.audioContext) throw new Error('Audio context is not initialized');
        this.stopVisualizer();
        containerElement.innerHTML = '';
        this.visualizerBars = [];
        containerElement.style.maxHeight = '1.25em';
        for (let i = 0; i < 12; i++) {
            const bar = document.createElement('div');
            Object.assign(bar.style, {
                display: 'inline-block',
                width: '10px',
                height: '1px',
                margin: '0 1px',
                transition: 'height 0.1s ease-out'
            });
            containerElement.appendChild(bar);
            this.visualizerBars.push(bar);
        }
        this.visualizerInitialized = true;
        this.sourceNode = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        this.sourceNode.connect(this.analyser);
        this.updateVisualizer();
    }

    updateVisualizer() {
        if (!this.analyser || !this.visualizerBars.length) return;
        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        const barCount = this.visualizerBars.length;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        for (let i = 0; i < barCount; i++) {
            const bar = this.visualizerBars[i];
            const randomFactor = 0.8 + Math.random() * 0.4;
            const height = Math.max(5, Math.min(40, average * randomFactor * 0.8));
            Object.assign(bar.style, {
                height: height + 'px',
                backgroundColor: '#0EA27F',
                display: 'inline-block',
                width: '10px',
                margin: '0 1px',
                transition: 'height 0.1s ease-out'
            });
        }
        if (this.analyser) {
            requestAnimationFrame(() => this.updateVisualizer());
        }
    }

    stopVisualizer() {
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        this.dataArray = null;
        for (const bar of this.visualizerBars) {
            Object.assign(bar.style, {
                height: '1px',
                backgroundColor: 'rgba(14, 162, 127, 0.3)',
                display: 'inline-block',
                width: '10px',
                margin: '0 1px',
                transition: 'height 0.1s ease-out'
            });
        }
        this.visualizerBars = [];
        this.visualizerInitialized = false;
    }

    hasSpeech(audioBuffer, threshold = 0.01) {
        const audioData = audioBuffer.getChannelData(0);
        let sumSquares = 0;
        for (let i = 0; i < audioData.length; i++) {
            sumSquares += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sumSquares / audioData.length);
        return rms > threshold;
    }

    async processAudioChunk(audioChunk, targetSampleRate = 16000) {
        if (!this.audioContext) {
            return audioChunk;
        }
        try {
            const arrayBuffer = await audioChunk.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            const containsSpeech = this.hasSpeech(audioBuffer);
            let processedBuffer = audioBuffer;
            if (audioBuffer.sampleRate !== targetSampleRate) {
                try {
                    const resampledBuffer = await this.resampleAudio(audioBuffer, targetSampleRate);
                    if (resampledBuffer) {
                        processedBuffer = resampledBuffer;
                    }
                } catch (resampleError) {
                    // Use original buffer on error
                }
            }
            const wavBlob = this.convertToWav(processedBuffer);
            return wavBlob;
        } catch (error) {
            return audioChunk;
        }
    }

    async resampleAudio(audioBuffer, targetSampleRate) {
        if (audioBuffer.sampleRate === targetSampleRate) {
            return audioBuffer;
        }
        try {
            const originalSampleRate = audioBuffer.sampleRate;
            const ratio = targetSampleRate / originalSampleRate;
            const originalLength = audioBuffer.length;
            const newLength = Math.round(originalLength * ratio);
            const offlineContext = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                newLength,
                targetSampleRate
            );
            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineContext.destination);
            source.start(0);
            const resampledBuffer = await offlineContext.startRendering();
            return resampledBuffer;
        } catch (error) {
            return audioBuffer;
        }
    }
}