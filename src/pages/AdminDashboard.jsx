import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import { useEffect, useState } from "react";
import { createUser, 
    getAllUsers, 
    enableUser, 
    disableUser, 
    changeUserRole, 
    updateUser, 
    changePassword,
    deleteUser,
} from "../features/user/adminApi"; 
import {
    createMedicalService,
    deleteMedicalService,
    getAllMedicalServices,
    updateMedicalService,
} from "../features/user/medicalServiceApi";
import { getAllAppointments } from "../features/user/appointmentApi";
import { extractApiErrorMessage } from "../utils/errors";
import { isValidEmail } from "../utils/forms";
import { useAnchoredActionMessage } from "../utils/actionMessage";

function AdminDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { message, captureActionAnchor, showActionMessage, clearActionMessage } =
        useAnchoredActionMessage();

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    const [createForm, setCreateForm] = useState({
        username: "",
        email: "",
        password: "",
        role: ""
    });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createEmailError, setCreateEmailError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");

    const handleCreateChange = (e) => {
        if (e.target.name === "email") {
            setCreateEmailError("");
        }
        setCreateForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleCreateUser = async (e) => {
        
        e.preventDefault();
        setCreateError("");
        setCreateEmailError("");
        setCreateSuccess("");

        const normalizedEmail = createForm.email.trim();
        if (!isValidEmail(normalizedEmail)) {
            setCreateEmailError("Please type a correct email");
            return;
        }

        setCreateLoading(true);

        try {
            const payload = {
                username: createForm.username.trim(),
                email: normalizedEmail,
                password: createForm.password,
                role: createForm.role,
            };

            await createUser(payload);

            setCreateSuccess("User created successfully");
            setCreateForm({
                username: "",
                email: "",
                password: "",
                role: "",
            });

            await loadUsers();
        } catch (error) {
            setCreateError(extractApiErrorMessage(error, "Failed to create user"));
        } finally {
            setCreateLoading(false);
        }
    };



    const [users, setUsers] = useState([]);
    const [showUsers, setShowUsers] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [usersError, setUsersError] = useState("");
    const [doctorProfileIdsWithAppointments, setDoctorProfileIdsWithAppointments] = useState(
        new Set()
    );
    const [patientProfileIdsWithAppointments, setPatientProfileIdsWithAppointments] = useState(
        new Set()
    );

    const loadUsers = async () => {
        setLoadingUsers(true);
        setUsersError("");

        try {
            const [data, appointments] = await Promise.all([getAllUsers(), getAllAppointments()]);
            setUsers(data);

            const linkedDoctorProfileIds = new Set();
            const linkedPatientProfileIds = new Set();
            (appointments || []).forEach((appointment) => {
                if (appointment?.doctorId !== undefined && appointment?.doctorId !== null) {
                    linkedDoctorProfileIds.add(Number(appointment.doctorId));
                }
                if (appointment?.patientId !== undefined && appointment?.patientId !== null) {
                    linkedPatientProfileIds.add(Number(appointment.patientId));
                }
            });
            setDoctorProfileIdsWithAppointments(linkedDoctorProfileIds);
            setPatientProfileIdsWithAppointments(linkedPatientProfileIds);
        } catch (error){
            setUsersError(extractApiErrorMessage(error, "Failed to load users"));
        }
        finally {
            setLoadingUsers(false)
        }
    };
    
    

    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [actionError, setActionError] = useState("");

    const handleToggleEnabled = async (user) => {
        if (user.role === "ADMIN") {
            setActionError("Cannot disable an admin user");
            return;
        }

        setActionError("");
        setActionLoadingId(user.id);

        try {
            if (user.enabled){
                await disableUser(user.id);
            } else {
                await enableUser(user.id);
            }
            await loadUsers();
        } catch (error){
            setActionError(extractApiErrorMessage(error, "Failed to toggle user status"));
        } finally {
            setActionLoadingId(null);
        }
    
    }



    const [roleChangingId, setRoleChangingId] = useState(null);
    const [roleError, setRoleError] = useState("");

    const handleRoleChanged = async (user, role) =>{
        if (user.role === "ADMIN") return;

        if (role === "ADMIN"){
            setRoleError("Cannot change role to admin for another user");
            return;
        }

        if (!role || role === user.role) return;

        setRoleError("");
        setRoleChangingId(user.id);

        try {
            await changeUserRole(user.id, role);
            await loadUsers();
        } catch (error){
            setRoleError(extractApiErrorMessage(error, "Failed to change user's role"));
        } finally{
            setRoleChangingId(null);
        } 

    }



    const [editingUserId, setEditingUserId] = useState(null);
    const [editForm, setEditForm] = useState({ username: "", email: "" });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");
    const [editEmailError, setEditEmailError] = useState("");

    const startEditUser = (user) => {
        setEditError("");
        setEditEmailError("");
        setEditingUserId(user.id);
        setEditForm({ username: user.username, email: user.email });
    };

    const cancelEditUser = () => {
        setEditingUserId(null);
        setEditEmailError("");
        setEditForm({ username: "", email: "" });
    };

    const handleEditChange = (e) => {
        if (e.target.name === "email") {
            setEditEmailError("");
        }
        setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const saveEditUser = async (userId) => {
        setEditError("");
        setEditEmailError("");

        const normalizedEmail = editForm.email.trim();
        if (!isValidEmail(normalizedEmail)) {
            setEditEmailError("Please type a correct email");
            return;
        }

        setEditLoading(true);
        try {
            await updateUser(userId, {
                username: editForm.username.trim(),
                email: normalizedEmail,
            });
            await loadUsers();
            cancelEditUser();
        } catch (error) {
            setEditError(extractApiErrorMessage(error, "Failed to update user"));
        } finally {
            setEditLoading(false);
        }
    };



    const [passwordUserId, setPasswordUserId] = useState(null);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "" });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");

    const startChangePassword = (userId) => {
        setPasswordError("");
        setPasswordSuccess("");
        setPasswordUserId(userId);
        setPasswordForm({ oldPassword: "", newPassword: "" });
    };

    const cancelChangePassword = () => {
        setPasswordUserId(null);
        setPasswordForm({ oldPassword: "", newPassword: "" });
    };

    const handlePasswordChange = (e) => {
        setPasswordForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const submitChangePassword = async (userId) => {
        setPasswordError("");
        setPasswordSuccess("");
        setPasswordLoading(true);

        try {
            await changePassword(userId, {
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword,
            });

            setPasswordSuccess("Password changed successfully");
            cancelChangePassword();
        } catch (error) {
            setPasswordError(extractApiErrorMessage(error, "Failed to change password"));
        } finally {
            setPasswordLoading(false);
        }
    };



    const [deleteLoadingId, setDeleteLoadingId] = useState(null);
    const [deleteError, setDeleteError] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null); 

    const userHasAppointments = (user) => {
        if (!user) return false;

        if (user.role === "DOCTOR") {
            const doctorProfileId = Number(user.doctorProfileId);
            return (
                !!user.hasDoctorProfile &&
                Number.isFinite(doctorProfileId) &&
                doctorProfileIdsWithAppointments.has(doctorProfileId)
            );
        }
        if (user.role === "PATIENT") {
            const patientProfileId = Number(user.patientProfileId);
            return (
                !!user.hasPatientProfile &&
                Number.isFinite(patientProfileId) &&
                patientProfileIdsWithAppointments.has(patientProfileId)
            );
        }
        return false;
    };

    const handleDeleteUser = async (user) => {
        if (user.role === "ADMIN") {
            setDeleteError("Cannot delete admin user");
            return;
        }
        if (userHasAppointments(user)) {
            setDeleteError("Cannot delete user with appointments. Disable the account instead");
            return;
        }

        setDeleteError("");
        setDeleteLoadingId(user.id);

        try {
            await deleteUser(user.id);
            await loadUsers();
        } catch (error) {
            setDeleteError(extractApiErrorMessage(error, "Failed to delete user"));
        } finally {
            setDeleteLoadingId(null);
            setDeleteTarget(null);
        }
    };



    const [services, setServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [servicesError, setServicesError] = useState("");
    const [serviceActionLoadingId, setServiceActionLoadingId] = useState(null);

    const [serviceCreateForm, setServiceCreateForm] = useState({
        name: "",
        description: "",
        price: "",
        duration: "",
    });
    const [serviceCreateLoading, setServiceCreateLoading] = useState(false);
    const [serviceCreateError, setServiceCreateError] = useState("");
    const [serviceCreateSuccess, setServiceCreateSuccess] = useState("");

    const [editingServiceId, setEditingServiceId] = useState(null);
    const [serviceEditForm, setServiceEditForm] = useState({
        name: "",
        description: "",
        price: "",
        duration: "",
    });
    const [serviceEditError, setServiceEditError] = useState("");
    const [showServices, setShowServices] = useState(false);

    const clearAllMessages = () => {
        setCreateError("");
        setCreateEmailError("");
        setCreateSuccess("");
        setUsersError("");
        setActionError("");
        setRoleError("");
        setEditError("");
        setEditEmailError("");
        setPasswordError("");
        setPasswordSuccess("");
        setDeleteError("");
        setServiceCreateError("");
        setServiceCreateSuccess("");
        setServiceEditError("");
        setServicesError("");
        clearActionMessage();
    };

    const handlePageClickCapture = (e) => {
        const didClickButton = captureActionAnchor(e);
        if (!didClickButton) return;
        clearAllMessages();
    };

    const successMessage = createSuccess || passwordSuccess || serviceCreateSuccess;
    const errorMessage =
        createError ||
        usersError ||
        actionError ||
        roleError ||
        editError ||
        passwordError ||
        deleteError ||
        serviceCreateError ||
        serviceEditError ||
        servicesError;

    useEffect(() => {
        if (errorMessage) {
            showActionMessage(errorMessage, "error");
        }
    }, [errorMessage]);

    const loadMedicalServices = async () => {
        setServicesLoading(true);
        setServicesError("");
        try {
            const data = await getAllMedicalServices();
            setServices(data);
        } catch (error) {
            setServicesError(extractApiErrorMessage(error, "Failed to load medical services"));
        } finally {
            setServicesLoading(false);
        }
    };

    const handleServiceCreateChange = (e) => {
        setServiceCreateForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCreateMedicalService = async (e) => {
        e.preventDefault();
        setServiceCreateError("");
        setServicesError("");
        setServiceCreateSuccess("");
        setServiceCreateLoading(true);

        try {
            await createMedicalService({
                name: serviceCreateForm.name.trim(),
                description: serviceCreateForm.description.trim(),
                price: Number(serviceCreateForm.price),
                duration: Number(serviceCreateForm.duration),
            });

            setServiceCreateSuccess("Medical service created successfully");
            setServiceCreateForm({ name: "", description: "", price: "", duration: "" });
            await loadMedicalServices();
        } catch (error) {
            setServiceCreateError(extractApiErrorMessage(error, "Failed to create medical service"));
        } finally {
            setServiceCreateLoading(false);
        }
    };

    const startEditService = (service) => {
        setServiceCreateSuccess("");
        setServicesError("");
        setServiceCreateError("");
        setEditingServiceId(service.id);
        setServiceEditForm({
            name: service.name || "",
            description: service.description || "",
            price: service.price ?? "",
            duration: service.duration ?? "",
        });
    };

    const cancelEditService = () => {
        setEditingServiceId(null);
        setServiceEditForm({ name: "", description: "", price: "", duration: "" });
    };

    const handleServiceEditChange = (e) => {
        setServiceEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const saveEditService = async (serviceId) => {
        setServiceEditError("");
        setServicesError("");
        setServiceCreateError("");
        setServiceCreateSuccess("");
        setServiceActionLoadingId(serviceId);

        try {
            await updateMedicalService(serviceId, {
                name: serviceEditForm.name.trim(),
                description: serviceEditForm.description.trim(),
                price: Number(serviceEditForm.price),
                duration: Number(serviceEditForm.duration),
            });
            setServiceCreateSuccess("Medical service updated successfully");
            await loadMedicalServices();
            cancelEditService();
        } catch (error) {
            setServiceEditError(extractApiErrorMessage(error, "Failed to update medical service"));
        } finally {
            setServiceActionLoadingId(null);
        }
    };

    const handleDeleteMedicalService = async (serviceId) => {
        setServiceEditError("");
        setServicesError("");
        setServiceCreateError("");
        setServiceCreateSuccess("");
        setServiceActionLoadingId(serviceId);
        try {
            await deleteMedicalService(serviceId);
            setServiceCreateSuccess("Medical service deleted successfully");
            await loadMedicalServices();
        } catch (error) {
            setServicesError(extractApiErrorMessage(error, "Failed to delete medical service"));
        } finally {
            setServiceActionLoadingId(null);
        }
    };



        
    const thStyle = {
        border: "1px solid #d1d5db",
        padding: "12px",
        textAlign: "center",
        background: "#f8fafc",
        verticalAlign: "middle",
    };

    const tdStyle = {
        border: "1px solid #d1d5db",
        padding: "12px",
        textAlign: "center",
        verticalAlign: "middle",
        wordBreak: "break-word",
    };

    const disabledButtonStyle = {
        opacity: 0.5,
        cursor: "not-allowed",
        filter: "grayscale(40%)",
    };
    const sectionButtonSpacingStyle = { marginTop: "20px" };

    return (
        <div className="page-container page-accent-admin space-y-6" onClickCapture={handlePageClickCapture}>
            <div className="card top-actions-bar hero-card hero-admin flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">Operations and financial overview.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => navigate("/admin/payments")} className="btn-secondary">
                        Open Payments Page
                    </button>
                    <button onClick={handleLogout} className="btn-secondary">Logout</button>
                </div>
            </div>
            {message?.text && (
                <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}>
                    {message.text}
                </div>
            )}
            {successMessage && <p className="alert alert-success">{successMessage}</p>}

            <section className="card max-w-2xl">
                <h2>Create New User</h2>

                <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
                    <div>
                        <label>Username</label>
                        <input
                            name="username"
                            value={createForm.username}
                            onChange={handleCreateChange}
                            required
                        />
                    </div>

                    <div>
                        <label>Email</label>
                        <input 
                            name="email"
                            type="email"
                            value={createForm.email}
                            onChange={handleCreateChange}
                            required
                        />  
                        {createEmailError && (
                            <p className="mt-2 text-sm font-medium text-red-600">{createEmailError}</p>
                        )}
                    </div>

                    <div>
                        <label>Password</label>
                        <input
                            name="password"
                            type="password"
                            value={createForm.password}
                            onChange={handleCreateChange}
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label>Role</label>
                        <select
                            name="role"
                            value={createForm.role}
                            onChange={handleCreateChange}
                            required
                        >
                            <option value ="" disabled>Select Role</option>
                            <option value ="DOCTOR">Doctor</option>
                            <option value ="PATIENT">Patient</option>
                        </select>
                    </div>

                    <button type="submit" disabled={createLoading} style={sectionButtonSpacingStyle}>
                        {createLoading ? "Creating..." : "Create User"}
                    </button>
                </form>

            </section>

            <section className="card">
                <h2>Users</h2>

                {showUsers && loadingUsers && <p>Loading users...</p>}
                {showUsers && !loadingUsers && !usersError && (
                    users.length === 0 ? (
                        <div className="empty-state">No users found.</div>
                    ) : (
                        <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th style={thStyle}> ID</th>
                                    <th style={thStyle}>Username</th>
                                    <th style={thStyle}>Email</th>
                                    <th style={thStyle}>Role</th>
                                    <th style={thStyle}>Enable/Disable</th>
                                    <th style={thStyle}>Change Role</th>
                                    <th style={thStyle}>Edit User</th>
                                    <th style={thStyle}>Change Password</th>
                                    <th style={thStyle}>Delete</th>

                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => {
                                const targetRole = user.role === "DOCTOR" ? "PATIENT" : "DOCTOR";
                                const hasLockedProfile =
                                    (user.role === "DOCTOR" && !!user.hasDoctorProfile) ||
                                    (user.role === "PATIENT" && !!user.hasPatientProfile);
                                const hasAppointments = userHasAppointments(user);
                                const deleteDisabled =
                                    deleteLoadingId === user.id || hasAppointments;

                                const roleChangeDisabled =
                                    roleChangingId === user.id ||
                                    actionLoadingId === user.id ||
                                    !user.enabled ||
                                    hasLockedProfile;

                                return (
                                <tr key={user.id}>
                                    <td style={tdStyle}>{user.id}</td>
                                    <td style={tdStyle}>{user.username}</td>
                                    <td style={tdStyle}>{user.email}</td>
                                    <td style={tdStyle}>{user.role}</td>
                                    <td style={tdStyle}>
                                        {user.role === "ADMIN" ? (
                                            <span>-</span>
                                        ) : (
                                            <button 
                                                onClick={() => handleToggleEnabled(user)}
                                                disabled={actionLoadingId === user.id}
                                            >
                                                {actionLoadingId === user.id ? "Toggling..." : user.enabled ? "Disable" : "Enable"}
                                            </button>
                                        )}   
                                    </td>
                                    <td style={tdStyle}>
                                        {user.role === "ADMIN" ? (
                                            <span>-</span>
                                        ) : (
                                            <button
                                                onClick={() =>
                                                    handleRoleChanged(user, targetRole)
                                                }
                                                disabled={roleChangeDisabled}
                                                style={roleChangeDisabled ? disabledButtonStyle : undefined}
                                                title={
                                                    hasLockedProfile
                                                        ? `Cannot change role: user already has a ${user.role} profile`
                                                        : ""
                                                }

                                            >
                                                {!user.enabled
                                                    ? "Unavailable"
                                                    : roleChangingId === user.id
                                                    ? "Changing..."
                                                    : hasLockedProfile
                                                    ? "Role Locked"
                                                    : `Change to ${targetRole}`}
                                            </button>
                                        )}
                                    </td>
                                    <td style={tdStyle}>
                                        {user.role === "ADMIN" ? (
                                            <span>-</span>
                                        ) : editingUserId === user.id ? (
                                            <div>
                                                <input
                                                    name="username"
                                                    value={editForm.username}
                                                    onChange={handleEditChange}
                                                    style={{ marginBottom: "6px", width: "100%" }}
                                                />
                                                <input
                                                    name="email"
                                                    type="email"
                                                    value={editForm.email}
                                                    onChange={handleEditChange}
                                                    style={{ marginBottom: "6px", width: "100%" }}
                                                />
                                                {editEmailError && (
                                                    <p className="mt-1 text-left text-sm font-medium text-red-600">
                                                        {editEmailError}
                                                    </p>
                                                )}
                                                <button onClick={() => saveEditUser(user.id)} disabled={editLoading}>
                                                    {editLoading ? "Saving..." : "Save"}
                                                </button>
                                                <button onClick={cancelEditUser} style={{ marginLeft: "6px" }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => startEditUser(user)} 
                                                disabled={!user.enabled}
                                                style={!user.enabled ? disabledButtonStyle : undefined}
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </td>
                                    <td style={tdStyle}>
                                        {user.role === "ADMIN" ? (
                                            <span>-</span>
                                        ) : passwordUserId === user.id ? (
                                            <div>
                                                <input
                                                    type="password"
                                                    name="oldPassword"
                                                    value={passwordForm.oldPassword}
                                                    onChange={handlePasswordChange}
                                                    placeholder="Old password"
                                                    style={{ marginBottom: "6px", width: "100%" }}
                                                />
                                                <input
                                                    type="password"
                                                    name="newPassword"
                                                    value={passwordForm.newPassword}
                                                    onChange={handlePasswordChange}
                                                    placeholder="New password"
                                                    style={{ marginBottom: "6px", width: "100%" }}
                                                />
                                                <button
                                                    onClick={() => submitChangePassword(user.id)}
                                                    disabled={passwordLoading}
                                                >
                                                    {passwordLoading ? "Saving..." : "Save"}
                                                </button>
                                                <button onClick={cancelChangePassword} style={{ marginLeft: "6px" }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => startChangePassword(user.id)} 
                                                disabled={!user.enabled}
                                                style={!user.enabled ? disabledButtonStyle : undefined}
                                            >
                                                Change
                                            </button>
                                        )}
                                    </td>  
                                    <td style={tdStyle}>
                                        {user.role === "ADMIN" ? (
                                            <span>-</span>
                                        ) : (
                                            <span
                                                title={
                                                    hasAppointments
                                                        ? "Cannot delete user with appointments. Disable the account instead."
                                                        : ""
                                                }
                                                style={{ display: "inline-block" }}
                                            >
                                                <button
                                                    onClick={() => setDeleteTarget(user)}
                                                    disabled={deleteDisabled}
                                                    style={
                                                        deleteDisabled
                                                            ? disabledButtonStyle
                                                            : undefined
                                                    }
                                                >
                                                    {deleteLoadingId === user.id ? "Deleting..." : "Delete"}
                                                </button>
                                            </span>

                                        )}
                                    </td>
                                </tr>
                                );
                                })}
                            </tbody>
                        </table>
                        </div>
                    )
                )}
                <button 
                    onClick={async () => {
                        const next =! showUsers;
                        setShowUsers(next);
                        if (next){
                            await loadUsers();
                        }
                    }}
                    style={{ ...sectionButtonSpacingStyle, marginBottom: "10px" }}
                >
                    {showUsers ? "Hide Users" : "Show Users"}
                </button>
            </section>

            {deleteTarget && (
                <div
                    style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.45)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    }}
                >
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "12px",
                            padding: "20px",
                            width: "360px",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                        }}
                    >
                        <h3 style={{ marginTop: 0 }}>Delete User</h3>
                        <p>
                            Are you sure you want to delete user <strong>{deleteTarget.username}</strong>?
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                            <button onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button
                                onClick={() => handleDeleteUser(deleteTarget)}
                                className="btn-danger"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="card max-w-2xl">
                <h2>Create New Medical Service</h2>

                <form onSubmit={handleCreateMedicalService} className="mt-4 space-y-4">
                    <div>
                        <label>Name</label>
                        <input
                            name="name"
                            value={serviceCreateForm.name}
                            onChange={handleServiceCreateChange}
                            required
                        />
                    </div>

                    <div>
                        <label>Description</label>
                        <input
                            name="description"
                            value={serviceCreateForm.description}
                            onChange={handleServiceCreateChange}
                        />
                    </div>

                    <div>
                        <label>Price (USD)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            name="price"
                            value={serviceCreateForm.price}
                            onChange={handleServiceCreateChange}
                            required
                        />
                    </div>

                    <div>
                        <label>Duration (minutes)</label>
                        <input
                            type="number"
                            min="1"
                            name="duration"
                            value={serviceCreateForm.duration}
                            onChange={handleServiceCreateChange}
                            required
                        />
                    </div>

                    <button type="submit" disabled={serviceCreateLoading} style={sectionButtonSpacingStyle}>
                        {serviceCreateLoading ? "Creating..." : "Create Medical Service"}
                    </button>
                </form>
            </section>

            <section className="card"> 
                <h2>Medical Services</h2>

                {showServices && (
                    servicesLoading ? (
                        <p>Loading medical services...</p>
                    ) : (
                        services.length === 0 ? (
                            <div className="empty-state">No medical services found.</div>
                        ) : (
                            <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>ID</th>
                                        <th style={thStyle}>Name</th>
                                        <th style={thStyle}>Description</th>
                                        <th style={thStyle}>Price (USD)</th>
                                        <th style={thStyle}>Duration (minutes)</th>
                                        <th style={thStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.map((service) => (
                                    <tr key={service.id}>
                                        <td style={tdStyle}>{service.id}</td>
                                        {editingServiceId === service.id ? (
                                            <>
                                                <td style={tdStyle}>
                                                    <input
                                                        name="name"
                                                        value={serviceEditForm.name}
                                                        onChange={handleServiceEditChange}
                                                        style={{ width: "100%" }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <input
                                                        name="description"
                                                        value={serviceEditForm.description}
                                                        onChange={handleServiceEditChange}
                                                        style={{ width: "100%" }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        name="price"
                                                        value={serviceEditForm.price}
                                                        onChange={handleServiceEditChange}
                                                        style={{ width: "100%" }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        name="duration"
                                                        value={serviceEditForm.duration}
                                                        onChange={handleServiceEditChange}
                                                        style={{ width: "100%" }}
                                                    />
                                                </td>
                                                <td style={tdStyle}>
                                                    <button
                                                        onClick={() => saveEditService(service.id)}
                                                        disabled={serviceActionLoadingId === service.id}
                                                    >
                                                        {serviceActionLoadingId === service.id ? "Saving..." : "Save"}
                                                    </button>
                                                    <button style={{ marginLeft: "6px" }} onClick={cancelEditService}>
                                                        Cancel
                                                    </button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={tdStyle}>{service.name}</td>
                                                <td style={tdStyle}>{service.description || "-"}</td>
                                                <td style={tdStyle}>{service.price}</td>
                                                <td style={tdStyle}>{service.duration}</td>
                                                <td style={tdStyle}>
                                                    <button onClick={() => startEditService(service)}>Edit</button>
                                                    <button
                                                        style={{ marginLeft: "6px" }}
                                                        onClick={() => handleDeleteMedicalService(service.id)}
                                                        disabled={serviceActionLoadingId === service.id}
                                                    >
                                                        {serviceActionLoadingId === service.id ? "Deleting..." : "Delete"}
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        )
                    )
                )}
                <button 
                onClick={async ()=>{
                    const next = !showServices;
                    setShowServices(next);
                    if (next){
                        await loadMedicalServices();
                    }
                 }}
                 style={sectionButtonSpacingStyle}

                 >
                    {showServices ? "Hide Medical Services" : "Show Medical Services"}
                </button>
            </section>
        </div>
    );
}

export default AdminDashboard;
