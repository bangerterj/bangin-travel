/**
 * API Route: /api/parse/image
 * Uses Google Gemini 1.5 Flash to extract trip data from screenshots.
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Optimize configuration for 10mb limit (Vercel default is 4.5mb, but we'll try to keep it standard)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image, previousAttempts } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image data required (Base64)' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY is missing');
            return res.status(500).json({
                error: 'Server configuration error: Missing AI API Key',
                details: 'Please add GEMINI_API_KEY to .env.local'
            });
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);

        // Dynamic Model Discovery: Find the correct "flash" model name for this API key
        // because alias names like 'gemini-1.5-flash' sometimes 404 on v1beta.
        let modelName = "gemini-1.5-flash-001"; // Stable fallback

        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const listRes = await fetch(listUrl);
            const listData = await listRes.json();

            if (listData.models) {
                // Prefer 1.5 flash, then any flash
                const bestModel = listData.models.find(m => m.name.includes("1.5-flash"))
                    || listData.models.find(m => m.name.includes("flash"));

                if (bestModel) {
                    // Strip 'models/' prefix as SDK usually takes the ID
                    modelName = bestModel.name.replace("models/", "");
                    console.log("Auto-detected Gemini model:", modelName);
                }
            }
        } catch (e) {
            console.warn("Model discovery failed, using fallback:", modelName);
        }

        const model = genAI.getGenerativeModel({ model: modelName });

        // Clean base64 string
        // Provide just the part after "base64,"
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const prompt = `
        You are a travel assistant. Analyze this image (screenshot of a flight, hotel, train, or activity booking) and extract the details into a strict JSON format.

        Identify the TYPE of item: 'flight', 'stay', 'transit', or 'activity'.

        Return JSON matching this structure:
        {
            "type": "flight" | "stay" | "transit" | "activity",
            "title": "Airline + Flight Num, or Hotel Name",
            "startAt": "ISO Date String (YYYY-MM-DDTHH:mm:ss)",
            "endAt": "ISO Date String (YYYY-MM-DDTHH:mm:ss)",
            "notes": "Confirmation codes, seat numbers, or key details",
            "metadata": {
                // For flights:
                "airline": "...",
                "flightNumber": "...",
                "departureAirport": "IATA Code",
                "arrivalAirport": "IATA Code",
                "confirmationCode": "..."
                
                // For stays:
                "address": "...",
                "checkInTime": "...",
                "checkOutTime": "..."
            }
        }
        
        If dates are missing, guess based on context or leave null. 
        If year is missing, assume 2026.
        IMPORTANT: Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg", // Assuming JPEG/PNG, Gemini handles generic image data well usually
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();
        console.log('Gemini Raw Response:', text);

        // Robust JSON extraction
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error('Invalid response format: No JSON found');
        }

        const jsonStr = text.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonStr);

        return res.status(200).json({ data });

    } catch (error) {
        console.error('Parse Error:', error);
        return res.status(500).json({
            error: 'Failed to process image',
            details: error.message
        });
    }
}
