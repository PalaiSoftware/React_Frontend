import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { API_BASE_URL} from "../config";

const defaultUserFallback = {
  id: 2,
  rid: 1,
  name: "Hetu Patel",
  email: "eicher@gmail.com",
  mobile: "9876543210",
  country: "IN",
  role: "Admin",
  company_name: "EICHER MOTORS",
  user_status: "active",
  company_status: "active",
  address: "123 Main St, City, State",
  phone: "+1234567890",
  gst: "nmhjds296812",
  pan: "pan45545411",
  cid: 2,
  lastUpdated: "2025-09-12T00:00:00Z",
};

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || defaultUserFallback;
    } catch {
      return defaultUserFallback;
    }
  });

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Modals
  const [showEditUser, setShowEditUser] = useState(false);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Form states
  const [editUserData, setEditUserData] = useState({
    name: "",
    email: "",
    mobile: "",
    country: "",
  });
  const [editCompanyData, setEditCompanyData] = useState({
    name: "",
    phone: "",
    gst: "",
    pan: "",
    address: "",
    company_status: "active",
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  // Password visibility
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  //const API_BASE_URL = "http://127.0.0.1:8000/api"; // safe fallback
  const canAccessUserProfile = [1, 2, 3, 4, 5].includes(user?.rid);
  const canAccessCompanyProfile = [1, 2, 3].includes(user?.rid);

  // Toast helpers
  function addToast(message, isError = false) {
    const id = Date.now().toString();
    setToasts((t) => [...t, { id, message, isError }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }

  function getAuthToken() {
    return localStorage.getItem("authToken");
  }

  function saveUserToLocal(u) {
    localStorage.setItem("user", JSON.stringify(u));
  }

  function performLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedCompany");
    navigate("/login", { replace: true });
  }

  // API functions
  async function fetchUserDetails(userId) {
    try {
      const resp = await fetch(`${API_BASE_URL}/user/${userId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await resp.json();
      return data.data || data.user || data;
    } catch {
      addToast("Failed to fetch user details", true);
      return null;
    }
  }

  async function fetchCompanyDetails(cid) {
    try {
      const resp = await fetch(`${API_BASE_URL}/clients/${cid}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await resp.json();
      return data.data || data.company || data;
    } catch {
      addToast("Failed to fetch company details", true);
      return null;
    }
  }

  async function updateUserDetailsAPI(userId, updatedData) {
    try {
      const resp = await fetch(`${API_BASE_URL}/user/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });
      return await resp.json();
    } catch {
      addToast("Failed to update user", true);
      return null;
    }
  }

  async function updateCompanyDetailsAPI(cid, updatedData) {
    try {
      const resp = await fetch(`${API_BASE_URL}/clients/${cid}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: updatedData.name,
          address: updatedData.address,
          phone: updatedData.phone,
          gst_no: updatedData.gst,
          pan: updatedData.pan,
          company_status: updatedData.company_status,
        }),
      });
      return await resp.json();
    } catch {
      addToast("Failed to update company", true);
      return null;
    }
  }

  async function changePasswordAPI(userId, data) {
    try {
      const resp = await fetch(`${API_BASE_URL}/change-password/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          old_password: data.oldPassword,
          new_password: data.newPassword,
          new_password_confirmation: data.confirmNewPassword,
        }),
      });
      return await resp.json();
    } catch {
      addToast("Failed to change password", true);
      return null;
    }
  }

  // Load user/company data
  useEffect(() => {
    async function load() {
      setLoading(true);
      const u = JSON.parse(localStorage.getItem("user")) || defaultUserFallback;
      const ud = await fetchUserDetails(u.id);
      if (ud) {
        const merged = { ...u, ...ud };
        setUser(merged);
        saveUserToLocal(merged);
      }
      if (canAccessCompanyProfile && u.cid) {
        const cd = await fetchCompanyDetails(u.cid);
        if (cd) setCompany(cd);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusClass = (s) =>
    s === "active" ? "text-green-600 font-semibold" : "text-red-600 font-semibold";

  // Handlers
  async function handleUserSave(e) {
    e.preventDefault();
    const updatedUser = { ...user, ...editUserData };
    const result = await updateUserDetailsAPI(user.id, updatedUser);
    if (result?.status === "success") {
      saveUserToLocal(updatedUser);
      setUser(updatedUser);
      addToast("User updated successfully!");
      setShowEditUser(false);
      setTimeout(() => performLogout(), 1200);
    } else addToast("Failed to update user", true);
  }

  async function handleCompanySave(e) {
    e.preventDefault();
    const updated = { ...company, ...editCompanyData };
    const result = await updateCompanyDetailsAPI(user.cid, updated);
    if (result?.status === "success") {
      setCompany(updated);
      addToast("Company updated successfully!");
      setShowEditCompany(false);
    } else addToast("Failed to update company", true);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword)
      return addToast("Passwords do not match", true);

    const result = await changePasswordAPI(user.id, passwordForm);
    if (result?.status === "success") {
      addToast("Password changed successfully!");
      setShowChangePassword(false);
      setTimeout(() => performLogout(), 1200);
    } else addToast("Failed to change password", true);
  }

  return (
    <main className="flex-1 bg-gray-50 p-6">
      <Header
        title="Profile"
        bgColor="bg-gradient-to-r from-neutral-800 to-cyan-700 text-white"
      />

      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded text-white shadow ${
              t.isError ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* USER PROFILE */}
      {canAccessUserProfile ? (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-1">
              User Profile
            </h3>
    

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4">
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Mobile:</strong> {user.mobile}
            </p>
            <p>
              <strong>Country:</strong> {user.country}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span className={statusClass(user.user_status)}>
                {user.user_status}
              </span>
            </p>
          </div>
              <div className="flex flex-wrap justify-center sm:justify-end gap-2 mt-2">
            <button
              onClick={() => setShowChangePassword(true)}
              className="px-2.5 py-1 border border-yellow-500 text-yellow-500 rounded text-xs sm:text-sm hover:bg-yellow-500 hover:text-white transition-all"
            >
              Change Password
            </button>

            <button
              onClick={() => {
                setEditUserData(user);
                setShowEditUser(true);
              }}
              className="px-3 py-1 border border-cyan-800 text-cyan-800 rounded text-xs sm:text-sm hover:bg-cyan-800 hover:text-white transition-all"
            >
              Edit User Profile
            </button>
          </div>
        </div>
      ) : (
        <div className="text-red-600 font-semibold">
          Access denied to User Profile
        </div>
      )}

      {/* COMPANY PROFILE */}
      {canAccessCompanyProfile && company ? (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-700">
              Company Profile
            </h3>
            <button
              onClick={() => {
                setEditCompanyData(company);
                setShowEditCompany(true);
              }}
              className="px-3 py-1 border border-cyan-800 text-cyan-800 rounded text-sm hover:bg-cyan-800 hover:text-white"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p>
              <strong>Company Name:</strong> {company.name}
            </p>
            <p>
              <strong>Address:</strong> {company.address}
            </p>
            <p>
              <strong>Phone:</strong> {company.phone}
            </p>
            <p>
              <strong>GST:</strong> {company.gst_no}
            </p>
            <p>
              <strong>PAN:</strong> {company.pan}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span className={statusClass(company.company_status)}>
                {company.company_status}
              </span>
            </p>
          </div>
        </div>
      ) : (
        canAccessCompanyProfile && (
          <div className="text-gray-500">No company details found.</div>
        )
      )}

      {/* Edit User Modal */}
      {showEditUser && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <form
            onSubmit={handleUserSave}
            className="bg-white p-6 rounded-lg w-80 sm:w-96 space-y-3"
          >
            <h3 className="text-lg font-semibold mb-2">Edit User</h3>
            {["name", "email", "mobile", "country"].map((f) => (
              <input
                key={f}
                className="w-full border p-2 rounded"
                placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                value={editUserData[f] || ""}
                onChange={(e) =>
                  setEditUserData({ ...editUserData, [f]: e.target.value })
                }
              />
            ))}
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowEditUser(false)}
                className="px-3 py-1 bg-gray-300 rounded text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 border border-cyan-800 text-cyan-800 rounded text-sm hover:bg-cyan-800 hover:text-white transition-all"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Company Modal */}
      {showEditCompany && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <form
            onSubmit={handleCompanySave}
            className="bg-white p-6 rounded-lg w-80 sm:w-96 space-y-3"
          >
            <h3 className="text-lg font-semibold mb-2">Edit Company</h3>
            {["name", "phone", "gst", "pan", "address"].map((f) =>
              f === "address" ? (
                <textarea
                  key={f}
                  className="w-full border p-2 rounded"
                  placeholder="Address"
                  value={editCompanyData.address || ""}
                  onChange={(e) =>
                    setEditCompanyData({
                      ...editCompanyData,
                      address: e.target.value,
                    })
                  }
                />
              ) : (
                <input
                  key={f}
                  className="w-full border p-2 rounded"
                  placeholder={f.toUpperCase()}
                  value={editCompanyData[f] || ""}
                  onChange={(e) =>
                    setEditCompanyData({
                      ...editCompanyData,
                      [f]: e.target.value,
                    })
                  }
                />
              )
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowEditCompany(false)}
                className="px-3 py-1 bg-gray-300 rounded text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 border border-cyan-800 text-cyan-800 rounded text-sm hover:bg-cyan-800 hover:text-white transition-all"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <form
            onSubmit={handleChangePassword}
            className="bg-white p-6 rounded-lg w-80 sm:w-96 space-y-3"
          >
            <h3 className="text-lg font-semibold mb-2">Change Password</h3>
            {[
              { key: "oldPassword", label: "Old Password", show: showOldPwd, set: setShowOldPwd },
              { key: "newPassword", label: "New Password", show: showNewPwd, set: setShowNewPwd },
              {
                key: "confirmNewPassword",
                label: "Confirm New Password",
                show: showConfirmPwd,
                set: setShowConfirmPwd,
              },
            ].map(({ key, label, show}) => (
              <input
                key={key}
                type={show ? "text" : "password"}
                className="w-full border p-2 rounded"
                placeholder={label}
                value={passwordForm[key] || ""}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, [key]: e.target.value })
                }
              />
            ))}
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowChangePassword(false)}
                className="px-3 py-1 bg-gray-300 rounded text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 border border-cyan-800 text-cyan-800 rounded text-sm hover:bg-cyan-800 hover:text-white transition-all"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded shadow">Loading...</div>
        </div>
      )}
    </main>
  );
}
