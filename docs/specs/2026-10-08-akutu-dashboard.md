# Spec: Akutu dashboard on shadcn

Written Thu Oct 8, 2026. Status: ready for build, phase 1.

## Problem Statement

Ebenezer runs his work out of the Akutu_2 workspace: tasks in STATUS.md, projects in PROJECTS.md, history in JOURNAL.md, and the morning mail and calendar state in the mail cache. He looks at all of it through one dashboard, a single HTML file that Claude regenerates by pasting HTML fragments into a fixed template.

Two things are wrong with that:

1. **The look.** The dashboard was designed for about a dozen projects. There are now 21 active project blocks and well over the ~15 open-task guideline, and long cards do not hold that volume. There is no filtering, sorting or table view.
2. **The regeneration.** Every change in the chat (a task done, a status change, an inbox item adopted) obliges Claude to compose HTML fragments and rerun the fill script, or the dashboard goes stale. That costs tokens on every update, it is easy to forget, and a forgotten refresh means the dashboard quietly shows the wrong state.

## Solution

A local web app, built from Ebenezer's fork of the shadcn admin template on Base UI and Next.js, that **reads the workspace files directly every time the page is viewed**. Claude edits the markdown as it does today; the page shows the new state on its own. Nothing is pasted, filled or regenerated mid-day.

The app is read-only, runs only on Ebenezer's Mac (localhost), starts at login, and lives in its own repo outside iCloud. The workspace files stay the single source of truth and keep their current formats.

**Both dashboards run side by side until the new one shows no bugs** (Ebenezer's words: "I'd keep both until the new one show no bugs"). The existing HTML dashboard stays the official one, and keeps being regenerated exactly as today, until Ebenezer decides to switch.

Rollout in three phases:

1. **Tasks and Projects.** The app reads STATUS.md and PROJECTS.md and shows the Tasks, Inbox and Projects views. This proves the riskiest part: reading hand-edited markdown reliably.
2. **Today, Calendar, Workspace, Start Here.** The app reads the morning mail cache, the journal and the workspace inventory, which completes the six views.
3. **Switch.** Ebenezer decides the app has shown no bugs. Session start opens the app instead of the HTML file, mid-day regeneration stops, and the old template is archived for rollback.

## User Stories

### Seeing the work

1. As Ebenezer, I want every open task from STATUS.md grouped by project, so that I see all the work without opening the file.
2. As Ebenezer, I want the task list as a table I can filter by project, so that 21 projects do not turn into one endless scroll.
3. As Ebenezer, I want to sort tasks by due date, so that deadlines are easy to scan.
4. As Ebenezer, I want tasks with a due date in the past marked overdue, so that I do not miss them in a long list.
5. As Ebenezer, I want tasks due today marked as due today, so that they stand out from the rest.
6. As Ebenezer, I want `(waiting on X)` tasks shown with who I am waiting on, so that I can tell my work from other people's.
7. As Ebenezer, I want the ⚠️ marker (open more than a week) visible on a task, so that old tasks do not hide.
8. As Ebenezer, I want the `#category` (deep-work, quick-win, comms, prep, admin) in its own column and filter, so that I can pick work by type.
9. As Ebenezer, I want a task's indented context line hidden until I click the task, so that the list stays readable and the context is one click away.
10. As Ebenezer, I want the tasks under `general` shown as their own group, so that project-less work is not lost or forced into a project.
11. As Ebenezer, I want the "Recently Done" entries shown separately from open work, so that I can see what moved without mixing it in.
12. As Ebenezer, I want the Day Plan section shown when I set one, and nothing when I did not, so that an empty plan does not take up space.
13. As Ebenezer, I want the Current Focus paragraph shown at the top of the Today view, so that the written state of the day leads.
14. As Ebenezer, I want no ranking, "top 3" or "focus" widget anywhere, so that the app never claims a priority it cannot know (workspace Rule 10).
15. As Ebenezer, I want counts only in the summary cards (tasks open, inbox items, projects), so that the numbers describe and do not judge.

### The inbox

16. As Ebenezer, I want every Inbox item from STATUS.md listed with its source, age and due date, so that I see what still needs a decision.
17. As Ebenezer, I want an inbox item's mail link to open the mail, so that I can read the original in one click.
18. As Ebenezer, I want an inbox item's context line shown on click, like tasks, so that both lists behave the same.
19. As Ebenezer, I want loose notes from the chat ("from the chat") shown alongside mail findings, so that the inbox is one place.

### Projects

20. As Ebenezer, I want every project block from PROJECTS.md shown as a row with name, phase and the first sentence of its status, so that I can scan all projects at once.
21. As Ebenezer, I want to filter projects by phase, so that I can look at only the active ones or only the ones in planning.
22. As Ebenezer, I want a project's full block (purpose, status, stakeholders, timeline, blocker, risk, delta) on click, so that the detail is there without cluttering the overview.
23. As Ebenezer, I want projects with a blocker visibly marked, so that stuck projects are easy to find.
24. As Ebenezer, I want to jump from a project to its open tasks, so that state and work connect.
25. As Ebenezer, I want archived projects left out, so that finished work does not crowd the view.

### Freshness and honesty

26. As Ebenezer, I want the page to update by itself when a workspace file changes, so that I never have to reload or ask for a refresh.
27. As Ebenezer, I want each source's age shown ("STATUS.md, 2 min ago"; "mail state, 3 days ago"), so that the page never pretends to be more current than its sources.
28. As Ebenezer, I want any line the app cannot understand shown as a raw line marked "not understood", so that nothing silently disappears.
29. As Ebenezer, I want a clear message when a workspace file cannot be read (for example iCloud has offloaded it), so that I never read an unreadable file as "nothing to do".
30. As Ebenezer, I want a clear message when the Akutu_2 folder itself cannot be found, so that a moved folder does not look like an empty workspace.
31. As Ebenezer, I want empty sections to collapse, so that the page has no empty cards.
32. As Ebenezer, I want the page to look right with no tasks, no inbox and no mail state at all, so that a quiet day or a fresh start is not broken.

### Today and Calendar (phase 2)

33. As Ebenezer, I want the morning briefing lead and text from the last `/morning` run on the Today view, so that the narrative is still there.
34. As Ebenezer, I want the morning briefing shown with its date and hidden behind a "from [day]" label when it is not today's, so that an old briefing is not read as today's.
35. As Ebenezer, I want today's meetings as a timeline on the Calendar view, with the meeting briefings that `/morning` prepared, so that the calendar works as it does today.
36. As Ebenezer, I want the mail status line from the morning run, so that I know whether mail was checked.
37. As Ebenezer, I want the recent journal entries on the Projects & Notes view, so that I can see what happened lately.

### Workspace and Start Here (phase 2)

38. As Ebenezer, I want the Workspace view to show connected systems, installed tools, plugins and routines from the workspace inventory, so that I can see what this machine can do.
39. As Ebenezer, I want the Workspace view built from the same shared workspace reader the existing dashboard uses, so that the two can never disagree about the equipment.
40. As Ebenezer, I want the Start Here view with the walkthrough and setup overview, so that the orientation page survives the move.

### Running it

41. As Ebenezer, I want the app to start by itself at login, so that it is there when I open it.
42. As Ebenezer, I want it reachable only from my own Mac, so that mail findings and client names never leave the machine.
43. As Ebenezer, I want `/checkup` to report when the app is not responding, so that a dead server is noticed by the system and not by me.
44. As Ebenezer, I want the app in the language set in config.yaml, so that it follows the workspace working language.
45. As Ebenezer, I want light and dark mode, so that it matches my system.
46. As Ebenezer, I want it usable at laptop width and readable on a narrow window, so that it works next to VS Code.

### Running both, then switching

47. As Ebenezer, I want the old HTML dashboard to keep working unchanged during phases 1 and 2, so that I always have the trusted version.
48. As Ebenezer, I want a parity check that compares the app's counts with the old dashboard's counts, so that I have evidence the app is right, not a feeling.
49. As Ebenezer, I want to make the switch decision myself, so that the app replaces the dashboard only when I say it has shown no bugs.
50. As Ebenezer, I want the old template archived, not deleted, at the switch, so that I can roll back in minutes.
51. As Claude working in the workspace, I want the workspace rules updated at the switch (render contract, the dashboard step in `/morning`, CLAUDE.md Rules 1 and 9, the self-test checklist), so that I stop regenerating a dashboard nobody uses.

## Implementation Decisions

**One module does the reading: the workspace reader.** Given the Akutu_2 folder, it returns one **dashboard snapshot**: open tasks (with project, headline, context line, due date, waiting-on, ⚠️, category), inbox items, Day Plan, Current Focus, Recently Done, project blocks, journal entries, the morning mail state, the inventory, a list of lines it did not understand, and per source its age and whether it could be read. Every view renders from the snapshot and nothing else. The views hold no parsing logic.

**The snapshot is built on every request, from the files.** There is no database and no cache of the markdown. The files are small; reading them per request is what makes the page always current.

**Live update by file watching.** The app watches the workspace's context folder and tells the open page to refresh when a file changes. The current dashboard already reloads itself; this keeps that behaviour.

**Formats are read as they are.** The reader follows the formats documented in the headers of STATUS.md and PROJECTS.md (task headline plus indented context line, `(due DD.MM.)`, `(waiting on X)`, `#category`, ⚠️; project blocks under level-two headings with Purpose, Status, Phase, Stakeholder, Timeline, Blocker, Risk, Delta). No workspace file format changes for this app. Due dates without a year resolve to the nearest sensible year around today.

**Tolerant parsing, loud failure.** A line in a known section that does not match the expected shape goes into the "not understood" list and is shown raw. A file that exists but cannot be read (for example an iCloud placeholder that has been offloaded) is reported as unreadable, never as empty. A missing workspace folder is a full-page error.

**Phase 2 reuses the morning cache as it is.** The mail cache already holds the briefing, agenda, inbox findings and mail status as escaped HTML fragments written by `/morning`. The app renders those fragments directly and styles the classes they use. `/morning` does not change in phase 2. That keeps the two dashboards on identical morning data during the side-by-side run. Moving the cache to structured fields is deferred until there is a reason.

**The Workspace view reuses the existing shared workspace reader** (the helper behind the current equipment overview and `/audit`), loaded from the Akutu_2 folder at runtime. It is not copied. Its own header says two copies would drift within a week.

**Configuration is one value:** the path to the Akutu_2 folder, from an environment variable. Language comes from config.yaml in that folder.

**Template trimming.** Keep the template's shell (sidebar, theme, layout) and the pages that map to the six views: Default (Today), Calendar, Tasks (Tasks and Inbox), CRM or Kanban (Projects & Notes), Infrastructure (Workspace), Academy (Start Here). Delete the other demo pages and their demo data.

**Read-only, enforced.** The app never writes to the workspace. No checkboxes, no forms, no buttons that change state. A second writer on STATUS.md would collide with Claude's edits (workspace Safeguard 11), and the dashboard is a view by rule (workspace Rule 8).

**Runs locally, bound to localhost only**, as a production build, started at login by a macOS launch agent. It is never deployed.

**Lives outside iCloud**, in its own repo cloned from the fork. Its dependencies never enter the Akutu_2 folder.

**Copy rules carried over from the render contract:** no em-dashes in user-facing text, honest source ages instead of a clock, empty sections collapse, no ranking, nothing invented (a missing value is shown as missing).

**Parity check.** A small check computes the snapshot's counts (open tasks, inbox items, projects) and compares them with the counts in the old dashboard's meta line. During the side-by-side run it is run daily, for example from `/morning` or `/checkup`, and a mismatch is reported in one line. The meta line's wording follows the working language, but the order of its numbers is fixed, so the check reads the numbers by position.

**Switch criterion.** The switch is Ebenezer's decision. The evidence put in front of him: the parity check has been clean every day for ten consecutive working days, no "not understood" lines have appeared that were really valid tasks, and no bug is open. Ten days is a proposal; he can change it.

**At the switch (phase 3), in the workspace:** session start opens the app's address instead of the HTML file; Rule 1 stops requiring a dashboard refresh after each file update; the render contract is rewritten to describe the morning cache, which is now the only thing `/morning` produces for the dashboard; the self-test checklist gains "app responds" and loses the template checks; the template and fill mechanism move to an archive folder.

## Testing Decisions

**What makes a good test here:** it feeds the workspace reader a folder of workspace files and checks the snapshot that comes out. It never inspects how the parsing is done. If the reader is rewritten, every test should still pass.

**One seam: the workspace reader.** Input is a workspace folder, output is the dashboard snapshot. That is the highest point where behaviour can be tested without a browser, and every view depends on it. No other module gets its own test suite.

**Fixture folders, not mocks.** Each test case is a small folder with real-shaped files:
- a full workspace copied from the real formats (tasks with every suffix, `general` group, Recently Done, project blocks with and without blocker, inbox items with mail links);
- an empty workspace (files exist, no tasks, no inbox, no projects);
- no mail cache at all;
- a mail cache from three days ago;
- malformed lines inside known sections (must land in "not understood", never vanish);
- an unreadable file and an offloaded iCloud placeholder (must report "unreadable", never "empty");
- a missing workspace folder;
- due dates around a year change, and a task that is due today.

**Known-bad first.** Each fixture's test is watched fail against a deliberately broken reader before its pass is trusted.

**Test runner:** Node's built-in test runner. The fork has no tests and no test framework today, and Akutu_2's scripts have none either, so there is no prior art to follow. The built-in runner adds no dependency.

**Beyond the seam, verification by looking.** At the end of each phase the app is opened with Playwright, the views are walked as Ebenezer would use them, in light and dark mode, with full data and with the empty fixture, and screenshots are looked at. That is the workspace's standing rule for anything with a visible surface, and it is verification, not a test suite.

**The parity check is the live test** during the side-by-side run. It compares against the old dashboard on real data every day.

## Out of Scope

- Any write from the dashboard: ticking off tasks, adopting inbox items, editing projects. All of that stays in the chat.
- Deploying the app anywhere, or opening it to other devices or people.
- Changing the format of STATUS.md, PROJECTS.md, JOURNAL.md or config.yaml.
- Changing `/morning` in phases 1 and 2. Restructuring the mail cache into structured fields.
- Fetching mail or calendar from the app. Mail and calendar state come only from the morning cache.
- Showing archived projects, or HR, salary or performance information. None of that is in the source files the dashboard reads, and it stays that way.
- Making the app part of the shareable workspace package. This is Ebenezer's machine only.
- Retiring the old dashboard before Ebenezer makes the switch decision.

## Further Notes

- **Where it lives:** in its own repo cloned from Ebenezer's fork of the template, outside iCloud. Akutu_2 stays the planning workspace; the app is built and run in its own repo, in line with how other project work is kept out of Akutu_2.
- **iCloud offloading is the most likely silent failure.** If macOS "Optimize Mac Storage" offloads the context files, the app cannot read them. The whole Obsidian folder that holds Akutu_2 is already marked "Keep Downloaded" (Ebenezer, Thu Oct 8, 2026), and no offloaded placeholder files were found in it that day. The reader's "unreadable" state stays as the backstop in case that setting is ever lost.
- **Volume is the reason for the table views.** On Thu Oct 8, 2026 PROJECTS.md had 21 active project blocks, above the 12 to 15 the workspace's design notes name as the comfortable limit for one workspace. The app makes that volume readable; it does not fix it.
- **Prior art inside Akutu_2:** the render contract defines today's behaviour (empty sections, source ages, no ranking, language) and is the reference for what "the same as the old dashboard" means during parity.
