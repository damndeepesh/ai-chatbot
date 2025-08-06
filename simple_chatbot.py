import os
import json
import uuid
from typing import List, Dict, Any
import requests
from dotenv import load_dotenv

class SimpleChatbotManager:
    def __init__(self):
        """Initialize the chatbot manager"""
        load_dotenv()
        
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        
        # Session storage for conversation memory
        self.sessions = {}
        
    def get_response(self, message: str, session_id: str, model_name: str = 'gemini', hinglish_mode: bool = False) -> str:
        """Get a response from the chatbot"""
        if model_name == 'gemini' and self.google_api_key:
            return self._call_gemini_api(message, session_id, hinglish_mode)
        elif model_name == 'groq' and self.groq_api_key:
            return self._call_groq_api(message, session_id, hinglish_mode)
        else:
            return "Sorry, the selected model is not available. Please check your API keys."
    
    def _call_gemini_api(self, message: str, session_id: str, hinglish_mode: bool = False) -> str:
        """Call Google Gemini API"""
        try:
            url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent"
            
            # Get conversation history
            history = self._get_or_create_session(session_id)
            
            # Prepare messages
            messages = []
            
            # Add system message for Hinglish mode if enabled
            if hinglish_mode:
                system_message = {
                    "role": "user", 
                    "parts": [{"text": "You are a helpful AI assistant. Please respond in Hinglish (mix of Hindi and English, casual tone, use Roman script for Hindi words). Keep your responses natural and conversational."}]
                }
                messages.append(system_message)
            
            for msg in history['messages'][-10:]:  # Keep last 10 messages for context
                if msg['role'] == 'user':
                    messages.append({"role": "user", "parts": [{"text": msg['content']}]})
                else:
                    messages.append({"role": "model", "parts": [{"text": msg['content']}]})
            
            # Add current message
            messages.append({"role": "user", "parts": [{"text": message}]})
            
            data = {
                "contents": messages,
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1000,
                    "topP": 0.8,
                    "topK": 40
                }
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                f"{url}?key={self.google_api_key}",
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if 'candidates' in result and len(result['candidates']) > 0:
                    ai_response = result['candidates'][0]['content']['parts'][0]['text']
                    
                    # Store conversation
                    self._add_message(session_id, 'user', message)
                    self._add_message(session_id, 'assistant', ai_response)
                    
                    return ai_response
                else:
                    return "Sorry, I couldn't generate a response."
            else:
                return f"API Error: {response.status_code} - {response.text}"
                
        except Exception as e:
            return f"Error calling Gemini API: {str(e)}"
    
    def _call_groq_api(self, message: str, session_id: str, hinglish_mode: bool = False) -> str:
        """Call Groq API"""
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            
            # Get conversation history
            history = self._get_or_create_session(session_id)
            
            # Prepare messages
            messages = []
            
            # Add system message for Hinglish mode if enabled
            if hinglish_mode:
                system_message = {
                    "role": "system", 
                    "content": "You are a helpful AI assistant. Please respond in Hinglish (mix of Hindi and English, casual tone, use Roman script for Hindi words). Keep your responses natural and conversational."
                }
                messages.append(system_message)
            
            for msg in history['messages'][-10:]:  # Keep last 10 messages for context
                messages.append({"role": msg['role'], "content": msg['content']})
            
            # Add current message
            messages.append({"role": "user", "content": message})
            
            data = {
                "model": "llama3-8b-8192",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1000
            }
            
            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(url, headers=headers, json=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if 'choices' in result and len(result['choices']) > 0:
                    ai_response = result['choices'][0]['message']['content']
                    
                    # Store conversation
                    self._add_message(session_id, 'user', message)
                    self._add_message(session_id, 'assistant', ai_response)
                    
                    return ai_response
                else:
                    return "Sorry, I couldn't generate a response."
            else:
                return f"API Error: {response.status_code} - {response.text}"
                
        except Exception as e:
            return f"Error calling Groq API: {str(e)}"
    
    def _get_or_create_session(self, session_id: str) -> Dict[str, Any]:
        """Get or create a session for storing conversation memory"""
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                'messages': []
            }
        return self.sessions[session_id]
    
    def _add_message(self, session_id: str, role: str, content: str):
        """Add a message to the session history"""
        session = self._get_or_create_session(session_id)
        session['messages'].append({
            'role': role,
            'content': content,
            'timestamp': str(uuid.uuid4())
        })
    
    def get_chat_history(self, session_id: str) -> List[Dict[str, str]]:
        """Get chat history for a session"""
        if session_id not in self.sessions:
            return []
        return self.sessions[session_id]['messages']
    
    def clear_chat_history(self, session_id: str):
        """Clear chat history for a session"""
        if session_id in self.sessions:
            self.sessions[session_id]['messages'] = []
    
    def get_available_models(self) -> List[str]:
        """Get list of available models"""
        models = []
        if self.google_api_key:
            models.append('gemini')
        if self.groq_api_key:
            models.append('groq')
        return models 