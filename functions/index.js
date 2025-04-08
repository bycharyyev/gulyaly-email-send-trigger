import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import nodemailer from "nodemailer";
import Handlebars from "handlebars";

// Инициализация Firebase Admin
const app = initializeApp();
const db = getFirestore();
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

// Функции для проверки размера документа и количества получателей
const checkDocumentSize = (data) => {
  const size = JSON.stringify(data).length / 1024;
  if (size > MAX_DOCUMENT_SIZE_KB) {
    throw new Error(`Document size exceeds limit of ${MAX_DOCUMENT_SIZE_KB}KB`);
  }
};

const checkRecipientCount = (recipients) => {
  if (recipients.length > MAX_RECIPIENTS) {
    throw new Error(`Maximum number of recipients (${MAX_RECIPIENTS}) exceeded`);
  }
};

// Функция для получения данных пользователя
const getUserData = async (userId, userCollection) => {
  if (!userId || !userCollection) return null;
  try {
    const userDoc = await db.collection(userCollection).doc(userId).get();
    return userDoc.exists ? userDoc.data() : null;
  } catch (error) {
    logger.error("Error getting user data:", error);
    return null;
  }
};

// Функция для определения языка пользователя
const getUserLanguage = (docData, userData) => {
  // Проверяем язык в документе
  if (docData.language && SUPPORTED_LANGUAGES[docData.language]) {
    return docData.language;
  }
  
  // Проверяем язык в данных пользователя
  if (userData?.language && SUPPORTED_LANGUAGES[userData.language]) {
    return userData.language;
  }
  
  // Возвращаем язык по умолчанию
  return process.env.DEFAULT_LANGUAGE || "ru";
};

// Функция для получения шаблона
const getTemplate = (templateName, language) => {
  if (!templateName || !TEMPLATES[templateName]) {
    return null;
  }
  
  // Проверяем наличие шаблона на запрошенном языке
  if (TEMPLATES[templateName][language]) {
    return TEMPLATES[templateName][language];
  }
  
  // Если нет, пробуем английский
  if (TEMPLATES[templateName].en) {
    return TEMPLATES[templateName].en;
  }
  
  // Если и английского нет, берем первый доступный язык
  const availableLanguages = Object.keys(TEMPLATES[templateName]);
  if (availableLanguages.length > 0) {
    return TEMPLATES[templateName][availableLanguages[0]];
  }
  
  return null;
};

// Функция для обработки шаблона
const processTemplate = (template, data, engine = "simple") => {
  if (engine === "handlebars") {
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(data);
  }
  
  // Простая замена переменных
  return template.replace(/\${([^}]+)}/g, (match, key) => {
    return data[key] || match;
  });
};

// Функция для очистки чувствительных данных
const sanitizeData = (data) => {
  const sanitized = { ...data };
  const sensitiveFields = ["password", "token", "secret", "key"];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = "***HIDDEN***";
    }
  });
  
  return sanitized;
};

// Функция для проверки email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Функция для повторных попыток
const withRetry = async (fn, maxRetries = 3, delay = 5000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`Attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Основная функция отправки email
export const sendEmail = onDocumentCreated(async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.error("No data associated with the event");
    return;
  }
  
  const documentData = snapshot.data();
  const documentId = snapshot.id;
  const collectionPath = event.params.collectionPath;
  
  try {
    // Проверяем размер документа
    checkDocumentSize(documentData);
    
    // Получаем данные пользователя
    const userData = await getUserData(
      documentData[process.env.USER_ID_FIELD],
      process.env.USER_COLLECTION
    );
    
    // Определяем язык
    const language = getUserLanguage(documentData, userData);
    logger.info(`Using language: ${language}`);
    
    // Получаем шаблон
    const templateName = documentData.templateName;
    const template = templateName ? getTemplate(templateName, language) : null;
    
    // Подготавливаем данные для шаблона
    const templateData = {
      documentId,
      collectionPath,
      documentData: JSON.stringify(sanitizeData(documentData), null, 2),
      user: userData,
      appName: process.env.APP_NAME
    };
    
    // Создаем транспорт для отправки email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    // Определяем получателей
    const recipients = documentData.to || process.env.TO_EMAIL;
    if (!recipients) {
      throw new Error("No recipients specified");
    }
    
    const recipientList = Array.isArray(recipients) ? recipients : recipients.split(",").map(email => email.trim());
    checkRecipientCount(recipientList);
    
    // Проверяем email адреса
    recipientList.forEach(email => {
      if (!isValidEmail(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    });
    
    // Подготавливаем содержимое письма
    let subject, text, html;
    
    if (template) {
      subject = processTemplate(template.subject, templateData, process.env.TEMPLATE_ENGINE);
      text = processTemplate(template.text, templateData, process.env.TEMPLATE_ENGINE);
      html = processTemplate(template.html, templateData, process.env.TEMPLATE_ENGINE);
    } else {
      subject = process.env.EMAIL_SUBJECT || "Новое уведомление";
      text = processTemplate(process.env.EMAIL_TEMPLATE, templateData, process.env.TEMPLATE_ENGINE);
      html = process.env.ENABLE_HTML === "true" ? text : undefined;
    }
    
    // Отправляем email с повторными попытками
    await withRetry(async () => {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: recipientList.join(", "),
        subject,
        text,
        html
      });
    }, parseInt(process.env.MAX_RETRIES), parseInt(process.env.RETRY_DELAY) * 1000);
    
    // Логируем успешную отправку
    if (process.env.ENABLE_LOGGING === "true") {
      await db.collection(process.env.LOG_COLLECTION).add({
        timestamp: new Date(),
        documentId,
        collectionPath,
        recipients: recipientList,
        status: "success",
        template: templateName
      });
    }
    
    logger.info(`Email sent successfully to ${recipientList.join(", ")}`);
  } catch (error) {
    logger.error("Error sending email:", error);
    
    // Логируем ошибку
    if (process.env.ENABLE_LOGGING === "true") {
      await db.collection(process.env.LOG_COLLECTION).add({
        timestamp: new Date(),
        documentId,
        collectionPath,
        error: error.message,
        status: "error"
      });
    }
    
    throw error;
  }
});

// API для отправки email
export const sendEmailApi = onRequest(async (req, res) => {
  // Проверяем аутентификацию
  if (process.env.API_AUTH_REQUIRED === "true") {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    try {
      const token = authHeader.split("Bearer ")[1];
      await auth.verifyIdToken(token);
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
  }
  
  try {
    const { to, subject, text, html, templateName, templateData, language } = req.body;
    
    // Проверяем обязательные параметры
    if (!to) {
      res.status(400).json({ error: "Missing required parameter: to" });
      return;
    }
    
    // Проверяем получателей
    const recipientList = Array.isArray(to) ? to : to.split(",").map(email => email.trim());
    checkRecipientCount(recipientList);
    
    // Проверяем email адреса
    recipientList.forEach(email => {
      if (!isValidEmail(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    });
    
    // Создаем транспорт для отправки email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    // Если указан шаблон, используем его
    if (templateName) {
      const template = getTemplate(templateName, language || process.env.DEFAULT_LANGUAGE);
      if (!template) {
        res.status(400).json({ error: `Template not found: ${templateName}` });
        return;
      }
      
      const data = {
        ...templateData,
        appName: process.env.APP_NAME
      };
      
      subject = processTemplate(template.subject, data, process.env.TEMPLATE_ENGINE);
      text = processTemplate(template.text, data, process.env.TEMPLATE_ENGINE);
      html = processTemplate(template.html, data, process.env.TEMPLATE_ENGINE);
    }
    
    // Отправляем email
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: recipientList.join(", "),
      subject,
      text,
      html
    });
    
    // Логируем успешную отправку
    if (process.env.ENABLE_LOGGING === "true") {
      await db.collection(process.env.LOG_COLLECTION).add({
        timestamp: new Date(),
        recipients: recipientList,
        status: "success",
        template: templateName,
        source: "api"
      });
    }
    
    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    logger.error("Error in sendEmailApi:", error);
    
    // Логируем ошибку
    if (process.env.ENABLE_LOGGING === "true") {
      await db.collection(process.env.LOG_COLLECTION).add({
        timestamp: new Date(),
        error: error.message,
        status: "error",
        source: "api"
      });
    }
    
    res.status(500).json({ error: error.message });
  }
}); 