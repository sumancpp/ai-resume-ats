import nodemailer from "nodemailer"
import dns from "dns"

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first")
}

let cachedTransporter = null

const getTransporter = () => {
    if (cachedTransporter) return cachedTransporter

    const emailUser = process.env.EMAIL_USER?.trim()
    const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, "")

    if (!emailUser || !emailPass) return null

    cachedTransporter = nodemailer.createTransport({
        service: "gmail",
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        auth: {
            user: emailUser,
            pass: emailPass
        },
        connectionTimeout: 10000,
        socketTimeout: 10000
    })

    return cachedTransporter
}

const sendEmail = async ({ to, subject, html, text }) => {
    // 1. Resend HTTPS API (Port 443 - Never blocked by Render, Vercel, or Hotspots)
    if (process.env.RESEND_API_KEY) {
        try {
            const resendFrom = process.env.RESEND_FROM || "TalentAI ATS <noreply@sumann.in>"
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.RESEND_API_KEY.trim()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: resendFrom,
                    to: [to],
                    subject: subject,
                    html: html,
                    text: text
                })
            })
            const data = await response.json()
            if (response.ok) {
                console.log(`[RESEND HTTPS API SENT] Verification code emailed to ${to} (ID: ${data.id})`)
                return
            } else {
                console.warn(`[RESEND API NOTICE]: ${data.message || JSON.stringify(data)}. Trying next transport method...`)
            }
        } catch (resendErr) {
            console.error(`[RESEND FETCH ERROR]: ${resendErr.message}`)
        }
    }

    // 2. Brevo (Sendinblue) HTTPS API (Port 443 - Sends to ANY recipient without domain restriction)
    if (process.env.BREVO_API_KEY) {
        try {
            const senderEmail = process.env.EMAIL_USER || "sumancoder404@gmail.com"
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "api-key": process.env.BREVO_API_KEY.trim(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sender: { name: "TalentAI Security", email: senderEmail },
                    to: [{ email: to }],
                    subject: subject,
                    htmlContent: html,
                    textContent: text
                })
            })
            if (response.ok) {
                console.log(`[BREVO HTTPS API SENT] Verification code successfully emailed to ${to}`)
                return
            } else {
                const brevoData = await response.json()
                console.warn(`[BREVO API NOTICE]: ${brevoData.message || JSON.stringify(brevoData)}`)
            }
        } catch (brevoErr) {
            console.error(`[BREVO FETCH ERROR]: ${brevoErr.message}`)
        }
    }

    // 3. Gmail Nodemailer SMTP (For servers supporting direct SMTP sockets)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const emailUser = process.env.EMAIL_USER.trim()
        const mailOptions = {
            from: `"TalentAI Security" <${emailUser}>`,
            to,
            subject,
            text,
            html,
            priority: "high"
        }

        try {
            const transporter = getTransporter()
            if (transporter) {
                await transporter.sendMail(mailOptions)
                console.log(`[GMAIL SMTP SENT] Verification code emailed to ${to}`)
                return
            }
        } catch (errPool) {
            console.warn(`[Pooled Transport Failed]: ${errPool.message}. Retrying direct transport...`)
            cachedTransporter = null
        }

        try {
            const emailPass = process.env.EMAIL_PASS.replace(/\s+/g, "")
            const directTransporter = nodemailer.createTransport({
                service: "gmail",
                auth: { user: emailUser, pass: emailPass }
            })
            await directTransporter.sendMail(mailOptions)
            console.log(`[DIRECT GMAIL SENT] Verification code emailed to ${to}`)
            return
        } catch (errDirect) {
            console.error(`[SMTP Dispatch Error]: ${errDirect.message}`)
        }
    }

    // 4. Fallback Terminal Logging (Guarantees local testing & unverified domain testing never hangs)
    console.log(`\n======================================================`)
    console.log(`[SECURE SERVER LOG (Fallback)] Code for ${to}: ${text}`)
    console.log(`======================================================\n`)
}

export default sendEmail
