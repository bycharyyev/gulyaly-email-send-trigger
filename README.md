# Email Send Trigger

Firebase Extension для отправки email при создании документа в Firestore.

## Установка

```bash
firebase ext:install gulyaly/gulyaly-email-send-trigger
```

## Конфигурация

1. SMTP_HOST - хост SMTP сервера
2. SMTP_PORT - порт SMTP сервера
3. SMTP_USERNAME - имя пользователя SMTP
4. SMTP_PASSWORD - пароль SMTP
5. FROM_EMAIL - email отправителя
6. COLLECTION_PATH - путь к коллекции Firestore

## Использование

Создайте документ в указанной коллекции с полем `email`:

```javascript
await db.collection('your-collection').add({
  email: 'recipient@example.com'
});
```

Email будет отправлен автоматически при создании документа.

## Поддерживаемые языки

- Русский (ru)
- English (en)
- Español (es)
- Français (fr)
- Deutsch (de)
- Italiano (it)
- Português (pt)
- Türkçe (tr)
- 中文 (zh)
- 日本語 (ja)
- 한국어 (ko)
- العربية (ar)

## Лицензия

Apache-2.0
