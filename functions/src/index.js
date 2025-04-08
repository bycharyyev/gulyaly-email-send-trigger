const functions = require("firebase-functions/v2");
const { logger } = require("firebase-functions/logger");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");

const { checkDocumentSize, checkRecipientCount, sanitizeData } = require("./validation");
const { getUserData, getUserLanguage } = require("./users");
const { getTemplate, processTemplate } = require("./templates");
const { sendEmail, createMailOptions } = require("./email");

// Инициализация Firebase Admin
initializeApp();
const db = getFirestore();

exports.processEmailRequest = functions.firestore
  .document("{collectionId}/{documentId}")
  .onCreate(async (snapshot, context) => {
    const { collectionId, documentId } = context.params;
    const data = snapshot.data();
    
    try {
      logger.info("Processing new document:", { collectionId, documentId });
      
      // Проверка размера документа
      await checkDocumentSize(data);
      
      // Проверка количества получателей
      const recipients = Array.isArray(data.to) ? data.to : [data.to];
      await checkRecipientCount(recipients);
      
      // Получение данных пользователя
      const userData = await getUserData(data.userId, process.env.USER_COLLECTION);
      
      // Определение языка пользователя
      const language = getUserLanguage(data, userData);
      
      // Получение и обработка шаблона
      const template = getTemplate(data.templateName, language);
      const { subject, html, text } = processTemplate(template, { ...data, userData });
      
      // Создание опций для email
      const mailOptions = createMailOptions(recipients, subject, html, text);
      
      // Отправка email
      const info = await sendEmail(mailOptions);
      
      // Обновление статуса документа
      const sanitizedData = sanitizeData(data);
      await db.collection(collectionId).doc(documentId).update({
        status: "completed",
        completedAt: new Date().toISOString(),
        messageId: info.messageId,
        error: null,
        ...sanitizedData
      });
      
      logger.info("Email request processed successfully:", { documentId, messageId: info.messageId });
      
    } catch (error) {
      logger.error("Error processing email request:", error);
      
      // Обновление статуса с ошибкой
      await db.collection(collectionId).doc(documentId).update({
        status: "error",
        error: {
          message: error.message,
          code: error.code || "UNKNOWN_ERROR",
          timestamp: new Date().toISOString()
        }
      });
      
      throw error;
    }
  }); 