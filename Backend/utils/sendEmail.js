import nodemailer from "nodemailer"

const sendEmail = async ({ to, subject, html, text }) => {
    // If EMAIL_USER and EMAIL_PASS are configured in .env, send real email via Nodemailer
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            const transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            })

            const mailOptions = {
                from: `"TalentAI Security" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                text,
                html
            }

            await transporter.sendMail(mailOptions)
            console.log(`[SECURE EMAIL SENT] Verification code successfully emailed to ${to}`)
        } catch (mailError) {
            console.error("[EMAIL SEND ERROR]:", mailError.message)
            console.log(`[FALLBACK SERVER LOG] Code for ${to}: ${text}`)
        }
    } else {
        console.log(`\n======================================================`)
        console.log(`[SECURE SERVER LOG] Verification code generated for: ${to}`)
        console.log(`SUBJECT: ${subject}`)
        console.log(`CONTENT: ${text}`)
        console.log(`NOTE: Add EMAIL_USER and EMAIL_PASS to Backend/.env to send real emails directly to Gmail!`)
        console.log(`======================================================\n`)
    }
}

export default sendEmail
