// Service gửi email dùng Nodemailer + Gmail App Password
const nodemailer = require('nodemailer');
require('dotenv').config();

// Tạo transporter kết nối tới Gmail SMTP
const transporter = nodemailer.createTransport({
  service: process.env.MAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS, // App Password (không dùng mật khẩu Gmail thường)
  },
});

// =========================================================
// Gửi mail chào mừng khi user đăng ký thành công
// =========================================================
async function sendWelcomeEmail(toEmail, userName) {
  return transporter.sendMail({
    from: `"App Team" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: 'Chào mừng bạn đến với hệ thống!',
    html: `
      <h2>Xin chào ${userName},</h2>
      <p>Cảm ơn bạn đã đăng ký tài khoản. Chúc bạn có trải nghiệm tốt!</p>
    `,
  });
}

// =========================================================
// Gửi mật khẩu mới khi user yêu cầu quên mật khẩu
// =========================================================
async function sendNewPasswordEmail(toEmail, userName, newPassword) {
  const year = new Date().getFullYear();
  return transporter.sendMail({
    from: `"FSSIMS - Hỗ trợ tài khoản" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: '[FSSIMS] Mật khẩu mới của bạn',
    html: `
      <!DOCTYPE html>
      <html lang="vi">
      <head><meta charset="UTF-8" /></head>
      <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
              style="background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

              <tr>
                <td style="background:#1c1c1c;padding:28px 40px;">
                  <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:2px;">FSSIMS</p>
                  <p style="margin:4px 0 0;color:#999;font-size:12px;letter-spacing:1px;">FURNITURE STORE SYSTEM</p>
                </td>
              </tr>

              <tr>
                <td style="padding:36px 40px;">
                  <p style="margin:0 0 8px;font-size:15px;color:#333;">Xin chào <strong>${userName}</strong>,</p>
                  <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.7;">
                    Chúng tôi đã nhận được yêu cầu <strong>đặt lại mật khẩu</strong> cho tài khoản của bạn.
                    Dưới đây là mật khẩu mới:
                  </p>

                  <div style="background:#f8f8f8;border:1px solid #e0e0e0;border-left:4px solid #1c1c1c;
                              padding:16px 24px;margin:0 0 28px;border-radius:2px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">Mật khẩu mới</p>
                    <p style="margin:0;font-size:24px;font-weight:700;color:#1c1c1c;letter-spacing:4px;font-family:monospace;">
                      ${newPassword}
                    </p>
                  </div>

                  <p style="margin:0 0 12px;font-size:13px;color:#d97706;font-weight:600;">
                    &#9888;&#65039; Vì lý do bảo mật, vui lòng đổi mật khẩu ngay sau khi đăng nhập.
                  </p>
                  <p style="margin:0;font-size:13px;color:#888;line-height:1.7;">
                    Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.
                    Tài khoản của bạn vẫn an toàn.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="background:#f8f8f8;border-top:1px solid #ebebeb;padding:20px 40px;">
                  <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">
                    &copy; ${year} FSSIMS. Email này được gửi tự động, vui lòng không trả lời.
                  </p>
                </td>
              </tr>

            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });
}

// =========================================================
// Hàm gửi mail tổng quát (tái sử dụng)
// =========================================================
async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"App Team" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = { sendWelcomeEmail, sendNewPasswordEmail, sendMail };
