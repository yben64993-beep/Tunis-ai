/**
 * knowledge.js — نظام قاعدة المعرفة المحلية
 * يُعالج الأسئلة البسيطة محلياً ويتجاهل الباقي للذكاء الاصطناعي
 */
const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity');

let knowledgeBase = [];
const KB_PATH = path.join(__dirname, 'knowledge.json');

function loadKB() {
    try {
        if (fs.existsSync(KB_PATH)) {
            const data = fs.readFileSync(KB_PATH, 'utf8');
            knowledgeBase = JSON.parse(data);
        } else {
            knowledgeBase = [];
            fs.writeFileSync(KB_PATH, JSON.stringify(knowledgeBase, null, 2));
        }
    } catch (error) {
        console.error('Error loading KB:', error);
        knowledgeBase = [];
    }
}

function searchKnowledgeBase(query) {
    if (!query || typeof query !== 'string') return null;
    const normalizedQuery = query.toLowerCase().trim();

    // تم إزالة التقييد الصارم للكلمات للسماح بالاسئلة الطويلة
    const wordCount = normalizedQuery.split(/\s+/).length;

    for (const item of knowledgeBase) {
        if (!item.keywords || !Array.isArray(item.keywords)) continue;

        // Smart Semantic Matching (Fuzzy Search) 🧠
        // We find the best match between the query and the items' keywords
        const matches = stringSimilarity.findBestMatch(normalizedQuery, item.keywords);
        const bestMatch = matches.bestMatch;
        
        // Threshold: 0.6 similarity score to avoid false positives
        const isMatched = bestMatch.rating > 0.6 || item.keywords.some(k => normalizedQuery.includes(k.toLowerCase()));
        
        if (!isMatched) continue;

        // معالجة الأنواع الديناميكية
        if (item.type === 'dynamic') {
            if (item.intent === 'time') {
                return 'التوقيت الحالي في تونس: **' +
                    new Date().toLocaleTimeString('ar-TN', {
                        timeZone: 'Africa/Tunis',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
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