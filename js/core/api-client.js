/**
 * API Client for GitHub Models
 * Handles API communications with proper error handling and retry logic
 */

class APIClient {
  constructor() {
    this.endpoint = 'https://models.inference.ai.azure.com/chat/completions';
    this.retryAttempts = 3;
    this.retryDelay = 1000; // ms
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Get GitHub token from localStorage
   * @returns {string|null} GitHub token or null if not found
   */
  getGitHubToken() {
    const token = localStorage.getItem('github_token');
    return token && token.trim() ? token.trim() : null;
  }

  /**
   * Validate GitHub token format
   * @param {string} token - Token to validate
   * @returns {boolean} True if token format is valid
   */
  validateToken(token) {
    return token && typeof token === 'string' && token.startsWith('ghp_') && token.length > 20;
  }

  /**
   * Generate response from GitHub Models API
   * @param {string} userInput - User's input text
   * @param {string} model - Model to use
   * @param {string} systemPrompt - System prompt
   * @param {string} filesContext - Additional context from uploaded files
   * @returns {Promise<string>} Generated response
   */
  async generateResponse(userInput, model, systemPrompt, filesContext = '') {
    const token = this.getGitHubToken();
    
    if (!token) {
      throw new Error('GitHub token not found. Please configure your GitHub token in settings.');
    }
    
    if (!this.validateToken(token)) {
      throw new Error('Invalid GitHub token format. Token should start with "ghp_".');
    }
    
    const enhancedSystemPrompt = systemPrompt + filesContext;
    const modelId = this.normalizeModelId(model);
    
    const requestBody = {
      model: modelId,
      messages: [
        {
          role: 'system',
          content: enhancedSystemPrompt
        },
        {
          role: 'user',
          content: `Prospect said: "${userInput}". Reply with ONE persuasive rebuttal that's witty but professional. Keep it under 15 words.`
        }
      ],
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 150
    };
    
    return this.makeRequestWithRetry(requestBody, token);
  }

  /**
   * Normalize model ID for API call
   * @param {string} model - Model identifier
   * @returns {string} Normalized model ID
   */
  normalizeModelId(model) {
    // Remove provider prefix if present (e.g., "openai/gpt-4" -> "gpt-4")
    return model.includes('/') ? model.split('/')[1] : model;
  }

  /**
   * Make API request with retry logic
   * @param {Object} requestBody - Request payload
   * @param {string} token - GitHub token
   * @returns {Promise<string>} API response
   */
  async makeRequestWithRetry(requestBody, token) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await this.makeRequest(requestBody, token);
        return response;
      } catch (error) {
        lastError = error;
        console.warn(`API request attempt ${attempt} failed:`, error.message);
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this.delay(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Make single API request
   * @param {Object} requestBody - Request payload
   * @param {string} token - GitHub token
   * @returns {Promise<string>} API response
   */
  async makeRequest(requestBody, token) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'LiveAssistant/1.0'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      
      const data = await response.json();
      return this.extractResponseText(data);
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      
      throw error;
    }
  }

  /**
   * Handle error response from API
   * @param {Response} response - Fetch response object
   */
  async handleErrorResponse(response) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      console.error('API error response:', errorData);
      
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (parseError) {
      console.warn('Could not parse error response:', parseError);
    }
    
    // Customize error messages for common HTTP status codes
    switch (response.status) {
      case 401:
        throw new Error('Invalid or expired GitHub token. Please update your token in settings.');
      case 403:
        throw new Error('Access forbidden. Check your GitHub token permissions.');
      case 429:
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      case 500:
      case 502:
      case 503:
      case 504:
        throw new Error('GitHub API server error. Please try again later.');
      default:
        throw new Error(errorMessage);
    }
  }

  /**
   * Extract response text from API response
   * @param {Object} data - API response data
   * @returns {string} Extracted response text
   */
  extractResponseText(data) {
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('No response received from API');
    }
    
    const choice = data.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new Error('Invalid response format from API');
    }
    
    return choice.message.content.trim();
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - Error object
   * @returns {boolean} True if should not retry
   */
  shouldNotRetry(error) {
    const message = error.message.toLowerCase();
    
    // Don't retry authentication errors
    if (message.includes('token') || message.includes('unauthorized') || message.includes('forbidden')) {
      return true;
    }
    
    // Don't retry client errors (4xx except 429)
    if (message.includes('400') || message.includes('404')) {
      return true;
    }
    
    return false;
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch available models from GitHub catalog
   * @returns {Promise<Array>} Array of available models
   */
  async fetchAvailableModels() {
    const fetchMethods = [
      // Direct fetch
      async () => {
        const url = 'https://models.github.ai/catalog/models';
        console.log('[DEBUG] Trying direct fetch for models at:', url);
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return await response.json();
        } catch (err) {
          console.warn('[DEBUG] Direct fetch failed:', err);
          throw err;
        }
      },
      
      // CORS proxy 1
      async () => {
        const apiUrl = 'https://models.github.ai/catalog/models';
        const corsProxy = 'https://api.allorigins.win/get?url=';
        const fullUrl = corsProxy + encodeURIComponent(apiUrl);
        console.log('[DEBUG] Trying CORS proxy (allorigins) at:', fullUrl);
        try {
          const response = await fetch(fullUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const proxyData = await response.json();
          return JSON.parse(proxyData.contents);
        } catch (err) {
          console.warn('[DEBUG] CORS proxy (allorigins) failed:', err);
          throw err;
        }
      },
      
      // CORS proxy 2
      async () => {
        const apiUrl = 'https://models.github.ai/catalog/models';
        const corsProxy = 'https://corsproxy.io/?';
        const fullUrl = corsProxy + encodeURIComponent(apiUrl);
        console.log('[DEBUG] Trying CORS proxy (corsproxy) at:', fullUrl);
        try {
          const response = await fetch(fullUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return await response.json();
        } catch (err) {
          console.warn('[DEBUG] CORS proxy (corsproxy) failed:', err);
          throw err;
        }
      }
    ];

    for (const fetchMethod of fetchMethods) {
      try {
        const models = await fetchMethod();
        if (models && Array.isArray(models)) {
          console.log(`Successfully fetched ${models.length} models from GitHub AI catalog`);
          return this.processModelsData(models);
        }
      } catch (error) {
        console.warn('Fetch method failed:', error.message);
        continue;
      }
    }

    console.warn('All fetch methods failed, using fallback models');
    return this.getFallbackModels();
  }

  /**
   * Process models data from API
   * @param {Array} models - Raw models data
   * @returns {Array} Processed models data
   */
  processModelsData(models) {
    // Filter for text models only
    const textModels = models.filter(model =>
      model.supported_output_modalities &&
      model.supported_output_modalities.includes('text') &&
      !model.supported_output_modalities.includes('embeddings')
    );

    // Sort by publisher and name
    textModels.sort((a, b) => {
      if (a.publisher !== b.publisher) {
        return a.publisher.localeCompare(b.publisher);
      }
      return a.name.localeCompare(b.name);
    });

    return textModels.map(model => ({
      id: model.id,
      name: model.name,
      publisher: model.publisher,
      summary: model.summary || model.name,
      shortId: model.id.includes('/') ? model.id.split('/')[1] : model.id
    }));
  }

  /**
   * Get fallback models when API is unavailable
   * @returns {Array} Fallback models array
   */
  getFallbackModels() {
    return [
      { id: 'openai/gpt-4o', shortId: 'gpt-4o', name: 'GPT-4o', publisher: 'OpenAI', summary: 'Latest GPT-4 model' },
      { id: 'openai/gpt-4o-mini', shortId: 'gpt-4o-mini', name: 'GPT-4o Mini', publisher: 'OpenAI', summary: 'Smaller GPT-4 model' },
      { id: 'openai/o1-preview', shortId: 'o1-preview', name: 'O1 Preview', publisher: 'OpenAI', summary: 'Preview of O1 model' },
      { id: 'openai/o1-mini', shortId: 'o1-mini', name: 'O1 Mini', publisher: 'OpenAI', summary: 'Smaller O1 model' },
      { id: 'openai/gpt-4', shortId: 'gpt-4', name: 'GPT-4', publisher: 'OpenAI', summary: 'Original GPT-4 model' },
      { id: 'openai/gpt-3.5-turbo', shortId: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', publisher: 'OpenAI', summary: 'Fast GPT-3.5 model' },
      { id: 'anthropic/claude-3-5-sonnet', shortId: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', publisher: 'Anthropic', summary: 'Latest Claude model' },
      { id: 'anthropic/claude-3-haiku', shortId: 'claude-3-haiku', name: 'Claude 3 Haiku', publisher: 'Anthropic', summary: 'Fast Claude model' },
      { id: 'meta/llama-3.1-70b-instruct', shortId: 'llama-3.1-70b-instruct', name: 'Llama 3.1 70B', publisher: 'Meta', summary: 'Large Llama model' },
      { id: 'meta/llama-3.1-8b-instruct', shortId: 'llama-3.1-8b-instruct', name: 'Llama 3.1 8B', publisher: 'Meta', summary: 'Smaller Llama model' },
      { id: 'mistral/mistral-large', shortId: 'mistral-large', name: 'Mistral Large', publisher: 'Mistral', summary: 'Large Mistral model' },
      { id: 'microsoft/phi-3-medium-4k-instruct', shortId: 'phi-3-medium-4k-instruct', name: 'Phi-3 Medium', publisher: 'Microsoft', summary: 'Medium Phi-3 model' }
    ];
  }
}

// Export for global use
window.APIClient = APIClient;