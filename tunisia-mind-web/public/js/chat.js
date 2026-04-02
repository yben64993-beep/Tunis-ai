// ========== chat.js - النسخة النهائية المستقرة والاحترافية 💎 ==========

const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendMessageBtn');
const messagesWrapper = document.getElementById('messagesWrapper');
const welcomeScreen = document.getElementById('welcomeScreen');
const chatContainer = document.getElementById('chatContainer');

let isProcessing = false;
let attachedImage = null;
let attachedFileContent = null;
let attachedFileName = null;
let userInsights = JSON.parse(localStorage.getItem('tm-insights') || '{"msgTotal":0, "topics":{}}');
window.isSearchMode = false;

const API_BASE_URL = window.location.origin;

// ========== الدوال المساعدة ==========

function hideWelcome() {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
}

function scrollToBottom() {
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatMarkdown(text) {
    if (!text) return "";
    return text
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/```(html|js|css|javascript|code)?([\s\S]*?)```/gi, (match, lang, code) => {
            const cleanLang = (lang || '').toLowerCase();
            return `<div class="code-block-wrap"><pre><code class="language-${cleanLang}">${code.trim()}</code></pre></div>`;
        });
}

function applyPlugins(container) {
    if (typeof renderMathInElement === 'function') {
        renderMathInElement(container, {
            delimiters: [{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],
            throwOnError: false
        });
    }
    if (typeof hljs !== 'undefined') {
        container.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    }
}

// ========== نظام الرسائل ==========

function appendMessage(content, sender, isHtml = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = `msg-avatar ${sender === 'ai' ? 'ai-avatar' : 'user-avatar'}`;
    if (sender === 'ai') {
        avatarDiv.innerHTML = '<img src="assets/tunisia-brain-new.jpg" alt="AI" style="width:100%;height:100%;object-fit:cover;">';
    } else {
        avatarDiv.innerHTML = '<i class="fa-solid fa-user"></i>';
    }

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'msg-body';
    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';
    contentDiv.setAttribute('dir', 'auto');

    if (isHtml) contentDiv.innerHTML = content;
    else contentDiv.innerHTML = formatMarkdown(content);

    bodyDiv.appendChild(contentDiv);
    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(bodyDiv);
    messagesWrapper.appendChild(msgDiv);
    
    applyPlugins(contentDiv);
    scrollToBottom();
    return msgDiv;
}

function appendTypingIndicator() {
    const id = 'typing-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = 'message ai';
    msgDiv.innerHTML = `
        <div class="msg-avatar ai-avatar"><img src="assets/tunisia-brain-new.jpg" style="width:100%;height:100%;object-fit:cover;"></div>
        <div class="msg-body"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
    `;
    messagesWrapper.appendChild(msgDiv);
    scrollToBottom();
    return id;
}

async function handleSend() {
    if (isProcessing) return;
    
    const text = messageInput.value.trim();
    if (!text && !attachedFileContent && !attachedImage) return;

    if (text.toLowerCase().includes('أصنع لي مشروع') || text.toLowerCase().includes('بناء مشروع')) {
        const lines = text.split('\n');
        const projName = lines[0].replace(/أصنع لي مشروع|بناء مشروع/g, '').trim() || "تطبيق جديد";
        window.startProjectGeneration(projName, "web", text);
        appendMessage('🚀 حاضر! سأبدأ الآن ببناء مشروعك في مساحة العمل المجاورة.', 'ai');
        messageInput.value = '';
        return;
    }

    if (/^(ارسم|تخيل|صورة|صنع صورة|توليد صورة)\b/.test(text.trim())) {
        isProcessing = true;
        sendBtn.disabled = true; messageInput.disabled = true; sendBtn.classList.add('loading');
        messageInput.value = ''; messageInput.style.height = 'auto'; hideWelcome();
        appendMessage(text, 'user');
        const indicatorId = appendTypingIndicator();
        try {
            const promptContent = text.replace(/^(ارسم|تخيل|صورة|صنع صورة|توليد صورة)/g, '').trim() || text;
            const res = await fetch(`${API_BASE_URL}/api/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptContent })
            });
            const data = await res.json();
            document.getElementById(indicatorId)?.remove();
            if (data.imageUrl) {
                appendMessage(`إليك الصورة التي طلبتها 🎨:<br><img src="${data.imageUrl}" style="max-width:100%; border-radius:10px; margin-top:10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);" alt="صورة مولدة بواسطة الذكاء الاصطناعي">`, 'ai');
            } else {
                appendMessage(`❌ خطأ: ${data.error || 'فشل توليد الصورة'}`, 'ai');
            }
        } catch (e) {
            document.getElementById(indicatorId)?.remove();
            appendMessage(`❌ تعذر الاتصال بخادم توليد الصور.`, 'ai');
        }
        isProcessing = false;
        sendBtn.disabled = false; messageInput.disabled = false; sendBtn.classList.remove('loading');
        return;
    }

    if (/^(تصدير|حمل|نزل|تحميل) (المحادثة|الدردشة)\b/.test(text.trim()) || text.toLowerCase().includes('export chat')) {
        isProcessing = true;
        sendBtn.disabled = true; messageInput.disabled = true; sendBtn.classList.add('loading');
        messageInput.value = ''; messageInput.style.height = 'auto'; hideWelcome();
        appendMessage(text, 'user');
        
        if (window.currentChatId && window.exportChatFromMenu) {
            appendMessage('حاضر! قمت بتصدير المحادثة الحالية لك بصيغة ملف نصي وسيبدأ التحميل الآن 📥.', 'ai');
            window.exportChatFromMenu(window.currentChatId);
        } else {
            appendMessage('لا توجد محادثة محفوظة حتى الآن لتصديرها. من فضلك اكتب بعض الرسائل أولاً حتى يتم حفظ المحادثة.', 'ai');
        }
        
        isProcessing = false;
        sendBtn.disabled = false; messageInput.disabled = false; sendBtn.classList.remove('loading');
        return;
    }

    isProcessing = true;
    sendBtn.disabled = true;
    messageInput.disabled = true;
    sendBtn.classList.add('loading');
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
    hideWelcome();

    if (attachedFileContent) {
        appendMessage(`<div class="file-tag"><i class="fa-solid fa-file-code"></i> ${attachedFileName}</div>${text}`, 'user', true);
    } else if (attachedImage) {
        appendMessage(`<div class="img-preview-msg"><img src="${attachedImage}"></div>${text}`, 'user', true);
    } else {
        appendMessage(text, 'user');
    }

    const mainIndicatorId = appendTypingIndicator();
    let fullAiResponse = "";

    try {
        const history = Array.from(document.querySelectorAll('#messagesWrapper .message:not([id^="typing-"])')).slice(-10).map(msg => ({
            role: msg.classList.contains('user') ? 'user' : 'assistant',
            content: msg.querySelector('.msg-content')?.innerText || ''
        }));

        const finalPrompt = attachedFileContent 
            ? `${text}\n\n[محتوى المستند لتحليله]:\n${attachedFileContent}`
            : text;

        const personaEl = document.getElementById('personaSelector');
        const activePersona = personaEl ? personaEl.value : 'العقل التونسي';

        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: finalPrompt, history: history, stream: true, persona: activePersona })
        });

        const indicator = document.getElementById(mainIndicatorId);
        if (indicator) indicator.remove();

        const aiMsgDiv = appendMessage("", 'ai');
        const aiContentDiv = aiMsgDiv.querySelector('.msg-content');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataLine = line.slice(6).trim();
                    if (dataLine === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(dataLine);
                        if (parsed.content) {
                            fullAiResponse += parsed.content;
                            aiContentDiv.innerHTML = formatMarkdown(fullAiResponse);
                            scrollToBottom();
                        }
                    } catch (e) {}
                }
            }
        }
        applyPlugins(aiContentDiv);
        
        // Hints
        const suggestMatch = fullAiResponse.match(/\[\[S:(.*?)\]\]/);
        if (suggestMatch) {
            renderSuggestions(suggestMatch[1].split('|').map(s => s.trim()));
            aiContentDiv.innerHTML = aiContentDiv.innerHTML.replace(/\[\[S:.*?\]\]/g, '');
        }

    } catch (error) {
        console.error('Chat Error:', error);
        appendMessage('⚠️ خطأ في الاتصال.', 'ai');
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        messageInput.disabled = false;
        sendBtn.classList.remove('loading');
        messageInput.focus();
        attachedFileContent = null; attachedImage = null;
        const preview = document.getElementById('imagePreviewContainer');
        if (preview) preview.style.display = 'none';
    }
}

function renderSuggestions(suggestions) {
    let container = document.getElementById('suggestionsBoxAlpha');
    if (!container) {
        container = document.createElement('div');
        container.id = 'suggestionsBoxAlpha';
        container.className = 'suggestions-container';
        messagesWrapper.appendChild(container);
    }
    container.innerHTML = '';
    suggestions.forEach(s => {
        const chip = document.createElement('button');
        chip.className = 'suggestion-chip';
        chip.textContent = s;
        chip.onclick = () => { messageInput.value = s; handleSend(); };
        container.appendChild(chip);
    });
}

function initChat() {
    if (sendBtn) sendBtn.onclick = handleSend;
    if (messageInput) {
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
        };
    }
    const attach = document.getElementById('attachBtnAlpha');
    const fileIn = document.getElementById('fileInputAlpha');
    if (attach) attach.onclick = () => fileIn?.click();
    if (fileIn) {
        fileIn.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            attachedFileName = file.name;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (file.type.startsWith('image/')) attachedImage = ev.target.result;
                else attachedFileContent = ev.target.result;
                const preview = document.getElementById('imagePreviewContainer');
                if (preview) preview.style.display = 'flex';
                const img = document.getElementById('imagePreviewImg');
                if (img) img.src = file.type.startsWith('image/') ? ev.target.result : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24"><path fill="gray" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
            };
            if (file.type.startsWith('image/')) reader.readAsDataURL(file);
            else reader.readAsText(file);
        };
    }
    
    // Dynamic Suggestions Setup
    const allSuggestions = [
        { prompt: "اشرح مفهوماً معقداً بشكل مبسط وجذاب", label: "اشرح مفهوماً معقداً ببساطة", icon: "fa-lightbulb" },
        { prompt: "ساعدني في تعلم شيء جديد اليوم", label: "ساعدني في تعلم شيء جديد", icon: "fa-graduation-cap" },
        { prompt: "أعطني 5 أفكار إبداعية لمشروع أو نشاط جديد", label: "أعطني أفكاراً إبداعية", icon: "fa-wand-magic-sparkles" },
        { prompt: "أجب على سؤال في المعلومات العامة (علوم، تاريخ، أو جغرافيا)", label: "أجب على سؤال معلومات عامة", icon: "fa-earth-africa" },
        { prompt: "اكتب لي قصة قصيرة مشوقة", label: "تأليف قصة مشوقة", icon: "fa-book" },
        { prompt: "قم بمراجعة الكود البرمجي الخاص بي وابحث عن الأخطاء", label: "مراجعة وفحص الأكواد", icon: "fa-code" },
        { prompt: "أعطني نصائح لتحسين إنتاجيتي وتنظيم وقتي", label: "نصائح لزيادة الإنتاجية", icon: "fa-clock" },
        { prompt: "اكتب لي رسالة بريد إلكتروني احترافية لطلب وظيفة", label: "كتابة إيميل رسمي", icon: "fa-envelope" }
    ];
    
    const sugGrid = document.querySelector('.suggestions-grid');
    if (sugGrid) {
        // Pick 4 random
        const shuffled = allSuggestions.sort(() => 0.5 - Math.random()).slice(0, 4);
        sugGrid.innerHTML = '';
        shuffled.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-card';
            btn.setAttribute('data-prompt', s.prompt);
            btn.innerHTML = `<i class="fa-solid ${s.icon}"></i> <span>${s.label}</span>`;
            btn.onclick = () => {
                messageInput.value = s.prompt;
                handleSend();
            };
            sugGrid.appendChild(btn);
        });
    }
}

document.addEventListener('DOMContentLoaded', initChat);
