/**
 * src/WebhookDispatcher.gs
 * Global webhook dispatcher to avoid doPost(e) conflicts.
 * 
 * ARCHITECTURAL NOTICE (Zero-302 Proxy Pattern):
 * - To prevent Telegram Webhook from getting stuck with `302 Moved Temporarily` retry loops,
 *   this script uses `HtmlService.createHtmlOutput("OK")` instead of `ContentService`.
 * - For enterprise-grade reliability, this Web App should be accessed via a Cloudflare Worker Proxy
 *   which intercepts Google's 302 redirects and returns absolute HTTP 200 OK to Telegram.
 */

/**
 * Handle HTTP POST requests.
 * @param {Object} e - Event object
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return HtmlService.createHtmlOutput("Invalid request");
    }

    const payload = JSON.parse(e.postData.contents);

    if (payload.update_id) {
      const cache = CacheService.getScriptCache();
      const cacheKey = `tg_update_${payload.update_id}`;
      
      if (cache.get(cacheKey)) {
        return HtmlService.createHtmlOutput("OK");
      }
      
      cache.put(cacheKey, "processed", 900);
    }

    // Route to TelegramBotApp if it looks like a Telegram update
    if (payload.update_id && payload.message) {
      return TelegramBotApp.processUpdate(payload);
    }

    return HtmlService.createHtmlOutput("OK");
  } catch (error) {
    AppLogger.error("WebhookDispatcher.doPost", error);
    return HtmlService.createHtmlOutput("Error");
  }
}
