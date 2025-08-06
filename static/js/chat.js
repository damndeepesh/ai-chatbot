class ChatApp {
    constructor() {
        this.chatHistory = [];
        this.activeChatIndex = 0;
        this.isTyping = false;
        this.currentModel = 'gemini';
        this.hinglishMode = false;

        this.initializeElements();
        this.bindEvents();
        this.autoResizeTextarea();
        this.loadChatsFromBackend().then(() => {
            this.renderChatHistory();
            this.renderMessages();
        });
    }

    async loadChatsFromBackend() {
        // Fetch chat list from backend
        const res = await fetch('/api/chats');
        let chats = [];
        try {
            chats = await res.json();
        } catch { chats = []; }
        if (!Array.isArray(chats) || chats.length === 0) {
            // Create first chat if none exist
            const newChat = await this.createNewChat(true);
            chats = [newChat];
        }
        // For each chat, fetch its history
        this.chatHistory = await Promise.all(chats.map(async (chat) => {
            const messages = await this.fetchChatHistory(chat.sessionId);
            return {
                title: chat.title,
                sessionId: chat.sessionId,
                messages: messages || []
            };
        }));
        this.activeChatIndex = 0;
    }

    async fetchChatHistory(sessionId) {
        try {
            const res = await fetch(`/api/chat/history/${sessionId}`);
            if (!res.ok) return [];
            const data = await res.json();
            if (Array.isArray(data.history)) {
                return data.history.map(msg => ({
                    content: msg.content,
                    sender: msg.role === 'assistant' ? 'bot' : 'user',
                    time: msg.timestamp ? window.utils.formatTimestamp(msg.timestamp) : ''
                }));
            }
            return [];
        } catch {
            return [];
        }
    }

    initializeElements() {
        this.messageInput = document.getElementById('messageInput') || document.querySelector('.claude-message-input');
        this.sendButton = document.getElementById('sendButton') || document.querySelector('.claude-send-button');
        this.chatMessages = document.getElementById('chatMessages');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.modelSelect = document.getElementById('modelSelect');
        this.clearChatBtn = document.getElementById('clearChat');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettings');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.sidebar = document.querySelector('.sidebar');
        this.chatHistoryList = document.getElementById('chatHistoryList');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.hinglishToggle = document.getElementById('hinglishToggle');
        this.hinglishLabel = document.getElementById('hinglishLabel');
    }

    bindEvents() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.messageInput.addEventListener('input', () => this.validateInput());
        this.modelSelect.addEventListener('change', (e) => {
            this.currentModel = e.target.value;
            this.showNotification(`Switched to ${e.target.options[e.target.selectedIndex].text}`);
        });
        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettings();
        });
        this.hinglishToggle.addEventListener('click', () => this.toggleHinglishMode());
        document.getElementById('temperature').addEventListener('input', (e) => {
            document.getElementById('temperatureValue').textContent = e.target.value;
        });
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.createNewChat());
        }
        if (this.chatHistoryList) {
            // Delete chat (handle first, stop propagation)
            this.chatHistoryList.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-chat-btn') || e.target.closest('.delete-chat-btn')) {
                    const btn = e.target.closest('.delete-chat-btn');
                    const li = btn.closest('li[data-index]');
                    if (li) {
                        e.stopPropagation();
                        this.deleteChat(parseInt(li.dataset.index));
                    }
                    return;
                }
                // Switch chat (only if not clicking delete)
                const li = e.target.closest('li[data-index]');
                if (li) {
                    this.switchChat(parseInt(li.dataset.index));
                }
            });
            // Rename on double click
            this.chatHistoryList.addEventListener('dblclick', (e) => {
                const li = e.target.closest('li[data-index]');
                if (li && !li.classList.contains('editing')) {
                    this.startRenameChat(li);
                }
            });
        }
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    validateInput() {
        const message = this.messageInput.value.trim();
        this.sendButton.disabled = !message || this.isTyping;
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    get activeChat() {
        return this.chatHistory[this.activeChatIndex];
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        // Add user message to chat memory
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.validateInput();
        this.renderMessages();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            const response = await this.callChatAPI(message);
            this.hideTypingIndicator();
            this.addMessage(response, 'bot');
            this.renderMessages();
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            this.renderMessages();
            console.error('Chat API error:', error);
        }
    }

    async callChatAPI(message) {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                session_id: this.activeChat.sessionId,
                model: this.currentModel,
                hinglish_mode: this.hinglishMode
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    }

    addMessage(content, sender) {
        if (!this.activeChat.messages) this.activeChat.messages = [];
        this.activeChat.messages.push({
            content,
            sender,
            time: this.getCurrentTime()
        });
    }

    renderMessages() {
        if (!this.chatMessages) return;
        this.chatMessages.innerHTML = '';
        // Welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'claude-message bot-message';
        welcomeMessage.innerHTML = `
            <div class="claude-message-avatar"><i class="fas fa-robot"></i></div>
            <div class="claude-message-content">
                <div class="claude-message-text">
                    <p>Hello! I’m your Claude-style AI assistant. Ask me anything or start a new chat from the sidebar.</p>
                </div>
                <div class="claude-message-time">Just now</div>
            </div>
        `;
        this.chatMessages.appendChild(welcomeMessage);
        // Render chat messages
        if (this.activeChat.messages && this.activeChat.messages.length > 0) {
            this.activeChat.messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `claude-message ${msg.sender}-message`;
                const avatar = document.createElement('div');
                avatar.className = 'claude-message-avatar';
                avatar.innerHTML = msg.sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
                const messageContent = document.createElement('div');
                messageContent.className = 'claude-message-content';
                const messageText = document.createElement('div');
                messageText.className = 'claude-message-text';
                messageText.innerHTML = this.formatMessage(msg.content);
                const messageTime = document.createElement('div');
                messageTime.className = 'claude-message-time';
                messageTime.textContent = msg.time;
                messageContent.appendChild(messageText);
                messageContent.appendChild(messageTime);
                messageDiv.appendChild(avatar);
                messageDiv.appendChild(messageContent);
                this.chatMessages.appendChild(messageDiv);
            });
        }
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`{3}([\s\S]*?)`{3}/g, '<pre><code>$1</code></pre>') // code block
            .replace(/`([^`]+)`/g, '<code>$1</code>') // inline code
            .replace(/\n/g, '<br>');
    }

    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    showTypingIndicator() {
        this.isTyping = true;
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
        this.validateInput();
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.typingIndicator.style.display = 'none';
        this.validateInput();
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    async clearChat() {
        if (!confirm('Are you sure you want to clear the chat history?')) {
            return;
        }
        try {
            const response = await fetch(`/api/chat/clear/${this.activeChat.sessionId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                this.activeChat.messages = [];
                this.renderMessages();
                this.showNotification('Chat history cleared successfully');
            } else {
                throw new Error('Failed to clear chat history');
            }
        } catch (error) {
            console.error('Error clearing chat:', error);
            this.showNotification('Failed to clear chat history', 'error');
        }
    }

    openSettings() {
        this.settingsModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeSettings() {
        this.settingsModal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    toggleHinglishMode() {
        this.hinglishMode = !this.hinglishMode;
        
        if (this.hinglishMode) {
            this.hinglishToggle.classList.add('active');
            this.hinglishLabel.textContent = 'Hinglish';
            this.showNotification('Hinglish mode enabled! 🗣️');
        } else {
            this.hinglishToggle.classList.remove('active');
            this.hinglishLabel.textContent = 'Normal';
            this.showNotification('Normal mode enabled! 💬');
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '3000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });
        if (type === 'success') {
            notification.style.background = '#d4a574';
        } else {
            notification.style.background = '#ef4444';
        }
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    // Sidebar logic
    renderChatHistory() {
        if (!this.chatHistoryList) return;
        this.chatHistoryList.innerHTML = '';
        if (this.chatHistory.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No chats yet';
            li.style.color = '#b0b0c3';
            this.chatHistoryList.appendChild(li);
            return;
        }
        this.chatHistory.forEach((chat, idx) => {
            const li = document.createElement('li');
            li.dataset.index = idx;
            li.className = idx === this.activeChatIndex ? 'active' : '';
            // Chat title span
            const titleSpan = document.createElement('span');
            titleSpan.className = 'chat-title';
            titleSpan.textContent = chat.title || `Chat ${idx + 1}`;
            li.appendChild(titleSpan);
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-chat-btn';
            deleteBtn.title = 'Delete chat';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            li.appendChild(deleteBtn);
            this.chatHistoryList.appendChild(li);
        });
    }

    async startRenameChat(li) {
        const idx = parseInt(li.dataset.index);
        const chat = this.chatHistory[idx];
        li.classList.add('editing');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = chat.title;
        input.className = 'rename-chat-input';
        li.innerHTML = '';
        li.appendChild(input);
        input.focus();
        input.select();
        // Save on Enter or blur
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                await this.finishRenameChat(li, input.value, idx);
            }
        });
        input.addEventListener('blur', async () => {
            await this.finishRenameChat(li, input.value, idx);
        });
    }

    async finishRenameChat(li, newTitle, idx) {
        if (newTitle.trim() === '') newTitle = `Chat ${idx + 1}`;
        const chat = this.chatHistory[idx];
        // Update backend
        await fetch(`/api/chats/${chat.sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle })
        });
        chat.title = newTitle;
        this.renderChatHistory();
    }

    async deleteChat(idx) {
        if (this.chatHistory.length === 1) {
            this.showNotification('At least one chat must remain.', 'error');
            return;
        }
        const chat = this.chatHistory[idx];
        await fetch(`/api/chats/${chat.sessionId}`, { method: 'DELETE' });
        this.chatHistory.splice(idx, 1);
        if (this.activeChatIndex >= this.chatHistory.length) {
            this.activeChatIndex = this.chatHistory.length - 1;
        }
        this.renderChatHistory();
        this.renderMessages();
    }

    async createNewChat(isFirst = false) {
        // Create on backend
        const res = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: isFirst ? 'Chat 1' : undefined })
        });
        const chat = await res.json();
        chat.messages = [];
        this.chatHistory.push(chat);
        this.activeChatIndex = this.chatHistory.length - 1;
        this.renderChatHistory();
        this.renderMessages();
        return chat;
    }

    async switchChat(idx) {
        if (idx === this.activeChatIndex) return;
        this.activeChatIndex = idx;
        // Fetch history from backend for this chat
        this.activeChat.messages = await this.fetchChatHistory(this.activeChat.sessionId);
        this.renderChatHistory();
        this.renderMessages();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const chatApp = new ChatApp();
    window.chatApp = chatApp;
    fetch('/api/models')
        .then(response => response.json())
        .then(data => {
            console.log('Available models:', data.models);
        })
        .catch(error => {
            console.error('Error fetching models:', error);
        });
});

window.utils = {
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    },
    downloadText: (text, filename) => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    formatTimestamp: (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }
}; 