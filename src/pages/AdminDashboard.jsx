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
} from "../features/user/usersApi"; 
import {
    createMedicalService,
    deleteMedicalService,
    getAllMedicalServices,
    updateMedicalService,
} from "../features/user/medicalServiceApi";

function AdminDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

    const getErrorMessage = (error, fallback) =>
        error.response?.data?.message ||
        (typeof error.response?.data === "string" ? error.response.data : null) ||
        (error.response?.data && typeof error.response?.data === "object"
            ? Object.values(error.response.data).flat().join(" | ")
            : null) ||
        error.message ||
        fallback;



    const [createForm, setCreateForm] = useState({
        username: "",
        email: "",
        password: "",
        role: ""
    });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");

    const handleCreateChange = (e) => {
        setCreateForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleCreateUser = async (e) => {
        
        e.preventDefault();
        setCreateError("");
        setCreateSuccess("");
        setCreateLoading(true);

        try {
            const payload = {
                username: createForm.username.trim(),
                email: createForm.email.trim(),
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
            setCreateError(
                error.response?.data?.message || error.response?.data || error.message || "Failed to create user"
            );
        } finally {
            setCreateLoading(false);
        }
    };



    const [users, setUsers] = useState([]);
    const [showUsers, setShowUsers] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [usersError, setUsersError] = useState("");

    const loadUsers = async () => {
        setLoadingUsers(true);
        setUsersError("");

        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (error){
            setUsersError(
                error.response?.data?.message || error.response?.data || error.message || "Failed to load users"
            );
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
            setActionError(
                error.response?.data?.message || error.response?.data || error.message || "Failed to toggle user status"
            );
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
            setRoleError(
                error.response?.data?.message || error.response?.data || error.message || "Failed to change user's role"
            );
        } finally{
            setRoleChangingId(null);
        } 

    }



    const [editingUserId, setEditingUserId] = useState(null);
    const [editForm, setEditForm] = useState({ username: "", email: "" });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");

    const startEditUser = (user) => {
        setEditError("");
        setEditingUserId(user.id);
        setEditForm({ username: user.username, email: user.email });
    };

    const cancelEditUser = () => {
        setEditingUserId(null);
        setEditForm({ username: "", email: "" });
    };

    const handleEditChange = (e) => {
        setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const saveEditUser = async (userId) => {
        setEditError("");
        setEditLoading(true);
        try {
            await updateUser(userId, {
                username: editForm.username.trim(),
                email: editForm.email.trim(),
            });
            await loadUsers();
            cancelEditUser();
        } catch (error) {
            setEditError(
                error.response?.data?.message || error.response?.data || error.message || "Failed to update user"
            );
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
            const data = error.response?.data;

            const message =
                typeof data === "string"
                    ? data
                    : data?.message ||
                    (data && typeof data === "object"
                        ? Object.values(data).flat().join(" | ")
                        : "") ||
                    error.message ||
                    "Failed to change password";

            setPasswordError(message);
        } finally {
            setPasswordLoading(false);
        }
    };



    const [deleteLoadingId, setDeleteLoadingId] = useState(null);
    const [deleteError, setDeleteError] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null); 

    const handleDeleteUser = async (user) => {
        if (user.role === "ADMIN") {
            setDeleteError("Cannot delete admin user");
            return;
        }

        setDeleteError("");
        setDeleteLoadingId(user.id);

        try {
            await deleteUser(user.id);
            await loadUsers();
        } catch (error) {
            setDeleteError(
            error.response?.data?.message ||
                error.response?.data ||
                error.message ||
                "Failed to delete user"
            );
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

    const loadMedicalServices = async () => {
        setServicesLoading(true);
        setServicesError("");
        try {
            const data = await getAllMedicalServices();
            setServices(data);
        } catch (error) {
            setServicesError(getErrorMessage(error, "Failed to load medical services"));
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
            setServiceCreateError(getErrorMessage(error, "Failed to create medical service"));
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
            setServiceEditError(getErrorMessage(error, "Failed to update medical service"));
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
            setServicesError(getErrorMessage(error, "Failed to delete medical service"));
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

    return (
        <div style={{ padding: '24px' }}>
            <h1>Admin Dashboard</h1>

            <button onClick={handleLogout} style={{ marginBottom: "20px"}}> 
                Logout
            </button>

            <section style={{ marginBottom: "28px", maxWidth: "520px" }}>
                <h2>Create New User</h2>

                <form onSubmit={handleCreateUser}>
                    <div style={{ marginBottom: "10px"}}>
                        <label>Username</label>
                        <input
                            name="username"
                            value={createForm.username}
                            onChange={handleCreateChange}
                            required
                            style={{ width: "100%", padding: "8px"}}
                        />
                    </div>

                    <div style={{ marginBottom: "10px"}}>
                        <label>Email</label>
                        <input 
                            name="email"
                            type="email"
                            value={createForm.email}
                            onChange={handleCreateChange}
                            required
                            style={{ width: "100%", padding: "8px"}}
                        />  
                    </div>

                    <div style={{ marginBottom: "10px"}}>
                        <label>Password</label>
                        <input
                            name="password"
                            type="password"
                            value={createForm.password}
                            onChange={handleCreateChange}
                            required
                            minLength={6}
                            style={{ width: "100%", padding: "8px"}}
                        />
                    </div>

                    <div style = {{ marginBottom: "12px"}}>
                        <label>Role</label>
                        <select
                            name="role"
                            value={createForm.role}
                            onChange={handleCreateChange}
                            required
                            style={{ width: "100%", padding: "8px" }}
                        >
                            <option value ="" disabled>Select Role</option>
                            <option value ="DOCTOR">Doctor</option>
                            <option value ="PATIENT">Patient</option>
                        </select>
                    </div>

                    <button type="submit" disabled={createLoading}>
                        {createLoading ? "Creating..." : "Create User"}
                    </button>
                </form>

                {createError && (
                    <p style={{ color:"red", marginTop: "10px"}}>{createError}</p>
                )}
                {createSuccess && (
                    <p style={{ color: "green", marginTop: "10px" }}>{createSuccess}</p>
                )}
            </section>

            <section>
                <h2>Users</h2>

                {showUsers && loadingUsers && <p>Loading users...</p>}
                {showUsers && usersError && <p style={{ color:"red" }}>{usersError}</p>}
                {actionError && <p style={{ color: "red" }}>{actionError}</p>}
                {roleError && <p style={{ color:"red" }}>{roleError} </p>}
                {editError && <p style={{ color: "red" }}>{editError}</p>}
                {passwordError && <p style={{ color: "red" }}>{passwordError}</p>}
                {passwordSuccess && <p style={{ color: "green" }}>{passwordSuccess}</p>}
                {deleteError && <p style={{ color: "red" }}>{deleteError}</p>}

                {showUsers && !loadingUsers && !usersError && (
                    <table 
                        border="2"
                        cellPadding="8"
                        style={{
                            width: "100%",
                            maxWidth: "1450px",
                            borderCollapse: "collapse",
                            tableLayout: "fixed",
                            marginTop: "8px",
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={thStyle}> ID</th>
                                <th style={thStyle}>Username</th>
                                <th style={thStyle}>Email</th>
                                <th style={thStyle}>Role</th>
                                <th style={thStyle}>Enabled</th>
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
                                    <td style={tdStyle}>{user.enabled ? "Yes" : "No"}</td>
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
                                                    value={editForm.email}
                                                    onChange={handleEditChange}
                                                    style={{ marginBottom: "6px", width: "100%" }}
                                                />
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
                                            <button onClick={() => setDeleteTarget(user)} 
                                            disabled={deleteLoadingId === user.id}>
                                                {deleteLoadingId === user.id ? "Deleting..." : "Delete"}
                                            </button>

                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                <button 
                    onClick={async () => {
                        const next =! showUsers;
                        setShowUsers(next);
                        if (next){
                            await loadUsers();
                        }
                    }}
                    style ={{ marginBottom:"10px"}}
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
                                style={{ background: "#dc2626", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px" }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section style={{ marginTop: "28px" }}>
                <h2>Create New Medical Service</h2>

                <form onSubmit={handleCreateMedicalService} style={{ maxWidth: "520px", marginBottom: "16px" }}>
                    <div style={{ marginBottom: "10px" }}>
                        <label>Name</label>
                        <input
                            name="name"
                            value={serviceCreateForm.name}
                            onChange={handleServiceCreateChange}
                            required
                            style={{ width: "100%", padding: "8px" }}
                        />
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                        <label>Description</label>
                        <input
                            name="description"
                            value={serviceCreateForm.description}
                            onChange={handleServiceCreateChange}
                            style={{ width: "100%", padding: "8px" }}
                        />
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                        <label>Price (USD)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            name="price"
                            value={serviceCreateForm.price}
                            onChange={handleServiceCreateChange}
                            required
                            style={{ width: "100%", padding: "8px" }}
                        />
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                        <label>Duration (minutes)</label>
                        <input
                            type="number"
                            min="1"
                            name="duration"
                            value={serviceCreateForm.duration}
                            onChange={handleServiceCreateChange}
                            required
                            style={{ width: "100%", padding: "8px" }}
                        />
                    </div>

                    <button type="submit" disabled={serviceCreateLoading}>
                        {serviceCreateLoading ? "Creating..." : "Create Medical Service"}
                    </button>
                </form>
            </section>

            <section style={{ marginTop: "28px" }}> 
                <h2>Medical Services</h2>

                {showServices && serviceCreateError && <p style={{ color: "red" }}>{serviceCreateError}</p>}
                {showServices && serviceCreateSuccess && <p style={{ color: "green" }}>{serviceCreateSuccess}</p>}
                {showServices && servicesError && <p style={{ color: "red" }}>{servicesError}</p>}
                {showServices && serviceEditError && <p style={{ color: "red" }}>{serviceEditError}</p>}

                {showServices && (
                    servicesLoading ? (
                        <p>Loading medical services...</p>
                    ) : (
                        <table
                            border="2"
                            cellPadding="8"
                            style={{
                                width: "100%",
                                maxWidth: "1450px",
                                borderCollapse: "collapse",
                                tableLayout: "fixed",
                                marginTop: "8px",
                            }}
                        >
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

                 >
                    {showServices ? "Hide Medical Services" : "Show Medical Services"}
                </button>
            </section>
        </div>
    );
}

export default AdminDashboard;
