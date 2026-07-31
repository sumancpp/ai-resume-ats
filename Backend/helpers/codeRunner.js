import vm from "vm"
import { spawnSync } from "child_process"
import fs from "fs"
import path from "path"
import os from "os"

/**
 * Safely runs candidate code (JavaScript or Python) against provided test cases.
 * @param {string} code - Candidate's solution code
 * @param {Array} testCases - [{ input: "...", expectedOutput: "..." }]
 * @param {string} language - "javascript" | "python" | "cpp" | "java"
 * @returns {Array} - [{ input, expected, actual, passed, error }]
 */
export const runCode = (code, testCases = [], language = "javascript") => {
    const isPython = language?.toLowerCase().includes("python") || language?.toLowerCase() === "py" || /^\s*def\s+/m.test(code)

    if (isPython) {
        return runPythonCode(code, testCases)
    }

    return runJsCode(code, testCases)
}

/**
 * Executes Python 3 code safely using python3 runner in temporary directory
 */
const runPythonCode = (code, testCases = []) => {
    const results = []
    const tmpDir = os.tmpdir()
    const scriptPath = path.join(tmpDir, `temp_sol_${Date.now()}_${Math.random().toString(36).substring(7)}.py`)

    const runnerScript = `
import sys
import json

# Candidate Code
${code}

def run_tests():
    test_cases = json.loads(sys.argv[1])
    results = []
    
    # Locate solution function
    target_fn = None
    if 'solution' in globals() and callable(globals()['solution']):
        target_fn = globals()['solution']
    else:
        for k, v in globals().items():
            if callable(v) and not k.startswith('_') and k != 'run_tests':
                target_fn = v
                break

    for tc in test_cases:
        raw_input = tc.get('input', '')
        expected = tc.get('expectedOutput', '')
        actual = ""
        passed = False
        error = None
        
        try:
            # Parse input arguments
            try:
                if raw_input.startswith('[') or raw_input.startswith('{') or raw_input.isdigit():
                    args = [json.loads(raw_input)]
                else:
                    args = [json.loads(f'[{raw_input}]')]
            except Exception:
                args = [raw_input]

            if target_fn:
                res = target_fn(*args)
                actual = json.dumps(res) if isinstance(res, (dict, list)) else str(res)
                
                # Normalize comparison
                norm_actual = str(actual).replace(" ", "").strip('"').strip()
                norm_expected = str(expected).replace(" ", "").strip('"').strip()
                passed = (norm_actual == norm_expected)
            else:
                actual = "Error: No executable function found (define solution(args))."
                passed = False
        except Exception as e:
            actual = f"Error: {str(e)}"
            passed = False
            error = str(e)
            
        results.append({
            "input": raw_input,
            "expected": expected,
            "actual": actual,
            "passed": passed,
            "error": error
        })
        
    print(json.dumps(results))

if __name__ == "__main__":
    run_tests()
`

    try {
        fs.writeFileSync(scriptPath, runnerScript, "utf8")
        const pythonProc = spawnSync("python3", [scriptPath, JSON.stringify(testCases)], {
            timeout: 2000,
            encoding: "utf8"
        })

        if (pythonProc.error || pythonProc.status !== 0) {
            const stderr = pythonProc.stderr || pythonProc.error?.message || "Execution error"
            return testCases.map(tc => ({
                input: tc.input,
                expected: tc.expectedOutput,
                actual: `Python Error: ${stderr.trim()}`,
                passed: false,
                error: stderr
            }))
        }

        const parsedOutput = JSON.parse(pythonProc.stdout.trim())
        return parsedOutput
    } catch (err) {
        return testCases.map(tc => ({
            input: tc.input,
            expected: tc.expectedOutput,
            actual: `Execution Error: ${err.message}`,
            passed: false,
            error: err.message
        }))
    } finally {
        try {
            if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath)
        } catch (e) {}
    }
}

/**
 * Safely runs JavaScript code using Node vm sandbox
 */
export const runJsCode = (code, testCases = []) => {
    const results = []

    for (const testCase of testCases) {
        let actual = ""
        let passed = false
        let error = null

        try {
            const sandbox = {
                console: { log: () => {} },
                result: null,
                error: null
            }

            const context = vm.createContext(sandbox)

            let parsedInputs = []
            try {
                if (testCase.input.startsWith("[") || testCase.input.startsWith("{") || !isNaN(testCase.input)) {
                    parsedInputs = JSON.parse(`[${testCase.input}]`)
                } else {
                    parsedInputs = [testCase.input]
                }
            } catch (e) {
                parsedInputs = [testCase.input]
            }

            const runnerScript = `
                ${code}
                
                try {
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
            script.runInContext(context, { timeout: 2000 })

            if (sandbox.error) {
                actual = `Error: ${sandbox.error}`
                passed = false
            } else {
                actual = typeof sandbox.result === "object" ? JSON.stringify(sandbox.result) : String(sandbox.result)

                const normActual = String(actual).replace(/\s+/g, "").replace(/^"|"$/g, "").trim()
                const normExpected = String(testCase.expectedOutput).replace(/\s+/g, "").replace(/^"|"$/g, "").trim()

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
