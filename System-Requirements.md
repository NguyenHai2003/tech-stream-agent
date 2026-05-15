### 1. Mục tiêu (Objective)

Xây dựng một AI Agent tự động hóa quy trình thu thập, phân tích và báo cáo tin tức công nghệ từ các nguồn uy tín, giúp người dùng tiết cập nhật kiến thức mới mà không cần đọc thủ công hàng ngày.

### 2. Yêu cầu chức năng (Functional Requirements)

* **Thu thập dữ liệu (Data Fetching):** Tự động quét tin tức từ các nguồn RSS hoặc News API (Free tier).
* **Xử lý thông minh (AI Processing):**
  * Phân loại tin tức theo chủ đề (AI, Cloud, Security, v.v.).
  * Tóm tắt nội dung bài báo (không quá 100 từ).
  * Lọc bỏ các tin tức rác hoặc không liên quan.
* **Lưu trữ (Storage):** Tự động ghi lại các tin đã xử lý vào Google Sheets để tra cứu.
* **Thông báo (Notification):** Gửi email tổng hợp các tin "Headline" nhất vào Gmail người dùng.
* **Tương tác qua Agent (Function Calling):** Agent phải biết tự ra quyết định: "Khi nào cần lưu vào Sheets" và "Khi nào cần gửi Email" dựa trên mức độ quan trọng của tin.

### 3. Yêu cầu kỹ thuật (Technical Stack)

* **LLM:** Gemini 3 Flash (via Google AI Studio API).
* **Runtime:** Google Apps Script (Miễn phí, không cần server).
* **Database:** Google Sheets.
* **Communication:** Gmail Service.
* **News Source:** NewsAPI.org.
