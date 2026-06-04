## Running tests

- Run the full test suite locally:

```bash
npm test
```

- Run a single test file (Vitest):

```bash
npx vitest run path/to/test.file.ts
```

- Run a specific test by name:

```bash
npx vitest --testNamePattern="Partial name of the test"
```

- Common troubleshooting:
  - If tests fail, run `npx vitest` to get an interactive runner with watch mode.
  - Ensure dev dependencies are installed (`npm ci` or `npm install`).
