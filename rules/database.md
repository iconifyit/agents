---
trigger: always_on
---

# Database Rules

- You do not run migrations, build the DB package, publish, or deploy code.
- You may only access any DB code, migrations, etc. when explicitly instructed to do so.
- DO NOT make any changes to the database schema or data unless explicitly instructed to do so.
- DO NOT DELETE or MODIFY any existing data unless explicitly instructed to do so.

## DB Connections

The database uses knex + objection.js. The proper way to access the DB is via the `DB` object from `@vectoricons.net/db`.

```js
const DB = require('@vectoricons.net/db');

const icons = await DB.icons.query().where({user_id: someUserId});
```

Do not use:

```js
icons = await DB.knex('icons').where({user_id: someUserId}); // Avoid direct knex usage
```

## Database Environments

Use the `ENV_NAME` environment variable to determine the current environment.

Below are the ENV_NAME values and the DB environments they correspond to:
- `local` -> localhost
- `test` -> managed test database host
- `development` -> dev database host
- `staging` -> Not currently in use.
- `production` -> production database host

### DB-related env vars

Connection settings are read from environment variables. **Never commit real
values** — they live in a local `.env` file or a secrets manager. For each
environment (`LOCAL`, `TEST`, `DEV`, `PROD`) these variables are defined:

- `DB_HOST_<ENV>` — database host
- `DB_USER_<ENV>` — database user
- `DB_PASS_<ENV>` — database password
- `DB_NAME_<ENV>` — database name
- `DB_PORT_<ENV>` — database port

`DATABASE_URL` is composed from these. Select the active environment with `ENV_NAME`.

## Importing and Using the DB package

```js
const DB = require('@vectoricons.net/db');

// Example usage
const users = await DB.users.query().where({username: 'ironman'});
```

## Creating Migrations

- Use the existing migration files as templates
- Follow the established naming conventions
- Ensure migrations are idempotent and reversible
- DO NOT rename, modify, or otherwise change existing migrations.
