import nodemailer from "nodemailer";

type sendEmail = {
  email: string;
  subject: string;
  text: string;
};

const sendEmail = async (args: sendEmail) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      service: process.env.SERVICE,
      port: Number(process.env.EMAIL_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: args.email,
      subject: args.subject,
      text: args.text,
    });
  } catch (error) {
    throw error;
  }
};

export default sendEmail;
