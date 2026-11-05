# Dynamoose Benchmarks

`benchmark.js` measures the CPU cost of dynamoose operations. It loads two builds in one process:

- **current**: this package's `dist` (run `npm run build` first)
- **baseline**: the published `dynamoose` release named in the `dynamoose-baseline` devDependency (an npm alias)

Both builds use a stub DynamoDB client with canned responses, so no request leaves the process and
the numbers contain no network time.

## Running

```bash
# In packages/dynamoose
npm run build
npm run benchmark                                  # full run (5 minutes or more)
npm run benchmark -- --quick                       # few short rounds, numbers are noisy
npm run benchmark -- --json results.json           # also write the results as JSON
npm run benchmark:smoke                            # jest: see below
npm run benchmark -- --profile update large        # CPU profile of one operation or stage
npm run benchmark -- --profile create large --build baseline --out create.cpuprofile
EXTRA_SCHEMA=path/to/module.js npm run benchmark  # also run one more schema, see below
BASELINE=../other/packages/dynamoose npm run benchmark  # compare against another build (needs its dist)
BASELINE=../base/packages/dynamoose npm run benchmark -- --gate   # the CI gate, see below
BASELINE=... npm run benchmark -- --gate --quick   # 2 rounds of 20 ms: checks the run, never significant
```

The script needs `node --expose-gc`; the npm script passes it.

`npm run benchmark:smoke` (jest, `smoke.test.js` and `gate.test.js`) checks that `--quick` reports
every operation and stage, that `--profile` writes a profile (update on large) and works with
`EXTRA_SCHEMA`, the gate's verdict rule, and that `--gate` passes on two quick rounds, refuses to run
without `BASELINE` or with an invalid `--rounds` or scale, and on a forced slowdown (`BENCHMARK_SCALE_CURRENT`, a test hook) re-runs, exits
with code 1 and writes the profiles and comparisons.

## Method

- Every operation warms up on both builds, then runs in rounds. A round measures each operation on
  both builds for a fixed time, with `gc()` before each measurement. The build that goes first
  alternates per round.
- The input of each call (a new Item, a key, an update object) is made outside the timed part.
- The table shows the median ops/s over the rounds per build, and the change of current against
  baseline. The JSON file also has the samples of every round.

## Operations

| operation        | call                                             | stub response                 |
| ---------------- | ------------------------------------------------ | ----------------------------- |
| `create`         | `new Model(data).save()`                         | `putItem`: `{}`               |
| `create-request` | `new Model(data).save({"return": "request"})`    | none                          |
| `get`            | `Model.get(key)`                                 | `getItem`: the stored item    |
| `update`         | `Model.update(key, {attribute: object})`         | `updateItem`: the stored item |
| `update-nested`  | `Model.update(key, {"$SET": {"a.b": value}})`    | `updateItem`: the stored item |

The stored item is the `putItem` request of the baseline build for one generated item.

## Stages (report only)

The run also measures internal stages of the operations above, on every schema, in a second table
(`stages` in the JSON file). The settings are the ones `save` and `get` pass.

| stage                         | call                                                                 |
| ----------------------------- | -------------------------------------------------------------------- |
| `getAttributeValue`           | `schema.getAttributeValue(attribute)` for every attribute (one op)   |
| `getAttributeTypeDetails`     | `schema.getAttributeTypeDetails(attribute)` for every attribute      |
| `attributes`                  | `schema.attributes()`                                                |
| `getTypePaths`                | `schema.getTypePaths(data, {"type": "toDynamo"})`                    |
| `objectFromSchema-toDynamo`   | `Item.objectFromSchema` with the `save` settings                     |
| `objectFromSchema-fromDynamo` | `Item.objectFromSchema` with the `get` settings, on the stored item  |
| `save-conform`                | `conformToSchema` on the stored item, the second pass of `save`      |

## Profile mode

`--profile <name> <schema>` runs one operation or stage on one build (`--build current|baseline`,
default `current`) under the V8 CPU profiler, 5 seconds (`--quick`: 0.3 seconds) after a warm-up. The
inputs are made before the profiler starts. It writes a `.cpuprofile` (`--out <file>`, default
`<build>-<schema>-<name>.cpuprofile`; open it in Chrome DevTools or speedscope) and prints:

- the top functions by self time and by total time, with file and line in `dist` (the line of the
  compiled JavaScript)
- the self time per file, dynamoose and its dependencies

Total time counts a function once per sample, also when it is on the stack more than once.

## CI gate

The `benchmark-gate` job of `.github/workflows/ci.yml` runs when a pull request is opened or gets new
commits, on the current Node.js LTS. It checks out the pull request and its base branch, installs and builds
both, runs `npm run benchmark:smoke`, then `npm run benchmark -- --gate` with `BASELINE` set to the
base checkout. `--gate` refuses to run without `BASELINE`, so that it cannot compare with the published
release by mistake.

`--gate` runs the operations and stages of the large and order schemas, 20 interleaved rounds of
150 ms. Only `create`, `get` and `update` on these two schemas can fail the job. All other rows are report
only. A gated operation fails when both are true:

- its median ops/s is more than 15% below the base
- a one-sided Mann-Whitney U test over the round samples gives p < 0.01

A failed operation runs again (20 new rounds; `--rounds <n>` changes the count). Only a failure in both
runs fails the job. Then the gate
profiles the operation on both builds and writes to `--artifacts <directory>` (default `benchmark-gate`):
the `.cpuprofile` and the summary (`.txt`) per build, and `<schema>-<operation>-comparison.txt`, the
functions whose self time per call grew most. The job uploads that directory as the `benchmark-gate`
artifact, and the log prints the comparison.

Limits: the gate compares each pull request with its base only, so slowdowns under 15% can add up over
several pull requests, and it covers only the gated rows. Compare with the published release
(`npm run benchmark` without `BASELINE`) before a release to see the total change.

## Results: schema lookup cache

Measured on 2026-10-15 with Node 24.22, plain `node --expose-gc`, full runs (10 rounds of 200 ms), median
ops/s, on a 12-core machine that also ran other work (load average 30 to 150). Absolute ops/s depend on
the load, so compare only the change within one run.

- Run A: `BASELINE` set to a build of the base branch without the cache, so only the cache differs.
- Run B: against the published 4.2.0 (`dynamoose-baseline`), which also lacks the other unreleased changes.

| schema      | operation | run A baseline | run A current | run A change | run B change |
| ----------- | --------- | -------------: | ------------: | -----------: | -----------: |
| large       | create    |          175.4 |         304.8 |       +73.8% |      +103.5% |
| large       | get       |          173.2 |         486.3 |      +180.8% |      +139.9% |
| large       | update    |          104.7 |         262.4 |      +150.7% |       +98.1% |
| extra-large | create    |          101.6 |         200.1 |       +96.9% |       +98.8% |
| extra-large | get       |          118.0 |         269.0 |      +128.0% |      +123.0% |
| extra-large | update    |           60.6 |         153.0 |      +152.7% |      +141.2% |
| order       | create    |          230.6 |         336.0 |       +45.7% |       +57.7% |
| order       | get       |          242.8 |         370.7 |       +52.7% |       +81.8% |
| order       | update    |           81.9 |         196.0 |      +139.3% |       +88.1% |

Every operation on every schema was faster in both runs. The `getAttributeTypeDetails` stage (the
public method, which still builds a new result per call) is between -5% and +69%, and the order
`getTypePaths` stage, which the cache does not cover, is unchanged within the noise; every other stage
is faster. Use plain `node` for numbers: under `node --import tsx` the gains look smaller, because tsx
hooks every `require` and `Item` calls `require` inline per value.

## Schemas

`schemas.js` holds the schemas, their test data and the configs that `benchmark.js` and the equivalence
corpus use. Each factory takes the dynamoose build, so each build gets its own Schema instance.

- **small**: flat, five attributes. No nested attribute, so no `update-nested`.
- **medium**: nested objects, an array, `validate`, `enum`, `default`.
- **large**: hash and range key, deep nesting, arrays of objects, many `validate`, `enum`,
  `required` and `default` settings.
- **extra-large**: large plus sets, `Buffer`, a multi-type attribute, `NULL` and a Date `storage`
  setting.
- **order**: `fixtures/order-schema.js`, a wide e-commerce order schema: about 60 top-level attributes,
  two nested objects of about 30 attributes with `validate` functions, an array of objects with
  multi-type attributes, an object with its own `validate` and `set`, schemaless objects kept through
  `saveUnknown`, a Set, `enum`, `required`, global indexes and ISO-string timestamps. The data is a paid
  web order with invented values.

## Your own schema (EXTRA_SCHEMA)

To measure a schema of your application, set `EXTRA_SCHEMA` to a module that exports one schema in the
shape of `fixtures/order-schema.js`: `name`, `create (dynamoose)`, `data ()`, `key (data)`, `update ()` and
an optional `nestedUpdate ()`. `name` must differ from the built-in schemas. `create` gets the dynamoose
build to measure, so the module must build the schema with that build's `Schema` and `type` (for
example `dynamoose.type.THIS`), not with a dynamoose it imports itself.

```bash
EXTRA_SCHEMA=path/to/my-schema.js npm run benchmark
npm run benchmark -- --profile update my-schema   # with EXTRA_SCHEMA set, "my-schema" being its name
```

A module written in TypeScript can run through a loader, for example
`EXTRA_SCHEMA=my-schema.ts node --expose-gc --import tsx benchmarks/benchmark.js`. Use plain `node` for
the numbers: `tsx` hooks every `require`, which dynamoose calls inline in some hot paths, so the gains
look smaller under it.
