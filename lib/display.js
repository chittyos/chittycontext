/**
 * Display utilities for ChittyContext CLI
 */

import chalk from "chalk";

export async function displayStatus(contextManager) {
  const current = contextManager.getCurrentContext();
  const config = contextManager.getConfig();
  const context = config.contexts[current];

  console.log(chalk.bold.cyan("\n📊 Current Context Status\n"));
  console.log(chalk.bold(`Context: ${chalk.green(current)}\n`));

  // Display service configurations
  const services = [
    { name: "Cloudflare", key: "cloudflare", icon: "☁️" },
    { name: "GitHub", key: "github", icon: "🐙" },
    { name: "Google", key: "google", icon: "📧" },
    { name: "Notion", key: "notion", icon: "📝" },
    { name: "Neon", key: "neon", icon: "🗄️" },
  ];

  services.forEach((service) => {
    const accountName = context[service.key];

    if (accountName) {
      const accountDetails = config.accounts[service.key]?.[accountName];

      if (accountDetails) {
        console.log(
          `${service.icon}  ${chalk.bold(service.name)}: ${chalk.green(accountName)}`,
        );

        // Show account details
        if (service.key === "cloudflare" && accountDetails.account_id) {
          console.log(chalk.dim(`   Account ID: ${accountDetails.account_id}`));
        }
        if (service.key === "github" && accountDetails.token) {
          console.log(
            chalk.dim(`   Token: ${accountDetails.token.substring(0, 8)}...`),
          );
        }
        if (service.key === "google" && accountDetails.email) {
          console.log(chalk.dim(`   Email: ${accountDetails.email}`));
        }
      } else {
        console.log(
          `${service.icon}  ${chalk.bold(service.name)}: ${chalk.yellow(accountName)} ${chalk.red("(not configured)")}`,
        );
      }
    } else {
      console.log(
        `${service.icon}  ${chalk.bold(service.name)}: ${chalk.dim("not set")}`,
      );
    }
  });

  console.log();
}

export function displayContextList(contexts, current) {
  console.log(chalk.bold("\n📋 Available Contexts:\n"));

  contexts.forEach((ctx) => {
    const marker = ctx === current ? chalk.green("→") : " ";
    const name = ctx === current ? chalk.green.bold(ctx) : ctx;
    console.log(`${marker} ${name}`);
  });

  console.log();
}

export function displayAccountList(service, accounts, currentContext) {
  const serviceNames = {
    cloudflare: "☁️  Cloudflare",
    github: "🐙 GitHub",
    google: "📧 Google",
    notion: "📝 Notion",
    neon: "🗄️  Neon",
  };

  console.log(chalk.bold(`\n${serviceNames[service]} Accounts:\n`));

  if (accounts.length === 0) {
    console.log(chalk.dim("  No accounts configured"));
    console.log();
    return;
  }

  accounts.forEach((acc) => {
    const marker = acc.name === currentContext ? chalk.green("→") : " ";
    const name =
      acc.name === currentContext ? chalk.green.bold(acc.name) : acc.name;

    console.log(`${marker} ${name}`);

    // Show relevant details
    if (service === "cloudflare" && acc.account_id) {
      console.log(chalk.dim(`   ${acc.account_id}`));
    }
    if (service === "google" && acc.email) {
      console.log(chalk.dim(`   ${acc.email}`));
    }
  });

  console.log();
}
