# CreatorLink — Design Document
*Date: 2026-03-12*

## Product Summary

CreatorLink is a two-sided marketplace connecting influencers and UGC creators with brands and agencies looking for talent. Think "LinkedIn for creators": standardized professional profiles with verified metrics on the supply side, and powerful search + roster management on the demand side.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo |
| Frontend | Next.js 15 (App Router) |
| Backend | NestJS |
| API layer | tRPC (shared types across monorepo) |
| Database | PostgreSQL + Prisma |
| Auth | Passwordless magic links + Google OAuth (JWT, implemented in NestJS) |
| Component library | Shared `packages/ui` + Storybook |
| Frontend deploy | Vercel |
| Backend deploy | Railway (NestJS + PostgreSQL) |

---

## Monorepo Structure

```
apps/
  web/          ← Next.js frontend
  api/          ← NestJS backend
packages/
  ui/           ← Shared components + Storybook
  db/           ← Prisma schema + migrations
  trpc/         ← Shared tRPC router types
```

---

## User Roles & Entities

### Platform
| Role | Description |
|------|-------------|
| `admin` | Platform owner — full control over all entities |

### Organizations
Organizations are **capability-based**, not type-locked. A `display_type` label is used for UI purposes, but permissions flow from capabilities.

| Capability | Description |
|------------|-------------|
| `can_search_creators` | Browse, filter, contact creators |
| `can_represent_creators` | Manage a creator roster, act on their behalf |

**Typical initial configurations:**
| Display type | Default capabilities |
|--------------|---------------------|
| Brand | `can_search_creators` |
| Marketing Agency | `can_search_creators` |
| Talent Agency | `can_represent_creators` |
| Hybrid | Both |

**Organization member roles:**
| Role | Permissions |
|------|-------------|
| `owner` | Full control, billing, team management (multiple owners allowed) |
| `member` | Search, contact creators, manage lists |

### Creators
| Type | Description |
|------|-------------|
| Independent creator | Has their own public profile, not affiliated with any talent agency |
| Represented creator | Has their own public profile, listed on a talent agency's roster |

A creator can also manage other creators (many-to-many). Creator management is a capability, not a separate account type.

---

## Data Model (high level)

```
users
  id, email, name, avatar, role (admin | creator | org_member)

organizations
  id, name, display_type, capabilities[]

organization_members
  user_id, org_id, role (owner | member)

creator_profiles
  user_id, username, country, city, bio, content_type (ugc | influencer | both)
  niches[], portfolio[], rates{}, collaborations[]

social_accounts
  creator_id, platform, handle, followers, engagement_rate

talent_agency_roster
  talent_agency_id, creator_id

creator_managers
  manager_user_id, creator_user_id  ← many-to-many

magic_link_tokens
  id, user_id, token, expires_at, used
```

---

## Authentication Flow

1. User enters email → NestJS generates a signed JWT token and sends a magic link
2. User clicks link → token validated → session created
3. Google OAuth also available as alternative
4. On first login → role selection (creator / org member)
5. Role selection routes to appropriate onboarding flow

---

## MVP Screens

1. **Landing page** — dual CTA (creator / agency-brand)
2. **Register / Login** — role selection, magic link, Google OAuth
3. **Creator onboarding** — 4 steps: basic info, social accounts + metrics, niches + content type, portfolio + bio
4. **Creator profile** — public profile with metrics, portfolio, rates, collaborations
5. **Agency/Brand search** — sidebar filters, creator cards, saved searches
6. **Creator card (agency view)** — full profile with audience demographics, rate table, contact actions
7. **Agency dashboard** — search shortcut, notifications, lists, favorites
8. **Contact system** — basic contact form / email bridge

---

## MVP Scope

### Must Have
- [ ] Monorepo scaffold (Turborepo + Next.js + NestJS + Storybook)
- [ ] Auth (magic link + Google OAuth, role selection)
- [ ] Creator onboarding (4 steps)
- [ ] Creator public profile
- [ ] Organization onboarding (capability selection)
- [ ] Creator search with filters (nicho, country, platform, followers, engagement)
- [ ] Creator card view for orgs
- [ ] Basic contact system
- [ ] Admin panel (basic)

### Nice to Have (post-MVP)
- Verified metrics via social APIs
- Internal messaging system
- Saved searches + notifications
- Creator reviews and ratings
- Payment integration
- Advanced analytics for creators
- Contract management
- Native mobile app

---

## Key Design Decisions

- **tRPC over REST**: Type-safe API in monorepo eliminates duplicated type definitions and catches errors at compile time
- **Capability-based orgs**: Flexible model allows orgs to evolve (e.g., a marketing agency later representing creators) without DB restructuring
- **Passwordless auth**: Reduces friction for users, eliminates password management overhead
- **Storybook in shared UI package**: Component library is shared between web app and documented in isolation
- **Multiple org owners**: Prevents account lockout and reflects real agency structures
