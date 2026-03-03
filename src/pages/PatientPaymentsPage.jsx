import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import {
    getMyPaidAppointments,
    getMyUnpaidAppointments,
    getMyTotalExpected,
    getMyTotalPaid,
    getMyTotalPending,
    makeMyPayment,
} from "../features/user/paymentApi";
import { getAllMedicalServices } from "../features/user/medicalServiceApi";
import { extractApiErrorMessage } from "../utils/errors";
import { formatDateDDMMYYYY, formatTimeHHmm } from "../utils/dateTime";
import { sortAppointmentsByDateTime } from "../utils/appointments";
import { getAnchoredActionMessageStyle, useAnchoredActionMessage } from "../utils/actionMessage";

const PAYMENT_CACHE_KEY = "patient_paid_by_appointment";
const LEGACY_PAYMENT_CACHE_KEY = "patient_payment_paid_by_appointment";

function parseAmountInput(value) {
    if (value === null || value === undefined) return NaN;
    const normalized = String(value).trim().replace(",", ".");
    return Number(normalized);
}

function loadCachedPaidByAppointment() {
    try {
        const currentRaw = localStorage.getItem(PAYMENT_CACHE_KEY);
        const legacyRaw = localStorage.getItem(LEGACY_PAYMENT_CACHE_KEY);
        const raw = currentRaw || legacyRaw;
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        return Object.fromEntries(
            Object.entries(parsed).map(([key, value]) => [String(key), Number(value || 0)])
        );
    } catch {
        return {};
    }
}

function PatientPaymentsPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { anchor, message, captureActionAnchor, showActionMessage, clearActionMessage } =
        useAnchoredActionMessage();

    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [paidAppointments, setPaidAppointments] = useState([]);
    const [unpaidAppointments, setUnpaidAppointments] = useState([]);
    const [servicePriceById, setServicePriceById] = useState({});
    const [paidByAppointmentId, setPaidByAppointmentId] = useState(loadCachedPaidByAppointment);

    const [totalPaid, setTotalPaid] = useState(0);
    const [totalPending, setTotalPending] = useState(0);
    const [totalExpected, setTotalExpected] = useState(0);

    const [form, setForm] = useState({
        appointmentId: "",
        paymentMethod: "",
        amount: "",
    });

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    const handlePageClickCapture = (e) => {
        const didClickButton = captureActionAnchor(e);
        if (!didClickButton) return;
        setError("");
        setSuccess("");
        clearActionMessage();
    };

    const loadData = async () => {
        setLoading(true);
        setError("");

        try {
            const [paid, unpaid, paidTotal, pendingTotal, expectedTotal, services] = await Promise.all([
                getMyPaidAppointments(),
                getMyUnpaidAppointments(),
                getMyTotalPaid(),
                getMyTotalPending(),
                getMyTotalExpected(),
                getAllMedicalServices(),
            ]);

            const sortedPaid = sortAppointmentsByDateTime(paid || []);
            const sortedUnpaid = sortAppointmentsByDateTime(unpaid || []);

            setPaidAppointments(sortedPaid);
            setUnpaidAppointments(sortedUnpaid);
            setTotalPaid(Number(paidTotal || 0));
            setTotalPending(Number(pendingTotal || 0));
            setTotalExpected(Number(expectedTotal || 0));
            const prices = {};
            (services || []).forEach((service) => {
                prices[service.id] = Number(service.price || 0);
            });
            setServicePriceById(prices);

            setForm((prev) => {
                if (!sortedUnpaid.length) return { ...prev, appointmentId: "" };
                const stillExists = sortedUnpaid.some((a) => String(a.id) === String(prev.appointmentId));
                return { ...prev, appointmentId: stillExists ? prev.appointmentId : "" };
            });
        } catch (err) {
            setError(extractApiErrorMessage(err, "Failed to load payment data"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (error) {
            showActionMessage(error, "error");
        }
    }, [error]);

    useEffect(() => {
        localStorage.setItem(PAYMENT_CACHE_KEY, JSON.stringify(paidByAppointmentId));
        localStorage.removeItem(LEGACY_PAYMENT_CACHE_KEY);
    }, [paidByAppointmentId]);

    const getServicePrice = (appointment) => Number(servicePriceById[appointment?.serviceId] || 0);
    const getEstimatedPaid = (appointment) => {
        const backendPaid = Number(
            appointment?.totalPaid ?? appointment?.paidAmount ?? appointment?.amountPaid
        );
        if (Number.isFinite(backendPaid) && backendPaid > 0) return backendPaid;
        return Number(paidByAppointmentId[String(appointment?.id)] || 0);
    };
    const formatMoney = (value) => Number(value || 0).toFixed(2);
    const getEstimatedPending = (appointment) => {
        const backendPending = Number(appointment?.pendingAmount ?? appointment?.pending);
        if (Number.isFinite(backendPending) && backendPending >= 0) return backendPending;
        return Math.max(0, getServicePrice(appointment) - getEstimatedPaid(appointment));
    };

    const payableAppointments = useMemo(
        () => unpaidAppointments.filter((a) => getEstimatedPending(a) > 0),
        [unpaidAppointments]
    );

    const unpaidOnlyAppointments = useMemo(
        () => payableAppointments.filter((a) => getEstimatedPaid(a) <= 0),
        [payableAppointments]
    );

    const partiallyPaidAppointments = useMemo(
        () => payableAppointments.filter((a) => getEstimatedPaid(a) > 0),
        [payableAppointments]
    );

    const selectedAppointment = useMemo(
        () => payableAppointments.find((a) => String(a.id) === String(form.appointmentId)),
        [payableAppointments, form.appointmentId]
    );

    const onPay = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.appointmentId) {
            setError("Please select an appointment");
            return;
        }
        if (!form.paymentMethod) {
            setError("Please select a payment method");
            return;
        }

        const amount = parseAmountInput(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError("Amount must be greater than 0");
            return;
        }

        const appointmentId = Number(form.appointmentId);
        const pendingAmount = getEstimatedPending(selectedAppointment);
        if (amount > pendingAmount) {
            setError(`Amount cannot be greater than pending amount (${formatMoney(pendingAmount)})`);
            return;
        }

        setPaying(true);
        try {
            const result = await makeMyPayment({
                appointmentId,
                paymentMethod: form.paymentMethod,
                amount,
            });

            const selectedPrice = getServicePrice(selectedAppointment);
            const selectedKey = String(appointmentId);

            setPaidByAppointmentId((prev) => {
                const currentPaid = Number(prev[selectedKey] || 0);
                const nextPaid = Math.min(selectedPrice, currentPaid + amount);
                return { ...prev, [selectedKey]: Number(nextPaid.toFixed(2)) };
            });

            setUnpaidAppointments((prev) => {
                const currentAppointment = prev.find((a) => Number(a.id) === appointmentId);
                if (!currentAppointment) return prev;

                const currentPaid = getEstimatedPaid(currentAppointment);
                const nextPaid = Math.min(getServicePrice(currentAppointment), currentPaid + amount);
                const nextPending = Math.max(0, getServicePrice(currentAppointment) - nextPaid);
                const updated = {
                    ...currentAppointment,
                    totalPaid: nextPaid,
                    pendingAmount: nextPending,
                };

                if (nextPending <= 0) {
                    setPaidAppointments((paidPrev) =>
                        sortAppointmentsByDateTime([updated, ...paidPrev.filter((p) => Number(p.id) !== appointmentId)])
                    );
                    return prev.filter((a) => Number(a.id) !== appointmentId);
                }

                return prev.map((a) => (Number(a.id) === appointmentId ? updated : a));
            });

            setSuccess(`Payment saved successfully (${result.status})`);
            setForm((prev) => ({ ...prev, amount: "" }));
            await loadData();
        } catch (err) {
            setError(extractApiErrorMessage(err, "Payment failed"));
        } finally {
            setPaying(false);
        }
    };

    const tableStyle = { borderCollapse: "collapse", width: "100%", textAlign: "center" };
    const cellStyle = { border: "1px solid #ccc", padding: "8px" };
    const paymentFieldStyle = {
        width: "100%",
        padding: "8px",
        boxSizing: "border-box",
        fontSize: "16px",
    };

    return (
        <div style={{ padding: "24px" }} onClickCapture={handlePageClickCapture}>
            <h1>Patient Payments</h1>
            {message?.text && (
                <div style={getAnchoredActionMessageStyle(message.type, anchor)}>
                    {message.text}
                </div>
            )}
            {success && <p style={{ color: "green" }}>{success}</p>}

            <div style={{ marginBottom: "16px" }}>
                <button onClick={() => navigate("/patient")} style={{ marginRight: "8px" }}>
                    Back To Dashboard
                </button>
                <button onClick={handleLogout}>Logout</button>
            </div>

            {loading && <p>Loading...</p>}
            {!loading && (
                <>
                    <section style={{ marginBottom: "24px" }}>
                        <h2>Payment Summary</h2>
                        <p><strong>Total Expected:</strong> {formatMoney(totalExpected)}</p>
                        <p><strong>Total Paid:</strong> {formatMoney(totalPaid)}</p>
                        <p><strong>Total Pending:</strong> {formatMoney(totalPending)}</p>
                    </section>

                    <section style={{ marginBottom: "14px", maxWidth: "920px" }}>
                        <h2>Make Payment</h2>
                        <form onSubmit={onPay}>
                            <div style={{ marginBottom: "10px" }}>
                                <label>Unpaid/Partially Paid Appointments</label>
                                <select
                                    value={form.appointmentId}
                                    onChange={(e) => setForm((prev) => ({ ...prev, appointmentId: e.target.value }))}
                                    style={paymentFieldStyle}
                                    required
                                    disabled={!payableAppointments.length}
                                >
                                    <option value="">-</option>
                                    {!payableAppointments.length ? (
                                        <option value="">No unpaid appointments</option>
                                    ) : (
                                        payableAppointments.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                #{a.id} - {formatDateDDMMYYYY(a.appointmentDate)} {formatTimeHHmm(a.appointmentTime)} - {a.serviceName || a.serviceId} - {a.doctorName || a.doctorId} - Price: {formatMoney(getServicePrice(a))} - Pending: {formatMoney(getEstimatedPending(a))}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            <div style={{ marginBottom: "10px" }}>
                                <label>Method</label>
                                <select
                                    value={form.paymentMethod}
                                    onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                                    style={paymentFieldStyle}
                                    required
                                >
                                    <option value="">-</option>
                                    <option value="CARD">CARD</option>
                                    <option value="CASH">CASH</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: "10px" }}>
                                <label>Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={form.amount}
                                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                                    style={paymentFieldStyle}
                                    required
                                />
                            </div>

                            {selectedAppointment && (
                                <p style={{ marginBottom: "10px" }}>
                                    Paying for appointment #{selectedAppointment.id} ({selectedAppointment.serviceName || selectedAppointment.serviceId}) - Pending: {formatMoney(getEstimatedPending(selectedAppointment))}
                                </p>
                            )}

                            <button type="submit" disabled={paying || !payableAppointments.length || !form.appointmentId || !form.paymentMethod}>
                                {paying ? "Processing..." : "Pay"}
                            </button>
                        </form>
                    </section>

                    <section style={{ marginBottom: "24px" }}>
                        <h2>Unpaid Appointments</h2>
                        {unpaidOnlyAppointments.length === 0 ? (
                            <p>No unpaid appointments.</p>
                        ) : (
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={cellStyle}>ID</th>
                                        <th style={cellStyle}>Date</th>
                                        <th style={cellStyle}>Time</th>
                                        <th style={cellStyle}>Status</th>
                                        <th style={cellStyle}>Doctor</th>
                                        <th style={cellStyle}>Service</th>
                                        <th style={cellStyle}>Price</th>
                                        <th style={cellStyle}>Total Paid</th>
                                        <th style={cellStyle}>Pending</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unpaidOnlyAppointments.map((a) => (
                                        <tr key={a.id}>
                                            <td style={cellStyle}>{a.id}</td>
                                            <td style={cellStyle}>{formatDateDDMMYYYY(a.appointmentDate)}</td>
                                            <td style={cellStyle}>{formatTimeHHmm(a.appointmentTime)}</td>
                                            <td style={cellStyle}>{a.status}</td>
                                            <td style={cellStyle}>{a.doctorName || a.doctorId}</td>
                                            <td style={cellStyle}>{a.serviceName || a.serviceId}</td>
                                            <td style={cellStyle}>{formatMoney(getServicePrice(a))}</td>
                                            <td style={cellStyle}>{formatMoney(getEstimatedPaid(a))}</td>
                                            <td style={cellStyle}>{formatMoney(getEstimatedPending(a))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>

                    <section style={{ marginBottom: "24px" }}>
                        <h2>Partially Paid Appointments</h2>
                        {partiallyPaidAppointments.length === 0 ? (
                            <p>No partially paid appointments.</p>
                        ) : (
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={cellStyle}>ID</th>
                                        <th style={cellStyle}>Date</th>
                                        <th style={cellStyle}>Time</th>
                                        <th style={cellStyle}>Status</th>
                                        <th style={cellStyle}>Doctor</th>
                                        <th style={cellStyle}>Service</th>
                                        <th style={cellStyle}>Price</th>
                                        <th style={cellStyle}>Total Paid</th>
                                        <th style={cellStyle}>Pending</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {partiallyPaidAppointments.map((a) => (
                                        <tr key={a.id}>
                                            <td style={cellStyle}>{a.id}</td>
                                            <td style={cellStyle}>{formatDateDDMMYYYY(a.appointmentDate)}</td>
                                            <td style={cellStyle}>{formatTimeHHmm(a.appointmentTime)}</td>
                                            <td style={cellStyle}>{a.status}</td>
                                            <td style={cellStyle}>{a.doctorName || a.doctorId}</td>
                                            <td style={cellStyle}>{a.serviceName || a.serviceId}</td>
                                            <td style={cellStyle}>{formatMoney(getServicePrice(a))}</td>
                                            <td style={cellStyle}>{formatMoney(getEstimatedPaid(a))}</td>
                                            <td style={cellStyle}>{formatMoney(getEstimatedPending(a))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>

                    <section>
                        <h2>Paid Appointments</h2>
                        {paidAppointments.length === 0 ? (
                            <p>No paid appointments.</p>
                        ) : (
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={cellStyle}>ID</th>
                                        <th style={cellStyle}>Date</th>
                                        <th style={cellStyle}>Time</th>
                                        <th style={cellStyle}>Status</th>
                                        <th style={cellStyle}>Doctor</th>
                                        <th style={cellStyle}>Service</th>
                                        <th style={cellStyle}>Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paidAppointments.map((a) => (
                                        <tr key={a.id}>
                                            <td style={cellStyle}>{a.id}</td>
                                            <td style={cellStyle}>{formatDateDDMMYYYY(a.appointmentDate)}</td>
                                            <td style={cellStyle}>{formatTimeHHmm(a.appointmentTime)}</td>
                                            <td style={cellStyle}>{a.status}</td>
                                            <td style={cellStyle}>{a.doctorName || a.doctorId}</td>
                                            <td style={cellStyle}>{a.serviceName || a.serviceId}</td>
                                            <td style={cellStyle}>{formatMoney(getServicePrice(a))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default PatientPaymentsPage;
