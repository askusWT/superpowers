import { existsSync, readdirSync, mkdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { paths } from '../core/paths.js';

/**
 * Install GitHub Copilot prompts to VS Code User directory
 */
export const installCopilotPrompts = () => {
    const promptsSourceDir = join(paths.superpowersRepo, '.github', 'prompts');
    const promptsDestDir = join(paths.vscodeUserDir, 'prompts');
    
    if (!existsSync(promptsSourceDir)) {
        console.log('⚠️  No Copilot prompts to install (source directory not found).');
        return;
    }
    
    try {
        if (!existsSync(promptsDestDir)) {
            mkdirSync(promptsDestDir, { recursive: true });
        }
    } catch (error) {
        console.log(`Error creating prompts directory: ${error.message}`);
        return;
    }
    
    let promptFiles;
    try {
        promptFiles = readdirSync(promptsSourceDir)
            .filter(f => f.endsWith('.prompt.md'));
    } catch (error) {
        console.log(`Error reading prompts directory: ${error.message}`);
        return;
    }
    
    if (promptFiles.length === 0) {
        console.log('⚠️  No prompt files found to install.');
        return;
    }
    
    console.log('Installing GitHub Copilot prompts...');
    let installed = 0;
    for (const file of promptFiles) {
        try {
            const source = join(promptsSourceDir, file);
            const dest = join(promptsDestDir, file);
            cpSync(source, dest);
            console.log(`  ✓ Installed ${file}`);
            installed++;
        } catch (error) {
            console.log(`  ✗ Failed to install ${file}: ${error.message}`);
        }
    }
    
    if (installed > 0) {
        console.log(`
✓ Installed ${installed} prompt(s) to ${promptsDestDir}
  Use slash commands in GitHub Copilot:
    /brainstorm - Refine ideas into designs
    /execute-plan - Execute plans in batches
    /setup-skills - Initialize project skills
    /write-plan - Create implementation plans`);
    }
};

/**
 * Install GitHub Copilot universal instructions
 */
export const installCopilotInstructions = () => {
    const instructionsSource = join(paths.superpowersRepo, '.github', 'copilot-instructions.md');
    const instructionsDest = join(paths.home, '.github', 'copilot-instructions.md');
    
    if (!existsSync(instructionsSource)) {
        console.log('⚠️  No Copilot instructions to install (source file not found).');
        return;
    }
    
    const destDir = dirname(instructionsDest);
    try {
        if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true });
        }
    } catch (error) {
        console.log(`Error creating .github directory: ${error.message}`);
        return;
    }
    
    try {
        cpSync(instructionsSource, instructionsDest);
        console.log(`✓ Installed GitHub Copilot universal instructions
  Location: ${instructionsDest}
  GitHub Copilot will now use Superpowers skills universally in all workspaces`);
    } catch (error) {
        console.log(`✗ Failed to install instructions: ${error.message}`);
    }
};
