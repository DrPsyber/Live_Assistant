/**
 * Application State Management
 * Centralized state management for the Live Assistant application
 */

class AppState {
  constructor() {
    this.state = {
      responseHistory: [],
      systemPrompt: 'You are a C-suite communication strategist specializing in reframing challenges as opportunities. Craft concise, authoritative responses that acknowledge objections while shifting perspective toward mutual benefit. Your goal is to maintain leadership presence while turning potential conflicts into collaborative solutions.',
      selectedModel: 'gpt-4o',
      uploadedFiles: [],
      presets: {
        'executive-reframer': {
          name: 'Executive Reframer',
          prompt: 'You are a C-suite communication strategist specializing in reframing challenges as opportunities. Craft concise, authoritative responses that acknowledge objections while shifting perspective toward mutual benefit. Your goal is to maintain leadership presence while turning potential conflicts into collaborative solutions.'
        },
        'negotiation': {
          name: 'Negotiation Expert',
          prompt: 'You are a skilled negotiation expert. Generate concise, tactical responses that redirect objections while building value. Focus on finding common ground, addressing concerns empathetically, and guiding toward agreement. Use data and logical framing to strengthen your position. Keep responses under 15 words and maintain a persuasive yet collaborative tone.'
        }
      }
    };
    
    this.subscribers = [];
    this.storageKeys = {
      SYSTEM_PROMPT: 'system_prompt',
      SELECTED_MODEL: 'selected_model', 
      RESPONSE_HISTORY: 'response_history',
      UPLOADED_FILES: 'uploaded_files',
      CUSTOM_PRESETS: 'custom_presets',
      GITHUB_TOKEN: 'github_token',
      THEME_MODE: 'theme_mode'
    };
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - Callback function to execute on state change
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers of state change
   * @param {string} key - The state key that changed
   * @param {*} value - The new value
   */
  notify(key, value) {
    this.subscribers.forEach(callback => {
      try {
        callback(key, value, this.state);
      } catch (error) {
        console.error('Error in state subscriber:', error);
      }
    });
  }

  /**
   * Update state and persist to localStorage
   * @param {string} key - State key to update
   * @param {*} value - New value
   * @param {boolean} persist - Whether to persist to localStorage
   */
  setState(key, value, persist = true) {
    const oldValue = this.state[key];
    this.state[key] = value;
    
    if (persist) {
      this.persistState(key, value);
    }
    
    // Only notify if value actually changed
    if (oldValue !== value) {
      this.notify(key, value);
    }
  }

  /**
   * Get state value
   * @param {string} key - State key
   * @returns {*} State value
   */
  getState(key) {
    return this.state[key];
  }

  /**
   * Get entire state object (read-only)
   * @returns {Object} Copy of current state
   */
  getAllState() {
    return { ...this.state };
  }

  /**
   * Persist specific state to localStorage
   * @param {string} key - State key
   * @param {*} value - Value to persist
   */
  persistState(key, value) {
    try {
      const storageKey = this.getStorageKey(key);
      if (storageKey) {
        if (typeof value === 'object') {
          localStorage.setItem(storageKey, JSON.stringify(value));
        } else {
          localStorage.setItem(storageKey, value);
        }
      }
    } catch (error) {
      console.error(`Failed to persist state for key ${key}:`, error);
    }
  }

  /**
   * Get storage key for state key
   * @param {string} stateKey - Application state key
   * @returns {string|null} localStorage key or null if not found
   */
  getStorageKey(stateKey) {
    const keyMap = {
      systemPrompt: this.storageKeys.SYSTEM_PROMPT,
      selectedModel: this.storageKeys.SELECTED_MODEL,
      responseHistory: this.storageKeys.RESPONSE_HISTORY,
      uploadedFiles: this.storageKeys.UPLOADED_FILES,
      presets: this.storageKeys.CUSTOM_PRESETS
    };
    return keyMap[stateKey] || null;
  }

  /**
   * Load all state from localStorage
   */
  loadFromStorage() {
    try {
      // Load system prompt
      const savedPrompt = localStorage.getItem(this.storageKeys.SYSTEM_PROMPT);
      if (savedPrompt) {
        this.setState('systemPrompt', savedPrompt, false);
      }

      // Load selected model
      const savedModel = localStorage.getItem(this.storageKeys.SELECTED_MODEL);
      if (savedModel) {
        this.setState('selectedModel', savedModel, false);
      }

      // Load response history
      const savedHistory = localStorage.getItem(this.storageKeys.RESPONSE_HISTORY);
      if (savedHistory) {
        try {
          const history = JSON.parse(savedHistory);
          this.setState('responseHistory', Array.isArray(history) ? history : [], false);
        } catch (e) {
          console.error('Error parsing saved history:', e);
          this.setState('responseHistory', [], false);
        }
      }

      // Load uploaded files
      const savedFiles = localStorage.getItem(this.storageKeys.UPLOADED_FILES);
      if (savedFiles) {
        try {
          const files = JSON.parse(savedFiles);
          this.setState('uploadedFiles', Array.isArray(files) ? files : [], false);
        } catch (e) {
          console.error('Error parsing saved files:', e);
          this.setState('uploadedFiles', [], false);
        }
      }

      // Load custom presets
      const savedPresets = localStorage.getItem(this.storageKeys.CUSTOM_PRESETS);
      if (savedPresets) {
        try {
          const customPresets = JSON.parse(savedPresets);
          // Merge with default presets
          this.setState('presets', { ...this.state.presets, ...customPresets }, false);
        } catch (e) {
          console.error('Error parsing saved presets:', e);
        }
      }

      console.log('App state loaded from storage');
    } catch (error) {
      console.error('Error loading state from storage:', error);
    }
  }

  /**
   * Add response to history
   * @param {string} objection - The user's objection
   * @param {string} response - The AI response
   * @param {string} model - The model used
   */
  addToHistory(objection, response, model) {
    const history = [...this.state.responseHistory];
    const timestamp = new Date().toLocaleTimeString();
    
    const historyItem = {
      objection,
      response,
      model,
      timestamp,
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
    
    history.push(historyItem);
    
    // Limit history to 50 items
    if (history.length > 50) {
      history.shift();
    }
    
    this.setState('responseHistory', history);
  }

  /**
   * Clear response history
   */
  clearHistory() {
    this.setState('responseHistory', []);
  }

  /**
   * Add uploaded file
   * @param {Object} fileData - File data object
   */
  addUploadedFile(fileData) {
    const files = [...this.state.uploadedFiles];
    files.push({
      ...fileData,
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      uploadDate: new Date().toISOString()
    });
    this.setState('uploadedFiles', files);
  }

  /**
   * Remove uploaded file
   * @param {string} fileId - File ID to remove
   */
  removeUploadedFile(fileId) {
    const files = this.state.uploadedFiles.filter(file => file.id !== fileId);
    this.setState('uploadedFiles', files);
  }

  /**
   * Clear all uploaded files
   */
  clearUploadedFiles() {
    this.setState('uploadedFiles', []);
  }

  /**
   * Add or update preset
   * @param {string} id - Preset ID
   * @param {Object} preset - Preset data
   */
  savePreset(id, preset) {
    const presets = { ...this.state.presets };
    presets[id] = preset;
    this.setState('presets', presets);
    
    // Save only custom presets to localStorage
    const customPresets = {};
    Object.entries(presets).forEach(([presetId, presetData]) => {
      if (!['executive-reframer', 'negotiation'].includes(presetId)) {
        customPresets[presetId] = presetData;
      }
    });
    
    try {
      localStorage.setItem(this.storageKeys.CUSTOM_PRESETS, JSON.stringify(customPresets));
    } catch (error) {
      console.error('Failed to save custom presets:', error);
    }
  }

  /**
   * Delete preset
   * @param {string} id - Preset ID to delete
   */
  deletePreset(id) {
    // Don't allow deleting default presets
    if (['executive-reframer', 'negotiation'].includes(id)) {
      throw new Error('Cannot delete default presets');
    }
    
    const presets = { ...this.state.presets };
    delete presets[id];
    this.setState('presets', presets);
    
    // Update custom presets in localStorage
    const customPresets = {};
    Object.entries(presets).forEach(([presetId, presetData]) => {
      if (!['executive-reframer', 'negotiation'].includes(presetId)) {
        customPresets[presetId] = presetData;
      }
    });
    
    try {
      localStorage.setItem(this.storageKeys.CUSTOM_PRESETS, JSON.stringify(customPresets));
    } catch (error) {
      console.error('Failed to save custom presets after deletion:', error);
    }
  }

  /**
   * Get uploaded files context for API calls
   * @returns {string} Formatted context string
   */
  getUploadedFilesContext() {
    const files = this.state.uploadedFiles;
    if (files.length === 0) {
      return '';
    }

    let context = '\n\n--- UPLOADED FILES CONTEXT ---\n';
    files.forEach(file => {
      context += `\nFile: ${file.name}\n`;
      context += `Content:\n${file.content}\n`;
      context += '---\n';
    });

    return context;
  }
}

// Create global app state instance
window.appState = new AppState();