# Google Apps Script (GAS) Limitations & Best Practices

When building the Tech Stream Agent, keep these hard limitations in mind:

1. **6-Minute Execution Timeout:**
   - Any script running longer than 6 minutes will be forcibly terminated by Google.
   - **Mitigation:** Batch processing. Send multiple news articles to Gemini in a single prompt. Do not iterate over 50 articles and call `UrlFetchApp` 50 times sequentially.

2. **UrlFetchApp Quotas:**
   - 20,000 to 100,000 calls per day depending on account type.
   - Wait times for external APIs are counted towards the 6-minute execution limit.

3. **No Direct DOM or Node.js Modules:**
   - You cannot use `npm` packages directly unless bundled (e.g., via Webpack/Rollup).
   - Stick to built-in GAS Services: `SpreadsheetApp`, `MailApp`, `UrlFetchApp`, `PropertiesService`, `Utilities`.

4. **Triggers:**
   - Time-driven triggers are not exact to the minute (e.g., an 8:00 AM trigger may run between 8:00 and 8:15).
