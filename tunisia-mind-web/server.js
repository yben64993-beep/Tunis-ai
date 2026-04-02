/**
 * server.js
 * Tunisia Mind Backend - Free & Unlimited
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { searchKnowledgeBase, loadKB } = require('./knowledge');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

require('dotenv').config();

// ==========================================
// حماية الخادم من التوقف المفاجئ (Anti-Crash)
// ==========================================
process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught Exception Prevented Crash:', err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection Prevented Crash:', reason);
});

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
if (!OPENROUTER_KEY) {
    console.error("⚠️ خطأ خطير: لم يتم العثور على مفتاح OPENROUTER_KEY في ملف .env!");
}
const verificationCodes = new Map();

// تم إيقاف نظام فايربيس (الحسابات) بناءً على طلبك
/*
if (process.env.SERVICE_ACCOUNT_KEY_BASE64) {
    ...
}
*/

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `
أنت "العقل التونسي" (Tunisia Mind AI)، مساعد متطور، سريع جداً، واحترافي. يمكنك الوصول للأدوات (tools) لجلب معلومات حية.
قوانينك الصارمة:
1. لغة الرد: يجب أن ترد **بنفس اللغة** التي استخدمها المستخدم تماماً. سألك بالإنجليزية؟ أجب بالإنجليزية. سألك بالعربية؟ أجب بالعربية.
2. منع الهذيان والرموز الغريبة: ممنوع تماماً استخدام أي رموز صينية أو لغات غير مفهومة. حافظ على استقرار النص.
3. السرعة: كن مباشراً. ابدأ الإجابة في غضون ثانية واحدة.
4. الهوية: أنت صناعة تونسية، تدعم فلسطين وتونس دوماً.
5. في نهاية الإجابات الطويلة، أضف 3 اقتراحات بصيغة: [[S: سؤال 1 | سؤال 2 | سؤال 3]].
`;

// ----------------------------------------
// وظائف الأدوات للوكيل الذكي (Agent Tools)
// ----------------------------------------
async function executeTool(toolCall) {
    const fnName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments || '{}');
    
    if (fnName === 'search_wikipedia') {
        const res = await performWebSearch(args.query);
        return res || "لم يتم العثور على أية نتائج مطابقة.";
    } else if (fnName === 'get_current_time') {
        return "التوقيت الحالي في تونس هو: " + new Date().toLocaleString('ar-TN', { timeZone: 'Africa/Tunis' });
    } else if (fnName === 'get_weather') {
        try {
            const currentFetch = globalThis.fetch || (await import('node-fetch')).default;
            const res = await currentFetch(`https://api.open-meteo.com/v1/forecast?latitude=36.8&longitude=10.1&current_weather=true`); // Default Tunis approx
            const data = await res.json();
            return `حالة الطقس الحالية (في مدينة ${args.city}): درجة الحرارة ${data.current_weather.temp} درجة مئوية، وسرعة الرياح ${data.current_weather.windspeed} كم/س.`;
        } catch(e) { return "عذراً، فشل جلب الطقس."; }
    } else if (fnName === 'get_crypto_price') {
        try {
            const currentFetch = globalThis.fetch || (await import('node-fetch')).default;
            const res = await currentFetch(`https://api.coingecko.com/api/v3/simple/price?ids=${args.coin.toLowerCase()}&vs_currencies=usd`);
            const data = await res.json();
            const price = data[args.coin.toLowerCase()]?.usd;
            return `السعر الحالي لعملة ${args.coin} هو ${price || 'غير معروف'} دولار أمريكي.`;
        } catch(e) { return "عذراً، فشل جلب سعر العملة."; }
    } else if (fnName === 'run_code_sandbox') {
        try {
            const vm = require('vm');
            const sandbox = { console: { log: (...a) => sandbox.output += a.join(' ') + '\n' }, Math, output: "" };
            vm.createContext(sandbox);
            vm.runInContext(args.code, sandbox, { timeout: 2000 });
            return `نتيجة التنفيذ:\n${sandbox.output || "لا يوجد مخرجات نصية"}`;
        } catch(e) { return `خطأ في التنفيذ: ${e.message}`; }
    } else if (fnName === 'deep_web_search') {
        return await performWebSearch(args.query);
    } else if (fnName === 'fetch_github_repo') {
        try {
            const currentFetch = globalThis.fetch || (await import('node-fetch')).default;
            const res = await currentFetch(`https://api.github.com/repos/${args.repo}/git/trees/main?recursive=1`);
            const data = await res.json();
            if (data.tree) {
                const files = data.tree.filter(i => i.type === 'blob').map(i => i.path).slice(0, 50).join('\n');
                return `محتويات المستودع (أول 50 ملف):\n${files}`;
            }
            return "لم يتم العثور على ملفات.";
        } catch (e) { return "فشل الاتصال بـ Github"; }
    }
    return "الأداة غير موجودة.";
}

// ----------------------------------------
// المولد الوكيل المتلقي (Agentic AI Loop)
// ----------------------------------------
async function generateAIResponse(messages, depth = 0) {
    if (depth > 2) return "عذراً، استغرق التحليل وقتاً طويلاً."; // Reduced depth to prevent lag

    try {
        const currentFetch = globalThis.fetch || (await import('node-fetch')).default;
        let reqMessages = depth === 0 ? [{ role: 'system', content: SYSTEM_PROMPT }, ...messages] : messages;

        const response = await currentFetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_KEY}`
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.3-70b-instruct',
                temperature: 0.6,
                messages: reqMessages,
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "search_wikipedia",
                            description: "البحث في ويكيبيديا للحصول على معلومات دقيقة ومحدثة.",
                            parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "get_current_time",
                            description: "الحصول على الوقت في تونس.",
                            parameters: { type: "object", properties: {} }
                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "deep_web_search",
                            description: "البحث المعمق في الويب عن أحدث الأخبار والمعلومات.",
                            parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "run_code_sandbox",
                            description: "تنفيذ كود JavaScript لمعالجة البيانات وتحليلها.",
                            parameters: { type: "object", properties: { code: { type: "string", description: "كود JS الذي سيتم تشغيله" } }, required: ["code"] }
                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "fetch_github_repo",
                            description: "فحص مستودع Github لجلب هيكل الملفات.",
                            parameters: { type: "object", properties: { repo: { type: "string", description: "owner/repo" } }, required: ["repo"] }
                        }
                    }
                ]
            })
        });
        
        const data = await response.json();
        const message = data.choices?.[0]?.message;
        if (!message) return "لا توجد استجابة.";

        if (message.tool_calls) {
            reqMessages.push(message);
            for (const toolCall of message.tool_calls) {
                const toolResult = await executeTool(toolCall);
                reqMessages.push({ role: "tool", tool_call_id: toolCall.id, content: toolResult });
            }
            return await generateAIResponse(reqMessages, depth + 1);
        }
        return message.content;
    } catch (error) { return "⚠️ خطأ في الاتصال بالذكاء الاصطناعي."; }
}

async function streamAIResponse(messages, res) {
    try {
        const currentFetch = globalThis.fetch || (await import('node-fetch')).default;
        const response = await currentFetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_KEY}`
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.3-70b-instruct',
                temperature: 0.7,
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
                stream: true
            })
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error('Stream Error Response:', response.status, errText);
            res.write(`data: ${JSON.stringify({ content: "⚠️ المخدم مشغول أو غير متاح مؤقتاً. يرجى المحاولة بعد قليل." })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
            return;
        }

        if (response.body && typeof response.body.on === 'function') {
            response.body.on('error', err => {
                console.error("Stream Body Error:", err.message);
                res.end();
            });
        }

        let buffer = '';
        response.body.on('data', chunk => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop(); // الاحتفاظ بالسطر الأخير غير المكتمل
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataLine = line.slice(6).trim();
                    if (dataLine === '[DONE]') {
                        res.write('data: [DONE]\n\n');
                        res.end();
                        return;
                    }
                    try {
                        const parsed = JSON.parse(dataLine);
                        const content = parsed.choices?.[0]?.delta?.content || "";
                        if (content) {
                            res.write(`data: ${JSON.stringify({ content })}\n\n`);
                        }
                    } catch (e) {
                        // تجاهل الأسطر التي لم تكتمل كاحتياط
                    }
                }
            }
        });
    } catch (error) { res.end(); }
}

// ----------------------------------------
// ميزة البحث المدمج في الويب (Web Search)
// ----------------------------------------
async function performWebSearch(query) {
    try {
        const currentFetch = globalThis.fetch || (await import('node-fetch')).default;
        // يمكن تغيير الرابط لأي API بحث آخر مستقبلاً
        const url = `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`;
        const res = await currentFetch(url);
        const data = await res.json();
        
        if (data && data.query && data.query.search && data.query.search.length > 0) {
            const topResults = data.query.search.slice(0, 3); // أخذ أفضل 3 نتائج
            let context = "\n\n(معلومات إضافية مستخرجة من الويب لمساعدتك في الإجابة بدقة):\n";
            topResults.forEach(r => {
                const snippet = r.snippet.replace(/<\/?[^>]+(>|$)/g, "");
                context += `- **${r.title}**: ${snippet}\n`;
            });
            return context;
        }
    } catch(e) {
        console.error("Web Search Error:", e.message);
    }
    return null;
}

// API Endpoints
// ... (OpenRouter/Pollinations/HF endpoints here - skipped for brevity or kept identical)

app.post('/api/chat', async (req, res) => {
    const { prompt, userContext, history, isSearchMode, stream, persona } = req.body;
    const kbAnswer = searchKnowledgeBase(prompt);
    if (!stream && kbAnswer) return res.json({ answer: kbAnswer, source: 'knowledge-base' });
    let messages = [];
    
    // Multi-Persona Logic
    if (persona && persona !== 'العقل التونسي') {
        let genderContext = persona === 'ريم' || persona === 'ليلى' ? 'فتاة تتحدث بأسلوب لطيف وودود' : 'شاب يتحدث بأسلوب مرح أو ودي';
        messages.push({ role: 'system', content: `【وضع تقمص الشخصية】\nتذكر أنك لست مجرد ذكاء اصطناعي الآن، أنت تلعب دور شخص حقيقي. اسمك هو "${persona}"، وأنت ${genderContext}. تحدث بصيغة المتكلم واستخدم اسمك عند اللزوم.` });
    }

    if (isSearchMode) {
        messages.push({ role: 'system', content: "【وضع البحث النشط】\nيجب عليك استخدام أداة 'search_wikipedia' للحصول على أحدث المعلومات إذا لم تكن متأكداً من الإجابة." });
    }
    if (userContext) {
        const agePart = userContext.age ? `عمره ${userContext.age}` : '';
        messages.push({ role: 'system', content: `【ذاكرة النظام】\nاسم المستخدم: ${userContext.name || 'مجهول'}. ${agePart}.` });
    }
    if (history && Array.isArray(history)) messages = messages.concat(history);
    messages.push({ role: 'user', content: prompt });
    if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        return await streamAIResponse(messages, res);
    }
    try {
        const answer = await generateAIResponse(messages);
        res.json({ answer, source: 'ai' });
    } catch (error) { res.status(500).json({ error: 'فشل في توليد الرد' }); }
});



app.get('/ping', (req, res) => res.status(200).send('pong'));

app.post('/api/generate-image', async (req, res) => {
    const { prompt } = req.body;
    try {
        const REPLICATE_KEY = process.env.REPLICATE_KEY;
        const currentFetch = globalThis.fetch || (await import('node-fetch')).default;
        
        // استخدام نموذج Flux السريع من شركة Black Forest Labs
        let response = await currentFetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${REPLICATE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                input: { prompt: prompt, go_fast: true, num_outputs: 1, aspect_ratio: "1:1" }
            })
        });

        if (response.status !== 201) throw new Error("فشل توليد الصورة (الرجاء التأكد من صلاحية المفتاح)");
        let prediction = await response.json();
        
        while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
            await new Promise(r => setTimeout(r, 1000));
            let checkRes = await currentFetch(prediction.urls.get, { headers: { "Authorization": `Token ${REPLICATE_KEY}` }});
            prediction = await checkRes.json();
        }

        if (prediction.status === "succeeded" && prediction.output) {
            res.json({ imageUrl: Array.isArray(prediction.output) ? prediction.output[0] : prediction.output }); 
        } else {
            res.status(500).json({ error: "فشل التوليد، جرب وصفاً مختلفاً." });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));