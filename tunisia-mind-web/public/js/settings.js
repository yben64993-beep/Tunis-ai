// settings.js — Theme, Profile, i18n, Notifications, Support

document.addEventListener('DOMContentLoaded', () => {

    // Apply saved preferences
    const savedTheme = localStorage.getItem('tunisiaTheme') || 'dark';
    const savedAccent = localStorage.getItem('tunisiaAccent') || '#10b981';
    const savedLang = localStorage.getItem('tunisiaLang') || 'ar';

    const savedResponseLen = localStorage.getItem('tm-response-len') || 'medium';

    applyTheme(savedTheme);
    applyAccent(savedAccent);

    // The language will be applied by language.js

    // ===== Settings Tabs =====
    document.querySelectorAll('.snav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            document.querySelectorAll('.snav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.stab').forEach(p => p.style.display = 'none');
            btn.classList.add('active');
            const tab = document.getElementById(target);
            if (tab) tab.style.display = 'block';
        });
    });

    // ===== Theme =====
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyTheme(btn.getAttribute('data-theme'));
        });
    });
    // Set active state based on saved
    document.querySelectorAll('.theme-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-theme') === savedTheme);
    });

    // ===== Accent Color =====
    document.querySelectorAll('.accent-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyAccent(btn.getAttribute('data-color'));
        });
    });



    // ===== Response Length =====
    const responseLenSelect = document.getElementById('responseLengthSelect');
    if (responseLenSelect) {
        responseLenSelect.value = savedResponseLen;
        responseLenSelect.addEventListener('change', () => {
            localStorage.setItem('tm-response-len', responseLenSelect.value);
        });
    }

    // ===== Language (Handled by language.js) =====
    // Ensure the active button matches the saved language
    document.querySelectorAll('.lang-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-lang') === savedLang);
    });

    // Re-apply translations whenever the Settings modal is opened
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
        const lang = localStorage.getItem('tunisiaLang') || 'ar';
        if (window.applyTranslations) window.applyTranslations(lang);
    }, { capture: true });




    // ===== Save Profile =====
    document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
        if (!window.currentUser) return;
        const firstName = document.getElementById('profileFirstName').value.trim();
        const lastName = document.getElementById('profileLastName').value.trim();
        const age = document.getElementById('profileAge').value;
        if (!firstName) { window.showToast?.('أدخل اسمك', 'error'); return; }
        try {
            const { doc, setDoc, serverTimestamp } = window.fsCore;
            const displayName = `${firstName} ${lastName}`.trim();
            await setDoc(doc(window.firebaseDb, 'users', window.currentUser.uid), { firstName, lastName, displayName, age: parseInt(age)||0, updatedAt: serverTimestamp() }, { merge: true });
            
            window.currentUserProfile = { ...window.currentUserProfile, firstName, lastName, displayName, age };
            document.getElementById('userNameDisplay').textContent = displayName;
            window.showToast?.('تم حفظ الملف الشخصي ✓', 'success');
        } catch(e) { window.showToast?.('حدث خطأ أثناء الحفظ.', 'error'); }
    });


    // ===== Support =====
    document.getElementById('sendSupportBtn')?.addEventListener('click', () => {
        const subEl = document.getElementById('supportSubject');
        const msgEl = document.getElementById('supportMessage');
        const subject = subEl.value;
        const msg = msgEl.value;
        if (!subject || !msg) { window.showToast?.('يرجى ملء الموضوع والرسالة', 'error'); return; }
        const link = `mailto:tunisiamindai@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
        window.open(link);
        window.showToast?.('يتم فتح برنامج البريد...', 'success');
        // Clear fields
        subEl.value = '';
        msgEl.value = '';
    });
});

function applyTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme';
    localStorage.setItem('tunisiaTheme', theme);
}

function applyAccent(color) {
    document.documentElement.style.setProperty('--accent-color', color);
    const hover = adjustColorBrightness(color, -20);
    document.documentElement.style.setProperty('--accent-hover', hover);
    localStorage.setItem('tunisiaAccent', color);
}

function adjustColorBrightness(hex, amount) {
    try {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
        const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
        return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
    } catch { return hex; }
}
