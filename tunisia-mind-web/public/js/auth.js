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
    const buttons = ['mainLogoutBtn', 'sidebarLogoutBtn'];
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.removeAttribute('onclick');
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.closeSidebarIfMobile) window.closeSidebarIfMobile();
                window.tmLogout();
                return false;
            };
        }
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachAllLogoutButtons);
} else {
    attachAllLogoutButtons();
}
setTimeout(attachAllLogoutButtons, 1000);
setTimeout(attachAllLogoutButtons, 3000);

window.currentUser = null;
window.currentUserProfile = {};
window.showToast = showToast;

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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            window.currentUser = user;
            const profile = snap.exists() ? snap.data() : {};
            
            // Fix: Ensure new or older users without the field get 50 messages
            if (profile && profile.bonusMessages === undefined) {
                profile.bonusMessages = 50;
                setDoc(doc(db, 'users', user.uid), { bonusMessages: 50 }, { merge: true }).catch(e => console.warn("Failed to auto-gift points:", e));
            }
            
            window.currentUserProfile = profile;
            const displayName = profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : (user.displayName || user.email.split('@')[0]);
            document.getElementById('userNameDisplay').textContent = displayName;

            const avatar = profile.photoBase64 || profile.photoURL || user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
            const sidebarAvatar = document.getElementById('sidebarAvatar');
            if (sidebarAvatar) sidebarAvatar.src = avatar;
            window.currentUserProfile.photoURL = avatar;

        } catch (dbError) {
            console.warn("Could not fetch user profile from DB:", dbError);
            window.currentUser = user;
            window.currentUserProfile = { email: user.email, isEmailVerified: true, bonusMessages: 50 };
            document.getElementById('userNameDisplay').textContent = user.email.split('@')[0];
        }

        hideAuthModal();
        if (window.loadChatHistory) window.loadChatHistory();
        if (window.updateQuotaDisplay) window.updateQuotaDisplay();
    } else {
        window.currentUser = null;
        window.currentUserProfile = {};
        showAuthModal();
    }
});

async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/user.birthday.read');
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const snap = await getDoc(doc(db, 'users', user.uid));
        
        if (!snap.exists()) {
            let userAge = 18; 
            try {
                const credential = GoogleAuthProvider.credentialFromResult(result);
                if (credential && credential.accessToken) {
                    const res = await fetch('https://people.googleapis.com/v1/people/me?personFields=birthdays', {
                        headers: { Authorization: `Bearer ${credential.accessToken}` }
                    });
                    const data = await res.json();
                    if (data.birthdays && data.birthdays.length > 0) {
                        const bDate = data.birthdays[0].date;
                        if (bDate && bDate.year) userAge = new Date().getFullYear() - bDate.year;
                    }
                }
            } catch (err) { console.warn('تعذر جلب العمر من جوجل:', err); }

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
                bonusMessages: 50,
                msgCount: 0,
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
        if (error.code === 'auth/popup-blocked') {
            showToast('تم حظر النافذة المنبثقة من المتصفح. يرجى تعطيل مانع النوافذ.', 'error');
        } else if (error.code !== 'auth/popup-closed-by-user') {
            showToast(`فشل الدخول بـ Google: ${error.message}`, 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('googleLoginBtn')?.addEventListener('click', loginWithGoogle);
});
