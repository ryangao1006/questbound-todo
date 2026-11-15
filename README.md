# Quiet Todo

A small, calm todo list. Add tasks, set a due date, priority and note, filter by what matters, search, edit, complete and clear — nothing else.

**Live app: https://ryangao1006.github.io/questbound-todo/**

## What it is

- **A pure todo app.** No rewards, no points, no coins, no football, no club, no career. Just tasks.
- **Local only.** Everything is stored in this browser's `localStorage`. No accounts, no server, no analytics, no network requests after the page loads.
- **Calm by design.** One column, light and dark themes, keyboard-friendly, large tap targets, no animations unless your system allows them.
- **Small.** One HTML file, one stylesheet and one script — no build step, no dependencies.

## Features

- Add a task with title, due date, priority (high / normal / low) and an optional note.
- Grouped list: **Today and overdue**, **Upcoming**, **Someday**, **Completed**.
- Filters: All / Open / Today / Done, with live counts, plus text search over titles and notes.
- Complete, reopen, edit inline and delete tasks; clear completed in one action.
- Overdue and today labels, completion dates, priority pills.
- Keyboard: `/` focuses search, `Esc` cancels the composer or an edit, `Cmd/Ctrl+Shift+N` jumps to the new-task field.
- Light and dark themes, remembered locally.
- Empty states for every filter and search.

## Run locally

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8080
# http://localhost:8080
```

No installation or build is needed.

## Deploy

Pushing to `main` publishes the folder with GitHub Pages via `.github/workflows/pages.yml`.

## Data and privacy

Tasks live under the `quiet-todo-v1` localStorage key of the browser you use. Clearing site data removes them; there is no sync and no backup service by design. The app makes no requests after loading.

## License

MIT — see [LICENSE](LICENSE).
