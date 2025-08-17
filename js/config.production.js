// Production Azure AI Configuration
// This file uses environment variables for secure deployment

const AZURE_CONFIG = {
  // Azure OpenAI Configuration
  openai: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://nithinvthomas96-2178-resource.openai.azure.com/',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4-04-14-4hearuai'
  },
  
  // Azure AI Services Configuration (Multi-service endpoint)
  aiServices: {
    endpoint: process.env.AZURE_AI_SERVICES_ENDPOINT || 'https://nithinvthomas96-2178-resource.cognitiveservices.azure.com/',
    apiKey: process.env.AZURE_AI_SERVICES_API_KEY || '',
    region: process.env.AZURE_REGION || 'eastus2'
  },
  
  // Azure Speech Services Configuration
  speech: {
    subscriptionKey: process.env.AZURE_SPEECH_API_KEY || '',
    region: process.env.AZURE_REGION || 'eastus2',
    language: 'en-US',
    voice: 'en-US-AriaNeural',
    // Voice call specific configuration
    voiceCall: {
      voice: 'en-IN-AartiDragonHDV1.1.1Neural'
    },
    // Video call specific configuration
    videoCall: {
      voice: 'en-IN-AartiNeural'
    },
    // Specific Speech service endpoints
    speechToTextEndpoint: `https://${process.env.AZURE_REGION || 'eastus2'}.stt.speech.microsoft.com`,
    textToSpeechEndpoint: `https://${process.env.AZURE_REGION || 'eastus2'}.tts.speech.microsoft.com`
  },
  
  // Azure Text Analytics Configuration (for sentiment analysis)
  textAnalytics: {
    endpoint: process.env.AZURE_TEXT_ANALYTICS_ENDPOINT || 'https://nithinvthomas96-2178-resource.cognitiveservices.azure.com/',
    subscriptionKey: process.env.AZURE_TEXT_ANALYTICS_API_KEY || ''
  },

  // Azure Translation Services Configuration
  translation: {
    endpoint: 'https://api.cognitive.microsofttranslator.com/',
    subscriptionKey: process.env.AZURE_TRANSLATION_API_KEY || '',
    region: process.env.AZURE_REGION || 'eastus2',
    // Supported Indian languages
    supportedLanguages: {
      'hi': { name: 'Hindi', nativeName: 'हिन्दी', voice: 'hi-IN-SwaraNeural' },
      'ta': { name: 'Tamil', nativeName: 'தமிழ்', voice: 'ta-IN-PallaviNeural' },
      'te': { name: 'Telugu', nativeName: 'తెలుగు', voice: 'te-IN-ShrutiNeural' },
      'kn': { name: 'Kannada', nativeName: 'ಕನ್ನಡ', voice: 'kn-IN-SapnaNeural' },
      'ml': { name: 'Malayalam', nativeName: 'മലയാളം', voice: 'ml-IN-SobhanaNeural' },
      'gu': { name: 'Gujarati', nativeName: 'ગુજરાતી', voice: 'gu-IN-DhwaniNeural' },
      'mr': { name: 'Marathi', nativeName: 'मराठी', voice: 'mr-IN-AarohiNeural' },
      'bn': { name: 'Bengali', nativeName: 'বাংলা', voice: 'bn-IN-BashkarNeural' },
      'pa': { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', voice: 'pa-IN-GaganNeural' },
      'or': { name: 'Odia', nativeName: 'ଓଡ଼ିଆ', voice: 'or-IN-SubhasiniNeural' },
      'as': { name: 'Assamese', nativeName: 'অসমীয়া', voice: 'as-IN-YashicaNeural' },
      'ur': { name: 'Urdu', nativeName: 'اردو', voice: 'ur-IN-GulNeural' },
      'en': { name: 'English', nativeName: 'English', voice: 'en-IN-AartiNeural' }
    },
    // Mixed language patterns for detection
    mixedLanguagePatterns: {
      hinglish: {
        name: 'Hinglish',
        primaryLang: 'hi',
        secondaryLang: 'en',
        commonWords: ['yaar', 'bhai', 'dude', 'actually', 'basically', 'matlab', 'kya', 'hai', 'toh', 'but', 'and']
      },
      manglish: {
        name: 'Manglish',
        primaryLang: 'ml',
        secondaryLang: 'en',
        commonWords: ['machane', 'dude', 'actually', 'basically', 'enthu', 'alle', 'but', 'and', 'so']
      },
      tanglish: {
        name: 'Tanglish',
        primaryLang: 'ta',
        secondaryLang: 'en',
        commonWords: ['da', 'dude', 'actually', 'basically', 'enna', 'illa', 'but', 'and', 'so']
      }
    },
    defaultLanguage: 'en',
    autoDetect: true
  },
  
  // Azure Avatar Services Configuration
  avatar: {
    endpoint: `https://${process.env.AZURE_REGION || 'eastus2'}.tts.speech.microsoft.com`,
    subscriptionKey: process.env.AZURE_AVATAR_API_KEY || '',
    region: process.env.AZURE_REGION || 'eastus2',
    defaultAvatar: 'meg-casual',
    defaultVoice: 'en-IN-AartiNeural',
    // Avatar-specific settings
    videoFormat: 'mp4',
    videoCodec: 'h264',
    resolution: '1920x1080',
    fps: 25,
    therapyMode: {
      enabled: true,
      avatarStyle: 'graceful-sitting',
      voiceSettings: {
        rate: '0%',
        pitch: '0%',
        volume: '0%'
      }
    }
  }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AZURE_CONFIG;
} else {
  window.AZURE_CONFIG = AZURE_CONFIG;
}