import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync
} from 'fs';
import { basename, join, parse, resolve, dirname } from 'path';
import { paths } from '../core/paths.js';
import { validateSkillPath } from '../skills/installer.js';

const findProjectRootFromCwd = (cwd) => {
    let currentDir = resolve(cwd);
    const root = parse(currentDir).root;

    while (currentDir !== root) {
        if (existsSync(join(currentDir, '.agents'))) {
            return currentDir;
        }
        currentDir = dirname(currentDir);
    }

    return resolve(cwd);
};

const parseFrontmatterFields = (skillFile) => {
    const content = readFileSync(skillFile, 'utf8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
        throw new Error('SKILL.md must start with YAML frontmatter');
    }

    const fields = {
        name: '',
        description: '',
        version: '1.0.0',
        whenToUse: ''
    };

    for (const line of match[1].split('\n')) {
        const fieldMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
        if (!fieldMatch) continue;
        const [, key, rawValue] = fieldMatch;
        const value = rawValue.trim().replace(/^['"]|['"]$/g, '');
        if (key === 'name') fields.name = value;
        if (key === 'description') fields.description = value;
        if (key === 'version' && value) fields.version = value;
        if (key === 'when_to_use') fields.whenToUse = value;
    }

    return fields;
};

export const parseScaffoldArgs = (argv) => {
    const positional = [];
    let scope = 'project';
    let force = false;

    for (const arg of argv) {
        if (arg === '--force') {
            force = true;
            continue;
        }

        if (arg.startsWith('--scope=')) {
            scope = arg.split('=')[1];
            continue;
        }

        positional.push(arg);
    }

    if (!['project', 'shared'].includes(scope)) {
        throw new Error(`Invalid scope: ${scope}. Use --scope=project or --scope=shared`);
    }

    if (positional.length < 2) {
        throw new Error('Usage: superpowers-agent scaffold-skill <draft-dir> <skill-path> [--scope=project|shared] [--force]');
    }

    return {
        draftDir: positional[0],
        skillPath: positional[1],
        scope,
        force
    };
};

export const resolveScaffoldTarget = ({ scope, skillPath, cwd = process.cwd() }) => {
    const safeSkillPath = validateSkillPath(skillPath);
    if (!safeSkillPath) {
        throw new Error(`Invalid skill path: ${skillPath}`);
    }

    const root = scope === 'shared'
        ? paths.homeSuperpowersSkills
        : join(findProjectRootFromCwd(cwd), '.agents', 'skills');

    return {
        root,
        targetDir: join(root, safeSkillPath),
        skillPath: safeSkillPath,
        cwd
    };
};

export const discoverDraftFiles = (draftDir) => {
    const resolvedDraftDir = resolve(draftDir);
    if (!existsSync(resolvedDraftDir)) {
        throw new Error(`Draft directory not found: ${draftDir}`);
    }

    const stats = statSync(resolvedDraftDir);
    if (!stats.isDirectory()) {
        throw new Error(`Draft path is not a directory: ${draftDir}`);
    }

    const entries = readdirSync(resolvedDraftDir, { withFileTypes: true });
    const files = [];
    const warnings = [];

    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (entry.isDirectory()) {
            warnings.push(`Ignoring subdirectory: ${entry.name}`);
            continue;
        }
        if (entry.name.toLowerCase().endsWith('.md') || entry.name === 'skill.json') {
            files.push(entry.name);
        }
    }

    return {
        draftDir: resolvedDraftDir,
        files: files.sort(),
        warnings
    };
};

export const selectPrimarySkillFile = (files) => {
    const primaryFiles = files.filter((file) => file === 'SKILL.md');
    if (primaryFiles.length !== 1) {
        throw new Error('Draft directory must contain exactly one SKILL.md');
    }
    return 'SKILL.md';
};

export const classifyHelperFiles = (files, primarySkillFile) => {
    const helperFiles = [];
    const warnings = [];

    for (const file of files) {
        if (file === primarySkillFile || file === 'skill.json') continue;
        if (!file.toLowerCase().endsWith('.md')) continue;

        if (['skill.md', 'main.md', 'overview.md'].includes(file.toLowerCase())) {
            warnings.push(`Treating ${file} as a helper; only SKILL.md is primary`);
        }

        helperFiles.push(file);
    }

    return {
        helperFiles: helperFiles.sort(),
        warnings
    };
};

export const validateDraftDirectory = ({ draftDir, files, primarySkillFile }) => {
    const frontmatter = parseFrontmatterFields(join(draftDir, primarySkillFile));
    if (!frontmatter.name) {
        throw new Error('SKILL.md frontmatter must include a name field');
    }

    const warnings = [];
    if (!frontmatter.description) {
        warnings.push('SKILL.md frontmatter is missing description');
    }
    if (!frontmatter.whenToUse) {
        warnings.push('SKILL.md frontmatter is missing when_to_use');
    }
    if (files.includes('skill.json')) {
        warnings.push('Ignoring draft skill.json; generating a fresh one');
    }

    return {
        ok: true,
        frontmatter,
        warnings
    };
};

export const buildSkillJson = ({ skillPath, frontmatter, helpers, scope }) => {
    const shortName = basename(skillPath);
    return {
        version: frontmatter.version || '1.0.0',
        name: scope === 'shared' ? `superpowers:${skillPath}` : skillPath,
        title: frontmatter.name,
        helpers,
        aliases: [skillPath, shortName]
    };
};

export const writeScaffoldedSkill = ({ draftDir, primarySkillFile, helperFiles, targetDir, skillJson, force }) => {
    if (existsSync(targetDir)) {
        if (!force) {
            throw new Error(`Target already exists: ${targetDir}. Re-run with --force to overwrite`);
        }
        rmSync(targetDir, { recursive: true, force: true });
    }

    mkdirSync(targetDir, { recursive: true });

    const copiedFiles = [];

    const primaryContent = readFileSync(join(draftDir, primarySkillFile), 'utf8');
    writeFileSync(join(targetDir, 'SKILL.md'), primaryContent, 'utf8');
    copiedFiles.push('SKILL.md');

    for (const helper of helperFiles) {
        const content = readFileSync(join(draftDir, helper), 'utf8');
        writeFileSync(join(targetDir, helper), content, 'utf8');
        copiedFiles.push(helper);
    }

    writeFileSync(join(targetDir, 'skill.json'), `${JSON.stringify(skillJson, null, 2)}\n`, 'utf8');

    return {
        copiedFiles,
        generatedFiles: ['skill.json']
    };
};

export const scaffoldSkill = ({ draftDir, skillPath, scope = 'project', force = false }) => {
    const discovered = discoverDraftFiles(draftDir);
    const primarySkillFile = selectPrimarySkillFile(discovered.files);
    const helpers = classifyHelperFiles(discovered.files, primarySkillFile);
    const validation = validateDraftDirectory({
        draftDir: discovered.draftDir,
        files: discovered.files,
        primarySkillFile
    });
    const target = resolveScaffoldTarget({ scope, skillPath });
    const skillJson = buildSkillJson({
        skillPath: target.skillPath,
        frontmatter: validation.frontmatter,
        helpers: helpers.helperFiles,
        scope
    });
    const writeResult = writeScaffoldedSkill({
        draftDir: discovered.draftDir,
        primarySkillFile,
        helperFiles: helpers.helperFiles,
        targetDir: target.targetDir,
        skillJson,
        force
    });

    return {
        scope,
        sourceDir: discovered.draftDir,
        targetDir: target.targetDir,
        skillPath: target.skillPath,
        primarySkillFile,
        helperFiles: helpers.helperFiles,
        warnings: [...discovered.warnings, ...helpers.warnings, ...validation.warnings],
        copiedFiles: writeResult.copiedFiles,
        generatedFiles: writeResult.generatedFiles,
        skillJson
    };
};

export const runScaffoldSkill = () => {
    try {
        const args = parseScaffoldArgs(process.argv.slice(3));
        const result = scaffoldSkill(args);

        console.log('Scaffolded skill successfully');
        console.log(`- Scope: ${result.scope}`);
        console.log(`- Source: ${result.sourceDir}`);
        console.log(`- Target: ${result.targetDir}`);
        console.log(`- Primary: ${result.primarySkillFile}`);
        console.log(`- Helpers: ${result.helperFiles.length > 0 ? result.helperFiles.join(', ') : '(none)'}`);
        console.log(`- Generated: ${result.generatedFiles.join(', ')}`);
        if (result.warnings.length > 0) {
            console.log('- Warnings:');
            for (const warning of result.warnings) {
                console.log(`  - ${warning}`);
            }
        }
    } catch (error) {
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }
};
