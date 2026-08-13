# AGENTS.md

# Application Overview

This project is the backend for a mobile vehicle-service booking application.

The application allows users to discover vehicle-related services, select a service for their vehicle, customize the service with optional add-ons, choose between one-time and recurring plans, calculate the final price, select an available time slot, make a payment, and manage or track their bookings.

The application currently focuses on car and bike washing services, but it is designed to expand into a broader vehicle-service platform.

Examples of services that may be supported include:

- Basic car wash
- Pressure car wash
- Basic bike wash
- Pressure bike wash
- Interior cleaning
- Ceramic coating
- AC service
- Vehicle servicing
- Bumper painting
- Door painting
- Dicky painting
- Detailing
- Other vehicle maintenance and cleaning services

## What We Are Building

We are building a scalable backend that provides the APIs and business logic required by the mobile application.

The backend is responsible for:

- User authentication and authorization
- User and vehicle management
- Address management
- Service catalog management
- Service and add-on configuration
- Pricing and discounts
- One-time bookings
- Recurring/monthly plans
- Appointment and slot management
- Payment processing
- Booking status and tracking
- Future service expansion

The mobile application is only a client. The backend is the source of truth for business rules, pricing, availability, permissions, booking state, and payment state.

## Current Booking Flow

The main user journey is:

````text
User
 ↓
Select Vehicle
 ↓
Select Service
 ↓
Select Optional Services / Add-ons
 ↓
Choose Purchase Type
 ├── One-time
 └── Recurring / Monthly
        ↓
   Select Frequency
 ↓
Calculate Price
 ↓
Review Details
 ↓
Select Available Slot
 ↓
Payment
 ↓
Booking / Subscription Confirmation
 ↓
Appointment
 ↓
Track Service Status

## 1. Purpose

This document defines the engineering rules, architecture principles, coding standards, and development practices for this backend.

The agent must read and follow this document before making changes.

The application domain should be understood from the existing code, models, routes, and requirements. Do not hard-code domain-specific assumptions into this document.

The goal is to build a backend that is:

* Simple
* Scalable
* Maintainable
* Testable
* Production-ready
* Easy for another developer or agent to understand

Prefer simple solutions over unnecessary abstractions.

---

# 2. Technology Stack

The backend uses:

* Node.js
* Express.js
* TypeScript
* MongoDB
* Mongoose

Do not introduce another framework, database, message broker, cache, ORM, or major infrastructure component unless explicitly requested.

---

# 3. Architecture

Use a modular layered architecture.

```text
src/
├── config/
├── constants/
├── controllers/
├── middleware/
├── models/
├── repositories/
├── routes/
├── types/
├── utils/
├── app.ts
└── server.ts
````

Responsibilities:

```text
Routes
  ↓
Controllers
  ↓
Business Logic
  ↓
Repositories
  ↓
Mongoose Models
  ↓
MongoDB
```

The exact folder structure can evolve when the project grows, but responsibilities must remain clearly separated.

---

# 4. Separation of Responsibilities

## Routes

Routes are responsible only for:

- Defining endpoints
- Connecting middleware
- Connecting controllers

Routes must not contain business logic.

Bad:

```ts
router.post('/users', async (req, res) => {
  // database logic
  // business logic
});
```

Good:

```ts
router.post('/users', authMiddleware, userController.create);
```

---

## Controllers

Controllers are responsible for HTTP concerns.

They should:

- Read request parameters
- Read request body
- Read authenticated user information
- Call the appropriate business/repository layer
- Return the HTTP response

Controllers should remain thin.

Avoid putting large business rules, complex queries, or multi-step workflows directly inside controllers.

---

## Business Logic

Business rules should live outside controllers.

Complex operations should be placed in an appropriate business/service/use-case layer when required.

Do not create a service class for every trivial function.

Use an additional abstraction when it provides meaningful separation or reuse.

---

## Repositories

Repositories are responsible for database access.

Examples:

```ts
findById()
findOne()
findMany()
create()
update()
delete()
```

Repositories should contain Mongoose queries rather than controllers.

Avoid duplicating the same database query in multiple places.

---

## Models

Mongoose models define:

- Database structure
- Types
- Required fields
- Enums
- Defaults
- Schema-level validation
- Indexes

Models should not contain unrelated application logic.

---

# 5. Do Not Over-Engineer

Do not introduce architecture merely because it is considered "enterprise".

Avoid adding:

- Microservices
- CQRS
- Event sourcing
- Kafka
- RabbitMQ
- Redis
- GraphQL
- Elasticsearch
- Multiple databases
- Complex dependency injection
- Complex design patterns

unless there is a real requirement.

A modular monolith is preferred when it satisfies the requirements.

Architecture should evolve because of an actual problem, not because of anticipated scale.

---

# 6. Business Logic Rules

Keep business logic independent from Express whenever practical.

Business logic should not depend heavily on:

```ts
req;
res;
next;
```

This makes the logic easier to:

- Test
- Reuse
- Maintain
- Execute from other entry points

For example, payment, pricing, authorization, scheduling, or state-transition logic should not be tightly coupled to HTTP controllers.

---

# 7. Database Rules

MongoDB is accessed through Mongoose.

Use Mongoose features appropriately:

- Schemas
- Validation
- References
- Embedded documents
- Indexes
- Transactions
- Aggregation
- Projections
- `lean()`

Do not use raw MongoDB queries when the same operation can be cleanly handled through Mongoose.

---

# 8. Embedding vs Referencing

Choose embedding or referencing based on access patterns and ownership.

Prefer embedding when:

- Data belongs strongly to its parent
- Data is usually read together
- The embedded data is relatively small
- Independent querying is unnecessary

Prefer references when:

- Data is shared
- Data has an independent lifecycle
- Data can grow significantly
- It is queried independently
- Many documents would otherwise duplicate large data

Do not reference everything automatically.

Do not embed everything automatically.

Make the decision based on the actual access pattern.

---

# 9. Historical Data

Never allow mutable master data to unexpectedly change historical records.

If a record represents a historical transaction, order, payment, configuration, or similar event, store the necessary snapshot information at the time of creation.

For example, if an entity's price can change later, historical records should retain the original price.

---

# 10. Database Query Rules

Always consider the query pattern before designing a schema.

Avoid:

- N+1 queries
- Loading entire collections unnecessarily
- Fetching fields that are not needed
- Repeated identical queries
- Unbounded queries on large collections

Use:

- Proper indexes
- Projections
- Pagination
- `lean()`
- Aggregation when appropriate

Do not add indexes blindly.

Every index should have a reason based on a real query pattern.

---

# 11. Pagination

Any endpoint that can return a large or growing collection should support pagination.

Do not return an unbounded number of database records.

Prefer predictable pagination parameters such as:

```text
page
limit
```

or cursor-based pagination where appropriate.

Always enforce a reasonable maximum limit.

Never allow the client to request an unlimited amount of data.

---

# 12. API Design

Use RESTful resource-oriented APIs.

Prefer:

```text
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
```

Avoid action-heavy naming when a resource-oriented design is possible.

Prefer:

```text
POST /orders
```

over:

```text
POST /createOrder
```

Use API versioning:

```text
/api/v1
```

when the project requires public or long-lived APIs.

---

# 13. Request Validation

Keep validation proportional to the application.

Mongoose schema validation should handle database-level rules.

Request validation should be added when:

- Input has complex requirements
- API contracts require strict validation
- Data needs transformation/sanitization
- Validation cannot reasonably be handled by the schema

Do not add validation libraries to every endpoint unnecessarily.

If a validation library is introduced, use it consistently rather than mixing multiple validation approaches.

---

# 14. Authentication

Authentication must be handled centrally through middleware.

Protected routes should not individually implement token verification.

Typical flow:

```text
Request
  ↓
Authentication Middleware
  ↓
Authenticated User
  ↓
Controller
```

Authentication logic must not be duplicated across controllers.

Never trust identity information supplied by the client when authenticated identity is already available from the token/session.

---

# 15. Authorization

Authentication and authorization are different.

Authentication answers:

```text
Who is the user?
```

Authorization answers:

```text
Is this user allowed to perform this operation?
```

Authorization must be enforced on the backend.

Never rely on frontend visibility or disabled buttons for security.

Always verify ownership and permissions server-side.

---

# 16. Error Handling

Use centralized Express error handling.

Do not create inconsistent error responses across controllers.

Use appropriate HTTP status codes.

Examples:

```text
400 → Invalid request
401 → Unauthenticated
403 → Unauthorized
404 → Resource not found
409 → Conflict
422 → Unprocessable input
500 → Internal server error
```

Do not expose:

- Stack traces
- Database internals
- Secrets
- Internal implementation details

to clients.

---

# 17. Response Format

Keep API responses predictable.

Example:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Resource not found"
}
```

Do not return completely different response structures for similar endpoints without a reason.

---

# 18. Async Code

Use `async/await`.

Handle rejected promises correctly.

Use `Promise.all()` when operations are independent and can safely execute concurrently.

Do not use `Promise.all()` when operations depend on one another.

Avoid unnecessary sequential database calls.

Bad:

```ts
await getUser();
await getProducts();
await getOrders();
```

when all three are independent.

Prefer:

```ts
const [user, products, orders] = await Promise.all([
  getUser(),
  getProducts(),
  getOrders(),
]);
```

when appropriate.

---

# 19. Transactions

Use MongoDB transactions when multiple database writes must succeed or fail together.

Do not use transactions for every operation.

Use them when atomicity is actually required.

Before using a transaction, determine whether:

- A single atomic update is sufficient
- A unique index can solve the problem
- A transaction is actually necessary

Prefer the simplest safe solution.

---

# 20. Race Conditions

Always consider concurrency for operations involving:

- Inventory
- Availability
- Counters
- Reservations
- Payments
- State transitions
- Limited resources

Never assume:

```text
check availability
↓
perform operation
```

is automatically safe.

Two requests may execute simultaneously.

Use appropriate:

- Atomic MongoDB updates
- Conditional updates
- Unique indexes
- Transactions

depending on the problem.

---

# 21. Idempotency

Operations that may be retried must be designed for idempotency where appropriate.

This is particularly important for:

- Payments
- Webhooks
- External callbacks
- Order creation
- Retryable operations

A repeated request must not unintentionally create duplicate records or duplicate side effects.

---

# 22. Webhooks

Webhook endpoints must:

1. Verify authenticity.
2. Validate the payload.
3. Handle duplicate events safely.
4. Perform only necessary processing.
5. Return the appropriate response quickly.
6. Avoid creating duplicate side effects.

Never trust webhook data without verification.

---

# 23. State Transitions

When an entity has multiple statuses, define valid state transitions clearly.

Do not allow arbitrary status changes from the API.

For example:

```text
PENDING
  ↓
CONFIRMED
  ↓
COMPLETED
```

should not automatically allow:

```text
COMPLETED → PENDING
```

unless explicitly supported.

Keep state transition rules centralized.

---

# 24. Security

Never trust client input.

Validate:

- IDs
- Query parameters
- Request bodies
- Headers
- File metadata
- External API responses

Never directly interpolate untrusted input into queries or commands.

Do not expose sensitive fields.

Never return:

- Passwords
- Tokens
- Secrets
- Private keys
- OTPs
- Payment credentials

---

# 25. Environment Configuration

Environment-specific configuration belongs in environment variables.

Never hard-code:

- Database URLs
- Secrets
- API keys
- Tokens
- Credentials
- Environment-specific URLs

Use a centralized configuration module.

Fail fast when required environment variables are missing.

---

# 26. Logging

Use structured logging where practical.

Log useful operational information such as:

- Errors
- Important state changes
- External API failures
- Database failures
- Authentication failures

Never log:

- Passwords
- Tokens
- OTPs
- Secrets
- Payment credentials
- Sensitive personal information

Avoid excessive logs inside frequently executed code.

---

# 27. Performance

Performance should be considered during implementation, not added only after problems occur.

Prefer:

- Efficient queries
- Correct indexes
- Pagination
- Projection
- `lean()`
- Concurrent independent operations
- Efficient data structures
- Minimal unnecessary serialization

Avoid:

- Unnecessary database calls
- Repeated calculations
- Loading large documents unnecessarily
- Large API responses
- Unnecessary middleware
- Premature caching

Do not optimize code blindly.

Measure or identify the actual bottleneck before introducing complex optimization.

---

# 28. Caching

Do not introduce caching by default.

First optimize:

```text
Database query
Index
Projection
Pagination
Application logic
```

Add caching only when there is a demonstrated need.

When caching is introduced, define:

- Cache key
- TTL
- Invalidation strategy
- Stale-data behavior
- Failure behavior

Caching must never silently become the source of truth.

---

# 29. File Structure Rules

Create files based on responsibility.

Do not create:

```text
helper.ts
common.ts
misc.ts
utils2.ts
```

containing unrelated functionality.

Prefer focused files:

```text
date.util.ts
pagination.util.ts
price.util.ts
```

when those utilities are genuinely reused.

Do not create unnecessary folders for a single file.

---

# 30. Naming

Use clear and predictable naming.

Variables and functions:

```text
camelCase
```

Classes and models:

```text
PascalCase
```

Constants:

```text
UPPER_SNAKE_CASE
```

Files should use a consistent convention throughout the project.

Names should describe intent.

Avoid vague names such as:

```text
data
result
temp
helper
process
handle
```

when a more meaningful name is possible.

---

# 31. TypeScript

Use TypeScript properly.

Avoid:

```ts
any;
```

unless there is a legitimate reason.

Prefer:

```ts
unknown;
```

when the type is genuinely unknown.

Define types for:

- Request data
- Response data
- Database-related structures
- Business logic
- External API responses

Avoid unnecessary duplication of types.

Reuse existing types where appropriate.

---

# 32. Constants

Move repeated fixed values into constants.

Examples:

```text
status values
limits
timeouts
configuration values
```

Do not create constants for values that are used once and are already self-explanatory.

Do not scatter magic numbers throughout business logic.

---

# 33. Reusable Logic

Before creating new logic, search the codebase.

Ask:

```text
Does this already exist?
Can the existing implementation be reused?
Can the existing implementation be extended safely?
```

Do not create duplicate utilities, repositories, middleware, or business logic.

---

# 34. Dependency Rules

Before adding a package:

1. Check whether the current stack can solve the problem.
2. Check whether an existing dependency already provides the functionality.
3. Determine whether the package is necessary.
4. Consider maintenance and security implications.
5. Ask before introducing a new dependency.

Do not add libraries simply because they are popular.

---

# 35. Changes to Existing Code

Before modifying code:

1. Read the relevant files.
2. Understand how the existing implementation works.
3. Follow existing conventions.
4. Identify dependencies and side effects.
5. Make the smallest change required.

Do not rewrite unrelated code.

Do not refactor unrelated modules while completing a feature.

Do not change existing behavior unless required by the task.

---

# 36. Backward Compatibility

When changing an API, model, or response:

Consider:

- Existing frontend usage
- Existing database records
- Existing integrations
- Existing clients
- Migration requirements

Do not silently rename or remove fields that existing code depends on.

If a breaking change is necessary, make it explicit.

---

# 37. Database Migrations

When changing persistent data structures, consider existing records.

Do not assume the database contains only newly created documents.

Handle:

- Existing documents
- Missing fields
- Old enum values
- Changed formats
- Data migration requirements

A schema change should not automatically break existing production data.

---

# 38. Testing

Business-critical logic should be testable independently of Express.

Prioritize tests for:

- Business rules
- Pricing
- Authorization
- State transitions
- Database edge cases
- Race-sensitive operations
- Payment handling

Do not write tests only for happy paths.

Important edge cases should be covered.

---

# 39. Comments

Write comments only when they explain something that is not obvious from the code.

Good:

```ts
// Use an atomic update here to prevent two concurrent requests
// from consuming the same available resource.
```

Bad:

```ts
// Get user
const user = await ...
```

Do not use comments to compensate for unclear code.

Prefer readable code.

---

# 40. Code Quality

Code should be:

- Small
- Readable
- Predictable
- Explicit
- Easy to test
- Easy to modify

Avoid deeply nested conditionals.

Avoid giant functions.

Avoid giant controllers.

Avoid unnecessary abstractions.

Prefer composition over complicated inheritance.

---

# 41. Agent Workflow

Before starting a task:

1. Read `AGENTS.md`.
2. Inspect the relevant project structure.
3. Search for existing implementations.
4. Understand the current pattern.
5. Identify the smallest correct change.
6. Implement using existing conventions.
7. Check for side effects.
8. Run relevant tests/type checks.
9. Review the final diff.

Do not start coding immediately after reading only the task description.

---

# 42. Do Not Guess

If an implementation depends on information that is not available:

- Inspect the repository.
- Search existing code.
- Check configuration.
- Check related models/routes.
- Ask for clarification when necessary.

Do not invent:

- Existing APIs
- Existing models
- Existing fields
- Existing libraries
- Business rules
- Infrastructure

---

# 43. Do Not Modify the Architecture Without Reason

The existing architecture should be preserved unless there is a clear reason to change it.

Before changing architecture, determine:

```text
What problem does this solve?
Why can't the current architecture solve it?
What code will be affected?
What complexity does this introduce?
```

Prefer incremental evolution.

---

# 44. Definition of Done

Before completing a task, verify:

- Code follows the existing architecture.
- Responsibilities are correctly separated.
- No unnecessary dependencies were added.
- No duplicate logic was introduced.
- Database queries are appropriate.
- Relevant indexes were considered.
- Authentication/authorization is enforced where required.
- Errors are handled consistently.
- Race conditions were considered where relevant.
- Historical data is protected where relevant.
- Existing behavior was not unintentionally changed.
- Types are correct.
- Relevant tests/type checks pass.
- No secrets or sensitive information were introduced.
- The final change is limited to what the task requires.

---

# 45. Most Important Rule

**Do not over-engineer.**

Use the simplest architecture that correctly solves the current requirement while keeping clear boundaries for future growth.

Do not build hypothetical infrastructure.

Do not add complexity because a large company might eventually need it.

Build the current requirement correctly, keep the architecture modular, and allow complexity to be introduced only when there is a real reason for it.
