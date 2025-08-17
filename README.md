# HearUAI Web Application

An empathetic AI therapy platform that combines voice and text interactions with Azure AI services.

## Features

- **AI-Powered Therapy Chat**: Empathetic conversations using Azure OpenAI
- **Voice Integration**: Speech-to-text and text-to-speech capabilities
- **Sentiment Analysis**: Real-time emotional understanding
- **Responsive Design**: Works on desktop and mobile devices
- **Session Management**: Export and clear conversation history
- **Customizable Voice Settings**: Multiple voice options and speed controls

## Setup Instructions

### Prerequisites

1. **Azure Account**: You need an active Azure subscription
2. **Azure AI Services**: Set up the following services:
   - Azure OpenAI Service
   - Azure Speech Services
   - Azure Text Analytics (optional, for sentiment analysis)

### Azure Service Configuration

#### 1. Azure OpenAI Service
1. Create an Azure OpenAI resource in the Azure portal
2. Deploy a model (GPT-4 or GPT-3.5-turbo recommended)
3. Note down:
   - Endpoint URL
   - API Key
   - Deployment name

#### 2. Azure Speech Services
1. Create a Speech Services resource
2. Note down:
   - Subscription key
   - Region

#### 3. Azure Text Analytics (Optional)
1. Create a Text Analytics resource
2. Note down:
   - Endpoint URL
   - Subscription key

### Application Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hearuai.git
   cd hearuai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Azure Credentials**:
   - Open `js/config.js`
   - Replace placeholder values with your actual Azure credentials:
   ```javascript
   const AZURE_CONFIG = {
     openai: {
       endpoint: 'https://your-resource-name.openai.azure.com/',
       apiKey: 'your-api-key-here',
       deploymentName: 'your-deployment-name',
       apiVersion: '2024-02-15-preview'
     },
     speech: {
       subscriptionKey: 'your-speech-subscription-key',
       region: 'your-region',
       language: 'en-US',
       voice: 'en-US-AriaNeural'
     },
     textAnalytics: {
       endpoint: 'https://your-text-analytics-resource.cognitiveservices.azure.com/',
       subscriptionKey: 'your-text-analytics-key'
     }
   };
   ```

3. **Serve the Application**:
   - For development, use a local web server (due to CORS restrictions)
   - Options:
     - **Python**: `python -m http.server 8000`
     - **Node.js**: `npx http-server`
     - **PHP**: `php -S localhost:8000`
     - **Live Server** (VS Code extension)

5. **Access the Application**:
   - Open your browser and navigate to `http://localhost:8000/chat.html`

## Usage

### Chat Interface
- Type messages in the input field and press Enter or click Send
- Use the microphone button for voice input (requires browser permissions)
- Click the settings gear to configure voice options

### Voice Features
- **Voice Input**: Click the microphone button and speak
- **Voice Output**: AI responses can be read aloud
- **Settings**: Adjust voice speed, select different voices, and configure input/output preferences

### Session Management
- **Export Session**: Download conversation history as JSON
- **Clear Session**: Reset the conversation

## File Structure

```
hearuai web/
├── index.html              # Main HTML file
├── js/
│   ├── config.js           # Azure AI configuration
│   ├── azure-ai.js         # Azure AI service integrations
│   └── chat.js             # Chat interface and functionality
└── README.md               # This file
```

## Security Notes

- **Never commit API keys** to version control
- Consider using environment variables or Azure Key Vault for production
- Implement proper authentication and authorization for production use
- The current setup is for development/demo purposes

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure you're serving the files through a web server, not opening directly in browser
2. **API Key Errors**: Verify your Azure credentials in `config.js`
3. **Voice Not Working**: Check browser permissions for microphone access
4. **No AI Responses**: Check browser console for error messages and verify Azure service status

### Browser Console
Open browser developer tools (F12) and check the Console tab for error messages.

## Support

For issues related to:
- **Azure Services**: Check Azure documentation and support
- **Application Code**: Review the JavaScript files and browser console for errors

## License

This project is for demonstration purposes. Please ensure compliance with Azure AI service terms and conditions.