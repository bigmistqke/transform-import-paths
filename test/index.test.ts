import { assert, test } from "vitest"
import { transformModulePaths } from "../src"

test("static import and export: addition", () => {
  assert.equal(
    transformModulePaths(
      `export declare function SuspenseList(props: {
  children: JSX.Element;
  revealOrder: "forwards" | "backwards" | "together";
  tail?: "collapsed" | "hidden";
}): JSX.Element;`,
      (path, kind) => {
        console.log(path, kind)
        return `___${path}`
      },
    ),
    `export declare function SuspenseList(props: {
  children: JSX.Element;
  revealOrder: "forwards" | "backwards" | "together";
  tail?: "collapsed" | "hidden";
}): JSX.Element;`,
  )
})

test("static import and export: addition", () => {
  assert.equal(
    transformModulePaths(
      ` // To update three.js type definition, please make changes to the repository at:
// https://github.com/three-types/three-ts-types.
// Periodically, the updates from the repository are pushed to DefinitelyTyped
// and released in the @types/three npm package.

export * from "./src/Three.d.ts";`,
      (path, kind) => {
        console.log(path, kind)
        return `___${path}`
      },
    ),
    ` // To update three.js type definition, please make changes to the repository at:
// https://github.com/three-types/three-ts-types.
// Periodically, the updates from the repository are pushed to DefinitelyTyped
// and released in the @types/three npm package.

export * from "___./src/Three.d.ts";`,
  )
})

test("static import and export: addition", () => {
  assert.equal(
    transformModulePaths(
      `import test from 'test';
export { data } from 'data';
import { feature } from \`./feature\`;
export * from "test"`,
      (path) => {
        console.log(path)
        return `___${path}`
      },
    ),
    `import test from '___test';
export { data } from '___data';
import { feature } from \`___./feature\`;
export * from "___test"`,
  )
})

test("static import and export: subtraction", () => {
  assert.equal(
    transformModulePaths(
      `import test from 'test';
export { data } from 'data';
import { feature } from \`./feature\`;
export * from "test"`,
      () => "",
    ),
    `import test from '';
export { data } from '';
import { feature } from \`\`;
export * from ""`,
  )
})

test("static import and export: removal", () => {
  assert.equal(
    transformModulePaths(
      `import test from 'test';
import * as test from 'test';
import ( 'test');`,
      (path) => null,
    ),
    `;
;
;`,
  )
})

test("dynamic import: addition", () => {
  assert.equal(
    transformModulePaths(`import("ok");`, (path) => `___${path}`),
    `import("___ok");`,
  )
})

test("dynamic import: removal", () => {
  assert.equal(
    transformModulePaths(`import("ok");`, () => null),
    `;`,
  )
})

test("dynamic import: subtraction", () => {
  assert.equal(
    transformModulePaths(
      `import(\`ok\`);
import /* comment */
( /* comment */ \`complex \${"path"} example\`);`,
      () => ``,
    ),
    `import(\`\`);
import /* comment */
( /* comment */ \`\`);`,
  )
})

test("comments", () => {
  assert.equal(
    transformModulePaths(
      `// Edge cases with comments
// import test from "test"
// import('test')
/* import test from "test" */
/*
    import test from "test"
*/
/*
 * This is a nested comment: import test from "test"
 */
/**
 * Another multi-line comment
 * import(\`test\`)
 */`,
      (path) => `___${path}`,
    ),
    `// Edge cases with comments
// import test from "test"
// import('test')
/* import test from "test" */
/*
    import test from "test"
*/
/*
 * This is a nested comment: import test from "test"
 */
/**
 * Another multi-line comment
 * import(\`test\`)
 */`,
  )
})

test("strings", () => {
  assert.equal(
    transformModulePaths(
      `// Strings containing imports
"import test from 'test'"
'import test from "test"'
\`import { something } from "somewhere"\`

// Nested imports within strings
"\`import nested from \`nested\`\`"
'import nested from 'nested'
"\`import(\\"nested\\")\`"

// Misleading contexts within comments and strings
"// This is a string: import('not really')"
'/* This is also a string: export * from "fake" */'
"/* Another tricky string with \`import\` */"
'/* Nested comment trick: // import { trick } from "trick"; */'

// Unclosed strings and comments (should handle gracefully)
import "unclosed string
/* unclosed comment`,
      (path) => `___${path}`,
    ),
    `// Strings containing imports
"import test from 'test'"
'import test from "test"'
\`import { something } from "somewhere"\`

// Nested imports within strings
"\`import nested from \`nested\`\`"
'import nested from 'nested'
"\`import(\\"nested\\")\`"

// Misleading contexts within comments and strings
"// This is a string: import('not really')"
'/* This is also a string: export * from "fake" */'
"/* Another tricky string with \`import\` */"
'/* Nested comment trick: // import { trick } from "trick"; */'

// Unclosed strings and comments (should handle gracefully)
import "unclosed string
/* unclosed comment`,
  )
})

// Additional robustness tests

test("mixed import and export", () => {
  assert.equal(
    transformModulePaths(
      `import { a } from 'a';
import b from 'b';
export { c } from 'c';
import(\`dynamic\`);
import /* comment */ (
  /* another comment */ 'dynamic2'
);`,
      (path) => `___${path}`,
    ),
    `import { a } from '___a';
import b from '___b';
export { c } from '___c';
import(\`___dynamic\`);
import /* comment */ (
  /* another comment */ '___dynamic2'
);`,
  )
})

test("edge cases in strings and comments", () => {
  assert.equal(
    transformModulePaths(
      `"// This is not a real import: import('fake')"
'/* This is also not a real import: export * from "fake" */'
/**
 * Real import below:
 * import real from 'real'
 */
const real = 'import real from "not_real"';
const x = import('real_dynamic');`,
      (path) => `___${path}`,
    ),
    `"// This is not a real import: import('fake')"
'/* This is also not a real import: export * from "fake" */'
/**
 * Real import below:
 * import real from 'real'
 */
const real = 'import real from "not_real"';
const x = import('___real_dynamic');`,
  )
})

test("varied import/export styles", () => {
  assert.equal(
    transformModulePaths(
      `import def, { named } from 'mod';
import * as all from 'mod_all';
import('mod_dyn');
import /* inline comment */ ('mod_dyn_inline');
export { namedExport } from 'mod_exp';
export * from 'mod_all_exp';`,
      (path) => `___${path}`,
    ),
    `import def, { named } from '___mod';
import * as all from '___mod_all';
import('___mod_dyn');
import /* inline comment */ ('___mod_dyn_inline');
export { namedExport } from '___mod_exp';
export * from '___mod_all_exp';`,
  )
})

test("dynamic import with complex paths", () => {
  assert.equal(
    transformModulePaths(
      `const mod1 = import(/* comment */ 'module1');
const mod2 = import(/* comment */ \`module2\`);
const mod3 = import(\`complex-\${'path'}-example\`);
const mod4 = import(\`complex\${"path"}example\`);`,
      (path) => `___${path}`,
    ),
    `const mod1 = import(/* comment */ '___module1');
const mod2 = import(/* comment */ \`___module2\`);
const mod3 = import(\`___complex-\${'path'}-example\`);
const mod4 = import(\`___complex\${"path"}example\`);`,
  )
})

test("jsx", () => {
  assert.equal(
    transformModulePaths(
      `<>
  {/* import from 'test' */}
  <Test config={"import from 'test'"} />
</>`,
      (path) => `___${path}`,
    ),
    `<>
  {/* import from 'test' */}
  <Test config={"import from 'test'"} />
</>`,
  )
})
