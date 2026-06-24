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

- `GEMINI_API_KEY`: API Key for Google Gemini (supporting `gemini-3-flash-preview` and `gemini-embedding-001`).
- `NEWS_API_KEY`: API Key for NewsAPI.
- `SPREADSHEET_ID`: ID of the Google Sheet used for storage.
- `RECIPIENT_EMAIL`: Email address to receive the daily reports.
- `SUPABASE_URL`: Supabase project REST URL (`https://<project-ref>.supabase.co`).
- `SUPABASE_KEY`: Supabase `service_role` or `anon` API key.
- `TELEGRAM_BOT_TOKEN`: Telegram Bot Token from BotFather.

### 3. Setup Supabase pgvector (RAG Storage)

Execute the following SQL in your Supabase SQL editor to initialize the `articles` table and similarity search RPC function:

```sql
create extension if not exists vector;

create table if not exists articles (
  id text primary key,
  title text,
  url text,
  category text,
  summary text,
  published_at text,
  embedding vector(768) -- Matches gemini-embedding-001 with outputDimensionality: 768
);

create or replace function match_articles (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id text,
  title text,
  url text,
  category text,
  summary text,
  similarity float
)
language sql stable
as $$
  select
    articles.id,
    articles.title,
    articles.url,
    articles.category,
    articles.summary,
    1 - (articles.embedding <=> query_embedding) as similarity
  from articles
  where 1 - (articles.embedding <=> query_embedding) > match_threshold
  order by articles.embedding <=> query_embedding
  limit match_count;
$$;
```

### 4. Setup Telegram Webhook via Cloudflare Worker (Zero-302 Proxy)

Google Apps Script Web Apps mandatorily return an HTTP `302 Moved Temporarily` redirect for `ContentService` and `HtmlService`. To prevent Telegram Webhook from treating 302 as an error and getting stuck in infinite retry loops (`pending_update_count > 0`), deploy a free Cloudflare Worker proxy:

1. Deploy your GAS script as a Web App: **Execute as: Me** -> **Who has access: Anyone**. Copy the Web App URL.
2. Create a free Cloudflare Worker and insert this proxy code:

```javascript
export default {
  async fetch(request, env, ctx) {
    // INSERT YOUR GAS WEB APP URL HERE:
    const GAS_URL = "https://script.google.com/macros/s/AKfycbyiZEMj.../exec";
    
    if (request.method === "POST") {
      const payload = await request.text();
      // Cloudflare automatically follows Google's 302 redirects
      await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });
      // Return absolute HTTP 200 OK to Telegram
      return new Response("OK", { status: 200 });
    }
    return new Response("Cloudflare Proxy for Telegram Bot is running perfectly!", { status: 200 });
  }
};
```

3. Register your webhook with Telegram using your `.workers.dev` URL:
   `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<CLOUDFLARE_WORKER_URL>&drop_pending_updates=true`

### 5. Setup Automation (Triggers)

To run the daily news collection and email dispatch automatically:

1. Go to the **Triggers** section in the left menu of the GAS Editor.
2. Add a new trigger for the `runTechStreamAgent` function.
3. Choose the event source as `Time-driven` -> `Day timer` -> Select your preferred time window.

---

## 📸 Email Report Demo

Below is an example of the clean HTML email digest automatically generated and delivered by **Tech Stream Agent** to your inbox:

<p align="center">
  <img width="100%" alt="Tech Stream Agent Daily Email Report" src="https://github.com/user-attachments/assets/b4b7b824-36d2-48c7-8759-d59ae93266df" />
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
