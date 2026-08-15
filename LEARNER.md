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
