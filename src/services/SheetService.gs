/**
 * src/services/SheetService.gs
 * Responsible for interacting with Google Sheets.
 */

const SheetService = {
  /**
   * Get or create the History tab with standard headers if it doesn't exist.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  getOrCreateHistorySheet: function () {
    const spreadsheet = SpreadsheetApp.openById(Config.SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(Config.HISTORY_SHEET_NAME);
    const createdNewSheet = !sheet;

    if (createdNewSheet) {
      sheet = spreadsheet.insertSheet(Config.HISTORY_SHEET_NAME);
    }

    const headerValues = [
      "Timestamp",
      "Title",
      "URL",
      "Category",
      "Summary",
      "Priority",
      Config.HISTORY_HASH_COLUMN_NAME,
      "Relevance Score",
      "Confidence Score",
    ];

    if (sheet.getMaxColumns() < headerValues.length) {
      sheet.insertColumnsAfter(
        sheet.getMaxColumns(),
        headerValues.length - sheet.getMaxColumns(),
      );
    }

    sheet.getRange(1, 1, 1, headerValues.length).setValues([headerValues]);

    if (!sheet.getRange(1, 7).getValue()) {
      sheet.getRange(1, 7).setValue(Config.HISTORY_HASH_COLUMN_NAME);
    }

    if (createdNewSheet) {
      AppLogger.info(
        "SheetService.getOrCreateHistorySheet",
        "Created History sheet with headers",
      );
    }

    return sheet;
  },

  /**
   * Get or create the Keywords tab to manage dynamic keywords.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  getOrCreateKeywordsSheet: function () {
    const spreadsheet = SpreadsheetApp.openById(Config.SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(Config.KEYWORDS_SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(Config.KEYWORDS_SHEET_NAME);
      sheet.getRange(1, 1).setValue("Keyword");
      AppLogger.info(
        "SheetService.getOrCreateKeywordsSheet",
        "Created Keywords sheet with header",
      );
    }

    return sheet;
  },

  /**
   * Get the list of processed URLs from the History tab.
   * URL column is the 3rd column (index 2 starting from 0 for arrays, or column C in Sheets).
   * @returns {string[]} Array containing processed URLs
   */
  getProcessedUrls: function () {
    return runSafely(
      "SheetService.getProcessedUrls",
      () => {
        const sheet = this.getOrCreateHistorySheet();

        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return []; // Only header or empty

        // Get all data in column 3 (URL)
        const data = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
        return data.map((row) => row[0]).filter((url) => url !== "");
      },
      { fallback: [] },
    );
  },

  /**
   * Get the list of processed hashes from the History tab.
   * If old rows don't have a Hash column, the hash will be recalculated from the normalized URL.
   * @returns {string[]} Array containing processed hashes
   */
  getProcessedHashes: function () {
    return runSafely(
      "SheetService.getProcessedHashes",
      () => {
        const sheet = this.getOrCreateHistorySheet();
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return [];

        const rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
        const hashes = [];

        for (const row of rows) {
          const url = row[2];
          const existingHash = row[6];
          if (existingHash) {
            hashes.push(String(existingHash));
            continue;
          }

          const normalizedUrl = CommonUtils.normalizeUrl(url);
          if (!normalizedUrl) continue;

          hashes.push(CommonUtils.computeHash(normalizedUrl));
        }

        return hashes;
      },
      { fallback: [] },
    );
  },

  /**
   * Read the list of dynamic keywords from the Keywords tab.
   * @returns {string[]} Array of valid keywords
   */
  getKeywords: function () {
    return runSafely(
      "SheetService.getKeywords",
      () => {
        const sheet = this.getOrCreateKeywordsSheet();
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return [];

        const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        return values
          .map((row) => String(row[0] || "").trim())
          .filter((keyword) => keyword.length > 0);
      },
      { fallback: [] },
    );
  },

  /**
   * Store new articles into Google Sheets.
   * Column format: [Timestamp, Title, URL, Category, Summary, Priority]
   * @param {Object} payload Contains articles array
   */
  updateSheet: function (payload) {
    runSafely("SheetService.updateSheet", () => {
      const articles = payload.articles;
      if (!articles || articles.length === 0) return;

      const sheet = this.getOrCreateHistorySheet();

      const rows = articles.map((article) => {
        const normalizedUrl = CommonUtils.normalizeUrl(
          article.normalizedUrl || article.url || "",
        );
        const hash =
          article.hash ||
          (normalizedUrl ? CommonUtils.computeHash(normalizedUrl) : "");

        return [
          new Date(), // Timestamp
          article.title || "", // Title
          article.url || "", // URL
          article.category || "", // Category
          article.summary || "", // Summary
          article.priority || "Low", // Priority
          hash, // Hash
          article.relevanceScore || "", // Relevance Score
          article.confidenceScore || "", // Confidence Score
        ];
      });

      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);

      AppLogger.info(
        "SheetService.updateSheet",
        `Saved ${rows.length} new articles.`,
      );
    });
  },
};
