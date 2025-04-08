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
const db = new Firestore();
const auth = getAuth();

// Константы
const MAX_RECIPIENTS = 10;
const MAX_DOCUMENT_SIZE_KB = 1024;
const MAX_EMAIL_SIZE_KB = 10240;

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
      text: "Дорогой {{user.name}},\n\nПоздравляем вас с Днем Рождения! Желаем вам всего самого наилучшего!\n\nС уважением,\n{{appName}}",
      html: `
        <h1>С Днем Рождения!</h1>
        <p>Дорогой <strong>{{user.name}}</strong>,</p>
        <p>Поздравляем вас с Днем Рождения! Желаем вам всего самого наилучшего!</p>
        <p>С уважением,<br>{{appName}}</p>
      `
    },
    en: {
      subject: "Happy Birthday!",
      text: "Dear {{user.name}},\n\nHappy Birthday! We wish you all the best!\n\nBest regards,\n{{appName}}",
      html: `
        <h1>Happy Birthday!</h1>
        <p>Dear <strong>{{user.name}}</strong>,</p>
        <p>Happy Birthday! We wish you all the best!</p>
        <p>Best regards,<br>{{appName}}</p>
      `
    },
    es: {
      subject: "¡Feliz Cumpleaños!",
      text: "Estimado/a {{user.name}},\n\n¡Feliz Cumpleaños! ¡Le deseamos todo lo mejor!\n\nSaludos,\n{{appName}}",
      html: `
        <h1>¡Feliz Cumpleaños!</h1>
        <p>Estimado/a <strong>{{user.name}}</strong>,</p>
        <p>¡Feliz Cumpleaños! ¡Le deseamos todo lo mejor!</p>
        <p>Saludos,<br>{{appName}}</p>
      `
    }
  },
  verification: {
    ru: {
      subject: "Подтверждение email",
      text: "Дорогой {{user.name}},\n\nПожалуйста, подтвердите ваш email, перейдя по ссылке: {{verificationLink}}\n\nС уважением,\n{{appName}}",
      html: `
        <h1>Подтверждение email</h1>
        <p>Дорогой <strong>{{user.name}}</strong>,</p>
        <p>Пожалуйста, подтвердите ваш email, перейдя по ссылке:</p>
        <p><a href="{{verificationLink}}">Подтвердить email</a></p>
        <p>С уважением,<br>{{appName}}</p>
      `
    },
    en: {
      subject: "Email Verification",
      text: "Dear {{user.name}},\n\nPlease verify your email by clicking the link: {{verificationLink}}\n\nBest regards,\n{{appName}}",
      html: `
        <h1>Email Verification</h1>
        <p>Dear <strong>{{user.name}}</strong>,</p>
        <p>Please verify your email by clicking the link:</p>
        <p><a href="{{verificationLink}}">Verify Email</a></p>
        <p>Best regards,<br>{{appName}}</p>
      `
    },
    es: {
      subject: "Verificación de email",
      text: "Estimado/a {{user.name}},\n\nPor favor, verifique su email haciendo clic en el enlace: {{verificationLink}}\n\nSaludos,\n{{appName}}",
      html: `
        <h1>Verificación de email</h1>
        <p>Estimado/a <strong>{{user.name}}</strong>,</p>
        <p>Por favor, verifique su email haciendo clic en el enlace:</p>
        <p><a href="{{verificationLink}}">Verificar Email</a></p>
        <p>Saludos,<br>{{appName}}</p>
      `
    }
  }
};

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
    const template = getTemplate(docData.template, language);
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
    const emailTemplate = getTemplate(template, language);
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