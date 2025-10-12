/**
 * Context Manager - Core logic for managing contexts and accounts
 */

import Conf from "conf";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";
import { config } from "dotenv";
import { SecretsManager } from "./secrets-manager.js";

const execAsync = promisify(exec);

// Load environment variables
config();

export class ContextManager {
  constructor() {
    this.secretsManager = new SecretsManager();
    this.config = new Conf({
      projectName: "chittycontext",
      cwd: join(homedir(), ".config"),
      schema: {
        current: {
          type: "string",
          default: "default",
        },
        contexts: {
          type: "object",
          default: {
            default: {
              cloudflare: null,
              github: null,
              google: null,
              notion: null,
              neon: null,
              onepassword: null,
              openai: null,
              anthropic: null,
            },
          },
        },
        accounts: {
          type: "object",
          default: {
            cloudflare: {},
            github: {},
            google: {},
            notion: {},
            neon: {},
          },
        },
      },
    });
  }

  /**
   * Initialize ChittyContext configuration
   */
  async initialize() {
    // Ensure default context exists
    if (!this.config.has("contexts.default")) {
      this.config.set("contexts.default", {
        cloudflare: null,
        github: null,
        google: null,
        notion: null,
        neon: null,
      });
    }

    // Set current context if not set
    if (!this.config.has("current")) {
      this.config.set("current", "default");
    }

    // Register with ChittyRegistry
    await this.registerWithRegistry();

    return true;
  }

  /**
   * Register ChittyContext service with ChittyRegistry
   */
  async registerWithRegistry() {
    const registryUrl =
      process.env.REGISTRY_SERVICE || "https://registry.chitty.cc";
    const chittyIdToken = process.env.CHITTY_ID_TOKEN;

    if (!chittyIdToken) {
      console.warn(
        "⚠️  CHITTY_ID_TOKEN not set, skipping registry registration",
      );
      return false;
    }

    try {
      const serviceData = {
        name: "chittycontext",
        version: "1.0.0",
        type: "cli-tool",
        description:
          "Universal multi-account and persona management for ChittyOS",
        health_endpoint: null, // CLI tool, no HTTP endpoint
        capabilities: [
          "context-switching",
          "account-management",
          "cloudflare",
          "github",
          "google",
          "notion",
          "neon",
          "1password-integration",
        ],
        metadata: {
          config_location: join(
            homedir(),
            ".config",
            "chittycontext",
            "config.json",
          ),
          supported_shells: ["bash", "zsh", "fish"],
          global_commands: ["chittycontext", "ctx"],
        },
      };

      const response = await fetch(`${registryUrl}/api/services/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${chittyIdToken}`,
        },
        body: JSON.stringify(serviceData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(
          `✅ Registered with ChittyRegistry: ${result.service_id || "success"}`,
        );
        return true;
      } else {
        console.warn(
          `⚠️  Registry registration failed: ${response.status} ${response.statusText}`,
        );
        return false;
      }
    } catch (error) {
      console.warn(`⚠️  Could not connect to ChittyRegistry: ${error.message}`);
      return false;
    }
  }

  /**
   * Sync configuration with ChittyRegistry
   */
  async syncWithRegistry() {
    const registryUrl =
      process.env.REGISTRY_SERVICE || "https://registry.chitty.cc";
    const chittyIdToken = process.env.CHITTY_ID_TOKEN;

    if (!chittyIdToken) {
      throw new Error("CHITTY_ID_TOKEN not set in environment");
    }

    try {
      const response = await fetch(
        `${registryUrl}/api/services/chittycontext`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${chittyIdToken}`,
          },
        },
      );

      if (response.ok) {
        const serviceInfo = await response.json();
        console.log("✅ ChittyContext is registered in ChittyRegistry");
        console.log(`   Version: ${serviceInfo.version}`);
        console.log(`   Status: ${serviceInfo.status || "active"}`);
        return serviceInfo;
      } else {
        console.warn("⚠️  Service not found in registry, registering now...");
        await this.registerWithRegistry();
        return null;
      }
    } catch (error) {
      throw new Error(`Failed to sync with registry: ${error.message}`);
    }
  }

  /**
   * Discover and pull service configurations from ChittyRegistry
   */
  async discoverServices() {
    const registryUrl =
      process.env.REGISTRY_SERVICE || "https://registry.chitty.cc";
    const chittyIdToken = process.env.CHITTY_ID_TOKEN;

    if (!chittyIdToken) {
      throw new Error("CHITTY_ID_TOKEN not set in environment");
    }

    try {
      const response = await fetch(`${registryUrl}/api/services`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${chittyIdToken}`,
        },
      });

      if (response.ok) {
        const services = await response.json();
        return services;
      } else {
        throw new Error(`Failed to discover services: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Service discovery failed: ${error.message}`);
    }
  }

  /**
   * Pull service configuration and add to context
   */
  async pullServiceConfig(serviceName) {
    const registryUrl =
      process.env.REGISTRY_SERVICE || "https://registry.chitty.cc";
    const chittyIdToken = process.env.CHITTY_ID_TOKEN;

    if (!chittyIdToken) {
      throw new Error("CHITTY_ID_TOKEN not set in environment");
    }

    try {
      const response = await fetch(
        `${registryUrl}/api/services/${serviceName}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${chittyIdToken}`,
          },
        },
      );

      if (response.ok) {
        const serviceConfig = await response.json();
        console.log(`✅ Retrieved configuration for ${serviceName}`);

        // Store service config in accounts
        if (!this.config.has(`accounts.services`)) {
          this.config.set("accounts.services", {});
        }

        this.config.set(`accounts.services.${serviceName}`, {
          url: serviceConfig.url || serviceConfig.health_endpoint,
          api_endpoint: serviceConfig.api_endpoint,
          version: serviceConfig.version,
          capabilities: serviceConfig.capabilities,
          metadata: serviceConfig.metadata,
          retrieved_at: new Date().toISOString(),
        });

        return serviceConfig;
      } else {
        throw new Error(
          `Service ${serviceName} not found in registry: ${response.status}`,
        );
      }
    } catch (error) {
      throw new Error(`Failed to pull service config: ${error.message}`);
    }
  }

  /**
   * Get environment variables including service configurations
   */
  async getEnvironmentVariablesWithServices() {
    const envVars = await this.getEnvironmentVariables();

    // Add service endpoints
    const services = this.config.get("accounts.services") || {};

    for (const [serviceName, config] of Object.entries(services)) {
      const serviceNameUpper = serviceName.toUpperCase().replace(/-/g, "_");

      if (config.url) {
        envVars[`${serviceNameUpper}_URL`] = config.url;
      }
      if (config.api_endpoint) {
        envVars[`${serviceNameUpper}_API_ENDPOINT`] = config.api_endpoint;
      }
    }

    return envVars;
  }

  /**
   * Switch to a different context
   */
  async switchContext(contextName) {
    const contexts = this.config.get("contexts");

    if (!contexts[contextName]) {
      throw new Error(`Context '${contextName}' does not exist`);
    }

    this.config.set("current", contextName);

    // Apply environment variables for the new context
    await this.applyContext(contextName);

    return true;
  }

  /**
   * Apply context by setting environment variables
   */
  async applyContext(contextName) {
    const context = this.config.get(`contexts.${contextName}`);
    const accounts = this.config.get("accounts");

    // Build environment variables
    const envVars = {};

    // Cloudflare
    if (context.cloudflare && accounts.cloudflare[context.cloudflare]) {
      const cfAccount = accounts.cloudflare[context.cloudflare];
      envVars.CLOUDFLARE_ACCOUNT_ID = cfAccount.account_id;
      envVars.CLOUDFLARE_API_TOKEN = cfAccount.token;
    }

    // GitHub
    if (context.github && accounts.github[context.github]) {
      const ghAccount = accounts.github[context.github];
      envVars.GITHUB_TOKEN = ghAccount.token;
    }

    // Google
    if (context.google && accounts.google[context.google]) {
      const googleAccount = accounts.google[context.google];
      envVars.GOOGLE_APPLICATION_CREDENTIALS = googleAccount.credentials_path;
    }

    // Neon
    if (context.neon && accounts.neon[context.neon]) {
      const neonAccount = accounts.neon[context.neon];
      envVars.DATABASE_URL = neonAccount.connection_string;
      envVars.NEON_DATABASE_URL = neonAccount.connection_string;
    }

    return envVars;
  }

  /**
   * Get current context name
   */
  getCurrentContext() {
    return this.config.get("current");
  }

  /**
   * List all contexts
   */
  listContexts() {
    const contexts = this.config.get("contexts");
    return Object.keys(contexts);
  }

  /**
   * Create a new context
   */
  async createContext(name, cloneFrom = null) {
    const contexts = this.config.get("contexts");

    if (contexts[name]) {
      throw new Error(`Context '${name}' already exists`);
    }

    let newContext;
    if (cloneFrom && contexts[cloneFrom]) {
      // Clone from existing context
      newContext = { ...contexts[cloneFrom] };
    } else {
      // Create empty context
      newContext = {
        cloudflare: null,
        github: null,
        google: null,
        notion: null,
        neon: null,
      };
    }

    this.config.set(`contexts.${name}`, newContext);
    return true;
  }

  /**
   * Delete a context
   */
  async deleteContext(name) {
    if (name === "default") {
      throw new Error("Cannot delete default context");
    }

    const current = this.getCurrentContext();
    if (current === name) {
      throw new Error(
        "Cannot delete currently active context. Switch to another context first.",
      );
    }

    this.config.delete(`contexts.${name}`);
    return true;
  }

  /**
   * Set service account for current context
   */
  async setServiceAccount(service, accountName) {
    const current = this.getCurrentContext();
    const accounts = this.config.get("accounts");

    if (!accounts[service] || !accounts[service][accountName]) {
      throw new Error(
        `Account '${accountName}' not found for service '${service}'`,
      );
    }

    this.config.set(`contexts.${current}.${service}`, accountName);
    return true;
  }

  /**
   * Add Cloudflare account
   */
  async addCloudflareAccount(name, options) {
    let token = options.token;

    // Fetch from 1Password if specified
    if (options.tokenFrom1password) {
      token = await this.fetch1PasswordSecret(options.tokenFrom1password);
    }

    if (!token) {
      throw new Error("Token required (use --token or --token-from-1password)");
    }

    if (!options.accountId) {
      throw new Error("Account ID required (use --account-id)");
    }

    this.config.set(`accounts.cloudflare.${name}`, {
      account_id: options.accountId,
      token: token,
      token_source: options.tokenFrom1password
        ? `1password:${options.tokenFrom1password}`
        : "direct",
    });

    return true;
  }

  /**
   * Get all Cloudflare accounts
   */
  getCloudflareAccounts() {
    const accounts = this.config.get("accounts.cloudflare") || {};
    return Object.entries(accounts).map(([name, config]) => ({
      name,
      ...config,
    }));
  }

  /**
   * Add GitHub account
   */
  async addGitHubAccount(name, options) {
    let token = options.token;

    if (options.tokenFrom1password) {
      token = await this.fetch1PasswordSecret(options.tokenFrom1password);
    }

    if (!token) {
      throw new Error("Token required (use --token or --token-from-1password)");
    }

    this.config.set(`accounts.github.${name}`, {
      token: token,
      token_source: options.tokenFrom1password
        ? `1password:${options.tokenFrom1password}`
        : "direct",
    });

    return true;
  }

  /**
   * Add Google identity
   */
  async addGoogleIdentity(email, options) {
    if (!options.credentials) {
      throw new Error("Credentials path required (use --credentials)");
    }

    this.config.set(`accounts.google.${email}`, {
      email: email,
      credentials_path: options.credentials,
    });

    return true;
  }

  /**
   * Fetch secret from 1Password
   */
  async fetch1PasswordSecret(itemReference) {
    try {
      const { stdout } = await execAsync(`op read "${itemReference}"`);
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to fetch from 1Password: ${error.message}`);
    }
  }

  /**
   * Get environment variables for current context
   */
  async getEnvironmentVariables() {
    const current = this.getCurrentContext();
    return await this.applyContext(current);
  }

  /**
   * Get full configuration
   */
  getConfig() {
    return {
      current: this.getCurrentContext(),
      contexts: this.config.get("contexts"),
      accounts: this.config.get("accounts"),
    };
  }

  /**
   * Create 1Password vault for context
   */
  async createContextVault(contextName) {
    return await this.secretsManager.createVault(contextName);
  }

  /**
   * Store secret in 1Password
   */
  async storeSecret(vaultName, itemName, secretData) {
    return await this.secretsManager.storeSecret(
      vaultName,
      itemName,
      secretData,
    );
  }

  /**
   * Distribute secrets to services
   */
  async distributeSecrets(contextName) {
    const context = this.config.get(`contexts.${contextName}`);
    const vaultName = `ChittyContext-${contextName}`;

    const distributionConfig = {
      cloudflareAccountId: this.config.get(
        `accounts.cloudflare.${context.cloudflare}`,
      )?.account_id,
      cloudflareSecrets:
        this.config.get(`secrets.${contextName}.cloudflare`) || [],
      githubSecrets: this.config.get(`secrets.${contextName}.github`) || [],
      neonSecrets: this.config.get(`secrets.${contextName}.neon`) || [],
    };

    return await this.secretsManager.syncSecretsToServices(
      distributionConfig,
      vaultName,
    );
  }

  /**
   * List 1Password vaults
   */
  async listVaults() {
    return await this.secretsManager.listVaults();
  }

  /**
   * Configure secret distribution for a service
   */
  async configureSecretDistribution(contextName, service, secretConfig) {
    const secretsPath = `secrets.${contextName}.${service}`;
    const existingSecrets = this.config.get(secretsPath) || [];
    existingSecrets.push(secretConfig);
    this.config.set(secretsPath, existingSecrets);
    return true;
  }

  /**
   * Create Cloudflare Queues for current context
   */
  async createQueues(contextName) {
    const context = this.config.get(`contexts.${contextName}`);
    const cloudflareAccount = this.config.get(
      `accounts.cloudflare.${context.cloudflare}`,
    );

    if (!cloudflareAccount) {
      throw new Error(
        `No Cloudflare account configured for context '${contextName}'`,
      );
    }

    const accountId = cloudflareAccount.account_id;
    const queueNames = [
      "chittycontext-secret-distribution",
      "chittycontext-registry-sync",
      "chittycontext-vault-ops",
      "chittycontext-context-ops",
    ];

    const results = [];

    for (const queueName of queueNames) {
      try {
        const fullQueueName = `${queueName}-${contextName}`;
        const { stdout } = await execAsync(
          `CLOUDFLARE_ACCOUNT_ID=${accountId} wrangler queues create ${fullQueueName}`,
        );

        // Store queue config
        this.config.set(`queues.${contextName}.${queueName}`, {
          name: fullQueueName,
          accountId: accountId,
          createdAt: new Date().toISOString(),
        });

        results.push({ queue: fullQueueName, status: "created" });
      } catch (error) {
        results.push({
          queue: queueName,
          status: "error",
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * List queues for current context
   */
  async listQueues(contextName) {
    const context = this.config.get(`contexts.${contextName}`);
    const cloudflareAccount = this.config.get(
      `accounts.cloudflare.${context.cloudflare}`,
    );

    if (!cloudflareAccount) {
      throw new Error(
        `No Cloudflare account configured for context '${contextName}'`,
      );
    }

    const accountId = cloudflareAccount.account_id;

    try {
      const { stdout } = await execAsync(
        `CLOUDFLARE_ACCOUNT_ID=${accountId} wrangler queues list`,
      );

      // Parse the table output from wrangler
      // Return stored queue config instead
      const queues = this.config.get(`queues.${contextName}`, {});
      return Object.entries(queues).map(([key, value]) => ({
        name: value.name,
        accountId: value.accountId,
        createdAt: value.createdAt,
      }));
    } catch (error) {
      throw new Error(`Failed to list queues: ${error.message}`);
    }
  }

  /**
   * Delete queue for context
   */
  async deleteQueue(contextName, queueName) {
    const context = this.config.get(`contexts.${contextName}`);
    const cloudflareAccount = this.config.get(
      `accounts.cloudflare.${context.cloudflare}`,
    );

    if (!cloudflareAccount) {
      throw new Error(
        `No Cloudflare account configured for context '${contextName}'`,
      );
    }

    const accountId = cloudflareAccount.account_id;
    const fullQueueName = `${queueName}-${contextName}`;

    try {
      await execAsync(
        `CLOUDFLARE_ACCOUNT_ID=${accountId} wrangler queues delete ${fullQueueName}`,
      );

      // Remove from config
      this.config.delete(`queues.${contextName}.${queueName}`);

      return { queue: fullQueueName, status: "deleted" };
    } catch (error) {
      throw new Error(`Failed to delete queue: ${error.message}`);
    }
  }

  /**
   * Get queue configuration for context
   */
  getQueueConfig(contextName) {
    return this.config.get(`queues.${contextName}`) || {};
  }
}
