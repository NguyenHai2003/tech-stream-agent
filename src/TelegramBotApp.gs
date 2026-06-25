/**
 * src/TelegramBotApp.gs
 * Handles incoming Telegram webhook updates and executes the RAG workflow.
 * 
 * ARCHITECTURAL STANDARDS:
 * 1. RAG Workflow: Gemini Embedding (768d) -> Supabase pgvector -> Gemini RAG Synthesis.
 * 2. HTML Resilience: Automatic fallback to Plain Text if Telegram throws HTTP 400 (entity parse error).
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
      //
      // UX: Placeholder-then-Edit pattern
      // 1. Send a placeholder message immediately so the user knows the bot is working.
      // 2. Run RAG pipeline (Embedding → Supabase → Gemini).
      // 3. Edit the placeholder with the final answer via editMessageText.
      // This keeps the chat clean (1 message, not 2) and gives instant feedback.

      // 1. Send placeholder message & capture its message_id
      const placeholderMsgId = this.sendMessageAndGetId(chatId, "⏳ Đang tìm kiếm và tổng hợp thông tin...");

      // 2. Generate embedding for user query
      const queryEmbedding = GeminiService.generateEmbeddings(text);
      if (!queryEmbedding) {
        this.editOrSendMessage(chatId, placeholderMsgId, "❌ Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn (Lỗi Embedding).");
        return HtmlService.createHtmlOutput("OK");
      }

      // 3. Search Supabase for similar articles
      const similarArticles = SupabaseService.searchSimilar(queryEmbedding, Config.TOP_K_RESULTS);
      if (!similarArticles || similarArticles.length === 0) {
        this.editOrSendMessage(chatId, placeholderMsgId, "🔍 Xin lỗi, tôi không tìm thấy tin tức nào liên quan đến câu hỏi của bạn trong cơ sở dữ liệu.");
        return HtmlService.createHtmlOutput("OK");
      }

      // 4. Generate answer with RAG (heaviest step)
      try {
        const answer = GeminiService.answerWithRAG(text, similarArticles);
        // 5. Replace placeholder with the final answer
        this.editOrSendMessage(chatId, placeholderMsgId, answer);
      } catch (ragError) {
        AppLogger.error(task, ragError);
        // [DEBUG] Expose actual error detail to help diagnose Gemini failures.
        // Remove the error detail line once the root cause is identified.
        const debugMsg = "❌ Xin lỗi, tôi gặp sự cố khi tổng hợp câu trả lời.\n\n"
          + "<i>🔧 Debug: " + String(ragError.message || ragError).substring(0, 300) + "</i>";
        this.editOrSendMessage(chatId, placeholderMsgId, debugMsg);
      }

      return HtmlService.createHtmlOutput("OK");
    } catch (error) {
      AppLogger.error(task, error);
      if (payload && payload.message && payload.message.chat) {
        this.sendMessage(payload.message.chat.id, "❌ Đã xảy ra lỗi hệ thống khi xử lý câu hỏi của bạn.");
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
      parse_mode: "HTML"
    };

    const response = UrlFetchApp.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    // Nếu Telegram từ chối do lỗi parse HTML (HTTP 400 Can't parse entities)
    // Lập tức fallback gửi lại bằng Plain Text (bỏ parse_mode)
    if (responseCode !== 200) {
      AppLogger.warn("TelegramBotApp.sendMessage", `HTML parse error (${responseCode}): ${response.getContentText()}. Fallback to plain text.`);
      
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
   * Send a text message and return its message_id (for later editing).
   * @param {number} chatId The Telegram chat ID.
   * @param {string} text The message text.
   * @returns {number|null} The message_id, or null if sending failed.
   */
  sendMessageAndGetId: function (chatId, text) {
    if (!Config.TELEGRAM_BOT_TOKEN || !text) return null;

    const url = `https://api.telegram.org/bot${Config.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML"  // Must match parse_mode used in editMessageText
    };

    const response = UrlFetchApp.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      return result.result && result.result.message_id ? result.result.message_id : null;
    }

    AppLogger.warn("TelegramBotApp.sendMessageAndGetId", `Failed to send placeholder: ${response.getContentText()}`);
    return null;
  },

  /**
   * Edit an existing message's text via Telegram editMessageText API.
   * Supports HTML with automatic fallback to Plain Text.
   * @param {number} chatId The Telegram chat ID.
   * @param {number} messageId The message_id to edit.
   * @param {string} text The new text content.
   * @returns {boolean} True if edit succeeded.
   */
  editMessageText: function (chatId, messageId, text) {
    if (!Config.TELEGRAM_BOT_TOKEN || !messageId) return false;

    const url = `https://api.telegram.org/bot${Config.TELEGRAM_BOT_TOKEN}/editMessageText`;
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "HTML"
    };

    const response = UrlFetchApp.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    if (responseCode === 200) return true;

    // Telegram returns 400 "message is not modified" when content is identical — treat as success.
    const responseBody = response.getContentText();
    if (responseCode === 400 && responseBody.includes("message is not modified")) {
      return true;
    }

    // Fallback: retry without parse_mode if HTML parsing failed (HTTP 400)
    AppLogger.warn("TelegramBotApp.editMessageText", `HTML parse error (${responseCode}): ${responseBody}. Fallback to plain text.`);

    const fallbackPayload = {
      chat_id: chatId,
      message_id: messageId,
      text: text
    };

    const fallbackResponse = UrlFetchApp.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify(fallbackPayload),
      muteHttpExceptions: true
    });

    return fallbackResponse.getResponseCode() === 200;
  },

  /**
   * Edit the placeholder message if possible, otherwise send a new message.
   * @param {number} chatId The Telegram chat ID.
   * @param {number|null} messageId The placeholder message_id to edit.
   * @param {string} text The message text.
   */
  editOrSendMessage: function (chatId, messageId, text) {
    if (messageId) {
      const success = this.editMessageText(chatId, messageId, text);
      if (success) return;
    }
    // Fallback: send as new message if edit failed or no messageId
    this.sendMessage(chatId, text);
  }
};
