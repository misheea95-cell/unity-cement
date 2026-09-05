---
name: Production capacity and DDoS protection
description: The boundary between application-level safeguards and edge-network protection for public traffic.
---

Application-level caching, validation, rate limiting, and security headers improve resilience but cannot absorb volumetric DDoS traffic; a public production domain should use an edge WAF/CDN for that layer.

**Why:** A process-local server can still be saturated before its own middleware runs, and in-memory limits are not shared across autoscaled instances.

**How to apply:** Keep bounded per-instance safeguards in the API, then place Cloudflare or an equivalent edge provider in front of the official public domain for bot filtering and DDoS absorption.