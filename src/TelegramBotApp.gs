/**
 * src/TelegramBotApp.gs
 * Handles incoming Telegram webhook updates and executes the RAG workflow.
 * 
 * ARCHITECTURAL STANDARDS:
 * 1. RAG Workflow: Gemini Embedding (768d) -> Supabase pgvector -> Gemini RAG Synthesis.
 * 2. Markdown Resilience: Automatic fallback to Plain Text if Telegram throws HTTP 400 (entity parse error).
 * 3. Webhook Zero-302 Proxy: Expects a Cloudflare Worker proxy in front of the Web App URL to intercept GAS 302 redirects.
 */

const TelegramBotApp = {
  /**
   * Process a Telegram Webhook payload.
   * @param {Object} payload The parsed JSON payload from Telegram.
   */
  processUpdate: function (payload) {
    const task = "TelegramBotApp.processUpdate";
    
    try {
      const message = payload.message;
      if (!message || !message.text) {
        return HtmlService.createHtmlOutput("OK"); // Ignore non-text messages
      }

      const chatId = message.chat.id;
      const text = message.text.trim();

      // Handle basic commands
      if (text.startsWith("/start") || text.startsWith("/help")) {
        this.sendMessage(chatId, "Chào bạn! Tôi là Tech Stream Agent. Hãy hỏi tôi bất cứ điều gì về tin tức công nghệ gần đây.");
        return HtmlService.createHtmlOutput("OK");
      }

      // Execute RAG Workflow
      // Note: GAS webhook execution time limit is 6 minutes. 
      // RAG usually takes ~5-15 seconds, so it's safe to run synchronously here.
      
      // 1. Send "thinking" action (optional but good for UX)
      this.sendChatAction(chatId, "typing");

      // 2. Generate embedding for user query
      const queryEmbedding = GeminiService.generateEmbeddings(text);
      if (!queryEmbedding) {
        this.sendMessage(chatId, "Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn (Lỗi Embedding).");
        return HtmlService.createHtmlOutput("OK");
      }

      // 3. Search Supabase for similar articles
      const similarArticles = SupabaseService.searchSimilar(queryEmbedding, Config.TOP_K_RESULTS);
      if (!similarArticles || similarArticles.length === 0) {
        this.sendMessage(chatId, "Xin lỗi, tôi không tìm thấy tin tức nào liên quan đến câu hỏi của bạn trong cơ sở dữ liệu.");
        return HtmlService.createHtmlOutput("OK");
      }

      // 4. Generate answer with RAG
      const answer = GeminiService.answerWithRAG(text, similarArticles);

      // 5. Send answer back to Telegram
      this.sendMessage(chatId, answer);

      return HtmlService.createHtmlOutput("OK");
    } catch (error) {
      AppLogger.error(task, error);
      if (payload && payload.message && payload.message.chat) {
        this.sendMessage(payload.message.chat.id, "Đã xảy ra lỗi hệ thống khi xử lý câu hỏi của bạn.");
      }
      return HtmlService.createHtmlOutput("Error");
    }
  },

  /**
   * Send a text message to a specific Telegram chat.
   */
  sendMessage: function (chatId, text) {
    if (!Config.TELEGRAM_BOT_TOKEN || !text) return;
    
    const url = `https://api.telegram.org/bot${Config.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown"
    };

    const response = UrlFetchApp.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    // Nếu Telegram từ chối do lỗi parse Markdown (HTTP 400 Can't parse entities)
    // Lập tức fallback gửi lại bằng Plain Text (bỏ parse_mode)
    if (responseCode !== 200) {
      AppLogger.warn("TelegramBotApp.sendMessage", `Markdown parse error (${responseCode}): ${response.getContentText()}. Fallback to plain text.`);
      
      const fallbackPayload = {
        chat_id: chatId,
        text: text
      };

      UrlFetchApp.fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        payload: JSON.stringify(fallbackPayload),
        muteHttpExceptions: true
      });
    }
  },

  /**
   * Send a chat action (e.g. typing) to Telegram.
   */
  sendChatAction: function (chatId, action) {
    if (!Config.TELEGRAM_BOT_TOKEN) return;
    
    const url = `https://api.telegram.org/bot${Config.TELEGRAM_BOT_TOKEN}/sendChatAction`;
    const payload = {
      chat_id: chatId,
      action: action
    };

    UrlFetchApp.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  }
};
