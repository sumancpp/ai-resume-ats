import { getGeminiModel } from "./gemini.js"

/**
 * Generates personalized exam questions (MCQs & LeetCode style Coding challenges) using Gemini AI.
 */
export const generateExamQuestions = async (
    resumeText = "",
    skills = [],
    roleCategory = "Software Engineering",
    mcqCount = 3,
    codingCount = 2
) => {
    const geminiModel = getGeminiModel()
    const targetMcqCount = Math.max(0, Number(mcqCount) || 0)
    const targetCodingCount = Math.max(0, Number(codingCount) || 0)
    const totalCount = targetMcqCount + targetCodingCount

    const prompt = `
You are an expert technical recruiter and competitive programming question author (similar to LeetCode).
Generate a tailored ${totalCount}-question technical assessment for a candidate applying for a ${roleCategory} role.
Candidate Skills: ${skills.join(", ") || "General Programming, Data Structures, Software Engineering"}

Resume Details Snippet:
${resumeText.substring(0, 1000)}

Requirements:
- Exactly ${targetMcqCount} questions MUST be Multiple Choice Questions (type: "mcq") testing core concepts in their skills (${skills.slice(0, 4).join(", ") || "Programming"}).
- Exactly ${targetCodingCount} questions MUST be Coding Challenges (type: "coding") framed as language-agnostic LeetCode problems (e.g. "Problem: Two Sum. Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.").
- IMPORTANT for coding challenges: DO NOT write "Write a JavaScript function" or hardcode any specific programming language. Provide a clear problem title, description, input format, output format, and function signature solution(...). Candidate will choose their preferred language (Python, JavaScript, C++, Java) on the test platform.
- For each coding challenge, provide 2 test cases (input string, expectedOutput string, description).

RETURN ONLY VALID JSON matching this EXACT structure (NO Markdown, NO html, NO extra text):
{
  "questions": [
    ${Array.from({ length: targetMcqCount }, (_, i) => `{
      "id": "q${i + 1}",
      "type": "mcq",
      "questionText": "Question text here...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0
    }`).join(",\n    ")}
    ${targetMcqCount > 0 && targetCodingCount > 0 ? "," : ""}
    ${Array.from({ length: targetCodingCount }, (_, i) => `{
      "id": "q${targetMcqCount + i + 1}",
      "type": "coding",
      "questionText": "Problem: Reverse String. Given an input string s, reverse the characters in-place or return the reversed string.",
      "starterCode": "function solution(str) {\\n  // Write your solution function here\\n  return str;\\n}",
      "testCases": [
        { "input": "\\"hello\\"", "expectedOutput": "\\"olleh\\"", "description": "Reverse string test case 1" },
        { "input": "\\"world\\"", "expectedOutput": "\\"dlrow\\"", "description": "Reverse string test case 2" }
      ]
    }`).join(",\n    ")}
  ]
}
`

    try {
        const result = await geminiModel.generateContent(prompt)
        let responseText = result.response.text().trim()

        // Clean json markdown delimiters if any
        if (responseText.startsWith("```json")) {
            responseText = responseText.replace(/^```json\s*/, "").replace(/```$/, "").trim()
        } else if (responseText.startsWith("```")) {
            responseText = responseText.replace(/^```\s*/, "").replace(/```$/, "").trim()
        }

        const parsed = JSON.parse(responseText)
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return parsed.questions
        }
    } catch (error) {
        console.error("AI Question Generation Error, using fallback standard questions:", error)
    }

    // Fallback standard tech questions if AI fails
    return [
        {
            id: "q1",
            type: "mcq",
            questionText: `Which data structure operates on a First-In-First-Out (FIFO) basis?`,
            options: ["Stack", "Queue", "Tree", "Graph"],
            correctOptionIndex: 1
        },
        {
            id: "q2",
            type: "mcq",
            questionText: `What is the worst-case time complexity of QuickSort?`,
            options: ["O(n log n)", "O(n)", "O(n^2)", "O(1)"],
            correctOptionIndex: 2
        },
        {
            id: "q3",
            type: "mcq",
            questionText: `Which algorithm is commonly used to find the shortest path in a weighted graph with non-negative edge weights?`,
            options: ["Dijkstra's Algorithm", "Kruskal's Algorithm", "Prim's Algorithm", "Bellman-Ford"],
            correctOptionIndex: 0
        },
        {
            id: "q4",
            type: "coding",
            questionText: "Problem: Reverse String (LeetCode #344). Given an input string s, return the reversed string.",
            starterCode: "function solution(str) {\n  return str.split('').reverse().join('');\n}",
            testCases: [
                { input: '"talent"', expectedOutput: '"tnelat"', description: "Reverse string test case 1" },
                { input: '"code"', expectedOutput: '"edoc"', description: "Reverse string test case 2" }
            ]
        },
        {
            id: "q5",
            type: "coding",
            questionText: "Problem: Find Maximum Subarray / Max Element. Given an array of numbers arr, find and return the maximum value in the array.",
            starterCode: "function solution(arr) {\n  return Math.max(...arr);\n}",
            testCases: [
                { input: "[3, 7, 2, 9, 4]", expectedOutput: "9", description: "Find max element test case 1" },
                { input: "[-5, -2, -10]", expectedOutput: "-2", description: "Find max negative test case 2" }
            ]
        }
    ]
}

/**
 * Evaluates candidate exam submission (MCQs + Coding challenges) and generates automated score & AI feedback.
 */
export const evaluateExamSubmission = async (questions = [], answers = {}, codeSubmissions = []) => {
    let mcqCorrect = 0
    let mcqTotal = 0
    let codingPassed = 0
    let codingTotal = 0

    questions.forEach((q) => {
        if (q.type === "mcq") {
            mcqTotal++
            const candAns = answers[q.id]
            const chosenIndex = typeof candAns === "object" ? candAns?.selectedOption : Number(candAns)
            if (chosenIndex === q.correctOptionIndex) {
                mcqCorrect++
            }
        } else if (q.type === "coding") {
            codingTotal++
            const sub = Array.isArray(codeSubmissions) ? codeSubmissions.find((c) => c.questionId === q.id) : null
            if (sub && Array.isArray(sub.testResults)) {
                const passedCases = sub.testResults.filter((tr) => tr.passed).length
                if (passedCases > 0 && passedCases === sub.testResults.length) {
                    codingPassed++
                } else if (passedCases > 0) {
                    codingPassed += passedCases / sub.testResults.length
                }
            }
        }
    })

    const totalQuestions = questions.length || 1
    const totalPoints = mcqCorrect + codingPassed
    const score = Math.min(100, Math.max(0, Math.round((totalPoints / totalQuestions) * 100)))

    let aiFeedback = `Candidate completed assessment scoring ${score}%. Passed ${mcqCorrect}/${mcqTotal} MCQs and ${codingPassed.toFixed(1)}/${codingTotal} coding challenge test cases.`

    try {
        const geminiModel = getGeminiModel()
        const prompt = `
You are an expert technical evaluator reviewing a job applicant's exam submission.
Exam Performance Summary:
- Final Score: ${score}%
- MCQ Correct Answers: ${mcqCorrect} out of ${mcqTotal}
- Coding Challenges Passed: ${codingPassed.toFixed(1)} out of ${codingTotal}

Generate a 2-sentence professional recruiter evaluation summary describing their performance, technical strengths, and recommendation.
Keep it strictly under 50 words.
`
        const result = await geminiModel.generateContent(prompt)
        const text = result.response.text().trim()
        if (text) {
            aiFeedback = text
        }
    } catch (err) {
        console.error("AI Feedback evaluation generation error, using fallback summary:", err)
    }

    return { score, aiFeedback }
}

/**
 * Evaluates candidate solution code for Time Complexity, Space Complexity, Code Quality, and Plagiarism / AI-generated code detection.
 */
export const analyzeCodeComplexityAndQuality = async (code = "", questionText = "") => {
    if (!code || code.trim().length === 0) {
        return {
            timeComplexity: "O(1)",
            spaceComplexity: "O(1)",
            codeQualityScore: 0,
            plagiarismFlag: false,
            plagiarismConfidence: 0,
            aiAnalysis: "No solution code was submitted."
        }
    }

    try {
        const geminiModel = getGeminiModel()
        const prompt = `
You are a senior principal software engineer and competitive programming grader.
Analyze the following candidate code submission for a technical coding question:

Problem Statement:
${questionText.substring(0, 500)}

Candidate Solution Code:
\`\`\`
${code.substring(0, 2000)}
\`\`\`

Analyze the code and return ONLY valid JSON matching this exact structure (NO markdown code blocks, NO html):
{
  "timeComplexity": "O(N)",
  "spaceComplexity": "O(1)",
  "codeQualityScore": 85,
  "plagiarismFlag": false,
  "plagiarismConfidence": 10,
  "aiAnalysis": "Solution utilizes an optimal single pass loop with linear time complexity and constant auxiliary space. Variable naming is clear and edge cases are handled."
}

Rules:
1. "timeComplexity": Standard Big-O notation string (e.g. O(1), O(N), O(N log N), O(N^2)).
2. "spaceComplexity": Standard Big-O space complexity string (e.g. O(1), O(N)).
3. "codeQualityScore": Integer 0 to 100 based on clean code practices, variable naming, efficiency, and modularity.
4. "plagiarismFlag": Boolean. True ONLY if code shows clear indicators of copy-pasted AI boilerplate or copied solution without organic attempt.
5. "plagiarismConfidence": Integer 0 to 100 indicating confidence level in plagiarism detection.
6. "aiAnalysis": Concise 1-2 sentence assessment of code efficiency and quality.
`

        const result = await geminiModel.generateContent(prompt)
        let responseText = result.response.text().trim()

        if (responseText.startsWith("```json")) {
            responseText = responseText.replace(/^```json\s*/, "").replace(/```$/, "").trim()
        } else if (responseText.startsWith("```")) {
            responseText = responseText.replace(/^```\s*/, "").replace(/```$/, "").trim()
        }

        const parsed = JSON.parse(responseText)
        return {
            timeComplexity: parsed.timeComplexity || "O(N)",
            spaceComplexity: parsed.spaceComplexity || "O(1)",
            codeQualityScore: typeof parsed.codeQualityScore === "number" ? parsed.codeQualityScore : 80,
            plagiarismFlag: !!parsed.plagiarismFlag,
            plagiarismConfidence: parsed.plagiarismConfidence || 0,
            aiAnalysis: parsed.aiAnalysis || "Code evaluated successfully."
        }
    } catch (err) {
        console.error("AI Code Analysis Error, using heuristic fallback:", err)
        
        const lines = code.split("\n").length
        const hasLoops = /for\s*\(|while\s*\(|\.forEach|\.map/g.test(code)
        const nestedLoops = (code.match(/for\s*\(|while\s*\(/g) || []).length > 1

        return {
            timeComplexity: nestedLoops ? "O(N^2)" : hasLoops ? "O(N)" : "O(1)",
            spaceComplexity: code.includes("new Array") || code.includes("[]") ? "O(N)" : "O(1)",
            codeQualityScore: Math.min(95, Math.max(50, 100 - lines)),
            plagiarismFlag: false,
            plagiarismConfidence: 0,
            aiAnalysis: "Automated analysis completed: Code follows standard procedural pattern."
        }
    }
}

