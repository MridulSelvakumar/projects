#!/usr/bin/env python3
"""
Test script for Gemini AI integration
"""

import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_gemini_direct():
    """Test Gemini API directly"""
    print("🧪 Testing Gemini API directly...")
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key or api_key == 'your-gemini-api-key-here':
        print("❌ GEMINI_API_KEY not set or still using placeholder")
        print("Please set your API key in .env file")
        return False
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content("What is a legal contract?")
        
        print("✅ Gemini API working!")
        print(f"Response: {response.text[:100]}...")
        return True
        
    except Exception as e:
        print(f"❌ Gemini API test failed: {e}")
        return False

def test_ai_service():
    """Test the AI service endpoint"""
    print("\n🧪 Testing AI service endpoint...")
    
    try:
        response = requests.get('http://localhost:5001/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ AI service is running!")
            print(f"Gemini available: {data.get('gemini_available', False)}")
            return True
        else:
            print(f"❌ AI service returned status: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ AI service not running on port 5001")
        print("Start it with: cd ai-service && python app-gemini.py")
        return False
    except Exception as e:
        print(f"❌ AI service test failed: {e}")
        return False

def test_ai_query():
    """Test AI query endpoint"""
    print("\n🧪 Testing AI query...")
    
    try:
        payload = {
            "question": "What are the key elements of a legal contract?",
            "context": "A contract is a legally binding agreement between parties."
        }
        
        response = requests.post(
            'http://localhost:5001/api/query',
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ AI query working!")
            print(f"Answer: {data.get('answer', '')[:100]}...")
            print(f"Confidence: {data.get('confidence', 0)}")
            return True
        else:
            print(f"❌ AI query failed with status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ AI query test failed: {e}")
        return False

def test_cap_service():
    """Test CAP service endpoint"""
    print("\n🧪 Testing CAP service...")
    
    try:
        response = requests.get('http://localhost:4004', timeout=5)
        if response.status_code == 200:
            print("✅ CAP service is running!")
            return True
        else:
            print(f"❌ CAP service returned status: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ CAP service not running on port 4004")
        print("Start it with: npm start")
        return False
    except Exception as e:
        print(f"❌ CAP service test failed: {e}")
        return False

def main():
    print("🚀 Gemini AI Integration Test")
    print("==============================")
    
    # Test sequence
    tests = [
        ("Gemini API Direct", test_gemini_direct),
        ("AI Service Health", test_ai_service),
        ("AI Query", test_ai_query),
        ("CAP Service", test_cap_service)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n📊 Test Results Summary:")
    print("========================")
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nPassed: {passed}/{len(results)} tests")
    
    if passed == len(results):
        print("\n🎉 All tests passed! Your Gemini AI integration is working!")
        print("You can now use the AI Assistant in your Legal Document Analyzer!")
    else:
        print("\n⚠️ Some tests failed. Please check the setup instructions.")

if __name__ == "__main__":
    main()
