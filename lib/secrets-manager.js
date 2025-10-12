/**
 * Secrets Manager - Manage 1Password vaults and distribute secrets
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class SecretsManager {
  /**
   * Create a 1Password vault for a context
   */
  async createVault(contextName) {
    try {
      const vaultName = `ChittyContext-${contextName}`;
      const { stdout } = await execAsync(`op vault create "${vaultName}"`);
      console.log(`✅ Created 1Password vault: ${vaultName}`);
      return { vaultName, output: stdout.trim() };
    } catch (error) {
      throw new Error(`Failed to create vault: ${error.message}`);
    }
  }

  /**
   * Store a secret in 1Password
   */
  async storeSecret(vaultName, itemName, secretData) {
    try {
      // Build the op item create command
      const fields = Object.entries(secretData)
        .map(([key, value]) => `${key}=${value}`)
        .join(" ");

      const { stdout } = await execAsync(
        `op item create --category=Password --title="${itemName}" --vault="${vaultName}" ${fields}`,
      );

      console.log(`✅ Stored secret: ${itemName} in vault ${vaultName}`);
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to store secret: ${error.message}`);
    }
  }

  /**
   * Distribute secret to Cloudflare Workers
   */
  async distributeToCloudflare(workerName, secretName, secretValue, accountId) {
    try {
      // Use wrangler secret put
      const { stdout } = await execAsync(
        `echo "${secretValue}" | wrangler secret put ${secretName} --name ${workerName}`,
        {
          env: {
            ...process.env,
            CLOUDFLARE_ACCOUNT_ID: accountId,
          },
        },
      );

      console.log(
        `✅ Distributed ${secretName} to Cloudflare Worker: ${workerName}`,
      );
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to distribute to Cloudflare: ${error.message}`);
    }
  }

  /**
   * Distribute secret to GitHub repository
   */
  async distributeToGitHub(repo, secretName, secretValue) {
    try {
      // Use gh secret set
      const { stdout } = await execAsync(
        `echo "${secretValue}" | gh secret set ${secretName} --repo ${repo}`,
      );

      console.log(`✅ Distributed ${secretName} to GitHub repo: ${repo}`);
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to distribute to GitHub: ${error.message}`);
    }
  }

  /**
   * Distribute secret to Neon (via environment variables)
   */
  async distributeToNeon(projectId, secretName, secretValue) {
    try {
      // Neon uses connection strings, typically stored as env vars
      // For now, we'll store in 1Password with neon reference
      const itemName = `neon-${projectId}-${secretName}`;
      await this.storeSecret("ChittyOS", itemName, {
        connection_string: secretValue,
        project_id: projectId,
      });

      console.log(
        `✅ Stored ${secretName} for Neon project: ${projectId} in 1Password`,
      );
      return {
        stored: true,
        reference: `op://ChittyOS/${itemName}/connection_string`,
      };
    } catch (error) {
      throw new Error(`Failed to distribute to Neon: ${error.message}`);
    }
  }

  /**
   * Sync secrets from 1Password to all configured services
   */
  async syncSecretsToServices(contextConfig, vaultName) {
    const results = {
      cloudflare: [],
      github: [],
      neon: [],
      errors: [],
    };

    try {
      // Cloudflare secrets
      if (contextConfig.cloudflare && contextConfig.cloudflareSecrets) {
        for (const secret of contextConfig.cloudflareSecrets) {
          try {
            const value = await this.fetch1PasswordSecret(
              `op://${vaultName}/${secret.item}/${secret.field}`,
            );
            await this.distributeToCloudflare(
              secret.worker,
              secret.name,
              value,
              contextConfig.cloudflareAccountId,
            );
            results.cloudflare.push({ secret: secret.name, status: "success" });
          } catch (error) {
            results.errors.push({
              service: "cloudflare",
              secret: secret.name,
              error: error.message,
            });
          }
        }
      }

      // GitHub secrets
      if (contextConfig.github && contextConfig.githubSecrets) {
        for (const secret of contextConfig.githubSecrets) {
          try {
            const value = await this.fetch1PasswordSecret(
              `op://${vaultName}/${secret.item}/${secret.field}`,
            );
            await this.distributeToGitHub(secret.repo, secret.name, value);
            results.github.push({ secret: secret.name, status: "success" });
          } catch (error) {
            results.errors.push({
              service: "github",
              secret: secret.name,
              error: error.message,
            });
          }
        }
      }

      // Neon secrets
      if (contextConfig.neon && contextConfig.neonSecrets) {
        for (const secret of contextConfig.neonSecrets) {
          try {
            const value = await this.fetch1PasswordSecret(
              `op://${vaultName}/${secret.item}/${secret.field}`,
            );
            await this.distributeToNeon(secret.projectId, secret.name, value);
            results.neon.push({ secret: secret.name, status: "success" });
          } catch (error) {
            results.errors.push({
              service: "neon",
              secret: secret.name,
              error: error.message,
            });
          }
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Secret sync failed: ${error.message}`);
    }
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
   * List all vaults
   */
  async listVaults() {
    try {
      const { stdout } = await execAsync("op vault list --format=json");
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Failed to list vaults: ${error.message}`);
    }
  }

  /**
   * List items in a vault
   */
  async listVaultItems(vaultName) {
    try {
      const { stdout } = await execAsync(
        `op item list --vault="${vaultName}" --format=json`,
      );
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Failed to list vault items: ${error.message}`);
    }
  }

  /**
   * Create service account secrets for a context
   */
  async createServiceAccountSecrets(contextName, services) {
    const vaultName = `ChittyContext-${contextName}`;
    const results = [];

    for (const service of services) {
      try {
        switch (service.type) {
          case "cloudflare":
            await this.storeSecret(vaultName, `${service.name}-cloudflare`, {
              account_id: service.accountId,
              api_token: service.apiToken,
            });
            results.push({ service: service.name, status: "stored" });
            break;

          case "github":
            await this.storeSecret(vaultName, `${service.name}-github`, {
              token: service.token,
              username: service.username,
            });
            results.push({ service: service.name, status: "stored" });
            break;

          case "google":
            await this.storeSecret(vaultName, `${service.name}-google`, {
              credentials: JSON.stringify(service.credentials),
              email: service.email,
            });
            results.push({ service: service.name, status: "stored" });
            break;

          case "neon":
            await this.storeSecret(vaultName, `${service.name}-neon`, {
              connection_string: service.connectionString,
              project_id: service.projectId,
            });
            results.push({ service: service.name, status: "stored" });
            break;

          default:
            results.push({ service: service.name, status: "unsupported_type" });
        }
      } catch (error) {
        results.push({
          service: service.name,
          status: "error",
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Rotate secret and distribute to all services
   */
  async rotateSecret(vaultName, itemName, newValue, distributionConfig) {
    try {
      // Update secret in 1Password
      await execAsync(
        `op item edit "${itemName}" --vault="${vaultName}" password="${newValue}"`,
      );

      console.log(`✅ Rotated secret: ${itemName} in vault ${vaultName}`);

      // Distribute to configured services
      const results = await this.syncSecretsToServices(
        distributionConfig,
        vaultName,
      );

      return { rotated: true, distributed: results };
    } catch (error) {
      throw new Error(`Failed to rotate secret: ${error.message}`);
    }
  }
}
