window.onload = function() {
    // --- DOM Elements ---
    const chatBox = document.getElementById('chat-box');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const modelSelect = document.getElementById('model-select');
    const themeToggle = document.getElementById('theme-toggle');
    const clearHistory = document.getElementById('clear-history');
    const systemPrompt = document.getElementById('system-prompt');
    const stopGeneratingBtn = document.getElementById('stop-generating');

    // --- API Configuration ---
    const API_BASE_URL = '/api';

    // --- State ---
    let currentModel = '';
    let abortController = new AbortController();

    // --- Initialization ---
    async function initialize() {
        await fetchModels();
        loadChatHistory();
        loadTheme();
        setupEventListeners();
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        chatForm.addEventListener('submit', handleChatSubmit);
        modelSelect.addEventListener('change', () => {
            currentModel = modelSelect.value;
            localStorage.setItem('selectedModel', currentModel);
        });
        themeToggle.addEventListener('click', toggleTheme);
        clearHistory.addEventListener('click', () => {
            chatBox.innerHTML = '';
            localStorage.removeItem('chatHistory');
        });
        stopGeneratingBtn.addEventListener('click', () => {
            abortController.abort();
        });
    }

    // --- Model Management ---
    async function fetchModels() {
        try {
            const response = await fetch(`${API_BASE_URL}/tags`);
            if (!response.ok) throw new Error(`Failed to fetch models: ${response.statusText}`);
            const data = await response.json();
            
            modelSelect.innerHTML = '';
            const savedModel = localStorage.getItem('selectedModel');
            
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name;
                modelSelect.appendChild(option);
            });

            currentModel = savedModel || (data.models.length > 0 ? data.models[0].name : '');
            if (currentModel) {
                modelSelect.value = currentModel;
            }

        } catch (error) {
            console.error('Error fetching models:', error);
            addMessage('ai', `Error: Could not fetch models. Details: ${error.message}`);
        }
    }

    // --- Chat Submission ---
    async function handleChatSubmit(e) {
        e.preventDefault();
        const userMessage = userInput.value.trim();
        if (!userMessage || chatForm.querySelector('button[type="submit"]').disabled) return;

        addMessage('user', userMessage);
        userInput.value = '';
        saveChatHistory(); 
        
        setGeneratingState(true);
        abortController = new AbortController();

        const aiMessageElement = addMessage('ai', '', true); // Add a placeholder with typing indicator
        let aiMessageContent = '';
        const messageContentDiv = aiMessageElement.querySelector('.message-content');
        messageContentDiv.innerHTML = ''; // Clear typing indicator

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortController.signal,
                body: JSON.stringify({
                    model: currentModel,
                    messages: getChatHistoryForApi(),
                    stream: true
                }),
            });

            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line) continue;
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message && parsed.message.content) {
                            aiMessageContent += parsed.message.content;
                            messageContentDiv.textContent = aiMessageContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                            chatBox.scrollTop = chatBox.scrollHeight;
                        }
                    } catch (jsonError) {
                        // Ignore non-JSON chunks
                    }
                }
            }
            
            const finalContent = aiMessageContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            messageContentDiv.textContent = finalContent;

            saveChatHistory();

        } catch (error) {
            if (error.name === 'AbortError') {
                const contentDiv = aiMessageElement.querySelector('.message-content');
                contentDiv.textContent = (contentDiv.textContent || '') + "\n\n[Generation stopped]";
            } else {
                console.error('Error during chat:', error);
                const errorElement = aiMessageElement.querySelector('.message-content') || aiMessageElement;
                errorElement.innerHTML = `An unexpected error occurred. <br><br><strong>Details:</strong> ${error.message}`;
            }
        } finally {
            setGeneratingState(false);
            saveChatHistory(); 
        }
    }

    // --- UI State & Helpers ---
    function setGeneratingState(isGenerating) {
        stopGeneratingBtn.style.display = isGenerating ? 'block' : 'none';
        chatForm.querySelector('button[type="submit"]').disabled = isGenerating;
    }

    // Removed addCopyButton function

    // --- Message & History Management ---
    function addMessage(sender, text, isLoading = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        if (isLoading) {
            contentDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        } else {
            contentDiv.textContent = text; // Display raw text
        }
        
        messageElement.appendChild(contentDiv);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement;
    }

    function saveChatHistory() {
        const messages = Array.from(chatBox.children).map(el => ({
            sender: el.classList.contains('user-message') ? 'user' : 'ai',
            textContent: el.querySelector('.message-content').textContent
        }));
        localStorage.setItem('chatHistory', JSON.stringify(messages));
    }

    function loadChatHistory() {
        let history = [];
        try {
            const storedHistory = localStorage.getItem('chatHistory');
            if (storedHistory) {
                history = JSON.parse(storedHistory);
            }
        } catch (e) {
            console.error("Failed to parse chat history, clearing it.", e);
            localStorage.removeItem('chatHistory');
        }

        history.forEach(msg => {
            if (!msg.textContent) return;
            addMessage(msg.sender, msg.textContent);
        });
    }

    function getChatHistoryForApi() {
        const messages = [];
        const systemInstruction = systemPrompt.value.trim();
        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }

        let history = [];
        try {
            const storedHistory = localStorage.getItem('chatHistory');
            if (storedHistory) {
                history = JSON.parse(storedHistory);
            }
        } catch (e) {
            console.error("Failed to parse chat history for API, using empty history.", e);
        }

        history.forEach(msg => {
            if (msg.textContent && msg.textContent.trim()) {
                 messages.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.textContent
                });
            }
        });
        return messages;
    }

    // --- Theme Management ---
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // --- Start the App ---
    initialize();
};