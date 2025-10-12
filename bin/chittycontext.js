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

// ChittyRegistry integration
const registry = program
  .command("registry")
  .description("Manage ChittyRegistry integration");

registry
  .command("sync")
  .description("Sync with ChittyRegistry")
  .action(async () => {
    try {
      await contextManager.syncWithRegistry();
    } catch (error) {
      console.error(chalk.red(`❌ Registry sync failed: ${error.message}`));
      process.exit(1);
    }
  });

registry
  .command("register")
  .description("Register ChittyContext service with ChittyRegistry")
  .action(async () => {
    try {
      await contextManager.registerWithRegistry();
    } catch (error) {
      console.error(chalk.red(`❌ Registration failed: ${error.message}`));
      process.exit(1);
    }
  });

registry
  .command("discover")
  .description("Discover available services in ChittyRegistry")
  .action(async () => {
    try {
      const servicesData = await contextManager.discoverServices();

      // Handle different response formats
      let services = [];
      if (Array.isArray(servicesData)) {
        services = servicesData;
      } else if (
        servicesData.services &&
        Array.isArray(servicesData.services)
      ) {
        services = servicesData.services;
      } else if (typeof servicesData === "object") {
        // Convert object entries to array
        services = Object.entries(servicesData).map(([name, config]) => ({
          name: name,
          ...config,
        }));
      }

      console.log(chalk.bold("\n🔍 Available Services:\n"));
      if (services.length === 0) {
        console.log(chalk.dim("  No services found"));
      } else {
        services.forEach((service) => {
          const serviceName = service.name || service.service_name || "unknown";
          const version = service.version || "unknown";
          console.log(`  ${chalk.green(serviceName)} (${version})`);
          if (service.description) {
            console.log(chalk.dim(`     ${service.description}`));
          }
        });
      }
      console.log();
    } catch (error) {
      console.error(chalk.red(`❌ Service discovery failed: ${error.message}`));
      process.exit(1);
    }
  });

registry
  .command("pull <service>")
  .description("Pull service configuration from registry (e.g., chittyauth)")
  .action(async (service) => {
    try {
      const config = await contextManager.pullServiceConfig(service);
      console.log(chalk.dim(`\n📦 Service Configuration:`));
      console.log(
        chalk.dim(`   URL: ${config.url || config.health_endpoint || "N/A"}`),
      );
      console.log(chalk.dim(`   Version: ${config.version || "unknown"}`));
      if (config.capabilities) {
        console.log(
          chalk.dim(`   Capabilities: ${config.capabilities.join(", ")}`),
        );
      }
      console.log();
    } catch (error) {
      console.error(chalk.red(`❌ Failed to pull service: ${error.message}`));
      process.exit(1);
    }
  });

// Service-aware environment export
program
  .command("env-services")
  .description("Export environment variables including service configurations")
  .option("-s, --shell <type>", "Shell type (bash, zsh, fish)", "bash")
  .action(async (options) => {
    try {
      const envVars =
        await contextManager.getEnvironmentVariablesWithServices();

      if (options.shell === "fish") {
        Object.entries(envVars).forEach(([key, value]) => {
          console.log(`set -gx ${key} "${value}"`);
        });
      } else {
        Object.entries(envVars).forEach(([key, value]) => {
          console.log(`export ${key}="${value}"`);
        });
      }
    } catch (error) {
      console.error(chalk.red(`❌ Failed to export env: ${error.message}`));
      process.exit(1);
    }
  });

// Vault and secrets management
const vault = program
  .command("vault")
  .description("Manage 1Password vaults and secrets");

vault
  .command("create <context>")
  .description("Create a 1Password vault for a context")
  .action(async (context) => {
    try {
      const result = await contextManager.createContextVault(context);
      console.log(chalk.green(`✅ Created vault: ${result.vaultName}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create vault: ${error.message}`));
      process.exit(1);
    }
  });

vault
  .command("list")
  .description("List all 1Password vaults")
  .action(async () => {
    try {
      const vaults = await contextManager.listVaults();
      console.log(chalk.bold("\n🔐 1Password Vaults:\n"));
      vaults.forEach((vault) => {
        console.log(`  ${chalk.green(vault.name || vault.id)}`);
        if (vault.description) {
          console.log(chalk.dim(`     ${vault.description}`));
        }
      });
      console.log();
    } catch (error) {
      console.error(chalk.red(`❌ Failed to list vaults: ${error.message}`));
      process.exit(1);
    }
  });

vault
  .command("store <vault> <item>")
  .description("Store a secret in 1Password")
  .option("--cloudflare-account-id <id>", "Cloudflare account ID")
  .option("--cloudflare-token <token>", "Cloudflare API token")
  .option("--github-token <token>", "GitHub token")
  .option("--neon-connection <string>", "Neon connection string")
  .action(async (vaultName, itemName, options) => {
    try {
      const secretData = {};
      if (options.cloudflareAccountId)
        secretData.account_id = options.cloudflareAccountId;
      if (options.cloudflareToken) secretData.token = options.cloudflareToken;
      if (options.githubToken) secretData.token = options.githubToken;
      if (options.neonConnection)
        secretData.connection_string = options.neonConnection;

      await contextManager.storeSecret(vaultName, itemName, secretData);
      console.log(
        chalk.green(`✅ Stored secret: ${itemName} in vault ${vaultName}`),
      );
    } catch (error) {
      console.error(chalk.red(`❌ Failed to store secret: ${error.message}`));
      process.exit(1);
    }
  });

// Secrets distribution
const secrets = program
  .command("secrets")
  .description("Manage secret distribution to services");

secrets
  .command("sync <context>")
  .description("Sync secrets from 1Password to all configured services")
  .action(async (context) => {
    try {
      console.log(chalk.blue(`🔄 Syncing secrets for context: ${context}`));
      const results = await contextManager.distributeSecrets(context);

      console.log(chalk.bold("\n📊 Distribution Results:\n"));

      if (results.cloudflare.length > 0) {
        console.log(
          chalk.green(
            `☁️  Cloudflare: ${results.cloudflare.length} secrets distributed`,
          ),
        );
      }
      if (results.github.length > 0) {
        console.log(
          chalk.green(
            `🐙 GitHub: ${results.github.length} secrets distributed`,
          ),
        );
      }
      if (results.neon.length > 0) {
        console.log(
          chalk.green(`🗄️  Neon: ${results.neon.length} secrets distributed`),
        );
      }
      if (results.errors.length > 0) {
        console.log(chalk.red(`\n❌ Errors: ${results.errors.length}`));
        results.errors.forEach((err) => {
          console.log(
            chalk.dim(`   ${err.service}/${err.secret}: ${err.error}`),
          );
        });
      }
      console.log();
    } catch (error) {
      console.error(chalk.red(`❌ Failed to sync secrets: ${error.message}`));
      process.exit(1);
    }
  });

secrets
  .command("configure <context> <service>")
  .description("Configure secret distribution for a service")
  .option("--worker <name>", "Cloudflare Worker name")
  .option("--repo <name>", "GitHub repository (owner/repo)")
  .option("--project <id>", "Neon project ID")
  .option("--secret-name <name>", "Secret name")
  .option("--vault-item <item>", "1Password vault item name")
  .option("--vault-field <field>", "1Password vault item field")
  .action(async (context, service, options) => {
    try {
      const secretConfig = {
        name: options.secretName,
        item: options.vaultItem,
        field: options.vaultField || "password",
      };

      if (service === "cloudflare") {
        secretConfig.worker = options.worker;
      } else if (service === "github") {
        secretConfig.repo = options.repo;
      } else if (service === "neon") {
        secretConfig.projectId = options.project;
      }

      await contextManager.configureSecretDistribution(
        context,
        service,
        secretConfig,
      );
      console.log(
        chalk.green(
          `✅ Configured secret distribution for ${service} in ${context}`,
        ),
      );
    } catch (error) {
      console.error(chalk.red(`❌ Failed to configure: ${error.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
