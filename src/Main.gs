/**
 * src/Main.gs
 * Entry point and Dispatcher for Tech Stream Agent.
 */

function forceAuthorize() {
  ScriptApp.getProjectTriggers();
  SpreadsheetApp.getActiveSpreadsheet();
  UrlFetchApp.fetch("https://httpbin.org/get");
  MailApp.getRemainingDailyQuota();
}

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

    // 6. Queue articles for Vector DB embedding
    if (articles.length > 0) {
      // Create records with basic ID
      const recordsToEmbed = articles.map(a => ({
        id: Utilities.getUuid(),
        title: a.title,
        url: a.url,
        summary: a.summary || "",
        category: a.category || "Uncategorized",
        published_at: new Date().toISOString()
      }));

      const props = PropertiesService.getScriptProperties();
      props.setProperty("PENDING_VECTOR_QUEUE", JSON.stringify(recordsToEmbed));
      
      // Start processing the queue immediately
      processPendingQueue();
    }

    AppLogger.info(task, "Main flow finished successfully.");
  } catch (e) {
    AppLogger.error(task, e);
  }
}

/**
 * Process the pending queue of articles to embed and push to Vector DB.
 * Designed to handle execution timeouts via Trigger Chaining.
 */
function processPendingQueue() {
  const task = "Main.processPendingQueue";
  const startTime = Date.now();
  const props = PropertiesService.getScriptProperties();
  const queueStr = props.getProperty("PENDING_VECTOR_QUEUE");

  if (!queueStr) {
    AppLogger.info(task, "No pending vector queue found.");
    return;
  }

  let queue = [];
  try {
    queue = JSON.parse(queueStr);
  } catch (e) {
    AppLogger.error(task, "Failed to parse vector queue.", e);
    props.deleteProperty("PENDING_VECTOR_QUEUE");
    return;
  }

  if (queue.length === 0) {
    props.deleteProperty("PENDING_VECTOR_QUEUE");
    return;
  }

  AppLogger.info(task, `Processing vector queue with ${queue.length} items.`);
  const processedRecords = [];
  let index = 0;

  while (index < queue.length) {
    // Check timeout
    if (Date.now() - startTime > Config.EXECUTION_TIMEOUT_MS) {
      AppLogger.warn(task, "Approaching execution timeout. Chaining trigger...");
      
      // Save remaining queue
      const remainingQueue = queue.slice(index);
      props.setProperty("PENDING_VECTOR_QUEUE", JSON.stringify(remainingQueue));

      // Push already processed ones in this run to avoid losing them
      if (processedRecords.length > 0) {
        SupabaseService.upsertVectors(processedRecords);
      }

      // Create trigger to resume in 1 minute
      ScriptApp.newTrigger("processPendingQueue")
        .timeBased()
        .after(60 * 1000)
        .create();
      
      return;
    }

    const item = queue[index];
    try {
      const textToEmbed = `Title: ${item.title}\nCategory: ${item.category}\nSummary: ${item.summary}`;
      const embedding = GeminiService.generateEmbeddings(textToEmbed);

      if (embedding) {
        item.embedding = embedding;
        processedRecords.push(item);
      } else {
        AppLogger.warn(task, `Failed to generate embedding for: ${item.title}`);
      }
    } catch (e) {
      AppLogger.error(task, `Error processing embedding for: ${item.title}`, e);
    }

    index++;
  }

  // Push all processed records to Supabase
  if (processedRecords.length > 0) {
    SupabaseService.upsertVectors(processedRecords);
  }

  // Clear queue and triggers if all done
  props.deleteProperty("PENDING_VECTOR_QUEUE");
  
  // Cleanup any left-over triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processPendingQueue") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  AppLogger.info(task, "Finished processing vector queue.");
}
