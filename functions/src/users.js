import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/logger";
import { SUPPORTED_LANGUAGES } from "./templates.js";

const db = getFirestore();

// Функция для получения данных пользователя
export const getUserData = async (userId, userCollection) => {
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
export const getUserLanguage = (docData, userData, defaultLang = 'en') => {
  // 1. Язык из документа
  if (docData?.language && SUPPORTED_LANGUAGES[docData.language]) {
    return docData.language;
  }
  // 2. Язык из данных пользователя
  if (userData?.language && SUPPORTED_LANGUAGES[userData.language]) {
    return userData.language;
  }
  // 3. Язык по умолчанию из переменных окружения
  if (process.env.DEFAULT_LANGUAGE && SUPPORTED_LANGUAGES[process.env.DEFAULT_LANGUAGE]) {
    return process.env.DEFAULT_LANGUAGE;
  }
  // 4. Язык по умолчанию, переданный в функцию
  if (SUPPORTED_LANGUAGES[defaultLang]) {
    return defaultLang;
  }
  // 5. Первый доступный язык из SUPPORTED_LANGUAGES
  const availableLangs = Object.keys(SUPPORTED_LANGUAGES);
  return availableLangs.length > 0 ? availableLangs[0] : 'en'; // Fallback to 'en' if no languages defined
}; 