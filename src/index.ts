type State = "string" | "block-comment" | "line-comment"
type ImportType = "export-path" | "import-path" | "dynamic-import-path"
type StringKind = "'" | '"' | "`"

export function transformModulePaths(
  code: string,
  transform: (path: string, type: ImportType) => string,
): string {
  let currentState: State | null = null
  let stringKind: StringKind | null = null
  let importFlag: ImportType | null = null
  let stringStartIndex = 0
  let lastModuleIndex = 0
  let result = ""

  let index = 0

  while (index < code.length) {
    const char = code[index]
    const nextChar = code[index + 1]

    switch (currentState) {
      case null:
        // Check if a dynamic import is being opened()
        if (char === "(" && importFlag === "import-path") {
          importFlag = "dynamic-import-path"
        }
        // Check if a dynamic import is being closed()
        else if (char === ")" && importFlag === "dynamic-import-path") {
          importFlag = null
        }
        // Check if the next 2 chars open a block-comment
        else if (char === "/" && nextChar === "*") {
          currentState = "block-comment"
          index++
        }
        // Check if the next 2 chars open a line-comment
        else if (char === "/" && nextChar === "/") {
          currentState = "line-comment"
          index++
        }
        // Check if the next char opens a string
        else if (['"', "'", "`"].includes(char)) {
          stringKind = char as StringKind
          stringStartIndex = index
          currentState = "string"
        } else {
          const keyword = code.slice(index, index + 6)
          // Check if the next sub-string is the `import` keyword
          if (keyword === "import") {
            index += 5
            importFlag = "import-path"
          }
          // Check if the next sub-string is the `export` keyword
          else if (keyword === "export") {
            index += 5
            importFlag = "export-path"
          }
        }
        break
      case "string":
        // Check if the opened string is being closed
        if (char === stringKind && code[index - 1] !== "\\") {
          // Check if an importFlag is currently defined
          if (importFlag) {
            // Get original path from the range (excluding the quotation-marks)
            const originalPath = code.slice(stringStartIndex + 1, index)
            // Transform original path with transform-callback
            const newPath = transform(originalPath, importFlag)

            // Aggregate result with
            // - the substring from the last module to the current module-path and
            // - the new path
            result +=
              code.slice(lastModuleIndex, stringStartIndex + 1) + newPath
            // Update the last-module-index
            lastModuleIndex = index
            // Reset import-flag
            importFlag = null
          }

          // Reset current-state
          currentState = null
          // Reset string-kind
          stringKind = null
        }
        break
      case "block-comment":
        // Check if the opened block-comment is being closed with */
        if (char === "*" && nextChar === "/") {
          index++
          // Reset current-state
          currentState = null
        }
        break
      case "line-comment":
        // Check if the opened line-comment is being closed with a newline
        if (char === "\n") {
          // Reset current-state
          currentState = null
        }
        break
    }
    index++
  }
  return lastModuleIndex === 0 ? code : result + code.slice(lastModuleIndex)
}
