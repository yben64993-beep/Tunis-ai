/**
 * server.js
 * Tunisia Mind Backend - Free & Unlimited
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { searchKnowledgeBase } = require('./knowledge');

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

// nodemailer / Firebase Admin removed — not used in current build

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `
أنت "العقل التونسي" (Tunisia Mind AI). مساعد ذكاء اصطناعي متطور، عالمي، ومحايد تماماً.
قوانين الهوية والأسلوب:
1. **الهوية العالمية**: اسمك "العقل التونسي" هو مجرد علامة تجارية، لكن شخصيتك وعلمك "عالمي". لا تذكر تونس ولا ثقافة معينة ولا أي سياق محلي تلقائياً.
2. **مجالات التخصص**: أنت خبير في كافة المجالات العلمية والتقنية والأدبية.
3. **لغة الرد**: أجب دائماً باللغة التي استخدمها المستخدم (العربية بالأثر العربي الفصيح، الإنجليزية بالإنجليزية، إلخ).
4. **الأمثلة**: استخدم أمثلة عالمية عامة (مثلاً: التفاح، الأشجار، الأرقام) بدلاً من الأمثلة المحلية.
5. **الاقتراحات الحوارية**: في نهاية كل رد طويل، أضف 3 اقتراحات بصيغة: [[S: سؤال 1 | سؤال 2 | سؤال 3]].
6. **منع الرموز الغريبة**: لا تستخدم أبداً الحروف الصينية أو الجليكوسيدات الآسيوية غير المفهومة. ردودك يجب أن تقتصر على الأحرف العربية واللاتينية فقط لضمان سهولة القراءة.
`;

// ----------------------------------------
// دالة مساعدة: تحويل اسم مدينة إلى إحداثيات
// ----------------------------------------
async function geocodeCity(cityName) {
    try {
        const currentFetch = globalThis.fetch || (await import('node-fetch')).default;
        const res = await currentFetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ar&format=json`
        );
        const data = await res.json();
        if (!data.results?.length) return null;
        const p = data.results[0];
        return { lat: p.latitude, lon: p.longitude, name: p.name, country: p.country || '' };
    } catch (e) {
        console.error('Geocoding error:', e.message);
        return null;
    }
}

// دالة مساعدة: جلب بيانات الطقس (مع دعم التبديل في حال تعطل أحد الخوادم)
async function fetchWeatherData(lat, lon) {
    const currentFetch = globalThis.fetch || (await import('node-fetch')).default;
    
    // محاولة أولى: Open-Meteo
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature,precipitation_probability&timezone=auto&forecast_days=1`;
        const res = await currentFetch(url, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
            const data = await res.json();
            if (data.current_weather) {
                const cw = data.current_weather;
                const humidity = data.hourly?.relativehumidity_2m?.[0] ?? null;
                const feelsLike = data.hourly?.apparent_temperature?.[0] ?? cw.temperature;
                const rainChance = data.hourly?.precipitation_probability?.[0] ?? 0;
                const codeInfo = (c) => {
                    if (c === 0) return { ar: 'صافِن', emoji: '☀️' };
                    if (c <= 2) return { ar: 'غائم جزئياً', emoji: '⛅' };
                    if (c === 3) return { ar: 'غائم تماماً', emoji: '☁️' };
                    if (c <= 49) return { ar: 'ضباب', emoji: '🌫️' };
                    if (c <= 67) return { ar: 'أمطار', emoji: '🌧️' };
                    if (c <= 77) return { ar: 'ثلج', emoji: '❄️' };
                    if (c <= 82) return { ar: 'زخات مطر', emoji: '🌦️' };
                    if (c <= 99) return { ar: 'عواصف رعدية', emoji: '⛈️' };
                    return { ar: 'غير محدد', emoji: '🌡️' };
                };
                const dirs = ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'];
                const cond = codeInfo(cw.weathercode);
                return {
                    provider: 'Open-Meteo',
                    temperature: cw.temperature,
                    feelsLike: Math.round(feelsLike),
                    condition: cond.ar,
                    emoji: cond.emoji,
                    windspeed: Math.round(cw.windspeed),
                    windDirection: dirs[Math.round(cw.winddirection / 45) % 8],
                    humidity: humidity ?? '-',
                    rainChance: rainChance,
                    isDay: cw.is_day
                };
            }
        }
    } catch (e) { console.error('Open-Meteo failed, trying MET Norway...'); }

    // محاولة ثانية (Fallback): MET Norway
    try {
        const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
        // MET Norway requires a User-Agent
        const res = await currentFetch(url, { 
            headers: { 'User-Agent': 'TunisiaMind/2.0 (github.com/Tunis-ai)' },
            signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) throw new Error(`MET Norway error: ${res.status}`);
        
        const data = await res.json();
        const latest = data.properties.timeseries[0];
        const inst = latest.data.instant.details;
        const next1 = latest.data.next_1_hours || latest.data.next_6_hours;
        
        const sym = next1?.summary?.symbol_code || 'clearsky_day';
        const emojiMap = {
            'clearsky': '☀️', 'fair': '🌤️', 'partlycloudy': '⛅', 'cloudy': '☁️',
            'rain': '🌧️', 'heavyrain': '🌧️', 'rainshowers': '🌦️', 'thunderstorm': '⛈️',
            'snow': '❄️', 'fog': '🌫️', 'sleet': '🌨️'
        };
        const condMap = {
            'clearsky': 'صافٍ', 'fair': 'صحو', 'partlycloudy': 'غائم جزئياً', 'cloudy': 'غائم',
            'rain': 'مطر', 'heavyrain': 'مطر غزير', 'rainshowers': 'زخات مطر', 'thunderstorm': 'رعدية',
            'snow': 'ثلج', 'fog': 'ضباب', 'sleet': 'مطر وثلج'
        };
        const baseSym = sym.split('_')[0];
        const isDay = !sym.includes('night');

        return {
            provider: 'MET Norway',
            temperature: inst.air_temperature,
            feelsLike: Math.round(inst.air_temperature),
            condition: condMap[baseSym] || baseSym,
            emoji: emojiMap[baseSym] || '🌡️',
            windspeed: Math.round(inst.wind_speed * 3.6), // conversion m/s to km/h
            windDirection: 'غير متوفر',
            humidity: inst.relative_humidity,
            rainChance: next1?.details?.precipitation_amount || 0,
            isDay: isDay ? 1 : 0
        };
    } catch (e) {
        console.error('All weather providers failed:', e.message);
        throw new Error('تعذر الوصول إلى ملقمات الطقس العالمية حالياً.');
    }
}

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
            let lat = args.lat, lon = args.lon;
            let cityDisplay = args.city || 'تونس';
            if (args.city && (!lat || !lon)) {
                const geo = await geocodeCity(args.city);
                if (geo) { lat = geo.lat; lon = geo.lon; cityDisplay = `${geo.name}${geo.country ? ', ' + geo.country : ''}`; }
                else { lat = 36.8065; lon = 10.1815; cityDisplay = 'تونس, تونس'; }
            } else if (!lat || !lon) {
                lat = 36.8065; lon = 10.1815;
            }
            const w = await fetchWeatherData(lat, lon);
            return `🌍 **حالة الطقس في ${cityDisplay}:**
${w.emoji} الحالة: ${w.condition}
🌡️ درجة الحرارة: ${w.temperature}°C (يبدو كـ ${w.feelsLike}°C)
💧 الرطوبة: ${w.humidity}%
💨 الرياح: ${w.windspeed} كم/س (اتجاه ${w.windDirection})
🌧️ احتمال المطر: ${w.rainChance}%`;
        } catch(e) { return 'عذراً، فشل جلب الطقس: ' + e.message; }
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
    if (depth > 2) return "عذراً، استغرق التحليل وقتاً طويلاً."; 

    try {
        const currentFetch = globalThis.fetch || (await import('node-fetch')).default;
        let reqMessages = messages;
        const hasImage = reqMessages.some(m => Array.isArray(m.content) && m.content.some(part => part.type === 'image_url'));
        const modelToUse = hasImage ? 'qwen/qwen-vl-plus:free' : 'openrouter/free';

        const response = await currentFetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_KEY}`
            },
            body: JSON.stringify({
                model: modelToUse,
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

async function streamAIResponse(messages, res, responseLen) {
    try {
        const currentFetch = globalThis.fetch || (await import('node-fetch')).default;
        const hasImage = messages.some(m => Array.isArray(m.content) && m.content.some(part => part.type === 'image_url'));
        const modelToUse = hasImage ? 'qwen/qwen-vl-plus:free' : 'openrouter/free';
        
        let lengthRule = "";
        if (responseLen === 'short') lengthRule = "\n\nطول الرد: قصير جداً ومختصر.";
        else if (responseLen === 'detailed') lengthRule = "\n\nطول الرد: مفصل وشامل جداً.";
        
        // Use provided messages (which already include the system prompt from /api/chat)
        let reqMessages = messages;
        if (lengthRule) {
             const sysMsg = reqMessages.find(m => m.role === 'system');
             if (sysMsg) sysMsg.content += lengthRule;
        }

        const response = await currentFetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_KEY}`
            },
            body: JSON.stringify({
                model: modelToUse,
                temperature: 0.7,
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error('Stream Error Response:', response.status, errText);
            const friendlyMsg = response.status === 429 ? "⚠️ المخدم مشغول جداً حالياً نظراً لكثرة الطلبات. يرجى الانتظار دقيقة والمحاولة مجدداً." : "⚠️ المخدم غير متاح مؤقتاً أو تحت الصيانة. يرجى المحاولة بعد قليل.";
            res.write(`data: ${JSON.stringify({ content: friendlyMsg })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
            return;
        }

        // دعم Web Streams API (Node.js 18+ native fetch) و Node.js Streams (node-fetch)
        const isNodeStream = response.body && typeof response.body.on === 'function';

        if (isNodeStream) {
            // node-fetch: Node.js stream
            let buffer = '';
            response.body.on('error', err => { console.error("Stream Body Error:", err.message); res.end(); });
            response.body.on('data', chunk => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataLine = line.slice(6).trim();
                        if (dataLine === '[DONE]') { res.write('data: [DONE]\n\n'); res.end(); return; }
                        try {
                            const parsed = JSON.parse(dataLine);
                            const content = parsed.choices?.[0]?.delta?.content || "";
                            if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
                        } catch (e) {}
                    }
                }
            });
            response.body.on('end', () => { res.write('data: [DONE]\n\n'); res.end(); });
        } else {
            // native fetch: Web Streams API
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataLine = line.slice(6).trim();
                        if (dataLine === '[DONE]') { res.write('data: [DONE]\n\n'); res.end(); return; }
                        try {
                            const parsed = JSON.parse(dataLine);
                            const content = parsed.choices?.[0]?.delta?.content || "";
                            if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
                        } catch (e) {}
                    }
                }
            }
            res.write('data: [DONE]\n\n');
            res.end();
        }
    } catch (error) {
        console.error('streamAIResponse error:', error.message);
        res.write(`data: ${JSON.stringify({ content: "⚠️ حدث خطأ في الاتصال." })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
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
    const { prompt, userContext, history, isSearchMode, stream, persona, image, responseLen } = req.body;
    const kbAnswer = searchKnowledgeBase(prompt);
    if (!stream && kbAnswer) return res.json({ answer: kbAnswer, source: 'knowledge-base' });
    let messages = [];
    
    // Inject Response Length Instruction
    let lengthInstruction = "";
    if (responseLen === 'short') lengthInstruction = "أجب باختصار شديد جداً ومباشر (Short & Direct).";
    else if (responseLen === 'detailed') lengthInstruction = "أجب بالتفصيل الممل، قدّم شرحاً وافياً وشاملاً مع أمثلة (Detailed & Comprehensive).";
    else lengthInstruction = "أجب بطريقة موزونة، لا بالاختصار المخل ولا بالتطويل الممل (Balanced Response).";
    
    const augmentedSystemPrompt = SYSTEM_PROMPT + "\n\n" + lengthInstruction;
    messages.push({ role: 'system', content: augmentedSystemPrompt });

    if (isSearchMode) {
        messages.push({ role: 'system', content: "【وضع البحث النشط】\nيجب عليك استخدام أداة 'search_wikipedia' للحصول على أحدث المعلومات إذا لم تكن متأكداً من الإجابة." });
    }
    if (userContext) {
        const agePart = userContext.age ? `عمره ${userContext.age}` : '';
        messages.push({ role: 'system', content: `【ذاكرة النظام】\nاسم المستخدم: ${userContext.name || 'مجهول'}. ${agePart}.` });
    }
    if (history && Array.isArray(history)) messages = messages.concat(history);
    
    if (image) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: prompt || "حلل هذه الصورة وأعطني معلومات عنها." },
                { type: "image_url", image_url: { url: image } }
            ]
        });
    } else {
        messages.push({ role: 'user', content: prompt });
    }
    if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        return await streamAIResponse(messages, res, responseLen);
    }
    try {
        const answer = await generateAIResponse(messages);
        if (!answer) return res.status(500).json({ error: 'الذكاء الاصطناعي لم يُرجع رداً. حاول مرة أخرى.' });
        res.json({ answer, source: 'ai' });
    } catch (error) {
        console.error('Chat endpoint error:', error.message);
        res.status(500).json({ error: 'فشل في توليد الرد' });
    }
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

// ----------------------------------------
// API: جلب بيانات الطقس مباشرة
// ----------------------------------------
app.get('/api/weather', async (req, res) => {
    try {
        let { lat, lon, city } = req.query;
        let cityDisplay = city || null;

        if (city && (!lat || !lon)) {
            const geo = await geocodeCity(city);
            if (!geo) {
                return res.json({ error: `لم يتم العثور على مدينة باسم «${city}». تأكد من كتابة الاسم بشكل صحيح (BAD_CITY).` });
            }
            lat = geo.lat;
            lon = geo.lon;
            cityDisplay = `${geo.name}${geo.country ? ', ' + geo.country : ''}`;
        }

        if (!lat || !lon) {
            return res.json({ error: 'يرجى تحديد موقعك الجغرافي أو إدخال اسم مدينة. (NO_LOCATION)' });
        }

        const w = await fetchWeatherData(parseFloat(lat), parseFloat(lon));
        res.json({
            city:         cityDisplay || `${parseFloat(lat).toFixed(2)}°, ${parseFloat(lon).toFixed(2)}°`,
            temperature:  w.temperature,
            feelsLike:    w.feelsLike,
            condition:    w.condition,
            emoji:        w.emoji,
            windspeed:    w.windspeed,
            windDirection: w.windDirection,
            humidity:     w.humidity,
            rainChance:   w.rainChance,
            isDay:        w.isDay
        });
    } catch (err) {
        console.error('خطأ الطقس:', err.message);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الطقس. (SERVER_ERROR)' });
    }
});

app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));