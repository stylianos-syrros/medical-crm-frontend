import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import { useState, useEffect} from "react";
import {
    createMyDoctorProfile,
    getMyDoctorProfile,
    getMyPatients,
    updateMyDoctorProfile,
} from "../features/user/doctorApi";
import { changeMyPassword } from "../features/user/adminApi";
import {
  getDoctorUpcomingAppointments,
  getDoctorAppointmentsHistory,
  getDoctorAppointmentsByStatus,
  updateDoctorAppointmentNotes,
  completeDoctorAppointment,
  cancelDoctorAppointment,
} from "../features/user/appointmentApi";
import { getMyDoctorPaidAppointments, getMyDoctorUnpaidAppointments } from "../features/user/paymentApi";
import { extractApiErrorMessage } from "../utils/errors";
import { sortAppointmentsByDateTime } from "../utils/appointments";
import { formatDateDDMMYYYY, formatTimeHHmm, isFutureAppointment } from "../utils/dateTime";
import { normalizeStatus } from "../utils/status";
import { getDefaultDoctorProfileForm } from "../utils/forms";
import { getAnchoredActionMessageStyle, useAnchoredActionMessage } from "../utils/actionMessage";


function DoctorDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { anchor, message, captureActionAnchor, showActionMessage, clearActionMessage } =
        useAnchoredActionMessage();
    
    const [doctor, setDoctor] = useState(null);
    const [needsProfile, setNeedsProfile] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [profileForm, setProfileForm] = useState(getDefaultDoctorProfileForm());

    const [patients, setPatients] = useState([]);
    const [historyAppointments, setHistoryAppointments] = useState([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [notesById, setNotesById] = useState({});

    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [error, setError] = useState("");
    const [editingNotesId, setEditingNotesId] = useState(null);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "" });
    const [showUpcomingAppointments, setShowUpcomingAppointments] = useState(false);
    const [showAppointmentsHistory, setShowAppointmentsHistory] = useState(false);
    const [showMyPatients, setShowMyPatients] = useState(false);
    const [showAllAppointments, setShowAllAppointments] = useState(false);
    const [paidAppointmentIds, setPaidAppointmentIds] = useState(new Set());
    const [appointmentsWithPayments, setAppointmentsWithPayments] = useState(new Set());
    const [hoveredUnpaidHistoryId, setHoveredUnpaidHistoryId] = useState(null);
    const [hoveredPaidUpcomingCancelId, setHoveredPaidUpcomingCancelId] = useState(null);

    const [filteredAppointments, setFilteredAppointments] = useState([]);
    const [statusFilter, setStatusFilter] = useState("NONE");

    const centeredTableStyle = { borderCollapse: "collapse", width: "100%", textAlign: "center", fontSize: "16px" };
    const centeredCellStyle = { textAlign: "center", verticalAlign: "middle", fontSize: "16px" };
    const allAppointments = sortAppointmentsByDateTime([...upcomingAppointments, ...historyAppointments]);


    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    }

    const handlePageClickCapture = (e) => {
        const didClickButton = captureActionAnchor(e);
        if (!didClickButton) return;
        setError("");
        clearActionMessage();
    };

    const handleProfileChange = (e) =>{
        setProfileForm((prev) => ({
            ...prev, [e.target.name]: e.target.value,
        }));
    };

    const loadDoctorLists = async() => { 
        const [patientsData, historyData, upcomingData, paidData, unpaidData] = await Promise.all([
            getMyPatients(),
            getDoctorAppointmentsHistory(),
            getDoctorUpcomingAppointments(),
            getMyDoctorPaidAppointments(),
            getMyDoctorUnpaidAppointments(),
        ]);

        setPatients(patientsData);
        setHistoryAppointments(historyData);
        setUpcomingAppointments(upcomingData);
        setPaidAppointmentIds(new Set((paidData || []).map((a) => Number(a.id))));
        const hasAnyPaymentIds = new Set((paidData || []).map((a) => Number(a.id)));
        (unpaidData || []).forEach((a) => {
            const totalPaid = Number(a.totalPaid ?? a.paidAmount ?? a.amountPaid ?? 0);
            if (Number.isFinite(totalPaid) && totalPaid > 0) {
                hasAnyPaymentIds.add(Number(a.id));
            }
        });
        setAppointmentsWithPayments(hasAnyPaymentIds);

        const notesMap ={}; 
        [...upcomingData, ...historyData].forEach((a) => {
            notesMap[a.id] = a.doctorNotes || "";
        });
        setNotesById(notesMap);
    }

    const loadDoctorData = async () => { 
        setLoading(true);
        setError("");

        try {
            const profile = await getMyDoctorProfile();
            setDoctor(profile);
            setNeedsProfile(false);
            setIsEditingProfile(false);
            
            setProfileForm({
                firstName: profile.firstName || "",
                lastName: profile.lastName || "",
                specialty: profile.specialty || "",
                phone: profile.phone || "",
            })

            await loadDoctorLists();
        } catch (error){ 
            if (error.response?.status === 404) {
                setDoctor(null);
                setNeedsProfile(true);
            } else {
                setError(extractApiErrorMessage(error));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDoctorData();
    },[]);

    useEffect(() => {
        if (error) {
            showActionMessage(error, "error");
        }
    }, [error]);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                await loadFilteredAppointments(statusFilter);
            } catch (error) {
                if (mounted) setError(extractApiErrorMessage(error));
            }
        })();

        return () => {
            mounted = false;
        };
    }, [statusFilter]);


    const handleCreateProfile = async (e) => {
        e.preventDefault();
        setError("");
        setProfileLoading(true);

        try {
            await createMyDoctorProfile({
                firstName: profileForm.firstName.trim(),
                lastName: profileForm.lastName.trim(),
                specialty: profileForm.specialty,
                phone: profileForm.phone.trim(),
            });

            await loadDoctorData();
        } catch (error){
            setError(extractApiErrorMessage(error));
        } finally {
            setProfileLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setError("");
        setProfileLoading(true);

        try{
            const updated = await updateMyDoctorProfile({
                firstName: profileForm.firstName.trim(),
                lastName: profileForm.lastName.trim(),
                specialty: profileForm.specialty,
                phone: profileForm.phone.trim(),
            });

            setDoctor(updated);
            setIsEditingProfile(false);
        } catch (error){
            setError(extractApiErrorMessage(error));
        } finally {
            setProfileLoading(false);
        }
    }

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

    const onSaveNotes = async (appointmentId) =>{
        setEditingNotesId(null);
        setActionLoadingId(appointmentId);
        setError("");

        try {
            const notes = notesById[appointmentId] ?? "";
            await updateDoctorAppointmentNotes(appointmentId, notes);
            await loadDoctorLists();
            await loadFilteredAppointments(statusFilter);
        } catch (error){
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
        setNotesById((prev) => ({
            ...prev,
            [appointmentId]: current?.doctorNotes || "",
        }));
        setEditingNotesId(null);
    };

    const onComplete = async (appointmentId) =>{
        setActionLoadingId(appointmentId);
        setError("");

        try {
            await completeDoctorAppointment(appointmentId);
            await loadDoctorLists();
            await loadFilteredAppointments(statusFilter);
        } catch (error){
            setError(extractApiErrorMessage(error));
        }finally {
            setActionLoadingId(null);
        }
    };

    const onCompleteFromHistory = async (appointmentId) => {
        if (!paidAppointmentIds.has(appointmentId)) {
            setError("Appointment cannot be completed unless fully paid");
            return;
        }
        await onComplete(appointmentId);
    };

    const loadFilteredAppointments = async (status) => {
        if (status === "NONE") {
            setFilteredAppointments([]);
            return;
        }

        if (status === "ALL") {
            const [scheduled, completed, cancelled] = await Promise.all([
                getDoctorAppointmentsByStatus("SCHEDULED"),
                getDoctorAppointmentsByStatus("COMPLETED"),
                getDoctorAppointmentsByStatus("CANCELLED"),
            ]);

            setFilteredAppointments(sortAppointmentsByDateTime([...scheduled, ...completed, ...cancelled]));
            return;
        }

        const data = await getDoctorAppointmentsByStatus(normalizeStatus(status));
        setFilteredAppointments(data);
    };


    const onCancel = async (appointmentId) => {
        setActionLoadingId(appointmentId);
        setError("");
        try {
            await cancelDoctorAppointment(appointmentId);
            await loadDoctorLists();
            await loadFilteredAppointments(statusFilter);
        } catch (error) {
            setError(extractApiErrorMessage(error));
        } finally {
            setActionLoadingId(null);
        }
    };

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
            <h1>Doctor Dashboard</h1>
            {message?.text && (
                <div style={getAnchoredActionMessageStyle(message.type, anchor)}>
                    {message.text}
                </div>
            )}
            
            <button onClick={handleLogout}style={{ marginBottom: "16px" }}>
                Logout
            </button>

            {loading && <p>Loading...</p>}
            {!loading && needsProfile && (
                <section style={{ marginTop: "16px", maxWidth: "480px"}}>
                    <h2>Create Your Profile</h2>

                    <form onSubmit={handleCreateProfile}>
                        <div style ={{ marginBottom: "10px"}}>
                            <label>First Name</label>
                            <input
                                name = "firstName"
                                value = {profileForm.firstName}
                                onChange = {handleProfileChange}
                                style = {{ width: "100%", padding: "8px" }}
                                required
                            />
                        </div>

                        <div style ={{ marginBottom: "10px"}}>
                            <label>Last Name</label>
                            <input
                                name = "lastName"
                                value = {profileForm.lastName}
                                onChange = {handleProfileChange}
                                style = {{ width: "100%", padding: "8px" }}
                                required 
                            />
                        </div>

                        <div style ={{ marginBottom: "10px"}}>
                            <label>Specialty</label>
                            <select
                                name = "specialty"
                                value = {profileForm.specialty}
                                onChange = {handleProfileChange}
                                style = {{ width: "100%", padding: "8px" }}
                                required
                            >
                                <option value="" disabled>Select Specialty</option>
                                <option value="CARDIOLOGY">Cardiology</option>
                                <option value="DERMATOLOGY">Dermatology</option>
                                <option value="NEUROLOGY">Neurology</option>
                                <option value="ORTHOPEDICS">Orthopedics</option>
                                <option value="PEDIATRICS">Pediatrics</option>
                                <option value="PSYCHIATRY">Psychiatry</option>
                            </select>
                        </div>

                        <div style ={{marginBottom: "10px"}}>
                            <label>Phone</label>
                            <input
                                name = "phone"
                                value = {profileForm.phone}
                                onChange = {handleProfileChange}
                                style = {{ width: "100%", padding: "8px" }}
                                required
                            />
                        </div>

                        <button type="submit" disabled={profileLoading}>
                            {profileLoading ? "Saving..." : "Create Profile"}
                        </button>

                    </form>
                </section>
            )}

            {!loading && !needsProfile && (
                <>
                    <section style={{ marginTop: "16px"}}>
                        <h2>My Profile</h2>

                        {!isEditingProfile ? (
                            <>
                                <p>
                                    <strong>Name:</strong> {doctor.firstName} {doctor.lastName}
                                </p>
                                <p>
                                    <strong>Specialty:</strong> {doctor.specialty}
                                </p>
                                <p>
                                    <strong>Phone:</strong> {doctor.phone}
                                </p>
                                <button onClick={() => setIsEditingProfile(true)}>
                                    Edit Profile
                                </button>
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
                                    <form onSubmit={handleChangePassword} style={{ marginTop: "10px", maxWidth: "480px" }}>
                                        <div style={{ marginBottom: "10px" }}>
                                            <label style={{ display: "block", marginBottom: "8px" }}>Old Password</label>
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
                                            <label style={{ display: "block", marginBottom: "8px" }}>New Password</label>
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
                                <div style={{ marginBottom: "16px" }}>
                                    <label>First Name</label>
                                    <input
                                        name="firstName"
                                        value={profileForm.firstName}
                                        onChange={handleProfileChange}
                                        style={{ width: "100%", padding: "8px" }}
                                        required
                                    />
                                </div>

                                <div style={{ marginBottom: "10px" }}>
                                    <label>Last Name</label>
                                    <input
                                        name="lastName"
                                        value={profileForm.lastName}
                                        onChange={handleProfileChange}
                                        style={{ width: "100%", padding: "8px" }}
                                        required
                                    />
                                </div>

                                <div style ={{ marginBottom: "10px"}}>
                                    <label>Specialty</label>
                                    <select
                                        name = "specialty"
                                        value = {profileForm.specialty}
                                        onChange = {handleProfileChange}
                                        style = {{ width: "100%", padding: "8px" }}
                                        required
                                    >
                                        <option value="" disabled>Select Specialty</option>
                                        <option value="CARDIOLOGY">Cardiology</option>
                                        <option value="DERMATOLOGY">Dermatology</option>
                                        <option value="NEUROLOGY">Neurology</option>
                                        <option value="ORTHOPEDICS">Orthopedics</option>
                                        <option value="PEDIATRICS">Pediatrics</option>
                                        <option value="PSYCHIATRY">Psychiatry</option>
                                    </select>
                                </div>

                                <div style ={{marginBottom: "10px"}}>
                                    <label>Phone</label>
                                    <input
                                        name = "phone"
                                        value = {profileForm.phone}
                                        onChange = {handleProfileChange}
                                        style = {{ width: "100%", padding: "8px" }}
                                        required
                                    />
                                </div>

                                <button type="submit" disabled={profileLoading} style={{ marginRight: "8px" }}>
                                    {profileLoading ? "Saving..." : "Save"}
                                </button>
                                <button type="button" onClick={() => setIsEditingProfile(false)}>
                                    Cancel
                                </button>
                            </form>
                        )}
                    </section>

                    <section style={{ marginTop: "24px" }}>
                        <button onClick={() => navigate("/doctor/payments")}>
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
                                    <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Date</th>
                                                <th>Time</th>
                                                <th>Status</th>
                                                <th>Patient</th>
                                                <th>Service</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAppointments.map((a) => (
                                                <tr key={a.id}>
                                                    <td>{a.id}</td>
                                                    <td>{formatDateDDMMYYYY(a.appointmentDate)}</td>
                                                    <td>{formatTimeHHmm(a.appointmentTime)}</td>
                                                    <td>{a.status}</td>
                                                    <td>{a.patientName || a.patientId}</td>
                                                    <td>{a.serviceName || a.serviceId}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </section>

                    <section style={{ marginTop: "24px"}}>
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
                                                <th style={centeredCellStyle}>Patient</th>
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
                                                    <td style={centeredCellStyle}>{a.patientName}</td>
                                                    <td style={centeredCellStyle}>{a.serviceName}</td>
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
                                                                    value={notesById[a.id] ?? ""}
                                                                    onChange={(e) =>
                                                                        setNotesById((prev) => ({
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
                                                                    {notesById[a.id] || a.doctorNotes || "-"}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={centeredCellStyle}>
                                                        {editingNotesId === a.id ? (
                                                            <>
                                                                <button
                                                                    onClick={() => onSaveNotes(a.id)}
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
                                                                onClick={() => onCancel(a.id)}
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

                    <section style ={{marginTop: "24px"}}>
                        <h2>Appointments History</h2>
                        {!showAppointmentsHistory ? (
                            <button onClick={() => setShowAppointmentsHistory(true)}>Show Appointments History</button>
                        ) : (
                            <>
                                {historyAppointments.length === 0? (
                                    <p>No past appointments yet.</p>
                                ) : (
                                    <table border="1" cellPadding="8" style={centeredTableStyle}>
                                        <thead>
                                            <tr>
                                                <th style={centeredCellStyle}>ID</th>
                                                <th style={centeredCellStyle}>Date</th>
                                                <th style={centeredCellStyle}>Time</th>
                                                <th style={centeredCellStyle}>Status</th>
                                                <th style={centeredCellStyle}>Patient</th>
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
                                                    <td style={centeredCellStyle}>{a.patientName || a.patientId}</td>
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
                                                                    value={notesById[a.id] ?? ""}
                                                                    onChange={(e) =>
                                                                        setNotesById((prev) => ({
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
                                                                    {notesById[a.id] || a.doctorNotes || "-"}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={centeredCellStyle}>
                                                        {editingNotesId === a.id ? (
                                                            <>
                                                                <button
                                                                    onClick={() => onSaveNotes(a.id)}
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
                                                        {a.status === "SCHEDULED" && (
                                                            <span
                                                                style={{
                                                                    display: "inline-flex",
                                                                    flexDirection: "column",
                                                                    alignItems: "center",
                                                                    position: "relative",
                                                                    cursor: paidAppointmentIds.has(a.id) ? "pointer" : "not-allowed",
                                                                }}
                                                                onMouseEnter={() => {
                                                                    if (!paidAppointmentIds.has(a.id)) {
                                                                        setHoveredUnpaidHistoryId(a.id);
                                                                    }
                                                                }}
                                                                onMouseLeave={() => {
                                                                    if (hoveredUnpaidHistoryId === a.id) {
                                                                        setHoveredUnpaidHistoryId(null);
                                                                    }
                                                                }}
                                                            >
                                                                <button
                                                                    onClick={() => onCompleteFromHistory(a.id)}
                                                                    disabled={actionLoadingId === a.id}
                                                                    style={{
                                                                        opacity: paidAppointmentIds.has(a.id) ? 1 : 0.55,
                                                                        cursor: paidAppointmentIds.has(a.id) ? "pointer" : "not-allowed",
                                                                        pointerEvents: paidAppointmentIds.has(a.id) ? "auto" : "none",
                                                                    }}
                                                                >
                                                                    {actionLoadingId === a.id ? "Completing..." : "Complete"}
                                                                </button>
                                                                {!paidAppointmentIds.has(a.id) && hoveredUnpaidHistoryId === a.id && (
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
                                                                        Appointment is not fully paid
                                                                    </span>
                                                                )}
                                                            </span>
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

                    <section style={{ marginTop: "24px", marginBottom: "24px" }}>
                        <h2>My Patients</h2>
                        {!showMyPatients ? (
                            <button onClick={() => setShowMyPatients(true)}>Show My Patients</button>
                        ) : (
                            <>
                                {patients.length === 0 ? (
                                    <p>No patients found.</p>
                                ) : (
                                    <table border="1" cellPadding="8" style={centeredTableStyle}>
                                        <thead>
                                            <tr>
                                                <th style={centeredCellStyle}>ID</th>
                                                <th style={centeredCellStyle}>First Name</th>
                                                <th style={centeredCellStyle}>Last Name</th>
                                                <th style={centeredCellStyle}>Phone</th>
                                                <th style={centeredCellStyle}>Date Of Birth</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {patients.map((p) => (
                                                <tr key={p.id}>
                                                    <td style={centeredCellStyle}>{p.id}</td>
                                                    <td style={centeredCellStyle}>{p.firstName}</td>
                                                    <td style={centeredCellStyle}>{p.lastName}</td>
                                                    <td style={centeredCellStyle}>{p.phone}</td>
                                                    <td style={centeredCellStyle}>{formatDateDDMMYYYY(p.dateOfBirth)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <button onClick={() => setShowMyPatients(false)} style={{ marginTop: "10px" }}>
                                    Hide My Patients
                                </button>
                            </>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default DoctorDashboard;

