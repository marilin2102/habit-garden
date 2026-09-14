# Habit Garden

GitHub-style habit heatmap (month + year) with XP, levels and streaks, embedded in Notion.

- `index.html` — the embed. URL options: `?view=month|year`, `&habit=<name>`, `&theme=light|dark`, `&compact=1` (hide XP card).
- `scripts/sync.mjs` — pulls ✅ Good Habit Log (bad habits only with INCLUDE_BAD=1 — data.json is public) from Notion into `data.json`. Every checkbox column is a habit.
- `.github/workflows/sync.yml` — runs the sync every 30 min. Needs repo secret `NOTION_TOKEN`.

XP: +10 per habit, +25 perfect day, +30 comeback after 3+ days away, streak milestones at 3/7/14/30 days. XP never goes down.
