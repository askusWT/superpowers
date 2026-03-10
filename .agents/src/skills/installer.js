import { existsSync, readFileSync, mkdirSync, rmSync, cpSync } from 'fs';
import { join, dirname, parse, sep } from 'path';
import * as cp from 'child_process';
import * as os from 'os';
import { homedir } from 'os';
import { getRepositories, addRepositoryToConfig, readConfigFile, writeConfigFile } from '../core/config.js';
import { syncPersonalSkillSymlinks } from '../utils/symlinks.js';
import { installAgents } from '../agents/installer.js';

/**
 * Get the repository root from a clone path.
 * For git-tree clones, sourcePath may be a subdirectory of the tmp clone.
 * This resolves back to the root of the cloned repo.
 */
export const getRepoRoot = (sourcePath, parsed) => {
    if (parsed.type === 'local') {
        // For local paths, walk up to find agents.json
        let dir = sourcePath;
        for (let i = 0; i < 10; i++) {
            if (existsSync(join(dir, 'agents.json'))) return dir;
            const parent = dirname(dir);
            if (parent === dir) break;
            dir = parent;
        }
        return sourcePath;
    }
    
    // For git clones, the tmp root is the clone root
    const tmpMarker = join('.agents', 'tmp');
    if (sourcePath.includes(tmpMarker)) {
        const idx = sourcePath.indexOf(tmpMarker);
        const afterTmp = sourcePath.substring(idx + tmpMarker.length + 1);
        const tmpName = afterTmp.split(sep)[0];
        return join(sourcePath.substring(0, idx), '.agents', 'tmp', tmpName);
    }
    return sourcePath;
};

/**
 * Persist a cloned repository for agent symlinks.
 * Copies the clone to ~/.agents/repos/<alias>/ so symlinks remain valid.
 * Returns the new persistent repo root path.
 */
export const persistRepoForAgents = (tmpRepoRoot, alias) => {
    const reposDir = join(homedir(), '.agents', 'repos');
    const safeName = alias.replace(/^@/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const destDir = join(reposDir, safeName);
    
    try {
        // Create repos dir
        mkdirSync(reposDir, { recursive: true });
        
        // Remove existing if present
        if (existsSync(destDir)) {
            rmSync(destDir, { recursive: true, force: true });
        }
        
        // Copy clone to persistent location
        cpSync(tmpRepoRoot, destDir, { recursive: true });
        
        return destDir;
    } catch (error) {
        console.log(`  Warning: Could not persist repository for agents: ${error.message}`);
        return null;
    }
};

/**
 * Basic allowlist for Git branch names (git-check-ref-format safe subset)
 */
export const validateBranch = (branch) => {
    if (!branch) return null;
    const isValid = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/.test(branch) && !branch.includes('..');
    return isValid ? branch : null;
};

/**
 * Ensure a skill path is a safe relative path (no traversal or absolutes)
 */
export const validateSkillPath = (path) => {
    if (typeof path !== 'string') return null;
    if (path.startsWith('/') || path.includes('..')) return null;
    const isValid = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(path);
    return isValid ? path : null;
};

/**
 * Remove a directory tree safely
 */
export const removeDirIfExists = (path) => {
    if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
    }
};

/**
 * Ensure a directory exists
 */
export const ensureDir = (path) => {
    mkdirSync(path, { recursive: true });
};

/**
 * Parse a Git URL or local path
 */
export const parseGitUrl = (url) => {
    // Check if it's a GitHub tree URL (HTTPS)
    const treeMatch = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/);
    if (treeMatch) {
        const [, org, repo, branch, path] = treeMatch;
        return {
            type: 'git-tree',
            repoUrl: `https://github.com/${org}/${repo}.git`,
            branch,
            path,
            original: url
        };
    }
    
    // Check if it's an SSH Git URL (git@github.com:org/repo.git)
    const sshMatch = url.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (sshMatch) {
        const [, org, repo] = sshMatch;
        return {
            type: 'git-repo',
            repoUrl: `git@github.com:${org}/${repo}.git`,
            branch: null,
            path: null,
            original: url
        };
    }
    
    // Check if it's a standard HTTPS git URL
    const gitMatch = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\.git)?$/);
    if (gitMatch) {
        const [, org, repo] = gitMatch;
        return {
            type: 'git-repo',
            repoUrl: `https://github.com/${org}/${repo}.git`,
            branch: null,
            path: null,
            original: url
        };
    }
    
    // Check if it's a local path
    if (existsSync(url)) {
        return {
            type: 'local',
            path: url,
            original: url
        };
    }
    
    return null;
};

/**
 * Determine installation location based on flags and config
 */
export const getInstallLocation = (flags) => {
    const hasGlobalFlag = flags.includes('--global') || flags.includes('-g');
    const hasProjectFlag = flags.includes('--project') || flags.includes('-p');
    
    // Flags override config
    if (hasGlobalFlag) {
        return join(os.homedir(), '.agents', 'skills');
    }
    
    if (hasProjectFlag) {
        return join(process.cwd(), '.agents', 'skills');
    }
    
    // Check config files for default
    const projectConfigPath = join(process.cwd(), '.agents', 'config.json');
    const globalConfigPath = join(os.homedir(), '.agents', 'config.json');
    
    // Project config takes precedence
    for (const configPath of [projectConfigPath, globalConfigPath]) {
        if (existsSync(configPath)) {
            try {
                const config = JSON.parse(readFileSync(configPath, 'utf8'));
                if (config.installLocation === 'project') {
                    return join(process.cwd(), '.agents', 'skills');
                }
            } catch (error) {
                // Ignore parse errors
            }
        }
    }
    
    // Default to global
    return join(os.homedir(), '.agents', 'skills');
};

/**
 * Clone a Git repository to a temporary directory
 */
export const cloneRepository = (repoUrl, branch) => {
    const tmpBase = join(os.homedir(), '.agents', 'tmp');
    const tmpDir = join(tmpBase, `skill-install-${Date.now()}`);
    
    try {
        ensureDir(tmpBase);

        const branchArg = validateBranch(branch);
        if (branch && !branchArg) {
            throw new Error(`Invalid branch name: ${branch}`);
        }

        const args = ['clone', '--depth', '1'];
        if (branchArg) {
            args.push('--branch', branchArg);
        }
        args.push(repoUrl, tmpDir);

        cp.execFileSync('git', args, { stdio: 'pipe', timeout: 30000 });
        return tmpDir;
    } catch (error) {
        removeDirIfExists(tmpDir);
        throw new Error(`Failed to clone repository: ${error.message}`);
    }
};

/**
 * Read skill.json from a path (used during installation)
 */
export const readSkillJsonFromPath = (path) => {
    const skillJsonPath = join(path, 'skill.json');
    if (!existsSync(skillJsonPath)) {
        return null;
    }
    
    try {
        const content = readFileSync(skillJsonPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Failed to read skill.json: ${error.message}`);
    }
};

/**
 * Install a single skill to the target location
 */
export const installSingleSkill = (sourcePath, skillName, installBase, results) => {
    const safeSkillName = validateSkillPath(skillName);
    if (!safeSkillName) {
        results.errors.push(`Invalid skill path: ${skillName}`);
        return;
    }

    const skillSourcePath = join(sourcePath, safeSkillName);
    
    if (!existsSync(skillSourcePath)) {
        results.errors.push(`Skill directory not found: ${skillName}`);
        return;
    }
    
    const skillJson = readSkillJsonFromPath(skillSourcePath);
    if (!skillJson) {
        results.errors.push(`No skill.json found in: ${skillName}`);
        return;
    }
    
    const targetNameRaw = skillJson.name || skillName;
    const targetName = validateSkillPath(targetNameRaw);
    if (!targetName) {
        results.errors.push(`Invalid target skill name: ${targetNameRaw}`);
        return;
    }
    const targetPath = join(installBase, targetName);
    
    // Create parent directory if needed
    const targetParent = dirname(targetPath);
    try {
        ensureDir(targetParent);
    } catch (error) {
        results.errors.push(`Failed to create directory ${targetParent}: ${error.message}`);
        return;
    }
    
    // Copy skill files
    try {
        // Remove existing skill if present
        removeDirIfExists(targetPath);
        
        cpSync(skillSourcePath, targetPath, { recursive: true, force: true });
        
        results.installed.push({
            name: targetName,
            path: targetPath,
            title: skillJson.title || skillJson.description || targetName
        });
    } catch (error) {
        results.errors.push(`Failed to install ${skillName}: ${error.message}`);
    }
};

/**
 * Command: add <url-or-path>
 * Install skills from repository or local path
 */
export const runAdd = () => {
    const args = process.argv.slice(3);
    let urlOrPath = args.find(arg => !arg.startsWith('-'));
    const flags = args.filter(arg => arg.startsWith('-'));
    
    if (!urlOrPath) {
        console.log(`Usage: superpowers-agent add <url-or-path|@alias> [skill-path] [options]

Options:
  --global, -g   Install skills globally in ~/.agents/skills/ (default)
  --project, -p  Install skills in current project's .agents/skills/

Examples:
  superpowers-agent add https://github.com/example/skills
  superpowers-agent add https://github.com/example/repo/tree/main/skills
  superpowers-agent add ~/my-local-skills
  superpowers-agent add https://github.com/example/skills --project
  superpowers-agent add ~/my-local-skills --global
  superpowers-agent add @myrepo path/to/skill
  superpowers-agent add @myrepo path/to/skills --project

Description:
  Installs skill(s) from a Git repository, local directory, or repository alias.
  Supports repositories with single or multiple skills.
  Reads skill.json to determine skill names and installation paths.
  
  Repository aliases can be added using:
    superpowers-agent add-repository <git-url> [--as=@alias]`);
        return;
    }
    
    console.log('Installing skill(s)...\n');
    
    // Check if urlOrPath is a repository alias
    let repoUrl = null;
    let skillPath = null;
    
    if (urlOrPath.startsWith('@')) {
        // It's a repository alias
        const alias = urlOrPath;
        skillPath = args.find((arg, i) => i > 0 && !arg.startsWith('-') && arg !== alias);
        
        // Look for alias in config (project first, then global)
        const projectRepos = getRepositories(false);
        const globalRepos = getRepositories(true);
        
        if (projectRepos[alias]) {
            repoUrl = projectRepos[alias];
            console.log(`Using project repository alias: ${alias}`);
        } else if (globalRepos[alias]) {
            repoUrl = globalRepos[alias];
            console.log(`Using global repository alias: ${alias}`);
        } else {
            console.log(`Error: Repository alias not found: ${alias}`);
            console.log(`\nAvailable aliases:`);
            
            const allRepos = { ...globalRepos, ...projectRepos };
            if (Object.keys(allRepos).length === 0) {
                console.log(`  (none)`);
                console.log(`\nAdd a repository using:`);
                console.log(`  superpowers-agent add-repository <git-url>`);
            } else {
                for (const [name, url] of Object.entries(allRepos)) {
                    console.log(`  ${name} -> ${url}`);
                }
            }
            return;
        }
        
        // Check if repoUrl is a local path or Git URL
        const isLocalPath = existsSync(repoUrl);
        
        if (skillPath) {
            if (isLocalPath) {
                // Local path - just append the skill path
                urlOrPath = join(repoUrl, skillPath);
                console.log(`Repository path: ${repoUrl}`);
                console.log(`Skill path: ${skillPath}\n`);
            } else {
                // Git URL - construct tree URL
                urlOrPath = `${repoUrl}/tree/main/${skillPath}`;
                console.log(`Repository URL: ${repoUrl}`);
                console.log(`Skill path: ${skillPath}\n`);
            }
        } else {
            urlOrPath = repoUrl;
            if (isLocalPath) {
                console.log(`Repository path: ${repoUrl}\n`);
            } else {
                console.log(`Repository URL: ${repoUrl}\n`);
            }
        }
    }
    
    // Parse URL/path
    const parsed = parseGitUrl(urlOrPath);
    if (!parsed) {
        console.log(`Error: Invalid URL or path not found: ${urlOrPath}`);
        return;
    }
    
    // Determine installation location
    const installBase = getInstallLocation(flags);
    console.log(`Install location: ${installBase}\n`);
    
    let sourcePath;
    let cleanup = false;
    
    try {
        // Get source path based on type
        if (parsed.type === 'git-repo' || parsed.type === 'git-tree') {
            console.log(`Cloning repository: ${parsed.repoUrl}`);
            if (parsed.branch) {
                console.log(`Branch: ${parsed.branch}`);
            }
            sourcePath = cloneRepository(parsed.repoUrl, parsed.branch);
            cleanup = true;
            
            if (parsed.path) {
                const safePath = validateSkillPath(parsed.path);
                if (!safePath) {
                    throw new Error(`Invalid repository path: ${parsed.path}`);
                }
                sourcePath = join(sourcePath, safePath);
                if (!existsSync(sourcePath)) {
                    throw new Error(`Path not found in repository: ${parsed.path}`);
                }
            }
            console.log('');
        } else {
            sourcePath = parsed.path;
        }
        
        // Read skill.json from source
        const rootSkillJson = readSkillJsonFromPath(sourcePath);
        if (!rootSkillJson) {
            throw new Error('No skill.json found in source directory');
        }
        
        // Install skills
        const results = {
            installed: [],
            errors: [],
            source: parsed.original
        };
        
        if (rootSkillJson.skills && Array.isArray(rootSkillJson.skills)) {
            // Multiple skills
            console.log(`Found ${rootSkillJson.skills.length} skill(s) to install\n`);
            for (const skillName of rootSkillJson.skills) {
                installSingleSkill(sourcePath, skillName, installBase, results);
            }
        } else {
            // Single skill
            const skillName = rootSkillJson.name || parse(sourcePath).base;
            installSingleSkill(dirname(sourcePath), parse(sourcePath).base, installBase, results);
        }
        
        // Check for agents.json and install agents
        const repoRoot = getRepoRoot(sourcePath, parsed);
        const agentsJsonPath = join(repoRoot, 'agents.json');
        if (existsSync(agentsJsonPath)) {
            let agentRepoRoot = repoRoot;
            // For git sources, persist the clone so symlinks remain valid
            if (cleanup) {
                // Determine alias from agents.json or URL
                let agentManifest;
                try {
                    agentManifest = JSON.parse(readFileSync(agentsJsonPath, 'utf8'));
                } catch {}
                const alias = agentManifest?.repository || parsed.original;
                const persistedRoot = persistRepoForAgents(repoRoot, alias);
                if (persistedRoot) {
                    agentRepoRoot = persistedRoot;
                }
            }
            installAgents(agentRepoRoot, { isUpdate: false });
        }
        
        // Clean up temporary clone
        if (cleanup && sourcePath) {
            try {
                // Get the tmp directory (parent of the actual source in case of tree URLs)
                const tmpDir = sourcePath.split('/.agents/tmp/')[0] + '/.agents/tmp/' + 
                               sourcePath.split('/.agents/tmp/')[1].split('/')[0];
                removeDirIfExists(tmpDir);
            } catch {}
        }
        
        // Report results
        console.log('\n**Successfully installed skills:**');
        console.log(`- Source: ${results.source}`);
        
        if (results.installed.length > 0) {
            for (const skill of results.installed) {
                console.log(`  - Installed: ${skill.name} at ${skill.path}`);
                console.log(`    ${skill.title}`);
            }
        }
        
        if (results.errors.length > 0) {
            console.log('\n**Errors:**');
            for (const error of results.errors) {
                console.log(`  - ${error}`);
            }
        }
        
        if (results.installed.length === 0 && results.errors.length === 0) {
            console.log('  No skills were installed');
        }
        
        // Sync symlinks for newly installed skills
        if (results.installed.length > 0) {
            console.log('\n**Syncing skill symlinks...**');
            syncPersonalSkillSymlinks();
        }
        
    } catch (error) {
        // Clean up on error
        if (cleanup && sourcePath) {
            try {
                const tmpDir = sourcePath.split('/.agents/tmp/')[0] + '/.agents/tmp/' + 
                               sourcePath.split('/.agents/tmp/')[1].split('/')[0];
                removeDirIfExists(tmpDir);
            } catch {}
        }
        
        console.log(`\nError: ${error.message}`);
    }
};

/**
 * Command: pull <url-or-path>
 * Update or add skills from repository or local path
 */
export const runPull = () => {
    const args = process.argv.slice(3);
    let urlOrPath = args.find(arg => !arg.startsWith('-'));
    const flags = args.filter(arg => arg.startsWith('-'));
    
    if (!urlOrPath) {
        console.log(`Usage: superpowers-agent pull <url-or-path|@alias> [skill-path] [options]

Options:
  --global, -g   Update skills globally in ~/.agents/skills/ (default)
  --project, -p  Update skills in current project's .agents/skills/

Examples:
  superpowers-agent pull https://github.com/example/skills
  superpowers-agent pull https://github.com/example/repo/tree/main/skills
  superpowers-agent pull ~/my-local-skills
  superpowers-agent pull https://github.com/example/skills --project
  superpowers-agent pull ~/my-local-skills --global
  superpowers-agent pull @myrepo
  superpowers-agent pull @myrepo path/to/skill
  superpowers-agent pull @myrepo path/to/skills --project

Description:
  Updates or adds skill(s) from a Git repository, local directory, or repository alias.
  If skills already exist, they will be updated (replaced).
  If skills don't exist, they will be added.
  Supports repositories with single or multiple skills.
  Reads skill.json to determine skill names and installation paths.
  
  Repository aliases can be added using:
    superpowers-agent add-repository <git-url> [--as=@alias]`);
        return;
    }
    
    console.log('Updating skill(s)...\n');
    
    // Check if urlOrPath is a repository alias
    let repoUrl = null;
    let skillPath = null;
    
    if (urlOrPath.startsWith('@')) {
        // It's a repository alias
        const alias = urlOrPath;
        skillPath = args.find((arg, i) => i > 0 && !arg.startsWith('-') && arg !== alias);
        
        // Look for alias in config (project first, then global)
        const projectRepos = getRepositories(false);
        const globalRepos = getRepositories(true);
        
        if (projectRepos[alias]) {
            repoUrl = projectRepos[alias];
            console.log(`Using project repository alias: ${alias}`);
        } else if (globalRepos[alias]) {
            repoUrl = globalRepos[alias];
            console.log(`Using global repository alias: ${alias}`);
        } else {
            console.log(`Error: Repository alias not found: ${alias}`);
            console.log(`\nAvailable aliases:`);
            
            const allRepos = { ...globalRepos, ...projectRepos };
            if (Object.keys(allRepos).length === 0) {
                console.log(`  (none)`);
                console.log(`\nAdd a repository using:`);
                console.log(`  superpowers-agent add-repository <git-url>`);
            } else {
                for (const [name, url] of Object.entries(allRepos)) {
                    console.log(`  ${name} -> ${url}`);
                }
            }
            return;
        }
        
        // Check if repoUrl is a local path or Git URL
        const isLocalPath = existsSync(repoUrl);
        
        if (skillPath) {
            if (isLocalPath) {
                // Local path - just append the skill path
                urlOrPath = join(repoUrl, skillPath);
                console.log(`Repository path: ${repoUrl}`);
                console.log(`Skill path: ${skillPath}\n`);
            } else {
                // Git URL - construct tree URL
                urlOrPath = `${repoUrl}/tree/main/${skillPath}`;
                console.log(`Repository URL: ${repoUrl}`);
                console.log(`Skill path: ${skillPath}\n`);
            }
        } else {
            urlOrPath = repoUrl;
            if (isLocalPath) {
                console.log(`Repository path: ${repoUrl}\n`);
            } else {
                console.log(`Repository URL: ${repoUrl}\n`);
            }
        }
    }
    
    // Parse URL/path
    const parsed = parseGitUrl(urlOrPath);
    if (!parsed) {
        console.log(`Error: Invalid URL or path not found: ${urlOrPath}`);
        return;
    }
    
    // Determine installation location
    const installBase = getInstallLocation(flags);
    console.log(`Install location: ${installBase}\n`);
    
    let sourcePath;
    let cleanup = false;
    
    try {
        // Get source path based on type
        if (parsed.type === 'git-repo' || parsed.type === 'git-tree') {
            console.log(`Cloning repository: ${parsed.repoUrl}`);
            if (parsed.branch) {
                console.log(`Branch: ${parsed.branch}`);
            }
            sourcePath = cloneRepository(parsed.repoUrl, parsed.branch);
            cleanup = true;
            
            if (parsed.path) {
                const safePath = validateSkillPath(parsed.path);
                if (!safePath) {
                    throw new Error(`Invalid repository path: ${parsed.path}`);
                }
                sourcePath = join(sourcePath, safePath);
                if (!existsSync(sourcePath)) {
                    throw new Error(`Path not found in repository: ${parsed.path}`);
                }
            }
            console.log('');
        } else {
            sourcePath = parsed.path;
        }
        
        // Read skill.json from source
        const rootSkillJson = readSkillJsonFromPath(sourcePath);
        if (!rootSkillJson) {
            throw new Error('No skill.json found in source directory');
        }
        
        // Install/update skills
        const results = {
            installed: [],
            errors: [],
            source: parsed.original
        };
        
        if (rootSkillJson.skills && Array.isArray(rootSkillJson.skills)) {
            // Multiple skills
            console.log(`Found ${rootSkillJson.skills.length} skill(s) to update\n`);
            for (const skillName of rootSkillJson.skills) {
                installSingleSkill(sourcePath, skillName, installBase, results);
            }
        } else {
            // Single skill
            const skillName = rootSkillJson.name || parse(sourcePath).base;
            installSingleSkill(dirname(sourcePath), parse(sourcePath).base, installBase, results);
        }
        
        // Check for agents.json and install agents
        const repoRoot = getRepoRoot(sourcePath, parsed);
        const agentsJsonPath = join(repoRoot, 'agents.json');
        if (existsSync(agentsJsonPath)) {
            let agentRepoRoot = repoRoot;
            // For git sources, persist the clone so symlinks remain valid
            if (cleanup) {
                let agentManifest;
                try {
                    agentManifest = JSON.parse(readFileSync(agentsJsonPath, 'utf8'));
                } catch {}
                const alias = agentManifest?.repository || parsed.original;
                const persistedRoot = persistRepoForAgents(repoRoot, alias);
                if (persistedRoot) {
                    agentRepoRoot = persistedRoot;
                }
            }
            installAgents(agentRepoRoot, { isUpdate: true });
        }
        
        // Clean up temporary clone
        if (cleanup && sourcePath) {
            try {
                // Get the tmp directory (parent of the actual source in case of tree URLs)
                const tmpDir = sourcePath.split('/.agents/tmp/')[0] + '/.agents/tmp/' + 
                               sourcePath.split('/.agents/tmp/')[1].split('/')[0];
                removeDirIfExists(tmpDir);
            } catch {}
        }
        
        // Report results
        console.log('\n**Successfully updated skills:**');
        console.log(`- Source: ${results.source}`);
        
        if (results.installed.length > 0) {
            for (const skill of results.installed) {
                console.log(`  - Updated: ${skill.name} at ${skill.path}`);
                console.log(`    ${skill.title}`);
            }
        }
        
        if (results.errors.length > 0) {
            console.log('\n**Errors:**');
            for (const error of results.errors) {
                console.log(`  - ${error}`);
            }
        }
        
        if (results.installed.length === 0 && results.errors.length === 0) {
            console.log('  No skills were updated');
        }
        
        // Sync symlinks for updated skills
        if (results.installed.length > 0) {
            console.log('\n**Syncing skill symlinks...**');
            syncPersonalSkillSymlinks();
        }
        
    } catch (error) {
        // Clean up on error
        if (cleanup && sourcePath) {
            try {
                const tmpDir = sourcePath.split('/.agents/tmp/')[0] + '/.agents/tmp/' + 
                               sourcePath.split('/.agents/tmp/')[1].split('/')[0];
                removeDirIfExists(tmpDir);
            } catch {}
        }
        
        console.log(`\nError: ${error.message}`);
    }
};

/**
 * Command: add-repository <git-url>
 * Add a repository alias for easier skill installation
 */
export const runAddRepository = () => {
    const args = process.argv.slice(3);
    const url = args.find(arg => !arg.startsWith('-'));
    const flags = args.filter(arg => arg.startsWith('-'));
    
    if (!url) {
        console.log(`Usage: superpowers-agent add-repository <git-url> [options]

Options:
  --global, -g        Add repository globally in ~/.agents/config.json (default)
  --project, -p       Add repository in current project's .agents/config.json
  --as=<alias>        Specify custom alias for the repository

Examples:
  superpowers-agent add-repository https://github.com/example/skills.git
  superpowers-agent add-repository https://github.com/example/skills.git --as=@myskills
  superpowers-agent add-repository https://github.com/example/skills.git --project
  superpowers-agent add-repository https://github.com/example/skills.git --as=@custom --global

Description:
  Adds a skill repository alias to your configuration.
  The repository's skill.json will be read to determine the default alias.
  Use --as to specify a custom alias.
  After adding, you can install skills using: superpowers-agent add @alias path/to/skill`);
        return;
    }
    
    console.log('Adding repository...\n');
    
    // Parse flags
    const hasGlobalFlag = flags.some(f => f === '--global' || f === '-g');
    const hasProjectFlag = flags.some(f => f === '--project' || f === '-p');
    const asFlag = flags.find(f => f.startsWith('--as='));
    const customAlias = asFlag ? asFlag.split('=')[1] : null;
    
    // Determine if global or project
    const isGlobal = hasProjectFlag ? false : true; // Default to global unless --project specified
    
    let tmpDir;
    try {
        // Clone repository to temp location
        console.log(`Cloning repository: ${url}`);
        const tmpBase = join(os.homedir(), '.agents', 'tmp');
        ensureDir(tmpBase);
        tmpDir = join(tmpBase, `repo-add-${Date.now()}`);

        execFileSync('git', ['clone', '--depth', '1', url, tmpDir], { 
            stdio: 'pipe',
            timeout: 30000 
        });
        console.log('');
        
        // Read skill.json
        const skillJson = readSkillJsonFromPath(tmpDir);
        if (!skillJson) {
            throw new Error('No skill.json found in repository');
        }
        
        // Determine alias
        let alias;
        if (customAlias) {
            alias = customAlias;
        } else if (skillJson.repository) {
            alias = skillJson.repository;
        } else {
            // Derive from repository name
            const match = url.match(/\/([^/]+?)(?:\.git)?$/);
            if (match) {
                alias = '@' + match[1];
            } else {
                throw new Error('Could not determine repository alias. Use --as=@alias to specify manually.');
            }
        }
        
        // Add to config
        addRepositoryToConfig(alias, url, isGlobal);
        
        // Clean up
        removeDirIfExists(tmpDir);
        
        // Report success
        const location = isGlobal ? 'globally' : 'in project';
        const configPath = isGlobal 
            ? join(os.homedir(), '.agents', 'config.json')
            : join(process.cwd(), '.agents', 'config.json');
        
        console.log(`✓ Repository added ${location}`);
        console.log(`  Alias: ${alias}`);
        console.log(`  URL: ${url}`);
        console.log(`  Config: ${configPath}`);
        console.log(`\nYou can now install skills using:`);
        console.log(`  superpowers-agent add ${alias} <path-to-skill>`);
        
    } catch (error) {
        // Clean up on error
        if (tmpDir) {
            try {
                removeDirIfExists(tmpDir);
            } catch {}
        }
        
        console.log(`\nError: ${error.message}`);
    }
};
