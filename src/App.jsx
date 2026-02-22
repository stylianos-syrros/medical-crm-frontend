import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<RequireRole allowedRoles={["ADMIN"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        
          <Route element={<RequireRole allowedRoles={["DOCTOR"]} />}>
            <Route path="/doctor" element={<DoctorDashboard/>} />
          </Route>

          <Route element={<RequireRole allowedRoles={["PATIENT"]} />}>
            <Route path="/patient" element={<PatientDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;