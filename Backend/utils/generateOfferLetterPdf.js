import PDFDocument from "pdfkit"

/**
 * Generates an official Offer Letter PDF buffer for a candidate.
 * 
 * @param {Object} params
 * @param {string} params.candidateName
 * @param {string} [params.candidateEmail]
 * @param {string} params.roleCategory
 * @param {string} params.ctc
 * @param {string} params.joiningDate
 * @param {string} [params.hrMessage]
 * @param {string} [params.companyName]
 * @param {string} [params.issueDate]
 * @returns {Promise<Buffer>}
 */
export const generateOfferLetterPdf = ({
    candidateName = "Candidate",
    candidateEmail = "",
    roleCategory = "Software Engineer",
    ctc = "As per discussion",
    joiningDate = "Immediate",
    hrMessage = "",
    companyName = "TalentAI Inc.",
    issueDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margin: 50,
                info: {
                    Title: `Official Job Offer Letter - ${candidateName}`,
                    Author: "TalentAI HR Operations",
                    Subject: "Job Offer Letter"
                }
            })

            const buffers = []
            doc.on("data", (chunk) => buffers.push(chunk))
            doc.on("end", () => {
                const pdfBuffer = Buffer.concat(buffers)
                resolve(pdfBuffer)
            })
            doc.on("error", (err) => reject(err))

            // -- Color Palette --
            const primaryColor = "#064E3B" // Emerald 900
            const secondaryColor = "#059669" // Emerald 600
            const darkText = "#1E293B" // Slate 800
            const lightText = "#64748B" // Slate 500
            const bgBoxColor = "#F0FDF4" // Emerald 50
            const borderColor = "#A7F3D0" // Emerald 200

            // -- Header / Branding Banner --
            doc.rect(0, 0, doc.page.width, 110).fill(primaryColor)

            doc.fillColor("#FFFFFF")
               .fontSize(26)
               .font("Helvetica-Bold")
               .text("TalentAI", 50, 32)

            doc.fillColor("#A7F3D0")
               .fontSize(10)
               .font("Helvetica")
               .text("AI-POWERED RECRUITMENT & TALENT MANAGEMENT", 50, 64)

            doc.fillColor("#FFFFFF")
               .fontSize(16)
               .font("Helvetica-Bold")
               .text("OFFICIAL JOB OFFER LETTER", 50, 78, { align: "right" })

            let y = 135

            // -- Document Ref & Date --
            const refNumber = `REF: TAI-OFFER-${Math.floor(100000 + Math.random() * 900000)}`
            doc.fillColor(lightText)
               .fontSize(9)
               .font("Helvetica")
               .text(refNumber, 50, y)
               .text(`Date: ${issueDate}`, doc.page.width - 200, y, { align: "right" })

            y += 25

            // -- Candidate Addressing --
            doc.fillColor(darkText)
               .fontSize(11)
               .font("Helvetica-Bold")
               .text("To,", 50, y)

            y += 16
            doc.fontSize(13)
               .font("Helvetica-Bold")
               .text(candidateName, 50, y)

            if (candidateEmail) {
                y += 16
                doc.fontSize(10)
                   .font("Helvetica")
                   .fillColor(lightText)
                   .text(candidateEmail, 50, y)
            }

            y += 30

            // -- Greeting & Offer Statement --
            doc.fillColor(darkText)
               .fontSize(11)
               .font("Helvetica-Bold")
               .text(`Dear ${candidateName},`, 50, y)

            y += 20
            doc.fontSize(10)
               .font("Helvetica")
               .lineGap(4)
               .text(
                   `Following your outstanding evaluation and technical interview performance, we are delighted to extend an official offer of employment for the position of `,
                   50,
                   y,
                   { continued: true }
               )
               .font("Helvetica-Bold")
               .text(`${roleCategory} `, { continued: true })
               .font("Helvetica")
               .text(`at `, { continued: true })
               .font("Helvetica-Bold")
               .text(`${companyName}.`)

            y = doc.y + 20

            // -- Summary Box --
            const boxTop = y
            const boxHeight = 110
            doc.roundedRect(50, boxTop, doc.page.width - 100, boxHeight, 8)
               .fillAndStroke(bgBoxColor, borderColor)

            let boxY = boxTop + 15

            doc.fillColor(primaryColor)
               .fontSize(12)
               .font("Helvetica-Bold")
               .text("OFFER DETAILS & COMPENSATION SUMMARY", 65, boxY)

            boxY += 22

            const drawRow = (label, val, valueColor = darkText) => {
                doc.fillColor(lightText)
                   .fontSize(10)
                   .font("Helvetica-Bold")
                   .text(label, 65, boxY, { width: 140 })

                doc.fillColor(valueColor)
                   .fontSize(10)
                   .font("Helvetica-Bold")
                   .text(val, 210, boxY)

                boxY += 22
            }

            drawRow("Position / Designation:", roleCategory, primaryColor)
            drawRow("Annual CTC:", ctc, secondaryColor)
            drawRow("Expected Joining Date:", joiningDate, darkText)

            y = boxTop + boxHeight + 25

            // -- Special HR Note (if any) --
            if (hrMessage && hrMessage.trim()) {
                doc.fillColor(darkText)
                   .fontSize(10)
                   .font("Helvetica-Bold")
                   .text("Note from HR Operations:", 50, y)

                y += 14
                doc.fontSize(9.5)
                   .font("Helvetica-Oblique")
                   .fillColor("#334155")
                   .text(`"${hrMessage.trim()}"`, 50, y, { width: doc.page.width - 100 })

                y = doc.y + 20
            }

            // -- Terms & Conditions --
            doc.fillColor(primaryColor)
               .fontSize(11)
               .font("Helvetica-Bold")
               .text("Terms of Offer & Next Steps:", 50, y)

            y += 16
            const terms = [
                "This offer is contingent upon successful verification of your educational background, previous employment records, and reference checks.",
                "You will be on probation for a period of 3 months from your date of joining.",
                "Please sign and return the duplicate copy of this letter or confirm your acceptance via email within 5 business days."
            ]

            terms.forEach((term, idx) => {
                doc.fillColor(darkText)
                   .fontSize(9.5)
                   .font("Helvetica")
                   .text(`${idx + 1}. `, 55, y, { continued: true, width: doc.page.width - 110 })
                   .text(term)
                y = doc.y + 6
            })

            y += 25

            // -- Signatures --
            doc.fillColor(darkText)
               .fontSize(10)
               .font("Helvetica-Bold")
               .text("Sincerely,", 50, y)

            doc.text("Accepted & Agreed,", doc.page.width - 200, y, { align: "right" })

            y += 45

            // Signature line
            doc.moveTo(50, y).lineTo(200, y).strokeColor("#CBD5E1").stroke()
            doc.moveTo(doc.page.width - 200, y).lineTo(doc.page.width - 50, y).strokeColor("#CBD5E1").stroke()

            y += 8
            doc.fillColor(darkText)
               .fontSize(9.5)
               .font("Helvetica-Bold")
               .text("Authorized HR Signatory", 50, y)

            doc.text("Candidate Signature", doc.page.width - 200, y, { align: "right" })

            y += 14
            doc.fillColor(lightText)
               .fontSize(8.5)
               .font("Helvetica")
               .text("TalentAI Recruitment Operations", 50, y)

            doc.text("Date: _______________", doc.page.width - 200, y, { align: "right" })

            // -- Footer --
            const footerY = doc.page.height - 40
            doc.rect(0, footerY - 10, doc.page.width, 50).fill("#F1F5F9")
            doc.fillColor(lightText)
               .fontSize(8)
               .font("Helvetica")
               .text("Confidential - TalentAI ATS Platform | Generated Official Document", 50, footerY, { align: "center", width: doc.page.width - 100 })

            doc.end()
        } catch (err) {
            reject(err)
        }
    })
}

export default generateOfferLetterPdf
