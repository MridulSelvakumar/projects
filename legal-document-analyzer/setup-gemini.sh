#!/bin/bash

echo "🚀 Setting up Gemini AI for Legal Document Analyzer"
echo "=================================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.template .env
fi

echo ""
echo "📋 SETUP INSTRUCTIONS:"
echo "======================"
echo ""
echo "1. Get your Gemini API key:"
echo "   - Go to: https://makersuite.google.com/app/apikey"
echo "   - Create a new API key"
echo "   - Copy the key"
echo ""
echo "2. Add your API key to the .env file:"
echo "   - Open .env file in your editor"
echo "   - Replace 'your-gemini-api-key-here' with your actual API key"
echo "   - Save the file"
echo ""
echo "3. Install Python dependencies:"
echo "   cd ai-service"
echo "   pip install -r requirements.txt"
echo ""
echo "4. Start the Gemini AI service:"
echo "   cd ai-service"
echo "   python app-gemini.py"
echo ""
echo "5. In another terminal, start the CAP service:"
echo "   npm start"
echo ""
echo "6. Test the integration:"
echo "   - Open: http://localhost:4004/legal-document-ui/index.html"
echo "   - Go to AI Assistant section"
echo "   - Ask a question to test Gemini AI"
echo ""

# Check if Python is installed
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 is installed"
else
    echo "❌ Python 3 is not installed. Please install Python 3 first."
fi

# Check if pip is installed
if command -v pip3 &> /dev/null; then
    echo "✅ pip3 is installed"
else
    echo "❌ pip3 is not installed. Please install pip3 first."
fi

echo ""
echo "🔧 Quick setup commands:"
echo "========================"
echo "cd ai-service && pip3 install google-generativeai python-dotenv flask flask-cors"
echo "export GEMINI_API_KEY='your-api-key-here'"
echo "python3 app-gemini.py"
echo ""
echo "📖 For more help, check the README.md file"
