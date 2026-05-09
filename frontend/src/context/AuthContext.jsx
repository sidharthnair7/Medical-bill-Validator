
import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("ic_token"));
    const [user, setUser]   = useState(() => {
        try { return JSON.parse(localStorage.getItem("ic_user")); }
        catch { return null; }
    });

    const login = useCallback(async (email, password) => {
        const res = await fetch("/api/v1/auth/authenticate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message ?? "Invalid credentials");
        }
        const data = await res.json();           // { token: "..." }
        localStorage.setItem("ic_token", data.token);
        localStorage.setItem("ic_user", JSON.stringify({ email }));
        setToken(data.token);
        setUser({ email });
        return data;
    }, []);

    const register = useCallback(async (firstName, lastName, email, password) => {
        const res = await fetch("/api/v1/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firstName, lastName, email, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message ?? "Registration failed");
        }
        const data = await res.json();
        localStorage.setItem("ic_token", data.token);
        localStorage.setItem("ic_user", JSON.stringify({ email, firstName, lastName }));
        setToken(data.token);
        setUser({ email, firstName, lastName });
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("ic_token");
        localStorage.removeItem("ic_user");
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ token, user, login, register, logout, isLoggedIn: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}