const fs = require("fs");
const path = require("path");

function parseAndLoadEnvFile() {
  const envFilePath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envFilePath)) {
    throw new Error(`.env file not found: ${envFilePath}`);
  }

  const envFile = fs.readFileSync(envFilePath, "utf8");
  envFile.split("\n").forEach((rawLine) => {
    if (!rawLine) return;

    // Normalize Windows CRLF and trim whitespace
    const line = rawLine.replace(/\r$/, "").trim();
    if (line.length === 0) return;
    if (line.startsWith("#")) return; // comment

    // Support lines like: export KEY=VALUE
    const cleaned = line.startsWith("export ") ? line.slice(7).trim() : line;

    const eqIndex = cleaned.indexOf("=");
    if (eqIndex === -1) return; // invalid line; skip

    const key = cleaned.slice(0, eqIndex).trim();
    let value = cleaned.slice(eqIndex + 1);

    // Trim surrounding whitespace and trailing CR if any
    value = value.replace(/\r$/, "").trim();

    // Remove optional surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Unescape common sequences inside quoted values
    value = value
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");

    if (key) {
      process.env[key] = value;
    }
  });
}

parseAndLoadEnvFile();

const { populateSynapseMasConfig } = require("./populate_synapse_mas_config");
const { populateConfigsFromEnv } = require("./populate_configs_from_env");

populateSynapseMasConfig();
populateConfigsFromEnv();
