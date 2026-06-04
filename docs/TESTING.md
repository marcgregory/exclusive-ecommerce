## Running tests

- Run frontend tests:

```bash
cd frontend
npm test
```

- Run backend tests:

```bash
cd backend
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/exclusive_ecommerce_test npm test
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
