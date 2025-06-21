/**
 * UI Manager
 * Handles DOM interactions, updates, and user interface state management
 */

class UIManager {
  constructor() {
    this.elements = {};
    this.isInitialized = false;
    
    // Cache frequently used elements
    this.cacheElements();
    
    // Bind methods to preserve context
    this.updateTranscription = this.updateTranscription.bind(this);
    this.updateResponse = this.updateResponse.bind(this);
    this.showError = this.showError.bind(this);
  }

  /**
   * Cache DOM elements for performance
   */
  cacheElements() {
    const elementIds = [
      'toggle', 'theme-toggle', 'settings-btn',
      'lastObjection', 'reply', 'history-list',
      'settings-dialog', 'preset-dialog', 'new-preset-dialog',
      'github-token-textarea', 'model-select', 'system-prompt-dialog',
      'preset-select-dialog', 'file-upload-input', 'uploaded-files-list',
      'api-key-status', 'new-preset-status', 'new-preset-name',
      'visualizer-container-left', 'visualizer-container-right',
      'clear-history', 'history-box'
    ];
    
    elementIds.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }

  /**
   * Get cached element or query DOM
   * @param {string} id - Element ID
   * @returns {HTMLElement|null} DOM element
   */
  getElement(id) {
    if (this.elements[id]) {
      return this.elements[id];
    }
    
    const element = document.getElementById(id);
    if (element) {
      this.elements[id] = element;
    }
    
    return element;
  }

  /**
   * Initialize UI components and event listeners
   */
  initialize() {
    if (this.isInitialized) {
      console.warn('UI Manager already initialized');
      return;
    }
    
    try {
      this.setupEventListeners();
      this.initializeTheme();
      this.isInitialized = true;
      console.log('UI Manager initialized successfully');
    } catch (error) {
      console.error('Error initializing UI Manager:', error);
    }
  }

  /**
   * Set up event listeners with error handling
   */
  setupEventListeners() {
    // Recording toggle
    const toggleBtn = this.getElement('toggle');
    console.log('[UI-MANAGER] toggleBtn:', !!toggleBtn);
    if (toggleBtn) {
      toggleBtn.addEventListener('click', this.handleToggleRecording.bind(this));
    }

    // Toggle history box
    // Support both legacy and new toggle button IDs for history
    let toggleHistoryBtn = document.getElementById('toggle-history-btn');
    if (!toggleHistoryBtn) {
      toggleHistoryBtn = this.getElement('history-toggle');
    }
    console.log('[UI-MANAGER] toggleHistoryBtn:', !!toggleHistoryBtn);
    if (toggleHistoryBtn) {
      toggleHistoryBtn.addEventListener('click', this.handleToggleHistoryBox.bind(this));
    }

    // Theme toggle
    const themeToggle = this.getElement('theme-toggle');
    console.log('[UI-MANAGER] themeToggle:', !!themeToggle);
    if (themeToggle) {
      themeToggle.addEventListener('click', this.handleThemeToggle.bind(this));
    }

    // Settings dialog
    const settingsBtn = this.getElement('settings-btn');
    console.log('[UI-MANAGER] settingsBtn:', !!settingsBtn);
    if (settingsBtn) {
      settingsBtn.addEventListener('click', this.showSettingsDialog.bind(this));
    }

    // Dialog close buttons
    this.setupDialogControls();
    
    // Model selection
    const modelSelect = this.getElement('model-select');
    console.log('[UI-MANAGER] modelSelect:', !!modelSelect);
    if (modelSelect) {
      modelSelect.addEventListener('change', this.handleModelChange.bind(this));
    }

    // File upload
    const fileInput = this.getElement('file-upload-input');
    console.log('[UI-MANAGER] fileInput:', !!fileInput);
    if (fileInput) {
      fileInput.addEventListener('change', this.handleFileUpload.bind(this));
    }

    // Clear history
    const clearHistory = this.getElement('clear-history');
    console.log('[UI-MANAGER] clearHistory:', !!clearHistory);
    if (clearHistory) {
      clearHistory.addEventListener('click', this.handleClearHistory.bind(this));
    }

    // Clear files button
    const clearFilesBtn = document.getElementById('clear-btn');
    console.log('[UI-MANAGER] clearFilesBtn:', !!clearFilesBtn);
    if (clearFilesBtn) {
      clearFilesBtn.addEventListener('click', this.handleClearFiles.bind(this));
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }

  /**
   * Set up dialog control event listeners
   */
  setupDialogControls() {
    // Settings dialog
    const apiKeySave = document.getElementById('api-key-save');
    const apiKeyCancel = document.getElementById('api-key-cancel');
    
    console.log('[UI-MANAGER] apiKeySave:', !!apiKeySave);
    if (apiKeySave) {
      apiKeySave.addEventListener('click', this.handleSaveSettings.bind(this));
    }
    
    console.log('[UI-MANAGER] apiKeyCancel:', !!apiKeyCancel);
    if (apiKeyCancel) {
      apiKeyCancel.addEventListener('click', this.hideSettingsDialog.bind(this));
    }

    // Preset dialogs
    const presetDialogClose = document.getElementById('preset-dialog-close');
    const newPresetSave = document.getElementById('new-preset-save');
    const newPresetCancel = document.getElementById('new-preset-cancel');
    const saveAsPresetDialog = document.getElementById('save-as-preset-dialog');
    const managePresetsDialog = document.getElementById('manage-presets-dialog');

    console.log('[UI-MANAGER] presetDialogClose:', !!presetDialogClose);
    if (presetDialogClose) {
      presetDialogClose.addEventListener('click', this.hidePresetDialog.bind(this));
    }
    
    console.log('[UI-MANAGER] newPresetSave:', !!newPresetSave);
    if (newPresetSave) {
      newPresetSave.addEventListener('click', this.handleSaveNewPreset.bind(this));
    }
    
    console.log('[UI-MANAGER] newPresetCancel:', !!newPresetCancel);
    if (newPresetCancel) {
      newPresetCancel.addEventListener('click', this.hideNewPresetDialog.bind(this));
    }
    
    console.log('[UI-MANAGER] saveAsPresetDialog:', !!saveAsPresetDialog);
    if (saveAsPresetDialog) {
      saveAsPresetDialog.addEventListener('click', this.showNewPresetDialog.bind(this));
    }
    
    console.log('[UI-MANAGER] managePresetsDialog:', !!managePresetsDialog);
    if (managePresetsDialog) {
      managePresetsDialog.addEventListener('click', this.showPresetDialog.bind(this));
    }

    // Preset selection
    const presetSelectDialog = document.getElementById('preset-select-dialog');
    console.log('[UI-MANAGER] presetSelectDialog:', !!presetSelectDialog);
    if (presetSelectDialog) {
      presetSelectDialog.addEventListener('change', this.handlePresetChange.bind(this));
    }
  }

  /**
   * Handle recording toggle
   */
  async handleToggleRecording() {
    if (!window.speechManager) {
      this.showError('Speech recognition not initialized');
      return;
    }
    
    try {
      const toggleBtn = this.getElement('toggle');
      const isListening = await window.speechManager.toggleListening();
      
      if (isListening) {
        toggleBtn.textContent = '🚨 Stop Listening';
        toggleBtn.classList.add('recording');
        this.updateUIState('listening');
      } else {
        toggleBtn.textContent = '🎤 Start Listening';
        toggleBtn.classList.remove('recording');
        this.updateUIState('ready');
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      this.showError(`Recording error: ${error.message}`);
    }
  }

  /**
   * Handle theme toggle
   */
  handleThemeToggle() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme_mode', isDark ? 'dark' : 'light');

    const themeToggle = this.getElement('theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = isDark ? '🌙' : '☀️';
    }
  }

  /**
   * Handle model selection change
   */
  handleModelChange(event) {
    const selectedModel = event.target.value;
    if (window.appState) {
      window.appState.setState('selectedModel', selectedModel);
    }
  }

  /**
   * Handle preset selection change
   */
  handlePresetChange(event) {
    const presetId = event.target.value;
    if (presetId && window.presetManager) {
      window.presetManager.loadPreset(presetId);
    }
  }

  /**
   * Handle file upload
   */
  async handleFileUpload(event) {
    if (!window.fileManager) {
      this.showError('File manager not available');
      return;
    }
    
    try {
      await window.fileManager.handleFileUpload(event);
    } catch (error) {
      this.showError(`File upload error: ${error.message}`);
    }
  }

  /**
   * Handle clear history
   */
  handleClearHistory() {
    if (confirm('Are you sure you want to clear all response history? This cannot be undone.')) {
      if (window.appState) {
        window.appState.clearHistory();
      }
      this.renderHistoryList();
    }
  }

  /**
   * Handle clear files
   */
  handleClearFiles() {
    if (!window.fileManager) {
      this.showError('File manager not available');
      return;
    }
    
    try {
      window.fileManager.clearAllFiles();
    } catch (error) {
      this.showError(`Error clearing files: ${error.message}`);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(event) {
    // Escape key - close dialogs
    if (event.key === 'Escape') {
      this.closeAllDialogs();
    }
    
    // Ctrl+Space - toggle recording
    if (event.ctrlKey && event.code === 'Space') {
      event.preventDefault();
      this.handleToggleRecording();
    }
    
    // Ctrl+, - open settings
    if (event.ctrlKey && event.key === ',') {
      event.preventDefault();
      this.showSettingsDialog();
    }
  }

  /**
   * Show settings dialog
   */
  showSettingsDialog() {
    const dialog = this.getElement('settings-dialog');
    if (!dialog) return;
    
    // Populate current values
    this.populateSettingsDialog();
    
    dialog.classList.remove('hidden');
    dialog.setAttribute('aria-hidden', 'false');
    
    // Focus first input
    const githubInput = this.getElement('github-token-textarea');
    if (githubInput) {
      setTimeout(() => githubInput.focus(), 100);
    }
  }

  /**
   * Hide settings dialog
   */
  hideSettingsDialog() {
    const dialog = this.getElement('settings-dialog');
    if (dialog) {
      dialog.classList.add('hidden');
      dialog.setAttribute('aria-hidden', 'true');
    }
    
    // Clear status message
    this.clearStatusMessage();
  }

  /**
   * Populate settings dialog with current values
   */
  populateSettingsDialog() {
    if (!window.appState) return;
    
    // GitHub token
    const githubInput = this.getElement('github-token-textarea');
    if (githubInput) {
      githubInput.value = localStorage.getItem('github_token') || '';
    }
    
    // System prompt
    const systemPromptInput = this.getElement('system-prompt-dialog');
    if (systemPromptInput) {
      systemPromptInput.value = window.appState.getState('systemPrompt');
    }
    
    // Model selection
    const modelSelect = this.getElement('model-select');
    if (modelSelect) {
      modelSelect.value = window.appState.getState('selectedModel');
    }
    
    // Update file list
    this.renderUploadedFiles();
  }

  /**
   * Handle save settings
   */
  handleSaveSettings() {
    try {
      const githubInput = this.getElement('github-token-textarea');
      const systemPromptInput = this.getElement('system-prompt-dialog');
      
      let isValid = true;
      const githubToken = githubInput?.value.trim() || '';
      const systemPrompt = systemPromptInput?.value.trim() || '';
      
      // Validate GitHub token if provided
      if (githubToken && !githubToken.startsWith('ghp_')) {
        this.showStatusMessage('Invalid GitHub token format. It should start with "ghp_"', 'error');
        isValid = false;
      }
      
      if (isValid) {
        // Save GitHub token
        if (githubToken) {
          localStorage.setItem('github_token', githubToken);
        }
        
        // Save system prompt
        if (systemPrompt && window.appState) {
          window.appState.setState('systemPrompt', systemPrompt);
        }
        
        this.showStatusMessage('Settings saved successfully!', 'success');
        setTimeout(() => this.hideSettingsDialog(), 1000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatusMessage('Error saving settings', 'error');
    }
  }

  /**
   * Show/hide preset dialogs
   */
  showPresetDialog() {
    const dialog = this.getElement('preset-dialog');
    if (dialog) {
      dialog.classList.remove('hidden');
      dialog.setAttribute('aria-hidden', 'false');
    }
    
    // Render preset list when showing dialog
    if (window.presetManager) {
      window.presetManager.renderPresetList();
    }
  }

  hidePresetDialog() {
    const dialog = this.getElement('preset-dialog');
    if (dialog) {
      dialog.classList.add('hidden');
      dialog.setAttribute('aria-hidden', 'true');
    }
  }

  showNewPresetDialog() {
    const dialog = this.getElement('new-preset-dialog');
    const nameInput = this.getElement('new-preset-name');
    
    if (dialog) {
      dialog.classList.remove('hidden');
      dialog.setAttribute('aria-hidden', 'false');
    }
    
    if (nameInput) {
      nameInput.value = '';
      setTimeout(() => nameInput.focus(), 100);
    }
    
    this.clearNewPresetStatus();
  }

  hideNewPresetDialog() {
    const dialog = this.getElement('new-preset-dialog');
    if (dialog) {
      dialog.classList.add('hidden');
      dialog.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Handle save new preset
   */
  handleSaveNewPreset() {
    if (!window.presetManager) {
      this.showNewPresetStatus('Preset manager not available', 'error');
      return;
    }
    
    try {
      const nameInput = this.getElement('new-preset-name');
      const name = nameInput?.value.trim();
      
      if (!name) {
        this.showNewPresetStatus('Please enter a name for the preset', 'error');
        return;
      }
      
      window.presetManager.saveNewPreset(name);
      this.showNewPresetStatus('Preset saved successfully!', 'success');
      setTimeout(() => this.hideNewPresetDialog(), 1500);
    } catch (error) {
      this.showNewPresetStatus(error.message, 'error');
    }
  }

  /**
   * Close all open dialogs
   */
  closeAllDialogs() {
    this.hideSettingsDialog();
    this.hidePresetDialog();
    this.hideNewPresetDialog();
  }

  /**
   * Update transcription display
   * @param {string} text - Transcription text
   */
  updateTranscription(text) {
    const element = this.getElement('lastObjection');
    if (element) {
      element.textContent = text;
    }
  }

  /**
   * Update response display
   * @param {string} text - Response text
   * @param {boolean} isLoading - Whether to show loading state
   */
  updateResponse(text, isLoading = false) {
    const element = this.getElement('reply');
    if (element) {
      // Remove all [BLANK _AUDIO] tags before displaying
      const cleaned = typeof text === 'string' ? text.replace(/\[BLANK _AUDIO\]/g, '').trim() : '';
      element.textContent = cleaned;
      
      if (isLoading) {
        element.classList.add('pulsing');
      } else {
        element.classList.remove('pulsing');
      }
    }
  }

  /**
   * Show error message in response area
   * @param {string} message - Error message
   */
  showError(message) {
    this.updateResponse(`❌ ${message}`);
    this.updateUIState('error');
  }

  /**
   * Update UI state
   * @param {string} state - UI state (ready, listening, processing, error)
   */
  updateUIState(state) {
    if (window.uiStateManager) {
      window.uiStateManager.updateState(window.uiStateManager.states[state.toUpperCase()]);
    }
  }

  /**
   * Show status message
   * @param {string} message - Status message
   * @param {string} type - Message type (success, error, info)
   */
  showStatusMessage(message, type = 'info') {
    const statusElement = this.getElement('api-key-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-${type}`;
      
      // Auto-clear after delay for success messages
      if (type === 'success') {
        setTimeout(() => this.clearStatusMessage(), 3000);
      }
    }
  }

  /**
   * Clear status message
   */
  clearStatusMessage() {
    const statusElement = this.getElement('api-key-status');
    if (statusElement) {
      statusElement.textContent = '';
      statusElement.className = '';
    }
  }

  /**
   * Show new preset status message
   * @param {string} message - Status message
   * @param {string} type - Message type
   */
  showNewPresetStatus(message, type = 'info') {
    const statusElement = this.getElement('new-preset-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-${type}`;
    }
  }

  /**
   * Clear new preset status message
   */
  clearNewPresetStatus() {
    const statusElement = this.getElement('new-preset-status');
    if (statusElement) {
      statusElement.textContent = '';
      statusElement.className = '';
    }
  }

  /**
   * Initialize theme based on saved preference
   */
  initializeTheme() {
    const savedTheme = localStorage.getItem('theme_mode');
    const themeToggle = this.getElement('theme-toggle');
    
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      if (themeToggle) themeToggle.textContent = '🌙';
    } else {
      if (themeToggle) themeToggle.textContent = '☀️';
    }
  }

  /**
   * Render history list
   */
  renderHistoryList() {
    if (!window.appState) return;
    
    const historyList = this.getElement('history-list');
    const historyBox = this.getElement('history-box');
    
    if (!historyList) return;
    
    const history = window.appState.getState('responseHistory');
    
    if (!history || history.length === 0) {
      historyList.textContent = 'Your response history will appear here...';
      if (historyBox) historyBox.classList.add('hidden');
      return;
    }
    
    // Show history box and render items
    if (historyBox) historyBox.classList.remove('hidden');
    
    const sortedHistory = [...history].reverse(); // Newest first
    historyList.innerHTML = '';
    
    sortedHistory.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      
      historyItem.innerHTML = `
        <div class="flex-row just-right">
          <div class="flex-spacer"></div>
          <div class="history-item-objection"><span class="speaker-label">You:</span> ${this.escapeHtml(item.objection.replace(/\[BLANK _AUDIO\]/g, '').trim())}</div>
          <div class="history-item-icon">🎙️</div>
        </div>
        <div class="flex-row just-left">
          <div class="history-item-icon">💡</div>
          <div class="history-item-response"><span class="speaker-label">AI:</span> ${this.escapeHtml(item.response.replace(/\[BLANK _AUDIO\]/g, '').trim())}</div>
          <div class="flex-spacer"></div>
        </div>
        <div class="history-item-meta">
          <span>${item.timestamp}</span>
          <span>${this.formatModelDisplay(item.model)}</span>
        </div>
      `;
      
      historyList.appendChild(historyItem);
    });
  }

  /**
   * Render uploaded files list
   */
  renderUploadedFiles() {
    if (!window.appState) return;
    
    const container = this.getElement('uploaded-files-list');
    if (!container) return;
    
    const files = window.appState.getState('uploadedFiles');
    
    if (!files || files.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }
    
    container.style.display = 'block';
    container.innerHTML = '';
    
    files.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'uploaded-file-item';
      fileItem.setAttribute('role', 'listitem');
      
      fileItem.innerHTML = `
        <div class="uploaded-file-info">
          <div class="uploaded-file-name">${this.escapeHtml(file.name)}</div>
          <div class="uploaded-file-size">${this.formatFileSize(file.size)} • ${new Date(file.uploadDate).toLocaleString()}</div>
        </div>
        <button class="remove-file-btn" onclick="window.fileManager?.removeFile('${file.id}')" 
                title="Remove file" aria-label="Remove ${this.escapeHtml(file.name)}">🗑️</button>
      `;
      
      container.appendChild(fileItem);
    });
  }

  /**
   * Populate model dropdown
   * @param {Array} models - Array of model objects
   */
  populateModelDropdown(models) {
    const modelSelect = this.getElement('model-select');
    if (!modelSelect) return;
    
    modelSelect.innerHTML = '';
    
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.shortId;
      option.dataset.fullModelId = model.id;
      option.textContent = `${model.publisher}: ${model.name}`;
      option.title = model.summary;
      modelSelect.appendChild(option);
    });
    
    // Set selected model
    if (window.appState) {
      const selectedModel = window.appState.getState('selectedModel');
      if (selectedModel) {
        modelSelect.value = selectedModel;
      }
    }
  }

  /**
   * Utility methods
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatModelDisplay(modelId) {
    if (modelId.includes('/')) {
      const [publisher, model] = modelId.split('/');
      const publisherCapitalized = publisher.charAt(0).toUpperCase() + publisher.slice(1);
      return `${publisherCapitalized}: ${model.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
    }
    return modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  /**
   * Toggle the visibility of the history box
   */

  //   handleThemeToggle() {
  //   document.body.classList.toggle('dark-mode');
  //   const isDark = document.body.classList.contains('dark-mode');
  //   localStorage.setItem('theme_mode', isDark ? 'dark' : 'light');

  //   const themeToggle = this.getElement('theme-toggle');
  //   if (themeToggle) {
  //     themeToggle.textContent = isDark ? '🌙' : '☀️';
  //   }
  // }
  handleToggleHistoryBox() {
    document.body.classList.toggle('history-toggle');
    const isVisible = document.body.classList.contains('history-toggle');
    localStorage.setItem('history-toggle', JSON.stringify({ visible: isVisible }));

    // Update toggle button text and title based on visibility
    const historyToggle = this.getElement('history-toggle');
    if (historyToggle) {
      historyToggle.textContent = isVisible ? "🐵" : "🙈";
      historyToggle.setAttribute('title', isVisible ? 'Hide History' : 'Show History');
    }

    // Show/hide the history box element
    const historyBox = this.getElement('history-box');
    if (historyBox) {
      historyBox.classList.toggle('hidden', !isVisible);
    }
  }

  /**
   * Initializes the history box visibility and toggle button state on load.
   *
   * - Reads user preference from localStorage and applies it.
   * - Handles missing DOM elements gracefully.
   * - Updates both the history box and toggle button for accessibility.
   * - Should be called after DOM is fully loaded.
   */

  initializeHistoryBox() {
    try {
      let savedHistory = localStorage.getItem('history-toggle');
      const historyBox = this.getElement('history-box');
      const historyToggle = this.getElement('history-toggle');
      let isVisible;

      // If no state is saved, default to hidden and persist it
      if (savedHistory === null) {
        console.log('No history toggle state found, defaulting to hidden.');
        isVisible = false;
        localStorage.setItem('history-toggle', JSON.stringify({ visible: false }));
      } else {
        try {
          const parsed = JSON.parse(savedHistory);
          isVisible = !!parsed.visible;
        } catch {
          isVisible = false;
        }
      }

      // Set body class for history visibility
      document.body.classList.toggle('history-toggle', isVisible);

      // Show/hide the history box element if it exists
      if (historyBox) {
        historyBox.classList.toggle('hidden', !isVisible);
      } else {
        console.warn('History box element not found.');
      }

      // Update toggle button text and title if it exists
      if (historyToggle) {
        historyToggle.textContent = isVisible ? "🐵" : "🙈";
        historyToggle.setAttribute('title', isVisible ? 'Hide History' : 'Show History');
        historyToggle.setAttribute('aria-pressed', isVisible);
      } else {
        console.warn('History toggle button not found.');
      }
    } catch (error) {
      console.error('Failed to initialize history box:', error);
    }
  }
}

// Export for global use
window.UIManager = UIManager;