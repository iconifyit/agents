
---
trigger: always_on
description: >
  Scaffold a new filesystem-backed SOA module (Entity, Reader, Writer, Service, index.js)
  following established SOA module conventions. Use whenever creating a new
  module for a filesystem-backed domain concept in `src/modules/`, or extending an existing
  one. Trigger on phrases like "create a module for X", "new SOA module for filesystem data",
  "entity + reader + service for X", or whenever the work involves loading, persisting,
  or transforming data that lives on disk, over HTTP, or in cloud storage.
---

# Filesystem SOA Module Scaffolding

This skill creates filesystem-backed SOA modules following the project's SOA module
conventions. Modules live in `src/modules/`. Each module is self-contained and composes capabilities
from `src/common/`.

The companion skill [`soa-module`](../soa-module/SKILL.md) covers the DB-backed pattern (Objection.js + Postgres).
This skill covers the **filesystem pattern** — no DB, in-memory entities, file / HTTP /
cloud-storage I/O via mixins.

## When to Use Which Skill

| Concern lives in...        | Use                       |
|----------------------------|---------------------------|
| Postgres / Objection.js    | [soa-module](../soa-module/SKILL.md) |
| Filesystem, HTTP, S3, etc. | This skill                |
| Pure in-memory (no I/O)    | This skill (Entity + Service only) |

## Before You Start

1. **Follow the workflow.** Do not generate code until the Describe / Analyze / Plan /
   Discuss cycle is complete and the human has given explicit permission to implement.
2. **Verify `src/common/` is in place.** Base classes (`BaseEntity`, `BaseReader`,
   `BaseWriter`, `BaseService`), the file-I/O base classes (`FileReader`, `FileWriter`),
   and the mixins must exist before module code lands. If they don't, scaffold them first
   as part of the foundation phase.
3. **Decide which files the module needs.** Not every module needs all four.
   - Read-only data source: Entity + Reader + Service.
   - Bidirectional cache: Entity + Reader + Writer + Service.
   - Pure service (no persisted state, just orchestration): Service only.
   - Group of related sub-modules (e.g., AI generation steps): one folder per concern,
     each its own module.
4. **Pick the data source for the Reader.** Filesystem, HTTP, cloud storage, or a
   combination. File-backed readers extend `FileReader`; HTTP/cloud capability layers on
   via `withHttpSource` / `withCloudStorageSource`. Don't write custom I/O code in the
   Reader — use the `FileReader` methods (`readFile` / `listFiles`) and mixin helpers.
5. **Decide allowed fields.** The Entity should expose only the fields its consumers need.
   List them in camelCase. Validate required fields in the constructor.

## File Structure

Each module lives at `src/modules/<module-name>/`:

```
src/modules/<module-name>/
    <ModuleName>Entity.js     # in-memory data shape (optional for service-only modules)
    <ModuleName>Reader.js     # I/O in
    <ModuleName>Writer.js     # I/O out (optional)
    <ModuleName>Service.js    # business logic, the public API for the module
    index.js                  # exports + init<ModuleName>Service factory
```

Tests mirror the module structure:

```
test/modules/<module-name>/
    Entity.test.js
    Reader.test.js
    Writer.test.js            # if present
    Service.test.js
    __fixtures__/             # real fixture files used by tests
```

## Common Base Classes (`src/common/`)

```javascript
// src/common/BaseEntity.js
/**
 * Base for in-memory entities. Plain class — capabilities are added via mixins.
 */
export class BaseEntity {
    constructor() {
        // Subclasses + mixins add fields and capabilities.
    }
}

// src/common/BaseReader.js
/**
 * Pure interface for entity readers. Subclasses MUST implement load().
 * File-backed readers extend FileReader (which owns filesystem I/O). Non-file
 * source capability (HTTP, cloud storage) is composed in via mixins
 * (withHttpSource, withCloudStorageSource).
 */
export class BaseReader {
    /**
     * Load data from the configured source and produce normalized entities.
     * @param {Object} options - Reader-specific options
     * @returns {Promise<*>}
     */
    async load(options) {
        throw new Error(`${this.constructor.name}.load() must be implemented`);
    }
}

// src/common/BaseWriter.js
/**
 * Pure interface for entity writers. Subclasses MUST implement write().
 * File-backed writers extend FileWriter (which owns filesystem I/O).
 */
export class BaseWriter {
    /**
     * Persist an entity to the configured destination.
     * @param {Object} entity - The entity to persist
     * @param {Object} [options]
     * @returns {Promise<void>}
     */
    async write(entity, options) {
        throw new Error(`${this.constructor.name}.write() must be implemented`);
    }
}

// src/common/BaseService.js
/**
 * Base for services. Composes Reader + optional Writer + entityClass.
 */
export class BaseService {
    /**
     * @param {Object} dependencies
     * @param {BaseReader} dependencies.reader
     * @param {BaseWriter} [dependencies.writer]
     * @param {Function} [dependencies.entityClass]
     */
    constructor({ reader, writer = null, entityClass = null } = {}) {
        this.reader      = reader;
        this.writer      = writer;
        this.entityClass = entityClass;
    }
}

// src/common/FileReader.js
import { BaseReader } from './BaseReader.js';
/**
 * Concrete file-I/O base class. File-backed readers extend this instead of
 * BaseReader directly. Owns filesystem reads with format detection.
 * Compose additional source capability (cloud) on top via a mixin, e.g.
 * `withCloudStorageSource(FileReader)`.
 */
export class FileReader extends BaseReader {
    /**
     * Read a file and return its text content. Detects PDF / DOCX / MD / TXT
     * by extension and extracts text accordingly (pdf-parse, mammoth, utf8).
     * @param {string} filePath
     * @param {Object} [opts]
     * @returns {Promise<string>}
     */
    async readFile(filePath, opts = {}) { /* fs.promises + format-specific extraction */ }

    /**
     * List files in a directory, optionally filtered by extension.
     * @param {string} dirPath
     * @param {Object} [opts] - { ext: string[] }
     * @returns {Promise<string[]>}
     */
    async listFiles(dirPath, opts = {}) { /* fs.promises.readdir + filter */ }
}

// src/common/FileWriter.js
import { BaseWriter } from './BaseWriter.js';
/**
 * Concrete file-I/O base class. File-backed writers extend this instead of
 * BaseWriter directly. Owns filesystem writes: ensures the destination
 * directory exists and honors the IS_TEST_MODE write guard.
 */
export class FileWriter extends BaseWriter {
    /**
     * Write content to a path, creating parent directories as needed.
     * Respects IS_TEST_MODE (refuses writes to production data paths in tests).
     * @param {string} filePath
     * @param {string|Buffer} content
     * @param {Object} [opts]
     * @returns {Promise<void>}
     */
    async writeFile(filePath, content, opts = {}) { /* mkdir -p + fs.promises.writeFile */ }
}
```

## Mixins (`src/common/mixins/`)

Mixins are **subclass-factory functions** that take a base class and return an extended
class. They compose capabilities without deep inheritance.

### Entity capability mixins

```javascript
// src/common/mixins/withFreezable.js
/**
 * Adds freeze() / isFrozen() lifecycle to an entity.
 * Mutation methods on consuming classes should check this._frozen before writing.
 */
export const withFreezable = (Base) => class extends Base {
    constructor(...args) {
        super(...args);
        Object.defineProperty(this, '_frozen', {
            value: false, writable: true, enumerable: false,
        });
    }
    freeze()   { this._frozen = true; return this; }
    isFrozen() { return this._frozen; }
};

// src/common/mixins/withCloneable.js
/**
 * Adds clone() that returns a new mutable copy of the entity.
 */
export const withCloneable = (Base) => class extends Base {
    clone() {
        const raw = typeof this.toJSON === 'function' ? this.toJSON() : { ...this };
        const Constructor = this.constructor;
        return new Constructor(raw);
    }
};

// src/common/mixins/withSerializable.js
/**
 * Adds toJSON() / toString().
 * Subclasses can override toJSON() to control the wire shape.
 */
export const withSerializable = (Base) => class extends Base {
    toJSON()   { return { ...this }; }
    toString() { return `[${this.constructor.name}]`; }
};

// src/common/mixins/withFieldStorage.js
/**
 * Adds a custom-field Map plus get/set/getField/getFields accessors.
 * set() throws if the entity is frozen (composes with withFreezable).
 */
export const withFieldStorage = (Base) => class extends Base {
    constructor(...args) {
        super(...args);
        Object.defineProperty(this, '_fields', {
            value: new Map(), writable: true, enumerable: false,
        });
    }
    set(name, value) {
        if (this._frozen) {
            throw new Error(`${this.constructor.name}: cannot set "${name}" on a frozen entity`);
        }
        this._fields.set(name, value);
        return this;
    }
    getField(name, fallback = null) {
        return this._fields.has(name) ? this._fields.get(name) : fallback;
    }
    getFields() {
        return Object.fromEntries(this._fields);
    }
};
```

### Reader source-capability mixins

Filesystem I/O is **not** a mixin — it lives in the `FileReader` / `FileWriter`
base classes above. Mixins cover the *additional*, non-file source capabilities
(HTTP, cloud storage) that layer on top of either base class.

```javascript
// src/common/mixins/withHttpSource.js
/**
 * Adds fetch() with timeout, retry, and JSON-or-text auto-detection.
 */
export const withHttpSource = (Base) => class extends Base {
    async fetch(url, opts = {}) {
        // fetch with timeout, retries, content-type-aware parsing
    }
};

// src/common/mixins/withCloudStorageSource.js
/**
 * Adds readFromCloud() that handles s3:// (and future cloud URI schemes).
 * Delegates to src/core/services/StorageService.
 */
export const withCloudStorageSource = (Base) => class extends Base {
    async readFromCloud(uri, opts = {}) {
        // Parse s3://bucket/key, delegate to StorageService
    }
};
```

### Composing capabilities

Capabilities stack from the inside out. The innermost mixin wraps the base class first;
each subsequent mixin extends the class returned by the previous one.

```javascript
// Entity composition (full JobListingEntity-style capability set)
class ResumeEntity extends withFreezable(
    withCloneable(
        withSerializable(
            withFieldStorage(BaseEntity)
        )
    )
) {
    constructor({ path, role, content, format, tags = [] }) {
        super();
        // role: 'base' | 'reference'
        this.set('path', path);
        this.set('role', role);
        this.set('content', content);
        this.set('format', format);
        this.set('tags', tags);
    }
}

// Reader composition — UrlReader uses HTTP only, no file I/O
class UrlReader extends withHttpSource(BaseReader) {
    async load({ urls, evalCache }) {
        // Check evalCache, fall back to this.fetch()
    }
}

// Reader composition — CsvReader is file-backed, extends FileReader
class CsvReader extends FileReader { /* uses this.readFile() / this.listFiles() */ }

// Reader composition — ReportReader is file-backed + cloud-capable (local path OR s3://)
class ReportReader extends withCloudStorageSource(FileReader) {
    async load({ path }) {
        if (path.startsWith('s3://')) {
            return this.readFromCloud(path);
        }
        return this.readFile(path);   // from FileReader base class
    }
}
```

## 1. Entity

The entity defines the data shape — a frozen-by-default in-memory representation.
Validate required fields in the constructor. Use `this.set()` (from `withFieldStorage`)
to record tracked fields. Freeze before returning if mutation isn't desired.

```javascript
import { BaseEntity }       from '../../common/BaseEntity.js';
import { withFreezable }    from '../../common/mixins/withFreezable.js';
import { withCloneable }    from '../../common/mixins/withCloneable.js';
import { withSerializable } from '../../common/mixins/withSerializable.js';
import { withFieldStorage } from '../../common/mixins/withFieldStorage.js';

/**
 * <ModuleName>Entity
 *
 * Represents <description of what this entity models>.
 *
 * @example
 * const entity = new <ModuleName>Entity({ path: '...', content: '...' });
 * entity.freeze();
 */
export class <ModuleName>Entity extends withFreezable(
    withCloneable(
        withSerializable(
            withFieldStorage(BaseEntity)
        )
    )
) {
    /**
     * @param {Object} init - Constructor data
     * @throws {Error} If a required field is missing
     */
    constructor({ /* required + optional fields */ } = {}) {
        super();
        // Validate required fields.
        // Use this.set(name, value) for tracked fields.
    }
}
```

## 2. Reader

The Reader loads data from an external source and produces entities (or normalized data
that the Service wraps into entities). Pick the source mixin matching where the data
lives.

```javascript
import { FileReader }         from '../../common/FileReader.js';
import { <ModuleName>Entity } from './<ModuleName>Entity.js';

/**
 * <ModuleName>Reader
 *
 * <Description of what this reader loads and from where.>
 * Extends FileReader for filesystem I/O. For HTTP- or cloud-sourced data,
 * extend `withHttpSource(BaseReader)` or `withCloudStorageSource(FileReader)`
 * instead.
 */
export class <ModuleName>Reader extends FileReader {
    /**
     * @param {Object} options
     * @param {string} options.path - Path or directory to read from
     * @returns {Promise<<ModuleName>Entity[]>}
     */
    async load({ path }) {
        const files = await this.listFiles(path);
        const entities = [];
        for (const file of files) {
            const content = await this.readFile(file);
            entities.push(new <ModuleName>Entity({ path: file, content }).freeze());
        }
        return entities;
    }
}
```

**Reader guidelines:**

- Return entities (not raw objects) wherever possible — keeps the Service input typed.
- Don't put business logic in the Reader. Filtering by tag, similarity ranking, etc.
  belong in the Service.
- For composite I/O (e.g., local-OR-s3://), compose multiple source mixins.

## 3. Writer (when needed)

If the module persists data, add a Writer. Writers should be idempotent where possible
(write the same data twice = same end state).

```javascript
import { FileWriter } from '../../common/FileWriter.js';

/**
 * <ModuleName>Writer
 *
 * Persists <ModuleName>Entity instances to <destination>.
 * Extends FileWriter, which provides this.writeFile() (ensure-dir + test guard).
 */
export class <ModuleName>Writer extends FileWriter {
    /**
     * @param {Object} options
     * @param {string} options.destination - File path or directory
     */
    constructor({ destination } = {}) {
        super();
        this.destination = destination;
    }

    /**
     * @param {<ModuleName>Entity} entity
     * @param {Object} [opts]
     * @returns {Promise<void>}
     */
    async write(entity, opts = {}) {
        // Serialize entity → this.writeFile(this.destination, serialized)
    }
}
```

## 4. Service

The Service is the public API for the module. It composes the Reader and Writer (when
present) and adds business logic. Keep it thin — heavy I/O belongs in the Reader/Writer.

```javascript
import { BaseService }          from '../../common/BaseService.js';
import { <ModuleName>Entity }   from './<ModuleName>Entity.js';
import { <ModuleName>Reader }   from './<ModuleName>Reader.js';

/**
 * <ModuleName>Service
 *
 * <Description of what this service provides and when to use it.>
 */
export class <ModuleName>Service extends BaseService {
    constructor({
        reader      = new <ModuleName>Reader(),
        writer      = null,
        entityClass = <ModuleName>Entity,
    } = {}) {
        super({ reader, writer, entityClass });
    }

    // Domain methods go here. Delegate I/O to this.reader / this.writer.
    //
    // Example:
    // async getRelevant(jobListing, { limit = 3 } = {}) {
    //     const all = await this.reader.load({ path: this.corpusPath });
    //     return rankBySimilarity(all, jobListing).slice(0, limit);
    // }
}
```

## 5. Index (factory function)

```javascript
import { <ModuleName>Entity }   from './<ModuleName>Entity.js';
import { <ModuleName>Reader }   from './<ModuleName>Reader.js';
import { <ModuleName>Service }  from './<ModuleName>Service.js';

/**
 * Initialize <ModuleName>Service with default dependencies.
 *
 * @param {Object} [overrides] - For dependency injection in tests
 * @param {<ModuleName>Reader} [overrides.reader]
 * @param {Function} [overrides.entityClass]
 * @returns {<ModuleName>Service}
 */
export const init<ModuleName>Service = (overrides = {}) => {
    return new <ModuleName>Service({
        reader      : overrides.reader      || new <ModuleName>Reader(),
        entityClass : overrides.entityClass || <ModuleName>Entity,
    });
};

export {
    <ModuleName>Entity,
    <ModuleName>Reader,
    <ModuleName>Service,
};
```

## 6. Tests

Tests live at `test/modules/<module-name>/`. Use **real fixture files** in
`test/modules/<module-name>/__fixtures__/` rather than mocks. Follow the testing guard
rails from the project's CLAUDE.md.

```javascript
import { jest } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import { init<ModuleName>Service } from '../../../src/modules/<module-name>/index.js';
import { <ModuleName>Entity }       from '../../../src/modules/<module-name>/<ModuleName>Entity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, '__fixtures__');

describe('<ModuleName>Service - Integration Tests', () => {
    let service;

    beforeAll(() => {
        service = init<ModuleName>Service();
    });

    describe('<methodName>', () => {
        test('<scenario being verified>', async () => {
            // Scenario: <describe in plain language>
            //
            // const entity = await service.<method>({
            //     path: path.join(FIXTURE_DIR, 'sample.md'),
            // });
            // expect(entity).toBeInstanceOf(<ModuleName>Entity);
            // expect(entity.getField('content')).toContain('expected substring');
        });
    });
});
```

**Test conventions** (from CLAUDE.md testing guard rails):

- Real fixture files in `__fixtures__/`, not mocks.
- Every test must state its scenario in a comment.
- Every test must fail if core logic is removed.
- Freeze time for date-dependent logic.
- No symbolic / meaningless data — use realistic domain values.

## Checklist

Before considering the module complete:

- [ ] Module placed at `src/modules/<module-name>/`.
- [ ] Entity (when needed) composes the right capability mixins.
- [ ] Entity's constructor validates required fields and uses `this.set()` for tracked fields.
- [ ] File-backed Reader extends `FileReader`; HTTP/cloud Reader composes the matching mixin(s) onto `BaseReader` / `FileReader`.
- [ ] Reader returns entities, not raw objects (where applicable).
- [ ] File-backed Writer (when needed) extends `FileWriter`; `write()` is idempotent where possible.
- [ ] Service extends `BaseService` and delegates I/O to Reader/Writer.
- [ ] `index.js` exports all classes + a factory function (`init<ModuleName>Service`).
- [ ] JSDoc on all public methods.
- [ ] Tests cover happy path, edge cases, and error cases with real fixtures.
- [ ] Module doesn't import from another module's internal files — only from its `index.js`.
- [ ] Module doesn't import from `src/core/pipeline/` or `src/core/sources/` (pipeline-only surfaces).

## Reference

- Existing entity following a similar pattern (pre-mixin, retained as-is for now):
  `src/entities/JobListingEntity.js`
- Companion skill for DB-backed modules: [soa-module](../soa-module/SKILL.md)
