# Gulyaly Team Firestore Trigger Email

Безопасное и универсальное расширение для отправки email при создании документа в Firestore.

## Возможности

- Автоматическая отправка email при создании документа в Firestore
- Настраиваемые шаблоны email с поддержкой переменных
- Поддержка шаблонов Handlebars для гибкого форматирования
- Использование данных пользователя из Firestore в шаблонах
- HTML форматирование
- Механизм повторных попыток
- Поддержка нескольких получателей
- Мультиязычность (поддержка 12 языков)
- Готовые шаблоны для популярных сценариев
- API для отправки email из приложений
- Механизм отказоустойчивости
- Безопасность и логирование

## Безопасность

- Скрытие чувствительных данных
- Проверка размера документа
- Валидация email адресов
- Безопасное хранение паролей
- Ограничение количества получателей

## Логирование

- Запись логов в Firestore
- Отслеживание успешных отправок
- Отслеживание ошибок
- Возможность отключения логирования

## Шаблоны

Расширение поддерживает два режима шаблонизации:

1. Простой режим с использованием `${variableName}`
2. Режим Handlebars с использованием `{{variableName}}`

### Примеры шаблонов

#### Простой режим

```html
<h1>Привет, ${name}!</h1>
<p>Ваш заказ #${orderId} подтвержден.</p>
```

#### Режим Handlebars

```html
<h1>Привет, {{name}}!</h1>
{{#if orderItems}}
  <p>Ваш заказ #{{orderId}} содержит следующие товары:</p>
  <ul>
    {{#each orderItems}}
      <li>{{this.name}} - {{this.price}} руб.</li>
    {{/each}}
  </ul>
{{else}}
  <p>Ваш заказ #{{orderId}} пуст.</p>
{{/if}}
```

## Готовые шаблоны

Расширение включает готовые шаблоны для популярных сценариев:

1. **День рождения**
   - Поздравление с днем рождения
   - Персонализированное сообщение
   - HTML и текстовый формат

2. **Верификация**
   - Подтверждение email
   - Код верификации
   - Ссылка для подтверждения

3. **Сброс пароля**
   - Инструкции по сбросу
   - Временная ссылка
   - Предупреждение о безопасности

4. **Приветствие**
   - Добро пожаловать
   - Первые шаги
   - Ссылки на документацию

5. **Подтверждение заказа**
   - Детали заказа
   - Список товаров
   - Информация о доставке

## API

Расширение предоставляет API для отправки email из приложений:

```javascript
// Пример использования API из Firebase Functions
const sendEmail = async (data) => {
  const response = await fetch('https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/sendEmailApi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_AUTH_TOKEN'
    },
    body: JSON.stringify({
      template: 'birthday',
      data: {
        name: 'Иван',
        age: 25
      },
      to: 'user@example.com',
      language: 'ru'
    })
  });
  return response.json();
};
```

## Механизм отказоустойчивости

- Автоматические повторные попытки при ошибках
- Обработка исключений
- Логирование ошибок
- Процесс восстановления

## Установка

1. Перейдите в [Firebase Console](https://console.firebase.google.com)
2. Выберите ваш проект
3. Перейдите в раздел Extensions
4. Найдите "Gulyaly Team Firestore Trigger Email"
5. Нажмите "Install"
6. Настройте параметры:
   - SMTP настройки
   - Шаблоны email
   - Параметры логирования
   - Настройки безопасности

## Мониторинг

- Отслеживание статуса отправки в Firestore
- Логи в Firebase Console
- Метрики использования
- Оповещения об ошибках

## Поддержка

По всем вопросам обращайтесь:
- GitHub: [https://github.com/bycharyyev](https://github.com/bycharyyev)
- Email: support@gulyaly.com

## Лицензия

Apache-2.0 # gulyaly-email-send-trigger
