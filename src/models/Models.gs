/**
 * src/Models.gs
 * Chứa JSDoc Definitions cho các kiểu dữ liệu sử dụng trong ứng dụng.
 * Sẽ hữu ích cho autocomplete và hiểu rõ cấu trúc dữ liệu truyền qua lại.
 */

/**
 * @typedef {Object} Article
 * @property {string} title - Tiêu đề bài báo.
 * @property {string} description - Tóm tắt hoặc nội dung ngắn.
 * @property {string} url - Đường dẫn tới bài báo.
 * @property {string} [urlToImage] - Đường dẫn ảnh thumbnail.
 * @property {string} [publishedAt] - Thời gian xuất bản (ISO 8601).
 * @property {Object} [source] - Nguồn bài báo.
 */

/**
 * @typedef {Object} ProcessedArticle
 * @property {string} title - Tiêu đề bài báo.
 * @property {string} url - Đường dẫn tới bài báo.
 * @property {string} category - Thể loại (AI, Web, Cloud, etc.).
 * @property {string} summary - Bản tóm tắt tiếng Việt.
 * @property {string} priority - Độ ưu tiên (High, Medium, Low).
 */

/**
 * @typedef {Object} FunctionCall
 * @property {"updateSheet" | "sendEmail"} action - Hành động do AI quyết định.
 * @property {Object} payload - Dữ liệu thực thi.
 */

/**
 * @typedef {Object} GeminiOutput
 * @property {string} summaryReport - Đánh giá tổng quan các bài viết.
 * @property {FunctionCall[]} functionCalls - Các hành động cần thực hiện.
 */
