import nodemailer from "nodemailer";
import { logger } from "firebase-functions/logger";

// Функция для повторных попыток с экспоненциальной задержкой
const withRetry = async (fn, maxRetries = 3, delay = 1000, factor = 2) => {
  let attempt = 1;
  let currentDelay = delay;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      logger.warn(`Attempt ${attempt} failed: ${error.message}. Retrying in ${currentDelay}ms...`);
      if (attempt === maxRetries) {
        logger.error(`Max retries (${maxRetries}) reached. Error:`, error);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= factor;
      attempt++;
    }
  }
};

// Создание транспорта для отправки email
export const createEmailTransport = () => {
  logger.info("Configuring Nodemailer transporter...");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  logger.info("Nodemailer transporter configured.");
  return transporter;
};

// Отправка email с повторными попытками
export const sendEmail = async (mailOptions) => {
  const transporter = createEmailTransport();
  const info = await withRetry(
    () => transporter.sendMail(mailOptions),
    parseInt(process.env.MAX_RETRIES || "3", 10),
    parseInt(process.env.RETRY_DELAY || "5", 10) * 1000
  );
  logger.info('Email sent successfully:', { messageId: info.messageId });
  return info;
};

// Формирование опций для отправки email
export const createMailOptions = (recipients, emailSubject, emailHtml, emailText) => {
  return {
    from: process.env.FROM_EMAIL,
    to: Array.isArray(recipients) ? recipients.join(', ') : recipients,
    subject: emailSubject,
    html: emailHtml,
    text: emailText
  };
}; 