/**
 * src/services/NewsService.gs
 * Responsible for fetching data from NewsAPI.
 */

const NewsService = {
  /**
   * Call NewsAPI to get tech articles.
   * @returns {Object[]} List of articles retrieved from API
   */
  fetchTechNews: function () {
    try {
      return CommonUtils.retryRequest(
        () => {
          const today = new Date();
          // Get yesterday's date to ensure articles are available
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          const fromDate = yesterday.toISOString().split("T")[0];

          const keywords = SheetService.getKeywords();
          const query = buildNewsQuery(keywords);

          // Build URL
          const url = `${Config.NEWS_API_ENDPOINT}?q=${encodeURIComponent(query)}&from=${fromDate}&sortBy=relevancy&apiKey=${Config.NEWS_API_KEY}&language=en`;

          const response = UrlFetchApp.fetch(url, {
            method: "GET",
            muteHttpExceptions: true,
          });

          const json = JSON.parse(response.getContentText());

          if (json.status !== "ok") {
            throw new Error(`NewsAPI error: ${json.message || json.code}`);
          }

          return json.articles || [];
        },
        Config.RETRY_MAX_ATTEMPTS,
        Config.RETRY_BASE_DELAY_MS,
      );
    } catch (e) {
      AppLogger.error("NewsService.fetchTechNews", e);
      return [];
    }
  },

  /**
   * Filter articles, removing those with URLs already present in processedUrls.
   * Also limits the number of articles to BATCH_SIZE.
   * @param {Object[]} articles Original list of articles
   * @param {string[]} processedUrls List of processed URLs (from History)
   * @param {string[]} processedHashes List of processed hashes (from History)
   * @returns {Object[]} List of new articles to process
   */
  filterNewArticles: function (articles, processedUrls, processedHashes) {
    const urlSet = new Set(
      (processedUrls || [])
        .map((url) => CommonUtils.normalizeUrl(url))
        .filter(Boolean),
    );
    const hashSet = new Set(processedHashes || []);
    const newArticles = [];

    for (const article of articles || []) {
      // Skip deleted articles or articles without a valid URL
      if (!article.url || article.url === "https://removed.com") continue;

      const normalizedUrl = CommonUtils.normalizeUrl(article.url);
      if (!normalizedUrl) continue;

      const hash = CommonUtils.computeHash(normalizedUrl);
      if (urlSet.has(normalizedUrl) || hashSet.has(hash)) continue;

      newArticles.push({
        ...article,
        normalizedUrl: normalizedUrl,
        hash: hash,
      });

      if (newArticles.length >= Config.BATCH_SIZE) break;
    }

    return newArticles;
  },
};

function buildNewsQuery(keywords) {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return Config.NEWS_QUERY;
  }

  const queryParts = keywords
    .map((keyword) => String(keyword || "").trim())
    .filter((keyword) => keyword.length > 0)
    .map((keyword) => `"${keyword.replace(/"/g, "")}"`);

  if (queryParts.length === 0) {
    return Config.NEWS_QUERY;
  }

  return queryParts.join(" OR ");
}
