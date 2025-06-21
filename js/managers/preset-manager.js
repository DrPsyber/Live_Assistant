/**
 * Preset Manager
 * Handles preset management functionality for system prompts
 */

class PresetManager {
  constructor() {
    this.defaultPresets = {
      'executive-reframer': {
        name: 'Executive Reframer',
        prompt: 'You are a C-suite communication strategist specializing in reframing challenges as opportunities. Craft concise, authoritative responses that acknowledge objections while shifting perspective toward mutual benefit. Your goal is to maintain leadership presence while turning potential conflicts into collaborative solutions.'
      },
      'negotiation': {
        name: 'Negotiation Expert',
        prompt: 'You are a skilled negotiation expert. Generate concise, tactical responses that redirect objections while building value. Focus on finding common ground, addressing concerns empathetically, and guiding toward agreement. Use data and logical framing to strengthen your position. Keep responses under 15 words and maintain a persuasive yet collaborative tone.'
      }
    };
  }

  /**
   * Initialize preset manager
   */
  initialize() {
    this.updatePresetDropdowns();
    this.renderPresetList();
  }

  /**
   * Load a preset by ID
   * @param {string} presetId - Preset ID to load
   */
  loadPreset(presetId) {
    if (!window.appState) {
      console.error('App state not available');
      return;
    }

    const presets = window.appState.getState('presets');
    const preset = presets[presetId];
    
    if (!preset) {
      console.error(`Preset not found: ${presetId}`);
      return;
    }

    // Update system prompt in app state
    window.appState.setState('systemPrompt', preset.prompt);

    // Update UI elements
    const systemPromptDialog = document.getElementById('system-prompt-dialog');
    if (systemPromptDialog) {
      systemPromptDialog.value = preset.prompt;
    }

    // Update dropdown selections
    this.selectPresetInDropdowns(presetId);

    console.log(`Loaded preset: ${preset.name}`);
  }

  /**
   * Save a new preset
   * @param {string} name - Preset name
   * @throws {Error} If preset already exists or name is invalid
   */
  saveNewPreset(name) {
    if (!name || name.trim() === '') {
      throw new Error('Please enter a name for the preset');
    }

    if (!window.appState) {
      throw new Error('App state not available');
    }

    // Create unique ID from name
    const id = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const presets = window.appState.getState('presets');

    // Check if preset already exists
    if (presets[id]) {
      throw new Error('A preset with this name already exists');
    }

    // Get current system prompt
    const systemPromptDialog = document.getElementById('system-prompt-dialog');
    const currentPrompt = systemPromptDialog?.value || window.appState.getState('systemPrompt');

    if (!currentPrompt || currentPrompt.trim() === '') {
      throw new Error('System prompt cannot be empty');
    }

    // Create new preset
    const newPreset = {
      name: name.trim(),
      prompt: currentPrompt.trim()
    };

    // Save preset
    window.appState.savePreset(id, newPreset);

    // Update UI
    this.updatePresetDropdowns();
    this.renderPresetList();

    console.log(`Saved new preset: ${newPreset.name}`);
  }

  /**
   * Delete a preset
   * @param {string} presetId - Preset ID to delete
   * @param {string} presetName - Preset name for confirmation
   */
  deletePreset(presetId, presetName) {
    if (!window.appState) {
      console.error('App state not available');
      return;
    }

    // Don't allow deleting default presets
    if (this.isDefaultPreset(presetId)) {
      throw new Error('Cannot delete default presets');
    }

    try {
      window.appState.deletePreset(presetId);
      
      // Update UI
      this.updatePresetDropdowns();
      this.renderPresetList();
      
      console.log(`Deleted preset: ${presetName}`);
    } catch (error) {
      console.error('Error deleting preset:', error);
      throw error;
    }
  }

  /**
   * Check if preset is a default preset
   * @param {string} presetId - Preset ID to check
   * @returns {boolean} True if default preset
   */
  isDefaultPreset(presetId) {
    return Object.keys(this.defaultPresets).includes(presetId);
  }

  /**
   * Update preset dropdown options
   */
  updatePresetDropdowns() {
    if (!window.appState) return;

    const presets = window.appState.getState('presets');
    const dropdownIds = ['preset-select', 'preset-select-dialog'];

    dropdownIds.forEach(dropdownId => {
      const dropdown = document.getElementById(dropdownId);
      if (!dropdown) return;

      // Clear existing options except the default one
      while (dropdown.options.length > 1) {
        dropdown.remove(1);
      }

      // Add all presets as options
      Object.entries(presets).forEach(([id, preset]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = preset.name;
        dropdown.appendChild(option);
      });
    });
  }

  /**
   * Select preset in all dropdowns
   * @param {string} presetId - Preset ID to select
   */
  selectPresetInDropdowns(presetId) {
    const dropdownIds = ['preset-select', 'preset-select-dialog'];
    
    dropdownIds.forEach(dropdownId => {
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) {
        dropdown.value = presetId;
      }
    });
  }

  /**
   * Render preset list in the preset management dialog
   */
  renderPresetList() {
    if (!window.appState) return;

    const presetList = document.getElementById('preset-list');
    if (!presetList) return;

    const presets = window.appState.getState('presets');
    presetList.innerHTML = '';

    // Create preset items
    Object.entries(presets).forEach(([id, preset]) => {
      const presetItem = this.createPresetItem(id, preset);
      presetList.appendChild(presetItem);
    });
  }

  /**
   * Create a preset item element
   * @param {string} id - Preset ID
   * @param {Object} preset - Preset object
   * @returns {HTMLElement} Preset item element
   */
  createPresetItem(id, preset) {
    const presetItem = document.createElement('div');
    presetItem.className = 'preset-item';
    presetItem.setAttribute('role', 'listitem');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'preset-name';
    nameSpan.textContent = preset.name;

    const actions = document.createElement('div');
    actions.className = 'preset-actions';

    // Load button
    const loadBtn = document.createElement('button');
    loadBtn.textContent = '📂';
    loadBtn.title = `Load ${preset.name}`;
    loadBtn.setAttribute('aria-label', `Load ${preset.name}`);
    loadBtn.addEventListener('click', () => {
      this.loadPreset(id);
      this.hidePresetDialog();
    });

    // Delete button
    const deleteBtn = this.createDeleteButton(id, preset.name);

    actions.appendChild(loadBtn);
    actions.appendChild(deleteBtn);

    presetItem.appendChild(nameSpan);
    presetItem.appendChild(actions);

    return presetItem;
  }

  /**
   * Create delete button with proper accessibility and error handling
   * @param {string} presetId - Preset ID
   * @param {string} presetName - Preset name
   * @returns {HTMLButtonElement} Delete button
   */
  createDeleteButton(presetId, presetName) {
    const deleteBtn = document.createElement('button');
    
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑️';
    deleteBtn.setAttribute('aria-label', `Delete ${presetName}`);
    deleteBtn.title = `Delete ${presetName}`;

    // Don't allow deleting default presets
    if (this.isDefaultPreset(presetId)) {
      deleteBtn.disabled = true;
      deleteBtn.classList.add('disabled');
      deleteBtn.title = 'Cannot delete default presets';
      deleteBtn.setAttribute('aria-disabled', 'true');
    } else {
      deleteBtn.addEventListener('click', (event) => {
        this.handleDeleteClick(event, presetId, presetName);
      });

      // Keyboard accessibility
      deleteBtn.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          deleteBtn.click();
        }
      });
    }

    return deleteBtn;
  }

  /**
   * Handle delete button click
   * @param {Event} event - Click event
   * @param {string} presetId - Preset ID
   * @param {string} presetName - Preset name
   */
  handleDeleteClick(event, presetId, presetName) {
    try {
      // Prevent event bubbling
      event.stopPropagation();
      
      // Visual feedback
      const deleteBtn = event.target;
      deleteBtn.classList.add('clicked');
      setTimeout(() => deleteBtn.classList.remove('clicked'), 150);
      
      // Confirmation dialog
      const confirmMessage = `Are you sure you want to delete "${presetName}"?\n\nThis action cannot be undone.`;
      
      if (confirm(confirmMessage)) {
        // Show loading state
        deleteBtn.disabled = true;
        deleteBtn.textContent = '⏳';
        deleteBtn.title = 'Deleting...';
        
        try {
          this.deletePreset(presetId, presetName);
        } catch (error) {
          console.error('Error deleting preset:', error);
          
          // Restore button state
          deleteBtn.disabled = false;
          deleteBtn.textContent = '🗑️';
          deleteBtn.title = `Delete ${presetName}`;
          
          alert(`Failed to delete preset "${presetName}". Please try again.`);
        }
      }
    } catch (error) {
      console.error('Error in delete button click handler:', error);
      alert('An unexpected error occurred. Please refresh the page and try again.');
    }
  }

  /**
   * Show preset management dialog
   */
  showPresetDialog() {
    this.renderPresetList();
    const dialog = document.getElementById('preset-dialog');
    if (dialog) {
      dialog.classList.remove('hidden');
      dialog.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Hide preset management dialog
   */
  hidePresetDialog() {
    const dialog = document.getElementById('preset-dialog');
    if (dialog) {
      dialog.classList.add('hidden');
      dialog.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Get all presets
   * @returns {Object} All presets
   */
  getAllPresets() {
    if (!window.appState) return {};
    return window.appState.getState('presets');
  }

  /**
   * Get preset by ID
   * @param {string} presetId - Preset ID
   * @returns {Object|null} Preset object or null if not found
   */
  getPreset(presetId) {
    const presets = this.getAllPresets();
    return presets[presetId] || null;
  }

  /**
   * Check if preset exists
   * @param {string} presetId - Preset ID
   * @returns {boolean} True if preset exists
   */
  presetExists(presetId) {
    const presets = this.getAllPresets();
    return presetId in presets;
  }

  /**
   * Get preset names for autocomplete or suggestions
   * @returns {Array<string>} Array of preset names
   */
  getPresetNames() {
    const presets = this.getAllPresets();
    return Object.values(presets).map(preset => preset.name);
  }

  /**
   * Import presets from JSON
   * @param {string} jsonString - JSON string containing presets
   * @throws {Error} If JSON is invalid or presets are malformed
   */
  importPresets(jsonString) {
    try {
      const importedPresets = JSON.parse(jsonString);
      
      if (typeof importedPresets !== 'object' || Array.isArray(importedPresets)) {
        throw new Error('Invalid preset format');
      }

      let importCount = 0;
      const conflicts = [];

      Object.entries(importedPresets).forEach(([id, preset]) => {
        // Validate preset structure
        if (!preset.name || !preset.prompt) {
          console.warn(`Skipping invalid preset: ${id}`);
          return;
        }

        // Check for conflicts with existing presets
        if (this.presetExists(id)) {
          conflicts.push(preset.name);
          return;
        }

        // Import preset
        window.appState.savePreset(id, preset);
        importCount++;
      });

      // Update UI
      this.updatePresetDropdowns();
      this.renderPresetList();

      // Report results
      let message = `Successfully imported ${importCount} preset(s).`;
      if (conflicts.length > 0) {
        message += `\n\nSkipped ${conflicts.length} preset(s) due to name conflicts: ${conflicts.join(', ')}`;
      }

      return { importCount, conflicts, message };

    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  }

  /**
   * Export presets to JSON
   * @param {boolean} includeDefaults - Whether to include default presets
   * @returns {string} JSON string of presets
   */
  exportPresets(includeDefaults = false) {
    const allPresets = this.getAllPresets();
    let presetsToExport = {};

    Object.entries(allPresets).forEach(([id, preset]) => {
      if (includeDefaults || !this.isDefaultPreset(id)) {
        presetsToExport[id] = preset;
      }
    });

    return JSON.stringify(presetsToExport, null, 2);
  }

  /**
   * Reset to default presets only
   */
  resetToDefaults() {
    if (!confirm('This will delete all custom presets and reset to defaults only. Continue?')) {
      return;
    }

    if (!window.appState) {
      console.error('App state not available');
      return;
    }

    // Reset presets to defaults
    window.appState.setState('presets', { ...this.defaultPresets });

    // Clear custom presets from localStorage
    localStorage.removeItem('custom_presets');

    // Update UI
    this.updatePresetDropdowns();
    this.renderPresetList();

    console.log('Reset to default presets');
  }
}

// Export for global use
window.PresetManager = PresetManager;