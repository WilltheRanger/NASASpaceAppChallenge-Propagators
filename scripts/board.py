#!/usr/bin/env python3
"""The agent board: two Discord channels. #agent-updates is where every agent posts what it is changing and reads what
the others are doing before it acts; #agent-alerts-for-humans is where an agent asks a person for a decision and reads
the answer. See AGENTS.md for when to use each.

    python3 scripts/board.py read [--limit 30]        recent #agent-updates posts, oldest first
    python3 scripts/board.py read --alerts            recent #agent-alerts-for-humans posts (people's answers)
    python3 scripts/board.py post "message"           one line in #agent-updates: what you changed and why
    python3 scripts/board.py claim path [path ...]    say in #agent-updates which files you are about to edit
    python3 scripts/board.py done "message"           say in #agent-updates that you finished
    python3 scripts/board.py alert "question"         ask the people in #agent-alerts-for-humans (pings @here)

Setup (once per machine or cloud environment):
    DISCORD_BOT_TOKEN   the team bot's token (never commit it). In a cloud session the network proxy can inject it
                        instead: save it as a credential for discord.com, header Authorization, prefix Bot.
    scripts/board.json  the two channel IDs (not secret): {"updates": "...", "alerts": "..."}. Discord: Developer Mode
                        on, right-click a channel, Copy Channel ID. BOARD_UPDATES_ID and BOARD_ALERTS_ID override it.
    AGENT_NAME          optional: how this agent signs its posts. Defaults to the git branch name.

Only the Python standard library is used, so it runs anywhere the repository does.
"""
import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

API = 'https://discord.com/api/v10'
HERE = os.path.dirname(os.path.abspath(__file__))
LIMIT = 1900  # Discord's cap is 2000 characters a message; leave room for the signature


CHANNELS = {'updates': ('BOARD_UPDATES_ID', '#agent-updates'), 'alerts': ('BOARD_ALERTS_ID', '#agent-alerts-for-humans')}


def channel_id(which: str = 'updates') -> str:
    env, name = CHANNELS[which]
    cid = os.environ.get(env)
    if not cid:
        try:
            with open(os.path.join(HERE, 'board.json')) as f:
                cid = str(json.load(f).get(which) or '')
        except (OSError, ValueError):
            cid = ''
    if not cid:
        sys.exit(f'board: put the {name} channel ID in scripts/board.json as "{which}" (or set {env}). See AGENTS.md.')
    return cid


def signer() -> str:
    name = os.environ.get('AGENT_NAME')
    if name:
        return name
    try:
        return subprocess.run(['git', 'branch', '--show-current'], capture_output=True, text=True, cwd=HERE).stdout.strip() or 'agent'
    except OSError:
        return 'agent'


def call(method: str, path: str, body: dict | None = None):
    # in a cloud session the proxy replaces this placeholder with the saved credential
    token = os.environ.get('DISCORD_BOT_TOKEN', 'injected-by-proxy')
    req = urllib.request.Request(
        API + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization': f'Bot {token}', 'Content-Type': 'application/json', 'User-Agent': 'agent-board (https://github.com, 1.0)'},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors='replace')[:300]
        hint = {401: 'the bot token is missing or wrong', 403: 'the bot cannot see or post in that channel', 404: 'no channel with that ID'}.get(e.code, '')
        sys.exit(f'board: Discord said {e.code}{" (" + hint + ")" if hint else ""}: {detail}')
    except urllib.error.URLError as e:
        sys.exit(f'board: could not reach Discord ({e.reason}). In a cloud session, allow discord.com on the network.')


def post(text: str, which: str = 'updates', ping: bool = False) -> None:
    text = ' '.join(text.split())
    if not text:
        sys.exit('board: nothing to post')
    msg = f'{"@here " if ping else ""}**{signer()}** · {text}'
    if len(msg) > LIMIT:
        msg = msg[: LIMIT - 1] + '…'
    call('POST', f'/channels/{channel_id(which)}/messages', {'content': msg, 'allowed_mentions': {'parse': ['everyone'] if ping else []}})
    print(f'posted to {CHANNELS[which][1]}:', msg)


def read(limit: int, which: str = 'updates') -> None:
    msgs = call('GET', f'/channels/{channel_id(which)}/messages?limit={max(1, min(limit, 100))}') or []
    if not msgs:
        print('(the board is empty)')
        return
    for m in reversed(msgs):  # Discord returns newest first
        when = dt.datetime.fromisoformat(m['timestamp'].replace('Z', '+00:00')).astimezone(dt.timezone.utc).strftime('%m-%d %H:%M UTC')
        who = m.get('author', {}).get('global_name') or m.get('author', {}).get('username', '?')
        text = m.get('content') or '(no text: turn on the Message Content intent for the bot to read people\'s posts)'
        print(f'{when}  {who}: {text}')


def main() -> None:
    ap = argparse.ArgumentParser(description='Post to and read the agent board (a Discord channel).')
    sub = ap.add_subparsers(dest='cmd', required=True)
    r = sub.add_parser('read', help='show recent posts, oldest first')
    r.add_argument('--limit', type=int, default=30)
    r.add_argument('--alerts', action='store_true', help='read #agent-alerts-for-humans instead of #agent-updates')
    p = sub.add_parser('post', help='post one update')
    p.add_argument('text', nargs='+')
    c = sub.add_parser('claim', help='say which files you are about to edit')
    c.add_argument('paths', nargs='+')
    d = sub.add_parser('done', help='say you finished')
    d.add_argument('text', nargs='+')
    q = sub.add_parser('alert', help='ask the people in #agent-alerts-for-humans (pings @here)')
    q.add_argument('text', nargs='+')
    q.add_argument('--quiet', action='store_true', help="post without pinging @here")
    a = ap.parse_args()
    if a.cmd == 'read':
        read(a.limit, 'alerts' if a.alerts else 'updates')
    elif a.cmd == 'alert':
        post(' '.join(a.text), 'alerts', ping=not a.quiet)
    elif a.cmd == 'post':
        post(' '.join(a.text))
    elif a.cmd == 'claim':
        post('claiming ' + ', '.join(a.paths))
    elif a.cmd == 'done':
        post('done: ' + ' '.join(a.text))


if __name__ == '__main__':
    main()
