export const getGeminiModel = () => {
    return {
        generateContent: async (prompt) => {
            const apiKey = process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
                throw new Error("CRITICAL: GEMINI_API_KEY is missing from process.env at runtime!");
            }

            // Fallback list prioritizing high free-tier quota models (1,500 RPD) over restricted preview models (20 RPD)
            const defaultModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-pro"];
            const models = [process.env.GEMINI_MODEL, ...defaultModels].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

            let lastError = null;

            for (const modelName of models) {
                try {
                    // Using v1beta endpoint path for max model compatibility
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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

                    if (response.ok) {
                        const data = await response.json();
                        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        return {
                            response: {
                                text: () => textContent
                            }
                        };
                    }

                    const errorData = await response.json().catch(() => ({}));
                    lastError = new Error(`Google API Error [${response.status}] for model ${modelName}: ${JSON.stringify(errorData)}`);

                    // If 429 quota/rate limit or 404 model not found, try the next fallback model
                    if (response.status === 429 || response.status === 404) {
                        console.warn(`[GEMINI API WARNING] Model '${modelName}' returned status ${response.status}. Attempting fallback model...`);
                        continue;
                    }

                    // For non-quota errors (e.g. 400 Bad Request), break early
                    break;
                } catch (err) {
                    lastError = err;
                }
            }

            throw lastError || new Error("All Gemini API model attempts failed.");
        }
    };
};