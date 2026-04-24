const fetch = require('node-fetch') || globalThis.fetch;
async function testSearch(query) {
    console.log('Searching for:', query);
    try {
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const html = await res.text();
        const snippets = [];
        // Extract results
        const regex = /<a class="result__snippet[^>]*>(.*?)<\/a>/gi;
        let match;
        while ((match = regex.exec(html)) !== null && snippets.length < 3) {
            let text = match[1].replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, ' ').trim();
            snippets.push(text);
        }
        console.log('Results:', snippets);
    } catch (e) {
        console.error(e);
    }
}
testSearch("أخبار تونس اليوم");
