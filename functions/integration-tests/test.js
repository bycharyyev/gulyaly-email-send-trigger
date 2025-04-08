import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Инициализация Firebase Admin
const app = initializeApp();
const db = getFirestore();
const auth = getAuth();

// Тестовые данные
const testData = {
  userId: "test-user-123",
  templateName: "birthday",
  language: "ru",
  customData: {
    cakeType: "шоколадный"
  }
};

// Тестовый пользователь
const testUser = {
  name: "Тестовый Пользователь",
  email: "test@example.com",
  language: "ru"
};

// Функция для создания тестового документа
const createTestDocument = async () => {
  try {
    // Создаем тестового пользователя
    await db.collection("users").doc(testData.userId).set(testUser);
    
    // Создаем тестовый документ
    const docRef = await db.collection("notifications").add(testData);
    
    console.log("Тестовый документ создан:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Ошибка при создании тестового документа:", error);
    throw error;
  }
};

// Функция для проверки логов
const checkLogs = async (documentId) => {
  try {
    const logs = await db.collection("email_logs")
      .where("documentId", "==", documentId)
      .get();
    
    if (logs.empty) {
      console.log("Логи не найдены");
      return false;
    }
    
    const log = logs.docs[0].data();
    console.log("Лог найден:", log);
    return log.status === "success";
  } catch (error) {
    console.error("Ошибка при проверке логов:", error);
    return false;
  }
};

// Основная функция тестирования
const runTests = async () => {
  try {
    console.log("Начало тестирования...");
    
    // Создаем тестовый документ
    const documentId = await createTestDocument();
    
    // Ждем некоторое время для обработки
    console.log("Ожидание обработки...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Проверяем логи
    const success = await checkLogs(documentId);
    
    if (success) {
      console.log("Тест пройден успешно!");
    } else {
      console.log("Тест не пройден!");
    }
  } catch (error) {
    console.error("Ошибка при выполнении тестов:", error);
  }
};

// Запускаем тесты
runTests(); 