/**
 * Azure Translation Service
 * Handles language detection, translation, and mixed language support
 */

class AzureTranslationService {
    constructor(config) {
        this.config = config;
        this.endpoint = config.translation.endpoint;
        this.subscriptionKey = config.translation.subscriptionKey;
        this.region = config.translation.region;
        this.supportedLanguages = config.translation.supportedLanguages;
        this.mixedLanguagePatterns = config.translation.mixedLanguagePatterns;
        this.currentLanguage = config.translation.defaultLanguage;
        this.autoDetect = config.translation.autoDetect;
        
        // Cache for detected languages to improve performance
        this.languageCache = new Map();
        this.translationCache = new Map();
    }

    /**
     * Detect the language of input text
     * @param {string} text - Text to analyze
     * @returns {Promise<Object>} Language detection result
     */
    async detectLanguage(text) {
        if (!text || text.trim().length === 0) {
            return { language: this.currentLanguage, confidence: 1.0, isMixed: false };
        }

        // Check cache first
        const cacheKey = text.toLowerCase().trim();
        if (this.languageCache.has(cacheKey)) {
            return this.languageCache.get(cacheKey);
        }

        try {
            // First check for mixed languages (Hinglish, Manglish, etc.)
            const mixedLanguageResult = this.detectMixedLanguage(text);
            if (mixedLanguageResult.isMixed) {
                this.languageCache.set(cacheKey, mixedLanguageResult);
                return mixedLanguageResult;
            }

            // Use Azure Translator for language detection
            const response = await fetch(`${this.endpoint}detect?api-version=3.0`, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                    'Ocp-Apim-Subscription-Region': this.region,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{ text: text }])
            });

            if (!response.ok) {
                throw new Error(`Language detection failed: ${response.status}`);
            }

            const result = await response.json();
            const detectedLang = result[0];
            
            const languageResult = {
                language: detectedLang.language,
                confidence: detectedLang.score,
                isMixed: false,
                alternatives: detectedLang.alternatives || []
            };

            // Cache the result
            this.languageCache.set(cacheKey, languageResult);
            return languageResult;

        } catch (error) {
            console.error('Language detection error:', error);
            // Fallback to current language
            return { language: this.currentLanguage, confidence: 0.5, isMixed: false, error: error.message };
        }
    }

    /**
     * Detect mixed languages like Hinglish, Manglish
     * @param {string} text - Text to analyze
     * @returns {Object} Mixed language detection result
     */
    detectMixedLanguage(text) {
        const words = text.toLowerCase().split(/\s+/);
        const wordCount = words.length;
        
        for (const [patternName, pattern] of Object.entries(this.mixedLanguagePatterns)) {
            const matchingWords = words.filter(word => 
                pattern.commonWords.some(commonWord => 
                    word.includes(commonWord) || commonWord.includes(word)
                )
            );
            
            const matchRatio = matchingWords.length / wordCount;
            
            // If more than 20% of words match mixed language patterns
            if (matchRatio > 0.2) {
                return {
                    language: pattern.primaryLang,
                    secondaryLanguage: pattern.secondaryLang,
                    confidence: Math.min(matchRatio * 2, 1.0), // Cap at 1.0
                    isMixed: true,
                    mixedType: patternName,
                    matchingWords: matchingWords
                };
            }
        }
        
        return { isMixed: false };
    }

    /**
     * Translate text to target language
     * @param {string} text - Text to translate
     * @param {string} targetLang - Target language code
     * @param {string} sourceLang - Source language code (optional)
     * @returns {Promise<Object>} Translation result
     */
    async translateText(text, targetLang, sourceLang = null) {
        if (!text || text.trim().length === 0) {
            return { translatedText: text, sourceLanguage: sourceLang || 'en' };
        }

        // If target language is same as source, return original text
        if (sourceLang && sourceLang === targetLang) {
            return { translatedText: text, sourceLanguage: sourceLang };
        }

        // Check translation cache
        const cacheKey = `${text}_${sourceLang || 'auto'}_${targetLang}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        try {
            let url = `${this.endpoint}translate?api-version=3.0&to=${targetLang}`;
            if (sourceLang) {
                url += `&from=${sourceLang}`;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                    'Ocp-Apim-Subscription-Region': this.region,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{ text: text }])
            });

            if (!response.ok) {
                throw new Error(`Translation failed: ${response.status}`);
            }

            const result = await response.json();
            const translation = result[0];
            
            const translationResult = {
                translatedText: translation.translations[0].text,
                sourceLanguage: translation.detectedLanguage?.language || sourceLang,
                confidence: translation.detectedLanguage?.score || 1.0
            };

            // Cache the result
            this.translationCache.set(cacheKey, translationResult);
            return translationResult;

        } catch (error) {
            console.error('Translation error:', error);
            return { translatedText: text, sourceLanguage: sourceLang || 'en', error: error.message };
        }
    }

    /**
     * Handle mixed language translation
     * @param {string} text - Mixed language text
     * @param {string} targetLang - Target language
     * @param {Object} mixedLangInfo - Mixed language detection info
     * @returns {Promise<Object>} Translation result
     */
    async translateMixedLanguage(text, targetLang, mixedLangInfo) {
        try {
            // For mixed languages, we'll translate using the primary language
            const result = await this.translateText(text, targetLang, mixedLangInfo.language);
            result.isMixedSource = true;
            result.mixedType = mixedLangInfo.mixedType;
            return result;
        } catch (error) {
            console.error('Mixed language translation error:', error);
            return { translatedText: text, sourceLanguage: mixedLangInfo.language, error: error.message };
        }
    }

    /**
     * Get voice for detected language
     * @param {string} languageCode - Language code
     * @returns {string} Voice name for the language
     */
    getVoiceForLanguage(languageCode) {
        const langInfo = this.supportedLanguages[languageCode];
        return langInfo ? langInfo.voice : this.supportedLanguages['en'].voice;
    }

    /**
     * Get language name in native script
     * @param {string} languageCode - Language code
     * @returns {string} Native language name
     */
    getLanguageNativeName(languageCode) {
        const langInfo = this.supportedLanguages[languageCode];
        return langInfo ? langInfo.nativeName : languageCode;
    }

    /**
     * Get all supported languages
     * @returns {Object} Supported languages object
     */
    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    /**
     * Set current language preference
     * @param {string} languageCode - Language code to set as current
     */
    setCurrentLanguage(languageCode) {
        if (this.supportedLanguages[languageCode]) {
            this.currentLanguage = languageCode;
            // Store in localStorage for persistence
            localStorage.setItem('hearuai_preferred_language', languageCode);
        }
    }

    /**
     * Get current language preference
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        // Check localStorage first
        const stored = localStorage.getItem('hearuai_preferred_language');
        if (stored && this.supportedLanguages[stored]) {
            this.currentLanguage = stored;
        }
        return this.currentLanguage;
    }

    /**
     * Clear translation cache
     */
    clearCache() {
        this.languageCache.clear();
        this.translationCache.clear();
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AzureTranslationService };
} else {
    window.AzureTranslationService = AzureTranslationService;
}