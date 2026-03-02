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
import {
  getDoctorUpcomingAppointments,
  getDoctorAppointmentsHistory,
  updateDoctorAppointmentNotes,
  completeDoctorAppointment,
} from "../features/user/appointmentApi";


function DoctorDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const [doctor, setDoctor] = useState(null);
    const [needsProfile, setNeedsProfile] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [profileForm, setProfileForm] = useState({
        firstName: "",
        lastName: "",
        specialty: "",
        phone: "",
    });

    const [patients, setPatients] = useState([]);
    const [historyAppointments, setHistoryAppointments] = useState([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [notesById, setNotesById] = useState({});

    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    }

    const handleProfileChange = (e) =>{
        setProfileForm((prev) => ({
            ...prev, [e.target.name]: e.target.value,
        }));
    };

    const loadDoctorLists = async() => { 
        const [patientsData, historyData, upcomingData] = await Promise.all([
            getMyPatients(),
            getDoctorAppointmentHistory(),
            getDoctorUpcomingAppointments(),
        ]);

        setPatients(patientsData);
        setHistoryAppointments(historyData);
        setUpcomingAppointments(upcomingData);

        const notesMap ={}; 
        upcomingData.forEach((a) => {
            notesMap[a.id] = a.notes || "";
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
                setNeedsProfile(true);
            } else {
                const msg =
                    error.response?.data?.message ||
                    (typeof error.response?.data === "string" ? error.response.data : null) ||
                    error.message ||
                    "Request failed";

                setError(msg);

            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDoctorData();
    },[]);


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
            const msg =
                    error.response?.data?.message ||
                    (typeof error.response?.data === "string" ? error.response.data : null) ||
                    error.message ||
                    "Request failed";

            setError(msg);
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
            const msg =
                    error.response?.data?.message ||
                    (typeof error.response?.data === "string" ? error.response.data : null) ||
                    error.message ||
                    "Request failed";

            setError(msg);
        } finally {
            setProfileLoading(false);
        }
    }

    const onSaveNotes = async (appointmentId) =>{
        setActionLoadingId(appointmentId);
        setError("");

        try {
            const notes = notesById[appointmentId] ?? "";
            await updateDoctorAppointmentNotes(appointmentId, notes);
            await loadDoctorLists();
        } catch (error){
            const msg =
                    error.response?.data?.message ||
                    (typeof error.response?.data === "string" ? error.response.data : null) ||
                    error.message ||
                    "Request failed";

            setError(msg);
        } finally {
            setActionLoadingId(null);
        }
    };

    const onComplete = async (appointmentId) =>{
        setActionLoadingId(appointmentId);
        setError("");

        try {
            await completeDoctorAppointment(appointmentId);
            await loadDoctorLists();
        } catch (error){
            const msg =
                    error.response?.data?.message ||
                    (typeof error.response?.data === "string" ? error.response.data : null) ||
                    error.message ||
                    "Request failed";

            setError(msg);
        }finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div style={{ padding: "24px" }}>
            <h1>Doctor Dashboard</h1>
            
            <button onClick={handleLogout}style={{ marginBottom: "16px" }}>
                Logout
            </button>

            {loading && <p>Loading...</p>}
            {!loading && error && <p style ={{color:"red"}}>{error}</p>}

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
                            </>
                        ) : (
                            <form onSubmit={handleUpdateProfile}>
                                <div style={{ marginBottom: "10px" }}>
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

                    <section style={{ marginTop: "24px"}}>
                        <h2>Upcoming Appointments</h2>

                        {upcomingAppointments.length === 0 ? (
                            <p>No upcoming appointments.</p>
                        ) : (
                            <table 
                                border="1"
                                cellPadding="8"
                                style={{ borderCollapse:"collapse", width: "100%", maxWidth: "1100px"}}
                            >
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                        <th>Patient</th>
                                        <th>Service</th>
                                        <th>Notes</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {upcomingAppointments.map((a) => (
                                        <tr key={a.id}>
                                            <td>{a.id}</td>
                                            <td>{a.appointmentDate}</td>
                                            <td>{a.appointmentTime}</td>
                                            <td>{a.status}</td>
                                            <td>{a.patientName}</td>
                                            <td>{a.serviceName}</td>
                                            <td>
                                                <input
                                                    value={notesById[a.id] ?? ""}
                                                    onChange={(e) =>
                                                        setNotesById((prev) => ({
                                                            ...prev, [a.id]:e.target.value,
                                                        }))
                                                    }
                                                    style={{ width:"220px"}}
                                                />
                                            </td>
                                            <td>
                                                <button 
                                                    onClick={() => onSaveNotes(a.id)}
                                                    disabled={actionLoadingId === a.id}
                                                    style={{ marginRight: "8px" }}
                                                >
                                                    {actionLoadingId === a.id ? "Saving..." : "Save Notes"}
                                                </button>

                                                <button
                                                    onClick={()=> onComplete(a.id)}
                                                    disabled={actionLoadingId === a.id}
                                                >
                                                    {actionLoadingId === a.id ? "Completing..." : "Complete"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>

                    <section style ={{marginTop: "24px"}}>
                        <h2>Appointment HIstory</h2>
                        {historyAppointments.length === 0? (
                            <p>No completed appointments yet.</p>
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
                                        <th>Notes</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {historyAppointments.map((a) => (
                                        <tr key={a.id}>
                                        <td>{a.id}</td>
                                        <td>{a.appointmentDate}</td>
                                        <td>{a.appointmentTime}</td>
                                        <td>{a.status}</td>
                                        <td>{a.patientName || a.patientId}</td>
                                        <td>{a.serviceName || a.serviceId}</td>
                                        <td>{a.notes || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>
                    
                    <section style={{ marginTop: "24px", marginBottom: "24px" }}>
                        <h2>My Patients</h2>
                        {patients.length === 0 ? (
                            <p>No patients found.</p>
                        ) : (
                            <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>First Name</th>
                                        <th>Last Name</th>
                                        <th>Phone</th>
                                        <th>Date Of Birth</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.map((p) => (
                                        <tr key={p.id}>
                                            <td>{p.id}</td>
                                            <td>{p.firstName}</td>
                                            <td>{p.lastName}</td>
                                            <td>{p.phone}</td>
                                            <td>{p.dateOfBirth}</td>
                                            <td>{p.notes || "-"}</td>
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

export default DoctorDashboard;
