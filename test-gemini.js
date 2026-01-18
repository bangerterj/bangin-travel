const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Try to load .env.local manually since we aren't using dotenv package explicitly here yet
try {
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim().replace(/"/g, ''); // Simple parse
            }
        });
    }
} catch (e) {
    console.log("Could not load .env.local", e);
}

function log(msg) {
    try { fs.appendFileSync('gemini-log.txt', msg + '\n'); } catch (e) { }
    process.stdout.write(msg + '\n');
}

async function testModel(genAI, modelName) {
    log(`\n--- Testing ${modelName} ---`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello?");
        const response = await result.response;
        log(`✅ ${modelName} WORKED!`);
        return true;
    } catch (e) {
        log(`❌ ${modelName} Failed: ${e.message}`);
        return false;
    }
}

async function testGemini() {
    fs.writeFileSync('gemini-log.txt', 'Starting Test...\n');
    const key = process.env.GEMINI_API_KEY;
    if (!key) { log("No Key"); return; }
    log("Key found.");

    const genAI = new GoogleGenerativeAI(key);

    // Testing specific versions
    await testModel(genAI, "gemini-1.5-flash-001");
    await testModel(genAI, "gemini-1.0-pro");
    await testModel(genAI, "gemini-pro-vision");
}

testGemini();
