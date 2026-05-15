/**
 * src/config/Config.gs
 * Contains global configuration for Tech Stream Agent.
 */

const Config = {
  // Get API keys and IDs from Properties Service
  GEMINI_API_KEY:
    PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY"),
  NEWS_API_KEY:
    PropertiesService.getScriptProperties().getProperty("NEWS_API_KEY"),
  SPREADSHEET_ID:
    PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID"),
  RECIPIENT_EMAIL:
    PropertiesService.getScriptProperties().getProperty("RECIPIENT_EMAIL"),

  // Endpoints
  NEWS_API_ENDPOINT: "https://newsapi.org/v2/everything",
  GEMINI_API_ENDPOINT:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",

  // Settings
  NEWS_QUERY:
    '"software engineering" OR "programming" OR "developer" OR "coding"',
  BATCH_SIZE: 15,
  MAX_RETRIES: 3,
  RETRY_BACKOFF_MS: 1000,
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 1000,

  // Sheet Name
  HISTORY_SHEET_NAME: "History",
  KEYWORDS_SHEET_NAME: "Keywords",
  HISTORY_HASH_COLUMN_NAME: "Hash",
};

/**
 * Check if required configurations have been set.
 */
function validateConfig() {
  const missing = [];
  if (!Config.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  if (!Config.NEWS_API_KEY) missing.push("NEWS_API_KEY");
  if (!Config.SPREADSHEET_ID) missing.push("SPREADSHEET_ID");
  if (!Config.RECIPIENT_EMAIL) missing.push("RECIPIENT_EMAIL");

  if (missing.length > 0) {
    throw new Error(
      `Missing configuration in Properties Service: ${missing.join(", ")}`,
    );
  }
}
