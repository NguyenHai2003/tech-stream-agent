# Tech Stream Agent 🚀

Welcome to **Tech Stream Agent**! This is an automated technology news processing pipeline running on Google Apps Script (GAS). The system collects news from NewsAPI, utilizes AI (Gemini) to summarize, categorize, and score articles, then stores the data in Google Sheets and sends daily email reports.

The project is structured following Service-Oriented Architecture (SOA) principles and is fully localized in English, optimized for stability and AI integration.

---

## ✨ Key Features

- 🔍 **Smart News Collection**: Automatically fetches the latest tech news from NewsAPI based on dynamic keywords (read from Sheets).
- 🧠 **AI Processing (Gemini)**: Utilizes Gemini's Structured Output (JSON Schema) to reliably summarize content, categorize topics (AI, Cloud, Frontend, etc.), and assign relevance and confidence scores.
- 🛡️ **Advanced Deduplication**: Implements URL normalization and SHA-256 hashing to prevent reprocessing old news, optimizing API costs.
- 📊 **Automated Storage**: Writes data directly to Google Sheets for tracking and management.
- 📧 **Daily Reporting**: Automatically generates and sends clean HTML email summaries of the most important (High priority) news every morning natively via GAS.
- 🔄 **High Reliability**: Integrates Retry mechanisms with Exponential Backoff for all API calls (NewsAPI & Gemini) and a robust `AppLogger` supporting both Cloud Logging and standard script logs.

---

## 📂 Project Structure

```text
/
├── src/                        # Google Apps Script source code folder (.gs)
│   ├── Main.gs                 # Entry point and Dispatcher
│   ├── appsscript.json         # GAS environment configuration
│   ├── config/
│   │   └── Config.gs           # System configuration (API keys, Sheet IDs, Endpoints)
│   ├── models/
│   │   └── Models.gs           # Data structures (JSDoc typedefs)
│   ├── services/
│   │   ├── GeminiService.gs    # Service for interacting with Gemini AI via JSON structured output
│   │   ├── MailService.gs      # Service for rendering HTML and sending emails via MailApp
│   │   ├── NewsService.gs      # Service for fetching news from NewsAPI
│   │   └── SheetService.gs     # Service for interacting with Google Sheets
│   └── utils/
│       ├── CommonUtils.gs      # Shared utilities (Hash, Normalize, Retry)
│       └── Logger.gs           # Centralized logging system (Google Apps Script Logger + Console)
└── .agent-skill/               # 🤖 Special folder containing standard documentation for AI Agents
```

---

## 🚀 Getting Started

### 1. Sync Code with GAS

The project uses Google's `clasp` tool for code management and synchronization.

1. Install `clasp` globally: `npm install -g @google/clasp`
2. Login to your Google account: `clasp login`
3. Push code to your current GAS project: `clasp push`

### 2. Configure Environment Variables (Script Properties)

To operate the system, access the GAS editor on the web -> **Project Settings** -> **Script Properties** and add the following variables:

- `GEMINI_API_KEY`: API Key for Google Gemini.
- `NEWS_API_KEY`: API Key for NewsAPI.
- `SPREADSHEET_ID`: ID of the Google Sheet used for storage.
- `RECIPIENT_EMAIL`: Email address to receive the daily reports.

### 3. Setup Automation (Triggers)

To run the system automatically every day:

1. Go to the **Triggers** section in the left menu of the GAS Editor.
2. Add a new trigger for the `runTechStreamAgent` function.
3. Choose the event source as `Time-driven` -> `Day timer` -> Select your preferred time window.

---

## 📸 Email Report Demo

Below is an example of the clean HTML email digest automatically generated and delivered by **Tech Stream Agent** to your inbox:

<p align="center">
  <img width="100%" alt="Tech Stream Agent Daily Email Report" src="" />
  <br>
  <em>Figure 1: Automated high-priority tech news summary received on May 17, 2026.</em>
</p>

### Key elements included in the report:

- **Overview (AI Report):** A high-level macro summary of the day's tech landscape synthesized by Gemini.
- **Quick TL;DR:** A bulleted list of jump-links for rapid scanning.
- **Top News (High Priority):** Deep-dive summaries categorized by tags (e.g., `Tooling`, `Career`, `General Tech`, `AI`) with clear actionable insights for developers and tech leaders.

## 🤖 Agentic Navigation Portal

> [!IMPORTANT]
> **Notice for any AI Agent reading this file:**
> Before making any changes in the `/src` source code, you **MUST** read through the documentation in the `.agent-skill` directory to fully understand the specific limitations of Google Apps Script and the project's workflow.
>
> Please refer immediately to the following standard documents:
>
> 1. 🎯 **[SKILL.md](./.agent-skill/SKILL.md)**: Core rules defining the data flow and Dispatcher pattern.
> 2. ⚠️ **[GAS Limits](./.agent-skill/references/gas-limits.md)**: Document explaining the 6-minute GAS limits and API quotas.
