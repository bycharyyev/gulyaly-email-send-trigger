const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

exports.sendEmail = functions.firestore
  .document('${COLLECTION_PATH}/{documentId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const documentId = context.params.documentId;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: data.email,
      subject: 'Новый документ создан',
      text: `Документ ${documentId} был создан в коллекции ${process.env.COLLECTION_PATH}`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email отправлен успешно');
    } catch (error) {
      console.error('Ошибка при отправке email:', error);
      throw error;
    }
  }); 