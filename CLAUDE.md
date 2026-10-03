# Bermond Yange: portfolio & job-search workspace

## Goals
1. A portfolio site with three tracks served from one codebase (`?track=craft|product|leader`).
2. A curated master profile (`docs/profile.md`).
3. A tiered job pipeline (`jobs/`): fast yes → near target → optimal.
4. A team of agents (`.claude/agents/`), one per role.
5. An immersive "Harmattan" scroll story (`docs/art-direction/dry-season-brief.md`), built with Codex.

## Agent team
| Agent | Owns |
|---|---|
| `profile-curator` | `docs/profile.md`: facts, sources, open questions |
| `portfolio-curator` | `assets/data.js` projects and the featured order per track |
| `site-builder` | `index.html`, `assets/app.js`, `assets/site.css`, deploy |
| `job-scout` | `jobs/jobs.json`, `jobs/README.md` |
| `application-tailor` | `applications/<company>-<role>.md` packages |
| `outreach-writer` | Outreach drafts inside application packages |
| `creative-director` | `docs/art-direction/` brief, Codex/image prompts, design QA of the story site |

Typical flow: profile-curator → portfolio-curator → site-builder; job-scout → application-tailor → outreach-writer.

## Rules for every agent
- Professional information only. Never put personal, family, legal, medical, financial or compensation details from Drive, email or memory exports into this repo.
- Never invent facts, metrics or job listings. If something isn't known, add it to "Open questions" in `docs/profile.md`.
- Write bios without pronouns until Bermond states a preference.
- Nothing is sent, submitted or posted on Bermond's behalf. Drafts only.
