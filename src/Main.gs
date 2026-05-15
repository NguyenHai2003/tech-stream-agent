/**
 * src/Main.gs
 * Entry point and Dispatcher for Tech Stream Agent.
 */

/**
 * Main function to run the entire system (setup with a daily trigger).
 */
function runTechStreamAgent() {
  const task = "Main.runTechStreamAgent";
  AppLogger.info(task, "Starting process flow...");

  try {
    // 1. Validate configuration
    validateConfig();

    // 2. Fetch read URLs from History Sheet
    const processedUrls = SheetService.getProcessedUrls();
    const processedHashes = SheetService.getProcessedHashes();
    AppLogger.info(task, `Loaded ${processedUrls.length} URLs from History.`);

    // 3. Fetch articles from NewsAPI and filter
    const rawArticles = NewsService.fetchTechNews();
    if (!rawArticles || rawArticles.length === 0) {
      AppLogger.info(task, "No new articles found from NewsAPI.");
      return;
    }

    const newArticles = NewsService.filterNewArticles(
      rawArticles,
      processedUrls,
      processedHashes,
    );
    AppLogger.info(
      task,
      `Found ${newArticles.length} new articles to process (after filtering).`,
    );

    if (newArticles.length === 0) {
      return; // Stop if no new articles
    }

    // 4. Send articles to Gemini for batch processing
    const geminiOutput = GeminiService.analyzeArticlesBatch(newArticles);
    if (!geminiOutput) {
      AppLogger.error(task, "Gemini returned null or error.");
      return;
    }

    AppLogger.info(task, "Received response from Gemini successfully.");

    // 5. Dispatcher - Process data returned from AI
    const articles = Array.isArray(geminiOutput.articles) ? geminiOutput.articles : [];
    const topUpdates = Array.isArray(geminiOutput.topUpdates) ? geminiOutput.topUpdates : [];
    const overview = geminiOutput.overview || "";

    AppLogger.info(task, "Gemini response summary", {
      articlesCount: articles.length,
      topUpdatesCount: topUpdates.length,
      overviewLength: overview.length
    });

    // Always call updateSheet if there are articles
    if (articles.length > 0) {
      AppLogger.info(task, "Dispatch updateSheet", { articlesCount: articles.length });
      SheetService.updateSheet({ articles: articles });
    }

    // Send email if there are topUpdates or high priority articles
    const highPriorityArticles = articles.filter(
      (a) => String(a.priority || "").toLowerCase() === "high"
    );

    if (topUpdates.length > 0 || highPriorityArticles.length > 0) {
      const emailPayload = {
        subject: `[Tech Stream Agent] Top News - ${new Date().toLocaleDateString()}`,
        data: geminiOutput // Pass entire JSON object to MailService
      };
      
      AppLogger.info(task, "Dispatch sendEmail");
      MailService.sendEmail(emailPayload);
    } else {
      AppLogger.info(task, "No important news to send via email.");
    }

    AppLogger.info(task, "Finished successfully.");
  } catch (e) {
    AppLogger.error(task, e);
  }
}
