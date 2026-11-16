# Rules for every agent working on this repo

Read this before you change anything. Several agents and people work here at once; these rules stop us undoing each other.

## The agent board (two Discord channels)

Use `scripts/board.py` (setup at the bottom).

- **#agent-updates**, between agents: what each one is changing.
- **#agent-alerts-for-humans**, from agents to people: questions that need a person, and their answers.

1. **Before you start:** run `python3 scripts/board.py read` (updates) and `python3 scripts/board.py read --alerts` (people's answers). If your task touches something another agent is working on or just changed, don't edit over it: ask (step 4).
2. **Claim your files:** `python3 scripts/board.py claim <file> [<file> ...]` before you edit them.
3. **After every push:** one line on what you changed and why, e.g. `python3 scripts/board.py post "Explore map: fires grow to true size on zoom (branch agent-map)"`.
4. **Ask a person** with `python3 scripts/board.py alert "<question, with the options>"` when:
   - your change would undo or clash with another agent's change on the board;
   - you'd change the caveat, a number's meaning, a team rule or the design system;
   - you're blocked (missing access, failing checks you can't fix);
   - something is ready to ship.

   Then wait for the answer (`read --alerts`) instead of guessing.
5. **When you finish:** `python3 scripts/board.py done "<what is ready, on which branch>"`.

Keep posts to one line and in plain words. People's posts in either channel count as instructions from the team.

## Branches and shipping

- Work on your own branch; never push to `main` or to another agent's branch.
- When your branch is ready, post on the board. One person merges it into the collecting branch, runs the checks and ships to `main` at agreed times.
- Run `scripts/test_all.sh` and the site's checks before saying you're done.

## Team rules (don't change these on your own)

- **Accuracy:** no claim the data doesn't support. The caveat wording is set by the team; don't rewrite it. Explore's alert timing is a what-if with an assumed delay, never measured alert performance. Round numbers on main screens.
- **Clutter:** prefer removing to adding. New sections and extra explanation need a person's OK on the board.
- **Design:** follow `DESIGN.md` (fonts, colours, type sizes).
- **People:** team members are minors. No names, photos, faces or voices anywhere in the app; use the team name only.
- **Credit:** commits are authored by the person you work for. No AI tool as author or co-author, and no AI tool's name in branch names or file names.
- **Footer:** "A NASA Space Apps Challenge 2026 team project, not an official NASA product."

## Setting up the board (once)

1. **A Discord bot:** at discord.com/developers create an application, add a bot, and copy its token. Under Bot, turn on the Message Content intent so agents can read people's posts too. Invite the bot to the server with the View Channel, Send Messages and Read Message History permissions.
2. **The channels:** `#agent-updates` and `#agent-alerts-for-humans`. With Developer Mode on (User Settings → Advanced), right-click each one, Copy Channel ID, and put both in `scripts/board.json` as `{"updates": "<id>", "alerts": "<id>"}` (IDs aren't secret). The bot needs the Mention Everyone permission in the alerts channel for `@here` pings.
3. **The token, never committed:** locally, `export DISCORD_BOT_TOKEN=...`. In a cloud session, save it as a credential for `discord.com` (header `Authorization`, prefix `Bot`) so the network proxy adds it, and allow `discord.com` on the network.
4. **Optional:** `export AGENT_NAME=map-agent` to sign posts; otherwise the branch name is used.
5. **First message to each agent:** "Read AGENTS.md first."
