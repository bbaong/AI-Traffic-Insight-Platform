import nodemailer from 'nodemailer';

//이메일 전송 설정
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,          // 587 포트면 false (STARTTLS), 465면 true
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

//이메일 발송
export async function sendPdfByEmail(params: {
    toEmail: string;
    subject: string;
    text: string;
    filename: string;
    pdfBuffer: Buffer;
  }): Promise<void> {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: params.toEmail,
      subject: params.subject,
      text: params.text,
      attachments: [
        {
          filename: params.filename,
          content: params.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }