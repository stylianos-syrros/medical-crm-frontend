export function toNumberAmount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function computePaymentProgress(totalPaid, price) {
    const paid = toNumberAmount(totalPaid);
    const expected = toNumberAmount(price);

    if (expected <= 0) {
        return {
            status: "UNPAID",
            paid: 0,
            expected: 0,
            pending: 0,
        };
    }

    const pending = Math.max(0, expected - paid);

    if (paid <= 0) {
        return {
            status: "UNPAID",
            paid,
            expected,
            pending,
        };
    }

    if (paid < expected) {
        return {
            status: "PARTIAL",
            paid,
            expected,
            pending,
        };
    }

    return {
        status: "PAID",
        paid,
        expected,
        pending: 0,
    };
}
