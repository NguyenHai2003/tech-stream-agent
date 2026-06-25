# Tech Stream Agent 🚀

Welcome to **Tech Stream Agent**! This is an automated, end-to-end technology news pipeline running on Google Apps Script (GAS). The system collects news from NewsAPI, utilizes AI (Gemini) to summarize, categorize, and score articles, stores the data in Google Sheets, embeds articles into a **Supabase pgvector** database, and enables interactive Q&A via a **Telegram Bot** powered by **RAG (Retrieval-Augmented Generation)**.

The project is structured following Service-Oriented Architecture (SOA) principles and is fully localized in English, optimized for stability and AI integration.

---

## ✨ Key Features

- 🔍 **Smart News Collection**: Automatically fetches the latest tech news from NewsAPI based on dynamic keywords (read from Sheets).
- 🧠 **AI Processing (Gemini)**: Utilizes Gemini's Structured Output (JSON Schema) to reliably summarize content, categorize topics (AI, Cloud, Frontend, etc.), and assign relevance and confidence scores.
- 🛡️ **Advanced Deduplication**: Implements URL normalization and SHA-256 hashing to prevent reprocessing old news, optimizing API costs.
- 📊 **Automated Storage**: Writes data directly to Google Sheets for tracking and management.
- 📧 **Daily Reporting**: Automatically generates and sends clean HTML email summaries of the most important (High priority) news every morning natively via GAS.
- 🗄️ **Vector Database (Supabase pgvector)**: After AI processing, articles are embedded using `gemini-embedding-001` (768 dimensions) and upserted into a Supabase `articles` table with pgvector for semantic search.
- 🤖 **Telegram Bot with RAG**: Users can ask questions in natural language via Telegram. The bot embeds the query, performs similarity search against the vector database, and synthesizes a context-aware answer using Gemini — all in real-time.
- ⚡ **Placeholder-then-Edit UX**: The Telegram bot sends an instant "⏳ Searching..." placeholder, then edits it with the final RAG answer — keeping the chat clean with a single message.
- 🛡️ **HTML Resilience**: Automatic fallback from HTML to Plain Text if Telegram rejects the response due to entity parse errors (HTTP 400).
- 🔄 **High Reliability**: Integrates Retry mechanisms with Exponential Backoff for all API calls (NewsAPI, Gemini & Supabase) and a robust `AppLogger` supporting both Cloud Logging and standard script logs.
- ⏱️ **Trigger Chaining**: The vector embedding queue is processed with execution timeout awareness (4.5 min). If the GAS 6-minute limit approaches, remaining items are saved and a chained trigger resumes processing automatically.

---

## 🏗️ System Architecture

```text
                      ┌──────────────┐
                      │   NewsAPI    │
                      └──────┬───────┘
                             │ Fetch articles
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Apps Script                        │
│                                                             │
│  ┌──────────┐    ┌────────────────┐    ┌────────────────┐   │
│  │ Main.gs  │───▶│ GeminiService  │───▶│ SheetService   │   │
│  │(Trigger) │    │ (Analyze Batch)│    │ (Google Sheets)│   │
│  └────┬─────┘    └───────┬────────┘    └────────────────┘   │
│       │                  │                                  │
│       │                  ▼                                  │
│       │          ┌────────────────┐    ┌────────────────┐   │
│       │          │ GeminiService  │───▶│ SupabaseService│   │
│       │          │ (Embedding)    │    │ (Upsert Vector)│   │
│       │          └────────────────┘    └───────┬────────┘   │
│       │                                        │            │
│       ▼                                        ▼            │
│  ┌──────────┐                         ┌────────────────┐    │
│  │MailService│                        │   Supabase     │    │
│  │(Email)    │                        │   pgvector DB  │    │
│  └──────────┘                         └───────┬────────┘    │
│                                               │             │
│  ┌───────────────────┐    ┌───────────────┐   │             │
│  │WebhookDispatcher  │───▶│TelegramBotApp │───┘             │
│  │(doPost)           │    │(RAG Workflow) │                  │
│  └───────────────────┘    └───────┬───────┘                  │
│                                   │                          │
└───────────────────────────────────┼──────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               ▼               │
                    │  ┌─────────────────────────┐  │
                    │  │    Cloudflare Worker     │  │
                    │  │   (Zero-302 Proxy)       │  │
                    │  └────────────┬──────────────┘  │
                    │               ▼               │
                    │      ┌──────────────┐         │
                    │      │  Telegram    │         │
                    │      │  Bot API     │         │
                    │      └──────────────┘         │
                    └───────────────────────────────┘
```

### RAG Workflow (Telegram Q&A)

```text
User Question ──▶ Gemini Embedding (768d) ──▶ Supabase pgvector (Similarity Search)
                                                        │
                                                        ▼
                                               Top-K Context Articles
                                                        │
                                                        ▼
                                              Gemini RAG Synthesis ──▶ Answer (HTML)
```

---

## 📂 Project Structure

```text
/
├── src/                           # Google Apps Script source code folder (.gs)
│   ├── Main.gs                    # Entry point, Dispatcher & Trigger Chaining for vector embedding
│   ├── TelegramBotApp.gs          # Telegram Bot handler with RAG workflow
│   ├── WebhookDispatcher.gs       # Global doPost() webhook dispatcher with dedup (CacheService)
│   ├── appsscript.json            # GAS environment configuration
│   ├── config/
│   │   └── Config.gs              # System configuration (API keys, Endpoints, Supabase, Telegram)
│   ├── models/
│   │   └── Models.gs              # Data structures (JSDoc typedefs)
│   ├── services/
│   │   ├── GeminiService.gs       # Gemini AI: batch analysis, embeddings (768d), RAG synthesis
│   │   ├── MailService.gs         # HTML email rendering and sending via MailApp
│   │   ├── NewsService.gs         # Fetching and filtering news from NewsAPI
│   │   ├── SheetService.gs        # Google Sheets CRUD operations
│   │   └── SupabaseService.gs     # Supabase REST API: vector upsert & pgvector similarity search
│   └── utils/
│       ├── CommonUtils.gs         # Shared utilities (Hash, Normalize, Retry with Exponential Backoff)
│       └── Logger.gs              # Centralized logging (Google Apps Script Logger + Console)
└── .agent-skill/                  # 🤖 Standard documentation for AI Agents
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

| Property               | Description                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`     | API Key for Google Gemini (supports`gemini-3-flash-preview` & `gemini-embedding-001`) |
| `NEWS_API_KEY`       | API Key for NewsAPI                                                                       |
| `SPREADSHEET_ID`     | ID of the Google Sheet used for storage                                                   |
| `RECIPIENT_EMAIL`    | Email address to receive the daily reports                                                |
| `SUPABASE_URL`       | Supabase project REST URL (`https://<project-ref>.supabase.co`)                         |
| `SUPABASE_KEY`       | Supabase`service_role` or `anon` API key                                              |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token from BotFather                                                         |

### 3. Setup Supabase pgvector (Vector Database)

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

To run the daily news collection, email dispatch, and vector embedding automatically:

1. Go to the **Triggers** section in the left menu of the GAS Editor.
2. Add a new trigger for the `runTechStreamAgent` function.
3. Choose the event source as `Time-driven` -> `Day timer` -> Select your preferred time window.

> [!NOTE]
> The `processPendingQueue` function uses **Trigger Chaining** — it automatically creates a one-time trigger to resume processing if the GAS execution timeout (4.5 min safety margin) is reached. No manual setup is needed for this.

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

---

## 💬 Telegram Bot Demo

<p align="center">
  <img width="100%" alt="Tech Stream Agent Telegram Bot RAG Demo" src="INSERT_IMAGE_URL_HERE" />
  <br>
  <em>Figure 2: Tech Stream Agent answering tech news questions interactively via Telegram Bot.</em>
</p>

The bot uses a **Tech Stream Agent** persona — dynamic, insightful, and friendly. Key behaviors:

- **Natural Conversational Tone**: Talks like sharing breaking news with a friend, not a formal report.
- **Inline Citations**: Links are woven into sentences naturally (e.g., "According to `<a href='url'>`this article`</a>`, Apple has...") — no dry "Source:" blocks.
- **Telegram HTML Formatting**: Responses use `<b>`, `<i>`, and `<a href>` tags optimized for Telegram rendering.
- **Fallback Safety**: If Telegram rejects HTML due to parse errors, the bot automatically retries with plain text.

---

## 🤖 Agentic Navigation Portal

> [!IMPORTANT]
> **Notice for any AI Agent reading this file:**
> Before making any changes in the `/src` source code, you **MUST** read through the documentation in the `.agent-skill` directory to fully understand the specific limitations of Google Apps Script and the project's workflow.
>
> Please refer immediately to the following standard documents:
>
> 1. 🎯 **[SKILL.md](./.agent-skill/SKILL.md)**: Core rules defining the data flow and Dispatcher pattern.
> 2. ⚠️ **[GAS Limits](./.agent-skill/references/gas-limits.md)**: Document explaining the 6-minute GAS limits and API quotas.
