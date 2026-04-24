const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity');

let knowledgeBase = [];

function loadKB() {
    try {
        const kbPath = path.join(__dirname, 'knowledge.json');
        if (fs.existsSync(kbPath)) {
            const raw = fs.readFileSync(kbPath, 'utf8');
            knowledgeBase = JSON.parse(raw);
        }
    } catch (e) {
        console.error('Error loading KB:', e.message);
    }
}

function searchKnowledgeBase(query) {
    if (!query || query.length < 2) return null;
    const cleanQuery = query.trim().toLowerCase();
    const words = cleanQuery.split(/\s+/);
    const wordCount = words.length;

    for (const item of knowledgeBase) {
        const matches = item.keywords.some(kw => cleanQuery.includes(kw.toLowerCase()));
        if (!matches) continue;

        // الأنواع الحركية
        if (item.type === 'dynamic') {
            if (item.intent === 'time') {
                return 'الوقت الآن في تونس هو: **' +
                    new Date().toLocaleTimeString('ar-TN', {
                        timeZone: 'Africa/Tunis',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) + '**';
            }
            if (item.intent === 'date') {
                return 'تاريخ اليوم: **' +
                    new Date().toLocaleDateString('ar-TN', {
                        timeZone: 'Africa/Tunis',
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }) + '**';
            }
        }

        // الأنواع الثابتة — فقط إذا كانت الرسالة قصيرة (تحية أو سؤال مباشر)
        if (item.type === 'static' && item.response) {
            // تحية بسيطة فقط — لا نعترض إذا كان في الرسالة محتوى إضافي
            if (item.intent === 'greeting' && wordCount > 3) return null;
            return item.response;
        }
    }

    return null;
}

loadKB();
module.exports = { searchKnowledgeBase, loadKB };
