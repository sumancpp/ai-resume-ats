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
    console.log(`[SECURE SERVER LOG (Fallback)] Email to ${to}:\nSubject: ${subject}\nText: ${text}`)
    console.log(`======================================================\n`)
}

export const sendExamInviteEmail = async ({ to, candidateName = "Candidate", examLink, expiresAt }) => {
    const formattedDate = new Date(expiresAt).toLocaleString()
    const subject = "🎉 Congratulations! Your CV is Shortlisted - Online Technical Assessment Invitation"
    
    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 12px; padding: 32px; color: #f8fafc; border: 1px solid #334155;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 800;">TalentAI Recruitment</h1>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Technical Assessment Invitation</p>
        </div>

        <p style="font-size: 16px; color: #e2e8f0; line-height: 1.6;">Dear <strong>${candidateName}</strong>,</p>

        <p style="font-size: 16px; color: #e2e8f0; line-height: 1.6;">We are pleased to inform you that <strong>your CV/Resume has been successfully shortlisted</strong> for the next round of our hiring process!</p>

        <div style="background-color: #1e293b; border-left: 4px solid #6366f1; border-radius: 6px; padding: 18px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #818cf8; font-size: 16px;">⏱️ Assessment Instructions & Rules:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.8;">
                <li><strong>Strict Link Expiry:</strong> This invitation link will expire in <strong>24 Hours</strong> (Valid until: <em>${formattedDate}</em>).</li>
                <li><strong>Timed Exam:</strong> Once started, you have exactly <strong>10 minutes</strong> to complete the exam.</li>
                <li><strong>Exam Format:</strong> Includes Multiple Choice Questions (MCQs) and interactive <strong>Live Code Challenges</strong> with real-time test case execution.</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 32px 0;">
            <a href="${examLink}" target="_blank" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);">
                🚀 Start Your Technical Exam Now
            </a>
        </div>

        <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 24px;">If the button above does not work, copy and paste this link into your browser:<br><a href="${examLink}" style="color: #818cf8; word-break: break-all;">${examLink}</a></p>

        <hr style="border: 0; border-top: 1px solid #334155; margin: 32px 0 16px 0;">
        <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">© TalentAI ATS Recruitment Platform. All rights reserved.</p>
    </div>
    `

    const text = `Dear ${candidateName},\n\nYour CV has been shortlisted! Please complete your technical assessment link before ${formattedDate}.\n\nExam Link: ${examLink}\n\nGood luck!\nTalentAI Team`

    return await sendEmail({ to, subject, html, text })
}

export const sendHiringConfirmationEmail = async ({ to, candidateName = "Candidate", roleCategory = "Position" }) => {
    const subject = `🎉 Congratulations! Selection & Hiring Offer Confirmation - ${roleCategory}`
    
    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #064e3b; border-radius: 12px; padding: 32px; color: #f8fafc; border: 1px solid #059669;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #34d399; margin: 0; font-size: 32px; font-weight: 800;">Congratulations!</h1>
            <p style="color: #a7f3d0; font-size: 16px; margin-top: 4px;">Offer Confirmation & Selection Notice</p>
        </div>

        <p style="font-size: 16px; color: #ecfdf5; line-height: 1.6;">Dear <strong>${candidateName}</strong>,</p>

        <p style="font-size: 16px; color: #ecfdf5; line-height: 1.6;">We are thrilled to inform you that you have <strong>SUCCESSFULLY PASSED</strong> both the Technical Assessment and Interview rounds for the role of <strong>${roleCategory}</strong>!</p>

        <div style="background-color: #022c22; border-left: 4px solid #10b981; border-radius: 6px; padding: 18px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #6ee7b7; font-size: 16px;">📌 Next Steps:</h3>
            <p style="color: #a7f3d0; font-size: 14px; margin: 0; line-height: 1.6;">Our HR Team will be reaching out to you shortly via phone and email to discuss your offer letter, onboarding timeline, and document verification.</p>
        </div>

        <p style="font-size: 16px; color: #ecfdf5; text-align: center; margin-top: 24px; font-weight: 600;">Welcome to the team!</p>

        <hr style="border: 0; border-top: 1px solid #047857; margin: 32px 0 16px 0;">
        <p style="font-size: 12px; color: #6ee7b7; text-align: center; margin: 0;">© TalentAI ATS Recruitment Platform. All rights reserved.</p>
    </div>
    `

    const text = `Dear ${candidateName},\n\nCongratulations! You have successfully passed all evaluation rounds for the ${roleCategory} role. Our HR team will reach out shortly.\n\nBest regards,\nTalentAI Team`

    return await sendEmail({ to, subject, html, text })
}

export default sendEmail

