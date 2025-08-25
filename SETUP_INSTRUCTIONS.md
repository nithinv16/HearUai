# HearuAI Setup Instructions

## Azure API Configuration

To resolve the 401 Unauthorized errors, you need to configure your Azure API keys properly.

### Step 1: Get Your Azure API Keys

1. **Azure OpenAI Service:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to your Azure OpenAI resource
   - Copy the API Key and Endpoint from the "Keys and Endpoint" section
   - Note your deployment name (model deployment)

2. **Azure AI Services (Cognitive Services):**
   - Navigate to your Azure AI Services resource
   - Copy the API Key and Endpoint

3. **Azure Speech Services:**
   - Navigate to your Azure Speech resource
   - Copy the API Key

4. **Azure Text Analytics:**
   - Navigate to your Azure Text Analytics resource
   - Copy the API Key and Endpoint

5. **Azure Translation Services:**
   - Navigate to your Azure Translator resource
   - Copy the API Key

### Step 2: Update the .env File

1. Open the `.env` file in the project root
2. Replace all placeholder values with your actual Azure credentials:

```env
# Example configuration:
AZURE_OPENAI_API_KEY=1234567890abcdef1234567890abcdef
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4

AZURE_AI_SERVICES_API_KEY=abcdef1234567890abcdef1234567890
AZURE_AI_SERVICES_ENDPOINT=https://eastus.api.cognitive.microsoft.com/

# ... and so on for other services
```

### Step 3: Regenerate Configuration

After updating the `.env` file:

```bash
node build-config.js
```

This will regenerate the `js/config.js` file with your actual API keys.

### Step 4: Restart the Server

Restart the proxy server to load the new configuration:

```bash
node proxy-server.js
```

### Step 5: Test the Application

Refresh your browser and test the chat functionality. The 401 errors should be resolved.

## Security Notes

- **Never commit the `.env` file to version control**
- The `.env` file is already added to `.gitignore`
- Keep your API keys secure and rotate them regularly
- Use different keys for development and production environments

## Troubleshooting

- If you still get 401 errors, verify your API keys are correct
- Check that your Azure resources are in the correct region
- Ensure your Azure subscriptions are active and have sufficient credits
- Verify the endpoint URLs match your Azure resource regions