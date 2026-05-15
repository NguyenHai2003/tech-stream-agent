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
};
