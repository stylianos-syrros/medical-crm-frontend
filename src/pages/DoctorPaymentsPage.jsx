import { useEffect, useState } from "react";
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
import { extractApiErrorMessage } from "../utils/errors";
import { formatTimeHHmm } from "../utils/dateTime";
import { sortAppointmentsByDateTime } from "../utils/appointments";
import { computePaymentProgress } from "../utils/payments";

function DoctorPaymentsPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [paidAppointments, setPaidAppointments] = useState([]);
    const [unpaidAppointments, setUnpaidAppointments] = useState([]);

    const [totalReceived, setTotalReceived] = useState(0);
    const [totalPending, setTotalPending] = useState(0);
    const [totalExpected, setTotalExpected] = useState(0);

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    const loadData = async () => {
        setLoading(true);
        setError("");

        try {
            const [paid, unpaid, received, pending, expected] = await Promise.all([
                getMyDoctorPaidAppointments(),
                getMyDoctorUnpaidAppointments(),
                getMyDoctorTotalReceived(),
                getMyDoctorTotalPending(),
                getMyDoctorTotalExpected(),
            ]);

            setPaidAppointments(sortAppointmentsByDateTime(paid || []));
            setUnpaidAppointments(sortAppointmentsByDateTime(unpaid || []));
            setTotalReceived(Number(received || 0));
            setTotalPending(Number(pending || 0));
            setTotalExpected(Number(expected || 0));
        } catch (err) {
            setError(extractApiErrorMessage(err, "Failed to load doctor payments"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const progress = computePaymentProgress(totalReceived, totalExpected);

    const tableStyle = { borderCollapse: "collapse", width: "100%", textAlign: "center" };
    const cellStyle = { border: "1px solid #ccc", padding: "8px" };

    return (
        <div style={{ padding: "24px" }}>
            <h1>Doctor Payments</h1>

            <div style={{ marginBottom: "16px" }}>
                <button onClick={() => navigate("/doctor")} style={{ marginRight: "8px" }}>
                    Back To Dashboard
                </button>
                <button onClick={handleLogout}>Logout</button>
            </div>

            {loading && <p>Loading...</p>}
            {!loading && error && <p style={{ color: "red" }}>{error}</p>}

            {!loading && (
                <>
                    <section style={{ marginBottom: "24px" }}>
                        <h2>Payment Summary</h2>
                        <p><strong>Total Expected:</strong> {totalExpected.toFixed(2)}</p>
                        <p><strong>Total Received:</strong> {totalReceived.toFixed(2)}</p>
                        <p><strong>Total Pending:</strong> {totalPending.toFixed(2)}</p>
                        <p><strong>Progress:</strong> {progress.status}</p>
                    </section>

                    <section style={{ marginBottom: "24px" }}>
                        <h2>Unpaid Appointments</h2>
                        {unpaidAppointments.length === 0 ? (
                            <p>No unpaid appointments.</p>
                        ) : (
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={cellStyle}>ID</th>
                                        <th style={cellStyle}>Date</th>
                                        <th style={cellStyle}>Time</th>
                                        <th style={cellStyle}>Status</th>
                                        <th style={cellStyle}>Patient</th>
                                        <th style={cellStyle}>Service</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unpaidAppointments.map((a) => (
                                        <tr key={a.id}>
                                            <td style={cellStyle}>{a.id}</td>
                                            <td style={cellStyle}>{a.appointmentDate}</td>
                                            <td style={cellStyle}>{formatTimeHHmm(a.appointmentTime)}</td>
                                            <td style={cellStyle}>{a.status}</td>
                                            <td style={cellStyle}>{a.patientName || a.patientId}</td>
                                            <td style={cellStyle}>{a.serviceName || a.serviceId}</td>
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
                                        <th style={cellStyle}>Patient</th>
                                        <th style={cellStyle}>Service</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paidAppointments.map((a) => (
                                        <tr key={a.id}>
                                            <td style={cellStyle}>{a.id}</td>
                                            <td style={cellStyle}>{a.appointmentDate}</td>
                                            <td style={cellStyle}>{formatTimeHHmm(a.appointmentTime)}</td>
                                            <td style={cellStyle}>{a.status}</td>
                                            <td style={cellStyle}>{a.patientName || a.patientId}</td>
                                            <td style={cellStyle}>{a.serviceName || a.serviceId}</td>
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

export default DoctorPaymentsPage;
