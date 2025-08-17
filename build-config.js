#!/usr/bin/env node

// Build script to replace environment variables in config.production.js
// and generate config.js for browser use

const fs = require('fs');
const path = require('path');

// Read the production config template
const configTemplate = fs.readFileSync('js/config.production.js', 'utf8');

// Environment variables mapping
const envVars = {
  'process.env.AZURE_OPENAI_ENDPOINT': process.env.AZURE_OPENAI_ENDPOINT || 'https://nithinvthomas96-2178-resource.openai.azure.com/',
  'process.env.AZURE_OPENAI_API_KEY': process.env.AZURE_OPENAI_API_KEY || '',
  'process.env.AZURE_OPENAI_DEPLOYMENT': process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4-04-14-4hearuai',
  'process.env.AZURE_AI_SERVICES_ENDPOINT': process.env.AZURE_AI_SERVICES_ENDPOINT || 'https://nithinvthomas96-2178-resource.cognitiveservices.azure.com/',
  'process.env.AZURE_AI_SERVICES_API_KEY': process.env.AZURE_AI_SERVICES_API_KEY || '',
  'process.env.AZURE_SPEECH_API_KEY': process.env.AZURE_SPEECH_API_KEY || '',
  'process.env.AZURE_TEXT_ANALYTICS_ENDPOINT': process.env.AZURE_TEXT_ANALYTICS_ENDPOINT || 'https://nithinvthomas96-2178-resource.cognitiveservices.azure.com/',
  'process.env.AZURE_TEXT_ANALYTICS_API_KEY': process.env.AZURE_TEXT_ANALYTICS_API_KEY || '',
  'process.env.AZURE_TRANSLATION_API_KEY': process.env.AZURE_TRANSLATION_API_KEY || '',
  'process.env.AZURE_AVATAR_API_KEY': process.env.AZURE_AVATAR_API_KEY || '',
  'process.env.AZURE_REGION': process.env.AZURE_REGION || 'eastus2'
};

// Replace environment variables with actual values
let configContent = configTemplate;

// First handle template literals with environment variables
const templateLiteralRegex = /`https:\/\/\$\{process\.env\.AZURE_REGION \|\| 'eastus2'\}\.(.*?)`/g;
configContent = configContent.replace(templateLiteralRegex, (match, domain) => {
  const region = process.env.AZURE_REGION || 'eastus2';
  return `'https://${region}.${domain}'`;
});

// Replace environment variable expressions with actual values
for (const [envVar, value] of Object.entries(envVars)) {
  const quotedValue = `'${value.replace(/'/g, "\\'")}'`;
  
  // Simple string replacement for each environment variable
  configContent = configContent.split(envVar).join(quotedValue);
}

// Clean up redundant || expressions
configContent = configContent.replace(/'([^']*)' \|\| '([^']*)'/g, "'$1'");
configContent = configContent.replace(/'' \|\| '([^']*)'/g, "'$1'");

// Write the processed config to config.js
fs.writeFileSync('js/config.js', configContent);

console.log('✅ Configuration file generated successfully!');
console.log('Environment variables processed:');
for (const [envVar, value] of Object.entries(envVars)) {
  const maskedValue = value.length > 10 ? value.substring(0, 10) + '...' : value;
  console.log(`  ${envVar}: ${maskedValue}`);
}