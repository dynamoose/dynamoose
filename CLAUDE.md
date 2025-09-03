# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a TypeScript/JavaScript monorepo for Dynamoose, a DynamoDB modeling tool for Node.js inspired by Mongoose. The repository uses Lerna for monorepo management with three main packages:

- `packages/dynamoose`: Core Dynamoose functionality
- `packages/dynamoose-logger`: Optional logging functionality  
- `packages/dynamoose-utils`: Shared utilities used by other packages

## Common Commands

**Build the project:**
```bash
npm run build                    # Build all packages
npm run build:clean             # Clean build artifacts
npm run build:watch             # Build in watch mode
npm run build:sourcemap         # Build with source maps
npm run build:sourcemap:watch   # Build with source maps in watch mode
```

**Testing:**
```bash
npm test                        # Run tests with coverage
npm run test:types              # Run TypeScript type tests

# In packages/dynamoose:
npm run test:nocoverage         # Run tests without coverage (faster)
npm test -- --testNamePattern="pattern"  # Run specific tests
```

**Benchmarking (in packages/dynamoose):**
```bash
npm run benchmark               # Run all benchmarks
npm run benchmark:conversions   # Schema conversions benchmark
npm run benchmark:models        # Model operations benchmark
```

**Linting:**
```bash
npm run lint                    # Check code style
npm run lint:fix               # Fix code style issues automatically
```

**Documentation site:**
```bash
npm run site:install           # Install docs dependencies
npm run site:start             # Start development server
npm run site:build             # Build documentation site
npm run site:crowdin:sync      # Sync translations
```

**Package-specific commands:**
Run the same commands within individual package directories (e.g., `packages/dynamoose/`) to target specific packages.

## Architecture

### Core Components

**Model System:**
- `Model` (`lib/Model/index.ts`): Core model class handling CRUD operations, queries, scans, transactions
- `ModelStore` (`lib/ModelStore.ts`): Registry for managing model instances
- `Schema` (`lib/Schema.ts`): Defines data structure, validation rules, and DynamoDB type mappings
- `Item` (`lib/Item.ts`): Represents individual database records with change tracking and validation

**Data Layer:**
- `aws/ddb/` (`lib/aws/ddb/`): DynamoDB client abstraction and internal operations
- `aws/converter.ts` (`lib/aws/converter.ts`): Converts between JavaScript objects and DynamoDB AttributeValues
- `Serializer` (`lib/Serializer.ts`): Handles object serialization/deserialization

**Query/Scan Operations:**
- `ItemRetriever` (`lib/ItemRetriever.ts`): Base class for Query and Scan operations
- `Condition` (`lib/Condition.ts`): Builds DynamoDB condition expressions
- `Transaction` (`lib/Transaction.ts`): Handles DynamoDB transactions

**Table Management:**
- `Table/` (`lib/Table/`): Table creation, updates, and configuration management
- `Instance` (`lib/Instance.ts`): Global configuration and AWS settings

### Type System

The Schema system supports:
- Native JavaScript types (String, Number, Boolean, Date, Buffer, Object, Array)
- DynamoDB-specific types (sets, maps)
- Custom validation and transformation functions
- Nested schemas and dynamic typing
- Single table design with multiple schema variants

### Key Relationships

**Model-Schema-Item Pattern:**
- Each `Model` has exactly one `Schema` that defines its structure
- `Item` instances are created from Models and tracked for changes
- Items use the parent Model's Schema for validation and serialization

**AWS SDK Integration:**
- Uses AWS SDK v3 (`@aws-sdk/client-dynamodb` and `@aws-sdk/util-dynamodb`)
- Internal methods follow pattern: `internal.name()` for DynamoDB operations
- Converter handles marshalling/unmarshalling between JS and DynamoDB types

### Package Structure

**dynamoose package:**
- `lib/index.ts`: Main entry point exporting public API
- `lib/utils/`: Utility functions for internal operations
- `test/`: Comprehensive test suite using Jest
- `dist/`: Compiled JavaScript output

**dynamoose-logger package:**
- Pluggable logging system with configurable providers
- Console provider included by default
- Event-based logging architecture

**dynamoose-utils package:**
- Shared error handling utilities
- Common validation functions
- Type checking utilities

## Development Notes

**Testing Requirements:**
- Write comprehensive tests covering all code paths and edge cases
- Use Jest configuration in `jest.config.js` 
- Type tests are located in `test/types/` and use separate TypeScript configuration
- Run `npm run test:types` to validate TypeScript definitions

**Code Style:**
- Project uses ESLint with TypeScript support
- Maximum 0 warnings allowed (`--max-warnings 0`)
- Automatically fixable issues can be resolved with `npm run lint:fix`

**Documentation:**
- JSDoc comments in code generate API documentation
- Main documentation lives in `docs/docs_src/`
- Update `PENDING_CHANGELOG.md` when making changes
- Some docs use replaceable JSDoc patterns like `dyno_jsdoc_dist/Model/index.js|model.table`

**Monorepo Management:**
- Lerna handles package dependencies and publishing
- Run `npm run prepare` to bootstrap and build all packages
- Individual packages can be built independently
- Package versions are managed centrally via `lerna.json`

**Pull Request Requirements:**
- Add a summary to `PENDING_CHANGELOG.md` when making changes
- Use `CHANGELOG.md` as a template for formatting
- Ensure all tests pass and coverage is maintained
- Run linter before submitting (`npm run lint`)