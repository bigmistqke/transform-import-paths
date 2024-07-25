type State = "string" | "block-comment" | "line-comment" | "code"
type DepdendencyKind = "export" | "import" | "dynamic-import"
type StringKind = "'" | '"' | "`"
type Range = [start: number, end: number]

// If these keywords appear when currentDependencyKind is 'export', the dependency declaration is not a module declaration.
const NON_MODULE_EXPORT_KEYWORDS = [
  "class",
  "var",
  "const",
  "let",
  "declare",
  "function",
  "namespace",
  "interface",
  "type",
  "default",
  "enum",
]

export function transformModulePaths(
  code: string,
  transform: (path: string, type: DepdendencyKind) => string | null,
): string {
  let state = "code" as State
  let keyword = ""

  let moduleKind = null as DepdendencyKind | null
  let moduleStartIndex = 0
  let dynamicImportPaths = [] as { path: string; range: Range }[]

  let stringKind = null as StringKind | null
  let stringStartIndex = 0

  let writeIndex = 0
  let index = 0
  let result = ""

  while (index < code.length) {
    const char = code[index]!
    const nextChar = code[index + 1]

    switch (state) {
      case "code":
        // Check if char is a whitespace/newline
        if (/\s/.test(char)) {
          if (
            moduleKind === "export" &&
            NON_MODULE_EXPORT_KEYWORDS.includes(keyword)
          ) {
            moduleKind = null
          }
          keyword = ""
        } else {
          keyword += char
        }
        // Check if a dynamic import is being opened()
        if (char === "(" && moduleKind === "import") {
          moduleKind = "dynamic-import"
          dynamicImportPaths.length = 0
        }
        // Check if a dynamic import is being closed()
        else if (char === ")" && moduleKind === "dynamic-import") {
          moduleKind = null
          if (dynamicImportPaths.length !== 1) {
            console.warn(
              "The following dynamic import cannot be transformed:",
              code.slice(moduleStartIndex, index),
              "Only statically analysable imports can be processed: import('url')",
            )
          } else {
            const {
              path,
              range: [startIndex, endIndex],
            } = dynamicImportPaths[0]
            const newPath = transform(path, "dynamic-import")

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
          state = "block-comment"
          index++
        }
        // Check if the next 2 chars open a line-comment
        else if (char === "/" && nextChar === "/") {
          state = "line-comment"
          index++
        }
        // Check if the next char opens a string
        else if (['"', "'", "`"].includes(char)) {
          stringKind = char as StringKind
          stringStartIndex = index
          state = "string"
        } else {
          const keyword = code.slice(index, index + 6)
          if (keyword === "import" || keyword === "export") {
            moduleStartIndex = index
            result += code.slice(writeIndex, index)
            // Update the last-module-index
            writeIndex = index
            // Check if the next sub-string is the `import` keyword
            if (keyword === "import") {
              index += 5
              moduleKind = "import"
            }
            // Check if the next sub-string is the `export` keyword
            else if (keyword === "export") {
              index += 5
              moduleKind = "export"
            }
          }
        }
        break
      case "string":
        // Check if the opened string is being closed
        if (char === stringKind && code[index - 1] !== "\\") {
          // Check if an importFlag is currently defined
          if (moduleKind) {
            // Get original path from the range (excluding the quotation-marks)
            const originalPath = code.slice(stringStartIndex + 1, index)

            if (moduleKind === "dynamic-import") {
              dynamicImportPaths.push({
                path: originalPath,
                range: [stringStartIndex, index],
              })
            } else {
              // Transform original path with transform-callback
              const newPath = transform(originalPath, moduleKind)

              if (newPath === null) {
                writeIndex = index + 1
              } else {
                // Aggregate result with
                // - the substring from the last module to the current module-path and
                // - the new path
                result += code.slice(writeIndex, stringStartIndex + 1)
                result += newPath
                // Update the last-module-index
                writeIndex = index
              }

              // Reset import-flag
              moduleKind = null
            }
          }

          // Reset state
          state = "code"
          // Reset string-kind
          stringKind = null
        }
        break
      case "block-comment":
        // Check if the opened block-comment is being closed with */
        if (char === "*" && nextChar === "/") {
          index++
          // Reset current-state
          state = "code"
        }
        break
      case "line-comment":
        // Check if the opened line-comment is being closed with a newline
        if (char === "\n") {
          // Reset current-state
          state = "code"
        }
        break
    }
    index++
  }
  return writeIndex === 0 ? code : result + code.slice(writeIndex)
}
