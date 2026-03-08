import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import {
    getMyDoctorPaidAppointments,
    getMyDoctorTotalExpected,
    getMyDoctorTotalPending,
    getMyDoctorTotalReceived,
    getMyDoctorUnpaidAppointments,
} from "../features/user/paymentApi";
import { getAllMedicalServices } from "../features/user/medicalServiceApi";
import { extractApiErrorMessage } from "../utils/errors";
import { formatDateDDMMYYYY, formatTimeHHmm } from "../utils/dateTime";
import { sortAppointmentsByDateTime } from "../utils/appointments";
import { useAnchoredActionMessage } from "../utils/actionMessage";

function DoctorPaymentsPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { message, captureActionAnchor, showActionMessage, clearActionMessage } =
        useAnchoredActionMessage();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [paidAppointments, setPaidAppointments] = useState([]);
    const [unpaidAppointments, setUnpaidAppointments] = useState([]);
    const [servicePriceById, setServicePriceById] = useState({});

    const [totalReceived, setTotalReceived] = useState(0);
    const [totalPending, setTotalPending] = useState(0);
    const [totalExpected, setTotalExpected] = useState(0);

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

    const loadData = async () => {
        setLoading(true);
        setError("");

        try {
            const [paid, unpaid, received, pending, expected, services] = await Promise.all([
                getMyDoctorPaidAppointments(),
                getMyDoctorUnpaidAppointments(),
                getMyDoctorTotalReceived(),
                getMyDoctorTotalPending(),
                getMyDoctorTotalExpected(),
                getAllMedicalServices(),
            ]);

            setPaidAppointments(sortAppointmentsByDateTime(paid || []));
            setUnpaidAppointments(sortAppointmentsByDateTime(unpaid || []));
            setTotalReceived(Number(received || 0));
            setTotalPending(Number(pending || 0));
            setTotalExpected(Number(expected || 0));

            const prices = {};
            (services || []).forEach((service) => {
                prices[service.id] = Number(service.price || 0);
            });
            setServicePriceById(prices);
        } catch (err) {
            setError(extractApiErrorMessage(err, "Failed to load doctor payments"));
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

    const getServicePrice = (appointment) => Number(servicePriceById[appointment?.serviceId] || 0);
    const getEstimatedPaid = (appointment) => Number(appointment?.totalPaid || 0);
    const getEstimatedPending = (appointment) => {
        const backendPending = Number(appointment?.pendingAmount);
        if (Number.isFinite(backendPending) && backendPending >= 0) return backendPending;
        return Math.max(0, getServicePrice(appointment) - getEstimatedPaid(appointment));
    };
    const formatMoney = (value) => Number(value || 0).toFixed(2);
    const getAppointmentStatusClass = (status) => {
        if (status === "SCHEDULED") return "status-scheduled";
        if (status === "COMPLETED") return "status-completed";
        if (status === "CANCELLED") return "status-cancelled";
        return "status-cancelled";
    };

    const payableAppointments = useMemo(
        () => unpaidAppointments.filter((a) => getEstimatedPending(a) > 0),
        [unpaidAppointments, servicePriceById]
    );

    const unpaidOnlyAppointments = useMemo(
        () => payableAppointments.filter((a) => getEstimatedPaid(a) <= 0),
        [payableAppointments]
    );

    const partiallyPaidAppointments = useMemo(
        () => payableAppointments.filter((a) => getEstimatedPaid(a) > 0),
        [payableAppointments]
    );

    const tableStyle = { borderCollapse: "collapse", width: "100%", textAlign: "center" };
    const cellStyle = { border: "1px solid #ccc", padding: "12px", fontSize: "16px" };
    const unpaidRowStyle = { backgroundColor: "#fee2e2" };
    const partialRowStyle = { backgroundColor: "#fef3c7" };
    const paidRowStyle = { backgroundColor: "#d1fae5" };

    return (
        <div className="page-container space-y-6" onClickCapture={handlePageClickCapture}>
            <div className="card top-actions-bar flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1>Doctor Payments</h1>
                    <p className="mt-1 text-sm text-slate-500">Monitor expected, received, and pending amounts.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => navigate("/doctor")} className="btn-secondary">
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
                    <p className="text-sm font-medium text-slate-600">Loading payment data...</p>
                </div>
            )}
            {!loading && (
                <>
                    <section className="card">
                        <h2>Payment Summary</h2>
                        <p><strong>Total Expected:</strong> {totalExpected.toFixed(2)}</p>
                        <p><strong>Total Received:</strong> {totalReceived.toFixed(2)}</p>
                        <p><strong>Total Pending:</strong> {totalPending.toFixed(2)}</p>
                    </section>

                    <section className="card">
                        <h2>Unpaid Appointments</h2>
                        {unpaidOnlyAppointments.length === 0 ? (
                            <div className="empty-state">No unpaid appointments.</div>
                        ) : (
                            <div className="table-wrap">
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={cellStyle}>ID</th>
                                        <th style={cellStyle}>Date</th>
                                        <th style={cellStyle}>Time</th>
                                        <th style={cellStyle}>Status</th>
                                        <th style={cellStyle}>Patient</th>
                                        <th style={cellStyle}>Service</th>
                                        <th style={cellStyle}>Price</th>
                                        <th style={cellStyle}>Total Paid</th>
                                        <th style={cellStyle}>Pending</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unpaidOnlyAppointments.map((a) => (
                                        <tr key={a.id} style={unpaidRowStyle}>
                                            <td style={cellStyle}>{a.id}</td>
                                            <td style={cellStyle}>{formatDateDDMMYYYY(a.appointmentDate)}</td>
                                            <td style={cellStyle}>{formatTimeHHmm(a.appointmentTime)}</td>
                                            <td style={cellStyle}>
                                                <span className={`status-badge ${getAppointmentStatusClass(a.status)}`}>{a.status}</span>
                                            </td>
                                            <td style={cellStyle}>{a.patientName || a.patientId}</td>
                                            <td style={cellStyle}>{a.serviceName || a.serviceId}</td>
                                            <td style={cellStyle}>{formatMoney(getServicePrice(a))}</td>
                                            <td style={cellStyle}>{formatMoney(getEstimatedPaid(a))}</td>
                                            <td style={cellStyle}>{formatMoney(getEstimatedPending(a))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </section>

                    <section className="card">
                        <h2>Partially Paid Appointments</h2>
                        {partiallyPaidAppointments.length === 0 ? (
                            <div className="empty-state">No partially paid appointments.</div>
                        ) : (
                            <div className="table-wrap">
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={cellStyle}>ID</th>
                                        <th style={cellStyle}>Date</th>
                                        <th style={cellStyle}>Time</th>
                                        <th style={cellStyle}>Status</th>
                                        <th style={cellStyle}>Patient</th>
                                        <th style={cellStyle}>Service</th>
                                        <th style={cellStyle}>Price</th>
                                        <th style={cellStyle}>Total Paid</th>
                                        <th style={cellStyle}>Pending</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {partiallyPaidAppointments.map((a) => (
                                        <tr key={a.id} style={partialRowStyle}>
                                            <td style={cellStyle}>{a.id}</td>
                                            <td style={cellStyle}>{formatDateDDMMYYYY(a.appointmentDate)}</td>
                                            <td style={cellStyle}>{formatTimeHHmm(a.appointmentTime)}</td>
                                            <td style={cellStyle}>
                                                <span className={`status-badge ${getAppointmentStatusClass(a.status)}`}>{a.status}</span>
                                            </td>
                                            <td style={cellStyle}>{a.patientName || a.patientId}</td>
                                            <td style={cellStyle}>{a.serviceName || a.serviceId}</td>
                                            <td style={cellStyle}>{formatMoney(getServicePrice(a))}</td>
                                            <td style={cellStyle}>{formatMoney(getEstimatedPaid(a))}</td>
                                            <td style={cellStyle}>{formatMoney(getEstimatedPending(a))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </section>

                    <section className="card">
                        <h2>Paid Appointments</h2>
                        {paidAppointments.length === 0 ? (
                            <div className="empty-state">No paid appointments.</div>
                        ) : (
                            <div className="table-wrap">
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={cellStyle}>ID</th>
                                        <th style={cellStyle}>Date</th>
                                        <th style={cellStyle}>Time</th>
                                        <th style={cellStyle}>Status</th>
                                        <th style={cellStyle}>Patient</th>
                                        <th style={cellStyle}>Service</th>
                                        <th style={cellStyle}>Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paidAppointments.map((a) => (
                                        <tr key={a.id} style={paidRowStyle}>
                                            <td style={cellStyle}>{a.id}</td>
                                            <td style={cellStyle}>{formatDateDDMMYYYY(a.appointmentDate)}</td>
                                            <td style={cellStyle}>{formatTimeHHmm(a.appointmentTime)}</td>
                                            <td style={cellStyle}>
                                                <span className={`status-badge ${getAppointmentStatusClass(a.status)}`}>{a.status}</span>
                                            </td>
                                            <td style={cellStyle}>{a.patientName || a.patientId}</td>
                                            <td style={cellStyle}>{a.serviceName || a.serviceId}</td>
                                            <td style={cellStyle}>{formatMoney(getServicePrice(a))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default DoctorPaymentsPage;
