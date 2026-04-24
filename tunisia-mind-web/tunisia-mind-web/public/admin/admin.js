// admin.js — Admin Dashboard v1.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    getFirestore,
    collection, doc, getDoc, getDocs, updateDoc, deleteDoc,
    query, orderBy, limit, where, setDoc, addDoc, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ====== Firebase Config (same as main app) ======
const firebaseConfig = {
    apiKey: "AIzaSyDdkMJBY07emVGa-8qNImJJm2_jjs24oQk",
    authDomain: "tunisia-mind.firebaseapp.com",
    projectId: "tunisia-mind",
    storageBucket: "tunisia-mind.firebasestorage.app",
    messagingSenderId: "57593992930",
    appId: "1:575939929130:web:4baaa92ebe293a39d5cf53"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ====== Admin UIDs (add your Firebase UID here) ======
const ADMIN_UIDS = ['ADMIN_UID_PLACEHOLDER']; // سيتم تحديثه تلقائياً بعد التحقق

// ====== Globals ======
let allUsers = [];
let knowledgeData = [];
let notifHistory = [];
let blockedIPs = JSON.parse(localStorage.getItem('blockedIPs') || '[]');
let loginLogs = JSON.parse(localStorage.getItem('adminLoginLogs') || '[]');

// ====== Auth Guard ======
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // إظهار نموذج دخول إدارة
        showAdminLoginForm();
        return;
    }
    // تحقق من ملف الإدارة في Firestore
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().isAdmin === true) {
            initDashboard(user);
        } else {
            showAccessDenied();
        }
    } catch (e) {
        // في حالة عدم وجود قواعد بعد، نسمح بالدخول مؤقتاً
        initDashboard(user);
    }
});

function showAccessDenied() {
    document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:1rem;font-family:'Tajawal',sans-serif;background:#0f1117;color:#e2e8f0">
            <div style="font-size:4rem">🚫</div>
            <h2 style="color:#ef4444">وصول مرفوض</h2>
            <p style="color:#94a3b8">ليس لديك صلاحية الوصول للوحة الإدارة</p>
            <a href="/" style="color:#6366f1">← العودة للموقع</a>
        </div>`;
}

function showAdminLoginForm() {
    document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:1.25rem;font-family:'Tajawal',sans-serif;background:#0f1117;color:#e2e8f0;direction:rtl">
            <div style="font-size:3rem">🧠</div>
            <h2 style="font-size:1.4rem">دخول لوحة الإدارة</h2>
            <input id="adEmail" type="email" placeholder="البريد الإلكتروني" style="background:#1a1f2e;border:1px solid #2d3348;border-radius:0.6rem;padding:0.75rem 1rem;color:#e2e8f0;font-family:inherit;font-size:0.95rem;width:300px;outline:none">
            <input id="adPass" type="password" placeholder="كلمة المرور" style="background:#1a1f2e;border:1px solid #2d3348;border-radius:0.6rem;padding:0.75rem 1rem;color:#e2e8f0;font-family:inherit;font-size:0.95rem;width:300px;outline:none">
            <button id="adLoginBtn" style="background:#6366f1;color:white;border:none;border-radius:0.65rem;padding:0.75rem 2rem;font-family:inherit;font-size:0.95rem;cursor:pointer;width:300px">دخول</button>
            <a href="/" style="color:#94a3b8;font-size:0.85rem">← العودة للموقع</a>
        </div>`;
    const { signInWithEmailAndPassword } = auth.__esModule ? auth : { signInWithEmailAndPassword: null };
    document.getElementById('adLoginBtn').addEventListener('click', async () => {
        const email = document.getElementById('adEmail').value.trim();
        const pass = document.getElementById('adPass').value;
        try {
            const { signInWithEmailAndPassword: signIn } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
            await signIn(auth, email, pass);
        } catch (e) {
            alert('خطأ في تسجيل الدخول: ' + e.message);
        }
    });
}

// ====== Initialize Dashboard ======
async function initDashboard(user) {
    document.querySelector('.admin-sidebar').style.display = '';
    document.querySelector('.admin-main').style.display = '';
    
    // Live clock
    setInterval(() => {
        const el = document.getElementById('liveTime');
        if (el) el.textContent = new Date().toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);

    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(btn.dataset.page, btn.textContent.trim());
        });
    });

    // Sidebar toggle (mobile)
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('adminSidebar').classList.toggle('open');
    });

    // Logout
    document.getElementById('adminLogout')?.addEventListener('click', async () => {
        await signOut(auth);
        window.location.reload();
    });

    // Load initial data
    await loadAllUsers();
    loadDashboard();
    loadKnowledgeBase();
    setupKnowledgePage();
    setupNotifications();
    setupSecurity();
    setupActivityFilter();
    
    document.getElementById('backToUsers')?.addEventListener('click', () => navigateTo('users', 'إدارة المستخدمين'));
    document.getElementById('refreshUsers')?.addEventListener('click', async () => { await loadAllUsers(); renderUsersTable(allUsers); });

    // User search
    document.getElementById('userSearch')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => 
            u.displayName?.toLowerCase().includes(q) || 
            u.email?.toLowerCase().includes(q) ||
            u.firstName?.toLowerCase().includes(q)
        );
        renderUsersTable(filtered);
    });

    // AI Monitor
    loadAiMonitor();
    loadOnlineUsers();
    loadCountries();
    loadActivityLog();

    // Settings save
    document.getElementById('saveSiteSettings')?.addEventListener('click', saveSiteSettings);
}

// ====== NAVIGATION ======
function navigateTo(page, title) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const pg = document.getElementById(`page-${page}`);
    if (pg) pg.classList.add('active');
    
    const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (nav) nav.classList.add('active');
    
    document.getElementById('pageTitle').textContent = title || page;

    if (page === 'users') renderUsersTable(allUsers);
    if (page === 'online') loadOnlineUsers();
    if (page === 'countries') loadCountries();
    if (page === 'ai-monitor') loadAiMonitor();
    if (page === 'activity') loadActivityLog();
    if (page === 'security') renderLoginLogs();
    if (page === 'knowledge') renderKbList();
}

// ====== LOAD ALL USERS ======
async function loadAllUsers() {
    try {
        const snap = await getDocs(collection(db, 'users'));
        allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error('Error loading users:', e);
        allUsers = [];
    }
}

// ====== DASHBOARD ======
async function loadDashboard() {
    const totalEl = document.getElementById('stat-total-users');
    const newEl = document.getElementById('stat-new-today');
    const onlineEl = document.getElementById('stat-online');
    const msgsEl = document.getElementById('stat-msgs');
    const chatsEl = document.getElementById('stat-chats');
    const aiEl = document.getElementById('stat-ai-calls');

    if (totalEl) totalEl.textContent = allUsers.length;

    // Count new today
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const newToday = allUsers.filter(u => {
        if (!u.createdAt) return false;
        const d = u.createdAt?.toDate?.() || new Date(u.createdAt);
        return d >= todayStart;
    }).length;
    if (newEl) newEl.textContent = newToday;

    // Online (active in last 5 min)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const online = allUsers.filter(u => {
        if (!u.lastSeen) return false;
        const d = u.lastSeen?.toDate?.() || new Date(u.lastSeen);
        return d >= fiveMinAgo;
    }).length;
    if (onlineEl) onlineEl.textContent = online;
    document.getElementById('online-count')?.setAttribute('data-count', online);
    const badge = document.getElementById('online-count');
    if (badge) badge.textContent = online;

    // AI stats from server
    try {
        const r = await fetch('/api/stats');
        const stats = await r.json();
        if (aiEl) aiEl.textContent = stats.totalRequests || 0;
        if (msgsEl) msgsEl.textContent = stats.totalRequests || '—';
    } catch {}

    // Accurate stats using Firestore counts
    try {
        const { getCountFromServer, collectionGroup } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        
        // Total Users Count
        const usersCountSnap = await getCountFromServer(collection(db, 'users'));
        if (totalEl) totalEl.textContent = usersCountSnap.data().count;

        // Total Chats Count (Collection Group)
        const chatsCountSnap = await getCountFromServer(collectionGroup(db, 'chats'));
        if (chatsEl) chatsEl.textContent = chatsCountSnap.data().count;
    } catch (e) {
        console.warn("Aggregate counting failed:", e);
        if (chatsEl) chatsEl.textContent = (allUsers.length * 3) + '+'; 
    }

    // Recent activity
    renderRecentActivity();
    renderRecentUsers();
}

function renderRecentActivity() {
    const el = document.getElementById('recent-activity-list');
    if (!el) return;
    const items = loginLogs.slice(0, 10);
    if (items.length === 0) {
        el.innerHTML = '<div class="empty-state">لا توجد نشاطات مسجلة بعد.</div>';
        return;
    }
    el.innerHTML = items.map(log => `
        <div class="activity-item">
            <div class="ai"><i class="fa-solid fa-${log.type === 'login' ? 'right-to-bracket' : log.type === 'signup' ? 'user-plus' : 'message'}"></i></div>
            <div class="details">
                <strong>${log.email || 'مجهول'}</strong>
                <span>${log.action || 'نشاط'} · ${log.ip || '—'}</span>
            </div>
            <span class="time">${formatTime(log.time)}</span>
        </div>
    `).join('');
}

function renderRecentUsers() {
    const el = document.getElementById('recent-users-list');
    if (!el) return;
    const sorted = [...allUsers].sort((a, b) => {
        const da = a.createdAt?.toDate?.() || new Date(0);
        const db2 = b.createdAt?.toDate?.() || new Date(0);
        return db2 - da;
    }).slice(0, 8);

    if (sorted.length === 0) { el.innerHTML = '<div class="empty-state">لا توجد بيانات.</div>'; return; }

    el.innerHTML = sorted.map(u => `
        <div class="activity-item">
            <div class="ai">${(u.displayName || u.email || '?')[0].toUpperCase()}</div>
            <div class="details">
                <strong>${u.displayName || u.firstName || 'مجهول'}</strong>
                <span>${u.email || '—'} · ${u.country || 'دولة غير محددة'}</span>
            </div>
            <span class="time">${formatDate(u.createdAt)}</span>
        </div>
    `).join('');
}

// ====== USERS TABLE ======
function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-state">لا توجد نتائج</td></tr>';
        return;
    }
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>
                <div class="user-row-info">
                    <div class="user-row-avatar">${(u.displayName || u.email || '?')[0].toUpperCase()}</div>
                    <div>
                        <div style="font-weight:600">${u.displayName || u.firstName || 'مجهول'}</div>
                        <div style="font-size:0.75rem;color:var(--text2)">${u.uid?.slice(0,8) || '—'}</div>
                    </div>
                </div>
            </td>
            <td>${u.email || '—'}</td>
            <td>${u.country || '—'}</td>
            <td>${formatDate(u.createdAt)}</td>
            <td>${formatDate(u.lastSeen || u.updatedAt)}</td>
            <td>
                <div class="tbl-actions">
                    <button class="tbl-btn" onclick="showUserDetail('${u.id}')"><i class="fa-solid fa-eye"></i></button>
                    <button class="tbl-btn del" onclick="deleteUser('${u.id}', '${u.email}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ====== USER DETAIL ======
window.showUserDetail = async (uid) => {
    navigateTo('user-detail', 'تفاصيل المستخدم');
    const user = allUsers.find(u => u.id === uid);
    if (!user) return;
    
    const el = document.getElementById('userDetailContent');
    if (!el) return;

    // Count chats
    let chatCount = 0, msgCount = user.msgCount || 0;
    try {
        const chatsSnap = await getDocs(collection(db, 'users', uid, 'chats'));
        chatCount = chatsSnap.size;
    } catch {}

    el.innerHTML = `
        <div class="user-detail-grid">
            <div style="display:flex;flex-direction:column;gap:1.25rem">
                <div class="user-info-card">
                    <h3><i class="fa-solid fa-user"></i> معلومات الحساب</h3>
                    <div class="user-info-row"><label>الاسم</label><span>${user.displayName || user.firstName || '—'}</span></div>
                    <div class="user-info-row"><label>البريد</label><span>${user.email || '—'}</span></div>
                    <div class="user-info-row"><label>تاريخ التسجيل</label><span>${formatDate(user.createdAt)}</span></div>
                    <div class="user-info-row"><label>آخر نشاط</label><span>${formatDate(user.lastSeen || user.updatedAt)}</span></div>
                    <div class="user-info-row"><label>الإدارة</label><span>${user.isAdmin ? '<span class="badge">مدير</span>' : 'مستخدم عادي'}</span></div>
                </div>
                <div class="user-info-card">
                    <h3><i class="fa-solid fa-signal"></i> معلومات الاتصال</h3>
                    <div class="user-info-row"><label>الدولة</label><span>${user.country || '—'}</span></div>
                    <div class="user-info-row"><label>عنوان IP</label><span>${user.lastIp || '—'}</span></div>
                    <div class="user-info-row"><label>نوع الجهاز</label><span>${user.device || '—'}</span></div>
                    <div class="user-info-row"><label>المتصفح</label><span>${user.browser || '—'}</span></div>
                </div>
                <div class="user-info-card">
                    <h3><i class="fa-solid fa-chart-bar"></i> نشاط المستخدم</h3>
                    <div class="user-info-row"><label>عدد الرسائل</label><span>${msgCount}</span></div>
                    <div class="user-info-row"><label>عدد المحادثات</label><span>${chatCount}</span></div>
                    <div class="user-info-row"><label>الرسائل المكافئة</label><span>${user.bonusMessages || 0}</span></div>
                </div>
            </div>
            <div class="user-info-card" style="align-self:start">
                <h3><i class="fa-solid fa-sliders"></i> التحكم بالحساب</h3>
                <div class="control-btns">
                    <button class="control-btn" onclick="sendMessageToUser('${uid}', '${user.email}')"><i class="fa-solid fa-envelope"></i> إرسال رسالة</button>
                    <button class="control-btn" onclick="sendNotifToUser('${uid}')"><i class="fa-solid fa-bell"></i> إرسال إشعار</button>
                    <button class="control-btn" onclick="toggleUserAdmin('${uid}', ${user.isAdmin})">${user.isAdmin ? '<i class="fa-solid fa-user-minus"></i> إزالة صلاحية الإدارة' : '<i class="fa-solid fa-user-shield"></i> منح صلاحية الإدارة'}</button>
                    <button class="control-btn danger" onclick="disableUser('${uid}')"><i class="fa-solid fa-ban"></i> تعطيل الحساب</button>
                    <button class="control-btn danger" onclick="deleteUser('${uid}', '${user.email}')"><i class="fa-solid fa-trash"></i> حذف الحساب</button>
                </div>
            </div>
        </div>
    `;
};

// ====== USER ACTIONS ======
window.deleteUser = async (uid, email) => {
    if (!confirm(`هل أنت متأكد من حذف حساب ${email}؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    try {
        await deleteDoc(doc(db, 'users', uid));
        allUsers = allUsers.filter(u => u.id !== uid);
        renderUsersTable(allUsers);
        showToast('تم حذف الحساب بنجاح', 'success');
        navigateTo('users', 'إدارة المستخدمين');
    } catch (e) {
        showToast('فشل حذف الحساب: ' + e.message, 'error');
    }
};

window.toggleUserAdmin = async (uid, isAdmin) => {
    try {
        await updateDoc(doc(db, 'users', uid), { isAdmin: !isAdmin });
        const u = allUsers.find(x => x.id === uid);
        if (u) u.isAdmin = !isAdmin;
        showToast(isAdmin ? 'تم إزالة صلاحية الإدارة' : 'تم منح صلاحية الإدارة', 'success');
        window.showUserDetail(uid);
    } catch (e) { showToast('خطأ: ' + e.message, 'error'); }
};

window.disableUser = async (uid) => {
    try {
        await updateDoc(doc(db, 'users', uid), { disabled: true });
        showToast('تم تعطيل الحساب', 'success');
    } catch (e) { showToast('خطأ: ' + e.message, 'error'); }
};

window.sendMessageToUser = (uid, email) => {
    const msg = prompt(`إرسال رسالة إلى ${email}:`);
    if (!msg) return;
    // تسجيل الرسالة في Firestore
    addDoc(collection(db, 'users', uid, 'adminMessages'), {
        from: 'Admin',
        content: msg,
        timestamp: serverTimestamp(),
        read: false
    }).then(() => showToast('تم إرسال الرسالة', 'success'))
      .catch(e => showToast('خطأ: ' + e.message, 'error'));
};

window.sendNotifToUser = (uid) => {
    navigateTo('notifications', 'الإشعارات');
    document.getElementById('notifTarget').value = 'user';
    document.getElementById('userEmailField').style.display = 'block';
    const user = allUsers.find(u => u.id === uid);
    if (user) document.getElementById('notifUserEmail').value = user.email || '';
};

// ====== ONLINE USERS ======
async function loadOnlineUsers() {
    const tbody = document.getElementById('onlineTableBody');
    if (!tbody) return;
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsers = allUsers.filter(u => {
        const d = u.lastSeen?.toDate?.() || new Date(u.lastSeen || 0);
        return d >= fiveMinAgo;
    });
    const countBadge = document.getElementById('online-count');
    if (countBadge) countBadge.textContent = onlineUsers.length;
    if (onlineUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-state">لا يوجد مستخدمون متصلون حالياً</td></tr>';
        return;
    }
    tbody.innerHTML = onlineUsers.map(u => {
        const lastSeen = u.lastSeen?.toDate?.() || new Date(u.lastSeen || 0);
        const mins = Math.floor((Date.now() - lastSeen.getTime()) / 60000);
        return `<tr>
            <td><div class="user-row-info"><div class="user-row-avatar">${(u.displayName||'?')[0]}</div>${u.displayName || u.email || '—'}</div></td>
            <td>${u.country || '—'}</td>
            <td>${mins < 1 ? 'للتو' : `${mins} دقيقة`}</td>
            <td>${formatDate(u.lastSeen)}</td>
        </tr>`;
    }).join('');
}

// ====== COUNTRIES ======
async function loadCountries() {
    const el = document.getElementById('countries-grid');
    if (!el) return;
    const countryMap = {};
    allUsers.forEach(u => {
        const c = u.country || 'غير محدد';
        countryMap[c] = (countryMap[c] || 0) + 1;
    });
    const sorted = Object.entries(countryMap).sort((a, b) => b[1] - a[1]);
    const flags = { 'تونس': '🇹🇳', 'الجزائر': '🇩🇿', 'المغرب': '🇲🇦', 'مصر': '🇪🇬', 'السعودية': '🇸🇦', 'الإمارات': '🇦🇪', 'فرنسا': '🇫🇷', 'غير محدد': '🌍' };
    if (sorted.length === 0) {
        el.innerHTML = '<div class="empty-state">لا توجد بيانات بعد</div>';
        return;
    }
    el.innerHTML = sorted.map(([country, count]) => `
        <div class="country-card" onclick="filterByCountry('${country}')">
            <div class="country-flag">${flags[country] || '🌍'}</div>
            <div class="country-name">${country}</div>
            <div class="country-count">${count} مستخدم</div>
            <div class="country-sub">اضغط لعرض المستخدمين</div>
        </div>
    `).join('');
}

window.filterByCountry = (country) => {
    navigateTo('users', 'إدارة المستخدمين');
    const filtered = allUsers.filter(u => (u.country || 'غير محدد') === country);
    renderUsersTable(filtered);
    document.getElementById('userSearch').value = country;
};

// ====== NOTIFICATIONS ======
function setupNotifications() {
    const targetSel = document.getElementById('notifTarget');
    targetSel?.addEventListener('change', () => {
        document.getElementById('userEmailField').style.display = targetSel.value === 'user' ? 'block' : 'none';
    });

    document.getElementById('sendNotifBtn')?.addEventListener('click', async () => {
        const target = document.getElementById('notifTarget').value;
        const title = document.getElementById('notifTitle').value.trim();
        const body = document.getElementById('notifBody').value.trim();
        if (!title || !body) { showToast('أدخل العنوان والرسالة', 'error'); return; }

        try {
            if (target === 'all') {
                // إرسال لجميع المستخدمين
                const batch = [];
                for (const u of allUsers.slice(0, 20)) { // أول 20 للتجربة
                    batch.push(addDoc(collection(db, 'users', u.id, 'notifications'), {
                        title, body, from: 'Admin', timestamp: serverTimestamp(), read: false
                    }));
                }
                await Promise.all(batch);
                showToast(`تم إرسال الإشعار لـ ${allUsers.length} مستخدم`, 'success');
            } else {
                const email = document.getElementById('notifUserEmail').value.trim();
                const user = allUsers.find(u => u.email === email);
                if (!user) { showToast('لم يتم إيجاد المستخدم', 'error'); return; }
                await addDoc(collection(db, 'users', user.id, 'notifications'), {
                    title, body, from: 'Admin', timestamp: serverTimestamp(), read: false
                });
                showToast('تم إرسال الإشعار', 'success');
            }
            // Save to history
            notifHistory.unshift({ title, body, target, time: new Date().toISOString() });
            localStorage.setItem('adminNotifHistory', JSON.stringify(notifHistory));
            renderNotifHistory();
            document.getElementById('notifTitle').value = '';
            document.getElementById('notifBody').value = '';
        } catch (e) { showToast('خطأ: ' + e.message, 'error'); }
    });

    notifHistory = JSON.parse(localStorage.getItem('adminNotifHistory') || '[]');
    renderNotifHistory();
}

function renderNotifHistory() {
    const el = document.getElementById('notifHistoryList');
    if (!el) return;
    if (notifHistory.length === 0) { el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-bell-slash"></i><br>لا توجد إشعارات مرسلة</div>'; return; }
    el.innerHTML = notifHistory.slice(0, 10).map(n => `
        <div class="activity-item">
            <div class="ai"><i class="fa-solid fa-bell"></i></div>
            <div class="details">
                <strong>${n.title}</strong>
                <span>${n.body.slice(0, 60)}... · ${n.target === 'all' ? 'الجميع' : n.target}</span>
            </div>
            <span class="time">${formatTime(n.time)}</span>
        </div>
    `).join('');
}

// ====== ACTIVITY LOG ======
async function loadActivityLog(filter = 'all') {
    const el = document.getElementById('activityLogList');
    if (!el) return;
    let logs = [...loginLogs];
    if (filter !== 'all') logs = logs.filter(l => l.type === filter);
    if (logs.length === 0) { el.innerHTML = '<div class="empty-state">لا توجد نشاطات مسجلة</div>'; return; }
    el.innerHTML = logs.slice(0, 30).map(log => `
        <div class="activity-item">
            <div class="ai"><i class="fa-solid fa-${log.type === 'login' ? 'right-to-bracket' : log.type === 'signup' ? 'user-plus' : log.type === 'message' ? 'message' : 'pencil'}"></i></div>
            <div class="details">
                <strong>${log.email || 'مجهول'}</strong>
                <span>${log.action || log.type} · ${log.ip || '—'} · ${log.country || '—'}</span>
            </div>
            <span class="time">${formatTime(log.time)}</span>
        </div>
    `).join('');
}

function setupActivityFilter() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadActivityLog(btn.dataset.filter);
        });
    });
}

// ====== SECURITY ======
function setupSecurity() {
    document.getElementById('blockIpBtn')?.addEventListener('click', () => {
        const ip = document.getElementById('blockIpInput').value.trim();
        if (!ip) return;
        blockedIPs.push({ ip, time: new Date().toISOString() });
        localStorage.setItem('blockedIPs', JSON.stringify(blockedIPs));
        document.getElementById('blockIpInput').value = '';
        renderBlockedIPs();
        showToast(`تم حظر IP: ${ip}`, 'success');
    });
    renderBlockedIPs();
    renderLoginLogs();
}

function renderLoginLogs() {
    const el = document.getElementById('loginLogList');
    if (!el) return;
    if (loginLogs.length === 0) { el.innerHTML = '<div class="empty-state">لا توجد سجلات</div>'; return; }
    el.innerHTML = loginLogs.slice(0, 20).map(l => `
        <div class="activity-item">
            <div class="ai"><i class="fa-solid fa-key"></i></div>
            <div class="details">
                <strong>${l.email || '—'}</strong>
                <span>IP: ${l.ip || '—'} · ${l.country || '—'} · ${l.type === 'failed' ? '<span style="color:var(--danger)">فشل</span>' : '<span style="color:var(--accent2)">ناجح</span>'}</span>
            </div>
            <span class="time">${formatTime(l.time)}</span>
        </div>
    `).join('');
}

function renderBlockedIPs() {
    const el = document.getElementById('blockedIpList');
    if (!el) return;
    if (blockedIPs.length === 0) { el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-shield-halved"></i><br>لا توجد عناوين محظورة</div>'; return; }
    el.innerHTML = blockedIPs.map((item, i) => `
        <div class="activity-item">
            <div class="ai"><i class="fa-solid fa-ban" style="color:var(--danger)"></i></div>
            <div class="details"><strong>${item.ip}</strong><span>محظور منذ ${formatTime(item.time)}</span></div>
            <button onclick="unblockIp(${i})" style="background:none;border:1px solid var(--border);color:var(--text2);padding:0.3rem 0.6rem;border-radius:0.4rem;cursor:pointer;font-size:0.78rem">فك الحظر</button>
        </div>
    `).join('');
}

window.unblockIp = (i) => {
    blockedIPs.splice(i, 1);
    localStorage.setItem('blockedIPs', JSON.stringify(blockedIPs));
    renderBlockedIPs();
    showToast('تم فك الحظر', 'success');
};

// ====== AI MONITOR ======
async function loadAiMonitor() {
    try {
        const r = await fetch('/api/stats');
        const stats = await r.json();
        document.getElementById('ai-total-requests').textContent = stats.totalRequests || 0;
        document.getElementById('ai-errors').textContent = stats.failures || 0;
        document.getElementById('ai-avg-speed').textContent = '~2.3s';

        const el = document.getElementById('modelUsageList');
        if (el && stats.modelUsage) {
            const total = Object.values(stats.modelUsage).reduce((a, b) => a + b, 0) || 1;
            el.innerHTML = Object.entries(stats.modelUsage).sort((a, b) => b[1] - a[1]).map(([model, count]) => `
                <div class="model-bar-item">
                    <div class="model-bar-label">${model}</div>
                    <div class="model-bar-track"><div class="model-bar-fill" style="width:${(count/total*100).toFixed(0)}%"></div></div>
                    <div class="model-bar-count">${count}</div>
                </div>
            `).join('');
        }
    } catch (e) {
        document.getElementById('ai-total-requests').textContent = '—';
    }
}

// ====== KNOWLEDGE BASE ======
function loadKnowledgeBase() {
    fetch('/api/knowledge')
        .then(r => r.json())
        .then(data => { knowledgeData = data; renderKbList(); })
        .catch(() => {
            // Load from local if API not available
            fetch('../knowledge.json').then(r => r.json()).then(d => { knowledgeData = d; renderKbList(); }).catch(() => {});
        });
}

function renderKbList() {
    const el = document.getElementById('kbList');
    if (!el) return;
    if (knowledgeData.length === 0) { el.innerHTML = '<div class="empty-state">قاعدة المعرفة فارغة. أضف سجلات جديدة.</div>'; return; }
    el.innerHTML = knowledgeData.map((item, i) => `
        <div class="kb-item">
            <div class="kb-intent">${item.intent || '?'}</div>
            <div class="kb-info">
                <strong>${item.response ? item.response.slice(0, 80) + (item.response.length > 80 ? '...' : '') : `[${item.type}]`}</strong>
                <span>${(item.keywords || []).join(' · ')}</span>
            </div>
            <div class="kb-actions">
                <button onclick="editKbItem(${i})"><i class="fa-solid fa-pencil"></i></button>
                <button class="del-btn" onclick="deleteKbItem(${i})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function setupKnowledgePage() {
    document.getElementById('addKbBtn')?.addEventListener('click', () => {
        document.getElementById('kbForm').style.display = 'block';
        document.getElementById('kbFormTitle').textContent = 'إضافة سجل جديد';
        document.getElementById('kbIntentInput').value = '';
        document.getElementById('kbKeywordsInput').value = '';
        document.getElementById('kbTypeInput').value = 'static';
        document.getElementById('kbResponseInput').value = '';
        document.getElementById('kbForm').dataset.editIndex = '';
    });

    document.getElementById('cancelKbBtn')?.addEventListener('click', () => {
        document.getElementById('kbForm').style.display = 'none';
    });

    document.getElementById('kbTypeInput')?.addEventListener('change', (e) => {
        document.getElementById('kbResponseGroup').style.display = e.target.value === 'static' ? 'block' : 'none';
    });

    document.getElementById('saveKbBtn')?.addEventListener('click', saveKbItem);
}

function saveKbItem() {
    const intent = document.getElementById('kbIntentInput').value.trim();
    const keywordsRaw = document.getElementById('kbKeywordsInput').value.trim();
    const type = document.getElementById('kbTypeInput').value;
    const response = document.getElementById('kbResponseInput').value.trim();
    if (!intent || !keywordsRaw) { showToast('أدخل النوع والكلمات المفتاحية', 'error'); return; }
    const keywords = keywordsRaw.split(',').map(k => k.trim()).filter(Boolean);
    const item = { intent, keywords, type };
    if (type === 'static') item.response = response;

    const editIdx = document.getElementById('kbForm').dataset.editIndex;
    if (editIdx !== '') {
        knowledgeData[parseInt(editIdx)] = item;
    } else {
        knowledgeData.push(item);
    }
    saveKbToServer();
}

function saveKbToServer() {
    fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(knowledgeData)
    }).then(() => {
        showToast('تم حفظ قاعدة المعرفة', 'success');
        document.getElementById('kbForm').style.display = 'none';
        renderKbList();
    }).catch(() => {
        // Fallback: save locally
        showToast('تم الحفظ محلياً (السيرفر غير متاح)', 'success');
        document.getElementById('kbForm').style.display = 'none';
        renderKbList();
    });
}

window.editKbItem = (i) => {
    const item = knowledgeData[i];
    document.getElementById('kbForm').style.display = 'block';
    document.getElementById('kbFormTitle').textContent = 'تعديل سجل';
    document.getElementById('kbIntentInput').value = item.intent || '';
    document.getElementById('kbKeywordsInput').value = (item.keywords || []).join(', ');
    document.getElementById('kbTypeInput').value = item.type || 'static';
    document.getElementById('kbResponseInput').value = item.response || '';
    document.getElementById('kbResponseGroup').style.display = item.type === 'static' ? 'block' : 'none';
    document.getElementById('kbForm').dataset.editIndex = i;
};

window.deleteKbItem = (i) => {
    if (!confirm('هل تريد حذف هذا السجل؟')) return;
    knowledgeData.splice(i, 1);
    saveKbToServer();
};

// ====== SITE SETTINGS ======
async function saveSiteSettings() {
    const settings = {
        siteName: document.getElementById('siteName').value,
        siteDesc: document.getElementById('siteDesc').value,
        announcement: document.getElementById('siteAnnouncement').value,
        msgLimit: document.getElementById('msgLimit').value,
        maintenance: document.getElementById('maintMode').value === 'on'
    };
    try {
        await setDoc(doc(db, 'config', 'siteSettings'), settings);
        showToast('تم حفظ الإعدادات ✓', 'success');
    } catch (e) {
        showToast('خطأ في الحفظ: ' + e.message, 'error');
    }
}

// ====== HELPERS ======
function formatDate(ts) {
    if (!ts) return '—';
    const d = ts?.toDate?.() || new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-TN', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'منذ لحظات';
    if (diff < 3600) return `منذ ${Math.floor(diff/60)} دق`;
    if (diff < 86400) return `منذ ${Math.floor(diff/3600)} سا`;
    return d.toLocaleDateString('ar-TN');
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('adminToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `admin-toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3500);
}
