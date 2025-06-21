/**
 * Main Application Entry Point
 * Initializes and coordinates all application modules
 */

class App {
  constructor() {
    this.isInitialized = false;
    this.components = {};
    this.lastTranscript = '';
  }

  /**
   * Initialize the application
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('App already initialized');
      return;
    }

    console.log('Initializing Live Assistant application...');

    try {
      // Check browser compatibility
      this.checkBrowserCompatibility();

      // Initialize core components
      await this.initializeComponents();

      // Set up application event handlers
      this.setupApplicationHandlers();

      // Load saved state
      this.loadApplicationState();

      // Initialize models
      await this.initializeModels();

      // Mark as initialized
      this.isInitialized = true;

      console.log('Live Assistant application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showInitializationError(error);
    }
  }

  /**
   * Check browser compatibility
   */
  checkBrowserCompatibility() {
    const requirements = [
      { feature: 'SpeechRecognition', check: () => true },
      { feature: 'FileAPI', check: () => !!(window.File && window.FileReader) },
      { feature: 'LocalStorage', check: () => !!window.localStorage },
      { feature: 'Fetch', check: () => !!window.fetch },
      { feature: 'AudioContext', check: () => !!(window.AudioContext || window.webkitAudioContext) }
    ];

    const unsupported = requirements.filter(req => !req.check());
    
    if (unsupported.length > 0) {
      const features = unsupported.map(req => req.feature).join(', ');
      throw new Error(`Browser does not support required features: ${features}`);
    }
  }

  /**
   * Initialize core application components
   */
  async initializeComponents() {
    console.log('Initializing components...');

    // Initialize UI State Manager
    if (window.UIStateManager) {
      this.components.uiStateManager = new UIStateManager();
      window.uiStateManager = this.components.uiStateManager;
    }

    // Initialize UI Manager
    if (window.UIManager) {
      this.components.uiManager = new UIManager();
      window.uiManager = this.components.uiManager;
      this.components.uiManager.initialize();
    }

    // Initialize API Client
    if (window.APIClient) {
      this.components.apiClient = new APIClient();
      window.apiClient = this.components.apiClient;
    }

    // SpeechRecognitionManager removed: handled by new pipeline in main.js

    // Initialize Preset Manager
    if (window.PresetManager) {
      this.components.presetManager = new PresetManager();
      window.presetManager = this.components.presetManager;
      this.components.presetManager.initialize();
    }

    // Initialize File Manager
    if (window.FileManager) {
      this.components.fileManager = new FileManager();
      window.fileManager = this.components.fileManager;
    }

    console.log('Components initialized');
  }

  /**
   * Set up speech recognition event handlers
   */
  // setupSpeechHandlers removed: handled by new pipeline in main.js

  /**
   * Set up application-level event handlers
   */
  setupApplicationHandlers() {
    // Handle app state changes
    if (window.appState) {
      window.appState.subscribe((key, value) => {
        this.handleStateChange(key, value);
      });
    }

    // Handle window events
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Handle visibility changes (pause/resume)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleAppPause();
      } else {
        this.handleAppResume();
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      console.log('Application is back online');
      this.handleOnlineStateChange(true);
    });

    window.addEventListener('offline', () => {
      console.log('Application is offline');
      this.handleOnlineStateChange(false);
    });
  }

  /**
   * Load application state from storage
   */
  loadApplicationState() {
    console.log('Loading application state...');
    
    if (window.appState) {
      window.appState.loadFromStorage();
    }

    // Update UI with loaded state
    if (this.components.uiManager && window.appState) {
      this.components.uiManager.renderHistoryList();
      this.components.uiManager.renderUploadedFiles();
    }

    console.log('Application state loaded');
  }

  /**
   * Initialize models dropdown
   */
  async initializeModels() {
    console.log('Initializing models...');
    
    if (!this.components.apiClient || !this.components.uiManager) {
      console.warn('API client or UI manager not available for model initialization');
      return;
    }

    try {
      const models = await this.components.apiClient.fetchAvailableModels();
      this.components.uiManager.populateModelDropdown(models);
      
      // Set default model if none selected
      if (window.appState) {
        const selectedModel = window.appState.getState('selectedModel');
        if (!selectedModel && models.length > 0) {
          const defaultModel = models.find(m => m.shortId === 'gpt-4o') || models[0];
          window.appState.setState('selectedModel', defaultModel.shortId);
        }
      }
      
      console.log('Models initialized successfully');
    } catch (error) {
      console.error('Error initializing models:', error);
      // Models will fall back to hardcoded list in API client
    }
  }

  /**
   * Generate AI response for user input
   * @param {string} userInput - User's transcribed speech
   */
  async generateResponse(userInput) {
    if (!userInput || !userInput.trim()) {
      console.warn('Empty user input, skipping response generation');
      return;
    }

    if (!this.components.apiClient || !this.components.uiManager || !window.appState) {
      console.error('Required components not available for response generation');
      return;
    }

    try {
      // Show loading state
      this.components.uiManager.updateResponse('Thinking...', true);
      this.components.uiManager.updateUIState('processing');

      // Get current settings
      const systemPrompt = window.appState.getState('systemPrompt');
      const selectedModel = window.appState.getState('selectedModel');
      const filesContext = window.appState.getUploadedFilesContext();

      // Generate response
      const response = await this.components.apiClient.generateResponse(
        userInput,
        selectedModel,
        systemPrompt,
        filesContext
      );

      // Update UI with response
      this.components.uiManager.updateResponse(response);
      
      // Add to history
      window.appState.addToHistory(userInput, response, selectedModel);
      
      // Update history display
      this.components.uiManager.renderHistoryList();

      // Update UI state
      this.components.uiManager.updateUIState('ready');

      console.log('Response generated successfully');
    } catch (error) {
      console.error('Error generating response:', error);
      this.components.uiManager.showError(error.message);
    }
  }

  /**
   * Handle application state changes
   * @param {string} key - State key that changed
   * @param {*} value - New value
   */
  handleStateChange(key, value) {
    console.log(`App state changed: ${key}`, value);

    // Handle specific state changes
    switch (key) {
      case 'responseHistory':
        if (this.components.uiManager) {
          this.components.uiManager.renderHistoryList();
        }
        break;
      
      case 'uploadedFiles':
        if (this.components.uiManager) {
          this.components.uiManager.renderUploadedFiles();
        }
        break;
      
      case 'presets':
        if (this.components.presetManager) {
          this.components.presetManager.updatePresetDropdowns();
          this.components.presetManager.renderPresetList();
        }
        break;
      
      case 'selectedModel':
        // Update model dropdown selection
        const modelSelect = document.getElementById('model-select');
        if (modelSelect && modelSelect.value !== value) {
          modelSelect.value = value;
        }
        break;
    }
  }

  /**
   * Handle application pause (tab becomes hidden)
   */
  handleAppPause() {
    console.log('Application paused');
    
    // Optionally pause speech recognition when tab is hidden
    // Speech recognition pause/resume handled by new pipeline in main.js
  }

  /**
   * Handle application resume (tab becomes visible)
   */
  handleAppResume() {
    console.log('Application resumed');
    
    // Resume any paused operations if needed
    // This is where you might restart speech recognition if it was paused
  }

  /**
   * Handle online/offline state changes
   * @param {boolean} isOnline - Whether the app is online
   */
  handleOnlineStateChange(isOnline) {
    if (isOnline) {
      // Re-enable features that require internet
      console.log('Internet connection restored');
    } else {
      // Disable features that require internet
      console.log('Internet connection lost - some features may be unavailable');
      
      if (this.components.uiManager) {
        this.components.uiManager.showError('Internet connection lost. Please check your connection.');
      }
    }
  }

  /**
   * Show initialization error to user
   * @param {Error} error - Initialization error
   */
  showInitializationError(error) {
    const errorMessage = `Failed to initialize application: ${error.message}`;
    console.error(errorMessage);
    
    // Try to show error in UI, fallback to alert
    try {
      if (this.components.uiManager) {
        this.components.uiManager.showError(errorMessage);
      } else {
        alert(errorMessage);
      }
    } catch (uiError) {
      alert(errorMessage);
    }
  }

  /**
   * Cleanup resources before page unload
   */
  cleanup() {
    console.log('Cleaning up application resources...');
    
    // Stop speech recognition
    if (this.components.speechManager) {
      // Speech recognition cleanup handled by new pipeline in main.js
    }

    // Clear any ongoing timeouts/intervals
    // (Add cleanup for any timers you might have)

    console.log('Application cleanup completed');
  }

  /**
   * Get application status
   * @returns {Object} Application status information
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      components: Object.keys(this.components),
      speechListening: false,
      filesUploaded: window.appState?.getState('uploadedFiles')?.length || 0,
      historyItems: window.appState?.getState('responseHistory')?.length || 0
    };
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing application...');
  
  try {
    const app = new App();
    window.app = app; // Make app available globally for debugging
    
    await app.initialize();
  } catch (error) {
    console.error('Critical error during application initialization:', error);
    alert(`Application failed to start: ${error.message}`);
  }
});

// Export for testing and debugging
window.App = App;