/**
 * src/services/GeminiService.gs
 * Responsible for interacting with the Google Gemini API.
 */

const GeminiService = {
  /**
   * Analyze a batch of articles using Gemini.
   * Requests a schema suitable for JSON function calling or structured output.
   * @param {Object[]} articles Article data (title, description, url)
   * @returns {Object|null} JSON payload from Gemini, or null if error
   */
  analyzeArticlesBatch: function (articles) {
    if (!articles || articles.length === 0) return null;

    try {
      // Prepare prompt
      const articlesText = articles
        .map((a, i) => {
          return `Article ${i + 1}:\nTitle: ${a.title}\nDescription: ${a.description}\nURL: ${a.url}\n---`;
        })
        .join("\n");

      const prompt = `You are an expert Software Engineer AI assistant. Your task is to process a batch of news articles and generate a structured JSON response.

Here is the batch of articles:
${articlesText}

Requirements:
1. Extract and evaluate ONLY articles that are highly relevant to Software Engineering, Programming, and the Tech Industry.
2. "overview": Write a concise, professional overview of the most important tech news in this batch.
3. "topUpdates": Select the top 3 most important news articles.
4. "articles": For each relevant article, extract its information and assign scores and categories.`;

      const responseSchema = {
        type: "object",
        properties: {
          overview: {
            type: "string",
            description: "A concise, professional overview of the most important tech news in the batch."
          },
          topUpdates: {
            type: "array",
            description: "The top 3 most important news articles.",
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" }
              },
              required: ["title", "url"]
            }
          },
          articles: {
            type: "array",
            description: "List of relevant articles extracted from the batch.",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                category: { type: "string", description: "e.g. AI, Cloud, Frontend, Backend, Tooling" },
                summary: { type: "string", description: "Max 2 sentences." },
                priority: { type: "string", enum: ["High", "Medium", "Low"] },
                relevanceScore: { type: "integer", description: "1-10, rate based on importance for a software engineer" },
                confidenceScore: { type: "integer", description: "1-10, how confident are you in this assessment" }
              },
              required: ["title", "url", "category", "summary", "priority", "relevanceScore", "confidenceScore"]
            }
          }
        },
        required: ["overview", "topUpdates", "articles"]
      };

      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      };

      const response = CommonUtils.retryRequest(
        () => {
          const url = `${Config.GEMINI_API_ENDPOINT}?key=${Config.GEMINI_API_KEY}`;
          const currentResponse = UrlFetchApp.fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            payload: JSON.stringify(requestBody),
            muteHttpExceptions: true,
          });

          const responseCode = currentResponse.getResponseCode();
          const contentText = currentResponse.getContentText();

          if (responseCode !== 200) {
            throw new Error(
              `Gemini API Error (${responseCode}): ${contentText}`,
            );
          }

          return currentResponse;
        },
        Config.RETRY_MAX_ATTEMPTS,
        Config.RETRY_BASE_DELAY_MS,
      );

      const jsonResponse = JSON.parse(response.getContentText());

      if (!jsonResponse.candidates || jsonResponse.candidates.length === 0) {
        throw new Error("No candidates returned from Gemini");
      }

      const rawText = jsonResponse.candidates[0].content.parts[0].text;
      return JSON.parse(rawText);
    } catch (e) {
      AppLogger.error("GeminiService.analyzeArticlesBatch", e);
      return null;
    }
  },

  /**
   * Generate vector embeddings for a given text.
   * @param {string} text Text to embed.
   * @returns {number[]|null} Array of floats representing the embedding, or null on error.
   */
  generateEmbeddings: function (text) {
    if (!text) return null;
    const task = "GeminiService.generateEmbeddings";

    try {
      const url = `${Config.GEMINI_EMBEDDING_ENDPOINT}?key=${Config.GEMINI_API_KEY}`;
      const requestBody = {
        model: "models/gemini-embedding-001",
        content: {
          parts: [{ text: text }]
        },
        outputDimensionality: 768
      };


      const response = CommonUtils.retryRequest(
        () => {
          const currentResponse = UrlFetchApp.fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            payload: JSON.stringify(requestBody),
            muteHttpExceptions: true,
          });

          const responseCode = currentResponse.getResponseCode();
          if (responseCode !== 200) {
            throw new Error(`Gemini Embedding Error (${responseCode}): ${currentResponse.getContentText()}`);
          }
          return currentResponse;
        },
        Config.RETRY_MAX_ATTEMPTS,
        Config.RETRY_BASE_DELAY_MS
      );

      const jsonResponse = JSON.parse(response.getContentText());
      if (jsonResponse.embedding && jsonResponse.embedding.values) {
        return jsonResponse.embedding.values;
      }
      return null;
    } catch (e) {
      AppLogger.error(task, e);
      return null;
    }
  },

  /**
   * Synthesize an answer using RAG context.
   * @param {string} query User query.
   * @param {Object[]} contextArticles Array of article metadata from Vector DB.
   * @returns {string} The final answer.
   */
  answerWithRAG: function (query, contextArticles) {
    const task = "GeminiService.answerWithRAG";
    if (!contextArticles || contextArticles.length === 0) {
      return "Tôi không tìm thấy thông tin phù hợp trong cơ sở dữ liệu để trả lời câu hỏi này.";
    }

    try {
      const contextText = contextArticles.map((a, i) => {
        return `[${i + 1}] Title: ${a.title}\nURL: ${a.url}\nSummary: ${a.summary || ""}\nCategory: ${a.category || ""}\n`;
      }).join("\n");

      const prompt = `You are a helpful Tech Assistant. Answer the user's question using ONLY the context provided below.
If the answer cannot be found in the context, politely state that you don't know based on the current knowledge base.
Provide citations by mentioning the article titles or URLs if useful.

Context:
${contextText}

User Question: ${query}

Answer in Vietnamese:`;

      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2, // Low temperature for more factual answers
        },
      };

      const response = CommonUtils.retryRequest(
        () => {
          const url = `${Config.GEMINI_API_ENDPOINT}?key=${Config.GEMINI_API_KEY}`;
          const currentResponse = UrlFetchApp.fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            payload: JSON.stringify(requestBody),
            muteHttpExceptions: true,
          });

          const responseCode = currentResponse.getResponseCode();
          if (responseCode !== 200) {
            throw new Error(`Gemini RAG Error (${responseCode}): ${currentResponse.getContentText()}`);
          }
          return currentResponse;
        },
        Config.RETRY_MAX_ATTEMPTS,
        Config.RETRY_BASE_DELAY_MS
      );

      const jsonResponse = JSON.parse(response.getContentText());
      if (jsonResponse.candidates && jsonResponse.candidates.length > 0) {
        return jsonResponse.candidates[0].content.parts[0].text;
      }
      return "Xin lỗi, tôi không thể tạo câu trả lời vào lúc này.";
    } catch (e) {
      AppLogger.error(task, e);
      return "Đã xảy ra lỗi khi cố gắng trả lời câu hỏi của bạn.";
    }
  }
};
