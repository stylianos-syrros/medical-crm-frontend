import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import { useState, useEffect } from "react";
import {
    createMyPatientProfile,
    getMyPatientProfile,
    updateMyPatientProfile,
    getMyDoctors,
} from "../features/user/patientApi";
import { changeMyPassword } from "../features/user/adminApi";
import { getAllMedicalServices } from "../features/user/medicalServiceApi";
import {
    cancelMyAppointment,
    getPatientUpcomingAppointments,
    getPatientAppointmentsHistory,
    updatePatientAppointmentNotes,
} from "../features/user/appointmentApi";
import { getMyPaidAppointments, getMyUnpaidAppointments } from "../features/user/paymentApi";
import { extractApiErrorMessage } from "../utils/errors";
import { formatDateDDMMYYYY, formatTimeHHmm, isFutureAppointment } from "../utils/dateTime";
import { filterAppointmentsByStatus, sortAppointmentsByDateTime } from "../utils/appointments";
import { getDefaultPatientProfileForm } from "../utils/forms";
import { getAnchoredActionMessageStyle, useAnchoredActionMessage } from "../utils/actionMessage";


function PatientDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { anchor, message, captureActionAnchor, showActionMessage, clearActionMessage } =
        useAnchoredActionMessage();

    const [patient, setPatient] = useState(null);
    const [needsProfile, setNeedsProfile] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [profileForm, setProfileForm] = useState(getDefaultPatientProfileForm());

    const [doctors, setDoctors] = useState([]);
    const [historyAppointments, setHistoryAppointments] = useState([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [allAppointments, setAllAppointments] = useState([]);
    const [medicalServices, setMedicalServices] = useState([]);
    const [notesByAppointmentId, setNotesByAppointmentId] = useState({});

    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [editingNotesId, setEditingNotesId] = useState(null);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "" });
    const [error, setError] = useState("");
    const [showDoctors, setShowDoctors] = useState(false);
    const [showMedicalServices, setShowMedicalServices] = useState(false);
    const [showUpcomingAppointments, setShowUpcomingAppointments] = useState(false);
    const [showAppointmentsHistory, setShowAppointmentsHistory] = useState(false);
    const [showAllAppointments, setShowAllAppointments] = useState(false);
    const [statusFilter, setStatusFilter] = useState("NONE");
    const [appointmentsWithPayments, setAppointmentsWithPayments] = useState(new Set());
    const [hoveredPaidUpcomingCancelId, setHoveredPaidUpcomingCancelId] = useState(null);

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

    const handleProfileChange = (e) => {
        setProfileForm((prev) => ({
            ...prev, [e.target.name]: e.target.value,
        }));
    };

    const loadPatientLists = async () => {
        const [doctorsData, upcomingData, historyData, servicesData, paidData, unpaidData] = await Promise.all([
            getMyDoctors(),
            getPatientUpcomingAppointments(),
            getPatientAppointmentsHistory(),
            getAllMedicalServices(),
            getMyPaidAppointments(),
            getMyUnpaidAppointments(),
        ]);

        setDoctors(doctorsData);
        setUpcomingAppointments(upcomingData);
        setHistoryAppointments(historyData);
        setMedicalServices(servicesData);
        const allData = sortAppointmentsByDateTime([...upcomingData, ...historyData]);
        setAllAppointments(allData);

        const notesMap = {};
        [...upcomingData, ...historyData].forEach((a) => {
            notesMap[a.id] = a.patientNotes || "";
        });
        setNotesByAppointmentId(notesMap);

        const hasAnyPaymentIds = new Set((paidData || []).map((a) => Number(a.id)));
        (unpaidData || []).forEach((a) => {
            const totalPaid = Number(a.totalPaid ?? a.paidAmount ?? a.amountPaid ?? 0);
            if (Number.isFinite(totalPaid) && totalPaid > 0) {
                hasAnyPaymentIds.add(Number(a.id));
            }
        });
        setAppointmentsWithPayments(hasAnyPaymentIds);

    };


    const loadPatientData = async () => {
        setLoading(true);
        setError("");

        try{
            const profile = await getMyPatientProfile();
            setPatient(profile);
            setNeedsProfile(false);
            setIsEditingProfile(false); 

            setProfileForm({
                firstName: profile.firstName || "",
                lastName: profile.lastName || "",
                dateOfBirth: profile.dateOfBirth || "",
                phone: profile.phone || "",
                notes: profile.notes || "",
            });

            await loadPatientLists();
        } catch (error) {
            if (error.response?.status === 404){
                setPatient(null);
                setNeedsProfile(true);
            } else {
                setError(extractApiErrorMessage(error));
            }          
        } finally{
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPatientData();
    }, []);

    useEffect(() => {
        if (error) {
            showActionMessage(error, "error");
        }
    }, [error]);

    const handleCreateProfile = async(e) =>{
        e.preventDefault();
        setError("");
        setProfileLoading(true);

        try{
            await createMyPatientProfile({
                firstName: profileForm.firstName.trim(),
                lastName: profileForm.lastName.trim(),
                dateOfBirth: profileForm.dateOfBirth,
                phone: profileForm.phone.trim(),
                notes: profileForm.notes.trim() || "",
            });

            await loadPatientData();
        } catch (error) {
            console.log("Patient create error:", error.response?.status, error.response?.data);
            setError(extractApiErrorMessage(error));
        }
        finally{
            setProfileLoading(false);
        }
    };

    const handleUpdateProfile = async(e) =>{
        e.preventDefault();
        setError("");
        setProfileLoading(true);

        try{
            const updated = await updateMyPatientProfile({
                firstName: profileForm.firstName.trim(),
                lastName: profileForm.lastName.trim(),
                dateOfBirth: profileForm.dateOfBirth,
                phone: profileForm.phone.trim(),
                notes: profileForm.notes?.trim() || "",
            });

            setPatient(updated);
            setIsEditingProfile(false);
            await loadPatientLists();
        } catch (error){
            setError(extractApiErrorMessage(error));
        } finally{
            setProfileLoading(false);
        }
    };

    const handlePasswordFormChange = (e) => {
        setPasswordForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleCancelPasswordChange = () => {
        setIsChangingPassword(false);
        setPasswordForm({ oldPassword: "", newPassword: "" });
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError("");
        setPasswordLoading(true);
        try {
            await changeMyPassword({
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword,
            });
            setPasswordForm({ oldPassword: "", newPassword: "" });
            setIsChangingPassword(false);
            showActionMessage("Password changed successfully", "success");
        } catch (error) {
            setError(extractApiErrorMessage(error, "Failed to change password"));
        } finally {
            setPasswordLoading(false);
        }
    };

    const onCancelAppointment = async (appointmentId) => {
        setError("");
        setActionLoadingId(appointmentId);
        try {
            await cancelMyAppointment(appointmentId);
            await loadPatientLists();
        } catch (error) {
            setError(extractApiErrorMessage(error, "Failed to cancel appointment"));
        } finally {
            setActionLoadingId(null);
        }
    };

    const onSaveAppointmentNotes = async (appointmentId) => {
        setError("");
        setEditingNotesId(null);
        setActionLoadingId(appointmentId);

        try {
            const notes = notesByAppointmentId[appointmentId] ?? "";
            await updatePatientAppointmentNotes(appointmentId, notes);
            setUpcomingAppointments((prev) =>
                prev.map((a) =>
                    a.id === appointmentId
                        ? { ...a, patientNotes: notes }
                        : a
                )
            );
            setAllAppointments((prev) =>
                prev.map((a) =>
                    a.id === appointmentId
                        ? { ...a, patientNotes: notes }
                        : a
                )
            );
            setHistoryAppointments((prev) =>
                prev.map((a) =>
                    a.id === appointmentId
                        ? { ...a, patientNotes: notes }
                        : a
                )
            );
        } catch (error) {
            setError(extractApiErrorMessage(error));
        } finally {
            setActionLoadingId(null);
        }
    };

    const onStartNotesEdit = (appointmentId) => {
        setEditingNotesId(appointmentId);
    };

    const onCancelNotesEdit = (appointmentId) => {
        const current = [...upcomingAppointments, ...historyAppointments].find((a) => a.id === appointmentId);
        setNotesByAppointmentId((prev) => ({
            ...prev,
            [appointmentId]: current?.patientNotes || "",
        }));
        setEditingNotesId(null);
    };


    const labelStyle = { display: "block", marginBottom: "10px" };
    const centeredTableStyle = { borderCollapse: "collapse", width: "100%", textAlign: "center", fontSize: "16px" };
    const centeredCellStyle = { textAlign: "center", verticalAlign: "middle", fontSize: "16px" };
    const filteredAppointments =
        statusFilter === "NONE"
            ? []
            : sortAppointmentsByDateTime(filterAppointmentsByStatus(allAppointments, statusFilter));

    const canCancelAppointment = (appointment) =>
        appointment?.status === "SCHEDULED" &&
        isFutureAppointment(appointment?.appointmentDate, appointment?.appointmentTime) &&
        !appointmentsWithPayments.has(Number(appointment?.id));

    const cancelActionLabel = (appointment) => {
        if (appointment?.status === "CANCELLED") return "Cancelled";
        if (appointment?.status === "COMPLETED") return "Completed";
        if (!isFutureAppointment(appointment?.appointmentDate, appointment?.appointmentTime)) return "Past";
        if (appointmentsWithPayments.has(Number(appointment?.id))) return "Paid";
        return "-";
    };

    return (
        <div style={{ padding: "24px" }} onClickCapture={handlePageClickCapture}>
            <h1>Patient Dashboard</h1>
            {message?.text && (
                <div style={getAnchoredActionMessageStyle(message.type, anchor)}>
                    {message.text}
                </div>
            )}

            <button onClick={handleLogout} style={{ marginBottom: "16px" }}>
                Logout
            </button>

            {loading && <p>Loading...</p>}
            {!loading && needsProfile && (
                <section style={{ marginTop: "16px", maxWidth: "520px" }}>
                    <h2>Create Your Profile</h2>

                    <form onSubmit={handleCreateProfile}>
                        <div style={{ marginBottom: "10px" }}>
                            <label style={labelStyle}>First Name</label>
                            <input 
                                name="firstName" 
                                value={profileForm.firstName} 
                                onChange={handleProfileChange} 
                                required style={{ width: "100%", padding: "8px" }} 
                            />
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                            <label style={labelStyle}>Last Name</label>
                            <input 
                                name="lastName" 
                                value={profileForm.lastName}    
                                onChange={handleProfileChange} 
                                required style={{ width: "100%", padding: "8px" }} 
                            />
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                            <label style={labelStyle}>Date Of Birth</label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={profileForm.dateOfBirth}
                                onChange={handleProfileChange}
                                max={new Date().toISOString().split("T")[0]}
                                required
                                style={{ width: "100%", padding: "8px" }}
                            />
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                            <label style={labelStyle}>Phone</label>
                            <input 
                                name="phone" 
                                value={profileForm.phone} 
                                onChange={handleProfileChange} 
                                required style={{ width: "100%", padding: "8px" }} 
                            />
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                            <label style={labelStyle}>Notes</label>
                            <input 
                                name="notes" 
                                value={profileForm.notes} 
                                onChange={handleProfileChange} 
                                style={{ width: "100%", padding: "8px" }} 
                            />
                        </div>

                        <button type="submit" disabled={profileLoading}>
                            {profileLoading ? "Saving..." : "Create Profile"}
                        </button>
                    </form>
                </section>
            )}

            {!loading && !needsProfile && patient && (
                <>
                    <section style={{ marginTop: "16px", maxWidth: "520px" }}>
                        <h2>My Profile</h2>

                        {!isEditingProfile ? (
                            <>
                                <p><strong>Name:</strong> {patient.firstName} {patient.lastName}</p>
                                <p><strong>Date Of Birth:</strong> {formatDateDDMMYYYY(patient.dateOfBirth)}</p>
                                <p><strong>Phone:</strong> {patient.phone}</p>
                                <p><strong>Notes:</strong> {patient.notes || "-"}</p>
                                <button onClick={() => setIsEditingProfile(true)}>Edit Profile</button>
                                <div style={{ marginTop: "24px" }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsChangingPassword((prev) => !prev);
                                            setPasswordForm({ oldPassword: "", newPassword: "" });
                                        }}
                                    >
                                        Change Password
                                    </button>
                                </div>
                                {isChangingPassword && (
                                    <form onSubmit={handleChangePassword} style={{ marginTop: "10px" }}>
                                        <div style={{ marginBottom: "10px" }}>
                                            <label style={labelStyle}>Old Password</label>
                                            <input
                                                type="password"
                                                name="oldPassword"
                                                value={passwordForm.oldPassword}
                                                onChange={handlePasswordFormChange}
                                                required
                                                style={{ width: "100%", padding: "8px" }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: "10px" }}>
                                            <label style={labelStyle}>New Password</label>
                                            <input
                                                type="password"
                                                name="newPassword"
                                                value={passwordForm.newPassword}
                                                onChange={handlePasswordFormChange}
                                                minLength={6}
                                                required
                                                style={{ width: "100%", padding: "8px" }}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={passwordLoading}
                                            style={{ marginRight: "8px" }}
                                        >
                                            {passwordLoading ? "Saving..." : "Save Password"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCancelPasswordChange}
                                            disabled={passwordLoading}
                                        >
                                            Cancel
                                        </button>
                                    </form>
                                )}
                            </>
                        ) : (
                            <form onSubmit={handleUpdateProfile}>
                                <div style={{ marginBottom: "10px" }}>
                                    <label>First Name</label>
                                    <input 
                                        name="firstName" 
                                        value={profileForm.firstName} 
                                        onChange={handleProfileChange} 
                                        required style={{ width: "100%", padding: "8px" }} 
                                    />
                                </div>

                                <div style={{ marginBottom: "10px" }}>
                                    <label>Last Name</label>
                                    <input 
                                        name="lastName" 
                                        value={profileForm.lastName} 
                                        onChange={handleProfileChange} 
                                        required style={{ width: "100%", padding: "8px" }} 
                                    />
                                </div>

                                <div style={{ marginBottom: "10px" }}>
                                    <label>Date Of Birth</label>
                                    <input 
                                        type="date"    
                                        name="dateOfBirth" 
                                        value={profileForm.dateOfBirth} 
                                        onChange={handleProfileChange} 
                                        required style={{ width: "100%", padding: "8px" }} 
                                    />
                                </div>

                                <div style={{ marginBottom: "10px" }}>
                                    <label>Phone</label>
                                    <input 
                                        name="phone"  
                                        value={profileForm.phone} 
                                        onChange={handleProfileChange} 
                                        required style={{ width: "100%", padding: "8px" }} 
                                    />
                                </div>

                                <div style={{ marginBottom: "10px" }}>
                                    <label>Notes</label>
                                    <input 
                                        name="notes" 
                                        value={profileForm.notes} 
                                        onChange={handleProfileChange} 
                                        style={{ width: "100%", padding: "8px" }} 
                                    />
                                </div>

                                <button type="submit" disabled={profileLoading} style={{ marginRight: "8px" }}>
                                    {profileLoading ? "Saving..." : "Save"}
                                </button>
                                <button type="button" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                            </form>
                        )}
                    </section>

                    <section style={{ marginTop: "24px" }}>
                        <button onClick={() => navigate("/patient/appointments")} style={{ marginRight: "8px" }}>
                            Open Appointment Booking Page
                        </button>
                    </section>

                    <section style={{ marginTop: "24px" }}>
                        <button onClick={() => navigate("/patient/payments")}>
                            Open Payments Page
                        </button>
                    </section>

                    <section style={{ marginTop: "24px" }}>
                        <h2>Filter Appointments By Status</h2>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: "8px", minWidth: "220px" }}
                        >
                            <option value="NONE">-</option>
                            <option value="ALL">All</option>
                            <option value="SCHEDULED">Scheduled</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>

                        {statusFilter !== "NONE" && (
                            <div style={{ marginTop: "12px" }}>
                                {filteredAppointments.length === 0 ? (
                                    <p>No appointments found for selected status.</p>
                                ) : (
                                    <table border="1" cellPadding="8" style={centeredTableStyle}>
                                        <thead>
                                            <tr>
                                                <th style={centeredCellStyle}>ID</th>
                                                <th style={centeredCellStyle}>Date</th>
                                                <th style={centeredCellStyle}>Time</th>
                                                <th style={centeredCellStyle}>Status</th>
                                                <th style={centeredCellStyle}>Doctor</th>
                                                <th style={centeredCellStyle}>Service</th>
                                                <th style={centeredCellStyle}>My Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAppointments.map((a) => (
                                                <tr key={a.id}>
                                                    <td style={centeredCellStyle}>{a.id}</td>
                                                    <td style={centeredCellStyle}>{formatDateDDMMYYYY(a.appointmentDate)}</td>
                                                    <td style={centeredCellStyle}>{formatTimeHHmm(a.appointmentTime)}</td>
                                                    <td style={centeredCellStyle}>{a.status}</td>
                                                    <td style={centeredCellStyle}>{a.doctorName || a.doctorId}</td>
                                                    <td style={centeredCellStyle}>{a.serviceName || a.serviceId}</td>
                                                    <td style={centeredCellStyle}>{a.patientNotes || "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </section>

                    <section style={{ marginTop: "24px" }}>
                        <h2>Upcoming Appointments</h2>
                        {!showUpcomingAppointments ? (
                            <button onClick={() => setShowUpcomingAppointments(true)}>Show Upcoming Appointments</button>
                        ) : (
                            <>
                                {upcomingAppointments.length === 0 ? (
                                    <p>No upcoming appointments.</p>
                                ) : (
                                    <table border="1" cellPadding="8" style={centeredTableStyle}>
                                        <thead>
                                            <tr>
                                                <th style={centeredCellStyle}>ID</th>
                                                <th style={centeredCellStyle}>Date</th>
                                                <th style={centeredCellStyle}>Time</th>
                                                <th style={centeredCellStyle}>Status</th>
                                                <th style={centeredCellStyle}>Doctor</th>
                                                <th style={centeredCellStyle}>Service</th>
                                                <th style={centeredCellStyle}>My Notes</th>
                                                <th style={centeredCellStyle}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {upcomingAppointments.map((a) => (
                                                <tr key={a.id}>
                                                    <td style={centeredCellStyle}>{a.id}</td>
                                                    <td style={centeredCellStyle}>{formatDateDDMMYYYY(a.appointmentDate)}</td>
                                                    <td style={centeredCellStyle}>{formatTimeHHmm(a.appointmentTime)}</td>
                                                    <td style={centeredCellStyle}>{a.status}</td>
                                                    <td style={centeredCellStyle}>{a.doctorName || a.doctorId}</td>
                                                    <td style={centeredCellStyle}>{a.serviceName || a.serviceId}</td>
                                                    <td style={centeredCellStyle}>
                                                        <div
                                                            style={{
                                                                minWidth: "240px",
                                                                margin: "0 auto",
                                                                border: "1px solid #d9e1ea",
                                                                borderRadius: "10px",
                                                                backgroundColor: "#f8fbff",
                                                                padding: "6px 10px",
                                                            }}
                                                        >
                                                            {editingNotesId === a.id ? (
                                                                <input
                                                                    value={notesByAppointmentId[a.id] ?? ""}
                                                                    onChange={(e) =>
                                                                        setNotesByAppointmentId((prev) => ({
                                                                            ...prev,
                                                                            [a.id]: e.target.value,
                                                                        }))
                                                                    }
                                                                    placeholder="Add your notes..."
                                                                    style={{
                                                                        width: "100%",
                                                                        border: "none",
                                                                        outline: "none",
                                                                        background: "transparent",
                                                                        padding: "4px 0",
                                                                        textAlign: "center",
                                                                        fontSize: "16px",
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div style={{ padding: "4px 0", fontSize: "16px", textAlign: "center" }}>
                                                                    {notesByAppointmentId[a.id] || a.patientNotes || "-"}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={centeredCellStyle}>
                                                        {editingNotesId === a.id ? (
                                                            <>
                                                                <button
                                                                    onClick={() => onSaveAppointmentNotes(a.id)}
                                                                    disabled={actionLoadingId === a.id}
                                                                    style={{ marginRight: "8px" }}
                                                                >
                                                                    {actionLoadingId === a.id ? "Saving..." : "Save Notes"}
                                                                </button>
                                                                <button
                                                                    onClick={() => onCancelNotesEdit(a.id)}
                                                                    disabled={actionLoadingId === a.id}
                                                                    style={{ marginRight: "8px" }}
                                                                >
                                                                    Cancel Edit
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => onStartNotesEdit(a.id)}
                                                                disabled={actionLoadingId === a.id}
                                                                style={{ marginRight: "8px" }}
                                                            >
                                                                Update Notes
                                                            </button>
                                                        )}
                                                        {canCancelAppointment(a) ? (
                                                            <button
                                                                onClick={() => onCancelAppointment(a.id)}
                                                                disabled={actionLoadingId === a.id}
                                                            >
                                                                {actionLoadingId === a.id ? "Cancelling..." : "Cancel Appointment"}
                                                            </button>
                                                        ) : appointmentsWithPayments.has(Number(a?.id)) ? (
                                                            <span
                                                                style={{
                                                                    display: "inline-flex",
                                                                    flexDirection: "column",
                                                                    alignItems: "center",
                                                                    position: "relative",
                                                                    cursor: "not-allowed",
                                                                }}
                                                                onMouseEnter={() => setHoveredPaidUpcomingCancelId(a.id)}
                                                                onMouseLeave={() => {
                                                                    if (hoveredPaidUpcomingCancelId === a.id) {
                                                                        setHoveredPaidUpcomingCancelId(null);
                                                                    }
                                                                }}
                                                            >
                                                                <button
                                                                    disabled
                                                                    style={{
                                                                        opacity: 0.55,
                                                                        cursor: "not-allowed",
                                                                        pointerEvents: "none",
                                                                    }}
                                                                >
                                                                    Cancel Appointment
                                                                </button>
                                                                {hoveredPaidUpcomingCancelId === a.id && (
                                                                    <span
                                                                        style={{
                                                                            position: "absolute",
                                                                            bottom: "calc(100% + 8px)",
                                                                            left: "50%",
                                                                            transform: "translateX(-50%)",
                                                                            backgroundColor: "#111827",
                                                                            color: "#fff",
                                                                            padding: "6px 8px",
                                                                            borderRadius: "6px",
                                                                            fontSize: "12px",
                                                                            whiteSpace: "nowrap",
                                                                            zIndex: 5,
                                                                        }}
                                                                    >
                                                                        Appointment has payment and cannot be cancelled
                                                                    </span>
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    display: "inline-block",
                                                                    padding: "6px 12px",
                                                                    borderRadius: "999px",
                                                                    backgroundColor: "#f2f4f7",
                                                                    color: "#4b5563",
                                                                    fontWeight: 600,
                                                                    fontSize: "14px",
                                                                }}
                                                            >
                                                                {cancelActionLabel(a)}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <button onClick={() => setShowUpcomingAppointments(false)} style={{ marginTop: "10px" }}>
                                    Hide Upcoming Appointments
                                </button>
                            </>
                        )}
                    </section>

                    <section style={{ marginTop: "24px" }}>
                        <h2>Appointments History</h2>
                        {!showAppointmentsHistory ? (
                            <button onClick={() => setShowAppointmentsHistory(true)}>Show Appointments History</button>
                        ) : (
                            <>
                                {historyAppointments.length === 0 ? (
                                    <p>No past appointments yet.</p>
                                ) : (
                                    <table border="1" cellPadding="8" style={centeredTableStyle}>
                                        <thead>
                                            <tr>
                                                <th style={centeredCellStyle}>ID</th>
                                                <th style={centeredCellStyle}>Date</th>
                                                <th style={centeredCellStyle}>Time</th>
                                                <th style={centeredCellStyle}>Status</th>
                                                <th style={centeredCellStyle}>Doctor</th>
                                                <th style={centeredCellStyle}>Service</th>
                                                <th style={centeredCellStyle}>My Notes</th>
                                                <th style={centeredCellStyle}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyAppointments.map((a) => (
                                                <tr key={a.id}>
                                                    <td style={centeredCellStyle}>{a.id}</td>
                                                    <td style={centeredCellStyle}>{formatDateDDMMYYYY(a.appointmentDate)}</td>
                                                    <td style={centeredCellStyle}>{formatTimeHHmm(a.appointmentTime)}</td>
                                                    <td style={centeredCellStyle}>{a.status}</td>
                                                    <td style={centeredCellStyle}>{a.doctorName || a.doctorId}</td>
                                                    <td style={centeredCellStyle}>{a.serviceName || a.serviceId}</td>
                                                    <td style={centeredCellStyle}>
                                                        <div
                                                            style={{
                                                                minWidth: "240px",
                                                                margin: "0 auto",
                                                                border: "1px solid #d9e1ea",
                                                                borderRadius: "10px",
                                                                backgroundColor: "#f8fbff",
                                                                padding: "6px 10px",
                                                            }}
                                                        >
                                                            {editingNotesId === a.id ? (
                                                                <input
                                                                    value={notesByAppointmentId[a.id] ?? ""}
                                                                    onChange={(e) =>
                                                                        setNotesByAppointmentId((prev) => ({
                                                                            ...prev,
                                                                            [a.id]: e.target.value,
                                                                        }))
                                                                    }
                                                                    placeholder="Add your notes..."
                                                                    style={{
                                                                        width: "100%",
                                                                        border: "none",
                                                                        outline: "none",
                                                                        background: "transparent",
                                                                        padding: "4px 0",
                                                                        textAlign: "center",
                                                                        fontSize: "16px",
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div style={{ padding: "4px 0", fontSize: "16px", textAlign: "center" }}>
                                                                    {notesByAppointmentId[a.id] || a.patientNotes || "-"}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={centeredCellStyle}>
                                                        {editingNotesId === a.id ? (
                                                            <>
                                                                <button
                                                                    onClick={() => onSaveAppointmentNotes(a.id)}
                                                                    disabled={actionLoadingId === a.id}
                                                                    style={{ marginRight: "8px" }}
                                                                >
                                                                    {actionLoadingId === a.id ? "Saving..." : "Save Notes"}
                                                                </button>
                                                                <button
                                                                    onClick={() => onCancelNotesEdit(a.id)}
                                                                    disabled={actionLoadingId === a.id}
                                                                    style={{ marginRight: "8px" }}
                                                                >
                                                                    Cancel Edit
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => onStartNotesEdit(a.id)}
                                                                disabled={actionLoadingId === a.id}
                                                                style={{ marginRight: "8px" }}
                                                            >
                                                                Update Notes
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <button onClick={() => setShowAppointmentsHistory(false)} style={{ marginTop: "10px" }}>
                                    Hide Appointments History
                                </button>
                            </>
                        )}
                    </section>

                    <section style={{ marginTop: "24px" }}>
                        <h2>My Doctors</h2>
                        {!showDoctors ? (
                            <button onClick={() => setShowDoctors(true)}>Show Doctors</button>
                        ) : (
                            <>
                                {doctors.length === 0 ? (
                                    <p>No doctors found.</p>
                                ) : (
                                    <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>First Name</th>
                                                <th>Last Name</th>
                                                <th>Specialty</th>
                                                <th>Phone</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {doctors.map((d) => (
                                                <tr key={d.id}>
                                                    <td>{d.id}</td>
                                                    <td>{d.firstName}</td>
                                                    <td>{d.lastName}</td>
                                                    <td>{d.specialty}</td>
                                                    <td>{d.phone}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <button onClick={() => setShowDoctors(false)} style={{ marginTop: "10px" }}>
                                    Hide Doctors
                                </button>
                            </>
                        )}
                    </section>

                    <section style={{ marginTop: "24px" }}>
                        <h2>Medical Services</h2>
                        {!showMedicalServices ? (
                            <button onClick={() => setShowMedicalServices(true)}>Show Medical Services</button>
                        ) : (
                            <>
                                {medicalServices.length === 0 ? (
                                    <p>No medical services available.</p>
                                ) : (
                                    <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Name</th>
                                                <th>Description</th>
                                                <th>Price (USD)</th>
                                                <th>Duration (minutes)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {medicalServices.map((service) => (
                                                <tr key={service.id}>
                                                    <td>{service.id}</td>
                                                    <td>{service.name}</td>
                                                    <td>{service.description || "-"}</td>
                                                    <td>{service.price}</td>
                                                    <td>{service.duration} min</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <button onClick={() => setShowMedicalServices(false)} style={{ marginTop: "10px" }}>
                                    Hide Medical Services
                                </button>
                            </>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default PatientDashboard;

