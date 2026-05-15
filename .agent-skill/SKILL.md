---
name: build-tech-stream-agent
description: Use this skill when developing, debugging, or modifying the Tech Stream Agent project on Google Apps Script. It enforces 6-minute timeout avoidance, batch processing, and GAS-specific APIs (SpreadsheetApp, UrlFetchApp).
---

# Tech Stream Agent Implementation Procedures

You are acting as the developer for the Tech Stream Agent. Do not explain basic HTTP or general Javascript concepts. Focus strictly on the constraints of Google Apps Script (GAS) and the specific architecture of this project.

## 1. Project-Specific Architecture (Defaults)
- **Data Flow**: `NewsAPI` -> `Filter (History Sheet)` -> `Gemini (Batch)` -> `Dispatcher` -> `SpreadsheetApp/MailApp`.
- **Deduplication**: By default, always read the `History` tab first. Filter out any NewsAPI articles whose URLs already exist in the `History` tab.
- **Batching**: Never send articles 1-by-1 to Gemini. Combine the title and description of 10-15 new articles into a single prompt string.

## 2. Google Apps Script Constraints
- **APIs**: Use `UrlFetchApp.fetch()` instead of `axios` or standard `fetch()`. Use `PropertiesService.getScriptProperties()` for secrets.
- **Timeouts**: Ensure the main function finishes under 6 minutes. If processing takes too long, implement pagination or reduce the batch size.
- **Dispatcher Pattern**: Gemini cannot directly execute functions. You must write a router/dispatcher function that takes the JSON output from Gemini and manually invokes `SpreadsheetApp` to save data or `MailApp.sendEmail` to send the HTML report.

## 3. Error Handling & Logging
- **Encapsulation**: Wrap all `UrlFetchApp` calls and `JSON.parse()` operations in `try/catch` blocks.
- **Structured Logging**: All error logs must follow this JSON format for easier debugging:
  `console.error(JSON.stringify({task: "<task-name>", error: e.message, timestamp: new Date()}));`

## 4. Development Workflow & Validation
Before finalizing any programming task, you MUST:
- **Schema Validation**: Verify that the JSON output structure aligns perfectly with `assets/gemini-schema.json`.
- **Run Validation Script**: Execute the following Node.js command locally to scan for GAS syntax compliance:
  `node scripts/validate-gas.js`
- **Error Correction**: If the script returns an [ERROR] (e.g., usage of axios or fetch), you must immediately refactor the code and re-run validation until it passes.\
- **Documentation**: Update the `README.md` file whenever a new Service or Skill is introduced to the architecture.