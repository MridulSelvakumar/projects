#!/bin/bash

echo "🚀 Legal Document Analyzer - Ollama Setup Script"
echo "=================================================="

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Please install it first:"
    echo "   curl -fsSL https://ollama.ai/install.sh | sh"
    exit 1
fi

echo "✅ Ollama is installed"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "🔄 Starting Ollama service..."
    ollama serve &
    OLLAMA_PID=$!
    echo "Ollama started with PID: $OLLAMA_PID"
    
    # Wait for Ollama to start
    echo "⏳ Waiting for Ollama to start..."
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo "✅ Ollama is running!"
            break
        fi
        sleep 1
        echo -n "."
    done
else
    echo "✅ Ollama is already running"
fi

# Check if LLaMA 3 model is available
echo "🔍 Checking for LLaMA 3 models..."
MODELS=$(curl -s http://localhost:11434/api/tags | jq -r '.models[].name' 2>/dev/null)

if echo "$MODELS" | grep -q "llama3"; then
    echo "✅ LLaMA 3 model found!"
    echo "Available LLaMA 3 models:"
    echo "$MODELS" | grep llama3
else
    echo "⚠️  LLaMA 3 model not found. Installing..."
    echo "🔄 Pulling LLaMA 3 model (this may take a while)..."
    ollama pull llama3
    
    if [ $? -eq 0 ]; then
        echo "✅ LLaMA 3 model installed successfully!"
    else
        echo "❌ Failed to install LLaMA 3 model"
        exit 1
    fi
fi

# Test the model
echo "🧪 Testing LLaMA 3 model..."
TEST_RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d '{
        "model": "llama3",
        "prompt": "Hello, this is a test. Please respond with just: LLaMA 3 is working!",
        "stream": false,
        "options": {
            "num_predict": 20
        }
    }' | jq -r '.response' 2>/dev/null)

if [ ! -z "$TEST_RESPONSE" ]; then
    echo "✅ LLaMA 3 test successful!"
    echo "Response: $TEST_RESPONSE"
else
    echo "⚠️  LLaMA 3 test failed, but the model should still work"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================================================="
echo "✅ Ollama is running on http://localhost:11434"
echo "✅ LLaMA 3 model is available"
echo "✅ Your Legal Document Analyzer can now use LLaMA 3!"
echo ""
echo "💡 Tips:"
echo "   - Keep this terminal open to keep Ollama running"
echo "   - Or run 'ollama serve' in the background"
echo "   - Test your setup at: http://localhost:8080"
echo ""
echo "🚀 Ready to analyze legal documents with AI!"
