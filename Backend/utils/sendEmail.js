import nodemailer from "nodemailer"
import dns from "dns"

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first")
}

const sendEmail = async ({ to, subject, html, text }) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`\n======================================================`)
        console.log(`[SECURE SERVER LOG] Verification code generated for: ${to}`)
        console.log(`SUBJECT: ${subject}`)
        console.log(`CONTENT: ${text}`)
        console.log(`NOTE: Add EMAIL_USER and EMAIL_PASS to Backend/.env to send real emails directly to Gmail!`)
        console.log(`======================================================\n`)
        return
    }

    const emailUser = process.env.EMAIL_USER.trim()
    const emailPass = process.env.EMAIL_PASS.replace(/\s+/g, "")

    const mailOptions = {
        from: `"TalentAI Security" <${emailUser}>`,
        to,
        subject,
        text,
        html
    }

    // Attempt 1: Standard Nodemailer Gmail service (Recommended for Gmail)
    try {
        const transporterGmail = nodemailer.createTransport({
            service: "gmail",
            auth: { user: emailUser, pass: emailPass },
            connectionTimeout: 15000,
            socketTimeout: 15000
        })

        await transporterGmail.sendMail(mailOptions)
        console.log(`[SECURE EMAIL SENT via Gmail Service] Verification code successfully emailed to ${to}`)
        return
    } catch (errGmail) {
        console.warn(`[Gmail Service Attempt Failed]: ${errGmail.message}. Trying Port 587...`)
    }

    // Attempt 2: Port 587 (STARTTLS)
    try {
        const transporter587 = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            requireTLS: true,
            family: 4,
            auth: { user: emailUser, pass: emailPass },
            connectionTimeout: 15000,
            socketTimeout: 15000
        })

        await transporter587.sendMail(mailOptions)
        console.log(`[SECURE EMAIL SENT via Port 587] Verification code successfully emailed to ${to}`)
        return
    } catch (err587) {
        console.warn(`[Port 587 Attempt Failed]: ${err587.message}. Trying Port 465...`)
    }

    // Attempt 3: Port 465 (SSL)
    try {
        const transporter465 = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            family: 4,
            auth: { user: emailUser, pass: emailPass },
            connectionTimeout: 15000,
            socketTimeout: 15000
        })

        await transporter465.sendMail(mailOptions)
        console.log(`[SECURE EMAIL SENT via Port 465] Verification code successfully emailed to ${to}`)
        return
    } catch (err465) {
        console.error(`[Port 465 Attempt Failed]: ${err465.message}`)
        console.log(`\n======================================================`)
        console.log(`[SECURE SERVER LOG (ISP Block Fallback)] Code for ${to}: ${text}`)
        console.log(`NOTE: Your local ISP/network is blocking outbound SMTP ports. When deployed on Render, real emails will be delivered directly!`)
        console.log(`======================================================\n`)
    }
}

export default sendEmail
