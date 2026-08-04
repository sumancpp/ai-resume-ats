# AI Resume ATS Project

## ⚠️ Security Notice & Secret Rotation Warning
If any API keys, credentials, or secrets were previously hardcoded or committed to git repository history (e.g. MongoDB URI, Gemini API Key, Resend API Key, Cloudinary API Key, JWT Secret), **rotate those credentials immediately** in their respective provider consoles (MongoDB Atlas, Google Cloud Console, Resend, Cloudinary, etc.).

---

## 🔒 Environment Variable Configuration

Copy `.env.example` files to `.env` in both `Backend` and `Frontend` directories and supply appropriate non-production / production secrets.

### Backend (`Backend/.env`)
- `MONGO_URI`: Database connection string
- `GEMINI_API_KEY`: Google Gemini API key
- `JWT_SECRET`: Secret key for signing JWT auth tokens
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `EMAIL_USER` / `EMAIL_PASS`: Nodemailer SMTP credentials
- `RESEND_API_KEY`: Resend API key
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`: Cloudinary storage credentials

### Frontend (`Frontend/.env`)
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID (Client-side safe)
- `VITE_API_URL`: Backend API URL (Client-side safe)

---

## 🚀 Getting Started

### Backend
```bash
cd Backend
npm install
npm run dev
```

### Frontend
```bash
cd Frontend
npm install
npm run dev
```
