import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import { useState, useEffect} from "react";
import {
    createMyDoctorProfile,
    getMyDoctorProfile,
    getMyUpcomingAppointments,
    updateMyAppointmentNotes,
    completeMyAppointment,
} from "../features/user/doctorApi";

function DoctorDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    }
    
    const [doctor, setDoctor] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [notesById, setNotesById] = useState({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const [needsProfile, setNeedsProfile] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileForm, setProfileForm] = useState({
        firstName: "",
        lastName: "",
        specialty: "",
        phone: "",
    });

    const loadAppointments = async () => { 
        const myAppointments = await getMyUpcomingAppointments();
        setAppointments(myAppointments);

        const notesMap ={}; 
        myAppointments.forEach((a) => {
            notesMap[a.id] = a.notes || "";
        });
        setNotesById(notesMap);
    };

    const loadDoctorData = async () => { 
        setLoading(true);
        setError("");

        try {
            const profile = await getMyDoctorProfile();
            setDoctor(profile);
            setNeedsProfile(false);
            await loadAppointments(); 

        } catch (error){ 
            if (error.response?.status === 404) {
                setNeedsProfile(true);
            } else {
                setError(
                    error.response?.data?.message ||
                        error.response?.data ||
                        error.message ||
                        "Failed to load doctor data"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDoctorData();
    },[]);

    const handleProfileChange = (e) =>{
        setProfileForm((prev) => ({
            ...prev, [e.target.name]: e.target.value,
        }));
    };

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
            setError(
                    error.response?.data?.message ||
                        error.response?.data ||
                        error.message ||
                        "Failed to load doctor data"
                );
        } finally {
            setProfileLoading(false);
        }
    };

    const onSaveNotes = async (appointmentId) =>{
        const notes = notesById[appointmentId] ?? "";

        setActionLoadingId(appointmentId);
        setError("");

        try {
            await updateMyAppointmentNotes(appointmentId, notes);
            await loadAppointments();
        } catch (error){
            setError(
                error.response?.data?.message ||
                    error.response?.data ||
                    error.message ||
                    "Failed to update notes"
            );
        } finally {
            setActionLoadingId(null);
        }
    };

    const onComplete = async (appointmentId) =>{
        setActionLoadingId(appointmentId);
        setError("");

        try {
            await completeMyAppointment(appointmentId);
            await loadAppointments();
        } catch (error){
            setError(
                error.response?.data?.message ||
                    error.response?.data ||
                    error.message ||
                    "Failed to complete appointment"
            );
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
                        <p>
                            <strong>Name:</strong> {doctor.firstName} {doctor.lastName}
                        </p>
                        <p>
                            <strong>Specialty:</strong> {doctor.specialty}
                        </p>
                        <p>
                            <strong>Phone:</strong> {doctor.phone}
                        </p>
                    </section>

                    <section style={{ marginTop: "24px"}}>
                        <h2>Upcoming Appointments</h2>

                        {appointments.length === 0 ? (
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
                                    {appointments.map((a) => (
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
                </>
            )}
        </div>
    );
}

export default DoctorDashboard;
