import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/logger";
import nodemailer from "nodemailer";

import { getTemplate, processTemplate } from "./src/templates.js";
import { checkDocumentSize, checkRecipientCount, sanitizeData } from "./src/validation.js";
import { getUserData, getUserLanguage } from "./src/users.js";

// Инициализация Firebase Admin
initializeApp();
const db = getFirestore();

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
        throw error; // Перебрасываем ошибку после последней попытки
      }
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= factor;
      attempt++;
    }
  }
};

// Основная функция Cloud Function
export const processEmailRequest = onDocumentCreated(process.env.COLLECTION_PATH + "/{documentId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    logger.error("No data associated with the event");
    return;
  }
  const documentData = snap.data();
  const documentId = event.params.documentId;
  const documentRef = snap.ref;

  logger.info(`Processing document ${documentId} in collection ${process.env.COLLECTION_PATH}`);

  try {
    // 0. Обновляем статус на 'processing'
    await documentRef.update({ emailStatus: 'processing', emailProcessingStartedAt: FieldValue.serverTimestamp() });

    // 1. Проверки
    logger.info("Validating document data...");
    checkDocumentSize(documentData);
    const recipients = Array.isArray(documentData.recipients) ? documentData.recipients : [documentData.recipients].filter(Boolean);
    checkRecipientCount(recipients);
    logger.info("Validation successful.");

    // 2. Получаем данные пользователя и язык
    logger.info(`Fetching user data for userId: ${documentData.userId}`);
    const userData = await getUserData(documentData.userId, process.env.USER_COLLECTION || 'users');
    const language = getUserLanguage(documentData, userData, process.env.DEFAULT_LANGUAGE || 'en');
    logger.info(`User data fetched. Language determined: ${language}`);

    // 3. Получаем и обрабатываем шаблон
    logger.info(`Getting template: ${documentData.template}`);
    const template = getTemplate(documentData.template, language, process.env.DEFAULT_LANGUAGE || 'en');
    if (!template) {
      throw new Error(`Template '${documentData.template}' not found for language '${language}' or default language.`);
    }
    logger.info("Template found. Processing template...");
    const templateData = { ...documentData, userData, documentId };
    const emailSubject = processTemplate(template.subject || documentData.subject || 'Notification', templateData, process.env.TEMPLATE_ENGINE || 'simple');
    const emailHtml = processTemplate(template.html || documentData.html || template.text || '', templateData, process.env.TEMPLATE_ENGINE || 'simple');
    const emailText = processTemplate(template.text || documentData.text || '', templateData, process.env.TEMPLATE_ENGINE || 'simple');
    logger.info("Template processed successfully.");

    // 4. Настраиваем Nodemailer
    logger.info("Configuring Nodemailer transporter...");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    logger.info("Nodemailer transporter configured.");

    // 5. Формируем опции письма
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: recipients.join(', '),
      subject: emailSubject,
      html: emailHtml,
      text: emailText // Добавляем текстовую версию для клиентов без HTML
    };

    // Опционально скрываем чувствительные данные перед логированием
    const logData = process.env.SANITIZE_SENSITIVE_DATA === 'true' ? sanitizeData(mailOptions) : mailOptions;
    logger.info("Sending email with options:", logData);

    // 6. Отправляем email с повторными попытками
    const info = await withRetry(() => transporter.sendMail(mailOptions), parseInt(process.env.MAX_RETRIES || "3", 10), parseInt(process.env.RETRY_DELAY || "5", 10) * 1000);
    logger.info('Email sent successfully:', { messageId: info.messageId });

    // 7. Обновляем статус в документе на 'sent'
    await documentRef.update({
      emailStatus: 'sent',
      emailSentAt: FieldValue.serverTimestamp(),
      emailMessageId: info.messageId,
      emailError: FieldValue.delete(), // Удаляем предыдущую ошибку, если была
    });
    logger.info(`Document ${documentId} status updated to 'sent'.`);

  } catch (error) {
    logger.error(`Error processing document ${documentId}:`, error);

    // Обновляем статус с ошибкой
    try {
      await documentRef.update({
        emailStatus: 'error',
        emailError: error.message || 'Unknown error',
        emailErrorAt: FieldValue.serverTimestamp(),
      });
      logger.info(`Document ${documentId} status updated to 'error'.`);
    } catch (updateError) {
      logger.error(`Failed to update document ${documentId} with error status:`, updateError);
    }

    // Не перебрасываем ошибку дальше, чтобы функция не пыталась повториться бесконечно
    // throw error;
  }
}); 