# Contributing

Run `npm ci` to install dependencies and `npm run test:watch` to watch the source
tests. Node runs the tests directly from TypeScript.

Run `npm run build` before `npm test` or `npm run cover`. Both commands type-check
the source and run the source tests and the smoke tests for the built packages.
`npm run cover` also writes `coverage/lcov.info` and requires 100% line, branch,
and function coverage. The build smoke tests can be run alone with
`npm run test:artifacts`.
