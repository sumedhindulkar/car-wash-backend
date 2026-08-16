# LEARNER.md

Past mistakes and corrections for agents working on this backend.

Read this file before making schema, index, or architecture decisions.
Do not repeat the mistakes listed here.

---

## Unnecessary indexes on small catalog collections

**Mistake:** Indexes were added on `vehicleType`, `category`, and `active` in the Service model, plus a compound index `{ vehicleType, category, active }`, without a proven need.

**Why it was wrong:**
- The services collection is a small, mostly static catalog (a handful of documents).
- Filtering a tiny collection does not benefit from indexes.
- AGENTS.md already requires: every index must have a reason based on a real query pattern. Do not add indexes by default on filterable fields.

**Rule going forward:**
- Do not add field-level or compound indexes just because a field is used in filters.
- Add an index only when there is a concrete query pattern on a collection that can grow large enough for the index to matter.
- Prefer no index over a speculative index on small/master/catalog data.

---

## Unnecessary one-line constant files

**Mistake:** A dedicated `src/constants/api.ts` was created only to export `API_PREFIX = '/api/v1'`.

**Why it was wrong:**
- AGENTS.md says not to create constants for values used once and already self-explanatory.
- A whole file for a single string used in one place adds noise without reuse value.

**Rule going forward:**
- Inline simple one-off values (e.g. `app.use('/api/v1', router)`).
- Create a constants file only when the same value is reused in multiple places or is a non-obvious domain constant.

---

## Over-engineered controller helpers

**Mistake:** Service and user controllers were filled with small helper functions like `readOptionalString`, `readOptionalBoolean`, `parseQueryBoolean`, `parseQueryEnum`, `parseVehicleType`, `parseCategory`, and `assertServiceItems` for basic request reading.

**Why it was wrong:**
- Controllers became long and hard to read for simple GET/PATCH handlers.
- One-off parse helpers added noise without real reuse value.
- Schema/Mongoose validation already covers many field rules.
- This violated “do not over-engineer” and “prefer simple solutions”.

**Rule going forward:**
- Keep controllers thin and direct: read `req.query` / `req.body`, call repository, return response.
- Do not invent parse/helper layers for straightforward field access.
- Extract a util only when the same non-trivial logic is reused across multiple places.
- Prefer short, obvious controller code over defensive helper abstractions.

---

## Manual document IDs instead of MongoDB ObjectIds

**Mistake:** Service seed generated custom string IDs from titles (`toServiceId(service.title)` → `"basic-car-wash"`) and the Service schema used a custom string `_id`.

**Why it was wrong:**
- MongoDB already generates ObjectIds. Manual slug IDs add unnecessary code and coupling to title formatting.
- Custom string `_id` diverges from the rest of the project (e.g. User) and complicates typing/upserts.
- The user explicitly forbade adding manual IDs.

**Rule going forward:**
- Never invent document IDs (slugify title, hard-code ids in seed JSON, custom string `_id` schemas) unless explicitly required.
- Let MongoDB/Mongoose assign ObjectIds by default.
- For idempotent seeds, upsert by a natural business key (e.g. `vehicleType` + `category`), not by a fabricated id.
- Keep `_id` out of domain interfaces; expose `id: String(doc._id)` only in API response mappers.

---

## Manual createdAt / updatedAt on model interfaces

**Mistake:** `createdAt` and `updatedAt` were declared on `IService` even though the schema already uses `{ timestamps: true }`.

**Why it was wrong:**
- Mongoose timestamps already manage those fields. Declaring them on the interface duplicates what the schema option provides.
- It encourages treating timestamps as writable domain fields in seeds and updates.
- The user explicitly forbade adding these fields manually.

**Rule going forward:**
- Do not put `createdAt` / `updatedAt` on model/domain interfaces when `timestamps: true` is set.
- Do not set timestamps in seed data or request bodies.
- Read timestamps from the document when mapping API responses if the client needs them; do not model them as hand-maintained schema fields.

---

## Typing Mongoose Schema with Document-extending interfaces

**Mistake:** Service schema/model were typed as `Schema<IServiceDocument>` / `Model<IServiceDocument>` where `IServiceDocument extends Document`. That broke `findOneAndUpdate` filter typing (`vehicleType` appeared missing on `Query`).

**Why it was wrong:**
- Putting Mongoose `Document` into the Schema generic confuses query/filter overloads in Mongoose 9.
- TypeScript then picks the wrong overload and reports misleading errors on the filter object.
- Follow-up attempts with complex `WithTimestamps` / multi-generic `model<...>()` calls over-engineered the fix and still failed to compile cleanly.

**Rule going forward:**
- Type Schema and Model with the plain data interface (`IService`), not `Document`.
- Use `HydratedDocument<IService>` (or equivalent) as the document type alias.
- Prefer the simple pattern that matches working code; do not pile on Mongoose generic parameters to force timestamp typing.
- When seed/update payloads fail typechecks, fix the payload types to match the model enums/interfaces first—do not assume the filter is wrong.
