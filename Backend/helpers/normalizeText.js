const normalizeText = (text) => {

    return text
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^\w]/g, "")
}

export default normalizeText