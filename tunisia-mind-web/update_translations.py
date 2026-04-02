import re
import json

HTML_FILE = r'c:\project1\Tunisia 2\tunisia-mind-web\public\index.html'
LANG_FILE = r'c:\project1\Tunisia 2\tunisia-mind-web\public\js\language.js'
TRANS_FILE = r'c:\project1\Tunisia 2\tunisia-mind-web\public\js\translations.js'

with open(HTML_FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# Add a comprehensive dictionary for translations.
# We will just write a new translations.js file completely.
translations_js = """// translations.js

const translations = {
    ar: {
        dir: 'rtl',
        new_chat: 'محادثة جديدة',
        search_chats: 'بحث في المحادثات...',
        pinned: 'المثبتة',
        today: 'اليوم',
        settings: 'الإعدادات',
        invite_friend: 'دعوة صديق',
        brand_name: 'العقل التونسي',
        share: 'مشاركة',
        export_pdf: 'PDF',
        delete: 'حذف',
        welcome_title: 'كيف يمكنني مساعدتك اليوم؟',
        welcome_sub: 'اسألني أي شيء، اطلب كوداً، أو ابدأ محادثة',
        sug1: 'اشرح مفهوماً معقداً ببساطة',
        sug2: 'ساعدني في تعلم شيء جديد',
        sug3: 'أعطني أفكاراً إبداعية',
        sug4: 'معلومات عامة',
        type_message: 'اكتب رسالتك هنا...',
        messages_used: 'الرسائل المستخدمة:',
        login: 'تسجيل الدخول',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        login_btn: 'دخول',
        google_login: 'الدخول بـ Google',
        or: 'أو',
        no_account: 'ليس لديك حساب؟',
        signup: 'إنشاء حساب',
        forgot_password: 'نسيت كلمة المرور؟',
        signup_title: 'إنشاء حساب جديد',
        photo_optional: 'الصورة الشخصية (اختياري)',
        first_name: 'الاسم *',
        last_name: 'اللقب *',
        age: 'العمر *',
        password_hint: 'كلمة المرور (8+ أحرف) *',
        create_account_btn: 'إنشاء الحساب',
        google_signup: 'التسجيل بـ Google',
        have_account: 'لديك حساب؟',
        check_email: 'تحقق من بريدك الإلكتروني',
        verify_desc: 'تم إرسال رسالة التحقق إلى بريدك الإلكتروني. الرجاء التحقق قبل تسجيل الدخول.',
        resend_verify: 'إعادة إرسال الرسالة',
        already_verified: 'لقد تحققت بالفعل ← دخول',
        restore_pass: 'استعادة كلمة المرور',
        restore_desc: 'سنرسل لك رابط إعادة تعيين كلمة المرور.',
        send_restore_link: 'إرسال رابط الاستعادة',
        back_to_login: '← العودة لتسجيل الدخول',
        profile: 'الملف الشخصي',
        account: 'الحساب',
        appearance: 'المظهر',
        notifications: 'الإشعارات',
        language: 'اللغة',
        support: 'الدعم',
        first_name_lbl: 'الاسم',
        last_name_lbl: 'اللقب',
        age_lbl: 'العمر',
        email_lbl: 'البريد الإلكتروني',
        save_changes: 'حفظ التغييرات',
        current_email: 'البريد الإلكتروني الحالي',
        change: 'تغيير',
        new_email: 'البريد الجديد',
        send_verify_code: 'إرسال رمز التحقق',
        send_pass_link: 'إرسال رابط تغيير كلمة المرور',
        invite_system: 'نظام الدعوة',
        your_invite_link: 'رابط دعوتك الخاص:',
        invited_friends: 'الأصدقاء المدعوون:',
        earned_messages: 'رسائل مكتسبة:',
        logout: 'تسجيل الخروج',
        mode: 'الوضع',
        dark: 'ليلي',
        light: 'نهاري',
        accent_color: 'لون التمييز',
        font_family: 'نوع الخط',
        default_font: 'Tajawal (افتراضي)',
        font_size: 'حجم الخط:',
        site_bg: 'خلفية الموقع',
        sys_notif: 'إشعارات النظام',
        sys_notif_desc: 'تحديثات وإشعارات النظام',
        site_notif: 'إشعارات الموقع',
        site_notif_desc: 'رسائل من فريق الإدارة',
        notif_freq: 'تكرار الإشعارات',
        freq_always: 'فوري',
        freq_daily: 'يومي',
        freq_weekly: 'أسبوعي',
        freq_never: 'لا إشعارات',
        contact_support: 'التواصل مع الدعم',
        support_desc: 'هل تواجه مشكلة؟ تواصل معنا وسيرد عليك فريقنا خلال 24 ساعة.',
        subject: 'الموضوع',
        subject_ph: 'موضوع رسالتك',
        message: 'الرسالة',
        message_ph: 'اكتب رسالتك هنا...',
        send: 'إرسال',
        share_chat: 'مشاركة المحادثة',
        share_desc: 'انسخ الرابط وشاركه مع من تريد',
        close: 'إغلاق',
        invite_friend_title: '🎁 دعوة صديق',
        invite_desc1: 'ادعُ أصدقاءك واحصل على <strong>50 رسالة إضافية</strong> لكل دعوة ناجحة!',
        invite_desc2: 'صديقك يحصل على <strong>20 رسالة ترحيبية</strong>.',
        friends: 'الأصدقاء:',
        points_left: 'نقاط الرسائل المتبقية:',
        refill_hint: '💡 يتم إعادة تعبئة الرصيد آلياً مع بداية كل ساعة.'
    },
    en: {
        dir: 'ltr',
        new_chat: 'New Chat',
        search_chats: 'Search chats...',
        pinned: 'Pinned',
        today: 'Today',
        settings: 'Settings',
        invite_friend: 'Invite Friend',
        brand_name: 'Tunisia Mind',
        share: 'Share',
        export_pdf: 'PDF',
        delete: 'Delete',
        welcome_title: 'How can I assist you today?',
        welcome_sub: 'Ask me anything, request code, or start a chat',
        sug1: 'Explain a complex concept simply',
        sug2: 'Help me learn something new',
        sug3: 'Give me creative ideas',
        sug4: 'General Information',
        type_message: 'Type your message here...',
        messages_used: 'Messages used:',
        login: 'Log In',
        email: 'Email',
        password: 'Password',
        login_btn: 'Log In',
        google_login: 'Log in with Google',
        or: 'OR',
        no_account: 'Don\\'t have an account?',
        signup: 'Sign Up',
        forgot_password: 'Forgot Password?',
        signup_title: 'Create a New Account',
        photo_optional: 'Profile Photo (Optional)',
        first_name: 'First Name *',
        last_name: 'Last Name *',
        age: 'Age *',
        password_hint: 'Password (8+ chars) *',
        create_account_btn: 'Create Account',
        google_signup: 'Sign up with Google',
        have_account: 'Already have an account?',
        check_email: 'Check your email',
        verify_desc: 'A verification link has been sent to your email. Please verify before logging in.',
        resend_verify: 'Resend Email',
        already_verified: 'Already verified? ← Log in',
        restore_pass: 'Restore Password',
        restore_desc: 'We will send you a password reset link.',
        send_restore_link: 'Send Reset Link',
        back_to_login: '← Back to Log In',
        profile: 'Profile',
        account: 'Account',
        appearance: 'Appearance',
        notifications: 'Notifications',
        language: 'Language',
        support: 'Support',
        first_name_lbl: 'First Name',
        last_name_lbl: 'Last Name',
        age_lbl: 'Age',
        email_lbl: 'Email',
        save_changes: 'Save Changes',
        current_email: 'Current Email',
        change: 'Change',
        new_email: 'New Email',
        send_verify_code: 'Send Verification Code',
        send_pass_link: 'Send Password Reset Link',
        invite_system: 'Invitation System',
        your_invite_link: 'Your personal invite link:',
        invited_friends: 'Invited Friends:',
        earned_messages: 'Earned Messages:',
        logout: 'Log Out',
        mode: 'Mode',
        dark: 'Dark',
        light: 'Light',
        accent_color: 'Accent Color',
        font_family: 'Font Family',
        default_font: 'Tajawal (Default)',
        font_size: 'Font Size:',
        site_bg: 'Site Background',
        sys_notif: 'System Notifications',
        sys_notif_desc: 'System updates and alerts',
        site_notif: 'Site Notifications',
        site_notif_desc: 'Messages from admin team',
        notif_freq: 'Notification Frequency',
        freq_always: 'Immediate',
        freq_daily: 'Daily',
        freq_weekly: 'Weekly',
        freq_never: 'Never',
        contact_support: 'Contact Support',
        support_desc: 'Facing an issue? Contact us and our team will reply within 24 hours.',
        subject: 'Subject',
        subject_ph: 'Message Subject',
        message: 'Message',
        message_ph: 'Type your message here...',
        send: 'Send',
        share_chat: 'Share Chat',
        share_desc: 'Copy the link and share it with anyone',
        close: 'Close',
        invite_friend_title: '🎁 Invite a Friend',
        invite_desc1: 'Invite your friends and get <strong>50 extra messages</strong> per successful invite!',
        invite_desc2: 'Your friend gets <strong>20 welcome messages</strong>.',
        friends: 'Friends:',
        points_left: 'Remaining message points:',
        refill_hint: '💡 Balance automatically refills at the start of every hour.'
    },
    fr: {
        dir: 'ltr',
        new_chat: 'Nouveau Chat',
        search_chats: 'Rechercher des chats...',
        pinned: 'Épinglé',
        today: 'Aujourd\\'hui',
        settings: 'Paramètres',
        invite_friend: 'Inviter un ami',
        brand_name: 'Tunisia Mind',
        share: 'Partager',
        export_pdf: 'PDF',
        delete: 'Supprimer',
        welcome_title: 'Comment puis-je vous aider aujourd\\'hui?',
        welcome_sub: 'Demandez-moi n\\'importe quoi, demandez du code ou commencez un chat',
        sug1: 'Expliquer un concept complexe simplement',
        sug2: 'Aidez-moi à apprendre quelque chose de nouveau',
        sug3: 'Donnez-moi des idées créatives',
        sug4: 'Informations générales',
        type_message: 'Tapez votre message ici...',
        messages_used: 'Messages utilisés:',
        login: 'Se connecter',
        email: 'Email',
        password: 'Mot de passe',
        login_btn: 'Connexion',
        google_login: 'Connexion avec Google',
        or: 'OU',
        no_account: 'Vous n\\'avez pas de compte?',
        signup: 'S\\'inscrire',
        forgot_password: 'Mot de passe oublié?',
        signup_title: 'Créer un nouveau compte',
        photo_optional: 'Photo de profil (Facultatif)',
        first_name: 'Prénom *',
        last_name: 'Nom *',
        age: 'Âge *',
        password_hint: 'Mot de passe (8+ car.) *',
        create_account_btn: 'Créer le compte',
        google_signup: 'S\\'inscrire avec Google',
        have_account: 'Vous avez déjà un compte?',
        check_email: 'Vérifiez votre email',
        verify_desc: 'Un lien de vérification a été envoyé à votre email.',
        resend_verify: 'Renvoyer l\\'email',
        already_verified: 'Déjà vérifié? ← Connexion',
        restore_pass: 'Restaurer le mot de passe',
        restore_desc: 'Nous vous enverrons un lien de réinitialisation.',
        send_restore_link: 'Envoyer le lien de réinitialisation',
        back_to_login: '← Retour à la connexion',
        profile: 'Profil',
        account: 'Compte',
        appearance: 'Apparence',
        notifications: 'Notifications',
        language: 'Langue',
        support: 'Support',
        first_name_lbl: 'Prénom',
        last_name_lbl: 'Nom',
        age_lbl: 'Âge',
        email_lbl: 'Email',
        save_changes: 'Enregistrer les modifications',
        current_email: 'Email actuel',
        change: 'Changer',
        new_email: 'Nouvel Email',
        send_verify_code: 'Envoyer le code de vérification',
        send_pass_link: 'Envoyer le lien de réinitialisation',
        invite_system: 'Système d\\'invitation',
        your_invite_link: 'Votre lien d\\'invitation:',
        invited_friends: 'Amis invités:',
        earned_messages: 'Messages gagnés:',
        logout: 'Déconnexion',
        mode: 'Mode',
        dark: 'Sombre',
        light: 'Clair',
        accent_color: 'Couleur d\\'accentuation',
        font_family: 'Police',
        default_font: 'Tajawal (Défaut)',
        font_size: 'Taille de police:',
        site_bg: 'Arrière-plan',
        sys_notif: 'Notifications système',
        sys_notif_desc: 'Mises à jour et alertes',
        site_notif: 'Notifications du site',
        site_notif_desc: 'Messages de l\\'équipe',
        notif_freq: 'Fréquence des notifications',
        freq_always: 'Immédiat',
        freq_daily: 'Quotidien',
        freq_weekly: 'Hebdomadaire',
        freq_never: 'Jamais',
        contact_support: 'Contacter le support',
        support_desc: 'Un problème? Contactez-nous!',
        subject: 'Sujet',
        subject_ph: 'Sujet du message',
        message: 'Message',
        message_ph: 'Tapez votre message ici...',
        send: 'Envoyer',
        share_chat: 'Partager le chat',
        share_desc: 'Copiez le lien et partagez-le',
        close: 'Fermer',
        invite_friend_title: '🎁 Inviter un ami',
        invite_desc1: 'Invitez vos amis et obtenez <strong>50 messages supplémentaires</strong>!',
        invite_desc2: 'Votre ami reçoit <strong>20 messages de bienvenue</strong>.',
        friends: 'Amis:',
        points_left: 'Points de message restants:',
        refill_hint: '💡 Le solde se recharge automatiquement.'
    }
};

// Fill out other languages simply by copying english for now, or just leave as is.
for (const l of ['es', 'de', 'zh', 'ja', 'ru']) {
    translations[l] = { ...translations['en'] };
}

window.translations = translations;
"""

with open(TRANS_FILE, 'w', encoding='utf-8') as f:
    f.write(translations_js)

# Update Language JS
lang_js = """// language.js

function applyTranslations(lang) {
  const trans = window.translations[lang];
  if (!trans) {
    console.warn(`No translations found for language: ${lang}`);
    return;
  }

  // Translate text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (trans[key]) {
      el.innerHTML = trans[key]; // use innerHTML to support <strong> tags in translation
    }
  });

  // Translate placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (trans[key]) {
      el.placeholder = trans[key];
    }
  });
  
  // Translate titles
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (trans[key]) {
      el.title = trans[key];
    }
  });
}

function setLanguage(lang, dir) {
  if (!window.translations[lang]) {
    console.warn(`Language '${lang}' not supported.`);
    return;
  }
  
  // Save preference - use standard key tunisiaLang as expected by settings.js
  localStorage.setItem('tunisiaLang', lang);
  localStorage.setItem('tunisiaDirection', dir);

  // Update DOM
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  
  // Apply text
  applyTranslations(lang);

  // Update active button
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Set initial language
  const savedLang = localStorage.getItem('tunisiaLang') || 'ar';
  const savedDir = localStorage.getItem('tunisiaDirection') || 'rtl';
  setLanguage(savedLang, savedDir);

  // Add event listeners to language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      const dir = btn.getAttribute('data-dir');
      setLanguage(lang, dir);
    });
  });
});
"""
with open(LANG_FILE, 'w', encoding='utf-8') as f:
    f.write(lang_js)

print("Updated translation config.")
