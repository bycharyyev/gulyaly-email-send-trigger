# Email Trigger for Firestore

Firebase Extension для отправки email при создании документа в Firestore.

## Установка

```bash
firebase ext:install gulyaly/gulyaly-email-send-trigger@0.0.6
```

## Конфигурация

После установки необходимо настроить следующие параметры:

- SMTP_HOST: Хост SMTP сервера
- SMTP_PORT: Порт SMTP сервера (по умолчанию 587)
- SMTP_USERNAME: Имя пользователя SMTP
- SMTP_PASSWORD: Пароль SMTP
- FROM_EMAIL: Email отправителя
- COLLECTION_PATH: Путь к коллекции (по умолчанию "emails")
- DEFAULT_LANGUAGE: Язык по умолчанию (ru или en)

## Использование

1. Создайте документ в указанной коллекции
2. Расширение автоматически отправит email

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
