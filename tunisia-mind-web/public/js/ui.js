// ui.js — Sidebar, History, Chat Management

window.premiumBackgrounds = [
    { id: 'nature1',    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b', thumb: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80' },
    { id: 'nature2',    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4', thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80' },
    { id: 'nature3',    url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429', thumb: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&q=80' },
    { id: 'nature4',    url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b', thumb: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80' },
    { id: 'desert',     url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35', thumb: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=80' },
    { id: 'ocean',      url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0', thumb: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=80' },
    { id: 'mountain',   url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80' },
    { id: 'forest',     url: 'https://images.unsplash.com/photo-1448375240586-882707db888b', thumb: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80' },
    { id: 'ornament1',  url: 'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9', thumb: 'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?w=400&q=80' },
    { id: 'ornament2',  url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64', thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
    { id: 'ornament3',  url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab', thumb: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80' },
    { id: 'ornament4',  url: 'https://images.unsplash.com/photo-1557800636-894a64c1696f', thumb: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?w=400&q=80' }
];

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay') || createSidebarOverlay();
    sidebar.classList.toggle('active');
    overlay.style.display = sidebar.classList.contains('active') ? 'block' : 'none';
}

function createSidebarOverlay() {
    const div = document.createElement('div');
    div.id = 'sidebarOverlay';
    div.className = 'sidebar-overlay';
    div.addEventListener('click', toggleSidebar);
    document.body.appendChild(div);
    return div;
}

window.showSettings = () => {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        // Populate profile fields
        if (window.currentUserProfile) {
            const p = window.currentUserProfile;
            const email = p.email || window.currentUser?.email || '';
            const elFirst = document.getElementById('profileFirstName');
            const elLast = document.getElementById('profileLastName');
            const elAge = document.getElementById('profileAge');
            const elEmail = document.getElementById('profileEmail');
            const elAccountEmail = document.getElementById('accountEmail');
            
            if (elFirst) elFirst.value = p.firstName || '';
            if (elLast) elLast.value = p.lastName || '';
            if (elAge) elAge.value = p.age || '';
            if (elEmail) elEmail.value = email;
            if (elAccountEmail) elAccountEmail.value = email;

            // Updated Streak Display
            const streakCountEl = document.getElementById('streakCount');
            if (streakCountEl) streakCountEl.textContent = p.streak || localStorage.getItem('tm-streak') || '0';
        }
    }
    window.updateBackgroundsUI?.();
};

window.closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    // Also specifically hide if display:flex was used
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
};


window.updateBackgroundsUI = () => {
    const container = document.getElementById('backgroundGrid');
    if (!container) return;
    container.innerHTML = '';
    const current = localStorage.getItem('tm-background');

    window.premiumBackgrounds.forEach(bg => {
        const btn = document.createElement('button');
        btn.className = `bg-pattern-btn ${current === bg.url + '?w=1920&q=80' ? 'active' : ''}`;
        btn.style.backgroundImage = `url('${bg.thumb}')`;
        btn.setAttribute('title', 'اختيار خلفية');
        
        btn.onclick = () => {
            applyBackground(bg.url + '?w=1920&q=80');
            document.querySelectorAll('.bg-pattern-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.showToast?.('تم تشغيل الخلفية ✓', 'success');
        };
        container.appendChild(btn);
    });
};

function applyBackground(url) {
    document.body.style.backgroundImage = `url('${url}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    
    // Also update wallpaperOverlay if it exists (for compatibility with settings.js)
    const overlay = document.getElementById('wallpaperOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    localStorage.setItem('tm-background', url);
}

// نظام إدارة تاريخ الدردشة
window.loadChatHistory = async () => {
    if (!window.currentUser || !window.firebaseDb) return;
    const historyContainer = document.querySelector('.history-list');
    if (!historyContainer) return;

    try {
        const { collection, query, orderBy, getDocs } = window.fsCore;
        const chatsRef = collection(window.firebaseDb, 'users', window.currentUser.uid, 'chats');
        const q = query(chatsRef, orderBy('updatedAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const lang = localStorage.getItem('tunisiaLang') || 'ar';
        const trans = window.translations?.[lang] || window.translations?.['ar'];

        historyContainer.innerHTML = '';
        
        if (querySnapshot.empty) {
            historyContainer.innerHTML = `<div style="padding:1rem;color:var(--text-secondary);font-size:0.85rem;text-align:center;">${trans.no_chats || 'No chats'}</div>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const chat = doc.data();
            const chatId = doc.id;
            const title = chat.title || trans.new_chat || 'New Chat';
            
            const chatItem = document.createElement('div');
            chatItem.className = `history-item ${window.currentChatId === chatId ? 'active' : ''}`;
            chatItem.innerHTML = `
                <i class="fa-regular fa-message"></i>
                <span class="chat-title">${title}</span>
                <div class="chat-actions" style="position: relative;">
                    <button class="chat-action-btn" onclick="event.stopPropagation(); window.toggleChatMenu(event, '${chatId}')">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div id="chat-menu-${chatId}" class="history-context-menu">
                        <div class="context-menu-item" style="position:relative;" 
                             onmouseenter="this.querySelector('.context-submenu').style.display='flex'" 
                             onmouseleave="this.querySelector('.context-submenu').style.display='none'"
                             onclick="event.stopPropagation(); const s=this.querySelector('.context-submenu'); s.style.display=s.style.display==='flex'?'none':'flex';">
                            <i class="fa-solid fa-file-export"></i> 
                            <span>تصدير المحادثة</span>
                            <i class="fa-solid fa-chevron-left" style="font-size:0.7rem; margin-right:auto;"></i>
                            <div class="context-submenu">
                                <button class="context-menu-item" onclick="event.stopPropagation(); window.exportChatFromMenu('${chatId}', 'pdf');"><i class="fa-solid fa-file-pdf"></i> PDF</button>
                                <button class="context-menu-item" onclick="event.stopPropagation(); window.exportChatFromMenu('${chatId}', 'text');"><i class="fa-solid fa-file-lines"></i> Text</button>
                                <button class="context-menu-item" onclick="event.stopPropagation(); window.exportChatFromMenu('${chatId}', 'image');"><i class="fa-solid fa-image"></i> Image</button>
                            </div>
                        </div>
                        <button class="context-menu-item danger" onclick="event.stopPropagation(); window.deleteChatFromMenu('${chatId}');">
                            <i class="fa-solid fa-trash"></i> 
                            <span>حذف المحادثة</span>
                        </button>
                    </div>
                </div>
            `;
            
            chatItem.onclick = () => {
                window.openChat(chatId);
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('active')) {
                    toggleSidebar();
                }
            };
            historyContainer.appendChild(chatItem);
        });
    } catch (error) {
        console.error('Error loading history:', error);
    }
};

window.openChat = async (chatId) => {
    if (!chatId || window.currentChatId === chatId) return;
    
    // إغلاق غرفة المشاريع إن كانت مفتوحة
    if (window.isInProjectMode && typeof closeProjectWorkspace === 'function') {
        closeProjectWorkspace();
    }
    
    window.currentChatId = chatId;
    
    // إخفاء شاشة الترحيب وإظهار منطقة الرسائل
    document.getElementById('welcomeScreen').style.display = 'none';
    const wrapper = document.getElementById('messagesWrapper');
    wrapper.innerHTML = '<div class="loading-chats"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</div>';

    try {
        const { collection, query, orderBy, getDocs } = window.fsCore;
        const messagesRef = collection(window.firebaseDb, 'users', window.currentUser.uid, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const querySnapshot = await getDocs(q);

        wrapper.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const msg = doc.data();
            const isHtml = false;
            window.appendMessage?.(msg.content, msg.sender, isHtml);
        });

        // إظهار أزرار التحكم في المحادثة العلوية
        ['shareChatBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = 'block';
        });

        // إغلاق السايد بار في الموبايل
        if (window.innerWidth <= 768) toggleSidebar();
        window.loadChatHistory(); // لتحديث الحالة النشطة
        
    } catch (error) {
        console.error('خطأ في فتح المحادثة:', error);
        window.showToast?.('فشل تحميل المحادثة', 'error');
    }
};

window.deleteChat = async (chatId) => {
    if (!chatId) { window.showToast?.('معرّف المحادثة غير متوفر', 'error'); return; }
    if (!window.currentUser) { window.showToast?.('يجب تسجيل الدخول أولاً', 'error'); return; }
    if (!window.fsCore?.deleteDoc) { window.showToast?.('خدمة قاعدة البيانات غير جاهزة', 'error'); return; }
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة وجميع رسائلها نهائياً؟')) return;
    
    const deleteBtnInSidebar = document.querySelector(`.history-item .chat-action-btn[onclick*="'${chatId}'"]`);
    if(deleteBtnInSidebar) {
        deleteBtnInSidebar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        deleteBtnInSidebar.disabled = true;
    }

    try {
        const { doc, deleteDoc, collection, query, getDocs } = window.fsCore;
        const messagesRef = collection(window.firebaseDb, 'users', window.currentUser.uid, 'chats', chatId, 'messages');
        const messagesSnapshot = await getDocs(query(messagesRef));
        
        // Delete all messages in the subcollection
        const deletePromises = [];
        messagesSnapshot.forEach((messageDoc) => {
            deletePromises.push(deleteDoc(messageDoc.ref));
        });
        await Promise.all(deletePromises);

        // Now delete the chat document itself
        await deleteDoc(doc(window.firebaseDb, 'users', window.currentUser.uid, 'chats', chatId));
        
        if (window.currentChatId === chatId) {
            window.currentChatId = null;
            document.getElementById('messagesWrapper').innerHTML = '';
            document.getElementById('welcomeScreen').style.display = 'flex';
            ['shareChatBtn'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.style.display = 'none';
            });
        }
        
        window.loadChatHistory();
        window.showToast?.('تم حذف المحادثة ✓', 'success');
    } catch (error) {
        console.error('خطأ في حذف المحادثة:', error.code, error.message);
        if (error.code === 'permission-denied') {
            window.showToast?.('لا تملك صلاحية حذف هذه المحادثة', 'error');
        } else {
            window.showToast?.(`فشل الحذف: ${error.message}`, 'error');
        }
        // Restore button if it failed
        if(deleteBtnInSidebar) {
            deleteBtnInSidebar.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>';
            deleteBtnInSidebar.disabled = false;
        }
    }
};

window.toggleChatMenu = (event, chatId) => {
    const allMenus = document.querySelectorAll('.history-context-menu');
    allMenus.forEach(m => {
        if(m.id !== `chat-menu-${chatId}`) m.style.display = 'none';
    });
    const menu = document.getElementById(`chat-menu-${chatId}`);
    if (menu) {
        menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
    }
};

window.deleteChatFromMenu = (chatId) => {
    const menu = document.getElementById(`chat-menu-${chatId}`);
    if (menu) menu.style.display = 'none';
    window.deleteChat(chatId);
};

window.exportChatFromMenu = (chatId, type) => {
    const menu = document.getElementById(`chat-menu-${chatId}`);
    if (menu) menu.style.display = 'none';
    if (type === 'pdf') window.exportToPDF?.(chatId);
    else if (type === 'text') window.exportToText?.(chatId);
    else if (type === 'image') window.exportToImage?.(chatId);
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('.chat-actions')) {
        document.querySelectorAll('.history-context-menu').forEach(m => m.style.display = 'none');
    }
    const attachMenu = document.getElementById('attachMenu');
    const attachBtn = document.getElementById('attachBtnAlpha');
    if (attachMenu && attachBtn && !attachBtn.contains(e.target) && !attachMenu.contains(e.target)) {
        attachMenu.classList.remove('active');
    }
});

// ========== نظام حفظ المحادثات المحلي (localStorage) ==========

function getLocalChats() {
    return JSON.parse(localStorage.getItem('tm-chats') || '{}');
}

function saveLocalChats(chats) {
    localStorage.setItem('tm-chats', JSON.stringify(chats));
}

function generateChatId() {
    return 'chat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

// حفظ رسالة في المحادثة الحالية
window.saveMessageToCurrentChat = (content, sender) => {
    if (!content || content.trim() === '') return;

    const chats = getLocalChats();

    // إنشاء محادثة جديدة إذا لم تكن موجودة
    if (!window.currentChatId) {
        window.currentChatId = generateChatId();
        chats[window.currentChatId] = {
            id: window.currentChatId,
            title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: []
        };
    }

    if (!chats[window.currentChatId]) {
        chats[window.currentChatId] = {
            id: window.currentChatId,
            title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: []
        };
    }

    chats[window.currentChatId].messages.push({ content, sender, timestamp: Date.now() });
    chats[window.currentChatId].updatedAt = Date.now();
    saveLocalChats(chats);
    window.loadChatHistory();
};

// تحميل قائمة المحادثات في الشريط الجانبي
window.loadChatHistory = () => {
    const historyContainer = document.querySelector('.history-list');
    if (!historyContainer) return;

    const chats = getLocalChats();
    const sorted = Object.values(chats).sort((a, b) => b.updatedAt - a.updatedAt);

    historyContainer.innerHTML = '';

    if (sorted.length === 0) {
        historyContainer.innerHTML = `<div style="padding:1rem;color:var(--text-secondary);font-size:0.85rem;text-align:center;">لا توجد محادثات محفوظة</div>`;
        return;
    }

    sorted.forEach(chat => {
        const chatId = chat.id;
        const chatItem = document.createElement('div');
        chatItem.className = `history-item ${window.currentChatId === chatId ? 'active' : ''}`;
        chatItem.innerHTML = `
            <i class="fa-regular fa-message"></i>
            <span class="chat-title">${chat.title || 'محادثة جديدة'}</span>
            <div class="chat-actions" style="position: relative;">
                <button class="chat-action-btn" onclick="event.stopPropagation(); window.toggleChatMenu('${chatId}')"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                <div id="chat-menu-${chatId}" class="chat-menu-dropdown" style="display:none; position: absolute; right: 0; top: 100%; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; z-index: 100; box-shadow: 0 4px 10px rgba(0,0,0,0.2); width: max-content; padding: 4px; flex-direction: column; gap: 4px;">
                    <button style="display: flex; align-items: center; gap: 8px; width: 100%; text-align: right; padding: 8px 12px; background: none; border: none; color: var(--text-primary); cursor: pointer; border-radius: 4px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(128,128,128,0.1)'" onmouseout="this.style.background='none'" onclick="event.stopPropagation(); window.exportChatFromMenu('${chatId}');"><i class="fa-solid fa-file-export"></i> تصدير المحادثة</button>
                    <button style="display: flex; align-items: center; gap: 8px; width: 100%; text-align: right; padding: 8px 12px; background: none; border: none; color: #ef4444; cursor: pointer; border-radius: 4px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(239,64,64,0.1)'" onmouseout="this.style.background='none'" onclick="event.stopPropagation(); window.deleteChatFromMenu('${chatId}');"><i class="fa-solid fa-trash"></i> حذف المحادثة</button>
                </div>
            </div>
        `;

        chatItem.onclick = () => {
            window.openChat(chatId);
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('active')) toggleSidebar();
        };
        historyContainer.appendChild(chatItem);
    });
};

// فتح محادثة محفوظة
window.openChat = (chatId) => {
    const chats = getLocalChats();
    const chat = chats[chatId];
    if (!chat) return;

    window.currentChatId = chatId;

    document.getElementById('welcomeScreen').style.display = 'none';
    const wrapper = document.getElementById('messagesWrapper');
    wrapper.innerHTML = '';

    chat.messages.forEach(msg => {
        window.appendMessage?.(msg.content, msg.sender, false);
    });

    window.loadChatHistory();
    if (window.innerWidth <= 768) toggleSidebar();
};

// حذف محادثة
window.deleteChat = (chatId) => {
    if (!chatId) return;
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة نهائياً؟')) return;

    const chats = getLocalChats();
    delete chats[chatId];
    saveLocalChats(chats);

    if (window.currentChatId === chatId) {
        window.currentChatId = null;
        document.getElementById('messagesWrapper').innerHTML = '';
        document.getElementById('welcomeScreen').style.display = 'flex';
    }

    window.loadChatHistory();
    window.showToast?.('تم حذف المحادثة ✓', 'success');
};

window.deleteChatFromMenu = (chatId) => {
    const menu = document.getElementById(`chat-menu-${chatId}`);
    if (menu) menu.style.display = 'none';
    window.deleteChat(chatId);
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) toggleSidebar();
};

// تصدير محادثة
window.exportChatFromMenu = (chatId) => {
    const menu = document.getElementById(`chat-menu-${chatId}`);
    if (menu) menu.style.display = 'none';

    const chats = getLocalChats();
    const chat = chats[chatId];
    if (!chat) { window.showToast?.('لم يتم العثور على المحادثة', 'error'); return; }

    let exportText = `محادثة: ${chat.title}\n-----------------------------------\n\n`;
    chat.messages.forEach(msg => {
        const senderName = msg.sender === 'user' ? 'أنت' : 'الذكاء الاصطناعي';
        exportText += `[${senderName}]:\n${msg.content}\n\n`;
    });

    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${chat.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.showToast?.('تم تصدير المحادثة ✓', 'success');
};

// Toggle dropdown menu
window.toggleChatMenu = (chatId) => {
    document.querySelectorAll('.chat-menu-dropdown').forEach(el => {
        if (el.id !== `chat-menu-${chatId}`) el.style.display = 'none';
    });
    const menu = document.getElementById(`chat-menu-${chatId}`);
    if (menu) menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
};

document.addEventListener('click', () => {
    document.querySelectorAll('.chat-menu-dropdown').forEach(el => { el.style.display = 'none'; });
});

function initUI() {
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if (toggleBtn) toggleBtn.onclick = toggleSidebar;

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.onclick = (e) => { e.preventDefault(); window.showSettings(); };

    document.querySelectorAll('.modal-close, .modal-close-icon').forEach(btn => {
        btn.onclick = window.closeModals;
    });

    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
        newChatBtn.onclick = () => {
            window.currentChatId = null;
            const mw = document.getElementById('messagesWrapper');
            if (mw) { mw.innerHTML = ''; mw.style.display = 'none'; }
            const ws = document.getElementById('welcomeScreen');
            if (ws) ws.style.display = 'flex';
            window.loadChatHistory();
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('active')) toggleSidebar();
        };
    }

    // Auto-theme and backgrounds
    const savedBg = localStorage.getItem('tm-background');
    if (savedBg) applyBackground(savedBg);

    // تحميل المحادثات عند البداية
    window.loadChatHistory();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
} else {
    initUI();
}
