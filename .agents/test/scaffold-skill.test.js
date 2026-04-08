import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    buildSkillJson,
    classifyHelperFiles,
    parseScaffoldArgs,
    resolveScaffoldTarget,
    scaffoldSkill,
    selectPrimarySkillFile
} from '../src/commands/scaffold-skill.js';

const createTempDir = () => mkdtempSync(join(tmpdir(), 'superpowers-scaffold-'));

const removeDirIfExists = (path) => {
    if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
    }
};

const writeDraft = (dir, files) => {
    mkdirSync(dir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
        writeFileSync(join(dir, name), content, 'utf8');
    }
};

test('parseScaffoldArgs parses defaults and flags', () => {
    const parsed = parseScaffoldArgs(['/tmp/draft', 'commands/zellij', '--force']);
    assert.equal(parsed.draftDir, '/tmp/draft');
    assert.equal(parsed.skillPath, 'commands/zellij');
    assert.equal(parsed.scope, 'project');
    assert.equal(parsed.force, true);
});

test('selectPrimarySkillFile requires exactly one canonical SKILL.md', () => {
    assert.equal(selectPrimarySkillFile(['SKILL.md', 'reference.md']), 'SKILL.md');
    assert.throws(() => selectPrimarySkillFile(['reference.md']), /exactly one SKILL.md/);
});

test('classifyHelperFiles sorts helpers and ignores skill.json', () => {
    const result = classifyHelperFiles(['SKILL.md', 'skill.json', 'notes.md', 'reference.md'], 'SKILL.md');
    assert.deepEqual(result.helperFiles, ['notes.md', 'reference.md']);
});

test('buildSkillJson uses local naming for project scope', () => {
    const skillJson = buildSkillJson({
        skillPath: 'commands/zellij',
        frontmatter: { name: 'Zellij Helper', version: '1.2.3' },
        helpers: ['reference.md'],
        scope: 'project'
    });

    assert.equal(skillJson.name, 'commands/zellij');
    assert.equal(skillJson.title, 'Zellij Helper');
    assert.deepEqual(skillJson.aliases, ['commands/zellij', 'zellij']);
});

test('resolveScaffoldTarget uses project .agents/skills by default', () => {
    const tempProject = createTempDir();
    const originalCwd = process.cwd();
    const originalEnvProjectRoot = process.env.PWD;
    mkdirSync(join(tempProject, '.agents'), { recursive: true });

    process.chdir(tempProject);
    const resolved = resolveScaffoldTarget({ scope: 'project', skillPath: 'commands/zellij' });
    assert.equal(resolved.targetDir, join(tempProject, '.agents', 'skills', 'commands', 'zellij'));

    process.chdir(originalCwd);
    if (originalEnvProjectRoot) process.env.PWD = originalEnvProjectRoot;
    removeDirIfExists(tempProject);
});

test('scaffoldSkill writes SKILL.md, helpers, and skill.json for project scope', () => {
    const tempProject = createTempDir();
    const originalCwd = process.cwd();
    mkdirSync(join(tempProject, '.agents'), { recursive: true });

    const draftDir = join(tempProject, 'draft');
    writeDraft(draftDir, {
        'SKILL.md': `---\nname: Zellij Helper\ndescription: Use when working with zellij\nwhen_to_use: when working with zellij\nversion: 1.0.0\n---\n\n# Zellij\n`,
        'reference.md': '# Reference\n',
        'notes.md': '# Notes\n',
        'skill.json': '{"name":"stale"}'
    });

    process.chdir(tempProject);
    const result = scaffoldSkill({ draftDir, skillPath: 'commands/zellij', scope: 'project' });

    const targetDir = join(tempProject, '.agents', 'skills', 'commands', 'zellij');
    assert.equal(result.targetDir, targetDir);
    assert.ok(existsSync(join(targetDir, 'SKILL.md')));
    assert.ok(existsSync(join(targetDir, 'reference.md')));
    assert.ok(existsSync(join(targetDir, 'notes.md')));
    assert.ok(existsSync(join(targetDir, 'skill.json')));

    const generated = JSON.parse(readFileSync(join(targetDir, 'skill.json'), 'utf8'));
    assert.equal(generated.name, 'commands/zellij');
    assert.deepEqual(generated.helpers, ['notes.md', 'reference.md']);
    assert.deepEqual(generated.aliases, ['commands/zellij', 'zellij']);
    assert.equal(result.warnings.includes('Ignoring draft skill.json; generating a fresh one'), true);

    process.chdir(originalCwd);
    removeDirIfExists(tempProject);
});

test('scaffoldSkill fails without SKILL.md', () => {
    const tempProject = createTempDir();
    const draftDir = join(tempProject, 'draft');
    writeDraft(draftDir, {
        'reference.md': '# Reference\n'
    });

    assert.throws(() => scaffoldSkill({ draftDir, skillPath: 'commands/bad' }), /exactly one SKILL.md/);
    removeDirIfExists(tempProject);
});

test('scaffoldSkill fails on existing target without force and overwrites with force', () => {
    const tempProject = createTempDir();
    const originalCwd = process.cwd();
    mkdirSync(join(tempProject, '.agents', 'skills', 'commands', 'demo'), { recursive: true });
    writeFileSync(join(tempProject, '.agents', 'skills', 'commands', 'demo', 'SKILL.md'), '# old\n', 'utf8');

    const draftDir = join(tempProject, 'draft');
    writeDraft(draftDir, {
        'SKILL.md': `---\nname: Demo Skill\ndescription: Use demo\nwhen_to_use: when demo\n---\n\n# Demo\n`
    });

    process.chdir(tempProject);
    assert.throws(
        () => scaffoldSkill({ draftDir, skillPath: 'commands/demo', scope: 'project' }),
        /Target already exists/
    );

    const result = scaffoldSkill({ draftDir, skillPath: 'commands/demo', scope: 'project', force: true });
    const content = readFileSync(join(result.targetDir, 'SKILL.md'), 'utf8');
    assert.match(content, /Demo Skill/);

    process.chdir(originalCwd);
    removeDirIfExists(tempProject);
});
