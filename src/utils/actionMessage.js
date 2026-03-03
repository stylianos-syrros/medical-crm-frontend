import { useEffect, useState } from "react";

export function useAnchoredActionMessage(timeoutMs = 4500) {
    const [anchor, setAnchor] = useState(null);
    const [message, setMessage] = useState(null);

    const captureActionAnchor = (event) => {
        const target = event?.target;
        if (!(target instanceof Element)) return false;

        const button = target.closest("button");
        if (!button) return false;

        const rect = button.getBoundingClientRect();
        const nextTop = Math.min(rect.bottom + 10, window.innerHeight - 60);
        const nextLeft = Math.min(rect.left, window.innerWidth - 380);

        setAnchor({ top: nextTop, left: Math.max(12, nextLeft) });
        setMessage(null);
        return true;
    };

    const showActionMessage = (text, type = "error") => {
        if (!text) return;
        setMessage({ text, type });
    };

    const clearActionMessage = () => {
        setMessage(null);
    };

    useEffect(() => {
        if (!message?.text) return;
        const timer = setTimeout(() => setMessage(null), timeoutMs);
        return () => clearTimeout(timer);
    }, [message, timeoutMs]);

    return {
        anchor,
        message,
        captureActionAnchor,
        showActionMessage,
        clearActionMessage,
    };
}

export function getAnchoredActionMessageStyle(type = "error", anchor = null) {
    const isSuccess = type === "success";

    return {
        position: "fixed",
        top: `${anchor?.top ?? 16}px`,
        left: `${anchor?.left ?? 16}px`,
        zIndex: 2000,
        backgroundColor: isSuccess ? "#14532d" : "#111827",
        color: "#ffffff",
        padding: "10px 12px",
        borderRadius: "8px",
        fontSize: "14px",
        lineHeight: 1.35,
        boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
        maxWidth: "360px",
        wordBreak: "break-word",
    };
}
