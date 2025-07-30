const axios = require('axios');

class GeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
  }

  async generateContent(prompt, context = '') {
    try {
      const fullPrompt = context 
        ? `Context: ${context}\n\nQuestion: ${prompt}\n\nPlease provide a detailed legal analysis based on the context provided.`
        : prompt;

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.candidates && response.data.candidates[0]) {
        const content = response.data.candidates[0].content;
        if (content && content.parts && content.parts[0]) {
          return {
            text: content.parts[0].text,
            confidence: 0.9,
            model: 'gemini-pro'
          };
        }
      }

      throw new Error('Invalid response format from Gemini API');

    } catch (error) {
      console.error('Gemini API error:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }

      return {
        text: `I apologize, but I encountered an error while processing your question: ${error.message}`,
        confidence: 0.0,
        model: 'gemini-pro-error'
      };
    }
  }

  async testConnection() {
    try {
      const result = await this.generateContent('What is a legal contract?');
      return result.confidence > 0;
    } catch (error) {
      return false;
    }
  }
}

module.exports = GeminiClient;
