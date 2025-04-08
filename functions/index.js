import { initializeApp } from "firebase-admin/app";
import { Firestore } from "@google-cloud/firestore";
import { getAuth } from "firebase-admin/auth";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import nodemailer from "nodemailer";
import Handlebars from "handlebars";

import { getTemplate, processTemplate } from "./src/templates";
import { checkDocumentSize, checkRecipientCount, sanitizeData, isValidEmail } from "./src/validation";
import { getUserData, getUserLanguage } from "./src/users";

// Инициализация Firebase Admin
const app = initializeApp();
const firestore = new Firestore();
const auth = getAuth();

// Константы
const MAX_RECIPIENTS = 100;
const MAX_DOCUMENT_SIZE_KB = 1024;
const MAX_EMAIL_SIZE_KB = 1024;

// Поддерживаемые языки
const SUPPORTED_LANGUAGES = {
  ru: "Русский",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  tr: "Türkçe",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  ar: "العربية"
};

// Готовые шаблоны
const TEMPLATES = {
  birthday: {
    ru: {
      subject: "С Днем Рождения!",
      text: "Поздравляем {{name}} с Днем Рождения!"
    },
    en: {
      subject: "Happy Birthday!",
      text: "Congratulations {{name}} on your Birthday!"
    }
  },
  verification: {
    ru: {
      subject: "Подтверждение email",
      text: "Пожалуйста, подтвердите ваш email: {{verificationLink}}"
    },
    en: {
      subject: "Email verification",
      text: "Please verify your email: {{verificationLink}}"
    }
  }
};

// Создаем транспорт для отправки email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD
  }
});

// Функция для повторных попыток
const withRetry = async (fn, maxRetries = 3, delay = 5000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Основная функция отправки email
const sendEmail = async (data) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === 465,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD
    }
  });

  return await transporter.sendMail(data);
};

// Cloud Function для отправки email при создании документа
export const sendEmailOnCreate = onDocumentCreated(process.env.COLLECTION_PATH, async (event) => {
  const docData = event.data.data();
  
  try {
    // Проверки
    checkDocumentSize(docData);
    checkRecipientCount(Array.isArray(docData.to) ? docData.to : [docData.to]);
    
    // Получаем данные пользователя
    const userData = await getUserData(docData.userId, docData.userCollection);
    const language = getUserLanguage(docData, userData);
    
    // Получаем и обрабатываем шаблон
    const template = TEMPLATES[docData.template]?.[language] || TEMPLATES[docData.template]?.[process.env.DEFAULT_LANGUAGE] || TEMPLATES.verification[language];
    const emailData = {
      from: process.env.FROM_EMAIL,
      to: docData.to,
      subject: processTemplate(template?.subject || docData.subject, { ...docData, user: userData }),
      text: processTemplate(template?.text || docData.text, { ...docData, user: userData }, docData.templateEngine),
      html: processTemplate(template?.html || docData.html, { ...docData, user: userData }, docData.templateEngine)
    };
    
    // Отправляем email с повторными попытками
    await withRetry(() => sendEmail(emailData));
    
    // Логируем успех
    logger.info("Email sent successfully", sanitizeData(emailData));
    
  } catch (error) {
    logger.error("Error sending email:", error);
    throw error;
  }
});

// API endpoint для отправки email
export const sendEmailApi = onRequest(async (req, res) => {
  try {
    const { to, subject, template, data, language } = req.body;
    
    // Валидация
    if (!to || !isValidEmail(to)) {
      throw new Error("Invalid recipient email");
    }
    
    // Получаем и обрабатываем шаблон
    const emailTemplate = TEMPLATES[template]?.[language] || TEMPLATES[template]?.[process.env.DEFAULT_LANGUAGE] || TEMPLATES.verification[language];
    const emailData = {
      from: process.env.FROM_EMAIL,
      to,
      subject: processTemplate(emailTemplate?.subject || subject, data),
      text: processTemplate(emailTemplate?.text || data.text, data),
      html: processTemplate(emailTemplate?.html || data.html, data)
    };
    
    // Отправляем email
    await sendEmail(emailData);
    
    res.json({ success: true });
  } catch (error) {
    logger.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { getTemplate, processTemplate } = require('./src/templates');
const { checkDocumentSize, checkRecipientCount, sanitizeData, isValidEmail } = require('./src/validation');
const { getUserData, getUserLanguage } = require('./src/users');

admin.initializeApp();

const db = admin.firestore();

exports.sendEmail = functions.firestore
  .document('{collectionPath}/{documentId}')
  .onCreate(async (snap, context) => {
    const documentData = snap.data();
    const collectionPath = context.params.collectionPath;
    const documentId = context.params.documentId;

    try {
      // Проверяем размер документа
      checkDocumentSize(documentData);

      // Получаем получателей
      const recipients = documentData.recipients || [];
      checkRecipientCount(recipients);

      // Получаем данные пользователя и язык
      const userData = await getUserData(documentData.userId, process.env.USER_COLLECTION);
      const language = getUserLanguage(documentData, userData);

      // Получаем шаблон
      const template = getTemplate(documentData.template, language);
      if (!template) {
        throw new Error(`Template ${documentData.template} not found for language ${language}`);
      }

      // Обрабатываем шаблон
      const processedTemplate = processTemplate(template, {
        ...documentData,
        userData,
        documentId
      });

      // Создаем транспорт
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD
        }
      });

      // Отправляем email
      const mailOptions = {
        from: process.env.FROM_EMAIL,
        to: recipients.join(', '),
        subject: documentData.subject || 'Notification',
        html: processedTemplate
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);

      // Обновляем статус в документе
      await snap.ref.update({
        emailStatus: 'sent',
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        emailMessageId: info.messageId
      });

    } catch (error) {
      console.error('Error sending email:', error);
      
      // Обновляем статус с ошибкой
      await snap.ref.update({
        emailStatus: 'error',
        emailError: error.message,
        emailErrorAt: admin.firestore.FieldValue.serverTimestamp()
      });

      throw error;
    }
  }); 