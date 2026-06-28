# CreatorLink — Backlog (out of Slice 1)

*Status: Parked · reviewed each slice boundary*

These exist so they're not lost, but they are **not** in any Slice-1 epic. Each entry notes why it waits and the rough trigger to pull it forward. Grouped by how soon it's likely to matter.

## Fast-follow (Slice 2 — credible, retainable MVP)
| Item | Why deferred | Pull-forward trigger | Schema ready? |
|------|--------------|----------------------|:---:|
| Saved lists / shortlists (`List`/`ListItem`) | Not loop-critical | Orgs ask to organize candidates | ✅ |
| Favorites | Lightweight, not loop-critical | First retention pass | ✅ |
| Saved searches | Demand retention | Repeat-search behavior observed | ❌ (add table) |
| Notifications beyond contact (e.g. profile views) | Loop only needs contact notifs | Engagement push needed | ✅ |
| Talent-agency roster view | `can_represent_creators` orgs underserved in slice | First talent-agency customer | ✅ (`TalentAgencyRoster`) |
| `verifiedOnly` search filter | No verified inventory yet (decision 5) | Verified creators reach critical mass | ✅ |
| Email "you have a new contact" nudge | In-app chosen for slice | Response latency too high | n/a |
| Portfolio media upload (vs URL) | URLs enough to start | Creators ask for native upload | ✅ (`PortfolioItem`) |

## Post-MVP (Desired tier)
| Item | Why deferred | Notes |
|------|--------------|-------|
| OAuth social verification (IG/TikTok/YouTube) | Heavy integration + app review | Schema fields already support — set `verificationSource:'oauth'`, no migration |
| Third-party verification (Phyllo/Modash) | Per-lookup cost | Same schema hook, `source:'provider'` |
| Internal messaging / threads | Contact bridge enough to start | A product in itself |
| Creator reviews & ratings | Needs completed-collaboration liquidity | — |
| Payments / escrow | We're discovery, not transactions | — |
| Campaign / contract management | Adjacent product | Revisit after discovery traction |
| Advanced creator analytics | Retention, not core loop | — |
| React Native / Expo app (`apps/mobile`) | Web is mobile-first | Shares tRPC types later |
| AI matching / recommended creators for a brief | Needs data + working manual search first | — |

## Explicitly discarded (not planned)
- Type-locked org accounts — superseded by the capability model already in the schema.
- Password auth — passwordless is a deliberate product decision.

> Review cadence: revisit this list at each slice boundary; promote items into a new epic only when their pull-forward trigger fires.
