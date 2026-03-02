import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parseISO, parse, isValid, format } from "date-fns";
import {
    createMyPatientProfile,
    getMyPatientProfile,
    updateMyPatientProfile,
    getMyDoctors,
} from "../features/user/patientApi";
import { getAllMedicalServices } from "../features/user/medicalServiceApi";
import {
    bookMyAppointment,
    cancelMyAppointment,
    rescheduleMyAppointment,
    getPatientUpcomingAppointments,
    getPatientAppointmentsHistory,
} from "../features/user/appointmentApi";




function PatientDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [patient, setPatient] = useState(null);
    const [needsProfile, setNeedsProfile] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [profileForm, setProfileForm] = useState({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        phone: "",
        notes: "",
    });

    const [doctors, setDoctors] = useState([]);
    const [historyAppointments, setHistoryAppointments] = useState([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [allAppointments, setAllAppointments] = useState([]);
    const [medicalServices, setMedicalServices] = useState([]);

    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [error, setError] = useState("");

    const getErrorMessage = (error) => {
        const data = error.response?.data;

        if (data?.message) return data.message;
        if (typeof data === "string") return data;

        if (data && typeof data === "object") {
            const first = Object.values(data)[0];
            if (typeof first === "string") return first;
        }

        return error.message || "Request failed";
    };

    
    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    const handleProfileChange = (e) => {
        setProfileForm((prev) => ({
            ...prev, [e.target.name]: e.target.value,
        }));
    };

    const loadPatientLists = async () => {
        const [doctorsData, upcomingData, historyData] = await Promise.all([
            getMyDoctors(),
            getPatientUpcomingAppointments(),
            getPatientAppointmentsHistory(),
        ]);

        setDoctors(doctorsData);
        setUpcomingAppointments(upcomingData);
        setHistoryAppointments(historyData);
        const allData = [...upcomingData, ...historyData];
        setAllAppointments(allData);

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
                setError(getErrorMessage(error));
            }          
        } finally{
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPatientData();
    }, []);

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
            setError(getErrorMessage(error));
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
            setError(getErrorMessage(error));
        } finally{
            setProfileLoading(false);
        }
    };

    const onCancelAppointment = async (appointmentId) => {
        setError("");
        setActionLoadingId(appointmentId);
        try {
            await cancelMyAppointment(appointmentId);
            await loadPatientLists();
        } catch (error) {
            setError(getErrorMessage(error, "Failed to cancel appointment"));
        } finally {
            setActionLoadingId(null);
        }
    };


    const labelStyle = { display: "block", marginBottom: "10px" };

    return (
        <div style={{ padding: "24px" }}>
            <h1>Patient Dashboard</h1>

            <button onClick={handleLogout} style={{ marginBottom: "16px" }}>
                Logout
            </button>

            {loading && <p>Loading...</p>}
            {!loading && error && <p style={{ color: "red" }}>{error}</p>}

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
                            <DatePicker
                                selected={profileForm.dateOfBirth ? parseISO(profileForm.dateOfBirth) : null}
                                onChange={(date) =>
                                    setProfileForm((prev) => ({
                                    ...prev,
                                    dateOfBirth: date ? format(date, "yyyy-MM-dd") : "",
                                    }))
                                }
                                onChangeRaw={(e) => {
                                    const value = e.target.value;
                                    const parsed = parse(value, "dd/MM/yyyy", new Date());

                                    if (value.length === 10 && isValid(parsed)) {
                                    setProfileForm((prev) => ({
                                        ...prev,
                                        dateOfBirth: format(parsed, "yyyy-MM-dd"),
                                    }));
                                    }
                                }}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="dd/mm/yyyy"
                                maxDate={new Date()}
                                showYearDropdown
                                scrollableYearDropdown
                                required
                                wrapperClassName="dob-wrapper"
                                className="dob-input"
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
                                <p><strong>Date Of Birth:</strong> {patient.dateOfBirth}</p>
                                <p><strong>Phone:</strong> {patient.phone}</p>
                                <p><strong>Notes:</strong> {patient.notes || "-"}</p>
                                <button onClick={() => setIsEditingProfile(true)}>Edit Profile</button>
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
                        <h2>My Doctors</h2>
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
                    </section>

                    <section style={{ marginTop: "24px" }}>
                        <h2>Medical Services</h2>
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
                    </section>

                    <section style={{ marginTop: "24px" }}>
                        <h2>Upcoming Appointments</h2>
                        {upcomingAppointments.length === 0 ? (
                            <p>No upcoming appointments.</p>
                        ) : (
                            <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                        <th>Doctor</th>
                                        <th>Service</th>
                                        <th>Notes</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {upcomingAppointments.map((a) => (
                                        <tr key={a.id}>
                                            <td>{a.id}</td>
                                            <td>{a.appointmentDate}</td>
                                            <td>{a.appointmentTime}</td>
                                            <td>{a.status}</td>
                                            <td>{a.doctorName || a.doctorId}</td>
                                            <td>{a.serviceName || a.serviceId}</td>
                                            <td>{a.notes || "-"}</td>
                                            <td>
                                                <button
                                                    onClick={() => onCancelAppointment(a.id)}
                                                    disabled={actionLoadingId === a.id}
                                                >
                                                    {actionLoadingId === a.id ? "Cancelling..." : "Cancel"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>

                    <section style={{ marginTop: "24px" }}>
                        <h2>Appointment History</h2>
                        {historyAppointments.length === 0 ? (
                            <p>No completed appointments yet.</p>
                        ) : (
                            <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                        <th>Doctor</th>
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
                                            <td>{a.doctorName || a.doctorId}</td>
                                            <td>{a.serviceName || a.serviceId}</td>
                                            <td>{a.notes || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>

                    <section style={{ marginTop: "24px", marginBottom: "24px" }}>
                        <h2>All My Appointments</h2>
                        {allAppointments.length === 0 ? (
                            <p>No appointments.</p>
                        ) : (
                            <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                        <th>Doctor</th>
                                        <th>Service</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allAppointments.map((a) => (
                                        <tr key={a.id}>
                                            <td>{a.id}</td>
                                            <td>{a.appointmentDate}</td>
                                            <td>{a.appointmentTime}</td>
                                            <td>{a.status}</td>
                                            <td>{a.doctorName || a.doctorId}</td>
                                            <td>{a.serviceName || a.serviceId}</td>
                                            <td>{a.notes || "-"}</td>
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

export default PatientDashboard;
