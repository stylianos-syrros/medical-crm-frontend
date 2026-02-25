import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import { useEffect, useState } from "react";
import { createUser, getAllUsers , enableUser, disableUser} from "../features/user/usersApi"; 

function AdminDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [usersError, setUsersError] = useState("");
    const [showUsers, setShowUsers] = useState(false);

    const [createForm, setCreateForm] = useState({
        username: "",
        email: "",
        password: "",
        role: ""
    });

    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");

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

    useEffect(() => {
        loadUsers();
    }, []);

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };

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

        
    const thStyle = {
        border: "1px solid #d1d5db",
        padding: "12px",
        textAlign: "left",
        background: "#f8fafc",
    };

    const tdStyle = {
        border: "1px solid #d1d5db",
        padding: "12px",
        textAlign: "left",
        wordBreak: "break-word",
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
                
                {showUsers && !loadingUsers && !usersError && (
                    <table 
                        border="2"
                        cellPadding="8"
                        style={{
                            width: "100%",
                            maxWidth: "980px",
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
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <button 
                    onClick={() => setShowUsers((prev) => !prev)}
                    style ={{ marginBottom:"10px"}}
                >
                    {showUsers ? "Hide Users" : "Show Users"}
                </button>
            </section>
        </div>
    );
}

export default AdminDashboard;