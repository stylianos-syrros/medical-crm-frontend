export function extractApiErrorMessage(error, fallback = "Request failed") {
    const data = error?.response?.data;

    if (data?.message) return data.message;
    if (typeof data === "string") return data;

    if (data && typeof data === "object") {
        const firstValue = Object.values(data)[0];
        if (typeof firstValue === "string") return firstValue;
        if (Array.isArray(firstValue)) return firstValue.join(" | ");
    }

    return error?.message || fallback;
}
