import { GoogleGenerativeAI } from "@google/generative-ai";

// GoogleGenerativeAI imported above

export default async function handler(req, res) {
    // Re-init per request to be safe with hot reloading envs in dev
    const genAI = process.env.GEMINI_API_KEY
        ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        : null;
    // Using gemini-2.0-flash (Confirmed available via API list)
    const model = genAI ? genAI.getGenerativeModel({ model: "gemini-2.0-flash" }) : null;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { action, destination, startDate, endDate, vibe, pace, companions } = req.body;

        console.log("Trip Tio API Request:", action);
        console.log("Has API Key:", !!process.env.GEMINI_API_KEY);

        if (!model) {
            if (!process.env.GEMINI_API_KEY) {
                console.warn("No GEMINI_API_KEY found. Returning mock data.");
                return res.status(200).json(getMockData(action, destination));
            }
            console.error("Model not initialized despite having key?");
        }

        if (action === "seasonal-insight") {
            const prompt = `
            Act as an expert travel planner.
            Give me ONE short, punchy, exciting sentence about why visiting ${destination} in ${startDate} (or that season) is a great idea.
            Focus on weather, famous events, or the general atmosphere.
            Keep it under 20 words.
            Example: "October means Oktoberfest and crisp autumn walks in the English Garden!"
            `;

            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const insight = response.text().trim();
                console.log("Gemini Insight Success:", insight);
                return res.status(200).json({ insight });
            } catch (error) {
                console.error("Gemini Insight Error Stack:", error);
                // DEBUG: Return error to UI
                return res.status(200).json({ insight: `AI Error: ${error.message}` });
            }
        }

        if (action === "previews") {
            let targetCount = 8; // Default
            try {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

                // Density: Chill (1), Balanced (1.6), Packed (3)
                let density = 1.6;
                if (pace < 35) density = 1;
                else if (pace > 65) density = 3;

                const coreDays = Math.max(0, days - 2);
                // Travel days (2) get 1 item each. Core days get density.
                targetCount = Math.ceil((coreDays * density) + 2);
                targetCount = Math.max(3, Math.min(targetCount, 25));
            } catch (e) { }

            const prompt = `
        Act as an expert travel planner called Trip Tio.
        Plan 3 distinct trip previews for:
        - Destination: ${destination}
        - Dates: ${startDate} to ${endDate}
        - Vibe: ${vibe?.join(", ")}
        - Pace: ${pace} (0=Chill, 100=Packed)
        - Group: ${companions}

        Goal: Create 3 diverse, high-quality itinerary concepts.
        Instead of a day-by-day schedule, provide a curated list of the "Top Experiences" included in each plan.
        - Based on the length and pace, provide roughly ${targetCount} items per plan.
        - Be realistic but inspiring. Include specific restaurants, hidden gems, and main attractions.

        Return strictly Valid JSON array of 3 objects. No markdown formatting.
        Schema:
        [
          {
            "id": "1",
            "title": "String (Campaign-style title)",
            "theme": "String (e.g. Culinary Deep Dive)",
            "pace": "Relaxed | Balanced | Packed",
            "reasonForTimeOfYear": "String (Why is this good right now?)",
            "highlights": ["String", "String", "String"],
            "items": [
              {
                "title": "String (Name of place/activity)",
                "category": "Activity | Dining | Chill | Nightlife",
                "duration": "String (e.g. 2h, Half-day)",
                "timeHint": "String (Morning | Afternoon | Evening | Sunset)",
                "neighborhood": "String (e.g. Downtown, Beachfront)",
                "description": "String (Why it fits)"
              }
              // ... 5-15 items depending on length
            ]
          }
        ]
      `;

            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                let text = response.text();
                // Clean up markdown code blocks if present
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const previews = JSON.parse(text);
                return res.status(200).json({ previews });
            } catch (error) {
                console.error("Gemini Error:", error);
                // Fallback if parsing fails or AI fails
                return res.status(200).json(getMockData("previews", destination));
            }
        }

        return res.status(400).json({ error: "Invalid action" });

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

function getMockData(action, destination) {
    if (action === "insight") {
        return { insight: `Mock Insight: ${destination} is wonderful this time of year with mild weather and fewer crowds.` };
    }
    if (action === "previews") {
        return {
            previews: [
                {
                    id: "1",
                    title: `Classic ${destination}`,
                    theme: "History & Culture",
                    pace: "Balanced",
                    reasonForTimeOfYear: "Perfect weather for walking tours.",
                    highlights: ["Old Town", "Local Market", "Sunset View"],
                    days: []
                },
                {
                    id: "2",
                    title: `Hidden Gems of ${destination}`,
                    theme: "Exploration",
                    pace: "Active",
                    reasonForTimeOfYear: "Great for outdoor activities.",
                    highlights: ["Secret Cafe", "Mountain Hike", "Local Art"],
                    days: []
                },
                {
                    id: "3",
                    title: `Relaxed ${destination}`,
                    theme: "Leisure",
                    pace: "Relaxed",
                    reasonForTimeOfYear: "Ideal for spa and dining.",
                    highlights: ["Spa Day", "Wine Tasting", "Scenic Drive"],
                    days: []
                }
            ]
        };
    }
}
