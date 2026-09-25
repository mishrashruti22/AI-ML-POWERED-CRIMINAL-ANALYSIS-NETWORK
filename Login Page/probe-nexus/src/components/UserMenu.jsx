import { useState, useRef, useEffect } from "react";
import { clearSession } from "../auth/authService";
import { logoutUser } from "../config/api";

const IconUser = ({ size = 19 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6" />
    </svg>
);

const IconLogout = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const IconChevron = ({ size = 14, open }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const IconUsers = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M1 21c.8-4 3.4-6 8-6s7.2 2 8 6" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
);

/**
 * UserMenu — profile icon + dropdown for post-login navigation.
 *
 * Props:
 *   user       — current user object from authService.getSession()
 *   onNavigate — page navigation callback
 *   buttonClass — optional extra class for the trigger button
 */
export default function UserMenu({ user, onNavigate, buttonClass = "" }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function handleLogout() {
        // Call backend to close session first
        await logoutUser();
        clearSession();
        setOpen(false);
        if (onNavigate) onNavigate("login");
    }

    const displayName = user?.fullName || "Investigator";
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const isAdmin = user?.role === "ADMIN";

    return (
        <div className="user-menu-wrapper" ref={menuRef}>

            {/* ── Trigger button ── */}
            <button
                type="button"
                className={`user-menu-trigger ${buttonClass}`}
                onClick={() => setOpen((prev) => !prev)}
                aria-label="User profile menu"
                aria-expanded={open}
            >
                <span className="user-avatar">{initials}</span>
                <IconChevron open={open} />
            </button>

            {/* ── Dropdown panel ── */}
            {open && (
                <div className="user-menu-dropdown" role="menu">

                    {/* User info header */}
                    <div className="user-menu-header">
                        <div className="user-menu-avatar-lg">{initials}</div>
                        <div className="user-menu-info">
                            <p className="user-menu-name">{user?.fullName || "—"}</p>
                            <p className="user-menu-role">{user?.role || "—"}</p>
                        </div>
                    </div>

                    <div className="user-menu-divider" />

                    {/* Details */}
                    <div className="user-menu-details">

                        <div className="user-menu-field">
                            <span className="user-field-label">Department ID</span>
                            <span className="user-field-value dept-id">{user?.departmentId || "—"}</span>
                        </div>

                        <div className="user-menu-field">
                            <span className="user-field-label">Official Email</span>
                            <span className="user-field-value">{user?.email || "—"}</span>
                        </div>

                    </div>

                    <div className="user-menu-divider" />

                    {/* Admin: User Management link */}
                    {isAdmin && (
                        <>
                            <button
                                type="button"
                                className="user-menu-logout"
                                style={{ color: "#78b4ff" }}
                                onClick={() => { setOpen(false); if (onNavigate) onNavigate("user-management"); }}
                                role="menuitem"
                            >
                                <IconUsers />
                                <span>User Management</span>
                            </button>
                            <div className="user-menu-divider" />
                        </>
                    )}

                    {/* Logout */}
                    <button
                        type="button"
                        className="user-menu-logout"
                        onClick={handleLogout}
                        role="menuitem"
                    >
                        <IconLogout />
                        <span>Logout</span>
                    </button>

                </div>
            )}
        </div>
    );
}

