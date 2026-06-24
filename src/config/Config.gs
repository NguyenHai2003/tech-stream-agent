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
  SUPABASE_URL:
    PropertiesService.getScriptProperties().getProperty("SUPABASE_URL"),
  SUPABASE_KEY:
    PropertiesService.getScriptProperties().getProperty("SUPABASE_KEY"),
  TELEGRAM_BOT_TOKEN:
    PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN"),

  // Endpoints
  NEWS_API_ENDPOINT: "https://newsapi.org/v2/everything",
  GEMINI_API_ENDPOINT:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
  GEMINI_EMBEDDING_ENDPOINT:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",

  // Settings
  NEWS_QUERY:
    '"software engineering" OR "programming" OR "developer" OR "coding"',
  BATCH_SIZE: 15,
  MAX_RETRIES: 3,
  RETRY_BACKOFF_MS: 1000,
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 1000,
  EXECUTION_TIMEOUT_MS: 270000, // 4.5 minutes
  TOP_K_RESULTS: 5, // For vector search

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
  if (!Config.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!Config.SUPABASE_KEY) missing.push("SUPABASE_KEY");
  if (!Config.TELEGRAM_BOT_TOKEN) missing.push("TELEGRAM_BOT_TOKEN");

  if (missing.length > 0) {
    throw new Error(
      `Missing configuration in Properties Service: ${missing.join(", ")}`,
    );
  }
}
