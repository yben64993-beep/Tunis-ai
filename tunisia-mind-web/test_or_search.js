const fetch = require('node-fetch') || globalThis.fetch;
async function test() {
    try {
        const res = await fetch('https://text.pollinations.ai/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'searchgpt',
                messages: [{ role: 'user', content: 'What is the news about Tunisia today?' }],
                search: true
            })
        });
        const data = await res.json();
        console.log(data.choices[0].message.content);
    } catch(e) { console.error(e); }
}
test();
