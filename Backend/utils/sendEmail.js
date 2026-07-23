import nodemailer from "nodemailer"

const sendEmail = async ({ to, subject, html, text }) => {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            // Clean App Password by removing spaces
            const emailUser = process.env.EMAIL_USER.trim()
            const emailPass = process.env.EMAIL_PASS.replace(/\s+/g, "")

            // Explicit SSL port 465 (bypasses ISP STARTTLS port 587 blocks & timeouts)
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true, // SSL
                auth: {
                    user: emailUser,
                    pass: emailPass
                },
                connectionTimeout: 15000,
                greetingTimeout: 10000,
                socketTimeout: 15000
            })

            const mailOptions = {
                from: `"TalentAI Security" <${emailUser}>`,
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
