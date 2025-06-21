/**
 * Speech Recognition Management
 * Handles speech recognition functionality with proper error handling and state management
 */

class SpeechRecognitionManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.currentStream = null;
    this.audioProcessorLeft = null;
    this.audioProcessorRight = null;
    this.lastTranscript = '';
    
    // Callbacks
    this.onTranscriptCallback = null;
    this.onStateChangeCallback = null;
    this.onErrorCallback = null;
    
    this.initializeSpeechRecognition();
  }

  /**
   * Initialize speech recognition with browser compatibility
   */
  initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }
    
    this.recognition = new SpeechRecognition();
    this.setupRecognitionEvents();
  }

  /**
   * Set up speech recognition event handlers
   */
  setupRecognitionEvents() {
    if (!this.recognition) return;
    
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    
    this.recognition.onstart = () => {
      console.log('Speech recognition service started');
      this.isListening = true;
      this.notifyStateChange('listening');
    };
    
    this.recognition.onend = () => {
      console.log('Speech recognition service ended');
      this.isListening = false;
      this.notifyStateChange('stopped');
    };
    
    this.recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      console.log('Speech recognition result:', transcript);
      
      if (transcript !== this.lastTranscript) {
        this.lastTranscript = transcript;
        this.notifyTranscript(transcript);
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.handleRecognitionError(event.error);
    };
  }

  /**
   * Handle speech recognition errors with user-friendly messages
   * @param {string} error - Error type from speech recognition
   */
  handleRecognitionError(error) {
    let errorMessage = '';
    let shouldStop = false;
    
    switch (error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Try speaking closer to the microphone.';
        break;
      case 'audio-capture':
        errorMessage = 'Audio capture error. Please ensure your microphone is working and permissions are granted.';
        shouldStop = true;
        break;
      case 'not-allowed':
        errorMessage = 'Speech recognition permission denied. Please allow microphone access in your browser settings.';
        shouldStop = true;
        break;
      case 'network':
        errorMessage = 'Network error occurred during speech recognition.';
        break;
      case 'aborted':
        errorMessage = 'Speech recognition was aborted.';
        break;
      default:
        errorMessage = `Speech recognition error: ${error}`;
    }
    
    this.notifyError(errorMessage);
    
    if (shouldStop && this.isListening) {
      this.stopListening();
    }
  }

  /**
   * Start listening for speech
   * @returns {Promise<boolean>} Success status
   */
  async startListening() {
    if (this.isListening) {
      console.warn('Already listening');
      return false;
    }
    
    try {
      // Request microphone access
      this.currentStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      
      console.log('Microphone access granted');
      
      // Start visualizers
      await this.startVisualizers();
      
      // Start speech recognition
      this.recognition.start();
      
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.notifyError(`Failed to access microphone: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop listening for speech
   */
  stopListening() {
    if (!this.isListening) {
      console.warn('Not currently listening');
      return;
    }
    
    // Stop speech recognition
    if (this.recognition) {
      this.recognition.stop();
    }
    
    // Stop visualizers
    this.stopVisualizers();
    
    // Release microphone stream
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
      console.log('Microphone stream released');
    }
    
    this.isListening = false;
    this.notifyStateChange('stopped');
  }

  /**
   * Toggle listening state
   * @returns {Promise<boolean>} New listening state
   */
  async toggleListening() {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      const success = await this.startListening();
      return success;
    }
  }

  /**
   * Start audio visualizers
   */
  async startVisualizers() {
    if (!this.currentStream) {
      console.warn('No audio stream available for visualizers');
      return;
    }
    
    const containerLeft = document.getElementById('visualizer-container-left');
    const containerRight = document.getElementById('visualizer-container-right');
    
    if (!containerLeft || !containerRight) {
      console.error('Visualizer containers not found');
      return;
    }
    
    // Stop any existing visualizers
    this.stopVisualizers();
    
    try {
      // Show containers
      containerLeft.style.display = 'flex';
      containerRight.style.display = 'flex';
      
      // Initialize left visualizer
      this.audioProcessorLeft = new AudioProcessor();
      await this.audioProcessorLeft.initAudioContext();
      this.audioProcessorLeft.setupVisualizer(this.currentStream, containerLeft);
      
      // Initialize right visualizer
      this.audioProcessorRight = new AudioProcessor();
      await this.audioProcessorRight.initAudioContext();
      this.audioProcessorRight.setupVisualizer(this.currentStream, containerRight);
      
      console.log('Audio visualizers started');
    } catch (error) {
      console.error('Error starting visualizers:', error);
      this.stopVisualizers();
    }
  }

  /**
   * Stop audio visualizers
   */
  stopVisualizers() {
    console.log('Stopping visualizers...');
    
    // Stop left visualizer
    if (this.audioProcessorLeft) {
      try {
        this.audioProcessorLeft.stopVisualizer();
      } catch (error) {
        console.error('Error stopping left visualizer:', error);
      }
      this.audioProcessorLeft = null;
    }
    
    // Stop right visualizer
    if (this.audioProcessorRight) {
      try {
        this.audioProcessorRight.stopVisualizer();
      } catch (error) {
        console.error('Error stopping right visualizer:', error);
      }
      this.audioProcessorRight = null;
    }
    
    // Hide containers
    const containerLeft = document.getElementById('visualizer-container-left');
    const containerRight = document.getElementById('visualizer-container-right');
    
    if (containerLeft) containerLeft.style.display = 'none';
    if (containerRight) containerRight.style.display = 'none';
    
    console.log('Visualizers stopped');
  }

  /**
   * Check if speech recognition is supported
   * @returns {boolean} Support status
   */
  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Check if currently listening
   * @returns {boolean} Listening status
   */
  getListeningState() {
    return this.isListening;
  }

  /**
   * Set transcript callback
   * @param {Function} callback - Callback function for new transcripts
   */
  onTranscript(callback) {
    this.onTranscriptCallback = callback;
  }

  /**
   * Set state change callback
   * @param {Function} callback - Callback function for state changes
   */
  onStateChange(callback) {
    this.onStateChangeCallback = callback;
  }

  /**
   * Set error callback
   * @param {Function} callback - Callback function for errors
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }

  /**
   * Notify transcript callback
   * @param {string} transcript - New transcript text
   */
  notifyTranscript(transcript) {
    if (this.onTranscriptCallback) {
      try {
        this.onTranscriptCallback(transcript);
      } catch (error) {
        console.error('Error in transcript callback:', error);
      }
    }
  }

  /**
   * Notify state change callback
   * @param {string} state - New state
   */
  notifyStateChange(state) {
    if (this.onStateChangeCallback) {
      try {
        this.onStateChangeCallback(state);
      } catch (error) {
        console.error('Error in state change callback:', error);
      }
    }
  }

  /**
   * Notify error callback
   * @param {string} errorMessage - Error message
   */
  notifyError(errorMessage) {
    if (this.onErrorCallback) {
      try {
        this.onErrorCallback(errorMessage);
      } catch (error) {
        console.error('Error in error callback:', error);
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopListening();
    this.recognition = null;
    this.onTranscriptCallback = null;
    this.onStateChangeCallback = null;
    this.onErrorCallback = null;
  }
}

// Export for global use
window.SpeechRecognitionManager = SpeechRecognitionManager;