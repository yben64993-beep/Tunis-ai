// api.js — Backend API communication
const API_URL = '/api';

async function sendChatMessage(prompt, userContext = {}) {
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, userContext })
        });
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = { message: text };
        }

        if (response.status === 429) return { answer: data.message, error: 'rate_limit' };
        if (response.status === 503) {
            showMaintenanceOverlay(data.message);
            return { answer: data.message, error: 'maintenance' };
        }
        if (response.status === 403) {
            window.showToast?.('تم حظر حسابك. يرجى التواصل مع الدعم.', 'error');
            setTimeout(() => { auth.signOut(); window.location.reload(); }, 3000);
            return { answer: 'حسابك محظور.', error: 'banned' };
        }
        
        if (!response.ok) {
            throw new Error(data.message || data.error || response.statusText);
        }
        return data;
    } catch (error) {
        console.error('Chat API Error:', error);
        return { answer: `خطأ في الاتصال: ${error.message}`, error: true, source: 'error' };
    }
}



async function analyzeImage(imageBase64, prompt = "Explain this image") {
    try {
        const response = await fetch(`${API_URL}/analyze-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64, prompt })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'فشل تحليل الصورة');
        }
        return await response.json();
    } catch (error) {
        console.error('API analyzeImage error:', error);
        return { answer: '⚠️ عذراً، تعذر تحليل الصورة حالياً.', error: true };
    }
}

// --- Image Generation ---
async function generateImage(prompt) {
    try {
        const response = await fetch(`${API_URL}/generate-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        if (!response.ok) throw new Error('فشل توليد الصورة');
        return await response.json();
    } catch (e) {
        console.error('generateImage error:', e);
        return { error: true, message: e.message };
    }
}

// --- Video Generation ---
async function generateVideo(prompt) {
    try {
        const response = await fetch(`${API_URL}/generate-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        if (!response.ok) throw new Error('فشل توليد الفيديو');
        return await response.json();
    } catch (e) {
        console.error('generateVideo error:', e);
        return { error: true, message: e.message };
    }
}

// --- Models Status & Stats ---
async function getModelsStatus() {
    try {
        const response = await fetch(`${API_URL}/models-status`);
        return await response.json();
    } catch (e) { return []; }
}

async function getStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        return await response.json();
    } catch (e) { return {}; }
}

