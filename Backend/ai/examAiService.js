import { getGeminiModel } from "./gemini.js"

/**
 * Generates personalized exam questions (MCQs & Coding challenges) using Gemini AI.
 */
export const generateExamQuestions = async (resumeText = "", skills = [], roleCategory = "Software Engineering") => {
    const geminiModel = getGeminiModel()

    const prompt = `
You are an expert technical recruiter and interviewer.
Generate a tailored 5-question technical exam for a candidate applying for a ${roleCategory} role.
Candidate Skills: ${skills.join(", ") || "General Programming, Software Engineering"}

Resume Details Snippet:
${resumeText.substring(0, 1000)}

Requirements:
- Question 1, 2, 3 MUST be Multiple Choice Questions (MCQs) testing core concepts in their skills (${skills.slice(0, 3).join(", ") || "Programming"}).
- Question 4 & 5 MUST be Coding Challenges where candidate writes a JavaScript function.
- Provide 2 test cases for each coding challenge (input string, expectedOutput string, description).

RETURN ONLY VALID JSON matching this EXACT structure (NO Markdown, NO html, NO extra text):
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "questionText": "Question text here...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0
    },
    {
      "id": "q2",
      "type": "mcq",
      "questionText": "Question text here...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 1
    },
    {
      "id": "q3",
      "type": "mcq",
      "questionText": "Question text here...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 2
    },
    {
      "id": "q4",
      "type": "coding",
      "questionText": "Write a function solution(str) that...",
      "starterCode": "function solution(str) {\\n  // Write your code here\\n  return str;\\n}",
      "testCases": [
        { "input": "\\"hello\\"", "expectedOutput": "\\"olleh\\"", "description": "Reverses string" },
        { "input": "\\"world\\"", "expectedOutput": "\\"dlrow\\"", "description": "Reverses word" }
      ]
    },
    {
      "id": "q5",
      "type": "coding",
      "questionText": "Write a function solution(arr) that...",
      "starterCode": "function solution(arr) {\\n  // Write your code here\\n  return [];\\n}",
      "testCases": [
        { "input": "[1, 2, 3, 2, 1]", "expectedOutput": "[1, 2, 3]", "description": "Removes duplicates" },
        { "input": "[5, 5, 5]", "expectedOutput": "[5]", "description": "Removes duplicates" }
      ]
    }
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
            questionText: `In JavaScript, which operator checks for both value and type equality?`,
            options: ["==", "=", "===", "equals()"],
            correctOptionIndex: 2
        },
        {
            id: "q4",
            type: "coding",
            questionText: "Write a JavaScript function solution(str) that returns the reversed version of the input string.",
            starterCode: "function solution(str) {\n  return str.split('').reverse().join('');\n}",
            testCases: [
                { input: '"talent"', expectedOutput: '"tnelat"', description: "Reverse string" },
                { input: '"code"', expectedOutput: '"edoc"', description: "Reverse code" }
            ]
        },
        {
            id: "q5",
            type: "coding",
            questionText: "Write a JavaScript function solution(arr) that returns the maximum number in an array of numbers.",
            starterCode: "function solution(arr) {\n  return Math.max(...arr);\n}",
            testCases: [
                { input: "[3, 7, 2, 9, 4]", expectedOutput: "9", description: "Find max element" },
                { input: "[-5, -2, -10]", expectedOutput: "-2", description: "Find max negative" }
            ]
        }
    ]
}

/**
 * AI Evaluation of Candidate Answers & Code Submissions
 */
export const evaluateExamSubmission = async (questions = [], answers = {}, codeSubmissions = []) => {
    let mcqCorrectCount = 0
    let mcqTotalCount = 0
    let codePassedTestCases = 0
    let codeTotalTestCases = 0

    questions.forEach((q) => {
        if (q.type === "mcq") {
            mcqTotalCount++
            const candAnswer = answers[q.id]
            if (Number(candAnswer) === q.correctOptionIndex) {
                mcqCorrectCount++
            }
        }
    })

    codeSubmissions.forEach((sub) => {
        if (sub.testResults && Array.isArray(sub.testResults)) {
            sub.testResults.forEach((tr) => {
                codeTotalTestCases++
                if (tr.passed) {
                    codePassedTestCases++
                }
            })
        }
    })

    // Calculate baseline automated score
    const mcqWeight = mcqTotalCount > 0 ? (mcqCorrectCount / mcqTotalCount) * 50 : 0
    const codeWeight = codeTotalTestCases > 0 ? (codePassedTestCases / codeTotalTestCases) * 50 : 0
    const totalScore = Math.round(mcqWeight + codeWeight)

    const geminiModel = getGeminiModel()
    const evaluationPrompt = `
Generate brief HR feedback for a candidate's technical assessment:
- MCQ Score: ${mcqCorrectCount}/${mcqTotalCount}
- Coding Test Cases Passed: ${codePassedTestCases}/${codeTotalTestCases}
- Overall Auto-Score: ${totalScore}%

Write a 2-3 sentence overall evaluation summary for HR.
`

    let aiFeedback = `Candidate completed the assessment with a score of ${totalScore}%. Passed ${mcqCorrectCount}/${mcqTotalCount} MCQs and ${codePassedTestCases}/${codeTotalTestCases} coding test cases.`
    try {
        const result = await geminiModel.generateContent(evaluationPrompt)
        aiFeedback = result.response.text().trim()
    } catch (e) {
        // Keep default feedback
    }

    return {
        score: totalScore,
        mcqCorrectCount,
        mcqTotalCount,
        codePassedTestCases,
        codeTotalTestCases,
        aiFeedback
    }
}
