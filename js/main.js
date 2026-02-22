// --- 1. ЛЕНДИНГ ЛОГИКА ---
let ticking = false;
window.addEventListener('scroll', () => {
    if(document.body.classList.contains('show-chat')) return;
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            document.getElementById("progress-bar").style.width = (winScroll / height * 100) + "%";

            document.querySelectorAll('.reveal').forEach(r => {
                if(r.getBoundingClientRect().top < window.innerHeight / 1.1) r.classList.add('active');
            });

            let current = "";
            document.querySelectorAll('section').forEach(sec => {
                if(winScroll >= sec.offsetTop - 300) current = sec.getAttribute('id');
            });
            document.querySelectorAll('.nav-dock a.nav-item').forEach(nav => {
                nav.classList.remove('active');
                if(nav.getAttribute('href') === '#' + current) nav.classList.add('active');
            });
            ticking = false;
        });
        ticking = true;
    }
});

window.addEventListener('load', () => {
    document.getElementById('preloader').classList.add('preloader-hide');
    setTimeout(() => window.dispatchEvent(new Event('scroll')), 500);
    setTimeout(() => document.getElementById('toast-notification').classList.add('show'), 3000);
    setTimeout(() => document.getElementById('toast-notification').classList.remove('show'), 8000);
    loadHistory();
});

document.querySelectorAll('.install-copy').forEach(snip => {
    snip.addEventListener('click', () => {
        navigator.clipboard.writeText(snip.innerText);
        const orig = snip.innerText;
        snip.innerHTML = '<i class="fas fa-check"></i> Скопировано';
        snip.style.color = "#4ade80";
        setTimeout(() => { snip.innerText = orig; snip.style.color = ""; }, 1500);
    });
});

// --- 2. AI ЧАТ ЛОГИКА ---
function openChat() { document.body.classList.add('show-chat'); document.getElementById('messageInput').focus(); }
function closeChat() { document.body.classList.remove('show-chat'); }
function setPrompt(text) { document.getElementById('messageInput').value = text; sendMessage(); }
function autoResize(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }

const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const quickPrompts = document.getElementById('quickPrompts');
const personaSelect = document.getElementById('personaSelect');
let chatHistory = []; 

// Знания о боте
const HUPGRAM_PROMPT = `
Ты Senior Python разработчик проекта HupGram. 
Архитектура HupGram:
- Библиотека: Telethon (асинхронная).
- База данных: aiosqlite.
- Шаблон кастомного модуля строго такой:
\`\`\`python
async def handle_cmd(event, client, owner_id, cmd, args, txt):
    if cmd == '.mycmd':
        await event.edit("Работает!")
\`\`\`
Твоя задача: Отвечать компетентно. Код пиши строго в markdown блоках.
`;

// Голосовой ввод
const micBtn = document.getElementById('micBtn');
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.onstart = () => { micBtn.classList.add('recording'); };
    recognition.onresult = (e) => { messageInput.value += (messageInput.value ? ' ' : '') + e.results[0][0].transcript; autoResize(messageInput); };
    recognition.onend = () => { micBtn.classList.remove('recording'); };
}
function toggleVoice() {
    if(!recognition) return alert("Браузер не поддерживает голос.");
    micBtn.classList.contains('recording') ? recognition.stop() : recognition.start();
}

// Память LocalStorage
function saveHistory() { localStorage.setItem('hupgram_chat', JSON.stringify(chatHistory)); }
function loadHistory() {
    const saved = localStorage.getItem('hupgram_chat');
    if (saved) {
        chatHistory = JSON.parse(saved);
        if(chatHistory.length > 0) {
            if(quickPrompts) quickPrompts.style.display = 'none';
            chatArea.innerHTML = '';
            const welcome = document.createElement('div'); welcome.className = 'msg-row'; welcome.id = 'welcomeMsg';
            welcome.innerHTML = `<div class="avatar bot-av"><i class="fas fa-robot"></i></div><div class="bubble">История восстановлена. Продолжим работу?</div>`;
            chatArea.appendChild(welcome);
            
            chatHistory.forEach(msg => {
                if(msg.role === 'user') renderUserMessage(msg.content);
                else renderBotMessage(msg.content);
            });
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    }
}

window.clearChatHistory = function() {
    if(confirm("Очистить историю чата?")) {
        localStorage.removeItem('hupgram_chat');
        chatHistory = [];
        chatArea.innerHTML = `
            <div class="msg-row" id="welcomeMsg">
                <div class="avatar bot-av"><i class="fas fa-check"></i></div>
                <div class="bubble">Память очищена. Я готов к новой задаче!</div>
            </div>
            <div class="quick-prompts" id="quickPrompts">
                <div class="q-prompt" onclick="setPrompt('Напиши кастомный модуль для авто-закрепления сообщений от имени @id')"><i class="fas fa-code"></i> Модуль закрепа</div>
                <div class="q-prompt" onclick="setPrompt('Как работает модуль Stealth (.bomb) в HupGram?')"><i class="fas fa-question-circle"></i> Инфо по Stealth</div>
                <div class="q-prompt" onclick="setPrompt('Напиши код для HupGram: ловить удаленные фото (view_once)')"><i class="fas fa-camera"></i> Код перехвата</div>
            </div>
        `;
    }
};

// Отправка сообщений
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    const qp = document.getElementById('quickPrompts');
    if(qp) qp.style.display = 'none';
    
    renderUserMessage(text);
    chatHistory.push({role: 'user', content: text});
    saveHistory();

    messageInput.value = ''; autoResize(messageInput);
    requestAI();
}

messageInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function renderUserMessage(text) {
    const div = document.createElement('div'); div.className = 'msg-row user';
    div.innerHTML = `<div class="bubble">${text.replace(/\n/g, '<br>')}</div><div class="avatar user-av"><i class="fas fa-user"></i></div>`;
    chatArea.appendChild(div); chatArea.scrollTop = chatArea.scrollHeight;
}

function renderBotMessage(markdownText) {
    const div = document.createElement('div'); div.className = 'msg-row';
    let htmlContent = marked.parse(markdownText);
    div.innerHTML = `<div class="avatar bot-av"><i class="fas fa-robot"></i></div><div class="bubble markdown-body">${htmlContent}</div>`;
    chatArea.appendChild(div);
    
    // Настройка блоков кода и кнопок
    div.querySelectorAll('pre code').forEach((block, index) => {
        hljs.highlightElement(block);
        const pre = block.parentElement;
        
        const header = document.createElement('div'); 
        header.className = 'code-header';
        let lang = "python"; 
        block.classList.forEach(c => { if(c.startsWith('language-')) lang = c.replace('language-', ''); });
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-btn copy-btn';
        copyBtn.innerHTML = '<i class="far fa-copy"></i> Копировать';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(block.innerText).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check" style="color:var(--accent-green)"></i> Успешно';
                setTimeout(() => { copyBtn.innerHTML = '<i class="far fa-copy"></i> Копировать'; }, 2000);
            });
        };

        const dlBtn = document.createElement('button');
        dlBtn.className = 'code-btn download';
        dlBtn.innerHTML = '<i class="fas fa-download"></i> Скачать .py';
        dlBtn.onclick = () => {
            const blob = new Blob([block.innerText], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `hupgram_module_${Date.now()}.py`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
        };

        const actions = document.createElement('div');
        actions.className = 'code-actions';
        actions.appendChild(copyBtn);
        actions.appendChild(dlBtn);

        header.innerHTML = `<span style="text-transform:uppercase; font-weight:bold;">${lang}</span>`;
        header.appendChild(actions);
        
        pre.insertBefore(header, block);
    });
    chatArea.scrollTop = chatArea.scrollHeight;
}

// ЗАПРОС К ИИ (Надежный POST метод)
async function requestAI() {
    const loading = document.createElement('div'); loading.className = 'msg-row'; loading.id = 'ai-loading';
    loading.innerHTML = `<div class="avatar bot-av"><i class="fas fa-circle-notch fa-spin"></i></div><div class="bubble" style="color:#777;"><i>Анализ запроса...</i></div>`;
    chatArea.appendChild(loading); chatArea.scrollTop = chatArea.scrollHeight;

    let style = "";
    if(personaSelect.value === 'hacker') style = "Общайся дерзко, как хакер.";
    if(personaSelect.value === 'coder') style = "Пиши ТОЛЬКО код. Без объяснений.";

    const messages = [{ role: 'system', content: HUPGRAM_PROMPT + "\n" + style }];
    chatHistory.slice(-6).forEach(msg => {
        messages.push({ role: msg.role === 'bot' ? 'assistant' : 'user', content: msg.content });
    });

    try {
        const res = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messages, model: 'openai' })
        });
        
        if(!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const text = await res.text();
        
        document.getElementById('ai-loading').remove();
        chatHistory.push({role: 'bot', content: text}); saveHistory();
        renderBotMessage(text);
    } catch (e) {
        console.error(e);
        if(document.getElementById('ai-loading')) document.getElementById('ai-loading').remove();
        renderBotMessage("❌ **Ошибка соединения.** \nСервер временно недоступен или блокируется защита браузера.");
    }
}
