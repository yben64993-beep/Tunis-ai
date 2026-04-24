const sharp = require('sharp');
const fs = require('fs');

async function test() {
    try {
        const svg = `
        <svg width="400" height="400">
            <rect width="100%" height="100%" fill="blue"/>
            <text x="50" y="50" font-size="24" fill="white">Hello 🇹🇳 AI</text>
        </svg>
        `;
        const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
        fs.writeFileSync('test_emoji.png', buffer);
        console.log("Success");
    } catch (e) {
        console.error(e);
    }
}
test();
