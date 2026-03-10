import test from 'node:test';
import { mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as cp from 'node:child_process';
import * as os from 'node:os';
import {
    validateBranch,
    validateSkillPath,
    installSingleSkill,
    removeDirIfExists,
    ensureDir,
    cloneRepository
} from '../src/skills/installer.js';

const createTempDir = () => mkdtempSync(join(tmpdir(), 'superpowers-test-'));

test('validateBranch enforces safe git ref names', () => {
    assert.equal(validateBranch('main'), 'main');
    assert.equal(validateBranch('feature/foo'), 'feature/foo');
    assert.equal(validateBranch('v1.2.3'), 'v1.2.3');
    assert.equal(validateBranch(''), null);
    assert.equal(validateBranch('bad name'), null);
    assert.equal(validateBranch('main;rm -rf /'), null);
    assert.equal(validateBranch('../oops'), null);
});

test('validateSkillPath blocks traversal and absolutes', () => {
    assert.equal(validateSkillPath('skill-a'), 'skill-a');
    assert.equal(validateSkillPath('group/skill-b'), 'group/skill-b');
    assert.equal(validateSkillPath('/etc/passwd'), null);
    assert.equal(validateSkillPath('../escape'), null);
    assert.equal(validateSkillPath('foo//bar'), null);
});

test('installSingleSkill copies a valid skill', () => {
    const temp = createTempDir();
    const sourceRoot = join(temp, 'source');
    const skillDir = join(sourceRoot, 'good-skill');
    ensureDir(skillDir);
    writeFileSync(join(skillDir, 'skill.json'), JSON.stringify({ name: 'good-skill', title: 'Good Skill' }));
    writeFileSync(join(skillDir, 'SKILL.md'), '# good');

    const installBase = join(temp, 'install');
    const results = { installed: [], errors: [] };
    installSingleSkill(sourceRoot, 'good-skill', installBase, results);

    assert.equal(results.errors.length, 0);
    assert.equal(results.installed[0].name, 'good-skill');
    assert.ok(existsSync(join(installBase, 'good-skill', 'SKILL.md')));

    removeDirIfExists(temp);
});

test('installSingleSkill rejects unsafe names and leaves no output', () => {
    const temp = createTempDir();
    const sourceRoot = join(temp, 'source');
    const skillDir = join(sourceRoot, 'safe-skill');
    ensureDir(skillDir);
    writeFileSync(join(skillDir, 'skill.json'), JSON.stringify({ name: '../bad-target' }));

    const installBase = join(temp, 'install');
    const results = { installed: [], errors: [] };
    installSingleSkill(sourceRoot, 'safe-skill', installBase, results);

    assert.equal(results.installed.length, 0);
    assert.equal(results.errors.length, 1);
    assert.equal(results.errors[0].startsWith('Invalid target skill name'), true);
    assert.equal(existsSync(installBase), false);

    removeDirIfExists(temp);
});

test('cloneRepository rejects invalid branch before calling git', () => {
    // If validation fails, we should never reach git. Use PATH stub that would explode if called.
    const originalPath = process.env.PATH;
    const originalHome = process.env.HOME;
    const tempHome = createTempDir();
    process.env.HOME = tempHome;
    const tempBin = createTempDir();
    process.env.PATH = `${tempBin}:${originalPath}`;
    writeFileSync(join(tempBin, 'git'), '#!/usr/bin/env bash\nexit 99\n');
    cp.execSync(`chmod +x "${join(tempBin, 'git')}"`);

    assert.throws(() => cloneRepository('https://example.com/repo.git', 'main;rm -rf /'), /Invalid branch name/);

    process.env.PATH = originalPath;
    process.env.HOME = originalHome;
    removeDirIfExists(tempBin);
    removeDirIfExists(tempHome);
});

test('cloneRepository constructs safe git args for valid branch', () => {
    const originalPath = process.env.PATH;
    const originalHome = process.env.HOME;
    const tempHome = createTempDir();
    process.env.HOME = tempHome;
    const tempBin = createTempDir();
    const logFile = join(tempBin, 'git-args.log');
    process.env.PATH = `${tempBin}:${originalPath}`;
    // Stub git to record args and create dest dir
    writeFileSync(
        join(tempBin, 'git'),
        '#!/usr/bin/env bash\nprintf \"%s\\n\" \"$*\" > "' + logFile + '"\nmkdir -p \"${@: -1}\"\n'
    );
    cp.execSync(`chmod +x "${join(tempBin, 'git')}"`);

    const tmpDir = cloneRepository('https://example.com/repo.git', 'feature/test');
    const recorded = readFileSync(logFile, 'utf8');
    assert.ok(recorded.startsWith('clone --depth 1 --branch feature/test https://example.com/repo.git'));
    assert.ok(tmpDir.includes('.agents/tmp'));
    assert.ok(existsSync(tmpDir));

    process.env.PATH = originalPath;
    process.env.HOME = originalHome;
    removeDirIfExists(tempBin);
    removeDirIfExists(tmpDir);
    removeDirIfExists(tempHome);
});
