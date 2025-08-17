const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from current directory
app.use(express.static('.'));

// Azure OpenAI proxy endpoint
app.post('/api/azure-openai', async (req, res) => {
  try {
    const { endpoint, apiKey, deploymentName, messages, ...otherParams } = req.body;
    
    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;
    
    console.log('Proxying request to Azure OpenAI:', {
      url: url.replace(apiKey, '[REDACTED]'),
      messagesCount: messages.length
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages,
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        ...otherParams
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure API Error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log('Azure API Success:', {
      model: data.model,
      usage: data.usage
    });
    
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Azure Speech Services proxy endpoint
app.post('/api/azure-speech', async (req, res) => {
  try {
    const { endpoint, subscriptionKey, ...requestData } = req.body;
    
    console.log('Proxying request to Azure Speech:', {
      endpoint: endpoint,
      dataSize: JSON.stringify(requestData).length
    });
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        ...req.body.headers
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Speech API Error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Speech proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Azure Avatar Services proxy endpoint
app.post('/api/azure-avatar', async (req, res) => {
  try {
    const { endpoint, subscriptionKey, ...requestData } = req.body;
    
    console.log('Proxying request to Azure Avatar:', {
      endpoint: endpoint,
      dataSize: JSON.stringify(requestData).length
    });
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        ...req.body.headers
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Avatar API Error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }
    
    // Handle both JSON and binary responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      // For binary data (video/audio), pipe the response
      response.body.pipe(res);
    }
  } catch (error) {
    console.error('Avatar proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Main app available at http://localhost:${PORT}`);
});