require("dotenv").config();

const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  }
});

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "home.html"));
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.verify((error) => {
  if (error) {
    console.error("SMTP VERIFY ERROR:", error);
  } else {
    console.log("SMTP is ready");
  }
});

app.post(
  "/submit",
  upload.fields([
    { name: "driversLicense", maxCount: 5 },
    { name: "payslips", maxCount: 5 },
    { name: "extraDocuments", maxCount: 5 }
  ]),
  async (req, res) => {
    console.log("FORM HIT /submit");

    try {
      const attachments = [];
      const files = req.files || {};

      Object.values(files).forEach((group) => {
        group.forEach((file) => {
          attachments.push({
            filename: file.originalname,
            content: file.buffer,
            contentType: file.mimetype
          });
        });
      });

      const firstName = req.body.firstName || "";
      const lastName = req.body.lastName || "";
      const emailAddress = req.body.emailAddress || "";

      const html = `
        <h2>New Mortgage Form Submission</h2>
        <p><strong>First Name:</strong> ${firstName}</p>
        <p><strong>Last Name:</strong> ${lastName}</p>
        <p><strong>Email:</strong> ${emailAddress}</p>
        <p><strong>Files Attached:</strong> ${attachments.length}</p>
      `;

      const info = await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_TO,
        replyTo: emailAddress || process.env.MAIL_FROM,
        subject: `TEST Mortgage Form ${Date.now()}`,
        html,
        attachments
      });

      console.log("MAIL SENT INFO:", info);

      return res.status(200).json({
        success: true,
        message: "Sent successfully"
      });
    } catch (err) {
      console.error("MAIL ERROR:", err);

      return res.status(500).json({
        success: false,
        message: err.message || "Mail send failed"
      });
    }
  }
);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});