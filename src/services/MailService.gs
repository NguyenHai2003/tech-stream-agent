/**
 * src/services/MailService.gs
 * Responsible for sending the aggregated email.
 */

const MailService = {
  /**
   * Send email using GAS MailApp.
   * @param {Object} payload Contains email info (subject, htmlBody)
   */
  sendEmail: function (payload) {
    runSafely("MailService.sendEmail", () => {
      const recipient = Config.RECIPIENT_EMAIL;
      if (!recipient) {
        throw new Error("RECIPIENT_EMAIL is not configured.");
      }

      const subject =
        payload.subject ||
        `[Tech Stream Agent] Tech News Report - ${new Date().toLocaleDateString()}`;
      
      const data = payload.data;
      if (!data) {
        throw new Error("No data available to send email.");
      }

      let htmlBody = this.generateHtmlEmail(data);

      // Automatically add footer to body
      htmlBody += `<br><hr><p style="font-size: 12px; color: gray;">
        <i>This email was sent automatically by Tech Stream Agent (running on Google Apps Script).</i>
      </p>`;

      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        htmlBody: htmlBody,
      });

      AppLogger.info("MailService.sendEmail", "Email sent successfully", {
        to: recipient,
      });
    });
  },

  generateHtmlEmail: function(data) {
    const overview = data.overview || "";
    const topUpdates = Array.isArray(data.topUpdates) ? data.topUpdates : [];
    const articles = Array.isArray(data.articles) ? data.articles : [];
    
    // Helper to escape HTML to prevent XSS and formatting issues
    const escapeHtml = (unsafe) => {
        return String(unsafe || "")
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    let html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">`;
    
    if (overview) {
      html += `<h2>Overview (AI Report)</h2>`;
      html += `<p style="white-space: pre-wrap;">${escapeHtml(overview)}</p>`;
      html += `<hr style="border-top: 1px solid #eee;">`;
    }

    if (topUpdates.length > 0) {
      html += `<h2>⚡ Quick TL;DR</h2>`;
      html += `<ul>`;
      topUpdates.forEach(update => {
        const title = escapeHtml(update.title);
        const url = escapeHtml(update.url);
        if (title && url) {
          html += `<li style="margin-bottom: 8px;"><a href="${url}" style="font-weight: bold; color: #1a73e8; text-decoration: none;">${title}</a></li>`;
        }
      });
      html += `</ul>`;
      html += `<hr style="border-top: 1px solid #eee;">`;
    }

    const highPriority = articles.filter(a => String(a.priority || "").toLowerCase() === "high");
    
    if (highPriority.length > 0) {
      html += `<h2>Top News (High Priority)</h2>`;
      html += `<ul>`;
      highPriority.forEach(article => {
        const title = escapeHtml(article.title);
        const url = escapeHtml(article.url);
        const summary = escapeHtml(article.summary);
        const category = escapeHtml(article.category);
        if (title && url) {
           html += `<li style="margin-bottom: 15px;">`;
           html += `<a href="${url}" style="font-weight: bold; color: #1a73e8; font-size: 16px; text-decoration: none;">${title}</a>`;
           if (category) html += ` <span style="background-color: #f1f3f4; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #5f6368;">${category}</span>`;
           if (summary) html += `<p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">${summary}</p>`;
           html += `</li>`;
        }
      });
      html += `</ul>`;
    }

    html += `</div>`;
    return html;
  }
};
