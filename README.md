# Email Trigger for Firestore

Это расширение Firebase автоматически отправляет электронные письма при создании документов в Firestore. Поддерживает множество языков и настраиваемые шаблоны.

## Возможности

- 🌍 Многоязычная поддержка (русский, английский, испанский)
- 📧 Настраиваемые шаблоны писем
- 🔒 Безопасная отправка через SMTP
- 📝 Поддержка HTML и текстовых форматов
- 🔄 Автоматические повторные попытки при ошибках

## Установка

1. В Firebase Console перейдите в раздел Extensions
2. Найдите "Email Trigger for Firestore"
3. Нажмите "Install"
4. Настройте параметры:
   - SMTP настройки
   - Путь к коллекции
   - Язык по умолчанию

Или через Firebase CLI:

```bash
firebase ext:install gulyaly/gulyaly-email-send-trigger
```

## Использование

### Структура документа

```javascript
{
  "to": "recipient@example.com", // или массив адресов
  "subject": "Тема письма",
  "text": "Текст письма",
  "html": "<p>HTML версия письма</p>",
  "template": "birthday", // или "verification"
  "language": "ru", // или "en", "es"
  "userId": "user123",
  "userCollection": "users"
}
```

### Готовые шаблоны

1. День рождения (`birthday`)
2. Подтверждение email (`verification`)

## Параметры конфигурации

| Параметр | Описание |
|----------|-----------|
| SMTP_HOST | Хост SMTP сервера |
| SMTP_PORT | Порт SMTP сервера |
| SMTP_USERNAME | Имя пользователя SMTP |
| SMTP_PASSWORD | Пароль SMTP |
| FROM_EMAIL | Email отправителя |
| COLLECTION_PATH | Путь к коллекции |
| DEFAULT_LANGUAGE | Язык по умолчанию |

## Разработка

```bash
git clone https://github.com/bycharyyev/gulyaly-email-send-trigger
cd gulyaly-email-send-trigger
npm install
```

## Лицензия

Apache-2.0
