const { execSync } = require("child_process");
const {
  readFileSync,
  writeFileSync,
  unlinkSync,
  renameSync,
  existsSync,
} = require("fs");
const { getEnv } = require("./utils");

const configGenerationCommand =
  "docker run ghcr.io/element-hq/matrix-authentication-service config generate > ./configurations/synapse-mas/template.config.yaml";

if (existsSync("./configurations/synapse-mas/template.config.yaml.bak")) {
  unlinkSync("./configurations/synapse-mas/template.config.yaml.bak");
}

if (existsSync("./configurations/synapse-mas/template.config.yaml")) {
  renameSync(
    "./configurations/synapse-mas/template.config.yaml",
    "./configurations/synapse-mas/template.config.yaml.bak"
  );
}
execSync(configGenerationCommand);

let configContents = readFileSync(
  "./configurations/synapse-mas/template.config.yaml",
  "utf8"
);

configContents += `
${readFileSync("./configurations/synapse-mas/clients.appendix.yaml", "utf8")}
${readFileSync("./configurations/synapse-mas/keycloak.appendix.yaml", "utf8")}`;

const SYNAPSE_HOST = getEnv("SYNAPSE_FQDN")
  .replace("http://", "https://")
  .replace("https://", "");

const replacements = [
  {
    search: "uri: postgresql://",
    replace: `uri: postgresql://${encodeURIComponent(
      getEnv("POSTGRES_SYNAPSE_MAS_USER")
    )}:${encodeURIComponent(
      getEnv("POSTGRES_SYNAPSE_MAS_PASSWORD")
    )}@postgres-synapse-mas:5432/${encodeURIComponent(
      getEnv("POSTGRES_SYNAPSE_MAS_DB")
    )}`,
  },
  {
    search: `from: '"Authentication Service" <root@localhost>'`,
    replace: `from: '"${getEnv("SYNAPSE_FRIENDLY_SERVER_NAME")}" <${getEnv(
      "SMTP_NOTIFY_FROM"
    )}>'`,
  },
  {
    search: `reply_to: '"Authentication Service" <root@localhost>'`,
    replace: `reply_to: '"${getEnv("SYNAPSE_FRIENDLY_SERVER_NAME")}" <${getEnv(
      "ADMIN_EMAIL"
    )}>'`,
  },
  {
    search: "homeserver: localhost:8008",
    replace: `homeserver: ${getEnv("SYNAPSE_SERVER_NAME")}`,
  },
  {
    search: "endpoint: http://localhost:8008/",
    replace: `endpoint: ${getEnv("SYNAPSE_FQDN")}`,
  },
  {
    search: /matrix:\n  homeserver: (.*)\n.*secret: (.*)/,
    replace: (match, homeserver, secret) => {
      const newSecret = getEnv("SYNAPSE_API_ADMIN_TOKEN");
      return `matrix:\n  homeserver: ${homeserver}\n  secret: ${newSecret}`;
    },
    useRegex: true,
  },
  {
    search: "SYNAPSE_MAS_SECRET",
    isEnv: true,
  },
  {
    search: "public_base: http://[::]:8080/",
    replace: `public_base: ${getEnv("SYNAPSE_MAS_FQDN")}`,
  },
  {
    search: "issuer: http://[::]:8080/",
    replace: `issuer: ${getEnv("SYNAPSE_MAS_FQDN")}`,
  },
  {
    search: "KEYCLOAK_FQDN",
    isEnv: true,
  },
  {
    search: "KEYCLOAK_CLIENT_ID",
    isEnv: true,
  },
  {
    search: "KEYCLOAK_CLIENT_SECRET",
    isEnv: true,
  },
  {
    search: "KEYCLOAK_REALM_IDENTIFIER",
    isEnv: true,
  },
  {
    search: `
passwords:
  enabled: true`,
    replace: `
passwords:
  enabled: false`,
  },
  {
    search: "KEYCLOAK_UPSTREAM_OAUTH_PROVIDER_ID",
    isEnv: true,
  },
];

function replaceByRegex(text, searchRegex, replaceFunction) {
  return text.replace(searchRegex, replaceFunction);
}

function populateSynapseMasConfig() {
  replacements.forEach((replacement) => {
    if (replacement.isEnv) {
      configContents = configContents
        .split(`{{${replacement.search}}}`)
        .join(getEnv(replacement.search));
    } else if (replacement.useRegex) {
      configContents = replaceByRegex(
        configContents,
        replacement.search,
        replacement.replace
      );
    } else {
      configContents = configContents
        .split(replacement.search)
        .join(replacement.replace);
    }
  });

  writeFileSync("./configurations/synapse-mas/config.yaml", configContents);
}

module.exports = {
  populateSynapseMasConfig,
};
