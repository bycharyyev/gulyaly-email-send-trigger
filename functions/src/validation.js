// Константы
const MAX_RECIPIENTS = 10;
const MAX_DOCUMENT_SIZE_KB = 1024;
const MAX_EMAIL_SIZE_KB = 10240;

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

// Валидация email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

module.exports = {
  checkDocumentSize,
  checkRecipientCount,
  sanitizeData,
  isValidEmail
}; 