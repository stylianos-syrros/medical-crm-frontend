import { useSelector } from "react-redux";
import { Navigate, Outlet} from "react-router-dom";

function RequireAuth(){
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

    if (!isAuthenticated){
        return <Navigate to="/login" replace/>;
    }
    return <Outlet/>;
}

export default RequireAuth;