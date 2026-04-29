const fetch = require('node-fetch');

async function test() {
    const res = await fetch('https://ai-image-service--tunisiamindai.replit.app/api/generate-image-sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 93793389y'
        },
        body: JSON.stringify({ prompt: 'a cat' })
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
}

test();
