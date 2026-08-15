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
