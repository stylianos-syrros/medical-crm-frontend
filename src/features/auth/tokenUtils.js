export function parseRoleFromToken(token){
    try{
        const payLoadBase64 = token.split(".")[1];
        const payLoadJson = atob(
            payLoadBase64.replace(/-/g, "+").replace(/_/g, "/")
        );        
        const payload = JSON.parse(payLoadJson);
        return payload.role? payload.role.replace('ROLE_','') : null;
    } catch(error){
            return null;
    }
} 