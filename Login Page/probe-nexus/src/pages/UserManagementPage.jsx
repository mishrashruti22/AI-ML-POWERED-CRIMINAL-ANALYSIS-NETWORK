/**
 * ============================================================
 * PROBNEXUS — USER MANAGEMENT PAGE
 * ============================================================
 * Admin-only page for monitoring investigator accounts and
 * active sessions.
 *
 * Features:
 *   - Stats cards: Total Users / Active Now / Active Today
 *   - Searchable user table with online/offline status
 *   - User detail drawer with session history
 *   - Auto-refresh every 30s + manual Refresh button
 *   - Access denied screen for non-admin users
 * ============================================================
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchUserStats, fetchUsersList, fetchUserSessions } from "../config/api";
import "../styles/user-management.css";

/* ── SVG Icons ── */

const IconUsers = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4" />
    <path d="M1 21c.8-4 3.4-6 8-6s7.2 2 8 6" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);

const IconRefresh = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6" />
    <path d="M2.5 22v-6h6" />
    <path d="M2 11.5a10 10 0 0 1 18.8-4.3" />
    <path d="M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

const IconSearch = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const IconArrowLeft = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H6" />
    <path d="m12 5-7 7 7 7" />
  </svg>
);

const IconShield = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 20 6v5c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6l8-3Z" />
    <circle cx="12" cy="11" r="2.5" />
    <path d="M12 13.5V17" />
  </svg>
);

/* ── Helpers ── */

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function getInitials(name) {
  if (!name) return "??";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

/* ── Auto-refresh interval (ms) ── */
const AUTO_REFRESH_MS = 30000;

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function UserManagementPage({ onNavigate, currentUser }) {
  const navigate = (page) => { if (onNavigate) onNavigate(page); };

  /* ── Admin check ── */
  const isAdmin = currentUser?.role === "ADMIN";

  /* ── State ── */
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  /* ── Drawer state ── */
  const [selectedUser, setSelectedUser] = useState(null);
  const [drawerSessions, setDrawerSessions] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const refreshTimerRef = useRef(null);

  /* ── Data fetching ── */
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      const [statsData, usersData] = await Promise.all([
        fetchUserStats(),
        fetchUsersList(),
      ]);

      setStats(statsData);
      setUsers(usersData);
      setError(null);
    } catch (err) {
      console.error("User management load error:", err);
      if (!silent) setError(err.message || "Failed to load user data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* ── Initial load + auto-refresh ── */
  useEffect(() => {
    if (!isAdmin) return;

    loadData();

    refreshTimerRef.current = setInterval(() => {
      loadData(true); // silent refresh
    }, AUTO_REFRESH_MS);

    return () => clearInterval(refreshTimerRef.current);
  }, [isAdmin, loadData]);

  /* ── Open user drawer ── */
  async function openUserDrawer(user) {
    setSelectedUser(user);
    setDrawerLoading(true);
    setDrawerSessions([]);
    try {
      const sessions = await fetchUserSessions(user.id);
      setDrawerSessions(sessions);
    } catch (err) {
      console.error("Session fetch error:", err);
    } finally {
      setDrawerLoading(false);
    }
  }

  /* ── Filter users by search ── */
  const filteredUsers = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (u.fullName || "").toLowerCase().includes(q) ||
      (u.departmentId || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  /* ================================================================
     ACCESS DENIED (non-admin)
     ================================================================ */
  if (!isAdmin) {
    return (
      <div className="um-page">
        <div className="um-header">
          <div className="um-header-left">
            <div className="um-title">
              <IconShield size={22} />
              User Management
            </div>
          </div>
          <button className="um-back-btn" onClick={() => navigate("about")}>
            <IconArrowLeft size={14} /> Back
          </button>
        </div>
        <div className="um-access-denied">
          <div className="um-access-denied-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>
            This page is restricted to system administrators.
            Contact your admin to request elevated access.
          </p>
          <button className="um-back-btn" onClick={() => navigate("about")} style={{ marginTop: "1rem" }}>
            <IconArrowLeft size={14} /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================
     LOADING STATE
     ================================================================ */
  if (loading) {
    return (
      <div className="um-page">
        <div className="um-header">
          <div className="um-header-left">
            <div className="um-title">
              <IconUsers size={22} />
              User Management
              <span className="um-title-badge">Admin</span>
            </div>
            <div className="um-subtitle">Monitor investigator accounts and active sessions</div>
          </div>
        </div>
        <div className="um-loading">
          <div className="um-spinner" />
          <div className="um-loading-text">Loading user data…</div>
        </div>
      </div>
    );
  }

  /* ================================================================
     MAIN RENDER
     ================================================================ */
  return (
    <div className="um-page">

      {/* ── Header ── */}
      <div className="um-header">
        <div className="um-header-left">
          <div className="um-title">
            <IconUsers size={22} />
            User Management
            <span className="um-title-badge">Admin</span>
          </div>
          <div className="um-subtitle">Monitor investigator accounts and active sessions</div>
        </div>
        <div className="um-header-actions">
          <div className="um-auto-refresh-label">Auto-refresh: 30s</div>
          <button
            className={`um-refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={() => loadData(false)}
            disabled={refreshing}
          >
            <IconRefresh size={14} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button className="um-back-btn" onClick={() => navigate("about")}>
            <IconArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="um-stats-row">
        <div className="um-stat-card">
          <div className="um-stat-icon total">👥</div>
          <div className="um-stat-info">
            <div className="um-stat-value">{stats?.totalUsers ?? "—"}</div>
            <div className="um-stat-label">Total Users</div>
          </div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon active">🟢</div>
          <div className="um-stat-info">
            <div className="um-stat-value">{stats?.activeUsers ?? "—"}</div>
            <div className="um-stat-label">Active Now</div>
          </div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon today">📊</div>
          <div className="um-stat-info">
            <div className="um-stat-value">{stats?.activeToday ?? "—"}</div>
            <div className="um-stat-label">Active Today</div>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && <div className="um-error">⚠️ {error}</div>}

      {/* ── Search ── */}
      <div className="um-toolbar">
        <div className="um-search-wrap">
          <span className="um-search-icon"><IconSearch size={15} /></span>
          <input
            className="um-search-input"
            type="text"
            placeholder="Search by name, email, dept ID, role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Users Table ── */}
      <div className="um-table-wrap">
        {filteredUsers.length === 0 ? (
          <div className="um-empty">No users found.</div>
        ) : (
          <table className="um-table">
            <thead>
              <tr>
                <th>Department ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Last Logout</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} onClick={() => openUserDrawer(u)}>
                  <td style={{ fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.04em" }}>
                    {u.departmentId}
                  </td>
                  <td>{u.fullName}</td>
                  <td style={{ color: "rgba(224,224,232,0.6)" }}>{u.email}</td>
                  <td>
                    <span className={`um-role-pill ${(u.role || "").toLowerCase()}`}>
                      {u.role || "—"}
                    </span>
                  </td>
                  <td>
                    <span className={`um-status-pill ${u.isOnline ? "online" : "offline"}`}>
                      <span className={`um-status-dot ${u.isOnline ? "online" : "offline"}`} />
                      {u.isOnline ? "ONLINE" : "OFFLINE"}
                    </span>
                  </td>
                  <td>{formatDateTime(u.lastLoginAt)}</td>
                  <td>{formatDateTime(u.lastLogoutAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── User Detail Drawer ── */}
      {selectedUser && (
        <div className="um-drawer-overlay" onClick={() => setSelectedUser(null)}>
          <div className="um-drawer" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="um-drawer-header">
              <div className="um-drawer-title">User Details</div>
              <button className="um-drawer-close" onClick={() => setSelectedUser(null)}>✕</button>
            </div>

            {/* Profile */}
            <div className="um-drawer-profile">
              <div className="um-drawer-avatar">{getInitials(selectedUser.fullName)}</div>
              <div>
                <div className="um-drawer-name">{selectedUser.fullName}</div>
                <div className="um-drawer-email">{selectedUser.email}</div>
              </div>
            </div>

            {/* Fields */}
            <div className="um-drawer-fields">
              <div className="um-drawer-field">
                <div className="um-drawer-field-label">Department ID</div>
                <div className="um-drawer-field-value" style={{ fontFamily: "monospace" }}>
                  {selectedUser.departmentId}
                </div>
              </div>
              <div className="um-drawer-field">
                <div className="um-drawer-field-label">Role</div>
                <div className="um-drawer-field-value">
                  <span className={`um-role-pill ${(selectedUser.role || "").toLowerCase()}`}>
                    {selectedUser.role || "—"}
                  </span>
                </div>
              </div>
              <div className="um-drawer-field">
                <div className="um-drawer-field-label">Status</div>
                <div className="um-drawer-field-value">
                  <span className={`um-status-pill ${selectedUser.isOnline ? "online" : "offline"}`}>
                    <span className={`um-status-dot ${selectedUser.isOnline ? "online" : "offline"}`} />
                    {selectedUser.isOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
              </div>
              <div className="um-drawer-field">
                <div className="um-drawer-field-label">Last Login</div>
                <div className="um-drawer-field-value">{formatDateTime(selectedUser.lastLoginAt)}</div>
              </div>
              <div className="um-drawer-field">
                <div className="um-drawer-field-label">Last Logout</div>
                <div className="um-drawer-field-value">{formatDateTime(selectedUser.lastLogoutAt)}</div>
              </div>
              <div className="um-drawer-field">
                <div className="um-drawer-field-label">Registered</div>
                <div className="um-drawer-field-value">{formatDateTime(selectedUser.createdAt)}</div>
              </div>
            </div>

            {/* Session History */}
            <div className="um-sessions-title">Session History</div>
            {drawerLoading ? (
              <div className="um-loading" style={{ minHeight: "15vh" }}>
                <div className="um-spinner" />
              </div>
            ) : drawerSessions.length === 0 ? (
              <div className="um-no-sessions">No session history available.</div>
            ) : (
              drawerSessions.map(s => (
                <div className="um-session-card" key={s.id}>
                  <div className="um-session-label">Login</div>
                  <div className="um-session-value">{formatDateTime(s.loginAt)}</div>
                  <div className="um-session-label">Logout</div>
                  <div className="um-session-value">{formatDateTime(s.logoutAt)}</div>
                  <div className="um-session-label">Last Activity</div>
                  <div className="um-session-value">{formatDateTime(s.lastActivityAt)}</div>
                  <div className="um-session-label">Status</div>
                  <div className={`um-session-value ${s.isActive ? "um-session-active" : "um-session-closed"}`}>
                    {s.isActive ? "● ACTIVE" : "○ CLOSED"}
                  </div>
                </div>
              ))
            )}

          </div>
        </div>
      )}

    </div>
  );
}
