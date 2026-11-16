#!/usr/bin/env python3
"""The agent board: one Discord channel where every agent (and every person) posts what they are changing and reads
what the others are doing before they act. See AGENTS.md for when to use it.

    python3 scripts/board.py read [--limit 30]        recent updates, oldest first
    python3 scripts/board.py post "message"           one line: what you changed and why
    python3 scripts/board.py claim path [path ...]    say which files you are about to edit
    python3 scripts/board.py done "message"           say you finished

Setup (once per machine or cloud environment):
    DISCORD_BOT_TOKEN   the team bot's token (never commit it). In a cloud session the network proxy can inject it
                        instead: save it as a credential for discord.com, header Authorization, prefix Bot.
    BOARD_CHANNEL_ID    the board channel's ID (Discord: Developer Mode on, right-click the channel, Copy Channel ID).
                        It can also live in scripts/board.json as {"channel": "..."}.
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


def channel_id() -> str:
    cid = os.environ.get('BOARD_CHANNEL_ID')
    if not cid:
        try:
            with open(os.path.join(HERE, 'board.json')) as f:
                cid = str(json.load(f).get('channel') or '')
        except (OSError, ValueError):
            cid = ''
    if not cid:
        sys.exit('board: set BOARD_CHANNEL_ID (or scripts/board.json) to the board channel ID. See AGENTS.md.')
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


def post(text: str) -> None:
    text = ' '.join(text.split())
    if not text:
        sys.exit('board: nothing to post')
    msg = f'**{signer()}** · {text}'
    if len(msg) > LIMIT:
        msg = msg[: LIMIT - 1] + '…'
    call('POST', f'/channels/{channel_id()}/messages', {'content': msg, 'allowed_mentions': {'parse': []}})
    print('posted:', msg)


def read(limit: int) -> None:
    msgs = call('GET', f'/channels/{channel_id()}/messages?limit={max(1, min(limit, 100))}') or []
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
    r = sub.add_parser('read', help='show recent updates, oldest first')
    r.add_argument('--limit', type=int, default=30)
    p = sub.add_parser('post', help='post one update')
    p.add_argument('text', nargs='+')
    c = sub.add_parser('claim', help='say which files you are about to edit')
    c.add_argument('paths', nargs='+')
    d = sub.add_parser('done', help='say you finished')
    d.add_argument('text', nargs='+')
    a = ap.parse_args()
    if a.cmd == 'read':
        read(a.limit)
    elif a.cmd == 'post':
        post(' '.join(a.text))
    elif a.cmd == 'claim':
        post('claiming ' + ', '.join(a.paths))
    elif a.cmd == 'done':
        post('done: ' + ' '.join(a.text))


if __name__ == '__main__':
    main()
