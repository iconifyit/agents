---
trigger: always_on
---

# db-migration

## Description

This skill provides best practices and guidelines for performing database migrations safely and efficiently. It covers topics such as planning, testing, and executing migrations while minimizing downtime and ensuring data integrity.

## Usage

Use this skill when you need to perform a database migration, whether it's adding new tables, modifying existing ones, or changing data types. It can help you plan the migration process, identify potential risks, and implement strategies to mitigate them.

## Rules
- DO NOT create migration files manually. ALWAYS use the npm script `migrate:make` to create new migration files. This ensures that the migration files are created with the correct naming convention and structure, reducing the risk of errors and maintaining consistency across all migration scripts. For example, you can run `npm run migrate:make add-users-table` to create a new migration file for adding a users table.
- DO NOT publish NPM packages.
- DO NOT merge or push code.
- DO NOT execute migration scripts in production.
- If you make a mistake - STOP! Do not attempt to fix it yourself. Instead, report the issue to a human immediately so that they can assess the situation and determine the best course of action. Panicking and trying to make a fix on-the-fly, without proper planning, often leads to even worse mistakes.
- DO NOT MAKE UNFOUNDED ASSUMPTIONS! The code is the source of truth. Read the code.
- Before asking the human about details of the codebase, check if the information is available in the code itself, docs, and/or docs/ADRS/*.

## Steps
1. **Planning**: Assess the scope of the migration, identify the changes needed, and create a detailed plan that includes timelines, resources, and rollback strategies. Our database uses Knex.js for migrations and Objection.js for the ORM, so ensure that your migration scripts are compatible with these tools. All migrations that create or modify tables or views must include the required Objection.js model definitions to ensure consistency and maintainability. This will help prevent issues with data integrity and make it easier for other developers to understand the changes being made. Additionally, consider the impact of the migration on existing data and how it may affect application performance during the migration process.
2. **Testing**: All migrations and models must be tested in a staging environment that closely mirrors production. This includes running the migration scripts against a copy of the production database to identify any potential issues or conflicts. Testing should also include verifying that the application functions correctly with the new database schema and that there are no performance regressions.  
3. **Version Increment**: After successfully testing the migration, increment the version number of the NPM package in package.json to reflect the changes made to the database schema. This helps maintain a clear version history and allows other developers to track changes effectively. The DB package is published to a private NPM registry, so ensure that you have the necessary permissions and access to publish the updated package.
4. **Publishing**: Agents are not allowed to publish the updated DB package to the private NPM registry. Instead, they must create a pull request with the updated package.json file and migration scripts for a human to review and merge. This ensures that all changes are properly reviewed and approved before being deployed to production, maintaining the integrity of the database and minimizing the risk of errors or issues arising from unreviewed changes. 
5. **Execution**: Agents are not allowed to execute the migration scripts in production. Instead, they must create a pull request with the migration scripts for a human to review and merge. Once the pull request is merged, a human will be responsible for executing the migration scripts in production, ensuring that all necessary precautions are taken to minimize downtime and maintain data integrity during the migration process.

## Resources
- Enum field options are defined in the `enums.js` file in `helpers/enums.js`. When adding a new enum field, ensure that you update this file with the appropriate options and values. The values are maintained in a JS file so there is a single source of truth in the database and application code. You need to also add the values to `vectopus-code/server-v1/src/helpers/enums.js` to ensure that the application can access the enum values correctly. This helps maintain consistency and prevents issues with data integrity when working with enum fields in the database.
- All migration scripts should be placed in the `migrations` directory of the project, following the naming convention `YYYYMMDDHHMMSS_migration-name.js` to ensure proper ordering and organization of migration files. This helps maintain a clear history of changes made to the database schema and allows for easy tracking and management of migrations over time.


## Examples

```
npm run migrate:make add-users-table
npm run migrate
npm run migrate:rollback
npm run migrate
```

## Notes

TBD
