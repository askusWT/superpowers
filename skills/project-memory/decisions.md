# Architectural Decisions

This file tracks the "why" behind the project's structure to ensure consistency across AI sessions.

## [YYYY-MM-DD] Title of Decision
- **Status:** [Proposed | Accepted | Superseded]
- **Context:** What problem were we solving? (e.g., slow build times, data consistency issues).
- **Decision:** What did we choose? (e.g., "Use SQLite for local dev instead of Dockerized Postgres").
- **Rationale:** Why this over the alternatives?
- **Consequences:** What do we need to remember? (e.g., "Must run migration scripts manually").

---
## [2025-01-27] Use Tailwind for Styling
- **Status:** Accepted
- **Context:** Need a rapid, consistent way to style UI components without managing global CSS files.
- **Decision:** Adopt Tailwind CSS 4.0.
- **Rationale:** High developer velocity; Claude is excellent at generating Tailwind utility classes.
- **Consequences:** Avoid adding custom CSS to `globals.css` unless absolutely necessary.
