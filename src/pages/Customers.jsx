import React, { useState, useEffect } from "react";
import { showToast } from "../utils";
import { FaEdit, FaSave, FaTimes, FaSearch, FaPlus } from "react-icons/fa";
import { MdAddCircle } from "react-icons/md";
import { GrUpdate } from "react-icons/gr";
import Header from "../components/Header";



const API_BASE_URL = "http://127.0.0.1:8000/api";

export default function Customer() {
  const [customers, setCustomers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    gst_no: "",
    pan: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const token = localStorage.getItem("authToken");
  const CID = user.cid || 1;

  // Fetch customers by CID
  const fetchCustomers = async () => {
    try {
      if (!token) throw new Error("No auth token found");
      const res = await fetch(`${API_BASE_URL}/customers?cid=${CID}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(data.sales_clients || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch customers", "error");
    }
  };

  useEffect(() => {
    fetchCustomers();
    
  }, []);

  // --- Edit Logic ---
  const handleEditClick = (customer) => {
    setEditingId(customer.id || customer.uid);
    setEditForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      gst_no: customer.gst_no || "",
      pan: customer.pan || "",
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setShowAddForm(false);
    setAddForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      gst_no: "",
      pan: "",
    });
  };

  const handleChange = (e, type = "edit") => {
    if (type === "edit") setEditForm({ ...editForm, [e.target.name]: e.target.value });
    else setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  const handleSave = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/customer/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...editForm, cid: CID, uid: user.id }),
      });
      if (!res.ok) throw new Error("Failed to update customer");
      await fetchCustomers();
      showToast("Customer updated successfully", "success");
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      console.error(err);
      showToast("Error updating customer", "error");
    }
  };

  // --- Add Customer Logic ---
  const handleAddCustomer = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, { // NOTE: plural endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...addForm, cid: CID, uid: user.id }),
      });

      if (!res.ok) throw new Error("Failed to add customer");

      await fetchCustomers();
      showToast("Customer added successfully", "success");

      setAddForm({ name: "", email: "", phone: "", address: "", gst_no: "", pan: "" });
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      showToast("Error adding customer", "error");
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.pan?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="customer-page p-6 sm:p-6">

   <Header title="Customers" bgColor="bg-gradient-to-r from-neutral-800 to-cyan-700 text-white" />


      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-semibold text-slate-800">All Customers List</h2>
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <FaSearch className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-900"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="border  bg-cyan-900 text-white px-3 py-2 rounded-md hover:bg-cyan-700 flex items-center gap-2"
            >
              <FaPlus /> Add Customer
            </button>
          </div>
        </div>

        {/* Add Customer Form */}
        {showAddForm && (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["name", "email", "phone", "address", "gst_no", "pan"].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 capitalize">{field.replace("_", " ")}</label>
                  <input
                    type={field === "email" ? "email" : "text"}
                    name={field}
                    value={addForm[field]}
                    onChange={(e) => handleChange(e, "add")}
                    className="w-full border p-2 rounded"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={handleAddCustomer}
                className="border border-cyan-800 text-cyan-800 px-3 py-1 rounded hover:bg-cyan-800 hover:text-white flex items-center gap-2"
              >
                <MdAddCircle /> Add Customer
              </button>
              <button
                onClick={handleCancel}
                className="border border-red-600 text-red-600 px-3 py-1 rounded hover:bg-red-600 hover:text-white flex items-center gap-2"
              >
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto bg-white shadow-inner rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-300 table-auto">
            <thead className="bg-gray-100">
              <tr>
                {["S. No.", "Name", "Email", "Phone", "Address", "GST No", "PAN", "Actions"].map((head) => (
                  <th key={head} className="px-2 sm:px-4 py-2 text-left text-gray-700 font-medium whitespace-nowrap">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c, index) => (
                  <tr key={c.id || c.uid || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 sm:px-4 py-2">{index + 1}</td>
                    {editingId === (c.id || c.uid) ? (
                      <>
                        {["name", "email", "phone", "address", "gst_no", "pan"].map((field) => (
                          <td key={field} className="px-2 sm:px-4 py-2">
                            <input
                              type={field === "email" ? "email" : "text"}
                              name={field}
                              value={editForm[field]}
                              onChange={handleChange}
                              className="border p-1 rounded w-full"
                            />
                          </td>
                        ))}
                        <td className="px-2 sm:px-4 py-2 flex gap-2">
                          <button onClick={() => handleSave(c.id || c.uid)} className="border border-cyan-800 text-cyan-800 px-2 py-1 rounded hover:bg-cyan-800 hover:text-white flex items-center gap-1">
                            <GrUpdate /> Update
                          </button>
                          <button onClick={handleCancel} className="border border-red-600 text-red-600 px-2 py-1 rounded hover:bg-red-600 hover:text-white flex items-center gap-1">
                            <FaTimes /> Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        {["name", "email", "phone", "address", "gst_no", "pan"].map((field) => (
                          <td key={field} className="px-2 sm:px-4 py-2">{c[field]}</td>
                        ))}
                        <td className="px-2 sm:px-4 py-2">
                          <button onClick={() => handleEditClick(c)} className="border border-cyan-900 text-cyan-900 px-3 py-1 rounded-md hover:bg-cyan-900 hover:text-white flex items-center justify-center gap-2">
                            <FaEdit /> Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-gray-500">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-4">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((c, index) => (
              <div key={c.id || c.uid || index} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-700">#{index + 1} - {c.name}</span>
                  {editingId !== (c.id || c.uid) && (
                    <button onClick={() => handleEditClick(c)} className="border border-cyan-900 text-cyan-900 px-2 py-1 rounded hover:bg-cyan-900 hover:text-white flex items-center gap-1">
                      <FaEdit /> Edit
                    </button>
                  )}
                </div>

                {editingId === (c.id || c.uid) ? (
                  <div className="space-y-2">
                    {["name", "email", "phone", "address", "gst_no", "pan"].map((field) => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-gray-600 capitalize">{field.replace("_", " ")}</label>
                        <input
                          type={field === "email" ? "email" : "text"}
                          name={field}
                          value={editForm[field]}
                          onChange={handleChange}
                          className="w-full border p-1 rounded"
                        />
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button onClick={() => handleSave(c.id || c.uid)} className="border border-green-600 text-green-600 px-2 py-1 rounded hover:bg-green-600 hover:text-white flex items-center gap-1">
                        <FaSave /> Save
                      </button>
                      <button onClick={handleCancel} className="border border-red-600 text-red-600 px-2 py-1 rounded hover:bg-red-600 hover:text-white flex items-center gap-1">
                        <FaTimes /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-gray-700">
                    {["email", "phone", "address", "gst_no", "pan"].map((field) => (
                      <div key={field}><span className="font-medium">{field.replace("_", " ")}:</span> {c[field]}</div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">No customers found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
