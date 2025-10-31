'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  AlertCircle,
} from 'lucide-react';
import Header from '../components/Header';

const API_BASE_URL = 'http://127.0.0.1:8000/api'; // Change if needed

export default function ProductInfo() {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [productInfoList, setProductInfoList] = useState([]);
  const [unitData, setUnitData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 50;
  const isRestricted = user && [4, 5].includes(parseInt(user.rid) || 0);

  /* ---------- Toast ---------- */
  const showToast = useCallback((msg, isError = false) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, isError }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  }, []);

  /* ---------- Auth ---------- */
  useEffect(() => {
    const u = localStorage.getItem('user');
    const t = localStorage.getItem('authToken');
    if (u && t) {
      setUser(JSON.parse(u));
      setAuthToken(t);
    } else {
      showToast('Please log in.', true);
      setLoading(false);
    }
  }, [showToast]);

  /* ---------- Fetch Units ---------- */
  const fetchUnits = async () => {
    if (!user?.cid || !authToken) return;
    try {
      const r = await fetch(`${API_BASE_URL}/units/${user.cid}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!r.ok) throw new Error('Failed to fetch units');
      const d = await r.json();
      setUnitData(d.units || []);
    } catch (e) {
      showToast(e.message, true);
    }
  };

  /* ---------- Fetch Stock ---------- */
  const fetchStockData = async () => {
    if (!user?.cid || !authToken) return [];
    try {
      const r = await fetch(`${API_BASE_URL}/products/stock/${user.cid}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!r.ok) throw new Error('Failed to fetch stock');
      const d = await r.json();
      return d.map((s) => ({
        id: String(s.id),
        purchase_stock: s.purchase_stock || '0',
        sales_stock: s.sales_stock || '0',
        current_stock: s.current_stock || '0',
      }));
    } catch (e) {
      showToast(e.message, true);
      return [];
    }
  };

  /* ---------- Fetch Products ---------- */
  const fetchProductInfo = async () => {
    if (!user?.cid || !authToken) {
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${API_BASE_URL}/product-info/${user.cid}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!r.ok) throw new Error('Failed to fetch products');
      const data = await r.json();

      const stock = await fetchStockData();
      await fetchUnits();

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
    } catch (e) {
      showToast(e.message, true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && authToken) fetchProductInfo();
  }, [user, authToken]);

  /* ---------- Filter / Sort / Paginate ---------- */
  const processedProducts = useMemo(() => {
    let filtered = productInfoList.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.hsn_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const sa = parseInt(a.current_stock) || 0;
      const sb = parseInt(b.current_stock) || 0;
      const lowA = sa <= 10;
      const lowB = sb <= 10;
      if (lowA && !lowB) return -1;
      if (!lowA && lowB) return 1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [productInfoList, searchTerm]);

  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);
  const paginated = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ---------- Edit Helpers ---------- */
  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({
      hsn_code: p.hsn_code,
      purchase_price: p.purchase_price,
      profit_percentage: p.profit_percentage,
      gst: p.gst,
      unit_name: p.unit_name,
      description: p.description,
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };
  const saveEdit = async (id) => {
    const payload = {
      hsn_code: editForm.hsn_code,
      purchase_price: parseFloat(editForm.purchase_price).toFixed(2),
      profit_percentage: parseFloat(editForm.profit_percentage).toFixed(2),
      gst: parseFloat(editForm.gst).toFixed(2),
      unit_name: editForm.unit_name,
      description: editForm.description,
      pre_gst_sale_cost: (
        parseFloat(editForm.purchase_price) *
        (1 + parseFloat(editForm.profit_percentage) / 100)
      ).toFixed(2),
      post_gst_sale_cost: (
        parseFloat(editForm.purchase_price) *
        (1 + parseFloat(editForm.profit_percentage) / 100) *
        (1 + parseFloat(editForm.gst) / 100)
      ).toFixed(2),
    };

    try {
      const r = await fetch(`${API_BASE_URL}/product-info/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Update failed');
      await fetchProductInfo();
      cancelEdit();
      showToast('Product updated!', false);
    } catch (e) {
      showToast(e.message, true);
    }
  };

  /* ---------- Delete ---------- */
  const deleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const r = await fetch(`${API_BASE_URL}/product-info/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!r.ok) throw new Error('Delete failed');
      setProductInfoList((prev) => prev.filter((p) => p.id !== id));
      showToast('Product deleted!', false);
    } catch (e) {
      showToast(e.message, true);
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-lg bg-gray-50">
        Loading...
      </div>
    );

  return (
    <>
      <div className="p-6">
        <Header
          title="Products Info."
          bgColor="bg-gradient-to-r from-neutral-800 to-cyan-700 text-white"
        />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Header + Search */}
          <div className="mb-6 flex flex-col items-start md:flex-row md:items-center md:justify-between">
            <h2 className="mb-2 text-lg font-bold text-cyan-950">
              Product Information List
            </h2>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-700"
              />
            </div>
          </div>

          {/* ------------------- Desktop Table (Fixed Width) ------------------- */}
          <div className="hidden overflow-x-auto rounded-lg bg-white shadow lg:block">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-6 py-3 text-left text-xs font-medium uppercase text-gray-900">
                    S.No
                  </th>
                  <th className="w-48 px-6 py-3 text-left text-xs font-medium uppercase text-gray-900">
                    Product
                  </th>
                  <th className="w-20 px-6 py-3 text-left text-xs font-medium uppercase text-gray-900">
                    Unit
                  </th>
                  <th className="w-24 px-6 py-3 text-left text-xs font-medium uppercase text-gray-900">
                    HSN
                  </th>
                  {!isRestricted && (
                    <>
                      <th className="w-24 px-6 py-3 text-left text-xs font-medium uppercase text-gray-900">
                        Purchase
                      </th>
                      <th className="w-20 px-6 py-3 text-left text-xs font-medium uppercase text-gray-900">
                        Profit
                      </th>
                    </>
                  )}
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium uppercase text-gray-900">
                    Costs
                  </th>
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium uppercase text-gray-900">
                    Stocks
                  </th>
                  <th className="w-48 px-6 py-3 text-left text-xs font-medium uppercase text-gray-900">
                    Desc
                  </th>
                  {!isRestricted && (
                    <th className="w-24 px-6 py-3 text-left text-xs font-medium uppercase text-gray-900">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-gray-500">
                      No products found
                    </td>
                  </tr>
                ) : (
                  paginated.map((p, i) => {
                    const idx = (currentPage - 1) * itemsPerPage + i + 1;
                    const isEditing = editingId === p.id;
                    const lowStock = (parseInt(p.current_stock) || 0) <= 10;

                    return (
                      <tr
                        key={p.id}
                        className={`${lowStock ? 'bg-red-50' : ''} ${
                          isEditing ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <td
                          className={`px-6 py-4 text-sm ${
                            lowStock ? 'font-semibold text-red-700' : ''
                          }`}
                        >
                          {idx}
                        </td>

                        <td
                          className={`px-6 py-4 text-sm font-medium ${
                            lowStock ? 'text-red-700' : ''
                          }`}
                        >
                          {p.name}
                        </td>

                        {/* Unit */}
                        <td className={`px-6 py-4 text-sm ${lowStock ? 'text-red-700' : ''}`}>
                          {isEditing ? (
                            <select
                              value={editForm.unit_name || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, unit_name: e.target.value })
                              }
                              className="w-full rounded border px-2 py-1 text-sm"
                            >
                              <option value="">Select Unit</option>
                              {unitData.map((u) => (
                                <option key={u.name} value={u.name}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            p.unit_name
                          )}
                        </td>

                        {/* HSN */}
                        <td className={`px-6 py-4 text-sm ${lowStock ? 'text-red-700' : ''}`}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.hsn_code || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, hsn_code: e.target.value })
                              }
                              className="w-full rounded border px-2 py-1 text-sm"
                            />
                          ) : (
                            p.hsn_code
                          )}
                        </td>

                        {/* Purchase / Profit */}
                        {!isRestricted && (
                          <>
                            <td className={`px-6 py-4 text-sm ${lowStock ? 'text-red-700' : ''}`}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.purchase_price || ''}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      purchase_price: e.target.value,
                                    })
                                  }
                                  className="w-full rounded border px-2 py-1 text-sm"
                                />
                              ) : (
                                `₹${p.purchase_price.toFixed(2)}`
                              )}
                            </td>
                            <td className={`px-6 py-4 text-sm ${lowStock ? 'text-red-700' : ''}`}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.profit_percentage || ''}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      profit_percentage: e.target.value,
                                    })
                                  }
                                  className="w-full rounded border px-2 py-1 text-sm"
                                />
                              ) : (
                                `${p.profit_percentage.toFixed(2)}%`
                              )}
                            </td>
                          </>
                        )}

                        {/* Costs */}
                        <td className={`px-6 py-4 text-sm ${lowStock ? 'text-red-700' : ''}`}>
                          <div>Pre-GST: ₹{p.pre_gst_sale_cost.toFixed(2)}</div>
                          <div>GST: {p.gst.toFixed(2)}%</div>
                          <div>Post-GST: ₹{p.post_gst_sale_cost.toFixed(2)}</div>
                        </td>

                        {/* Stocks */}
                        <td
                          className={`px-6 py-4 text-sm font-semibold ${
                            lowStock ? 'text-red-800' : 'text-gray-600'
                          }`}
                        >
                          <div>Purchase: {p.purchase_stock}</div>
                          <div>Sales: {p.sales_stock}</div>
                          <div className={lowStock ? 'text-red-600' : ''}>
                            Current: {p.current_stock}
                          </div>
                        </td>

                        {/* Description */}
                        <td className={`px-6 py-4 text-sm ${lowStock ? 'text-red-700' : ''}`}>
                          {isEditing ? (
                            <textarea
                              value={editForm.description || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, description: e.target.value })
                              }
                              className="w-full rounded border px-2 py-1 text-sm"
                              rows={2}
                            />
                          ) : (
                            <div className="truncate">{p.description}</div>
                          )}
                        </td>

                        {/* Action */}
                        {!isRestricted && (
                          <td className="px-6 py-4 text-sm">
                            {isEditing ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => saveEdit(p.id)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-gray-600 hover:text-gray-800"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEdit(p)}
                                  className="text-cyan-700 hover:text-blue-800"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteProduct(p.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ------------------- Mobile Card View ------------------- */}
          <div className="space-y-4 lg:hidden">
            {paginated.map((p, i) => {
              const idx = (currentPage - 1) * itemsPerPage + i + 1;
              const isEditing = editingId === p.id;
              const lowStock = (parseInt(p.current_stock) || 0) <= 10;

              return (
                <div
                  key={p.id}
                  className={`rounded-lg bg-white p-4 shadow ${
                    lowStock ? 'border-2 border-red-400' : ''
                  } ${isEditing ? 'ring-2 ring-yellow-400' : ''}`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <h3
                      className={`text-lg font-semibold ${lowStock ? 'text-red-700' : ''}`}
                    >
                      {idx}. {p.name}
                    </h3>
                    {!isRestricted && (
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(p.id)}
                              className="text-green-600"
                            >
                              <Save className="h-5 w-5" />
                            </button>
                            <button onClick={cancelEdit} className="text-gray-600">
                              <X className="h-5 w-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(p)}
                              className="text-cyan-700"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => deleteProduct(p.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <strong>Unit:</strong>{' '}
                      {isEditing ? (
                        <select
                          value={editForm.unit_name || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, unit_name: e.target.value })
                          }
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        >
                          <option value="">Select Unit</option>
                          {unitData.map((u) => (
                            <option key={u.name} value={u.name}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        p.unit_name
                      )}
                    </div>

                    <div>
                      <strong>HSN:</strong>{' '}
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.hsn_code || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, hsn_code: e.target.value })
                          }
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        />
                      ) : (
                        p.hsn_code
                      )}
                    </div>

                    {!isRestricted && (
                      <>
                        <div>
                          <strong>Purchase:</strong>{' '}
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.purchase_price || ''}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  purchase_price: e.target.value,
                                })
                              }
                              className="mt-1 w-full rounded border px-2 py-1 text-sm"
                            />
                          ) : (
                            `₹${p.purchase_price.toFixed(2)}`
                          )}
                        </div>
                        <div>
                          <strong>Profit:</strong>{' '}
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.profit_percentage || ''}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  profit_percentage: e.target.value,
                                })
                              }
                              className="mt-1 w-full rounded border px-2 py-1 text-sm"
                            />
                          ) : (
                            `${p.profit_percentage.toFixed(2)}%`
                          )}
                        </div>
                      </>
                    )}

                    <div className={lowStock ? 'text-red-700' : ''}>
                      <strong>Costs:</strong>
                      <br />
                      Pre: ₹{p.pre_gst_sale_cost.toFixed(2)} | GST: {p.gst}% | Post: ₹
                      {p.post_gst_sale_cost.toFixed(2)}
                    </div>

                    <div className="font-semibold">
                      <strong>Stocks:</strong>{' '}
                      <span className={lowStock ? 'text-red-600' : ''}>
                        Purchase:{p.purchase_stock} Sales:{p.sales_stock} Current:{p.current_stock}
                      </span>
                    </div>

                    <div>
                      <strong>Description:</strong>{' '}
                      {isEditing ? (
                        <textarea
                          value={editForm.description || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, description: e.target.value })
                          }
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          rows={2}
                        />
                      ) : (
                        <span className="text-xs text-gray-500">{p.description}</span>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-4 flex justify-end gap-2 border-t pt-2">
                      <button
                        onClick={() => saveEdit(p.id)}
                        className="rounded bg-green-600 px-3 py-1 text-sm text-white"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded border px-3 py-1 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination – Desktop */}
          <div className="mt-6 hidden items-center justify-between lg:flex">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} ({processedProducts.length} total)
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Pagination – Mobile */}
          <div className="mt-6 flex justify-center gap-4 lg:hidden">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border px-4 py-2 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="self-center text-sm">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border px-4 py-2 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </main>

        {/* Toast */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-white shadow-lg animate-slide-in ${
                t.isError ? 'bg-red-600' : 'bg-green-600'
              }`}
            >
              <AlertCircle className="h-5 w-5" />
              <span>{t.msg}</span>
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