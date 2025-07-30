#!/usr/bin/env python3
import os
import sys

# Set the API key directly
os.environ['GEMINI_API_KEY'] = 'AIzaSyBGbJhdOrpmgFV2eWaffZylEPMzsXfAGN0'

try:
    import google.generativeai as genai
    print("✅ google.generativeai imported successfully")
except ImportError:
    print("❌ google.generativeai not installed")
    print("Installing now...")
    os.system("pip install google-generativeai")
    import google.generativeai as genai

# Configure Gemini
genai.configure(api_key=os.environ['GEMINI_API_KEY'])

# Test the API
try:
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content("What is a legal contract? Give a brief explanation.")
    
    print("🎉 SUCCESS! Gemini AI is working!")
    print("=" * 50)
    print("Response:")
    print(response.text)
    print("=" * 50)
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("Check your API key and internet connection")
