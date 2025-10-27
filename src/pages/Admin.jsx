import { useEffect, useState, useCallback } from "react";

const API_BASE_URL = "http://127.0.0.1:8000/api";

export default function Admin() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const perPage = 10;

  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("authToken");

  const allowedRids = [1, 2, 3];

  useEffect(() => {
    if (!storedUser || !allowedRids.includes(storedUser.rid) || !token) {
      alert("Unauthorized access. Redirecting to login.");
      window.location.href = "/login";
      return;
    }
    fetchPendingUsers(1);
  }, [storedUser, token]);


  const fetchPendingUsers = useCallback(
    async (page = 1) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/pending-registrations?page=${page}&per_page=${perPage}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to fetch pending users: ${text}`);
        }

        const data = await response.json();

        const filtered = data
          .filter((u) => u.approved === false)
          .sort((a, b) => a.name.localeCompare(b.name));

        setPendingUsers(filtered);
        setCurrentPage(page);
      } catch (err) {
        console.error(err);
        setPendingUsers([]);
      }
    },
    [token]
  );

  const approveUser = async (userId) => {
    if (!selectedUser || selectedUser.id !== userId) {
      alert("Please view user details first");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Approval failed: ${text}`);
      }

      alert("User approved successfully");
      setSelectedUser(null);
      fetchPendingUsers(currentPage);
    } catch (err) {
      console.error(err);
      alert("Failed to approve user");
    }
  };

  const rejectUser = async (userId) => {
    if (!window.confirm("Are you sure you want to reject this user?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/pending-user/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Reject failed: ${text}`);
      }

      alert("User rejected successfully");
      setSelectedUser(null);
      fetchPendingUsers(currentPage);
    } catch (err) {
      console.error(err);
      alert("Failed to reject user");
    }
  };

  const filteredUsers = pendingUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / perPage);
  const displayedUsers = filteredUsers.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">
            Pending User Approvals
          </h2>

          {/* Search */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:space-x-4">
            <input
              type="text"
              placeholder="Search pending users..."
              className="border p-2 rounded w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Responsive Table / Cards */}
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="hidden sm:table min-w-full border-collapse table-auto bg-white rounded shadow">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border-b text-left">S.No</th>
                  <th className="py-2 px-4 border-b text-left">Username</th>
                  <th className="py-2 px-4 border-b text-left">Email</th>
                  <th className="py-2 px-4 border-b text-left">Mobile</th>
                  <th className="py-2 px-4 border-b text-left">Country</th>
                  <th className="py-2 px-4 border-b text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      No pending users found
                    </td>
                  </tr>
                ) : (
                  displayedUsers.map((u, idx) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{idx + 1 + (currentPage - 1) * perPage}</td>
                      <td className="py-2 px-4">{u.name}</td>
                      <td className="py-2 px-4">{u.email}</td>
                      <td className="py-2 px-4">{u.mobile}</td>
                      <td className="py-2 px-4">{u.country}</td>
                      <td className="py-2 px-4 flex space-x-2">
                        <button
                          className="bg-blue-500 text-white px-3 py-1 rounded"
                          onClick={() => setSelectedUser(u)}
                        >
                          View
                        </button>
                        <button
                          className="bg-green-500 text-white px-3 py-1 rounded"
                          onClick={() => approveUser(u.id)}
                          disabled={selectedUser?.id !== u.id}
                        >
                          Approve
                        </button>
                        <button
                          className="bg-red-500 text-white px-3 py-1 rounded"
                          onClick={() => rejectUser(u.id)}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-4">
              {displayedUsers.length === 0 ? (
                <p className="text-center py-4">No pending users found</p>
              ) : (
                displayedUsers.map((u, idx) => (
                  <div key={u.id} className="bg-white rounded-lg shadow p-4">
                    <p className="font-semibold">
                      {idx + 1 + (currentPage - 1) * perPage}. {u.name}
                    </p>
                    <p>Email: {u.email}</p>
                    <p>Mobile: {u.mobile}</p>
                    <p>Country: {u.country}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        className="bg-blue-500 text-white px-3 py-1 rounded"
                        onClick={() => setSelectedUser(u)}
                      >
                        View
                      </button>
                      <button
                        className="bg-green-500 text-white px-3 py-1 rounded"
                        onClick={() => approveUser(u.id)}
                        disabled={selectedUser?.id !== u.id}
                      >
                        Approve
                      </button>
                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded"
                        onClick={() => rejectUser(u.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap justify-center items-center mt-4 space-x-1 sm:space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => fetchPendingUsers(currentPage - 1)}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`px-3 py-1 rounded ${
                    i + 1 === currentPage
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200"
                  }`}
                  onClick={() => fetchPendingUsers(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => fetchPendingUsers(currentPage + 1)}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
