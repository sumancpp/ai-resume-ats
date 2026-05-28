export const getGeminiModel = () => {
    return {
        generateContent: async (prompt) => {
            const apiKey = process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
                throw new Error("CRITICAL: GEMINI_API_KEY is missing from process.env at runtime!");
            }

            // Target the active gemini-2.5-flash model via the stable v1 API path
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Google API Error [${response.status}]: ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();

            // Structure mock helper to emulate the exact response object layout of the SDK
            return {
                response: {
                    text: () => data.candidates[0].content.parts[0].text
                }
            };
        }
    };
};