**💛 You can help the author become a full-time open-source maintainer by [sponsoring him on GitHub](https://github.com/sponsors/bigmistqke).**

---

# @bigmistqke/transform-module-path

[![npm version](https://badgen.net/npm/v/@bigmistqke/transform-module-path)](https://npm.im/@bigmistqke/transform-module-path) [![npm downloads](https://badgen.net/npm/dm/@bigmistqke/transform-module-path)](https://npm.im/@bigmistqke/transform-module-path)

Transform dynamic and static import/export paths of a given javascript/typescript string

## Install

```bash
npm i @bigmistqke/transform-module-path
```

## Usage

```ts
import { transformModulePath } from "@bigmistqke/transform-module-path"

const transformed = transformModulePath(
  `import * as test from "this-should-transform"
  // import * as test from "this-should-not-transform"`,
  (path) => `___${path}`,
)
```

## Sponsors

[![sponsors](https://sponsors-images.bigmistqke.dev/sponsors.svg)](https://github.com/sponsors/bigmistqke)

## License

MIT &copy; [bigmistqke](https://github.com/sponsors/bigmistqke)
