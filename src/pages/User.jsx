// src/pages/User.jsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import {
  FaPlus,
  FaEdit,
  FaKey,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaUserLock,
  FaUserCheck,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import { API_BASE_URL } from "../config";

//const API_BASE_URL = "http://127.0.0.1:8000/api";
const ITEMS_PER_PAGE = 50;
const roleMap = {
  1: "Admin",
  2: "Superuser",
  3: "Moderator",
  4: "Authenticated",
  5: "Anonymous",
};

export default function User() {
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    country: "",
    rid: 4,
  });
  const [editForm, setEditForm] = useState({ id: null, name: "", email: "", mobile: "", country: "" });
  const [pwForm, setPwForm] = useState({ id: null, email: "", new_password: "", new_password_confirmation: "" });

  // Toasts
  const [toasts, setToasts] = useState([]);

  // Derived filtered users
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter((u) => (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
  }, [users, searchTerm]);

  useEffect(() => {
    // Run on mount
    fetchUserName();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------- Toast helper -------------
  function showToast(message, type = "success") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  // ------------- Response handler -------------
  async function handleResponse(response) {
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        window.location.href = "index.html";
        throw new Error("Unauthorized");
      }
      const data = await response.json().catch(() => ({}));
      throw new Error(JSON.stringify(data));
    }
    return response.json().catch(() => ({}));
  }

  // ------------- Fetch username for header -------------
  async function fetchUserName() {
    const userNameElement = document.getElementById("user-name");
    const profileLink = document.querySelector(".profile-link");
    try {
      const user = JSON.parse(localStorage.getItem("user")) || {};
      let userId = user.id || 1;
      const token = localStorage.getItem("authToken");
      if (!token) {
        console.warn("No authToken in localStorage — skipping fetchUserName");
        if (userNameElement) userNameElement.textContent = "User";
        if (profileLink) profileLink.style.cursor = "default";
        return;
      }

      const res = await fetch(`${API_BASE_URL}/user/${userId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      const result = await handleResponse(res);
      if (result?.status === "success" && result?.data?.name) {
        if (userNameElement) userNameElement.textContent = result.data.name;
        if (profileLink) {
          profileLink.setAttribute("data-user-id", userId);
          profileLink.onclick = () => (window.location.href = `profile.html?userId=${userId}`);
        }
      } else {
        if (userNameElement) userNameElement.textContent = "User";
      }
    } catch (err) {
      console.error("fetchUserName error:", err);
      if (userNameElement) userNameElement.textContent = "User";
      if (profileLink) profileLink.style.cursor = "default";
    }
  }

  // ------------- Fetch users -------------
  async function fetchUsers() {
    try {
      if (!API_BASE_URL) {
        showToast("Configuration error: API base URL not found", "error");
        return;
      }
      const token = localStorage.getItem("authToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const cid = user.cid;
      if (!token || !cid) {
        showToast("Authentication required", "error");
        window.location.href = "index.html";
        return;
      }

      const res = await fetch(`${API_BASE_URL}/users-by-role`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          cid,
        },
        body: JSON.stringify({ cid }),
      });

      const data = await handleResponse(res);
      setUsers(data.users || []);
      if (!data.users || data.users.length === 0) {
        showToast(data.message || "No users found for this company", "error");
      }
      setCurrentPage(1);
    } catch (err) {
      console.error("fetchUsers error:", err);
      showToast("Error loading users", "error");
    }
  }

  // ------------- Toggle block/unblock -------------
  async function toggleUserBlock(userId, currentStatus) {
    try {
      if (!API_BASE_URL) throw new Error("Config missing");
      const token = localStorage.getItem("authToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const cid = user.cid;
      if (!token || !cid) {
        showToast("Authentication required", "error");
        window.location.href = "index.html";
        return;
      }
      const newBlockStatus = currentStatus === 0 ? 1 : 0;
      const res = await fetch(`${API_BASE_URL}/user-block-unblock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", cid },
        body: JSON.stringify({ user_id: userId, block: newBlockStatus }),
      });
      const data = await handleResponse(res);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u)));
      showToast(`User ${newBlockStatus === 1 ? "blocked" : "unblocked"} successfully`, "success");
    } catch (err) {
      console.error("toggleUserBlock error:", err);
      showToast("Failed to update user status", "error");
      fetchUsers();
    }
  }

  // ------------- Promote / Demote -------------
  async function promoteDemoteUser(userId, currentRid, action) {
    try {
      if (!API_BASE_URL) throw new Error("Config missing");
      const token = localStorage.getItem("authToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const cid = user.cid;
      if (!token || !cid) {
        showToast("Authentication required", "error");
        window.location.href = "index.html";
        return;
      }

      let newRid = currentRid;
      if (action === "promote" && currentRid > 1) newRid = currentRid - 1;
      else if (action === "demote" && currentRid < 5) newRid = currentRid + 1;
      else {
        showToast(`User is already at ${action === "promote" ? "highest" : "lowest"} role`, "error");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/user-promote-demote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", cid },
        body: JSON.stringify({ user_id: userId, rid: newRid }),
      });

      await handleResponse(res);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, rid: newRid } : u)));
      showToast(`User ${action}d to ${roleMap[newRid]} successfully`, "success");
    } catch (err) {
      console.error("promoteDemoteUser error:", err);
      showToast(`Failed to ${action} user`, "error");
      fetchUsers();
    }
  }

  // ------------- Open Edit modal and load user -------------
  async function openEditUserModal(userId) {
    try {
      if (!API_BASE_URL) throw new Error("Config missing");
      const token = localStorage.getItem("authToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const cid = user.cid;
      if (!token || !cid) {
        showToast("Authentication required", "error");
        window.location.href = "index.html";
        return;
      }

      const res = await fetch(`${API_BASE_URL}/user/${userId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", cid },
      });

      const data = await handleResponse(res);
      if (data?.status === "success" && data?.data) {
        setEditForm({
          id: data.data.id,
          name: data.data.name || "",
          email: data.data.email || "",
          mobile: data.data.mobile || "",
          country: data.data.country || "",
        });
        setShowEditModal(true);
      } else {
        showToast("Failed to load user data", "error");
      }
    } catch (err) {
      console.error("openEditUserModal error:", err);
      showToast("Failed to load user data", "error");
    }
  }

  // ------------- Update user -------------
  async function updateUser(e) {
    e && e.preventDefault && e.preventDefault();
    try {
      if (!API_BASE_URL) throw new Error("Config missing");
      const token = localStorage.getItem("authToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const cid = user.cid;
      if (!token || !cid) {
        showToast("Authentication required", "error");
        window.location.href = "index.html";
        return;
      }

      const formData = {
        id: parseInt(editForm.id, 10),
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        mobile: editForm.mobile.trim(),
        country: editForm.country.trim(),
      };

      const res = await fetch(`${API_BASE_URL}/user/${formData.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", cid },
        body: JSON.stringify(formData),
      });

      const data = await handleResponse(res);
      showToast(data.message || "User updated successfully", "success");
      setShowEditModal(false);
      setUsers((prev) => prev.map((u) => (u.id === formData.id ? { ...u, ...formData } : u)));
    } catch (err) {
      console.error("updateUser error:", err);
      showToast("Failed to update user", "error");
    }
  }

  // ------------- Add user -------------
  async function addUser(e) {
    e && e.preventDefault && e.preventDefault();
    try {
      if (!API_BASE_URL) throw new Error("Config missing");
      const token = localStorage.getItem("authToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const cid = user.cid;
      if (!token || !cid) {
        showToast("Authentication required", "error");
        window.location.href = "index.html";
        return;
      }

      const formData = {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        password: addForm.password.trim(),
        mobile: addForm.mobile.trim(),
        country: addForm.country.trim(),
        rid: parseInt(addForm.rid, 10),
      };

      const res = await fetch(`${API_BASE_URL}/newuser`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", cid },
        body: JSON.stringify(formData),
      });

      const data = await handleResponse(res);
      showToast(data.message || "User added successfully", "success");
      setShowAddModal(false);
      setUsers((prev) => [...prev, { ...formData, id: data.user_id || Date.now(), blocked: 0 }]);
      setAddForm({ name: "", email: "", password: "", mobile: "", country: "", rid: 4 });
    } catch (err) {
      console.error("addUser error:", err);
      showToast("Failed to add user", "error");
    }
  }

  // ------------- Open change-password modal -------------
  async function openChangePasswordModal(userId) {
    try {
      if (!API_BASE_URL) throw new Error("Config missing");
      const token = localStorage.getItem("authToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const cid = user.cid;
      if (!token || !cid) {
        showToast("Authentication required", "error");
        window.location.href = "index.html";
        return;
      }

      const res = await fetch(`${API_BASE_URL}/user/${userId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", cid },
      });

      const data = await handleResponse(res);
      if (data?.status === "success" && data?.data) {
        setPwForm({ id: data.data.id, email: data.data.email || "", new_password: "", new_password_confirmation: "" });
        setShowChangePasswordModal(true);
      } else {
        showToast("Failed to load user data", "error");
      }
    } catch (err) {
      console.error("openChangePasswordModal error:", err);
      showToast("Failed to load user data", "error");
    }
  }

  // ------------- Change password -------------
  async function changePassword(e) {
    e && e.preventDefault && e.preventDefault();
    try {
      if (!API_BASE_URL) throw new Error("Config missing");
      const token = localStorage.getItem("authToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const cid = user.cid;
      if (!token || !cid) {
        showToast("Authentication required", "error");
        window.location.href = "index.html";
        return;
      }
      if (pwForm.new_password !== pwForm.new_password_confirmation) {
        showToast("New password and confirmation do not match", "error");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/change-password/${pwForm.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", cid },
        body: JSON.stringify({ new_password: pwForm.new_password, new_password_confirmation: pwForm.new_password_confirmation }),
      });

      const data = await handleResponse(res);
      showToast(data.message || "Password changed successfully", "success");
      setShowChangePasswordModal(false);
    } catch (err) {
      console.error("changePassword error:", err);
      showToast("Failed to change password", "error");
    }
  }

  // ------------- Pagination helpers -------------
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  function gotoPage(page) {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ------------- Render -------------
  return (
    <div className=" p-6 text-slate-800">
           <Header title="User management" bgColor="bg-gradient-to-r from-neutral-800 to-cyan-700 text-white" />

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4 w-full">
  {/* Title */}
  <h3 className="text-lg md:text-xl font-semibold text-gray-800">Users List</h3>

  {/* Search + Add Button Section */}
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
    {/* Search Box */}
    <div className="relative w-full sm:w-64">
      <input
        id="searchInput"
        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
        placeholder="Search by name..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
      />
      <div className="absolute right-3 top-2.5 text-gray-400 pointer-events-none">
        <FaSearch className="text-sm" />
      </div>
    </div>

    {/* Add Button */}
    <button
      id="addUserBtn"
      onClick={() => setShowAddModal(true)}
      className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded border text-xs sm:text-sm font-semibold text-cyan-800 border-cyan-800 hover:bg-cyan-800 hover:text-white transition-all duration-200 whitespace-nowrap"
    >
      <FaPlus className="text-xs sm:text-sm" /> Add New User
    </button>
  </div>
</div>


 {/* Responsive User Table / Cards */}
<div className="mt-4">
  {/* Desktop Table */}
  <div className="hidden md:block overflow-x-auto">
    <table className="min-w-full text-sm bg-white border rounded-lg">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-3 py-2 text-left">S.No</th>
          <th className="px-3 py-2 text-left">Username</th>
          <th className="px-3 py-2 text-left">Email</th>
          <th className="px-3 py-2 text-left">Role</th>
          <th className="px-3 py-2 text-left">Status</th>
          <th className="px-3 py-2 text-left">Block/Unblock</th>
          <th className="px-3 py-2 text-left">Promote/Demote</th>
          <th className="px-3 py-2 text-left">Edit</th>
          <th className="px-3 py-2 text-left">Change Password</th>
        </tr>
      </thead>
      <tbody id="usersTableBody">
        {paginatedUsers.length === 0 ? (
          <tr>
            <td colSpan={9} className="px-3 py-6 text-center text-gray-600">
              No users found
            </td>
          </tr>
        ) : (
          paginatedUsers.map((user, idx) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
              <td className="px-3 py-2">{user.name || "N/A"}</td>
              <td className="px-3 py-2">{user.email || "N/A"}</td>
              <td className="px-3 py-2">{roleMap[user.rid] || "Unknown"}</td>
              <td className="px-3 py-2">{user.blocked === 0 ? "Active" : "Blocked"}</td>
              <td className="px-3 py-2">
                <button
                  onClick={() => toggleUserBlock(user.id, user.blocked)}
                  className={`flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium transition-all duration-200 ${
                    user.blocked === 0
                      ? "text-red-600 border-red-600 hover:bg-red-50"
                      : "text-green-600 border-green-600 hover:bg-green-50"
                  }`}
                >
                  {user.blocked === 0 ? <FaUserLock /> : <FaUserCheck />}
                  {user.blocked === 0 ? "Block" : "Unblock"}
                </button>
              </td>
              <td className="px-3 py-2 flex gap-2">
                <button
                  onClick={() => promoteDemoteUser(user.id, user.rid, "promote")}
                  disabled={user.rid === 2}
                  className="flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium text-yellow-700 border-yellow-700 hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaArrowUp /> Promote
                </button>
                <button
                  onClick={() => promoteDemoteUser(user.id, user.rid, "demote")}
                  disabled={user.rid === 5}
                  className="flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium text-yellow-700 border-yellow-700 hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaArrowDown /> Demote
                </button>
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => openEditUserModal(user.id)}
                  className="flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium text-indigo-600 border-indigo-600 hover:bg-indigo-50"
                >
                  <FaEdit /> Edit
                </button>
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => openChangePasswordModal(user.id)}
                  className="flex items-center gap-1 px-3 py-1 rounded border text-xs font-medium text-purple-600 border-purple-600 hover:bg-purple-50"
                >
                  <FaKey /> Change Password
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>

  {/* Mobile Cards */}
  <div className="md:hidden space-y-4">
    {paginatedUsers.length === 0 ? (
      <div className="text-center text-gray-600 py-6 bg-white rounded-lg shadow">No users found</div>
    ) : (
      paginatedUsers.map((user) => (
        <div key={user.id} className="bg-white rounded-lg shadow p-4 border">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-800 text-base">{user.name || "N/A"}</h4>
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${
                user.blocked === 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {user.blocked === 0 ? "Active" : "Blocked"}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Email:</span> {user.email || "N/A"}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Role:</span> {roleMap[user.rid] || "Unknown"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => toggleUserBlock(user.id, user.blocked)}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${
                user.blocked === 0
                  ? "text-red-600 border-red-600"
                  : "text-green-600 border-green-600"
              }`}
            >
              {user.blocked === 0 ? <FaUserLock /> : <FaUserCheck />}
              {user.blocked === 0 ? "Block" : "Unblock"}
            </button>
            <button
              onClick={() => promoteDemoteUser(user.id, user.rid, "promote")}
              disabled={user.rid === 2}
              className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium text-yellow-700 border-yellow-700 disabled:opacity-50"
            >
              <FaArrowUp /> Promote
            </button>
            <button
              onClick={() => promoteDemoteUser(user.id, user.rid, "demote")}
              disabled={user.rid === 5}
              className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium text-yellow-700 border-yellow-700 disabled:opacity-50"
            >
              <FaArrowDown /> Demote
            </button>
            <button
              onClick={() => openEditUserModal(user.id)}
              className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium text-indigo-600 border-indigo-600"
            >
              <FaEdit /> Edit
            </button>
            <button
              onClick={() => openChangePasswordModal(user.id)}
              className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium text-purple-600 border-purple-600"
            >
              <FaKey /> Password
            </button>
          </div>
        </div>
      ))
    )}
  </div>
</div>


          {/* Pagination */}
          <div id="pagination" className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => gotoPage(currentPage - 1)} disabled={currentPage === 1} className="px-2 py-1 border rounded">
                <FaChevronLeft />

            </button>

            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let start = Math.max(1, currentPage - 2);
              let end = Math.min(totalPages, start + 4);
              const page = start + i;
              if (page > end) return null;
              return (
                <button
                  key={i}
                  onClick={() => gotoPage(page)}
                  className={`px-3 py-1 rounded ${page === currentPage ? "bg-blue-600 text-white" : "border"}`}
                >
                  {page}
                </button>
              );
            })}

            <button onClick={() => gotoPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-2 py-1 border rounded">
  <FaChevronRight />
            </button>

            <span className="ml-3 text-sm text-gray-600">{filteredUsers.length} total</span>
          </div>
        </div>

        {/* Modals (Add / Edit / Change Password) */}
        {showAddModal && (
          <Modal onClose={() => setShowAddModal(false)} title="Add New User">
            <form onSubmit={addUser}>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium">Name</label>
                  <input required value={addForm.name} onChange={(e) => setAddForm((s) => ({ ...s, name: e.target.value }))} className="w-full border px-2 py-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input required type="email" value={addForm.email} onChange={(e) => setAddForm((s) => ({ ...s, email: e.target.value }))} className="w-full border px-2 py-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Password</label>
                  <input required type="password" value={addForm.password} onChange={(e) => setAddForm((s) => ({ ...s, password: e.target.value }))} className="w-full border px-2 py-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Mobile</label>
                  <input required value={addForm.mobile} onChange={(e) => setAddForm((s) => ({ ...s, mobile: e.target.value.replace(/[^0-9]/g, "") }))} className="w-full border px-2 py-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Country</label>
                  <select required value={addForm.country} onChange={(e) => setAddForm((s) => ({ ...s, country: e.target.value }))} className="w-full border px-2 py-2 rounded">
                    <option value="">Select a country</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="IN">India</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                    <option value="CN">China</option>
                    <option value="BR">Brazil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Role</label>
                  <select required value={addForm.rid} onChange={(e) => setAddForm((s) => ({ ...s, rid: e.target.value }))} className="w-full border px-2 py-2 rounded">
                    <option value={1}>Admin</option>
                    <option value={2}>Superuser</option>
                    <option value={3}>Moderator</option>
                    <option value={4}>Authenticated</option>
                    <option value={5}>Anonymous</option>
                  </select>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" className="px-4 py-2 border rounded">Save</button>
                </div>
              </div>
            </form>
          </Modal>
        )}

        {showEditModal && (
          <Modal onClose={() => setShowEditModal(false)} title="Edit User">
            <form onSubmit={updateUser}>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium">Name</label>
                  <input required value={editForm.name} onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} className="w-full border px-2 py-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input required type="email" value={editForm.email} onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))} className="w-full border px-2 py-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Mobile</label>
                  <input required value={editForm.mobile} onChange={(e) => setEditForm((s) => ({ ...s, mobile: e.target.value.replace(/[^0-9]/g, "") }))} className="w-full border px-2 py-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Country</label>
                  <select required value={editForm.country} onChange={(e) => setEditForm((s) => ({ ...s, country: e.target.value }))} className="w-full border px-2 py-2 rounded">
                    <option value="">Select a country</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="IN">India</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                    <option value="CN">China</option>
                    <option value="BR">Brazil</option>
                  </select>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" className="px-4 py-2 border rounded">Save</button>
                </div>
              </div>
            </form>
          </Modal>
        )}

        {showChangePasswordModal && (
          <Modal onClose={() => setShowChangePasswordModal(false)} title="Change Password">
            <form onSubmit={changePassword}>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input readOnly value={pwForm.email} className="w-full border px-2 py-2 rounded bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium">New Password</label>
                  <input required type="password" value={pwForm.new_password} onChange={(e) => setPwForm((s) => ({ ...s, new_password: e.target.value }))} className="w-full border px-2 py-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Confirm New Password</label>
                  <input required type="password" value={pwForm.new_password_confirmation} onChange={(e) => setPwForm((s) => ({ ...s, new_password_confirmation: e.target.value }))} className="w-full border px-2 py-2 rounded" />
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" className="px-4 py-2 border rounded">Save</button>
                </div>
              </div>
            </form>
          </Modal>
        )}

        {/* Toasts */}
        <div id="toastContainer" className="fixed right-4 bottom-4 space-y-2">
          {toasts.map((t) => (
            <div key={t.id} className={`toast px-4 py-2 rounded shadow ${t.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
              {t.message}
            </div>
          ))}
        </div>
    </div>
  );
}

/* Simple Modal component */
function Modal({ children, title, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose} />
      <div className="bg-white rounded-lg shadow-lg z-10 w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">{title}</h3>
          <button onClick={onClose} className="text-xl font-bold">×</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}  