#!/usr/bin/env node

/**
 * ChittyContext - Universal Account & Persona Manager
 *
 * Manages authentication and context switching across:
 * - Cloudflare (multiple accounts)
 * - GitHub (orgs and personal)
 * - Google Workspace (multiple identities)
 * - Notion (workspaces)
 * - Neon (database projects)
 * - 1Password (vaults)
 * - AI services (OpenAI, Anthropic)
 */

import { Command } from "commander";
import { ContextManager } from "../lib/context-manager.js";
import { displayStatus } from "../lib/display.js";
import chalk from "chalk";

const program = new Command();
const contextManager = new ContextManager();

program
  .name("chittycontext")
  .description("Universal multi-account and persona management for ChittyOS")
  .version("1.0.0")
  .alias("ctx");

// Context management
program
  .command("use <context>")
  .description("Switch to a named context (work, personal, litigation, etc.)")
  .action(async (contextName) => {
    try {
      await contextManager.switchContext(contextName);
      console.log(chalk.green(`✅ Switched to context: ${contextName}`));
      await displayStatus(contextManager);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to switch context: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show current context and account configuration")
  .action(async () => {
    await displayStatus(contextManager);
  });

program
  .command("list")
  .alias("ls")
  .description("List all available contexts")
  .action(async () => {
    const contexts = contextManager.listContexts();
    const current = contextManager.getCurrentContext();

    console.log(chalk.bold("\n📋 Available Contexts:\n"));
    contexts.forEach((ctx) => {
      const marker = ctx === current ? chalk.green("→") : " ";
      console.log(`${marker} ${ctx}`);
    });
    console.log();
  });

// Context creation
program
  .command("create <name>")
  .description("Create a new context")
  .option("-f, --from <context>", "Clone from existing context")
  .action(async (name, options) => {
    try {
      await contextManager.createContext(name, options.from);
      console.log(chalk.green(`✅ Created context: ${name}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create context: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command("delete <name>")
  .description("Delete a context")
  .action(async (name) => {
    try {
      await contextManager.deleteContext(name);
      console.log(chalk.green(`✅ Deleted context: ${name}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to delete context: ${error.message}`));
      process.exit(1);
    }
  });

// Service-specific commands
const cloudflare = program
  .command("cloudflare")
  .alias("cf")
  .description("Manage Cloudflare accounts");

cloudflare
  .command("use <account>")
  .description("Switch Cloudflare account for current context")
  .action(async (account) => {
    try {
      await contextManager.setServiceAccount("cloudflare", account);
      console.log(chalk.green(`✅ Cloudflare account set to: ${account}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed: ${error.message}`));
      process.exit(1);
    }
  });

cloudflare
  .command("add <name>")
  .description("Add a new Cloudflare account")
  .option("-i, --account-id <id>", "Account ID")
  .option("-t, --token <token>", "API token")
  .option("--token-from-1password <item>", "Fetch token from 1Password")
  .action(async (name, options) => {
    try {
      await contextManager.addCloudflareAccount(name, options);
      console.log(chalk.green(`✅ Added Cloudflare account: ${name}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed: ${error.message}`));
      process.exit(1);
    }
  });

cloudflare
  .command("list")
  .description("List configured Cloudflare accounts")
  .action(async () => {
    const accounts = contextManager.getCloudflareAccounts();
    console.log(chalk.bold("\n☁️  Cloudflare Accounts:\n"));
    accounts.forEach((acc) => {
      console.log(`  ${acc.name} (${acc.account_id})`);
    });
    console.log();
  });

// GitHub commands
const github = program
  .command("github")
  .alias("gh")
  .description("Manage GitHub accounts and organizations");

github
  .command("use <account>")
  .description("Switch GitHub account for current context")
  .action(async (account) => {
    try {
      await contextManager.setServiceAccount("github", account);
      console.log(chalk.green(`✅ GitHub account set to: ${account}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed: ${error.message}`));
      process.exit(1);
    }
  });

github
  .command("add <name>")
  .description("Add a new GitHub account")
  .option("-t, --token <token>", "Personal access token")
  .option("--token-from-1password <item>", "Fetch token from 1Password")
  .action(async (name, options) => {
    try {
      await contextManager.addGitHubAccount(name, options);
      console.log(chalk.green(`✅ Added GitHub account: ${name}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed: ${error.message}`));
      process.exit(1);
    }
  });

// Google commands
const google = program
  .command("google")
  .description("Manage Google Workspace identities");

google
  .command("use <email>")
  .description("Switch Google account for current context")
  .action(async (email) => {
    try {
      await contextManager.setServiceAccount("google", email);
      console.log(chalk.green(`✅ Google account set to: ${email}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed: ${error.message}`));
      process.exit(1);
    }
  });

google
  .command("add <email>")
  .description("Add a new Google identity")
  .option("-c, --credentials <path>", "Path to OAuth credentials JSON")
  .action(async (email, options) => {
    try {
      await contextManager.addGoogleIdentity(email, options);
      console.log(chalk.green(`✅ Added Google identity: ${email}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed: ${error.message}`));
      process.exit(1);
    }
  });

// Export environment variables for current context
program
  .command("env")
  .description("Export environment variables for current context")
  .option("-s, --shell <type>", "Shell type (bash, zsh, fish)", "bash")
  .action(async (options) => {
    const envVars = await contextManager.getEnvironmentVariables();

    if (options.shell === "fish") {
      Object.entries(envVars).forEach(([key, value]) => {
        console.log(`set -gx ${key} "${value}"`);
      });
    } else {
      Object.entries(envVars).forEach(([key, value]) => {
        console.log(`export ${key}="${value}"`);
      });
    }
  });

// Initialize/setup
program
  .command("init")
  .description("Initialize ChittyContext configuration")
  .action(async () => {
    try {
      await contextManager.initialize();
      console.log(chalk.green("✅ ChittyContext initialized"));
      console.log(chalk.blue("\n💡 Next steps:"));
      console.log("  1. Create a context: chittycontext create work");
      console.log("  2. Add accounts: chittycontext cf add chittyos");
      console.log("  3. Switch context: chittycontext use work");
    } catch (error) {
      console.error(chalk.red(`❌ Initialization failed: ${error.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
