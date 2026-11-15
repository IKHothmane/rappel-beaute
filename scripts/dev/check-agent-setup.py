"""Validate project agent files without starting agents or changing external state."""
import json
from pathlib import Path
import re
import tomllib

ROOT = Path(__file__).resolve().parents[2]
roles = json.loads((ROOT / '.agents/roles.json').read_text(encoding='utf-8'))
manifest = json.loads((ROOT / '.agents/tooling.json').read_text(encoding='utf-8'))
config = tomllib.loads((ROOT / '.codex/config.toml').read_text(encoding='utf-8'))
assert config['agents']['enabled'] is True
assert config['agents']['max_concurrent_threads_per_session'] == 4
for role in roles:
    name = 'rb-' + role['id']
    native = tomllib.loads((ROOT / f'.codex/agents/{name}.toml').read_text(encoding='utf-8'))
    assert native['name'] == name.replace('-','_') and native['developer_instructions']
    assert 'model' not in native and 'sandbox_mode' not in native and 'approval_policy' not in native
    for client in ['.cursor','.claude']:
        text = (ROOT / client / 'agents' / f'{name}.md').read_text(encoding='utf-8')
        assert text.startswith('---\n') and f'name: {name}\n' in text and 'Read AGENTS.md' in text
    if role['readonly']:
        assert 'readonly: true' in (ROOT / f'.cursor/agents/{name}.md').read_text(encoding='utf-8')
        assert 'tools: Read, Glob, Grep' in (ROOT / f'.claude/agents/{name}.md').read_text(encoding='utf-8')
for skill in manifest['skills']:
    source = ROOT / '.agents/skills' / skill / 'SKILL.md'
    text = source.read_text(encoding='utf-8')
    name = re.search(r'^name:\s*(.+)$',text,re.M).group(1).strip().strip('"\'')
    assert (ROOT / '.claude/skills' / name / 'SKILL.md').is_file()
for repo in manifest['repositories'].values():
    assert re.fullmatch(r'[0-9a-f]{40}', repo['revision'])
for client in ['.mcp.json','.cursor/mcp.json']:
    servers = json.loads((ROOT / client).read_text(encoding='utf-8'))['mcpServers']
    for name, definition in manifest['stdioServers'].items():
        assert servers[name]['command'] == 'node' and Path(servers[name]['args'][0]).is_file()
        assert definition['version'] and 'latest' not in definition['version']
        assert config['mcp_servers'][name]['args'][1] == name
    for name in manifest['httpServers']:
        assert name in servers and name in config['mcp_servers']
assert (ROOT / 'CLAUDE.md').read_text(encoding='utf-8').find('@AGENTS.md') >= 0
print(json.dumps({'result':'PASS','roles_per_client':len(roles),'skills':len(manifest['skills']),'managed_mcp_servers':len(manifest['stdioServers'])+len(manifest['httpServers']),'global_permissions_modified':False},indent=2))
