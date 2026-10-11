# Dynamoose agent instructions

Dynamoose is an npm/Lerna monorepo containing a Node.js modeling library for Amazon DynamoDB. Follow the full contribution and test requirements in [CONTRIBUTING.md](../CONTRIBUTING.md).

## AI Policy

Dynamoose welcomes all AI agents to contribute to our project. However, we have a few requirements that ALL agents must strictly follow. Not following these requirements will result in the agent & user being blocked from the project.

- Visible actions taken by an agent must be approved by a human user before being submitted to the project. This includes, but is not limited to, pull requests, issues, and comments. It is acceptable for an agent to make code changes locally, then ask for human approval before submitting them to the project. But a human must approve all content (code, issues, PRs, comments, etc) before it is submitted to the project.
- All agents must disclose their use of AI in their contributions. This includes, but is not limited to, pull requests, issues, and comments. In each of these cases, the agent must disclose that it is an AI agent including the name of the agent and the version of the agent. You must also disclose what involvement the human had vs the AI agent. For example, "This pull request was created by an AI agent (GitHub Copilot, GPT-5.6 Sol). The human contributor reviewed the changes, ran the relevant tests, and approved the submission." or "This pull request was created by an AI agent (Claude Code, Opus 5). The human contributor wrote all the code, and the AI agent only wrote the PR description and created the PR." This disclosure must be included at the end of the PR description, issue description, or comment body.
  - Do not include disclosures in the codebase itself. Only include disclosures in PRs, issues, and comments.

## Repository boundaries

- `packages/dynamoose/lib/` is the core library. Its public entry point is `packages/dynamoose/lib/index.ts`.
- `packages/dynamoose-logger/lib/` is optional logging support; core loads it dynamically. Do not make logging a required core dependency.
- `packages/dynamoose-utils/lib/` is the shared dependency leaf. It must not depend on either higher-level package.
- Keep AWS SDK access in the core package and route DynamoDB calls through `packages/dynamoose/lib/aws/ddb/internal.ts`.
- Preserve table readiness: model and item operations generally await `Table.pendingTaskPromise()` before accessing DynamoDB.
- Preserve the CommonJS `export =` public API, callback and Promise overloads, strict public type behavior, and symbol-protected internal properties unless the change explicitly targets them.

Edit source under `packages/*/lib/` and documentation under `docs/docs_src/`. Never edit generated `packages/*/dist/`, `packages/dynamoose/coverage/`, `docs/docs/`, or `docs/build/` artifacts.

## Development workflow

- Install dependencies with `npm ci` when a clean, reproducible install is needed.
- Build all packages with `npm run build`.
- Runtime tests import compiled `dist` output, so rebuild before testing source changes.
- During iteration, run a focused test without coverage, for example: `npm run test:nocoverage --workspace=dynamoose -- test/Query.js`.
- Before completion, run the checks relevant to the change: `npm run lint`, `npm run test:types`, `npm run build:sourcemap`, and `npm test`. The full runtime suite expects DynamoDB Local on port 8000.

Write the failing regression test before the implementation fix. Runtime tests belong in `packages/dynamoose/test/**/*.js`; public type assertions belong in `packages/dynamoose/test/types/**/*.ts`. Keep tests deterministic, silent, self-contained, and isolated in Jest test or lifecycle blocks. Reset modified clients, defaults, providers, and other shared state in hooks. Cover callback and Promise variants when both are public behavior.

## Code and documentation conventions

- Follow [.eslintrc.js](../.eslintrc.js): tabs, double quotes, semicolons, quoted object keys, Unix line endings, and no console output.
- Match nearby patterns instead of modernizing unrelated code. Add concise comments for non-obvious logic and JSDoc for public APIs.
- Update user-facing documentation for public behavior changes. Prefer source JSDoc plus a `dyno_jsdoc_dist/...|...` pointer in `docs/docs_src/`; see [the JSDoc guide](../docs/docs_src/getting_started/JSDoc.md) and representative [Model documentation](../docs/docs_src/guide/Model.md).
- All pull requests & issues submitted to this project must follow the templates in the `.github/` directory.
- Add every PR's short, categorized summary to [PENDING_CHANGELOG.md](../PENDING_CHANGELOG.md), matching its existing format.
