# AI Chatbot with LangChain & ChromaDB

A beautiful, modern chatbot application built with Flask, LangChain, and ChromaDB. Features conversation memory, multiple AI models (Google Gemini & Groq), and a responsive web interface.

[![Watch the demo](https://img.youtube.com/vi/vXNW52iUxLg/0.jpg)](https://youtu.be/vXNW52iUxLg)

## 🚀 Features

- **Multiple AI Models**: Switch between Google Gemini and Groq LLM
- **Conversation Memory**: Persistent chat history using ChromaDB
- **Beautiful UI**: Modern, responsive design with smooth animations
- **Real-time Chat**: Instant messaging with typing indicators
- **Session Management**: Separate conversation threads
- **Settings Panel**: Customize temperature, max tokens, and memory settings
- **Mobile Responsive**: Works perfectly on all devices

## 🛠️ Tech Stack

- **Backend**: Flask (Python)
- **AI Framework**: LangChain
- **Vector Database**: ChromaDB
- **AI Models**: Google Gemini, Groq LLM
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Styling**: Custom CSS with modern design patterns
- **Icons**: Font Awesome

## 📋 Prerequisites

- Python 3.8 or higher
- Google Gemini API key
- Groq API key (optional)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd beomelo
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env_example.txt .env
   ```
   
   Edit `.env` file and add your API keys:
   ```env
   GOOGLE_API_KEY=your_google_gemini_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   FLASK_SECRET_KEY=your_secret_key_here
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 🔑 Getting API Keys

### Google Gemini API
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

### Groq API
1. Go to [Groq Console](https://console.groq.com/)
2. Create an account and get your API key
3. Copy the key to your `.env` file

## 📁 Project Structure

```
beomelo/
├── app.py                 # Main Flask application
├── chatbot.py            # Chatbot manager with LangChain integration
├── requirements.txt      # Python dependencies
├── env_example.txt       # Environment variables template
├── README.md            # This file
├── templates/
│   └── index.html       # Main chat interface
└── static/
    ├── css/
    │   └── style.css    # Beautiful styling
    └── js/
        └── chat.js      # Frontend functionality
```

## 🎯 Usage

1. **Start a Conversation**: Type your message and press Enter or click the send button
2. **Switch Models**: Use the dropdown in the header to switch between Gemini and Groq
3. **Clear Chat**: Click the trash icon to clear conversation history
4. **Settings**: Click the gear icon to adjust model parameters
5. **Mobile**: The interface is fully responsive and works on mobile devices

## 🔧 Configuration

### Model Settings
- **Temperature**: Controls randomness (0.0 = deterministic, 1.0 = very random)
- **Max Tokens**: Maximum length of AI responses
- **Memory**: Enable/disable conversation memory

### Environment Variables
- `GOOGLE_API_KEY`: Your Google Gemini API key
- `GROQ_API_KEY`: Your Groq API key
- `FLASK_SECRET_KEY`: Secret key for Flask sessions
- `CHROMA_PERSIST_DIRECTORY`: Directory for ChromaDB storage
- `DEFAULT_MODEL`: Default AI model to use

## 🎨 Customization

### Styling
The application uses modern CSS with:
- Gradient backgrounds
- Smooth animations
- Glassmorphism effects
- Responsive design

### Adding New Models
To add a new AI model:

1. Update `chatbot.py` to include the new model initialization
2. Add the model to the models list in `app.py`
3. Update the frontend dropdown in `templates/index.html`

## 🐛 Troubleshooting

### Common Issues

1. **API Key Errors**
   - Ensure your API keys are correctly set in the `.env` file
   - Check that the keys have proper permissions

2. **ChromaDB Issues**
   - Delete the `chroma_db` directory to reset the database
   - Ensure write permissions in the project directory

3. **Model Loading Errors**
   - Check your internet connection
   - Verify API quotas and limits
   - Check the console for detailed error messages

### Debug Mode
Run the application in debug mode for detailed error messages:
```bash
export FLASK_ENV=development
python app.py
```

## 📈 Performance

- **Response Time**: Typically 1-3 seconds depending on model and message length
- **Memory Usage**: ChromaDB stores conversation embeddings efficiently
- **Scalability**: Can handle multiple concurrent users

## 🔒 Security

- API keys are stored in environment variables
- No sensitive data is logged
- CORS is enabled for development
- Input validation on both frontend and backend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- [LangChain](https://langchain.com/) for the AI framework
- [ChromaDB](https://www.trychroma.com/) for vector storage
- [Google Gemini](https://ai.google.dev/) for AI capabilities
- [Groq](https://groq.com/) for fast inference

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section
2. Review the console logs
3. Open an issue on GitHub

---

**Happy Chatting! 🤖✨** 
