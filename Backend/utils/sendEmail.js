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
        family: 4,
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
                family: 4,
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

export const sendVideoInterviewInviteEmail = async ({ to, candidateName = "Candidate", interviewLink, meetLink, expiresAt, scheduledDate, scheduledTime, isResend = false }) => {
    const finalMeetUrl = (meetLink && meetLink.trim()) ? meetLink.trim() : (interviewLink || "https://meet.jit.si")
    const subject = isResend 
        ? "📹 Updated Meeting Schedule: Live Technical Interview & Evaluation - TalentAI"
        : "🎉 Congratulations! Technical Assessment Passed & Live Interview Schedule - TalentAI"

    const dateDisplay = scheduledDate || "Scheduled Date"
    const timeDisplay = scheduledTime || "Scheduled Time"

    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 12px; padding: 32px; color: #f8fafc; border: 1px solid #334155;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #34d399; margin: 0; font-size: 28px; font-weight: 800;">TalentAI Recruitment</h1>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Technical Assessment Result & Interview Notice</p>
        </div>

        <p style="font-size: 16px; color: #e2e8f0; line-height: 1.6;">Dear <strong>${candidateName}</strong>,</p>

        <div style="background-color: #064e3b; border-left: 4px solid #10b981; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0; color: #ecfdf5; font-size: 16px; font-weight: 700;">
                🎉 Congratulations! You have successfully passed your Technical Assessment exam!
            </p>
            <p style="margin: 6px 0 0 0; color: #a7f3d0; font-size: 14px; line-height: 1.5;">
                Our hiring team was thoroughly impressed by your performance. We would like to invite you for a <strong>Live Video Interview Round</strong>.
            </p>
        </div>

        <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #818cf8; font-size: 16px;">📅 Live Video Interview Schedule:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #e2e8f0; margin-top: 10px;">
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8; width: 40%;"><strong>Date:</strong></td>
                    <td style="padding: 6px 0; font-weight: 700; color: #38bdf8;">${dateDisplay}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8;"><strong>Time:</strong></td>
                    <td style="padding: 6px 0; font-weight: 700; color: #38bdf8;">${timeDisplay}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8;"><strong>Platform:</strong></td>
                    <td style="padding: 6px 0; font-weight: 700; color: #34d399;">Jitsi Meet / TalentAI Live Video Room</td>
                </tr>
            </table>
        </div>

        <div style="background-color: #1e1b4b; border-left: 4px solid #6366f1; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <h4 style="margin: 0; color: #a5b4fc; font-size: 14px;">💡 Important Preparation Steps:</h4>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #c7d2fe; font-size: 13px; line-height: 1.7;">
                <li>Please test your camera & microphone prior to the meeting.</li>
                <li>Ensure you join using your registered candidate email address: <strong style="color: #60a5fa;">${to}</strong>.</li>
                <li>Click the join button or direct link below at your scheduled time to connect with HR.</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 28px 0 16px 0;">
            <a href="${finalMeetUrl}" target="_blank" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);">
                🎥 Join Jitsi Video Call Room
            </a>
        </div>

        <div style="background-color: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0 0 4px 0; font-weight: 600;">DIRECT JITSI INTERVIEW URL (Click or Copy into Browser):</p>
            <a href="${finalMeetUrl}" target="_blank" style="color: #38bdf8; font-weight: 700; word-break: break-all; text-decoration: underline; font-size: 14px;">
                ${finalMeetUrl}
            </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #334155; margin: 32px 0 16px 0;">
        <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">© TalentAI ATS Recruitment Platform. All rights reserved.</p>
    </div>
    `

    const text = `Dear ${candidateName},\n\nCongratulations! You passed your Technical Assessment!\n\nYour Live Interview is scheduled for:\nDate: ${dateDisplay}\nTime: ${timeDisplay}\n\nJitsi Room Join Link: ${finalMeetUrl}\n\nBest regards,\nTalentAI Team`

    return await sendEmail({ to, subject, html, text })
}

export const sendShortlistNoticeEmail = async ({ to, candidateName = "Candidate", scheduledDate, scheduledTime, customNotes = "" }) => {
    const subject = "✨ Good News! Your Resume Has Been Shortlisted - Online Assessment Schedule"
    const dateDisplay = scheduledDate || "To be confirmed"
    const timeDisplay = scheduledTime || "To be confirmed"

    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 12px; padding: 32px; color: #f8fafc; border: 1px solid #334155;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #818cf8; margin: 0; font-size: 28px; font-weight: 800;">TalentAI Recruitment</h1>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Candidate Shortlist Notification</p>
        </div>

        <p style="font-size: 16px; color: #e2e8f0; line-height: 1.6;">Dear <strong>${candidateName}</strong>,</p>

        <p style="font-size: 16px; color: #e2e8f0; line-height: 1.6;">We are excited to share that <strong>your CV / Resume has been shortlisted</strong> for our technical evaluation process!</p>

        <div style="background-color: #1e293b; border-left: 4px solid #818cf8; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #a5b4fc; font-size: 16px;">📝 Scheduled Online Assessment Details:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #e2e8f0; margin-top: 10px;">
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8; width: 40%;"><strong>Assessment Date:</strong></td>
                    <td style="padding: 6px 0; font-weight: 700; color: #38bdf8;">${dateDisplay}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8;"><strong>Assessment Time:</strong></td>
                    <td style="padding: 6px 0; font-weight: 700; color: #38bdf8;">${timeDisplay}</td>
                </tr>
            </table>
            ${customNotes ? `<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #334155; color: #cbd5e1; font-size: 13px;"><strong>HR Message:</strong> ${customNotes}</div>` : ''}
        </div>

        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">You will receive your unique online assessment link and instructions on the scheduled assessment day. Please ensure you are available.</p>

        <hr style="border: 0; border-top: 1px solid #334155; margin: 32px 0 16px 0;">
        <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">© TalentAI ATS Recruitment Platform. All rights reserved.</p>
    </div>
    `

    const text = `Dear ${candidateName},\n\nYour CV has been shortlisted! We will conduct an online assessment on:\nDate: ${dateDisplay}\nTime: ${timeDisplay}\n\n${customNotes ? "HR Note: " + customNotes + "\n\n" : ""}Best regards,\nTalentAI Team`

    return await sendEmail({ to, subject, html, text })
}

export const sendRound1PassedEmail = async ({ to, candidateName = "Candidate", examScore, scheduledDate, scheduledTime, meetLink }) => {
    const subject = "🎉 Congratulations! You Passed Technical Round 1 - Interview Invitation"
    const dateDisplay = scheduledDate || "Confirmed Date"
    const timeDisplay = scheduledTime || "Confirmed Time"
    const jitsiUrl = meetLink || `https://meet.jit.si/TalentAI-Interview-${Math.random().toString(36).substring(7)}`

    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 12px; padding: 32px; color: #f8fafc; border: 1px solid #334155;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #34d399; margin: 0; font-size: 28px; font-weight: 800;">TalentAI Recruitment</h1>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Technical Round 1 Results & Interview Invitation</p>
        </div>

        <p style="font-size: 16px; color: #e2e8f0; line-height: 1.6;">Dear <strong>${candidateName}</strong>,</p>

        <div style="background-color: #064e3b; border-left: 4px solid #10b981; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0; color: #ecfdf5; font-size: 16px; font-weight: 700;">
                🎉 Congratulations! You have successfully passed Technical Round 1 ${examScore ? `(Score: ${examScore}%)` : ""}!
            </p>
            <p style="margin: 6px 0 0 0; color: #a7f3d0; font-size: 14px; line-height: 1.5;">
                We are pleased to invite you for your next technical interview round with our hiring panel.
            </p>
        </div>

        <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #38bdf8; font-size: 16px;">📅 Technical Interview Schedule:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #e2e8f0; margin-top: 10px;">
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8; width: 40%;"><strong>Date:</strong></td>
                    <td style="padding: 6px 0; font-weight: 700; color: #38bdf8;">${dateDisplay}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8;"><strong>Time:</strong></td>
                    <td style="padding: 6px 0; font-weight: 700; color: #38bdf8;">${timeDisplay}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #94a3b8;"><strong>Platform:</strong></td>
                    <td style="padding: 6px 0; font-weight: 700; color: #34d399;">Jitsi Meet Video Portal</td>
                </tr>
            </table>
        </div>

        <div style="background-color: #1e1b4b; border-left: 4px solid #6366f1; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <h4 style="margin: 0; color: #a5b4fc; font-size: 14px;">💻 Important Requirements:</h4>
            <p style="margin: 6px 0 0 0; color: #c7d2fe; font-size: 13px; line-height: 1.6;">
                Please ensure you download or sign up on <strong>Jitsi Meet</strong> before the interview time. Make sure your video camera and microphone are properly configured.
            </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
            <a href="${jitsiUrl}" target="_blank" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);">
                🎥 Join Jitsi Video Room
            </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #334155; margin: 32px 0 16px 0;">
        <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">© TalentAI ATS Recruitment Platform. All rights reserved.</p>
    </div>
    `

    const text = `Dear ${candidateName},\n\nCongratulations! You have successfully passed Technical Round 1!\n\nYour Interview is scheduled for:\nDate: ${dateDisplay}\nTime: ${timeDisplay}\nPlatform: Jitsi Meet\nJoin Link: ${jitsiUrl}\n\nBest regards,\nTalentAI Team`

    return await sendEmail({ to, subject, html, text })
}

export const sendOfferLetterEmail = async ({ to, candidateName = "Candidate", roleCategory = "Software Engineer", ctc = "As per discussion", joiningDate = "Immediate", hrMessage = "" }) => {
    const subject = `🏆 Official Job Offer Letter - ${roleCategory} | TalentAI`

    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #064e3b; border-radius: 12px; padding: 32px; color: #f8fafc; border: 1px solid #059669;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #34d399; margin: 0; font-size: 32px; font-weight: 800;">Job Offer Letter</h1>
            <p style="color: #a7f3d0; font-size: 16px; margin-top: 4px;">TalentAI Selection Announcement</p>
        </div>

        <p style="font-size: 16px; color: #ecfdf5; line-height: 1.6;">Dear <strong>${candidateName}</strong>,</p>

        <p style="font-size: 16px; color: #ecfdf5; line-height: 1.6;">Following your stellar performance across all assessment and interview rounds, we are delighted to offer you the position of <strong>${roleCategory}</strong>!</p>

        <div style="background-color: #022c22; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #6ee7b7; font-size: 16px;">💼 Offer Summary:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #ecfdf5; margin-top: 10px;">
                <tr>
                    <td style="padding: 6px 0; color: #a7f3d0; width: 40%;"><strong>Designation:</strong></td>
                    <td style="padding: 6px 0; font-weight: 700; color: #ffffff;">${roleCategory}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #a7f3d0;"><strong>Compensation (CTC):</strong></td>
                    <td style="padding: 6px 0; font-weight: 700; color: #34d399;">${ctc}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; color: #a7f3d0;"><strong>Joining Date:</strong></td>
                    <td style="padding: 6px 0; font-weight: 700; color: #38bdf8;">${joiningDate}</td>
                </tr>
            </table>
            ${hrMessage ? `<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #047857; color: #a7f3d0; font-size: 13px;"><strong>Message from HR:</strong> ${hrMessage}</div>` : ''}
        </div>

        <p style="font-size: 15px; color: #ecfdf5; line-height: 1.6;">Our HR operations team will follow up with the formal agreement documents for your signature. Welcome onboard!</p>

        <hr style="border: 0; border-top: 1px solid #047857; margin: 32px 0 16px 0;">
        <p style="font-size: 12px; color: #6ee7b7; text-align: center; margin: 0;">© TalentAI ATS Recruitment Platform. All rights reserved.</p>
    </div>
    `

    const text = `Dear ${candidateName},\n\nCongratulations! We are delighted to offer you the position of ${roleCategory}!\n\nCompensation (CTC): ${ctc}\nJoining Date: ${joiningDate}\n\n${hrMessage ? "HR Note: " + hrMessage + "\n\n" : ""}Welcome to the team!\nTalentAI HR Team`

    return await sendEmail({ to, subject, html, text })
}

export default sendEmail


