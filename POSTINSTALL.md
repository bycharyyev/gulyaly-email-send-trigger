# Использование Email Trigger for Firestore

Поздравляем! Вы успешно установили расширение Email Trigger for Firestore.

## Начало работы

1. Создайте документ в коллекции `${param:COLLECTION_PATH}`:

```javascript
{
  "to": "recipient@example.com",
  "subject": "Тестовое письмо",
  "text": "Привет!",
  "html": "<h1>Привет!</h1>",
  "language": "ru"
}
```

2. Или используйте готовый шаблон:

```javascript
{
  "to": "recipient@example.com",
  "template": "birthday",
  "language": "ru",
  "userId": "user123",
  "userCollection": "users"
}
```

## Проверка работы

1. Проверьте логи в Firebase Console
2. Проверьте почтовый ящик получателя

## Устранение неполадок

Если письма не отправляются:

1. Проверьте SMTP настройки
2. Убедитесь, что email адреса корректны
3. Проверьте логи функции в Firebase Console

## Дополнительная информация

- [Документация](https://github.com/bycharyyev/gulyaly-email-send-trigger)
- [Сообщить об ошибке](https://github.com/bycharyyev/gulyaly-email-send-trigger/issues)

## Параметры расширения

- SMTP_HOST: ${param:SMTP_HOST}
- SMTP_PORT: ${param:SMTP_PORT}
- FROM_EMAIL: ${param:FROM_EMAIL}
- COLLECTION_PATH: ${param:COLLECTION_PATH}
- DEFAULT_LANGUAGE: ${param:DEFAULT_LANGUAGE} 