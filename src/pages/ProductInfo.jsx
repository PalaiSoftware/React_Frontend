'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  AlertCircle,
} from 'lucide-react';
import Header from '../components/Header';

const API_BASE_URL = 'http://127.0.0.1:8000/api'; // Change if needed

export default function ProductInfo() {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [productInfoList, setProductInfoList] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [unitData, setUnitData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 50;
  const isRestricted = user && [4, 5].includes(parseInt(user.rid) || 0);

  // Toast
  const showToast = useCallback((message, isError = false) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Load from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('authToken');
    if (storedUser && storedToken) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setAuthToken(storedToken);
    } else {
      showToast('Please log in.', true);
      setLoading(false);
    }
  }, [showToast]);

  // Fetch Units
  const fetchUnits = async () => {
    if (!user?.cid || !authToken) return;
    try {
      const res = await fetch(`${API_BASE_URL}/units/${user.cid}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch units');
      const data = await res.json();
      setUnitData(data.units || []);
      return data.units || [];
    } catch (err) {
      showToast(err.message, true);
      return [];
    }
  };

  // Fetch Stock
  const fetchStockData = async () => {
    if (!user?.cid || !authToken) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/products/stock/${user.cid}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch stock');
      const data = await res.json();
      const mapped = data.map((s) => ({
        id: String(s.id),
        purchase_stock: s.purchase_stock || '0',
        sales_stock: s.sales_stock || '0',
        current_stock: s.current_stock || '0',
      }));
      setStockData(mapped);
      return mapped;
    } catch (err) {
      showToast(err.message, true);
      return [];
    }
  };

  // Fetch Products
  const fetchProductInfo = async () => {
    if (!user?.cid || !authToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/product-info/${user.cid}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();

      const stock = await fetchStockData();
      const units = await fetchUnits();

      const list = (data || [])
        .map((p) => {
          const s = stock.find((x) => x.id === String(p.pid || p.id));
          return {
            id: String(p.pid || p.id),
            name: p.product_name || p.name || 'N/A',
            unit_name: p.unit_name || 'N/A',
            hsn_code: p.hsn_code || 'N/A',
            purchase_price: parseFloat(p.purchase_price) || 0,
            profit_percentage: parseFloat(p.profit_percentage) || 0,
            pre_gst_sale_cost: parseFloat(p.pre_gst_sale_cost) || 0,
            gst: parseFloat(p.gst) || 0,
            post_gst_sale_cost: parseFloat(p.post_gst_sale_cost) || 0,
            description: p.description || 'N/A',
            purchase_stock: s?.purchase_stock || '0',
            sales_stock: s?.sales_stock || '0',
            current_stock: s?.current_stock || '0',
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setProductInfoList(list);
      setLoading(false);
    } catch (err) {
      showToast(err.message, true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && authToken) {
      fetchProductInfo();
    }
  }, [user, authToken]);

  // Filter & Paginate
  const filteredProducts = productInfoList.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.hsn_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginated = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Delete
  const deleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/product-info/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      setProductInfoList((prev) => prev.filter((p) => p.id !== id));
      showToast('Product deleted!', false);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Update
  const updateProduct = async (formData, id) => {
    const payload = {
      name: formData.name,
      hsn_code: formData.hsn_code,
      purchase_price: parseFloat(formData.purchase_price).toFixed(2),
      profit_percentage: parseFloat(formData.profit_percentage).toFixed(2),
      gst: parseFloat(formData.gst).toFixed(2),
      unit_name: formData.unit_name,
      description: formData.description,
      pre_gst_sale_cost: (
        parseFloat(formData.purchase_price) *
        (1 + parseFloat(formData.profit_percentage) / 100)
      ).toFixed(2),
      post_gst_sale_cost: (
        parseFloat(formData.purchase_price) *
        (1 + parseFloat(formData.profit_percentage) / 100) *
        (1 + parseFloat(formData.gst) / 100)
      ).toFixed(2),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/product-info/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');
      await fetchProductInfo();
      setEditingId(null);
      showToast('Product updated!', false);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-lg bg-gray-50">
        Loading...
      </div>
    );

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <Header title="Products Information" bgColor="bg-gradient-to-r from-neutral-800 to-cyan-700 text-white" />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search Bar */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-700"
            />
          </div>

          {/* Table View - Large Screens */}
          <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    S.No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    HSN
                  </th>
                  {!isRestricted && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Purchase
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Profit %
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Costs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stocks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Desc
                  </th>
                  {!isRestricted && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="text-center py-8 text-gray-500"
                    >
                      No products found
                    </td>
                  </tr>
                ) : (
                  paginated.map((p, i) => {
                    const idx = (currentPage - 1) * itemsPerPage + i + 1;
                    const isEditing = editingId === p.id;
                    return (
                      <React.Fragment key={p.id}>
                        <tr>
                          <td className="px-6 py-4 text-sm">{idx}</td>
                          <td className="px-6 py-4 text-sm font-medium">
                            {p.name}
                          </td>
                          <td className="px-6 py-4 text-sm">{p.unit_name}</td>
                          <td className="px-6 py-4 text-sm">{p.hsn_code}</td>
                          {!isRestricted && (
                            <>
                              <td className="px-6 py-4 text-sm">
                                ₹{p.purchase_price.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                {p.profit_percentage.toFixed(2)}%
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div>
                              Pre-GST: ₹{p.pre_gst_sale_cost.toFixed(2)}
                            </div>
                            <div>GST: {p.gst.toFixed(2)}%</div>
                            <div>
                              Post-GST: ₹{p.post_gst_sale_cost.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div>P: {p.purchase_stock}</div>
                            <div>S: {p.sales_stock}</div>
                            <div>C: {p.current_stock}</div>
                          </td>
                          <td className="px-6 py-4 text-sm max-w-xs truncate">
                            {p.description}
                          </td>
                          {!isRestricted && (
                            <td className="px-6 py-4 text-sm">
                              <button
                                onClick={() => setEditingId(p.id)}
                                className="text-cyan-700 hover:text-blue-800 mr-3"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteProduct(p.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                        {isEditing && (
                          <tr>
                            <td colSpan="10" className="p-6 bg-gray-50">
                              <EditForm
                                product={p}
                                units={unitData}
                                onSave={(data) => updateProduct(data, p.id)}
                                onCancel={() => setEditingId(null)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - Desktop */}
          <div className="hidden lg:flex justify-between items-center mt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} ({filteredProducts.length} total)
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card View - Mobile */}
          <div className="lg:hidden space-y-4">
            {paginated.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No products found
              </div>
            ) : (
              paginated.map((p, i) => {
                const idx = (currentPage - 1) * itemsPerPage + i + 1;
                const isEditing = editingId === p.id;
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-lg shadow p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">
                        {idx}. {p.name}
                      </h3>
                      {!isRestricted && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingId(p.id)}
                            className="text-cyan-700"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <strong>Unit:</strong> {p.unit_name}
                      </div>
                      <div>
                        <strong>HSN:</strong> {p.hsn_code}
                      </div>
                      {!isRestricted && (
                        <>
                          <div>
                            <strong>Purchase:</strong> ₹{p.purchase_price.toFixed(2)}
                          </div>
                          <div>
                            <strong>Profit:</strong> {p.profit_percentage.toFixed(2)}%
                          </div>
                        </>
                      )}
                      <div className="col-span-2">
                        <strong>Costs:</strong>
                        <br />
                        Pre: ₹{p.pre_gst_sale_cost.toFixed(2)} | GST: {p.gst}% | Post: ₹{p.post_gst_sale_cost.toFixed(2)}
                      </div>
                      <div className="col-span-2">
                        <strong>Stocks:</strong> P:{p.purchase_stock} S:{p.sales_stock} C:{p.current_stock}
                      </div>
                      <div className="col-span-2 text-xs text-gray-500 mt-2">
                        {p.description}
                      </div>
                    </div>
                    {isEditing && (
                      <div className="mt-4 pt-4 border-t">
                        <EditForm
                          product={p}
                          units={unitData}
                          onSave={(data) => updateProduct(data, p.id)}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Mobile Pagination */}
          <div className="lg:hidden flex justify-center gap-4 mt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm self-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </main>

        {/* Toast Container */}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-white shadow-lg animate-slide-in ${
                t.isError ? 'bg-red-600' : 'bg-green-600'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

// Edit Form Component
function EditForm({ product, units, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: product.name,
    hsn_code: product.hsn_code,
    purchase_price: product.purchase_price,
    profit_percentage: product.profit_percentage,
    gst: product.gst,
    unit_name: product.unit_name,
    description: product.description,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <input
        type="text"
        value={form.name}
        readOnly
        className="border rounded px-3 py-2 bg-gray-100"
      />
      <input
        type="text"
        placeholder="HSN Code"
        value={form.hsn_code}
        onChange={(e) => setForm({ ...form, hsn_code: e.target.value })}
        className="border rounded px-3 py-2"
      />
      <input
        type="number"
        step="0.01"
        placeholder="Purchase Price"
        value={form.purchase_price}
        onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
        className="border rounded px-3 py-2"
      />
      <input
        type="number"
        step="0.01"
        placeholder="Profit %"
        value={form.profit_percentage}
        onChange={(e) => setForm({ ...form, profit_percentage: e.target.value })}
        className="border rounded px-3 py-2"
      />
      <input
        type="number"
        step="0.01"
        placeholder="GST %"
        value={form.gst}
        onChange={(e) => setForm({ ...form, gst: e.target.value })}
        className="border rounded px-3 py-2"
      />
      <select
        value={form.unit_name}
        onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
        className="border rounded px-3 py-2"
      >
        <option value="">Select Unit</option>
        {units.map((u) => (
          <option key={u.name} value={u.name}>
            {u.name}
          </option>
        ))}
      </select>
      <textarea
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="border rounded px-3 py-2 md:col-span-2 lg:col-span-3"
        rows="2"
      />
      <div className="md:col-span-2 lg:col-span-3 flex gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          className="px-4 py-2 bg-cyan-700 text-white rounded-lg"
        >
          Update
        </button>
      </div>
    </div>
  );
}