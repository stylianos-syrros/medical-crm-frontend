import { useSelector } from "react-redux";
import { Navigate, Outlet} from "react-router-dom";

function RequireRole({ allowedRoles}){

    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated); 
    const role = useSelector((state) => state.auth.role);
    if (!isAuthenticated){
        return <Navigate to="/login" replace/>;
    }

    if (!allowedRoles.includes(role)){
        return <Navigate to="/login" replace/>;
    }

    return <Outlet/>;
}

export default RequireRole;