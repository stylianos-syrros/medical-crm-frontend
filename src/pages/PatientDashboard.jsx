import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";

function PatientDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleLogout = () => {
        dispatch(logout());
        navigate("/login");
    };
    
    return (
        <div style={{ padding: "24px" }}>
            <h1>Patient Dashboard</h1>
            <p>Patient features will go here.</p>
            <button onClick={handleLogout}>Logout</button>
        </div>
    );
}

export default PatientDashboard;
