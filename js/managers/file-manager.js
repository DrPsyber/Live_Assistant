/**
 * File Manager
 * Handles file upload, processing, and management functionality
 */

class FileManager {
  constructor() {
    this.maxFileSize = 1024 * 1024; // 1MB
    this.allowedExtensions = [
      '.txt', '.md', '.json', '.csv', '.log',
      '.js', '.ts', '.html', '.css', '.py',
      '.java', '.cpp', '.c', '.h', '.xml',
      '.yml', '.yaml', '.ini', '.conf'
    ];
    this.allowedMimeTypes = [
      'text/plain',
      'text/markdown',
      'application/json',
      'text/csv',
      'text/javascript',
      'text/html',
      'text/css',
      'text/x-python',
      'text/x-java-source',
      'text/x-c',
      'text/x-c++',
      'application/xml',
      'text/xml',
      'text/yaml',
      'text/x-yaml'
    ];
  }

  /**
   * Handle file upload event
   * @param {Event} event - File input change event
   */
  async handleFileUpload(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) {
      return;
    }

    const results = {
      success: [],
      errors: [],
      skipped: []
    };

    for (const file of files) {
      try {
        const validation = this.validateFile(file);
        if (!validation.valid) {
          results.errors.push({ file: file.name, error: validation.error });
          continue;
        }

        const fileData = await this.processFile(file);
        if (fileData) {
          window.appState?.addUploadedFile(fileData);
          results.success.push(file.name);
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        results.errors.push({ file: file.name, error: error.message });
      }
    }

    // Update UI
    if (window.uiManager) {
      window.uiManager.renderUploadedFiles();
    }

    // Show status
    this.showUploadStatus(results);

    // Clear input for potential re-upload of same files
    event.target.value = '';
  }

  /**
   * Validate file before processing
   * @param {File} file - File object to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${this.formatFileSize(this.maxFileSize)}.`
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty.'
      };
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    if (!this.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File type not supported. Allowed types: ${this.allowedExtensions.join(', ')}`
      };
    }

    // Check MIME type if available
    if (file.type && !this.allowedMimeTypes.includes(file.type) && !file.type.startsWith('text/')) {
      return {
        valid: false,
        error: 'File type not supported based on MIME type.'
      };
    }

    return { valid: true };
  }

  /**
   * Process file and extract content
   * @param {File} file - File object to process
   * @returns {Promise<Object>} File data object
   */
  async processFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          
          // Validate content is text
          if (typeof content !== 'string') {
            reject(new Error('File content is not text'));
            return;
          }

          // Check for binary content (basic heuristic)
          if (this.containsBinaryContent(content)) {
            reject(new Error('File appears to contain binary data'));
            return;
          }

          const fileData = {
            name: file.name,
            size: file.size,
            type: file.type || 'text/plain',
            content: content.trim(),
            lastModified: file.lastModified
          };

          resolve(fileData);
        } catch (error) {
          reject(new Error(`Failed to process file: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Check if content contains binary data
   * @param {string} content - Text content to check
   * @returns {boolean} True if likely binary content
   */
  containsBinaryContent(content) {
    // Check for null bytes (common in binary files)
    if (content.includes('\0')) {
      return true;
    }

    // Check for high percentage of non-printable characters
    const nonPrintableCount = (content.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length;
    const nonPrintableRatio = nonPrintableCount / content.length;
    
    return nonPrintableRatio > 0.1; // More than 10% non-printable
  }

  /**
   * Remove file by ID
   * @param {string} fileId - File ID to remove
   */
  removeFile(fileId) {
    if (!window.appState) {
      console.error('App state not available');
      return;
    }

    try {
      window.appState.removeUploadedFile(fileId);
      
      // Update UI
      if (window.uiManager) {
        window.uiManager.renderUploadedFiles();
      }

      this.showStatusMessage('File removed successfully', 'success');
    } catch (error) {
      console.error('Error removing file:', error);
      this.showStatusMessage('Error removing file', 'error');
    }
  }

  /**
   * Clear all uploaded files
   */
  clearAllFiles() {
    if (!window.appState) {
      console.error('App state not available');
      return;
    }

    const files = window.appState.getState('uploadedFiles');
    if (!files || files.length === 0) {
      return;
    }

    if (!confirm('Are you sure you want to remove all uploaded files?')) {
      return;
    }

    try {
      window.appState.clearUploadedFiles();
      
      // Update UI
      if (window.uiManager) {
        window.uiManager.renderUploadedFiles();
      }

      this.showStatusMessage('All files cleared successfully', 'success');
    } catch (error) {
      console.error('Error clearing files:', error);
      this.showStatusMessage('Error clearing files', 'error');
    }
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Filename
   * @returns {string} File extension (including dot)
   */
  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot).toLowerCase();
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Show upload status message
   * @param {Object} results - Upload results object
   */
  showUploadStatus(results) {
    const { success, errors, skipped } = results;
    let message = '';
    let type = 'info';

    if (success.length > 0) {
      message = `Successfully uploaded ${success.length} file(s)`;
      type = 'success';
    }

    if (errors.length > 0) {
      const errorMessage = `Failed to upload ${errors.length} file(s):\n` +
        errors.map(e => `• ${e.file}: ${e.error}`).join('\n');
      
      if (success.length === 0) {
        message = errorMessage;
        type = 'error';
      } else {
        message += `\n\n${errorMessage}`;
      }
    }

    if (skipped.length > 0) {
      message += `\n\nSkipped ${skipped.length} file(s)`;
    }

    if (message) {
      this.showStatusMessage(message, type);
    }
  }

  /**
   * Show status message
   * @param {string} message - Status message
   * @param {string} type - Message type (success, error, info)
   */
  showStatusMessage(message, type = 'info') {
    if (window.uiManager) {
      window.uiManager.showStatusMessage(message, type);
    } else {
      // Fallback to console if UI manager not available
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

}

// Export for global use
window.FileManager = FileManager;