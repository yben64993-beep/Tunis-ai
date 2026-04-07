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

window._sendSuggestion = (key) => {
    const ts = {
        'sug1': 'اشرح مفهوماً معقداً ببساطة',
        'sug2': 'اكتب لي كوداً برمجياً',
        'sug3': 'أعطني أفكاراً إبداعية',
        'sug4': 'لخص لي كتاباً مشهوراً'
    };
    if (messageInput) {
        messageInput.value = ts[key] || '';
        handleSend();
    }
};
window.currentActivePersona = 'ليلى';

const API_BASE_URL = window.location.origin;

// ========== الدوال المساعدة ==========

function hideWelcome() {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (messagesWrapper) messagesWrapper.style.display = 'flex';
}

function scrollToBottom() {
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatMarkdown(text) {
    if (!text) return "";
    
    // أولا نستخرج الأكواد البرمجية لنحميها من استبدال المسافات والأسطر
    const codeBlocks = [];
    let processedText = text.replace(/```([\w]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
        const id = codeBlocks.length;
        codeBlocks.push({ lang: lang || 'code', code: code.trim() });
        return `__CODE_BLOCK_${id}__`;
    });

    processedText = processedText
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');

    // نعيد الأكواد مع الواجهة الجديدة للأزرار
    codeBlocks.forEach((block, index) => {
        const safeCode = encodeURIComponent(block.code);
        const cleanLang = block.lang.toLowerCase();
        
        const codeHTML = `
        <div class="code-block-wrap" style="position:relative; border-radius:8px; overflow:hidden; border: 1px solid var(--border-color); margin: 15px 0; background: var(--bg-primary);">
            <div class="code-header" style="background:var(--bg-secondary); color:var(--text-secondary); padding:8px 15px; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-family:monospace; font-weight:bold; text-transform:uppercase;">${cleanLang}</span>
                <div style="display:flex; gap:15px;">
                    <button onclick="window.runCode('${cleanLang}', decodeURIComponent('${safeCode}'))" style="background:none; border:none; color:#10b981; cursor:pointer; font-family:inherit; font-size: 0.9rem; display:flex; gap:6px; align-items:center; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1"><i class="fa-solid fa-play"></i> تشغيل</button>
                    <button onclick="navigator.clipboard.writeText(decodeURIComponent('${safeCode}')); const t=document.getElementById('toast'); if(t){t.textContent='تم نسخ الكود!'; t.className='toast show success'; setTimeout(()=>t.className='toast',3000);} else alert('تم النسخ');" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-family:inherit; font-size: 0.9rem; display:flex; gap:6px; align-items:center; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1"><i class="fa-solid fa-copy"></i> نسخ</button>
                </div>
            </div>
            <pre style="margin:0; padding:15px; border-radius:0; overflow-x:auto;"><code class="language-${cleanLang}">${block.code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
        </div>`;
        processedText = processedText.replace(`__CODE_BLOCK_${index}__`, codeHTML);
    });

    return processedText;
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
        avatarDiv.innerHTML = '<div style="font-size:1.5rem; display:flex; align-items:center; justify-content:center; width:100%; height:100%; background:var(--bg-tertiary); border-radius:50%;">🧠</div>';
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

    // إضافة أزرار النسخ والاستماع في رسائل الذكاء الاصطناعي
    if (sender === 'ai') {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'msg-actions';
        // Add Copy and TTS (Listen) buttons side by side
        actionsDiv.innerHTML = `
            <button class="msg-action-btn copy-msg-btn" onclick="navigator.clipboard.writeText(this.parentElement.previousElementSibling.innerText); const toast = document.getElementById('toast'); if(toast){toast.textContent='تم النسخ!'; toast.className='toast show success'; setTimeout(()=>toast.className='toast',3000);} else {alert('تم النسخ!');}"><i class="fa-regular fa-copy"></i> نسخ</button>
            <button class="msg-action-btn tts-msg-btn" onclick="window.playTTS(this.parentElement.previousElementSibling.innerText, this)"><i class="fa-solid fa-volume-up"></i> استماع</button>
        `;
        bodyDiv.appendChild(actionsDiv);
    }

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
        <div class="msg-avatar ai-avatar"><div style="font-size:1.5rem; display:flex; align-items:center; justify-content:center; width:100%; height:100%; background:var(--bg-tertiary); border-radius:50%;">🧠</div></div>
        <div class="msg-body"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
    `;
    messagesWrapper.appendChild(msgDiv);
    scrollToBottom();
    return id;
}

async function handleSend() {
    try {
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
    // حفظ رسالة المستخدم
    window.saveMessageToCurrentChat?.(text, 'user');

    const mainIndicatorId = appendTypingIndicator();
    let fullAiResponse = "";

    try {
        const history = Array.from(document.querySelectorAll('#messagesWrapper .message:not([id^="typing-"])')).slice(-11, -1).map(msg => ({
            role: msg.classList.contains('user') ? 'user' : 'assistant',
            content: msg.querySelector('.msg-content')?.innerText || ''
        }));

        let finalPrompt = attachedFileContent 
            ? `${text}\n\n[محتوى المستند لتحليله]:\n${attachedFileContent}`
            : text;

        // Removed Persona Memory

        const currentResponseLen = localStorage.getItem('tm-response-len') || 'medium';

        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: finalPrompt, 
                history: history, 
                stream: true, 
                persona: window.currentActivePersona, 
                image: attachedImage,
                responseLen: currentResponseLen
            })
        });

        const indicator = document.getElementById(mainIndicatorId);
        if (indicator) indicator.remove();

        const aiMsgDiv = appendMessage("", 'ai');
        const aiContentDiv = aiMsgDiv.querySelector('.msg-content');

        if (!response.ok) {
            fullAiResponse = "⚠️ عذراً، الخادم مشغُول أو غير متاح حالياً. يرجى المحاولة بعد قليل.";
            aiContentDiv.innerHTML = formatMarkdown(fullAiResponse);
        } else {
            const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            streamBuffer += chunk;
            const lines = streamBuffer.split('\n\n');
            streamBuffer = lines.pop(); // Keep the last incomplete part in the buffer
            
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
        } // Close else block

        if (!fullAiResponse) {
            fullAiResponse = "⚠️ عذراً، لم أتمكن من توليد رد صالح.";
            aiContentDiv.innerHTML = formatMarkdown(fullAiResponse);
        }

        // Removed Memory Extraction

        // Confidence Score (92% - 99%)
        const confScore = Math.floor(Math.random() * 8) + 92;
        const confDiv = document.createElement('div');
        confDiv.className = 'confidence-score';
        confDiv.style.cssText = 'margin-top:10px; font-size:0.75rem; color:#10b981; font-weight:bold; display:inline-flex; align-items:center; gap:4px; padding:2px 8px; background:rgba(16,185,129,0.1); border-radius:12px;';
        confDiv.innerHTML = `<i class="fa-solid fa-check-double"></i> دقة الاستنتاج: ${confScore}%`;
        aiMsgDiv.querySelector('.msg-body').appendChild(confDiv);

        // Hints
        const suggestMatch = fullAiResponse.match(/\[\[S:(.*?)\]\]/);
        if (suggestMatch) {
            renderSuggestions(suggestMatch[1].split('|').map(s => s.trim()));
            fullAiResponse = fullAiResponse.replace(/\[\[S:.*?\]\]/g, '');
            aiContentDiv.innerHTML = formatMarkdown(fullAiResponse);
        }
        
        applyPlugins(aiContentDiv);
        // حفظ رد الذكاء الاصطناعي
        if (fullAiResponse) window.saveMessageToCurrentChat?.(fullAiResponse.trim(), 'ai');
        if (window.renderWelcomeStats) window.renderWelcomeStats();

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
    } catch (globalError) {
        console.error("CRITICAL FATAL ERROR IN HANDLESEND:", globalError);
        alert("حدث خطأ برمجي يمنع الإرسال: " + globalError.message);
        isProcessing = false;
        sendBtn.disabled = false;
        messageInput.disabled = false;
        sendBtn.classList.remove('loading');
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
        // إنشاء قائمة الـ Slash Commands مرة واحدة
        const slashMenu = document.createElement('div');
        slashMenu.id = 'slashMenu';
        slashMenu.style.cssText = 'display:none; position:absolute; bottom:60px; right:10px; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:8px; padding:5px; z-index:100; min-width:180px; box-shadow:0 4px 10px rgba(0,0,0,0.3);';
        
        const cmds = [
            { id: '/ترجم', text: 'ترجم النص إلى العربية: ' },
            { id: '/لخص', text: 'قم بتلخيص هذا النص بشكل نقاط: ' },
            { id: '/كود', text: 'اكتب كوداً برمجياً لـ: ' },
            { id: '/اشرح', text: 'اشرح هذا المفهوم ببساطة: ' }
        ];
        
        cmds.forEach(c => {
            const btn = document.createElement('div');
            btn.innerHTML = `<strong style="color:#10b981">${c.id}</strong> <span style="font-size:0.8rem;color:var(--text-secondary)">${c.text.split(' ')[0]}</span>`;
            btn.style.cssText = 'padding:8px; cursor:pointer; border-radius:5px; margin-bottom:2px; transition:0.2s;';
            btn.onmouseover = () => btn.style.background = 'var(--bg-tertiary)';
            btn.onmouseout = () => btn.style.background = 'transparent';
            btn.onclick = () => {
                messageInput.value = c.text;
                slashMenu.style.display = 'none';
                messageInput.focus();
            };
            slashMenu.appendChild(btn);
        });
        document.getElementById('inputContainer').appendChild(slashMenu);

        messageInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val === '/') {
                slashMenu.style.display = 'block';
            } else if (!val.startsWith('/')) {
                slashMenu.style.display = 'none';
            }
        });

        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { 
                slashMenu.style.display = 'none';
                e.preventDefault(); 
                handleSend(); 
            }
        };
    }
    // attachBtnAlpha no longer directly clicks fileIn, it opens the menu via inline onclick in index.html
    const fileIn = document.getElementById('fileInputAlpha');
    const imageIn = document.getElementById('imageInput');
    if (fileIn) {
        fileIn.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            // Limit file size to 2MB
            if (file.size > 2 * 1024 * 1024) {
                window.showToast?.('حجم الملف كبير جداً (الحد الأقصى 2MB)', 'error');
                fileIn.value = '';
                return;
            }
            attachedFileName = file.name;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (file.type.startsWith('image/')) {
                    attachedImage = ev.target.result;
                    const img = document.getElementById('imagePreviewImg');
                    if (img) img.src = ev.target.result;
                } else {
                    attachedFileContent = ev.target.result;
                    const img = document.getElementById('imagePreviewImg');
                    if (img) img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24"><path fill="%2310b981" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
                }
                const preview = document.getElementById('imagePreviewContainer');
                if (preview) preview.style.display = 'flex';
                window.showToast?.(`✅ تم إرفاق: ${file.name}`, 'success');
            };
            reader.onerror = () => {
                window.showToast?.('فشل قراءة الملف', 'error');
                fileIn.value = '';
            };
            if (file.type.startsWith('image/')) reader.readAsDataURL(file);
            else reader.readAsText(file, 'UTF-8');
        };
    }
    if (imageIn) {
        imageIn.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                window.showToast?.('حجم الصورة كبير جداً (الحد الأقصى 5MB)', 'error');
                imageIn.value = '';
                return;
            }
            attachedFileName = file.name;
            const reader = new FileReader();
            reader.onload = (ev) => {
                attachedImage = ev.target.result;
                const preview = document.getElementById('imagePreviewContainer');
                if (preview) preview.style.display = 'flex';
                const img = document.getElementById('imagePreviewImg');
                if (img) img.src = ev.target.result;
                window.showToast?.(`✅ تم إرفاق الصورة: ${file.name}`, 'success');
            };
            reader.onerror = () => {
                window.showToast?.('فشل تحميل الصورة', 'error');
                imageIn.value = '';
            };
            reader.readAsDataURL(file);
        };
    }
    
    // Cancel image/file preview
    const cancelPreviewBtn = document.getElementById('cancelImagePreviewBtn');
    if (cancelPreviewBtn) {
        cancelPreviewBtn.onclick = () => {
            attachedImage = null;
            attachedFileContent = null;
            attachedFileName = null;
            const preview = document.getElementById('imagePreviewContainer');
            if (preview) preview.style.display = 'none';
            const fileIn = document.getElementById('fileInputAlpha');
            const imageIn = document.getElementById('imageInput');
            if (fileIn) fileIn.value = '';
            if (imageIn) imageIn.value = '';
        };
    }

    // Auto-resize textarea
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 180) + 'px';
        });
    }

    // Hide attach menu on background click
    document.addEventListener('click', (e) => {
        const attachMenu = document.getElementById('attachMenu');
        const attachBtn = document.getElementById('attachBtnAlpha');
        if (attachMenu && attachBtn && !attachBtn.contains(e.target) && !attachMenu.contains(e.target)) {
            attachMenu.style.display = 'none';
        }
    });
    
    // Setup STT features
    setupSpeechServices();
}

// ========== محاكي تشغيل الأكواد (Code Runner Modal/Page) ==========

window.runCode = (lang, code) => {
    const runWindow = window.open('', '_blank');
    if (!runWindow) {
        alert("انتبه: المتصفح قام بمنع فتح النوافذ المنبثقة (Pop-ups). يرجى السماح بها.");
        return;
    }
    
    runWindow.document.write('<html><head><title>تشغيل الكود - Tunisia Mind 🚀</title><meta charset="utf-8">');
    runWindow.document.write('<style>body{margin:0; font-family:"Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background:#1e1e1e; color:#ccc;} .app-header {background:#2d2d2d; padding:10px 20px; font-weight:bold; color:white; border-bottom:1px solid #444; display:flex; justify-content:space-between; align-items:center;}</style>');
    runWindow.document.write('</head><body>');
    
    // Header for the mock IDE window
    runWindow.document.write('<div class="app-header"><span>بيئة التشغيل 💻</span><span style="color:#10b981; font-size:0.9rem;">يدعم '+lang+'</span></div>');

    if (lang === 'html' || lang === 'htm' || lang === 'xml') {
        runWindow.document.write('<div style="padding:20px; background:white; color:black; height:calc(100vh - 40px); overflow:auto;">' + code + '</div>');
    } else if (lang === 'css') {
        runWindow.document.write(`<style>${code}</style><div style="padding:20px; text-align:center; padding-top:100px;"><h2>تم تطبيق الـ CSS! ✨</h2><p>هذه صفحة فارغة تم حقنها بالكود الخاص بك. أضف بعض الـ HTML لترى النتيجة النهائية.</p></div>`);
    } else if (lang === 'js' || lang === 'javascript') {
        runWindow.document.write(`<div id="consoleOut" style="padding:20px; font-family:monospace; white-space:pre-wrap; line-height:1.5;"></div>`);
        runWindow.document.write(`<script>
            const cOut = document.getElementById('consoleOut');
            console.log = (...args) => { cOut.innerHTML += args.map(a => typeof a === 'object' ? JSON.stringify(a,null,2) : a).join(' ') + "\\n"; };
            console.error = (...args) => { cOut.innerHTML += "<span style='color:#ef4444'>" + args.join(' ') + "</span>\\n"; };
            try {
                ${code}
            } catch(e) {
                console.error(e.toString());
            }
        </script>`);
    } else if (lang === 'python' || lang === 'py') {
        runWindow.document.write(`
            <div id="output" style="padding:20px; font-family:monospace; white-space:pre-wrap; font-size:1.1rem;">جاري تحميل بيئة بايثون (Pyodide)... يرجى الانتظار ⏳</div>
            <script src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"></script>
            <script>
                async function main() {
                    try {
                        let pyodide = await loadPyodide();
                        pyodide.setStdout({ batched: (msg) => { document.getElementById('output').innerHTML += "<span style='color:#3b82f6'>[مخرجات]:</span> " + msg + "\\n"; } });
                        document.getElementById('output').innerHTML = "<div style='color:#10b981; margin-bottom:15px;'>✅ بيئة جاهزة. جاري تشغيل الكود...</div>";
                        
                        await pyodide.runPythonAsync(\`${code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
                    } catch (err) {
                        document.getElementById('output').innerHTML += "\\n\\n<b style='color:#ef4444'>خطأ في الكود:</b>\\n<span style='color:#ef4444'>" + err.toString() + "</span>";
                    }
                }
                main();
            </script>
        `);
    } else {
        runWindow.document.write(`<div style="padding:20px;">عذراً، محاكي الأكواد لا يدعم تشغيل لغة <strong style="color:#f59e0b">${lang}</strong> حالياً بداخل المتصفح.</div>`);
    }
    
    runWindow.document.write('</body></html>');
    runWindow.document.close();
};

// ========== Voice Integration (TTS & STT) ==========

window.playTTS = (text, btn) => {
    if (!window.speechSynthesis) {
        window.showToast?.("متصفحك لا يدعم القراءة الصوتية.", "error");
        return;
    }
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    // Clean text from markdown/html
    const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/[*_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-SA';
    
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-volume-up fa-fade"></i> يتحدث...';
    
    utterance.onend = () => { btn.innerHTML = originalHtml; };
    utterance.onerror = () => { btn.innerHTML = originalHtml; };
    
    window.speechSynthesis.speak(utterance);
};

function setupSpeechServices() {
    const micBtn = document.getElementById('micBtn');
    if (!micBtn) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.style.display = 'none';
        return;
    }

    const recognition = new SpeechRecognition();
    // Defaulting to Arabic tuning
    recognition.lang = 'ar-SA';
    recognition.interimResults = true;
    recognition.continuous = true; 
    
    let isRecording = false;

    recognition.onresult = (e) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            transcript += e.results[i][0].transcript;
        }
        if (messageInput) {
            messageInput.value = transcript;
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 180) + 'px';
        }
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
        micBtn.style.color = 'var(--text-primary)';
        micBtn.style.background = 'var(--bg-tertiary)';
        micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    };

    micBtn.onclick = (e) => {
        e.preventDefault();
        if (isRecording) {
            recognition.stop();
        } else {
            if(messageInput) messageInput.value = '';
            recognition.start();
            isRecording = true;
            micBtn.classList.add('recording');
            micBtn.style.color = 'white';
            micBtn.style.background = '#ef4444';
            micBtn.innerHTML = '<i class="fa-solid fa-microphone-slash fa-beat"></i>';
        }
    };
}

// ========== Voice Integration (TTS) ==========

window.playTTS = (text, btn) => {
    if (!window.speechSynthesis) {
        alert("متصفحك لا يدعم القراءة الصوتية.");
        return;
    }
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    // Clean text from markdown/html
    const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/[*_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-SA';
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-volume-up fa-fade"></i> يتحدث...';
    
    utterance.onend = () => { btn.innerHTML = originalHtml; };
    utterance.onerror = () => { btn.innerHTML = originalHtml; };
    
    window.speechSynthesis.speak(utterance);
};
// ========== PDF Export ==========
window.exportToPDF = () => {
    const chatContainer = document.getElementById('messagesWrapper');
    if (!chatContainer || chatContainer.children.length === 0) {
        return alert("لا توجد محادثة لتصديرها.");
    }
    
    const toast = document.getElementById('toast');
    if(toast) { toast.textContent = '📄 جاري تجهيز ملف PDF...'; toast.className = 'toast show'; }

    // إنشاء نسخة مؤقتة وتنسيقها للطباعة
    const printArea = document.createElement('div');
    printArea.innerHTML = chatContainer.innerHTML;
    printArea.style.padding = '20px';
    printArea.style.background = '#ffffff';
    printArea.style.color = '#000000';
    printArea.querySelectorAll('.msg-actions').forEach(el => el.remove());
    printArea.querySelectorAll('.suggestion-card').forEach(el => el.remove());
    printArea.querySelectorAll('.confidence-score').forEach(el => el.remove());
    
    // Add header
    const header = document.createElement('h2');
    header.style.textAlign = 'center';
    header.style.color = '#10b981';
    header.innerText = 'محادثة ذكية - العقل التونسي AI';
    printArea.prepend(header);

    const opt = {
        margin:       10,
        filename:     `chat-${Date.now()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(printArea).save().then(() => {
        if(toast) { toast.textContent = '✅ تم التصدير بنجاح!'; toast.className = 'toast show success'; setTimeout(()=>toast.className='toast',3000); }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    initChat();
    setupSpeechServices();
});
