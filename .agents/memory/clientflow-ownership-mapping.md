---
name: ClientFlow ownership mapping
description: Ownership migration expectations for existing ClientFlow records.
---

Keep legacy ClientFlow clients, projects, and tasks unassigned until the user explicitly identifies their owner. Do not assign them to the first account that signs in. A safe schema update adds nullable ownership columns without rewriting existing rows. Drizzle push on populated tables warned that adding owner-scoped uniqueness could truncate the clients table; never accept that path. Use reviewed additive schema changes and avoid data backfills until an explicit mapping is provided.

**Why:** Existing records may belong to different freelancers, and an automatic assignment could expose data across accounts.

**How to apply:** Preserve null owners and request an explicit mapping before updating legacy records. Keep cleanup limited to uniquely identified test fixtures.

The user confirmed manual two-account verification: Account A sees 4 clients, Account B sees only its own 1 client, and logout protection works.

**Why:** This is a user-confirmed behavior baseline that automated tests alone do not establish.

**How to apply:** Keep manual browser verification distinct from mocked automated tests and recheck these behaviors after auth or ownership-filter changes.
