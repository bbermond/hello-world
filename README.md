# bermondyange.com: portfolio and job search

A static portfolio site with three tracks, one for each kind of job being targeted:

| Track | Link | Use for |
|---|---|---|
| Brand & Visual | `/?track=craft` | Tier 1, fast-yes contract and brand roles |
| Product Design | `/?track=product` (default) | Tier 2, senior product designer roles |
| AI Product Leadership | `/?track=leader` | Tier 3, founding, head-of and AI product lead roles |

- Content lives in `assets/data.js`. Edit it there.
- The master bio is `docs/profile.md`, and its open questions list what's still needed.
- The job pipeline is `jobs/README.md`.
- The agent team is in `.claude/agents/`. `CLAUDE.md` describes how the agents work together.

Preview locally with `python3 -m http.server`, then open http://localhost:8000/?track=leader.
Deploy by turning on GitHub Pages (main branch, root folder) and pointing bermondyange.com at it.
