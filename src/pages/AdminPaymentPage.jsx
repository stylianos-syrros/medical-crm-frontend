import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import { getAllPayments } from "../features/user/paymentApi";
import { getAllAppointments } from "../features/user/appointmentApi";
import { getAllMedicalServices } from "../features/user/medicalServiceApi";
import { extractApiErrorMessage } from "../utils/errors";
import { formatDateTimeDDMMYYYY } from "../utils/dateTime";
import { getAnchoredActionMessageStyle, useAnchoredActionMessage } from "../utils/actionMessage";

function AdminPaymentsPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { anchor, message, captureActionAnchor, showActionMessage, clearActionMessage } =
        useAnchoredActionMessage();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [payments, setPayments] = useState([]);
    const [appointmentServicePriceById, setAppointmentServicePriceById] = useState({});
    const [appointmentPatientNameById, setAppointmentPatientNameById] = useState({});
    const [appointmentDoctorNameById, setAppointmentDoctorNameById] = useState({});

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
            (services || []).forEach((service) => { ////
                servicePriceById[service.id] = Number(service.price || 0);
            });

            const appointmentPriceById = {};
            const appointmentPatientById = {};
            const appointmentDoctorById = {};
            (appointments || []).forEach((appointment) => { ////
                const price = Number(servicePriceById[appointment.serviceId] || 0);
                appointmentPriceById[appointment.id] = price;
                appointmentPatientById[appointment.id] = appointment.patientName || appointment.patientId || "-";
                appointmentDoctorById[appointment.id] = appointment.doctorName || appointment.doctorId || "-";
            });

            setAppointmentServicePriceById(appointmentPriceById);
            setAppointmentPatientNameById(appointmentPatientById);
            setAppointmentDoctorNameById(appointmentDoctorById);
            setPayments(data || []);
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
    const cellStyle = { border: "1px solid #ccc", padding: "8px" };

    return (
        <div style={{ padding: "24px" }} onClickCapture={handlePageClickCapture}>
            <h1>Admin Payments</h1>
            {message?.text && (
                <div style={getAnchoredActionMessageStyle(message.type, anchor)}>
                    {message.text}
                </div>
            )}

            <div style={{ marginBottom: "16px" }}>
                <button onClick={() => navigate("/admin")} style={{ marginRight: "8px" }}>
                    Back To Dashboard
                </button>
                <button onClick={handleLogout}>Logout</button>
            </div>

            {loading && <p>Loading...</p>}
            {!loading && (
                payments.length === 0 ? (
                    <p>No payments found.</p>
                ) : (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={cellStyle}>ID</th>
                                <th style={cellStyle}>Appointment ID</th>
                                <th style={cellStyle}>Patient Full Name</th>
                                <th style={cellStyle}>Doctor Full Name</th>
                                <th style={cellStyle}>Amount</th>
                                <th style={cellStyle}>Service Price</th>
                                <th style={cellStyle}>Method</th>
                                <th style={cellStyle}>Status</th>
                                <th style={cellStyle}>Paid At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => (
                                <tr key={p.id}>
                                    <td style={cellStyle}>{p.id}</td>
                                    <td style={cellStyle}>{p.appointmentId}</td>
                                    <td style={cellStyle}>{appointmentPatientNameById[p.appointmentId] || "-"}</td>
                                    <td style={cellStyle}>{appointmentDoctorNameById[p.appointmentId] || "-"}</td>
                                    <td style={cellStyle}>{Number(p.amount || 0).toFixed(2)}</td>
                                    <td style={cellStyle}>
                                        {Number(
                                            p.servicePrice ?? appointmentServicePriceById[p.appointmentId] ?? 0
                                        ).toFixed(2)}
                                    </td>
                                    <td style={cellStyle}>{p.method}</td>
                                    <td style={cellStyle}>{p.status}</td>
                                    <td style={cellStyle}>{formatDateTimeDDMMYYYY(p.paidAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            )}
        </div>
    );
}

export default AdminPaymentsPage;
