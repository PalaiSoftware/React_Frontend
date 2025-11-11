// src/pages/Vendor.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import Header from "../components/Header";
import { API_BASE_URL } from "../config";

//const API_BASE_URL = "http://127.0.0.1:8000/api";
const ITEMS_PER_PAGE = 50;

function Toast({ message, isError = false }) {
  return (
    <div
      className={`px-4 py-2 rounded shadow-md text-white ${
        isError ? "bg-red-600" : "bg-green-600"
      }`}
    >
      {message}
    </div>
  );
}

export default function Vendor() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [errorPopup, setErrorPopup] = useState(null);

  const [formValues, setFormValues] = useState({
    vendorName: "",
    vendorEmail: "",
    vendorPhone: "",
    gstNumber: "",
    panNumber: "",
    vendorAddress: "",
  });

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const authToken = localStorage.getItem("authToken") || null;
  const cid = user?.cid || user?.rid || null;

  useEffect(() => {
    fetchVendors();
  }, []);

  function showToast(msg, isError = false) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message: msg, isError }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }

  function showErrorPopup(msg) {
    setErrorPopup(msg);
  }

  function hideErrorPopup() {
    setErrorPopup(null);
  }

  async function fetchVendors() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vendors?cid=${cid}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      const list = (data.purchase_clients || []).map((v) => ({
        id: v.id,
        name: v.name || "N/A",
        email: v.email || "N/A",
        phone: v.phone || "N/A",
        gst_no: v.gst_no || "N/A",
        pan: v.pan || "N/A",
        address: v.address || "N/A",
        created_by: v.created_by || "N/A",
      }));
      setVendors(list);
    } catch {
      showErrorPopup("Failed to fetch vendors.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = vendors.filter((v) => {
    const s = searchTerm.toLowerCase();
    return (
      v.name.toLowerCase().includes(s) ||
      v.email.toLowerCase().includes(s) ||
      v.gst_no.toLowerCase().includes(s)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  function resetForm() {
    setFormValues({
      vendorName: "",
      vendorEmail: "",
      vendorPhone: "",
      gstNumber: "",
      panNumber: "",
      vendorAddress: "",
    });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]:
        name === "vendorPhone" ? value.replace(/[^0-9]/g, "") : value,
    }));
  }

  function startAdd() {
    resetForm();
    setEditingId(null);
    setFormVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function startEdit(id) {
    setEditingId(id);
    setFormVisible(false);
    try {
      const res = await fetch(`${API_BASE_URL}/vendor/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const result = await res.json();
      const v = result.data || {};
      setFormValues({
        vendorName: v.name || "",
        vendorEmail: v.email || "",
        vendorPhone: v.phone || "",
        gstNumber: v.gst_no || "",
        panNumber: v.pan || "",
        vendorAddress: v.address || "",
      });
    } catch {
      showErrorPopup("Unable to fetch vendor details.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const isEdit = !!editingId;

    const body = {
      name: formValues.vendorName,
      email: formValues.vendorEmail,
      phone: formValues.vendorPhone,
      gst_no: formValues.gstNumber,
      pan: formValues.panNumber,
      address: formValues.vendorAddress,
      cid,
      uid: user.id,
    };

    const url = isEdit
      ? `${API_BASE_URL}/vendors/${editingId}`
      : `${API_BASE_URL}/vendors`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();

      showToast(isEdit ? "Vendor updated!" : "Vendor added!");
      resetForm();
      setFormVisible(false);
      setEditingId(null);
      fetchVendors();
    } catch {
      showErrorPopup("Error saving vendor.");
    }
  }

  return (
    <main className="p-6 md:p-6 max-w-7xl mx-auto">
      <Header title="Vendors" bgColor="bg-gradient-to-r from-neutral-800 to-cyan-700 text-white" />

      {/* Add Form */}
      {formVisible && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700">
              Add Vendor
            </h3>
            <button
              onClick={() => {
                setFormVisible(false);
                resetForm();
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <input
              type="text"
              name="vendorName"
              placeholder="Vendor Name *"
              required
              value={formValues.vendorName}
              onChange={handleChange}
              className="border p-2 rounded text-sm"
            />
            <input
              type="email"
              name="vendorEmail"
              placeholder="Email"
              value={formValues.vendorEmail}
              onChange={handleChange}
              className="border p-2 rounded text-sm"
            />
            <input
              type="tel"
              name="vendorPhone"
              placeholder="Phone *"
              required
              value={formValues.vendorPhone}
              onChange={handleChange}
              className="border p-2 rounded text-sm"
            />
            <input
              type="text"
              name="gstNumber"
              placeholder="GST Number"
              value={formValues.gstNumber}
              onChange={handleChange}
              className="border p-2 rounded text-sm"
            />
            <input
              type="text"
              name="panNumber"
              placeholder="PAN"
              value={formValues.panNumber}
              onChange={handleChange}
              className="border p-2 rounded text-sm"
            />
            <textarea
              name="vendorAddress"
              placeholder="Address"
              value={formValues.vendorAddress}
              onChange={handleChange}
              className="border p-2 rounded text-sm sm:col-span-2"
              rows={3}
            />
            <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setFormVisible(false);
                  resetForm();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded"
              >
                Save Vendor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        {/* Search + Add */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="relative w-full sm:w-auto">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search vendor..."
              className="w-full sm:w-64 pl-10 pr-3 py-2 border rounded text-sm"
            />
          </div>
          <button
            onClick={startAdd}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-cyan-800 text-white rounded hover:bg-cyan-700 w-full sm:w-auto"
          >
            <FaPlus /> Add Vendor
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border text-xs sm:text-sm text-left">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 border">S.No</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border hidden md:table-cell">Email</th>
                <th className="p-2 border">Phone</th>
                <th className="p-2 border hidden md:table-cell">GST</th>
                <th className="p-2 border hidden md:table-cell">PAN</th>
                <th className="p-2 border hidden lg:table-cell">Created By</th>
                <th className="p-2 border text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No vendors found
                  </td>
                </tr>
              ) : (
                paginated.map((v, i) => (
                  <React.Fragment key={v.id}>
                    <tr
                      className={`hover:bg-gray-50 ${
                        editingId === v.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="p-2 border">
                        {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                      </td>
                      <td className="p-2 border">{v.name}</td>
                      <td className="p-2 border hidden md:table-cell">
                        {v.email}
                      </td>
                      <td className="p-2 border">{v.phone}</td>
                      <td className="p-2 border hidden md:table-cell">
                        {v.gst_no}
                      </td>
                      <td className="p-2 border hidden md:table-cell">
                        {v.pan}
                      </td>
                      <td className="p-2 border hidden lg:table-cell">
                        {v.created_by}
                      </td>
                      <td className="p-2 border text-center">
                        <button
                          onClick={() => startEdit(v.id)}
                          className="px-2 py-1 bg-cyan-800 text-white rounded hover:bg-cyan-600 flex items-center justify-center mx-auto gap-1 text-xs sm:text-sm"
                        >
                          <FaEdit /> Edit
                        </button>
                      </td>
                    </tr>

                    {editingId === v.id && (
                      <tr>
                        <td colSpan="8" className="bg-gray-50 p-4 border">
                          <form
                            onSubmit={handleSubmit}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                          >
                            <input
                              name="vendorName"
                              required
                              placeholder="Vendor Name"
                              value={formValues.vendorName}
                              onChange={handleChange}
                              className="border p-2 rounded text-sm"
                            />
                            <input
                              name="vendorEmail"
                              placeholder="Email"
                              value={formValues.vendorEmail}
                              onChange={handleChange}
                              className="border p-2 rounded text-sm"
                            />
                            <input
                              name="vendorPhone"
                              placeholder="Phone"
                              value={formValues.vendorPhone}
                              onChange={handleChange}
                              className="border p-2 rounded text-sm"
                            />
                            <input
                              name="gstNumber"
                              placeholder="GST Number"
                              value={formValues.gstNumber}
                              onChange={handleChange}
                              className="border p-2 rounded text-sm"
                            />
                            <input
                              name="panNumber"
                              placeholder="PAN"
                              value={formValues.panNumber}
                              onChange={handleChange}
                              className="border p-2 rounded text-sm"
                            />
                            <textarea
                              name="vendorAddress"
                              placeholder="Address"
                              value={formValues.vendorAddress}
                              onChange={handleChange}
                              className="border p-2 rounded text-sm sm:col-span-2"
                              rows={2}
                            />
                            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:col-span-2 mt-2">
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Update Vendor
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                <FaChevronLeft />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                <FaChevronRight />
              </button>
            </div>
            <span className="text-sm text-gray-500">
              {filtered.length} total vendors
            </span>
          </div>
        )}
      </div>

      {/* Toasts */}
      <div className="fixed top-6 right-6 z-50 space-y-2">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} isError={t.isError} />
        ))}
      </div>

      {/* Error Popup */}
      {errorPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 px-4">
          <div className="bg-white rounded-lg p-5 shadow-lg w-full max-w-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base sm:text-lg font-semibold text-red-600">
                Error
              </h3>
              <button onClick={hideErrorPopup}>
                <FaTimes />
              </button>
            </div>
            <p className="text-gray-700 text-sm sm:text-base">{errorPopup}</p>
          </div>
        </div>
      )}
    </main>
  );
}
