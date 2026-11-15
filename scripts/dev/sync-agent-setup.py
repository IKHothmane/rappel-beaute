"""Generate native project roles and Claude skill adapters from shared sources."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
roles = json.loads((ROOT / '.agents/roles.json').read_text(encoding='utf-8'))

def write(relative: str, content: str) -> None:
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8', newline='\n')

for role in roles:
    name = 'rb-' + role['id']
    body = role['instructions'] + '\n\nReturn a concise French handoff: findings/changes, owned files, checks actually run, and remaining limitations.\n'
    write(f'.codex/agents/{name}.toml',
          f'name = {json.dumps(name.replace("-", "_"))}\ndescription = {json.dumps(role["description"], ensure_ascii=False)}\n'
          f'developer_instructions = """\n{body}"""\n')
    cursor = f'---\nname: {name}\ndescription: {json.dumps(role["description"], ensure_ascii=False)}\nreadonly: {str(role["readonly"]).lower()}\n---\n\n{body}'
    write(f'.cursor/agents/{name}.md', cursor)
    # Read-only reviewers get file/search tools only; other roles inherit the parent's tools.
    tools = 'tools: Read, Glob, Grep\n' if role['readonly'] else ''
    write(f'.claude/agents/{name}.md', f'---\nname: {name}\ndescription: {json.dumps(role["description"], ensure_ascii=False)}\n{tools}---\n\n{body}')

for skill in sorted((ROOT / '.agents/skills').iterdir()):
    source = skill / 'SKILL.md'
    if not source.is_file():
        continue
    text = source.read_text(encoding='utf-8')
    metadata = text.split('---', 2)[1]
    name = re.search(r'^name:\s*(.+)$', metadata, re.M).group(1).strip().strip('"\'')
    description_match = re.search(r'^description:\s*(.*(?:\n[ \t]+.*)*)', metadata, re.M)
    description = description_match.group(1).strip()
    if description.startswith(('>', '|')):
        description = ' '.join(description[1:].split())
    else:
        description = description.strip('"\'')
    write(f'.claude/skills/{name}/SKILL.md',
          f'---\nname: {name}\ndescription: {json.dumps(description, ensure_ascii=False)}\n---\n\n'
          f'Read and follow the full shared skill at `.agents/skills/{skill.name}/SKILL.md` from the project root. '
          'Load its referenced resources only as needed. Resolve its scripts and references against that shared skill directory. '
          'For examples assuming a global CODEX_HOME skill path, use the equivalent installed project path. '
          'Follow AGENTS.md and the user\'s existing authorization.\n')

write('.cursor/rules/rappel-beauty.mdc', '---\ndescription: Project conventions and verification for Rappel Beauty\nalwaysApply: true\n---\n\nRead and follow `AGENTS.md` at the repository root. Use `.cursor/agents/` for scoped specialist work and `.agents/skills/` for task-matched upstream skills. Preserve existing user changes and report verified outcomes.\n')
print(json.dumps({'roles_per_client':len(roles), 'shared_skills':len(list((ROOT / '.agents/skills').glob('*/SKILL.md')))}, indent=2))
