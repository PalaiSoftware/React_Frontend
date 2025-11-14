// src/pages/Admin.jsx
import { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import React from "react";
import { API_BASE_URL } from "../config";

//const API_BASE_URL = "http://127.0.0.1:8000/api";
const PER_PAGE = 10;
const allowedRids = [1, 2, 3];

export default function Admin() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null); // shows details
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]); // {id, message, type}
  const [totalItems, setTotalItems] = useState(0);

  // read from localStorage (user & token)
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();
  const token = localStorage.getItem("authToken");

  // Authorization check on mount
  useEffect(() => {
    if (!storedUser || !allowedRids.includes(storedUser.rid) || !token) {
      alert("Unauthorized access. Redirecting to login.");
      window.location.href = "/login";
      return;
    }
    // set company name if Navbar expects it in localStorage (mirror original)
    if (storedUser?.companyName) {
      localStorage.setItem("companyName", storedUser.companyName);
    }
    fetchPendingUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message, type = "success", ms = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ms);
  };

  const fetchPendingUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/pending-registrations?page=${page}&per_page=${PER_PAGE}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch pending users: ${text}`);
        }

        const data = await res.json();

        const filtered = (Array.isArray(data) ? data : [])
          .filter((u) => u.approved === false)
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        setPendingUsers(filtered);
        setTotalItems(filtered.length);
        setCurrentPage(page);
      } catch (err) {
        console.error("fetchPendingUsers error:", err);
        setPendingUsers([]);
        setTotalItems(0);
        showToast("No pending users found or fetch failed", "info");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // View user details (fetch single)
  const handleViewUser = async (userId) => {
    if (!token) {
      showToast("Please login to view user details", "error");
      setTimeout(() => (window.location.href = "/login"), 1000);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/pending-user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load user");
      }
      const data = await res.json();
      const user = data.user || data;
      setSelectedUser(user);
    } catch (err) {
      console.error("handleViewUser error:", err);
      showToast("Unable to load user details", "error");
    }
  };

  // Approve user
  const handleApproveUser = async (userId) => {
    if (!selectedUser || selectedUser.id !== userId) {
      showToast("Please view user details before approving", "error");
      return;
    }
    try {
      const payload = {
        id: selectedUser.id,
        rid: selectedUser.rid || 3,
        name: selectedUser.name,
        email: selectedUser.email,
        mobile: selectedUser.mobile,
        country: selectedUser.country,
        client_name: selectedUser.client_name,
        client_address: selectedUser.client_address,
        client_phone: selectedUser.client_phone,
        gst_no: selectedUser.gst_no,
        pan: selectedUser.pan,
        captcha: "BW9G2",
      };

      const res = await fetch(`${API_BASE_URL}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          cid: storedUser?.cid || "3",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Approval failed");
      }

      showToast("User approved successfully", "success");
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelectedUser(null);
      setTotalItems((t) => Math.max(0, t - 1));
      const remainingOnPage = Math.ceil((totalItems - 1) / PER_PAGE);
      if (currentPage > Math.max(1, remainingOnPage)) {
        fetchPendingUsers(Math.max(1, currentPage - 1));
      } else {
        fetchPendingUsers(currentPage);
      }
    } catch (err) {
      console.error("handleApproveUser error:", err);
      const msg =
        (err.message && err.message.includes("email"))
          ? "This email is already registered"
          : (err.message && err.message.toLowerCase().includes("captcha"))
          ? "Invalid captcha"
          : "Unable to approve user";
      showToast(msg, "error");
      fetchPendingUsers(currentPage);
      setSelectedUser(null);
    }
  };

  // Delete / reject pending user
  const handleRejectUser = async (userId) => {
    if (!window.confirm("Are you sure you want to reject this user?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/pending-user/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Reject failed");
      }
      showToast("User rejected successfully", "success");
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelectedUser(null);
      setTotalItems((t) => Math.max(0, t - 1));
      fetchPendingUsers(currentPage);
    } catch (err) {
      console.error("handleRejectUser error:", err);
      showToast("Failed to reject user", "error");
      fetchPendingUsers(currentPage);
    }
  };

  // Filtering + pagination derived
  const filteredUsers = pendingUsers.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
  const displayedUsers = filteredUsers.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  // pagination click
  const goToPage = (p) => {
    setCurrentPage(p);
  };

  return (
    <>
          <Navbar />

    <div className="p-2">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <h2 className="text-2xl font-semibold text-slate-800">
              Pending User Approvals
            </h2>

            <div className="w-full sm:w-auto">
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                type="text"
                placeholder="Search pending users..."
                className="w-full sm:w-64 px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {/* Desktop table */}
            <table className="hidden sm:table w-full min-w-full border-collapse table-auto">
              <thead className="bg-slate-100">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-medium text-slate-700 align-top">S.No</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-slate-700 align-top">Username</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-slate-700 align-top">Email</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-slate-700 align-top">Mobile</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-slate-700 align-top">Country</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-slate-700 align-top">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center">Loading...</td>
                  </tr>
                ) : displayedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center">No pending users found</td>
                  </tr>
                ) : (
                  displayedUsers.map((u, idx) => {
                    const serial = idx + 1 + (currentPage - 1) * PER_PAGE;

                    return (
                      <React.Fragment key={u.id}>
                        {/* Main Row */}
                        <tr className="hover:bg-slate-50">
                          <td className="py-3 px-4 align-top">{serial}</td>
                          <td className="py-3 px-4 align-top">{u.name || "N/A"}</td>
                          <td className="py-3 px-4 align-top">{u.email || "N/A"}</td>
                          <td className="py-3 px-4 align-top">{u.mobile || "N/A"}</td>
                          <td className="py-3 px-4 align-top">{u.country || "N/A"}</td>
                          <td className="py-3 px-4 align-top space-x-2">
                            <button
                              onClick={() => handleViewUser(u.id)}
                              className="inline-block px-3 py-1 rounded-full text-white font-semibold shadow-sm bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600"
                            >
                              View
                            </button>

                            <button
                              onClick={() => handleApproveUser(u.id)}
                              disabled={selectedUser?.id !== u.id}
                              className={`inline-block px-3 py-1 rounded-full text-white font-semibold shadow-sm ${
                                selectedUser?.id !== u.id
                                  ? "bg-green-300 cursor-not-allowed"
                                  : "bg-gradient-to-r from-green-500 to-green-400 hover:from-green-600"
                              }`}
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => handleRejectUser(u.id)}
                              className="inline-block px-3 py-1 rounded-full text-white font-semibold shadow-sm bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {selectedUser && selectedUser.id === u.id && (
                          <tr className="bg-slate-50">
                            <td colSpan="6" className="p-4">
                              <div className="space-y-3">
                                <h3 className="text-lg font-semibold text-slate-800">User Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1 text-sm">
                                    <div><strong>Name:</strong> {selectedUser.name || "N/A"}</div>
                                    <div><strong>Email:</strong> {selectedUser.email || "N/A"}</div>
                                    <div><strong>Mobile:</strong> {selectedUser.mobile || "N/A"}</div>
                                    <div><strong>Country:</strong> {selectedUser.country || "N/A"}</div>
                                  </div>

                                  <div className="space-y-1 text-sm">
                                    <div>
                                      <strong>Role:</strong>
                                      <select
                                        className="ml-2 px-2 py-1 border rounded"
                                        defaultValue={selectedUser.rid || 3}
                                        onChange={(e) => {
                                          setSelectedUser((s) => ({ ...s, rid: Number(e.target.value) }));
                                        }}
                                      >
                                        <option value={3}>Moderator</option>
                                        <option value={4}>Authenticated</option>
                                      </select>
                                    </div>
                                    <div><strong>Client Name:</strong> {selectedUser.client_name || "N/A"}</div>
                                    <div><strong>Client Address:</strong> {selectedUser.client_address || "N/A"}</div>
                                    <div><strong>Client Phone:</strong> {selectedUser.client_phone || "N/A"}</div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-2">
                                  <button
                                    onClick={() => handleApproveUser(selectedUser.id)}
                                    className="px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-green-400 text-white font-semibold"
                                  >
                                    Approve
                                  </button>

                                  <button
                                    onClick={() => handleRejectUser(selectedUser.id)}
                                    className="px-4 py-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold"
                                  >
                                    Reject
                                  </button>

                                  <button
                                    onClick={() => setSelectedUser(null)}
                                    className="px-4 py-2 rounded-full bg-slate-200 text-slate-700 font-medium"
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-4">
              {loading ? (
                <div className="text-center py-6">Loading...</div>
              ) : displayedUsers.length === 0 ? (
                <div className="text-center py-6">No pending users found</div>
              ) : (
                displayedUsers.map((u, idx) => {
                  const serial = idx + 1 + (currentPage - 1) * PER_PAGE;
                  return (
                    <div key={u.id} className="bg-white rounded-lg shadow p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{serial}. {u.name}</p>
                          <p className="text-sm">Email: {u.email}</p>
                          <p className="text-sm">Mobile: {u.mobile}</p>
                          <p className="text-sm">Country: {u.country}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleViewUser(u.id)}
                          className="px-3 py-1 rounded-full text-white bg-blue-500"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleApproveUser(u.id)}
                          disabled={selectedUser?.id !== u.id}
                          className={`px-3 py-1 rounded-full text-white ${
                            selectedUser?.id !== u.id ? "bg-green-300 cursor-not-allowed" : "bg-green-500"
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectUser(u.id)}
                          className="px-3 py-1 rounded-full text-white bg-red-600"
                        >
                          Reject
                        </button>
                      </div>

                      {/* details on mobile */}
                      {selectedUser && selectedUser.id === u.id && (
                        <div className="mt-3 bg-slate-50 p-3 rounded">
                          <h4 className="font-semibold">User Details</h4>
                          <p className="text-sm">Client: {selectedUser.client_name || "N/A"}</p>
                          <p className="text-sm">GST: {selectedUser.gst_no || "N/A"}</p>
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleApproveUser(u.id)} className="px-3 py-1 rounded-full bg-green-500 text-white">Approve</button>
                            <button onClick={() => handleRejectUser(u.id)} className="px-3 py-1 rounded-full bg-red-600 text-white">Reject</button>
                            <button onClick={() => setSelectedUser(null)} className="px-3 py-1 rounded-full bg-slate-200 text-slate-700">Close</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-wrap justify-center items-center gap-2">
            <button
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-full bg-slate-200 disabled:opacity-50"
            >
              Less than
            </button>

            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => goToPage(i + 1)}
                className={`px-3 py-1 rounded-full ${i + 1 === currentPage ? "bg-blue-500 text-white" : "bg-slate-200"}`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-full bg-slate-200 disabled:opacity-50"
            >
              Greater than
            </button>
          </div>
        </div>
      </main>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg text-white shadow-lg max-w-xs break-words ${
              t.type === "success" ? "bg-emerald-500" : t.type === "error" ? "bg-rose-600" : "bg-blue-500"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
      
    </div>
        </>

    
  );
}