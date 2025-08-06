import os
import sqlite3
from flask import Flask, request, jsonify, render_template, g
from flask_cors import CORS
from dotenv import load_dotenv
from simple_chatbot import SimpleChatbotManager
import uuid
import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

DATABASE = os.path.join(os.path.dirname(__file__), 'chats.db')

# --- SQLite helpers ---
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

def init_db():
    with app.app_context():
        db = get_db()
        db.execute('''CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            created_at TEXT,
            updated_at TEXT
        )''')
        db.commit()

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

# --- Chat metadata API ---
@app.route('/api/chats', methods=['GET'])
def list_chats():
    db = get_db()
    chats = db.execute('SELECT session_id, title FROM chats ORDER BY created_at ASC').fetchall()
    return jsonify([{'sessionId': row['session_id'], 'title': row['title']} for row in chats])

@app.route('/api/chats', methods=['POST'])
def create_chat():
    db = get_db()
    session_id = request.json.get('sessionId') or str(uuid.uuid4())
    title = request.json.get('title') or f"Chat {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}"
    now = datetime.datetime.utcnow().isoformat()
    db.execute('INSERT INTO chats (session_id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
               (session_id, title, now, now))
    db.commit()
    return jsonify({'sessionId': session_id, 'title': title})

@app.route('/api/chats/<session_id>', methods=['PATCH'])
def rename_chat(session_id):
    db = get_db()
    title = request.json.get('title')
    now = datetime.datetime.utcnow().isoformat()
    db.execute('UPDATE chats SET title=?, updated_at=? WHERE session_id=?', (title, now, session_id))
    db.commit()
    return jsonify({'sessionId': session_id, 'title': title})

@app.route('/api/chats/<session_id>', methods=['DELETE'])
def delete_chat(session_id):
    db = get_db()
    db.execute('DELETE FROM chats WHERE session_id=?', (session_id,))
    db.commit()
    return jsonify({'deleted': True})

# --- Existing chatbot logic ---
chatbot_manager = SimpleChatbotManager()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        message = data.get('message', '')
        session_id = data.get('session_id', str(uuid.uuid4()))
        model = data.get('model', 'gemini')
        hinglish_mode = data.get('hinglish_mode', False)
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        response = chatbot_manager.get_response(message, session_id, model, hinglish_mode)
        return jsonify({
            'response': response,
            'session_id': session_id,
            'model': model,
            'hinglish_mode': hinglish_mode
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models', methods=['GET'])
def get_models():
    return jsonify({
        'models': [
            {'id': 'gemini', 'name': 'Google Gemini', 'description': 'Google\'s latest AI model'},
            {'id': 'groq', 'name': 'Groq LLM', 'description': 'Fast inference with Groq'}
        ]
    })

@app.route('/api/chat/history/<session_id>', methods=['GET'])
def get_chat_history(session_id):
    try:
        history = chatbot_manager.get_chat_history(session_id)
        return jsonify({'history': history})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/clear/<session_id>', methods=['DELETE'])
def clear_chat_history(session_id):
    try:
        chatbot_manager.clear_chat_history(session_id)
        return jsonify({'message': 'Chat history cleared successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5001) 