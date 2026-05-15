# Báo cáo chi tiết dự án: Tech Stream Agent

## 1. Tổng quan dự án
Dự án **Tech Stream Agent** là một hệ thống tự động hóa luồng xử lý tin tức công nghệ, chạy trên môi trường Google Apps Script (GAS). Hệ thống thực hiện việc thu thập tin tức từ NewsAPI, sử dụng trí tuệ nhân tạo (Gemini AI) để tóm tắt và phân loại, sau đó lưu trữ vào Google Sheets và gửi báo cáo qua email hàng ngày.

## 2. Công nghệ sử dụng
- **Nền tảng**: Google Apps Script (GAS)
- **API Tin tức**: NewsAPI
- **AI**: Gemini API (để tóm tắt, phân loại và gọi hàm)
- **Lưu trữ**: Google Sheets
- **Giao tiếp**: Gmail (Gửi email báo cáo)
- **Công cụ quản lý**: `clasp` (Google Command Line Apps Script Projects)

## 3. Cấu trúc thư mục
Dự án được tổ chức theo kiến trúc hướng dịch vụ (SOA) và được tối ưu hóa cho AI Agent:
- `/src`: Chứa mã nguồn chính.
    - `Main.gs`: Điểm vào của ứng dụng, điều phối các luồng xử lý.
    - `appsscript.json`: Cấu hình của Google Apps Script.
    - `/config`: Chứa cấu hình hệ thống (API Keys, IDs...).
    - `/models`: Định nghĩa kiểu dữ liệu (JSDoc).
    - `/services`: Các dịch vụ cốt lõi:
        - `NewsService.gs`: Thu thập và lọc tin tức.
        - `GeminiService.gs`: Tương tác với Gemini AI.
        - `SheetService.gs`: Thao tác với Google Sheets.
        - `MailService.gs`: Gửi email.
- `.agent-skill/`: Thư mục đặc biệt chứa tài liệu và hướng dẫn dành cho AI Agent, giúp Agent hiểu ngữ cảnh và giới hạn của GAS.

## 4. Các tính năng chính
- **Thu thập tin tức**: Tự động lấy tin tức công nghệ mới nhất.
- **Xử lý bằng AI**: Tóm tắt nội dung, phân loại chủ đề và định dạng dữ liệu.
- **Lưu trữ tự động**: Ghi dữ liệu đã xử lý vào Google Sheets.
- **Báo cáo hàng ngày**: Gửi email tổng hợp tin tức mỗi buổi sáng.

## 5. Đánh giá hiện tại
- Dự án có cấu trúc rõ ràng, dễ bảo trì.
- Việc tích hợp sẵn tài liệu cho AI Agent (`.agent-skill`) là một điểm cộng lớn, giúp các công cụ tự động hóa như Antigravity dễ dàng tiếp cận và làm việc hiệu quả.
- Mã nguồn hiện tại (ví dụ `NewsService.gs`) được viết sạch sẽ, có xử lý lỗi và log đầy đủ.
