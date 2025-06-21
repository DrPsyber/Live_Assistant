class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        console.log('AudioProcessor instantiated');
        this.port.onmessage = this.handleMessage.bind(this);
    }

    handleMessage(event) {
        // Handle any configuration messages from the main thread if needed
        const { type, data } = event.data;
        if (type === 'configure') {
            // Store any configuration if needed
            this.config = data;
        }
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        
        // Debug: Always log to see if process is being called
        console.log('Worklet process() called, input:', input);
        
        // Only process if we have input data
        if (input && input.length > 0) {
            console.log('Processing audio...');
            const inputData = input[0]; // Get first channel
            console.log('Input data length:', inputData.length, 'first few samples:', inputData.slice(0, 5));
            
            // Send audio data to main thread
            console.log('Worklet: Posting audio data');
            this.port.postMessage({
                type: 'audioData',
                data: inputData
            });
        } else {
            console.log('No input data available');
        }

        // Return true to keep the processor alive
        return true;
    }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);