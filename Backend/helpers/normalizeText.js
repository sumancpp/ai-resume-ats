const normalizeText = (text) => {
    if (!text) return ""
    return text
        .toLowerCase()
        .replace(/c\+\+/g, "cplusplus")
        .replace(/c#/g, "csharp")
        .replace(/\.net/g, "dotnet")
        .replace(/\s+/g, "")
        .replace(/[^\w]/g, "")
}

export default normalizeText