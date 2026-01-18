const fs = require('fs');
const path = require('path');

// Load env
try {
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim().replace(/"/g, '');
            }
        });
    }
} catch (e) { }

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API KEY found");
    process.exit(1);
}

console.log("Fetching models with key:", apiKey.substring(0, 5) + "...");

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.error("API Error:", data.error);
        } else if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
            });
            fs.writeFileSync('available_models.txt', JSON.stringify(data.models, null, 2));
        } else {
            console.log("Unexpected response:", data);
        }
    } catch (error) {
        console.error("Request failed:", error);
    }
}

listModels();
