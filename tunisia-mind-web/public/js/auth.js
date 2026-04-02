// auth.js — Firebase Authentication with Conversational Signup and Email Code Verification
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    updateEmail,
    updateProfile,
    onAuthStateChanged,
    signOut,
    reload,
    browserLocalPersistence,
    setPersistence
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    getFirestore,
    doc, setDoc, getDoc, updateDoc, deleteDoc,
    collection, addDoc, serverTimestamp,
    query, orderBy, getDocs, where, increment
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// Ensure auth state persists across page reloads
setPersistence(auth, browserLocalPersistence).catch(e => console.warn('Persistence warning:', e));

window.firebaseAuth = auth;
window.firebaseDb = db;
window.fsCore = { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp, query, orderBy, getDocs, where, increment };
window.tmLogout = () => {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
};

window.confirmFinalLogout = async () => {
    try {
        if (window.closeModals) window.closeModals();
        await signOut(auth);
    } catch (e) {
        console.error("Sign out error, attempting to clear storage and reload.", e);
    }

    // Clear everything regardless of signOut success or failure
    sessionStorage.clear();
    localStorage.clear();

    // Redirect to the root to ensure a full, clean reload
    window.location.href = '/';
};

// Initial listener for the custom modal buttons
const setupModalButtons = () => {
    document.getElementById('confirmLogoutBtn')?.addEventListener('click', window.confirmFinalLogout);
    document.getElementById('cancelLogoutBtn')?.addEventListener('click', () => {
        const modal = document.getElementById('logoutModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupModalButtons);
} else {
    setupModalButtons();
}

window.firebaseSignOut = window.tmLogout;

// ربط جميع أزرار تسجيل الخروج
const attachAllLogoutButtons = () => {
    // البحث عن جميع أزرار الخروج المحتملة
    const buttons = ['mainLogoutBtn', 'sidebarLogoutBtn'];

    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            // إزالة onclick القديم لتجنب التكرار
            btn.removeAttribute('onclick');
            // إضافة مستمع حدث جديد ومستقل
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.tmLogout();
                return false;
            };
        }
    });
};

// تشغيل الدالة عند تحميل الصفحة للتأكد من وجود الأزرار في الـ DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachAllLogoutButtons);
} else {
    attachAllLogoutButtons();
}
// محاولات إضافية في حال تأخر تحميل جزء من الصفحة
setTimeout(attachAllLogoutButtons, 1000);
setTimeout(attachAllLogoutButtons, 3000);

window.currentUser = null;
window.currentUserProfile = {};
window.showToast = showToast;
window.loadUserProfile = loadUserProfile;
window.uploadPhotoAndGetURL = uploadPhotoAndGetURL;

// ---- Helpers ----
function showForm(id) {
    ['loginForm', 'signupForm', 'verificationForm', 'forgotForm'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.style.display = f === id ? 'block' : 'none';
    });
    if (id === 'signupForm' || id === 'registerForm') {
        const inviterName = sessionStorage.getItem('inviterName');
        const banner = document.getElementById('referralBanner');
        if (inviterName && banner) {
            banner.style.display = 'block';
            banner.innerHTML = `🌟 أنت تقبل دعوة صديقك <b>${inviterName}</b> للانضمام!`;
        }
    }
}
window.showForm = showForm;

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3500);
}

function showAuthModal() {
    if (document.getElementById('splashScreen')) return;
    const m = document.getElementById('authModal');
    if (m) { m.style.display = 'flex'; m.classList.add('active'); }
}
function hideAuthModal() {
    const m = document.getElementById('authModal');
    if (m) { m.style.display = 'none'; m.classList.remove('active'); }
}
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;

async function saveUserProfile(user, extras = {}) {
    try {
        const photoURL = user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(extras.firstName || user.displayName || 'U')}`;
        const data = {
            uid: user.uid,
            email: user.email,
            firstName: extras.firstName || '',
            lastName: extras.lastName || '',
            displayName: extras.displayName || user.displayName || '',
            age: extras.age || '',
            photoURL: extras.photoURL || photoURL,
            bonusMessages: 20,
            totalReferrals: 0,
            msgCount: 0,
            msgResetAt: Date.now() + 3600000,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', user.uid), data, { merge: true });
        window.currentUserProfile = data;
    } catch (e) {
        console.error("Error saving profile:", e);
    }
}

async function loadUserProfile(uid) {
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
            window.currentUserProfile = snap.data() || {};
            const avatar = window.currentUserProfile.photoBase64 || window.currentUserProfile.photoURL;
            const sidebarAvatar = document.getElementById('sidebarAvatar');
            if (sidebarAvatar && avatar) sidebarAvatar.src = avatar;
            if (avatar) window.currentUserProfile.photoURL = avatar;
            return snap.data();
        }
    } catch (e) { console.error("Load profile error:", e); }
    return {};
}

async function uploadPhotoAndGetURL(uid, base64DataUrl) {
    if (!base64DataUrl || !base64DataUrl.startsWith('data:')) return null;
    try {
        const compressed = await compressImageToBase64(base64DataUrl, 150, 0.7);
        if (uid && window.firebaseDb) {
            await setDoc(doc(db, 'users', uid), { photoBase64: compressed, updatedAt: serverTimestamp() }, { merge: true });
        }
        return compressed;
    } catch (e) {
        console.error('Photo compress error:', e);
        return null;
    }
}

function compressImageToBase64(dataUrl, maxSize = 150, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// ---- Standard Signup Logic ----
let signupPhotoBase64 = null;
// Flag to prevent onAuthStateChanged from redirecting during signup process
let isSigningUp = false;

async function handleStandardSignup(e) {
    if (e) e.preventDefault();

    const firstName = document.getElementById('signupFirstName').value.trim();
    const lastName = document.getElementById('signupLastName').value.trim();
    const age = document.getElementById('signupAge').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;

    if (!firstName) { showToast('يرجى إدخال الاسم الأول.', 'error'); return; }
    if (!lastName) { showToast('يرجى إدخال اللقب.', 'error'); return; }
    if (!age) { showToast('يرجى إدخال العمر.', 'error'); return; }
    if (!email) { showToast('يرجى إدخال البريد الإلكتروني.', 'error'); return; }
    if (!password) { showToast('يرجى إدخال كلمة المرور.', 'error'); return; }

    if (password.length < 8) {
        showToast('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'error');
        return;
    }

    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
        signupBtn.disabled = true;
        signupBtn.classList.add('loading');
    }

    try {
        await signUpWithEmail(email, password, firstName, lastName, age, signupPhotoBase64);
    } finally {
        if (signupBtn) {
            signupBtn.disabled = false;
            signupBtn.classList.remove('loading');
        }
    }
}

// ---- Email Verification Logic ----
async function requestEmailVerificationCode(uid, email) {
    try {
        // تصحيح الرابط ليتطابق مع server.js
        const response = await fetch('/api/auth/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, type: 'verification' })
        });
        const result = await response.json();
        if (response.ok) {
            console.log("Verification Code sent/generated.");
            return true;
        } else {
            console.warn("Backend email error:", result);
            return false;
        }
    } catch (err) {
        console.error("Verification endpoint error:", err);
        return false;
    }
}

async function verifyEmailCode(email, code) {
    try {
        const response = await fetch('/api/auth/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, type: 'verification' })
        });
        return response.ok;
    } catch (err) {
        console.error("Verification endpoint error:", err);
        return false;
    }
}

// ---- Listeners ----
onAuthStateChanged(auth, async (user) => {
    if (isSigningUp) return;

    if (user) {
        const isGoogleUser = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
        
        // Hide password section in settings if Google user
        const passDivider = document.getElementById('passwordSettingsDivider');
        const passSection = document.getElementById('passwordSettingsSection');
        if (passDivider) passDivider.style.display = isGoogleUser ? 'none' : 'block';
        if (passSection) passSection.style.display = isGoogleUser ? 'none' : 'block';

        try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            window.currentUser = user;
            const profile = snap.exists() ? snap.data() : {};
            window.currentUserProfile = profile;
            const displayName = profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : (user.displayName || user.email.split('@')[0]);
            document.getElementById('userNameDisplay').textContent = displayName;

            const avatar = profile.photoBase64 || profile.photoURL || user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
            const sidebarAvatar = document.getElementById('sidebarAvatar');
            if (sidebarAvatar) sidebarAvatar.src = avatar;
            window.currentUserProfile.photoURL = avatar;

            const banner = document.getElementById('unverifiedBanner');
            if (banner) banner.style.display = 'none';
        } catch (dbError) {
            console.warn("Could not fetch user profile from DB (permission/network):", dbError);
            window.currentUser = user;
            window.currentUserProfile = { email: user.email, isEmailVerified: true };
            document.getElementById('userNameDisplay').textContent = user.email.split('@')[0];
        }

        hideAuthModal();
        if (window.loadChatHistory) window.loadChatHistory();
    } else {
        window.currentUser = null;
        window.currentUserProfile = {};
        showForm('loginForm');
        showAuthModal();
        const banner = document.getElementById('unverifiedBanner');
        if (banner) banner.style.display = 'none';
    }
});

async function signUpWithEmail(email, password, firstName, lastName, age, photoBase64) {
    // Block onAuthStateChanged from interfering during signup
    isSigningUp = true;
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        let photoURL = null;
        if (photoBase64) {
            photoURL = await uploadPhotoAndGetURL(user.uid, photoBase64);
        }

        const displayName = `${firstName} ${lastName}`.trim();
        await updateProfile(user, { displayName, photoURL: photoURL || undefined });

        // Save user profile — always set isEmailVerified to true now
        const profileData = {
            uid: user.uid,
            email: user.email,
            firstName, lastName, displayName,
            age: parseInt(age) || 0,
            photoURL: photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firstName)}`,
            bonusMessages: 20,
            totalReferrals: 0,
            msgCount: 0,
            msgResetAt: Date.now() + 3600000,
            isEmailVerified: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        try {
            // انتظار ثانية واحدة لمعالجة تزامن الصلاحيات بعد الإنشاء
            await new Promise(r => setTimeout(r, 1000));
            await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
        } catch (dbErr) {
            console.warn("تنبيه: تعذر حفظ ملف المستخدم في قاعدة البيانات (Firestore). سيتم إعادة المحاولة...", dbErr);
            try {
                await new Promise(r => setTimeout(r, 2000));
                await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
            } catch (retryErr) {
                console.error("فشل نهائي في حفظ الملف.", retryErr);
            }
        }

        // Force UI state update
        window.currentUser = user;
        window.currentUserProfile = profileData;
        document.getElementById('userNameDisplay').textContent = displayName;
        const sidebarAvatar = document.getElementById('sidebarAvatar');
        if (sidebarAvatar) sidebarAvatar.src = profileData.photoURL;

        // Credit referral if exists (don't let errors here block the flow)
        try { if (window.creditReferral) await window.creditReferral(user.uid); } catch (refErr) { console.warn('Referral error (non-fatal):', refErr); }

        // No more login modal, but trigger verification modal now
        hideAuthModal();

        if (window.loadChatHistory) window.loadChatHistory();
        showToast('تم إنشاء الحساب بنجاح! أهلاً بك.', 'success');

        // Release the lock AFTER UI is set, so onAuthStateChanged won't override verificationForm
        isSigningUp = false;
        signupPhotoBase64 = null; // Reset photo

        // Authentication complete, UI updated
    } catch (error) {
        // SMART RESUME: If email is "already in use", try to sign in and complete profile
        if (error.code === 'auth/email-already-in-use') {
            try {
                const loginResult = await signInWithEmailAndPassword(auth, email, password);
                const user = loginResult.user;
                console.log("Resume signup: User signed in, completing profile...");

                let photoURL = null;
                if (photoBase64) { photoURL = await uploadPhotoAndGetURL(user.uid, photoBase64); }
                const displayName = `${firstName} ${lastName}`.trim();
                await updateProfile(user, { displayName, photoURL: photoURL || undefined });

                const profileData = {
                    uid: user.uid, email: user.email, firstName, lastName, displayName,
                    age: parseInt(age) || 0,
                    photoURL: photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firstName)}`,
                    isEmailVerified: true, updatedAt: serverTimestamp()
                };
                try {
                    await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
                } catch (dbErr) { }

                // Force UI state update
                window.currentUser = user;
                window.currentUserProfile = profileData;
                document.getElementById('userNameDisplay').textContent = displayName;
                const sidebarAvatar = document.getElementById('sidebarAvatar');
                if (sidebarAvatar) sidebarAvatar.src = profileData.photoURL;

                hideAuthModal();
                if (window.loadChatHistory) window.loadChatHistory();
                showToast('أهلاً بعودتك! تم تحديث بياناتك.', 'success');

                isSigningUp = false;
                return;
            } catch (loginErr) {
                // If sign in fails, fall through to the standard "already in use" error
            }
        }

        let msg = `خطأ: ${error.message}`;
        if (error.code === 'auth/email-already-in-use') msg = 'هذا البريد مسجل مسبقاً بكلمة مرور مختلفة أو حساب آخر.';
        if (error.code === 'auth/weak-password') msg = 'كلمة المرور ضعيفة جداً.';
        if (error.code === 'auth/invalid-email') msg = 'البريد الإلكتروني غير صحيح.';
        showToast(msg, 'error');
        isSigningUp = false; // Release lock on error too
        signupPhotoBase64 = null;
    }
}

async function loginWithEmail(email, password) {
    if (!email || !password) { showToast('يرجى إدخال البريد وكلمة المرور', 'error'); return; }
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        let msg = 'فشل تسجيل الدخول. تأكد من البيانات.';
        if (error.code === 'auth/user-not-found') msg = 'المستخدم غير موجود.';
        if (error.code === 'auth/wrong-password') msg = 'كلمة المرور خاطئة.';
        if (error.code === 'auth/invalid-credential') msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
        if (error.code === 'auth/network-request-failed') msg = 'فشل الاتصال بالإنترنت.';
        showToast(msg, 'error');
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
        }
    }
}

async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/user.birthday.read');
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const snap = await getDoc(doc(db, 'users', user.uid));
        
        if (!snap.exists()) {
            let userAge = 18; // العمر الافتراضي
            
            // جلب العمر من Google People API
            try {
                const credential = GoogleAuthProvider.credentialFromResult(result);
                if (credential && credential.accessToken) {
                    const res = await fetch('https://people.googleapis.com/v1/people/me?personFields=birthdays', {
                        headers: { Authorization: `Bearer ${credential.accessToken}` }
                    });
                    const data = await res.json();
                    if (data.birthdays && data.birthdays.length > 0) {
                        const bDate = data.birthdays[0].date;
                        if (bDate && bDate.year) {
                            userAge = new Date().getFullYear() - bDate.year;
                        }
                    }
                }
            } catch (err) {
                console.warn('تعذر جلب العمر من جوجل:', err);
            }

            const nameParts = (user.displayName || '').split(' ');
            const firstName = nameParts[0] || 'مستخدم';
            const lastName = nameParts.slice(1).join(' ') || 'جوجل';

            const profileData = {
                uid: user.uid,
                email: user.email,
                firstName: firstName,
                lastName: lastName,
                displayName: user.displayName || user.email.split('@')[0],
                age: userAge,
                photoURL: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firstName)}`,
                isEmailVerified: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
            window.currentUserProfile = profileData;
        } else {
            window.currentUserProfile = snap.data();
        }
        
        hideAuthModal();
        if (window.loadChatHistory) window.loadChatHistory();
    } catch (error) {
        console.error('Google Login Error:', error);
        if (error.code === 'auth/unauthorized-domain') {
            showToast('نطاق الموقع الحالي غير مصرح به في Firebase. يرجى إضافته في الإعدادات.', 'error');
        } else if (error.code === 'auth/popup-blocked') {
            showToast('تم حظر النافذة المنبثقة من المتصفح. يرجى تعطيل مانع النوافذ.', 'error');
        } else if (error.code !== 'auth/popup-closed-by-user') {
            showToast(`فشل الدخول بـ Google: ${error.message}`, 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Standard Signup events
    document.getElementById('signupBtn')?.addEventListener('click', handleStandardSignup);

    document.getElementById('signupPhoto')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            signupPhotoBase64 = ev.target.result;
            const preview = document.getElementById('avatarPreview');
            if (preview) preview.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('showSignup')?.addEventListener('click', (e) => { e.preventDefault(); showForm('signupForm'); });
    document.getElementById('showLogin')?.addEventListener('click', (e) => { e.preventDefault(); showForm('loginForm'); });
    document.getElementById('showForgot')?.addEventListener('click', (e) => {
        e.preventDefault();
        const st1 = document.getElementById('forgotStep1'); if (st1) st1.style.display = 'block';
        const st2 = document.getElementById('forgotStep2'); if (st2) st2.style.display = 'none';
        const st3 = document.getElementById('forgotStep3'); if (st3) st3.style.display = 'none';
        window.tempResetToken = null;
        showForm('forgotForm');
    });
    document.getElementById('backToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.currentUser) {
            hideAuthModal();
        } else {
            showForm('loginForm');
        }
    });

    // Standard Signup events (Disabled as requested)
    // document.getElementById('signupBtn')?.addEventListener('click', handleStandardSignup);

    // Email/Password login (Disabled as requested)
    // document.getElementById('loginBtn')?.addEventListener('click', (e) => { ... });

    document.getElementById('googleLoginBtn')?.addEventListener('click', loginWithGoogle);
    // document.getElementById('googleSignupBtn')?.addEventListener('click', loginWithGoogle);

    // --- Verification Logic ---
    document.getElementById('verifyNowBtn')?.addEventListener('click', () => {
        if (!window.currentUser) return;
        const modal = document.getElementById('verificationModal');
        const emailDiv = document.getElementById('vEmailDisplay');
        if (emailDiv) emailDiv.textContent = window.currentUser.email;
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('vStep1').style.display = 'block';
            document.getElementById('vStep2').style.display = 'none';
        }
    });

    document.getElementById('closeVModalBtn')?.addEventListener('click', () => {
        document.getElementById('verificationModal').style.display = 'none';
    });

    document.getElementById('vSendCodeBtn')?.addEventListener('click', async (e) => {
        if (e) e.preventDefault(); // منع تحديث الصفحة أو إرسال النموذج تلقائياً
        console.log("تم ضغط زر إرسال الكود");

        const btn = document.getElementById('vSendCodeBtn');
        if (btn.disabled) return;

        btn.disabled = true;
        btn.classList.add('loading');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            const r = await fetch('/api/auth/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: window.currentUser.email, type: 'verification' })
            });
            const data = await r.json();
            if (r.ok) {
                showToast(data.message || `تم إرسال كود جديد. يرجى استخدام أحدث رسالة وصلتك.`, 'success');
                document.getElementById('vStep1').style.display = 'none';
                document.getElementById('vStep2').style.display = 'block';
            } else {
                showToast(data.error || 'فشل إرسال الكود', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('فشل الإرسال، تحقق من الإنترنت', 'error');
        }
        finally {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.innerHTML = originalText;
        }
    });
    document.getElementById('vBackBtn')?.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        document.getElementById('vStep2').style.display = 'none';
        document.getElementById('vStep1').style.display = 'block';
    });
    document.getElementById('vConfirmBtn')?.addEventListener('click', async (e) => {
        if (e) e.preventDefault(); // منع تحديث الصفحة

        const code = document.getElementById('vCodeInput').value.trim();
        if (code.length !== 6) return showToast('أدخل كود من 6 أرقام', 'error');

        const btn = document.getElementById('vConfirmBtn');
        if (btn.disabled) return;
        btn.disabled = true;
        btn.classList.add('loading');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';

        try {
            const r = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: window.currentUser.email, code, type: 'verification' })
            });
            const data = await r.json();

            if (r.ok) {
                window.currentUserProfile.isEmailVerified = true;
                
                // تحديث حالة التوثيق مباشرة من الواجهة الأمامية للمستخدم (Frontend)
                const { doc, setDoc } = window.fsCore;
                try {
                    await setDoc(doc(window.firebaseDb, 'users', window.currentUser.uid), { isEmailVerified: true }, { merge: true });
                } catch (dbErr) {
                    console.warn("تنبيه: تعذر تحديث قاعدة البيانات من الواجهة:", dbErr);
                }

                document.getElementById('unverifiedBanner').style.display = 'none';
                document.getElementById('verificationModal').style.display = 'none';
                showToast('تم توثيق الحساب بنجاح ✓', 'success');
            } else {
                showToast(data.error || 'الكود غير صحيح', 'error');
            }
        } catch (e) {
            console.error("Verification process error:", e);
            showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
        }
        finally {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('loading');
                btn.innerHTML = originalText; // استعادة النص الأصلي وإلغاء الدوران
            }
        }
    });

    // --- Forgot Password Logic (Via Firebase Built-in) ---
    document.getElementById('btnSendForgotCode')?.addEventListener('click', async (e) => {
        if (e) e.preventDefault();

        const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
        if (!email) return showToast('أدخل البريد الإلكتروني', 'error');

        const btn = document.getElementById('btnSendForgotCode');
        if (btn.disabled) return;

        btn.disabled = true;
        btn.classList.add('loading');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإرسال...';

        try {
            await sendPasswordResetEmail(auth, email);
            showToast('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك. يرجى تفقد صندوق الوارد.', 'success');
            setTimeout(() => {
                showForm('loginForm');
            }, 3000);
        } catch (e) {
            console.error('Password Reset Error:', e);
            if (e.code === 'auth/user-not-found') {
                showToast('الحساب غير موجود.', 'error');
            } else {
                showToast('فشل الإرسال. يرجى التأكد من صحة البريد.', 'error');
            }
        } finally {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.innerHTML = originalText;
        }
    });

    document.getElementById('accountResetPasswordBtn')?.addEventListener('click', () => {
        if (window.closeModals) window.closeModals();
        showAuthModal();
        showForm('forgotForm');

        const forgotEmail = document.getElementById('forgotEmail');
        if (forgotEmail) {
            forgotEmail.value = window.currentUser?.email || '';
            // محاكاة الضغط لإرسال الكود مباشرة بدلاً من ترك المستخدم يضغط مرة أخرى
            const sendCodeBtn = document.getElementById('btnSendForgotCode');
            if (sendCodeBtn) {
                sendCodeBtn.click();
            }
        }
    });
});
