function normalizeEnvValue(raw) {
  if (raw === undefined || raw === null) return raw;
  let value = String(raw);
  // Strip trailing CR from CRLF and trim whitespace
  value = value.replace(/\r+$/g, "").trim();
  // Remove surrounding single/double quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function getEnv(key) {
  const envValue = process.env[key];
  if (envValue === undefined) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return normalizeEnvValue(envValue);
}

module.exports = {
  getEnv,
};
