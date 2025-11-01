# Auto-Finalization Policy

**Date:** November 1, 2025
**Status:** DISABLED until further notice

---

## Policy

**Auto-finalization is DISABLED for all future batch runs** until explicitly authorized by user.

All batch-processed references must be manually reviewed and finalized by the user in the iPad app.

---

## Rationale

User prefers to review batch recommendations before finalizing to ensure quality and accuracy.

---

## Configuration

**Default batch-config.yaml:**
```yaml
auto_finalize: false  # User must manually review and finalize
```

**To temporarily enable for a specific batch:**
```yaml
auto_finalize: true  # Only when explicitly requested
```

---

## History

- **Nov 1, 2025:** v16.6 test batch auto-finalized 22/25 references
- **Nov 1, 2025:** User requested auto-finalization be disabled going forward
- **Going forward:** All batches will leave references unfinalized for manual review

---

**Last Updated:** November 1, 2025
