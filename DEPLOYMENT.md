# HearuAI Web Application - AWS Amplify Deployment Guide

## Overview
This guide provides instructions for deploying the HearuAI web application to AWS Amplify via GitHub integration.

## Prerequisites
- AWS Account with Amplify access
- GitHub repository containing this codebase
- Azure services configured and API keys available

## Environment Variables Required

The following environment variables must be configured in AWS Amplify:

### Azure OpenAI Configuration
- `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI endpoint URL
- `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key
- `AZURE_OPENAI_DEPLOYMENT` - Your Azure OpenAI deployment name

### Azure AI Services Configuration
- `AZURE_AI_SERVICES_ENDPOINT` - Your Azure AI Services endpoint URL
- `AZURE_AI_SERVICES_API_KEY` - Your Azure AI Services API key

### Azure Speech Services Configuration
- `AZURE_SPEECH_API_KEY` - Your Azure Speech Services API key

### Azure Text Analytics Configuration
- `AZURE_TEXT_ANALYTICS_ENDPOINT` - Your Azure Text Analytics endpoint URL
- `AZURE_TEXT_ANALYTICS_API_KEY` - Your Azure Text Analytics API key

### Azure Translation Services Configuration
- `AZURE_TRANSLATION_API_KEY` - Your Azure Translation Services API key

### Azure Avatar Services Configuration
- `AZURE_AVATAR_API_KEY` - Your Azure Avatar Services API key

### Azure Region Configuration
- `AZURE_REGION` - Your Azure region (e.g., 'eastus2')

## Deployment Steps

### 1. Push Code to GitHub
Ensure all your code changes are committed and pushed to your GitHub repository.

### 2. Connect Repository to Amplify
1. Log in to AWS Amplify Console
2. Click "New app" > "Host web app"
3. Select "GitHub" as your repository service
4. Authorize AWS Amplify to access your GitHub account
5. Select your repository and branch

### 3. Configure Build Settings
Amplify should automatically detect the `amplify.yml` file. The build configuration includes:
- `npm install` to install dependencies
- `node build-config.js` to generate production configuration
- Static file serving from the root directory

### 4. Set Environment Variables
1. In the Amplify Console, go to your app
2. Navigate to "App settings" > "Environment variables"
3. Add all the required environment variables listed above
4. Save the configuration

### 5. Deploy
1. Click "Save and deploy"
2. Amplify will automatically build and deploy your application
3. Monitor the build process in the Amplify Console

## Build Process

The deployment uses the following build process:

1. **Install Dependencies**: `npm install`
2. **Generate Configuration**: `node build-config.js`
   - Reads environment variables from Amplify
   - Generates `js/config.js` with production configuration
   - Replaces placeholder values with actual environment variables
3. **Deploy Static Files**: All files are served as static content

## File Structure

### Key Files for Deployment
- `amplify.yml` - Build configuration for AWS Amplify
- `build-config.js` - Script to generate production configuration
- `js/config.production.js` - Template for production configuration
- `.gitignore` - Excludes development files and generated config

### Generated Files (Not in Git)
- `js/config.js` - Generated during build with actual environment variables

### Excluded Development Files
- `proxy-server.js` - Development proxy server
- `setup-dev-auth.html` - Development authentication setup
- `test-*.js` - Test files

## Verification

After deployment:

1. **Check Build Logs**: Ensure the build completed successfully
2. **Verify Configuration**: Check that environment variables are properly injected
3. **Test Application**: 
   - Open the deployed URL
   - Test Azure AI services integration
   - Verify speech, translation, and avatar features

## Troubleshooting

### Build Failures
- Check that all environment variables are set correctly
- Verify that the `build-config.js` script runs without errors
- Ensure all dependencies are properly listed in `package.json`

### Runtime Issues
- Verify Azure service endpoints and API keys
- Check browser console for configuration errors
- Ensure CORS is properly configured for Azure services

### Environment Variable Issues
- Double-check variable names match exactly
- Ensure no trailing spaces in variable values
- Verify that empty variables are acceptable for optional services

## Security Notes

- API keys are injected at build time and embedded in the client-side code
- Consider implementing additional security measures for production
- Regularly rotate API keys and update environment variables
- Monitor usage and implement rate limiting if necessary

## Support

For issues with:
- **AWS Amplify**: Check AWS Amplify documentation and support
- **Azure Services**: Verify service configuration in Azure Portal
- **Application**: Check application logs and browser console