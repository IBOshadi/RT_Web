// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';
// import config from '../config/config.js';

const nodemailer = require('nodemailer');
const dotenv = require('dotenv')
const config = require('../config/config.js');

dotenv.config();

const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const resetLink = `${config.baseURL}reset-password?token=${resetToken}`;
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Password Reset Request',
    html: `<p>Click the link below to reset your password:</p><a href="${resetLink}">${resetLink}</a>`,
  });
};

// export { sendPasswordResetEmail };

module.exports = { sendPasswordResetEmail };
