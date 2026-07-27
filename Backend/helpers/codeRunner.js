import vm from "vm"

/**
 * Safely runs a JavaScript function against provided test cases.
 * @param {string} code - Candidate's JS solution code (e.g. function solution(arr) { ... })
 * @param {Array} testCases - [{ input: "...", expectedOutput: "..." }]
 * @returns {Array} - [{ input, expected, actual, passed, error }]
 */
export const runJsCode = (code, testCases = []) => {
    const results = []

    for (const testCase of testCases) {
        let actual = ""
        let passed = false
        let error = null

        try {
            // Prepare a sandbox context
            const sandbox = {
                console: {
                    log: (...args) => {
                        // Suppress or capture console logs
                    }
                },
                result: null,
                error: null
            }

            const context = vm.createContext(sandbox)

            // Parse input arguments safely
            let parsedInputs = []
            try {
                // If input looks like JSON array/arguments or primitive, parse it
                if (testCase.input.startsWith("[") || testCase.input.startsWith("{") || !isNaN(testCase.input)) {
                    parsedInputs = JSON.parse(`[${testCase.input}]`)
                } else {
                    parsedInputs = [testCase.input]
                }
            } catch (e) {
                parsedInputs = [testCase.input]
            }

            // Script runner wrapping candidate code and executing test invocation
            const runnerScript = `
                ${code}
                
                try {
                    // Locate the last defined function or 'solution' / first function
                    let targetFn = typeof solution === 'function' ? solution : null;
                    if (!targetFn) {
                        const globalKeys = Object.keys(this);
                        for (const k of globalKeys) {
                            if (typeof this[k] === 'function') {
                                targetFn = this[k];
                                break;
                            }
                        }
                    }
                    
                    if (typeof targetFn === 'function') {
                        result = targetFn(...${JSON.stringify(parsedInputs)});
                    } else {
                        throw new Error("No executable function found. Define a function like 'function solution(...)'.");
                    }
                } catch (err) {
                    error = err.message;
                }
            `

            const script = new vm.Script(runnerScript)
            // Run script with strict 2 second timeout to prevent infinite loops
            script.runInContext(context, { timeout: 2000 })

            if (sandbox.error) {
                actual = `Error: ${sandbox.error}`
                passed = false
            } else {
                actual = typeof sandbox.result === "object" ? JSON.stringify(sandbox.result) : String(sandbox.result)

                // Normalize comparison
                const normActual = String(actual).replace(/\s+/g, "").trim()
                const normExpected = String(testCase.expectedOutput).replace(/\s+/g, "").trim()

                passed = normActual === normExpected
            }
        } catch (err) {
            actual = `Execution Error: ${err.message}`
            passed = false
            error = err.message
        }

        results.push({
            input: testCase.input,
            expected: testCase.expectedOutput,
            actual,
            passed,
            hidden: testCase.hidden || false,
            error
        })
    }

    return results
}
