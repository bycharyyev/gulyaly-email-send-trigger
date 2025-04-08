import Handlebars from "handlebars";

// Поддерживаемые языки
export const SUPPORTED_LANGUAGES = {
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
export const TEMPLATES = {
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
    }
  }
};

// Функция для получения шаблона
export const getTemplate = (templateName, language) => {
  if (!templateName || !TEMPLATES[templateName]) {
    return null;
  }
  
  if (TEMPLATES[templateName][language]) {
    return TEMPLATES[templateName][language];
  }
  
  if (TEMPLATES[templateName].en) {
    return TEMPLATES[templateName].en;
  }
  
  const availableLanguages = Object.keys(TEMPLATES[templateName]);
  if (availableLanguages.length > 0) {
    return TEMPLATES[templateName][availableLanguages[0]];
  }
  
  return null;
};

// Функция для обработки шаблона
export const processTemplate = (template, data, engine = "simple") => {
  if (engine === "handlebars") {
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(data);
  }
  
  return template.replace(/\${([^}]+)}/g, (match, key) => {
    return data[key] || match;
  });
}; 