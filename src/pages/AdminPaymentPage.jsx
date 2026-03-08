import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import { getAllPayments } from "../features/user/paymentApi";
import { getAllAppointments } from "../features/user/appointmentApi";
import { getAllMedicalServices } from "../features/user/medicalServiceApi";
import { extractApiErrorMessage } from "../utils/errors";
import { formatDateTimeDDMMYYYY } from "../utils/dateTime";
import { useAnchoredActionMessage } from "../utils/actionMessage";

function AdminPaymentsPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { message, captureActionAnchor, showActionMessage, clearActionMessage } =
        useAnchoredActionMessage();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [paymentRows, setPaymentRows] = useState([]);
    const [showPayments, setShowPayments] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    const handlePageClickCapture = (e) => {
        const didClickButton = captureActionAnchor(e);
        if (!didClickButton) return;
        setError("");
        clearActionMessage();
    };

    const loadPayments = async () => {
        setLoading(true);
        setError("");
        try {
            const [data, appointments, services] = await Promise.all([
                getAllPayments(),
                getAllAppointments(),
                getAllMedicalServices(),
            ]);

            const servicePriceById = {};
            (services || []).forEach((service) => {
                servicePriceById[service.id] = Number(service.price || 0);
            });

            const paymentsByAppointmentId = {};
            (data || []).forEach((payment) => {
                const appointmentId = Number(payment?.appointmentId);
                if (!Number.isFinite(appointmentId)) return;
                if (!paymentsByAppointmentId[appointmentId]) {
                    paymentsByAppointmentId[appointmentId] = [];
                }
                paymentsByAppointmentId[appointmentId].push(payment);
            });

            const rows = (appointments || []).map((appointment) => {
                const appointmentId = Number(appointment.id);
                const servicePrice = Number(servicePriceById[appointment.serviceId] || 0);
                const paymentsForAppointment = paymentsByAppointmentId[appointmentId] || [];
                const totalPaid = paymentsForAppointment.reduce(
                    (sum, payment) => sum + Number(payment.amount || 0),
                    0
                );

                let status = "UNPAID";
                if (servicePrice > 0) {
                    if (totalPaid <= 0) status = "UNPAID";
                    else if (totalPaid + 0.0001 < servicePrice) status = "PARTIAL";
                    else status = "PAID";
                } else if (totalPaid > 0) {
                    status = "PAID";
                }

                const paymentMethods = [...new Set(paymentsForAppointment.map((payment) => payment.method).filter(Boolean))];
                const method =
                    paymentMethods.length === 0
                        ? "-"
                        : paymentMethods.length === 1
                        ? paymentMethods[0]
                        : "MULTIPLE";

                const latestPaidAt = paymentsForAppointment
                    .map((payment) => payment.paidAt)
                    .filter(Boolean)
                    .sort()
                    .at(-1);

                return {
                    id: appointmentId,
                    appointmentId,
                    patientFullName: appointment.patientName || appointment.patientId || "-",
                    doctorFullName: appointment.doctorName || appointment.doctorId || "-",
                    appointmentStatus: appointment.status || "-",
                    totalPaid,
                    servicePrice,
                    method,
                    status,
                    paidAt: latestPaidAt || null,
                };
            });

            setPaymentRows(rows);
        } catch (err) {
            setError(extractApiErrorMessage(err, "Failed to load payments"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPayments();
    }, []);

    useEffect(() => {
        if (error) {
            showActionMessage(error, "error");
        }
    }, [error]);

    const tableStyle = { borderCollapse: "collapse", width: "100%", textAlign: "center" };
    const cellStyle = { border: "1px solid #ccc", padding: "12px", fontSize: "16px" };
    const rowsById = useMemo(
        () => [...paymentRows].sort((a, b) => a.id - b.id),
        [paymentRows]
    );
    const doctorStats = useMemo(() => {
        const byDoctor = {};
        rowsById.forEach((row) => {
            const doctor = row.doctorFullName || "-";
            if (!byDoctor[doctor]) {
                byDoctor[doctor] = {
                    doctor,
                    appointments: 0,
                    cancelledAppointments: 0,
                    expectedTotal: 0,
                    collectedTotal: 0,
                    pendingTotal: 0,
                };
            }

            byDoctor[doctor].appointments += 1;
            if (row.appointmentStatus === "CANCELLED") {
                byDoctor[doctor].cancelledAppointments += 1;
            }
            byDoctor[doctor].expectedTotal += Number(row.servicePrice || 0);
            byDoctor[doctor].collectedTotal += Number(row.totalPaid || 0);
            byDoctor[doctor].pendingTotal += Math.max(
                0,
                Number(row.servicePrice || 0) - Number(row.totalPaid || 0)
            );
        });

        return Object.values(byDoctor);
    }, [rowsById]);

    const getTopDoctor = (selector) => {
        if (doctorStats.length === 0) return null;
        return [...doctorStats].sort((a, b) => {
            const diff = selector(b) - selector(a);
            if (diff !== 0) return diff;
            return a.doctor.localeCompare(b.doctor);
        })[0];
    };

    const topAppointmentsDoctor = useMemo(
        () => getTopDoctor((x) => x.appointments),
        [doctorStats]
    );
    const topCancelledDoctor = useMemo(
        () => getTopDoctor((x) => x.cancelledAppointments),
        [doctorStats]
    );
    const topExpectedDoctor = useMemo(
        () => getTopDoctor((x) => x.expectedTotal),
        [doctorStats]
    );
    const topCollectedDoctor = useMemo(
        () => getTopDoctor((x) => x.collectedTotal),
        [doctorStats]
    );
    const topPendingDoctor = useMemo(
        () => getTopDoctor((x) => x.pendingTotal),
        [doctorStats]
    );

    const rowStyleByStatus = (status) => {
        if (status === "UNPAID") return { backgroundColor: "#fee2e2" };
        if (status === "PARTIAL") return { backgroundColor: "#fef3c7" };
        if (status === "PAID") return { backgroundColor: "#d1fae5" };
        return {};
    };
    const getPaymentStatusClass = (status) => {
        if (status === "UNPAID") return "status-unpaid";
        if (status === "PARTIAL") return "status-partial";
        if (status === "PAID") return "status-paid";
        return "status-cancelled";
    };

    return (
        <div className="page-container space-y-6" onClickCapture={handlePageClickCapture}>
            <div className="card top-actions-bar flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1>Admin Payments</h1>
                    <p className="mt-1 text-sm text-slate-500">Review all payment records across appointments.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => navigate("/admin")} className="btn-secondary">
                        Back To Dashboard
                    </button>
                    <button onClick={handleLogout} className="btn-secondary">Logout</button>
                </div>
            </div>
            {message?.text && (
                <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}>
                    {message.text}
                </div>
            )}

            {loading && (
                <div className="card">
                    <p className="text-sm font-medium text-slate-600">Loading payments...</p>
                </div>
            )}
            {!loading && (
                <>
                    <section className="card">
                        <h2>Doctor Insights</h2>
                        {rowsById.length === 0 ? (
                            <div className="empty-state">No appointments found.</div>
                        ) : (
                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Most Appointments</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">{topAppointmentsDoctor?.doctor || "-"}</p>
                                    <p className="text-sm text-slate-600">{topAppointmentsDoctor?.appointments ?? 0} appointments</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Most Cancelled Appointments</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">{topCancelledDoctor?.doctor || "-"}</p>
                                    <p className="text-sm text-slate-600">{topCancelledDoctor?.cancelledAppointments ?? 0} cancelled</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Highest Expected Revenue</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">{topExpectedDoctor?.doctor || "-"}</p>
                                    <p className="text-sm text-slate-600">${Number(topExpectedDoctor?.expectedTotal || 0).toFixed(2)} expected</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Highest Collected Revenue</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">{topCollectedDoctor?.doctor || "-"}</p>
                                    <p className="text-sm text-slate-600">${Number(topCollectedDoctor?.collectedTotal || 0).toFixed(2)} collected</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Highest Pending Revenue</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">{topPendingDoctor?.doctor || "-"}</p>
                                    <p className="text-sm text-slate-600">${Number(topPendingDoctor?.pendingTotal || 0).toFixed(2)} pending</p>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="card">
                        <div className="flex items-center justify-between gap-3">
                            <h2>All Payments</h2>
                            <button onClick={() => setShowPayments((prev) => !prev)}>
                                {showPayments ? "Hide All Payments" : "Show All Payments"}
                            </button>
                        </div>

                        {rowsById.length === 0 ? (
                            <div className="empty-state mt-4">No appointments found.</div>
                        ) : showPayments ? (
                            <div className="table-wrap mt-4">
                                <table style={tableStyle}>
                                    <thead>
                                        <tr>
                                            <th style={cellStyle}>Appointment ID</th>
                                            <th style={cellStyle}>Patient Full Name</th>
                                            <th style={cellStyle}>Doctor Full Name</th>
                                            <th style={cellStyle}>Appointment Status</th>
                                            <th style={cellStyle}>Total Paid</th>
                                            <th style={cellStyle}>Service Price</th>
                                            <th style={cellStyle}>Method</th>
                                            <th style={cellStyle}>Payment Status</th>
                                            <th style={cellStyle}>Paid At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rowsById.map((row) => (
                                            <tr key={row.appointmentId} style={rowStyleByStatus(row.status)}>
                                                <td style={cellStyle}>{row.appointmentId}</td>
                                                <td style={cellStyle}>{row.patientFullName}</td>
                                                <td style={cellStyle}>{row.doctorFullName}</td>
                                                <td style={cellStyle}>{row.appointmentStatus}</td>
                                                <td style={cellStyle}>{Number(row.totalPaid || 0).toFixed(2)}</td>
                                                <td style={cellStyle}>{Number(row.servicePrice || 0).toFixed(2)}</td>
                                                <td style={cellStyle}>{row.method}</td>
                                                <td style={cellStyle}>
                                                    <span className={`status-badge ${getPaymentStatusClass(row.status)}`}>{row.status}</span>
                                                </td>
                                                <td style={cellStyle}>
                                                    {row.paidAt ? formatDateTimeDDMMYYYY(row.paidAt) : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state mt-4">Payments are hidden. Click "Show All Payments" to view the table.</div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default AdminPaymentsPage;
