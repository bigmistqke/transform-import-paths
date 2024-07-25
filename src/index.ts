type State = "string" | "block-comment" | "line-comment"
type ImportKind = "export-path" | "import-path" | "dynamic-import-path"
type StringKind = "'" | '"' | "`"
type Range = [start: number, end: number]

export function transformModulePaths(
  code: string,
  transform: (path: string, type: ImportKind) => string | null,
): string {
  let currentState: State | null = null
  let stringKind: StringKind | null = null
  let importKind: ImportKind | null = null

  let currentStringStartIndex = 0
  let writeIndex = 0

  let currentDynamicImportPaths: { path: string; range: Range }[] = []
  let currenyModuleStartIndex: number = 0
  let result = ""
  let index = 0

  while (index < code.length) {
    const char = code[index]
    const nextChar = code[index + 1]

    switch (currentState) {
      case null:
        // Check if a dynamic import is being opened()
        if (char === "(" && importKind === "import-path") {
          importKind = "dynamic-import-path"
          currentDynamicImportPaths.length = 0
        }
        // Check if a dynamic import is being closed()
        else if (char === ")" && importKind === "dynamic-import-path") {
          importKind = null
          if (currentDynamicImportPaths.length !== 1) {
            console.warn(
              "The following dynamic import cannot be transformed:",
              code.slice(currenyModuleStartIndex, index),
              "Only statically analysable imports can be processed: import('url')",
            )
          } else {
            const {
              path,
              range: [startIndex, endIndex],
            } = currentDynamicImportPaths[0]
            const newPath = transform(path, "dynamic-import-path")

            if (newPath === null) {
              writeIndex = index + 1
            } else {
              // Aggregate result with
              // - the substring from the last module to the current module-path and
              // - the new path
              result += code.slice(writeIndex, startIndex + 1)
              result += newPath
              writeIndex = endIndex
            }
          }
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
          currentStringStartIndex = index
          currentState = "string"
        } else {
          const keyword = code.slice(index, index + 6)
          if (keyword === "import" || keyword === "export") {
            currenyModuleStartIndex = index
            result += code.slice(writeIndex, index)
            // Update the last-module-index
            writeIndex = index
            // Check if the next sub-string is the `import` keyword
            if (keyword === "import") {
              index += 5
              importKind = "import-path"
            }
            // Check if the next sub-string is the `export` keyword
            else if (keyword === "export") {
              index += 5
              importKind = "export-path"
            }
          }
        }
        break
      case "string":
        // Check if the opened string is being closed
        if (char === stringKind && code[index - 1] !== "\\") {
          // Check if an importFlag is currently defined
          if (importKind) {
            // Get original path from the range (excluding the quotation-marks)
            const originalPath = code.slice(currentStringStartIndex + 1, index)

            if (importKind === "dynamic-import-path") {
              currentDynamicImportPaths.push({
                path: originalPath,
                range: [currentStringStartIndex, index],
              })
            } else {
              // Transform original path with transform-callback
              const newPath = transform(originalPath, importKind)

              if (newPath === null) {
                writeIndex = index + 1
              } else {
                // Aggregate result with
                // - the substring from the last module to the current module-path and
                // - the new path
                result += code.slice(writeIndex, currentStringStartIndex + 1)
                result += newPath
                // Update the last-module-index
                writeIndex = index
              }

              // Reset import-flag
              importKind = null
            }
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
  return writeIndex === 0 ? code : result + code.slice(writeIndex)
}
