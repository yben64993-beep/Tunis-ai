// settings.js — Theme, Profile, i18n, Notifications, Support

document.addEventListener('DOMContentLoaded', () => {

    // Apply saved preferences
    const savedTheme = localStorage.getItem('tunisiaTheme') || 'dark';
    const savedAccent = localStorage.getItem('tunisiaAccent') || '#10b981';
    const savedFont = localStorage.getItem('tunisiaFont') || 'tajawal';
    const savedLang = localStorage.getItem('tunisiaLang') || 'ar';
    const savedWallpaper = localStorage.getItem('tunisiaWallpaper') || 'none';
    const savedResponseLen = localStorage.getItem('tm-response-len') || 'medium';

    applyTheme(savedTheme);
    applyAccent(savedAccent);
    applyFont(savedFont);
    // The language will be applied by language.js
    applyWallpaper(savedWallpaper);

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

    // ===== Font Family =====
    const fontSelect = document.getElementById('fontFamilySelect');
    if (fontSelect) {
        fontSelect.value = savedFont;
        fontSelect.addEventListener('change', () => applyFont(fontSelect.value));
    }

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


    // ===== Wallpaper (Old System Restored) =====
    document.querySelectorAll('.wp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.wp-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyWallpaper(btn.getAttribute('data-wp'));
        });
    });
    // Set active
    document.querySelectorAll('.wp-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-wp') === savedWallpaper);
    });

    localStorage.setItem('tunisiaWallpaper', savedWallpaper);

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

function applyFont(font) {
    const fonts = { 
        tajawal: "'Tajawal', sans-serif", 
        cairo: "'Cairo', sans-serif",
        almarai: "'Almarai', sans-serif",
        'noto-kufi': "'Noto Kufi Arabic', sans-serif",
        inter: "'Inter', sans-serif", 
        roboto: "'Roboto', sans-serif",
        poppins: "'Poppins', sans-serif",
        serif: "Georgia, serif" 
    };
    const fontString = fonts[font] || fonts.tajawal;
    
    let styleEl = document.getElementById('dynamic-font-override');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-font-override';
        document.head.appendChild(styleEl);
    }
    // تطبيق الخط على مستوى الموقع بأكمله بدلاً من حصره في قسم المحادثات فقط
    styleEl.textContent = `body, button, input, textarea, select, .msg-content, .msg-content * { font-family: ${fontString} !important; }`;
    
    localStorage.setItem('tunisiaFont', font);
}

function applyWallpaper(wpId) {
    const overlay = document.getElementById('wallpaperOverlay');
    if (!overlay) return;
    
    overlay.innerHTML = '';
    overlay.style.backgroundImage = 'none';
    overlay.style.backgroundColor = 'transparent';
    overlay.style.background = 'none';
    
    if (wpId === 'none') {
        overlay.style.display = 'none';
    } else {
        overlay.style.display = 'block';
        if (wpId.startsWith('wp_')) {
            renderFullWP(overlay, wpId);
        } else {
            // Legacy fallbacks
            const staticImages = {
                wallpaper_abstract_blue: 'bg_blue.png',
                wallpaper_nebula_purple: 'bg_purple.png',
                wallpaper_geometric_dark: 'bg_dark.png',
                wallpaper_tunisia_heritage_modern: 'bg_heritage.png'
            };
            if (staticImages[wpId]) {
                overlay.style.backgroundImage = `url('${staticImages[wpId]}')`;
            }
        }
    }
    localStorage.setItem('tunisiaWallpaper', wpId);
}

function renderFullWP(container, id) {
    const patterns = {
        wp_tn_heritage: { bg: '#e70013', color: '#fff', icon: '🕌' },
        wp_pal_spirit: { bg: '#007a3d', color: '#fff', icon: '✌️' },
        wp_night_desert: { bg: '#0f172a', color: '#f59e0b', icon: '🌙' },
        wp_ocean_waves: { bg: '#0c4a6e', color: '#38bdf8', icon: '🌊' },
        wp_geometric_black: { bg: '#000', color: '#333', icon: '🔳' },
        wp_sunset_gradient: { bg: 'linear-gradient(180deg, #ff7e5f, #feb47b)', color: '#fff', icon: '🌅' },
        wp_abstract_nebula: { bg: 'radial-gradient(circle, #2d1b4e, #050505)', color: '#fff', icon: '🌌' },
        wp_minimal_red: { bg: '#911', color: '#fff', icon: '❤️' },
        wp_forest_mist: { bg: '#064e3b', color: '#059669', icon: '🌲' },
        wp_zellige_art: { bg: '#047857', color: '#fbbf24', icon: '💠' },
        wp_cyber_circuit: { bg: '#020617', color: '#10b981', icon: '🔌' },
        wp_silk_road: { bg: '#78350f', color: '#fde68a', icon: '🐪' },
        wp_luxury_gold: { bg: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)', color: '#d4af37', icon: '✨' },
        wp_cyber_neon: { bg: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', color: '#00f2fe', icon: '🧪' },
        wp_aurora_sky: { bg: 'linear-gradient(180deg, #1a2a6c, #b21f1f, #fdbb2d)', color: '#fff', icon: '🌈' }
    };

    const p = patterns[id] || { bg: '#111', color: '#444' };
    container.style.background = p.bg;
    container.style.opacity = '0.4';
    
    if (id === 'wp_tn_heritage') {
        container.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; opacity:0.2;">
            <svg width="400" height="400" viewBox="0 0 30 20"><circle cx="15" cy="10" r="7" fill="rgba(255,255,255,0.1)"/><path d="M16 7 a3.5 3.5 0 1 0 0 6 a2.5 2.5 0 1 1 0 -6" fill="white"/></svg>
        </div>`;
    } else if (id === 'wp_geometric_black') {
        container.style.backgroundImage = 'radial-gradient(#333 1px, transparent 0)';
        container.style.backgroundSize = '40px 40px';
    } else if (id === 'wp_zellige_art') {
        container.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30-30-30z' fill='%23ffffff' fill-opacity='0.1'/%3E%3C/svg%3E")`;
    } else if (id === 'wp_luxury_gold') {
        container.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50h100M50 0v100' stroke='%23d4af37' stroke-opacity='0.1'/%3E%3C/svg%3E")`;
    } else if (id === 'wp_cyber_neon') {
        container.innerHTML = `<div style="height:100%; width:100%; background: radial-gradient(circle at 20% 30%, rgba(0,242,254,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,0,255,0.1) 0%, transparent 40%);"></div>`;
    } else if (id === 'wp_aurora_sky') {
        container.style.filter = 'blur(60px)';
        container.style.opacity = '0.3';
    }
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
