# Инструкции перед установкой

Перед установкой расширения Firestore Trigger Email, убедитесь, что у вас есть:

1. **Firebase проект**
   - Созданный проект в Firebase Console
   - Включенный Cloud Firestore
   - Настроенные правила безопасности Firestore

2. **SMTP сервер**
   - Доступ к SMTP серверу
   - Учетные данные для аутентификации
   - Поддерживаемый порт (обычно 587 для TLS или 465 для SSL)

3. **Необходимые разрешения**
   - Права на создание Cloud Functions
   - Права на управление переменными окружения
   - Права на чтение и запись в Firestore

4. **Поддерживаемая версия Node.js**
   - Node.js 18 или выше

## Рекомендации по безопасности

1. Используйте защищенное SMTP соединение (TLS/SSL)
2. Храните чувствительные данные (пароли, ключи) в переменных окружения
3. Настройте правила безопасности Firestore для ограничения доступа
4. Используйте отдельный email для отправки уведомлений
5. Регулярно обновляйте учетные данные SMTP

## Ограничения

1. Максимальный размер документа Firestore: 1MB
2. Максимальное количество получателей в одном email: 100
3. Максимальное количество попыток отправки: 3 (настраивается)
4. Задержка между попытками: 60 секунд (настраивается) 