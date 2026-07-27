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
        pool: true, // Connection pooling for maximum speed
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

    const mailOptions = {
        from: `"TalentAI Security" <${emailUser}>`,
        to,
        subject,
        text,
        html,
        priority: "high"
    }

    // 1. Primary: Fast Pooled Gmail Transporter
    try {
        const transporter = getTransporter()
        if (transporter) {
            await transporter.sendMail(mailOptions)
            console.log(`[ULTRA FAST EMAIL SENT] Verification code emailed to ${to}`)
            return
        }
    } catch (errPool) {
        console.warn(`[Pooled Transport Failed]: ${errPool.message}. Retrying direct transport...`)
        cachedTransporter = null // reset pool on failure
    }

    // 2. Fallback Direct Transporter
    try {
        const emailPass = process.env.EMAIL_PASS.replace(/\s+/g, "")
        const directTransporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: emailUser, pass: emailPass }
        })
        await directTransporter.sendMail(mailOptions)
        console.log(`[DIRECT EMAIL SENT] Verification code emailed to ${to}`)
        return
    } catch (errDirect) {
        console.error(`[Email Dispatch Error]: ${errDirect.message}`)
        console.log(`\n======================================================`)
        console.log(`[SECURE SERVER LOG (ISP Block Fallback)] Code for ${to}: ${text}`)
        console.log(`NOTE: Your local ISP/network is blocking outbound SMTP ports.`)
        console.log(`======================================================\n`)
    }
}

export default sendEmail
