
---
trigger: always_on
description: >
  Scaffold a new SOA service module (Entity, Repository, Service, index.js) following the
  project's established patterns. Use this skill whenever creating a new service, SOA module,
  or entity/repository/service layer for a domain concept. Also use when the user mentions
  "create a service for X", "new SOA module", "entity and repository for X", or similar.
---

# SOA Module Scaffolding

This skill creates a new SOA (Service Oriented Architecture) module following the project's
established patterns. Each module consists of four files that separate concerns cleanly:
Entity (data shape), Repository (data access), Service (business logic), and an index with
a factory function for dependency injection.

## Before You Start

1. **Follow the workflow.** Do not generate code until the Describe/Analyze/Plan/Discuss
   cycle is complete and the human has given explicit permission to implement.
2. **Determine the DB package name.** Check existing `require` statements or `package.json`
   in the current codebase. The package name varies by repo and branch — do not hardcode it.
   Look for `@vectopus.com/db` or `@vectoricons.net/db`.
3. **Identify the Objection.js model.** The entity is built from a model in the DB package
   using `createEntityFromModel`. Verify the model exists and check its `jsonSchema.properties`
   — only fields declared there will be mapped to the entity. If columns exist on the table
   but are missing from the schema (like generated/stored columns), they must be added to
   the model's jsonSchema first or they will be silently dropped.
4. **Decide on `allowedColumns`.** The entity should expose only the columns that consumers
   need. List them in camelCase.

## File Structure

All SOA modules live in `server/services/<module-name>/`:

```
server/services/<module-name>/
    <ModuleName>Entity.js
    <ModuleName>Repository.js
    <ModuleName>Service.js
    index.js
    __tests__/
        service.test.js
```

## 1. Entity

The entity defines the data shape. It extends a class created by `createEntityFromModel`,
which maps snake_case DB columns to camelCase properties and filters to only `allowedColumns`.

The entity is based on the **primary model** for the domain concept — the table that holds
the canonical data. If the service needs to merge data from other sources (views, joins),
that merge happens in the repository, not the entity.

```javascript
const { createEntityFromModel } = require('../../../refs/base/src/common/BaseEntity');
const DB = require('<db-package>');  // Determine from codebase

/**
 * <ModuleName>Entity
 *
 * Represents <description of what this entity models>.
 * Created from the <model_name> model.
 */
class <ModuleName>Entity extends createEntityFromModel(DB.<modelName>, {}, {
    allowedColumns: [
        // List camelCase column names the entity should expose.
        // Only columns in the model's jsonSchema.properties will be mapped.
        // Example:
        // 'id',
        // 'title',
        // 'createdAt',
    ],
}) {}

module.exports = <ModuleName>Entity;
```

**Key points:**
- `createEntityFromModel` reads `ModelClass.jsonSchema.properties` to determine which
  fields to keep. Fields not in the schema are silently dropped into a "relation candidates"
  bucket and discarded if no matching related entity exists.
- The `allowedColumns` array acts as a secondary filter on top of the schema.
- Entities are frozen by default (immutable). This is the desired behavior.

## 2. Repository

The repository handles all data access. It extends `BaseReadRepository` (for read-only
services) or `BaseRepository` (if writes are needed — check `refs/base/src/common/`).

The repository is where data from multiple sources gets assembled. If the entity needs
data merged from views, joins, or computed values, that logic belongs here.

```javascript
const BaseReadRepository = require('../../../refs/base/src/common/BaseReadRepository');
const <ModuleName>Entity = require('./<ModuleName>Entity');

/**
 * <ModuleName>Repository
 *
 * <Description of data access patterns.>
 */
class <ModuleName>Repository extends BaseReadRepository {
    /**
     * @param {Object} options
     * @param {Object} options.DB
     */
    constructor({ DB } = {}) {
        super({
            DB       : DB || require('<db-package>'),
            modelName: '<modelName>',  // Key in DB object (e.g., 'subscriptionPlans')
            entityClass: <ModuleName>Entity,
        });
    }

    // Add domain-specific query methods here.
    // Use this.model for the primary Objection model.
    // Use this.DB.<otherModel> for cross-model queries.
    // Use this.wrapEntity(record, <ModuleName>Entity) to create entities.
    // Use this.finalize(entity, null) to apply freezing before returning.
}

module.exports = <ModuleName>Repository;
```

**Key points:**
- `this.model` is the Objection.js model class (set by `super({ modelName })`)
- `this.DB` is the full DB package — use it to query other models/views
- `this.wrapEntity(record, EntityClass)` converts a DB row to an entity instance
- `this.finalize(entity, hookName)` applies hooks and freezing — always call before returning
- Pass `{ trx }` through to all queries for transaction support

## 3. Service

The service is the public API. It extends `BaseReadService` and delegates to the repository.
Business logic and orchestration live here. Keep it thin — heavy data access belongs in
the repository.

```javascript
const BaseReadService = require('../../../refs/base/src/common/BaseReadService');
const <ModuleName>Entity = require('./<ModuleName>Entity');
const <ModuleName>Repository = require('./<ModuleName>Repository');
const DB = require('<db-package>');

/**
 * <ModuleName>Service
 *
 * <Description of what this service provides and when to use it.>
 */
class <ModuleName>Service extends BaseReadService {
    constructor({
        repository  = new <ModuleName>Repository({ DB }),
        entityClass = <ModuleName>Entity,
    } = {}) {
        super({ repository, entityClass });
    }

    // Add domain-specific service methods here.
    // Delegate data access to this.repository.
    // Example:
    //
    // async getByUserId(userId, { trx } = {}) {
    //     return this.repository.findByUserId(userId, { trx });
    // }
}

module.exports = <ModuleName>Service;
```

## 4. Index (with factory function)

The index exports all classes and provides a factory function for dependency injection.
The factory is the primary way consumers instantiate the service.

```javascript
const <ModuleName>Entity      = require('./<ModuleName>Entity');
const <ModuleName>Repository  = require('./<ModuleName>Repository');
const <ModuleName>Service     = require('./<ModuleName>Service');

/**
 * Initializes the <ModuleName>Service with injected dependencies.
 * @returns {<ModuleName>Service}
 */
const init<ModuleName>Service = () => {
    return new <ModuleName>Service({
        repository  : new <ModuleName>Repository({ DB: require('<db-package>') }),
        entityClass : <ModuleName>Entity,
    });
};

module.exports = {
    <ModuleName>Entity,
    <ModuleName>Repository,
    <ModuleName>Service,
    init<ModuleName>Service,
};
```

## 5. Integration Tests

Tests use real DB rows, not mocks. Follow the testing guard rails from the testing rule.

```javascript
/* eslint-env jest */

const DB = require('<db-package>');
const { init<ModuleName>Service } = require('../index');
const <ModuleName>Entity = require('../<ModuleName>Entity');

describe('<ModuleName>Service - Integration Tests', () => {
    let service;

    // Use an existing user (e.g., user_id=1) rather than creating test users.
    const testUserId = 1;

    // Track inserted row IDs for cleanup
    // let testRowId;

    beforeAll(async () => {
        service = init<ModuleName>Service();

        // Seed test rows here.
        // Use DB.knex('<table>').insert({...}).returning('*') for raw inserts.
        // Use DB.<model>.query().insert({...}) for model inserts.
    });

    afterAll(async () => {
        // Clean up in reverse order of creation (FK constraints).
        // if (testRowId) {
        //     await DB.knex('<table>').where('id', testRowId).del();
        // }
    });

    // Group tests by method and scenario.
    // Every test must state its scenario in a comment.
    // Every test must fail if core logic is removed.

    describe('<methodName>', () => {
        test('<what it verifies>', async () => {
            // // Scenario: <describe the scenario>
            // const result = await service.<method>(...);
            // expect(result).not.toBeNull();
            // expect(result).toBeInstanceOf(<ModuleName>Entity);
        });
    });
});
```

**Test conventions:**
- Run with `--forceExit` flag (DB connections keep Jest alive)
- Use `user_id=1` instead of creating test users
- Seed realistic data in `beforeAll`, clean up in `afterAll`
- Freeze time for any date-dependent logic
- No mocks — real DB queries against the dev database
- Every test must have a scenario comment
- Every test must assert meaningful values, not just existence

## Checklist

Before considering the module complete:

- [ ] Entity `allowedColumns` matches what consumers need
- [ ] All columns in `allowedColumns` exist in the model's `jsonSchema.properties`
- [ ] Repository uses `this.wrapEntity()` and `this.finalize()` correctly
- [ ] All repository methods accept `{ trx }` for transaction support
- [ ] Service methods are thin wrappers delegating to repository
- [ ] Index exports all classes + factory function
- [ ] Integration tests seed real data and clean up after
- [ ] Tests cover happy path, edge cases, and error cases
- [ ] JSDoc on all public methods
- [ ] DB package name matches what the current codebase uses
