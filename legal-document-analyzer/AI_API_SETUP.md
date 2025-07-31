# 🤖 AI API Integration Setup

Your Legal Document Analyzer now supports multiple AI providers! Here's how to set up external AI APIs:

## 🚀 Quick Start

1. **Copy the environment template:**
   ```bash
   cp ai-service/.env.example ai-service/.env
   ```

2. **Choose your AI provider and add your API key to `ai-service/.env`**

3. **Restart the AI service:**
   ```bash
   cd ai-service && python app.py
   ```

## 🔑 Supported AI Providers

### 1. OpenAI GPT (Recommended for Legal Analysis)
- **Best for:** Comprehensive legal document analysis
- **Models:** GPT-4, GPT-3.5-turbo
- **Setup:**
  ```env
  AI_PROVIDER=openai
  OPENAI_API_KEY=sk-your-openai-key-here
  ```
- **Get API Key:** https://platform.openai.com/api-keys

### 2. Google Gemini
- **Best for:** Fast document processing
- **Models:** Gemini Pro
- **Setup:**
  ```env
  AI_PROVIDER=gemini
  GEMINI_API_KEY=your-gemini-key-here
  ```
- **Get API Key:** https://makersuite.google.com/app/apikey

### 3. Anthropic Claude
- **Best for:** Detailed legal reasoning
- **Models:** Claude 3 Sonnet
- **Setup:**
  ```env
  AI_PROVIDER=claude
  ANTHROPIC_API_KEY=your-claude-key-here
  ```
- **Get API Key:** https://console.anthropic.com/

### 4. Hugging Face
- **Best for:** Open source models
- **Models:** Various open source LLMs
- **Setup:**
  ```env
  AI_PROVIDER=huggingface
  HUGGINGFACE_API_KEY=your-hf-key-here
  ```
- **Get API Key:** https://huggingface.co/settings/tokens

## 🎯 Current Status

✅ **AI Service Running:** http://localhost:5002
✅ **Fallback System:** Works without API keys
✅ **Multiple Providers:** Switch between APIs easily
✅ **Smart Responses:** Intelligent fallback for legal queries

## 🧪 Testing

Test your AI integration:
```bash
curl -X POST http://localhost:5002/api/query \
  -H "Content-Type: application/json" \
  -d '{"question":"What are the key terms?","context":"Sample contract text","provider":"openai"}'
```

## 🔄 Switching Providers

Change the `AI_PROVIDER` in your `.env` file:
- `openai` - For GPT models
- `gemini` - For Google Gemini
- `claude` - For Anthropic Claude
- `huggingface` - For open source models

## 💡 Features

- **Smart Fallback:** Works even without API keys
- **Legal-Focused:** Optimized prompts for legal documents
- **Confidence Scoring:** AI confidence levels
- **Multiple Models:** Support for different AI providers
- **Error Handling:** Graceful degradation

## 🛠️ Troubleshooting

**No API Key?** The system uses intelligent fallback responses.
**API Errors?** Check your API key and provider settings.
**Slow Responses?** Try switching to a different provider.

Your Legal Document Analyzer is ready to use with or without external AI APIs! 🎉
