# Transcribe n Vibe

A real-time speech transcription and AI-powered response application that helps you handle objections and generate comebacks using OpenAI's API.

## Features

- 🎤 Real-time speech recognition
- 🤖 AI-powered response generation using OpenAI GPT models
- 🎨 Dark/light theme support
- 📝 Preset management for different response styles
- 📊 Audio visualization during recording
- 📈 Response history tracking
- ⌨️ Keyboard shortcuts for quick access

## Requirements

- Modern web browser (Chrome, Edge, or Safari recommended for speech recognition)
- OpenAI API key
- HTTPS connection (required for speech recognition)

## Quick Start

### Option 1: Using Python's Built-in Server (Recommended)

1. **Navigate to the project directory:**
   ```bash
   cd /Users/zmetteer/GitHub/Transcribe_n_Vibe
   ```

2. **Start a local HTTPS server:**
   ```bash
   # For Python 3 (recommended)
   python3 -m http.server 8000 --bind 127.0.0.1
   ```
   
   **Note:** The above creates an HTTP server. For speech recognition to work properly, you need HTTPS. You can:
   
   - Use Chrome with the `--unsafely-treat-insecure-origin-as-secure` flag:
     ```bash
     open -a "Google Chrome" --args --unsafely-treat-insecure-origin-as-secure=http://127.0.0.1:8000 --user-data-dir=/tmp/chrome-test
     ```
   
   - Or create a simple HTTPS server (see Option 2 below)

3. **Open your browser and navigate to:**
   ```
   http://127.0.0.1:8000
   ```

### Option 2: Using Node.js with HTTPS

1. **Install a simple HTTPS server globally:**
   ```bash
   npm install -g http-server
   ```

2. **Generate self-signed certificates (for development only):**
   ```bash
   # Create a certificates directory
   mkdir certs
   cd certs
   
   # Generate a private key
   openssl genrsa -out key.pem 2048
   
   # Generate a certificate
   openssl req -new -x509 -key key.pem -out cert.pem -days 365 -subj "/CN=localhost"
   
   cd ..
   ```

3. **Start the HTTPS server:**
   ```bash
   http-server -S -C certs/cert.pem -K certs/key.pem -p 8000
   ```

4. **Open your browser and navigate to:**
   ```
   https://127.0.0.1:8000
   ```
   
   **Note:** You'll need to accept the security warning for the self-signed certificate.

### Option 3: Using Live Server Extension (VS Code)

If you're using VS Code:

1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. The application will open in your default browser

## Configuration

### Setting up OpenAI API Key

1. Get your OpenAI API key from [OpenAI's dashboard](https://platform.openai.com/api-keys)
2. Click the settings gear (⚙️) button in the app
3. Enter your API key (it starts with `sk-`)
4. Click "Save"

Your API key is stored locally in your browser and is never sent anywhere except to OpenAI's servers.

## Usage

### Basic Operation

1. **Start Listening:** Click the "🎤 Start Listening" button
2. **Speak:** Say your objection or statement
3. **Get Response:** The AI will generate a response automatically
4. **Stop Listening:** Click "🛑 Stop Listening" when done

### Keyboard Shortcuts

- **Spacebar:** Toggle recording (when not in input fields)
- **Alt + H:** Show objection history
- **Alt + K:** Open API key dialog
- **Escape:** Close any open dialog

### Prompt Presets

The app includes several preset prompts:

- **Executive Reframer:** For C-suite communication and reframing challenges
- **Negotiation Expert:** For sales and negotiation scenarios

You can also create custom presets by:
1. Editing the prompt text
2. Clicking "Save As+"
3. Entering a name for your preset

### Models

Choose between different OpenAI models:
- **GPT-4o (Latest):** Most capable model
- **GPT-4o Mini:** Faster and more cost-effective

## Troubleshooting

### Speech Recognition Not Working

- Ensure you're using HTTPS (speech recognition requires secure context)
- Check that your browser supports speech recognition (Chrome, Edge, Safari)
- Make sure microphone permissions are granted
- Try refreshing the page

### API Errors

- Verify your OpenAI API key is correct
- Check that you have available credits in your OpenAI account
- Ensure you're connected to the internet

### Audio Visualization Not Showing

- The audio visualizer requires microphone access
- It may not work in all browsers or configurations
- The app will still function without visualization

## File Structure

```
Transcribe_n_Vibe/
├── index.html          # Main application file
├── utils.js            # Utility functions and classes
├── app.js              # Extended functionality
├── styles.css          # Additional styling
├── Logo black.png      # Application logo
├── CLAUDE.md           # API documentation
└── README.md           # This file
```

## Browser Compatibility

- **Chrome:** Full support (recommended)
- **Edge:** Full support
- **Safari:** Full support
- **Firefox:** Limited support (speech recognition not available)

## Security Notes

- Your API key is stored locally in your browser's localStorage
- The app runs entirely client-side
- No data is sent to any servers except OpenAI's API
- Use HTTPS in production environments

## License

This project is for educational and personal use.
