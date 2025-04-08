import { Firestore } from "@google-cloud/firestore";
import { logger } from "firebase-functions";
import { SUPPORTED_LANGUAGES } from "./templates";

const db = new Firestore();

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
export const getUserLanguage = (docData, userData) => {
  // Проверяем язык в документе
  if (docData.language && SUPPORTED_LANGUAGES[docData.language]) {
    return docData.language;
  }
  
  // Проверяем язык в данных пользователя
  if (userData?.language && SUPPORTED_LANGUAGES[userData.language]) {
    return userData.language;
  }
  
  // Возвращаем язык по умолчанию
  return process.env.DEFAULT_LANGUAGE || "ru";
}; 