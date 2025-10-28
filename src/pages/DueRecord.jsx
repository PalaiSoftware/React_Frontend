// src/pages/DueRecord.jsx
import React, { useEffect, useState, useMemo } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Header from "../components/Header";

const API_BASE_URL = "http://127.0.0.1:8000/api";
const ITEMS_PER_PAGE = 50;

export default function DueRecord() {
  const [dues, setDues] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState(null);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const TOKEN = localStorage.getItem("authToken");
  const cid = user.cid;

  const getCurrencySymbol = () => {
    const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany")) || {};
    return selectedCompany.currency || "₹";
  };

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchWithRetry = async (url, options, retries = 3, backoff = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After") || backoff * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          continue;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, backoff * Math.pow(2, i)));
      }
    }
  };

  const fetchDues = async () => {
    try {
      const url = `${API_BASE_URL}/dues/${cid}`;
      const response = await fetchWithRetry(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      const duesData = Array.isArray(result) ? result : result.data;
      setDues(
        duesData.map((due) => ({
          customer_id: due.customer_id,
          customer_name: due.customer_name || "Unknown",
          total_purchase: parseFloat(due.total_purchase || 0),
          total_paid: parseFloat(due.total_paid || 0),
          total_due: parseFloat(due.total_due || 0),
        }))
      );
    } catch (error) {
      showToast(`Failed to load dues: ${error.message}`, true);
    }
  };

  const fetchCustomerTransactions = async (customerId) => {
    try {
      const url = `${API_BASE_URL}/customer/dues/${customerId}`;
      const response = await fetchWithRetry(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      return result.transactions || [];
    } catch (error) {
      showToast(`Failed to load transaction details: ${error.message}`, true);
      return [];
    }
  };

  useEffect(() => {
    fetchDues();
  }, []);

  const filteredDues = useMemo(
    () =>
      dues.filter((d) =>
        d.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm, dues]
  );

  const totalPages = Math.ceil(filteredDues.length / ITEMS_PER_PAGE);
  const paginatedDues = filteredDues.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-6 text-slate-800">
      <Header title="Due Records" bgColor="bg-gradient-to-r from-neutral-800 to-cyan-700 text-white" />
      <main className="bg-white rounded-md shadow-lg">
        <div className="p-4 max-w-7xl mx-auto">
          {toast && (
            <div
              className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white z-50 transition ${
                toast.isError ? "bg-red-600" : "bg-slate-800"
              }`}
            >
              {toast.message}
            </div>
          )}

          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-700 text-center sm:text-left">
              Customer Dues
            </h1>
            <input
              type="text"
              placeholder="Search Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 w-full sm:w-64 shadow-sm focus:ring-2 focus:ring-cyan-700 outline-none bg-white"
            />
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block bg-white shadow-md rounded-lg overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2">S.No</th>
                    <th className="px-4 py-2">Customer Name</th>
                    <th className="px-4 py-2">Total Purchase</th>
                    <th className="px-4 py-2">Total Paid</th>
                    <th className="px-4 py-2">Total Due</th>
                    <th className="px-4 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDues.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-slate-500">
                        No dues found
                      </td>
                    </tr>
                  ) : (
                    paginatedDues.map((due, i) => (
                      <DueRow
                        key={due.customer_id}
                        due={due}
                        index={(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                        getCurrencySymbol={getCurrencySymbol}
                        fetchCustomerTransactions={fetchCustomerTransactions}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {paginatedDues.map((due, i) => (
              <DueCard
                key={due.customer_id}
                index={(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                due={due}
                getCurrencySymbol={getCurrencySymbol}
                fetchCustomerTransactions={fetchCustomerTransactions}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center flex-wrap gap-2 mt-5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-200 rounded-md disabled:opacity-50 hover:bg-slate-300"
            >
              &lt;
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded-md ${
                  currentPage === i + 1
                    ? "bg-cyan-800 text-white"
                    : "bg-slate-200 hover:bg-slate-300"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-slate-200 rounded-md disabled:opacity-50 hover:bg-slate-300"
            >
              &gt;
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

/* TABLE ROW (Desktop) */
function DueRow({ due, index, getCurrencySymbol, fetchCustomerTransactions }) {
  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!expanded) {
      setLoading(true);
      const data = await fetchCustomerTransactions(due.customer_id);
      setTransactions(data);
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  return (
    <>
      <tr className="border-b hover:bg-slate-50 transition">
        <td className="px-4 py-2">{index}</td>
        <td className="px-4 py-2 font-medium text-slate-700">{due.customer_name}</td>
        <td className="px-4 py-2">
          {getCurrencySymbol()}
          {due.total_purchase.toFixed(2)}
        </td>
        <td className="px-4 py-2">
          {getCurrencySymbol()}
          {due.total_paid.toFixed(2)}
        </td>
        <td className="px-4 py-2 text-cyan-800 font-semibold">
          {getCurrencySymbol()}
          {due.total_due.toFixed(2)}
        </td>
        <td className="px-4 py-2 text-center">
          <button
            onClick={toggleExpand}
            className="inline-flex items-center gap-2 px-3 py-1 border border-cyan-800 text-cyan-800 rounded-md hover:bg-cyan-800 hover:text-white transition"
          >
            {expanded ? (
              <>
                <FaEyeSlash /> Hide
              </>
            ) : (
              <>
                <FaEye /> View
              </>
            )}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-slate-50 border-t border-slate-200">
          <td colSpan="6" className="px-6 py-3">
            {loading ? (
              <p className="text-slate-500 italic">Loading transaction details...</p>
            ) : transactions.length === 0 ? (
              <p className="text-slate-500 italic">No transactions found.</p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[400px]">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Purchase</th>
                      <th className="px-3 py-2">Paid</th>
                      <th className="px-3 py-2">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">{t.date || "-"}</td>
                        <td className="px-3 py-2">
                          {getCurrencySymbol()}
                          {Number(t.purchase || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          {getCurrencySymbol()}
                          {Number(t.paid || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-cyan-800 font-semibold">
                          {getCurrencySymbol()}
                          {Number(t.due || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/* MOBILE CARD VIEW */
function DueCard({ due, index, getCurrencySymbol, fetchCustomerTransactions }) {
  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    if (!expanded) {
      setLoading(true);
      const data = await fetchCustomerTransactions(due.customer_id);
      setTransactions(data);
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-600">#{index}</span>
        <button
          onClick={toggleExpand}
          className="px-3 py-1 border border-cyan-800 text-cyan-800 rounded-md hover:bg-cyan-800 hover:text-white transition text-sm flex items-center gap-1"
        >
          {expanded ? <FaEyeSlash /> : <FaEye />}
          {expanded ? "Hide" : "View"}
        </button>
      </div>
      <h2 className="text-base font-semibold text-slate-700">{due.customer_name}</h2>
      <div className="mt-2 text-sm text-slate-600 space-y-1">
        <p>
          <strong>Total Purchase:</strong> {getCurrencySymbol()}
          {due.total_purchase.toFixed(2)}
        </p>
        <p>
          <strong>Total Paid:</strong> {getCurrencySymbol()}
          {due.total_paid.toFixed(2)}
        </p>
        <p className="text-cyan-800 font-semibold">
          <strong>Total Due:</strong> {getCurrencySymbol()}
          {due.total_due.toFixed(2)}
        </p>
      </div>

      {expanded && (
        <div className="mt-3 border-t pt-2 text-sm text-slate-700">
          {loading ? (
            <p className="text-slate-500 italic">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-slate-500 italic">No transactions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-2 py-1">Date</th>
                    <th className="px-2 py-1">Purchase</th>
                    <th className="px-2 py-1">Paid</th>
                    <th className="px-2 py-1">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-1">{t.date || "-"}</td>
                      <td className="px-2 py-1">
                        {getCurrencySymbol()}
                        {Number(t.purchase || 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-1">
                        {getCurrencySymbol()}
                        {Number(t.paid || 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-1 text-cyan-800 font-semibold">
                        {getCurrencySymbol()}
                        {Number(t.due || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
