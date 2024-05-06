import { cognitoUserPool } from "@/userPool";
import { useEffect, useState } from "react";

export function UserInfo() {
    const [ user, setUser ] = useState<string|undefined>(undefined)
    useEffect(() => {
        setUser(cognitoUserPool()?.getCurrentUser()?.getUsername());
    }, []);
    return (
        <div suppressHydrationWarning={true}>Signed in as {user}</div>
    )
}