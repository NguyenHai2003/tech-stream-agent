/**
 * src/services/SupabaseService.gs
 * Interacts with Supabase REST API for vector storage and retrieval.
 */

const SupabaseService = {
  /**
   * Upsert vectors to Supabase table (assumed table name: 'articles').
   * @param {Object[]} records Array of objects: { id, title, url, category, summary, published_at, embedding }
   */
  upsertVectors: function (records) {
    if (!records || records.length === 0) return;

    const task = "SupabaseService.upsertVectors";
    
    try {
      const url = `${Config.SUPABASE_URL}/rest/v1/articles`;
      const headers = {
        "apikey": Config.SUPABASE_KEY,
        "Authorization": `Bearer ${Config.SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates" // Upsert behavior
      };

      const payload = JSON.stringify(records);

      const response = CommonUtils.retryRequest(
        () => {
          const currentResponse = UrlFetchApp.fetch(url, {
            method: "POST",
            headers: headers,
            payload: payload,
            muteHttpExceptions: true,
          });

          const responseCode = currentResponse.getResponseCode();
          // 200, 201 are success codes for POST/Upsert
          if (responseCode !== 200 && responseCode !== 201 && responseCode !== 204) {
            throw new Error(`Supabase API Error (${responseCode}): ${currentResponse.getContentText()}`);
          }
          return currentResponse;
        },
        Config.RETRY_MAX_ATTEMPTS,
        Config.RETRY_BASE_DELAY_MS
      );

      AppLogger.info(task, `Successfully upserted ${records.length} vectors to Supabase.`);
      return true;
    } catch (error) {
      AppLogger.error(task, error);
      return false;
    }
  },

  /**
   * Search for similar articles using pgvector.
   * Requires an RPC function named `match_articles` in Supabase.
   * @param {number[]} queryVector The vector representation of the query.
   * @param {number} matchCount Number of top results to return.
   * @returns {Object[]} Array of matched articles.
   */
  searchSimilar: function (queryVector, matchCount = Config.TOP_K_RESULTS) {
    const task = "SupabaseService.searchSimilar";
    
    try {
      const url = `${Config.SUPABASE_URL}/rest/v1/rpc/match_articles`;
      const headers = {
        "apikey": Config.SUPABASE_KEY,
        "Authorization": `Bearer ${Config.SUPABASE_KEY}`,
        "Content-Type": "application/json",
      };

      const payload = JSON.stringify({
        query_embedding: queryVector,
        match_threshold: 0.5, // Adjust similarity threshold if needed
        match_count: matchCount
      });

      const response = CommonUtils.retryRequest(
        () => {
          const currentResponse = UrlFetchApp.fetch(url, {
            method: "POST",
            headers: headers,
            payload: payload,
            muteHttpExceptions: true,
          });

          const responseCode = currentResponse.getResponseCode();
          if (responseCode !== 200) {
            throw new Error(`Supabase API Error (${responseCode}): ${currentResponse.getContentText()}`);
          }
          return currentResponse;
        },
        Config.RETRY_MAX_ATTEMPTS,
        Config.RETRY_BASE_DELAY_MS
      );

      const results = JSON.parse(response.getContentText());
      return results;
    } catch (error) {
      AppLogger.error(task, error);
      return [];
    }
  }
};
