import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import { getAllPayments } from "../features/user/paymentApi";
import { extractApiErrorMessage } from "../utils/errors";

function AdminPaymentsPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [payments, setPayments] = useState([]);

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    const loadPayments = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getAllPayments();
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

    const tableStyle = { borderCollapse: "collapse", width: "100%", textAlign: "center" };
    const cellStyle = { border: "1px solid #ccc", padding: "8px" };

    return (
        <div style={{ padding: "24px" }}>
            <h1>Admin Payments</h1>

            <div style={{ marginBottom: "16px" }}>
                <button onClick={() => navigate("/admin")} style={{ marginRight: "8px" }}>
                    Back To Dashboard
                </button>
                <button onClick={handleLogout}>Logout</button>
            </div>

            {loading && <p>Loading...</p>}
            {!loading && error && <p style={{ color: "red" }}>{error}</p>}

            {!loading && (
                payments.length === 0 ? (
                    <p>No payments found.</p>
                ) : (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={cellStyle}>ID</th>
                                <th style={cellStyle}>Appointment ID</th>
                                <th style={cellStyle}>Patient ID</th>
                                <th style={cellStyle}>Patient Email</th>
                                <th style={cellStyle}>Amount</th>
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
                                    <td style={cellStyle}>{p.patientId}</td>
                                    <td style={cellStyle}>{p.patientEmail || "-"}</td>
                                    <td style={cellStyle}>{Number(p.amount || 0).toFixed(2)}</td>
                                    <td style={cellStyle}>{p.method}</td>
                                    <td style={cellStyle}>{p.status}</td>
                                    <td style={cellStyle}>{p.paidAt ? String(p.paidAt).replace("T", " ") : "-"}</td>
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