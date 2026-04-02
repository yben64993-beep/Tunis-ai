// app.js — Initialization
console.log('🧠 العقل التونسي - Tunisia Mind v2.0 loaded');
window.currentChatId = null;

const ALL_SUGGESTIONS = [
    { icon: 'fa-regular fa-lightbulb', text: 'اشرح مفهوماً معقداً بشكل مبسط', p: 'اشرح مفهوماً معقداً بشكل مبسط وجذاب بحيث يفهمه طفل في العاشرة' },
    { icon: 'fa-solid fa-code', text: 'اكتب لي كود برمجي', p: 'اكتب لي كود برمجي بلغة بايثون لإنشاء لعبة بسيطة' },
    { icon: 'fa-solid fa-graduation-cap', text: 'ساعدني في تعلم لغة جديدة', p: 'أعطني خطة عملية لتعلم لغة جديدة في 3 أشهر' },
    { icon: 'fa-solid fa-earth-africa', text: 'معلومات عن تاريخ تونس', p: 'لخص لي أهم محطات التاريخ التونسي باختصار' },
    { icon: 'fa-solid fa-wand-magic-sparkles', text: 'أفكار لمشروع تخرج', p: 'أعطني 5 أفكار إبداعية لمشاريع تخرج في مجال الذكاء الاصطناعي' },
    { icon: 'fa-solid fa-utensils', text: 'وصفة أكل تونسية', p: 'أعطني وصفة إعداد الكسكسي التونسي خطوة بخطوة' },
    { icon: 'fa-solid fa-book-open', text: 'لخص لي كتاباً', p: 'لخص لي كتاب "مقدمة ابن خلدون" مع أهم دروسه' },
    { icon: 'fa-solid fa-calendar-check', text: 'جدول لتنظيم الوقت', p: 'ساعدني في إنشاء جدول زمني لتنظيم يومي بين العمل والدراسة' }
];

document.addEventListener('DOMContentLoaded', () => {
    // Randomize suggestions
    const grid = document.querySelector('.suggestions-grid');
    if (grid) {
        grid.innerHTML = '';
        const shuffled = ALL_SUGGESTIONS.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 4);
        selected.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-card';
            btn.setAttribute('data-prompt', s.p);
            btn.innerHTML = `<i class="${s.icon}"></i> <span>${s.text}</span>`;
            btn.addEventListener('click', () => {
                const input = document.getElementById('messageInput');
                if (input) {
                    input.value = s.p;
                    document.getElementById('sendMessageBtn')?.click();
                }
            });
            grid.appendChild(btn);
        });
    }
});
