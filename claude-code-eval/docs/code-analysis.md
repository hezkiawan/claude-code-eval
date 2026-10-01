# Code analysis of the six run branches

> Source: `hezkiawan/claude-code-evaluation-demo`, branches `run/F1-C0 … run/F2-C2`, each diffed against its start tag
> (`eval-base-v2`, `base-C1`, `base-C2`). Reviewed by reading the code (not blind: chef identities were known).
> Purpose: check whether the code itself supports the run metrics, and find differences the checkers couldn't see.

## 1. Size of each change (excluding lockfiles)

| Run | Files | Lines added | Of which tests | Of which planning docs |
|---|---|---|---|---|
| F1-C0 | 10 | 479 | 125 | 0 |
| F1-C1 | 20 | 1,477 | 764 | 261 (spec, 3 tickets) + 39 glossary |
| F1-C2 | 15 | 1,339 | 781 | 56 (TDD evidence report) |
| F2-C0 | 12 | 420 | 180 | 0 |
| F2-C1 | 16 | 920 | 372 | 198 (spec, 2 tickets) + 42 glossary |
| F2-C2 | 17 | 756 | 407 | 46 (TDD evidence report) |

Plugins roughly **double to triple the code**, and most of the extra is **tests** (ECC and MP) and **planning docs** (MP).

## 2. Backend: input and security discipline

**Room-ID validation.** A room ID from the URL is passed to Firestore's `Doc()`. An encoded `/` (`%2F`) can make it address a different document path.

| | F1 | F2 | Total |
|---|---|---|---|
| Stock | ✗ none (self-reported "odd IDs return 500") | ✓ rejects `/` | 1 / 2 |
| Matt Pocock | ✓ rejects `/` | **✗ none** (`Doc(r.PathValue("id"))`) | 1 / 2 |
| ECC | ✓ rejects `""`, `.`, `..`, `/`, over-long IDs | ✓ same (`validRoomID`) | **2 / 2** |

In F2-C1 the practical impact is low (the claim rules reject documents without a claimable status), but it's a gap that
**MP's two reviewers didn't flag**. ECC's always-loaded security rules ("all user inputs validated") are the likely reason ECC was consistent here.

**Concurrency (F2).** All three run check-and-write inside a Firestore transaction. **Equal**, and confirmed by the race test.

**Data consistency (F2).**
| | Stored fields | Consistent? |
|---|---|---|
| Stock | `waitSeconds` (truncated) + `slaBreached` (from the exact duration) | **✗** a claim at 5:00.4 stores 300 s *and* "breached" |
| Matt Pocock | `waitSeconds` + `slaBreached` decided from the same rounded value | ✓ (its Spec reviewer found and fixed exactly this) |
| ECC | `slaBreached` only (no `waitSeconds`) | ✓ (nothing to disagree) |

**Design.** All three extracted the claim rules into a pure function (`applyClaim` / `ClaimRoom`) and kept the handler thin.
MP and ECC whitelist claimable statuses (`idle`, `bot`); stock treats any non-closed, non-assigned status as claimable.

## 3. Frontend: state robustness (F2 Claim flow)

| Issue | Stock | Matt Pocock | ECC |
|---|---|---|---|
| Nested `<button>` avoided (Claim is a sibling of the tile button) | ✓ | ✓ | ✓ |
| **Stale tab reload**: a failed claim reloads the tab that was open *when you clicked*, not the current one; out-of-order list responses can overwrite the current tab | **✗** (`load(status)` from the closure) | **✓** (`statusRef` + `latestLoad` request counter) | **✗** (`load(status)`; found by its review, rated MEDIUM, not fixed) |
| **Two claims at once**: in-progress state tracked per room | **✗** single `claimingId` | **✓** `claimingIds: Set` | **✗** single `claimingId` (found by review, MEDIUM, not fixed) |
| Error message placement | list-level | per tile, with a fallback when the room disappears | list-level |
| Live badge mechanism | re-render every 1 s | re-render every 1 s | one timer per room at the exact breach moment (`useSlaBreached`) |
| Badge only on unassigned rooms (product rule) | ✗ | ✓ | ✗ (used its own default; our protocol miss) |

F1 (Notes): all three hid the message composer on the Notes tab and counted characters in code points.
Only MP matched the frontend's trimming exactly to Go's `strings.TrimSpace` (stock used JS `trim()`; ECC has no counter and lets the backend decide).

## 4. Tests: what is actually covered

| Run | Go tests | HTTP layer tested? | Firestore layer tested? |
|---|---|---|---|
| F1-C0 | 1 table test (18 validation rows) | ✗ | ✗ |
| F1-C1 | 17 tests, httptest + in-memory fake store | ✓ | ✗ |
| F1-C2 | 13 tests (httptest) + 4 **emulator-gated** store tests | ✓ | ✓ when an emulator is present |
| F2-C0 | 2 tests (8 rows), some httptest | partly | ✗ |
| F2-C1 | 2 tests (18 rows), pure rules function only | **✗** (chosen seam: "verify manually") | ✗ |
| F2-C2 | 4 tests (17 rows) + httptest via a swappable `claimRoom` | ✓ | ✗ (flagged as open issue) |

Frontend tests: F1: 3 / 17 / 20; F2: 6 / 8 / 21 (stock / MP / ECC). ECC split its F2 tests by unit (`sla`, `api`, `useSlaBreached`, `ChatList`).

**Test depth: ECC ≥ MP > stock.** MP's seam discipline sometimes leaves the HTTP/database layer deliberately untested.

## 5. What the code says about each tool

| | Stock | Matt Pocock | ECC |
|---|---|---|---|
| Correctness (checkers) | = | = | = |
| Input/security discipline | inconsistent | inconsistent (missed ID check in F2) | **most consistent** |
| Data/spec consistency | 1 subtle bug (waitSeconds vs breach) + product-rule miss | **best** (reviewer fixed subtle bugs; product rule right) | good (avoided the bug by design); product-rule miss |
| Frontend state robustness | 2 latent bugs | **no known bugs** | 2 latent bugs (found, left unfixed) |
| Test depth | lowest | good, but seam choice skips layers | **highest** (incl. HTTP and emulator-gated DB tests) |
| Extra artifacts | none | spec, tickets, glossary | TDD evidence report |

## 6. Important nuance about the review step
ECC's `/ecc:code-review` **did find** the two frontend bugs, then asked *"Should I fix medium items 1–3?"*. Our protocol only
allowed "fix CRITICAL and HIGH", so they stayed. **A real developer would most likely have said yes.** The difference in
frontend robustness is therefore **partly caused by our protocol**, not only by the tool. MP's review fixes findings inside
`/implement` without asking, which is why its version ended up clean.
