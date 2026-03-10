import { existsSync, readdirSync, lstatSync, symlinkSync, unlinkSync, mkdirSync, readlinkSync, cpSync } from 'fs';
import { join } from 'path';
import { platform } from 'os';
import { paths } from '../core/paths.js';

/**
 * Install OpenCode commands
 */
export const installOpencodeCommands = () => {
    const commandsSourceDir = join(paths.superpowersRepo, '.opencode', 'command');
    const commandsDestDir = join(paths.home, '.config', 'opencode', 'command');

    if (!existsSync(commandsSourceDir)) {
        console.log('⚠️  No opencode commands to install (source directory not found).');
        return;
    }

    try {
        if (!existsSync(commandsDestDir)) {
            mkdirSync(commandsDestDir, { recursive: true });
        }
    } catch (error) {
        console.log(`Error creating opencode commands directory: ${error.message}`);
        return;
    }

    let commandFiles;
    try {
        commandFiles = readdirSync(commandsSourceDir)
            .filter(f => f.endsWith('.md'));
    } catch (error) {
        console.log(`Error reading opencode commands directory: ${error.message}`);
        return;
    }

    if (commandFiles.length === 0) {
        console.log('⚠️  No command files found to install.');
        return;
    }

    console.log('Installing opencode commands...');
    let installed = 0;
    for (const file of commandFiles) {
        try {
            const source = join(commandsSourceDir, file);
            const dest = join(commandsDestDir, file);
            cpSync(source, dest);
            console.log(`  ✓ Installed ${file}`);
            installed++;
        } catch (error) {
            console.log(`  ✗ Failed to install ${file}: ${error.message}`);
        }
    }

    if (installed > 0) {
        console.log(`
✓ Installed ${installed} command(s) to ${commandsDestDir}
  Use slash commands in opencode:
    /brainstorm - Refine ideas into designs
    /execute-plan - Execute plans in batches
    /write-plan - Create implementation plans
    /write-skill - Create new skills with TDD
    /skills - Discover available skills
    /use-skill - Load and apply a specific skill`);
    }
};

const isSymlink = (path) => {
    try {
        return lstatSync(path).isSymbolicLink();
    } catch {
        return false;
    }
};

const symlinkPointsTo = (linkPath, expectedSource) => {
    try {
        if (!isSymlink(linkPath)) return false;
        const currentTarget = readlinkSync(linkPath);
        return currentTarget === expectedSource;
    } catch {
        return false;
    }
};

export const installOpencodePluginSymlink = () => {
    const sourcePlugin = join(paths.superpowersRepo, '.opencode', 'plugins', 'superpowers-agent.js');
    const destPluginsDir = join(paths.home, '.config', 'opencode', 'plugins');
    const destPlugin = join(destPluginsDir, 'superpowers-agent.js');

    console.log('Installing OpenCode plugin symlink...');

    if (!existsSync(sourcePlugin)) {
        console.log('⚠️  Source plugin not found, skipping symlink creation');
        console.log(`   Expected at: ${sourcePlugin}`);
        return { created: false, error: 'Source plugin not found' };
    }

    if (symlinkPointsTo(destPlugin, sourcePlugin)) {
        console.log('✓ Plugin symlink already exists and is correct');
        return { created: false, existed: true };
    }

    if (existsSync(destPlugin) && !isSymlink(destPlugin)) {
        console.log('⚠️  Warning: A file already exists at the destination path');
        console.log(`   Path: ${destPlugin}`);
        console.log('   Skipping symlink creation to avoid overwriting existing file');
        console.log('   To use superpowers-agent plugin, manually remove or rename the existing file');
        return { created: false, error: 'File already exists at destination' };
    }

    if (!existsSync(destPluginsDir)) {
        try {
            mkdirSync(destPluginsDir, { recursive: true });
            console.log(`✓ Created ${destPluginsDir.replace(paths.home, '~')}`);
        } catch (error) {
            console.log(`⚠️  Failed to create plugins directory: ${error.message}`);
            return { created: false, error: `Failed to create directory: ${error.message}` };
        }
    }

    if (isSymlink(destPlugin)) {
        try {
            unlinkSync(destPlugin);
        } catch (error) {
            console.log(`⚠️  Failed to remove existing symlink: ${error.message}`);
            return { created: false, error: `Failed to remove existing symlink: ${error.message}` };
        }
    }

    const plat = platform();
    try {
        if (plat === 'win32') {
            symlinkSync(sourcePlugin, destPlugin, 'file');
        } else {
            symlinkSync(sourcePlugin, destPlugin);
        }
        const shortSource = sourcePlugin.replace(paths.home, '~');
        const shortDest = destPlugin.replace(paths.home, '~');
        console.log(`✓ Created symlink: ${shortDest}`);
        console.log(`  -> ${shortSource}`);
        return { created: true };
    } catch (error) {
        if (plat === 'win32' && error.code === 'EPERM') {
            console.log('⚠️  Windows requires Developer Mode or admin privileges for symlinks');
            console.log('   Enable Developer Mode: Settings > Update & Security > For developers');
            return { created: false, error: 'Windows symlink permission denied' };
        }
        console.log(`⚠️  Failed to create symlink: ${error.message}`);
        return { created: false, error: `Failed to create symlink: ${error.message}` };
    }
};
