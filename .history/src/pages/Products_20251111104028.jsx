/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { FaPlus } from "react-icons/fa";
import { TbRulerMeasure } from "react-icons/tb";
import { API_BASE_URL } from '../config';
//const API_BASE_URL = 'http://127.0.0.1:8000/api';

const Products = () => {
  /* ────────────────────── STATE ────────────────────── */
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [allProductsCurrentPage, setAllProductsCurrentPage] = useState(1);
  const [unitsCurrentPage, setUnitsCurrentPage] = useState(1);
  const [showAddProductPopup, setShowAddProductPopup] = useState(false);
  const [showAddCategoryPopup, setShowAddCategoryPopup] = useState(false);
  const [showAddUnitPopup, setShowAddUnitPopup] = useState(false);
  const [showUnitSection, setShowUnitSection] = useState(false);
  const [userName, setUserName] = useState('User');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isDataFetched, setIsDataFetched] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const itemsPerPage = 50;
  const navigate = useNavigate();

  /* ────────────────────── HELPERS ────────────────────── */
  const user = useMemo(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return {};
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem('user');
      return {};
    }
  }, []);

  const authToken = useMemo(() => localStorage.getItem('authToken') || null, []);

  /* ────────────────────── RESPONSIVE ────────────────────── */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ────────────────────── TOAST ────────────────────── */
  const showToast = useCallback((msg, error = false) => {
    const el = document.createElement('div');
    el.className = `fixed top-5 right-5 p-4 rounded shadow-lg z-50 text-sm sm:text-base ${
      error ? 'bg-red-500' : 'bg-cyan-800'
    } text-white`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }, []);

  /* ────────────────────── UNIT POPUP ────────────────────── */
  const showUnitConversionPopup = useCallback(
    (unit) => {
      if (unit && ['kg', 'gram'].includes(unit.name.toLowerCase())) {
        const el = document.createElement('div');
        el.className =
          'fixed top-5 right-5 bg-cyan-800 text-white p-4 rounded shadow-lg z-50 text-sm sm:text-base';
        el.textContent =
          'To buy in grams, select kg and enter the quantity in decimals (e.g., 0.25 kg = 250 g).';
        document.body.appendChild(el);
        setTimeout(() => {
          el.style.opacity = '0';
          setTimeout(() => el.remove(), 300);
        }, 3000);
      }
    },
    []
  );

  /* ────────────────────── FETCH USER ────────────────────── */
  const fetchUserData = useCallback(async () => {
    if (!authToken || !user?.id) {
      showToast('Authentication missing. Redirecting…', true);
      navigate('/login');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/user/${user.id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.clear();
          navigate('/login');
          showToast('Session expired. Please log in again.', true);
          return;
        }
        throw new Error(`User fetch error ${res.status}`);
      }
      const data = await res.json();
      setUserName(data.data?.name || 'User');
    } catch (e) {
      console.error('User fetch error:', e);
      showToast('Failed to load user data.', true);
    }
  }, [authToken, user?.id, navigate, showToast]);

  /* ────────────────────── FETCH DATA ────────────────────── */
  const fetchAllProducts = useCallback(async () => {
    if (!user?.cid || !authToken) {
      showToast('Missing user or authentication data.', true);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/products?cid=${user.cid}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`Products fetch error ${res.status}`);
      const json = await res.json();
      const list = (json.products || []).map((p) => ({
        id: p.id,
        name: p.product_name || p.name || 'N/A',
        category: p.category_name || p.category || 'N/A',
        category_id: p.category_id || null,
        hscode: p.hscode || 'N/A',
        description: p.description || 'N/A',
        display_name: p.product_name || p.name || 'N/A',
        display_hscode: p.hscode || 'N/A',
        primary_unit: p.primary_unit?.replace(/,$/, '') || 'N/A',
        secondary_unit: p.secondary_unit?.replace(/,$/, '') || 'N/A',
        c_factor: p.c_factor || 'N/A',
        p_unit_id: p.p_unit,
        s_unit_id: p.s_unit,
      })).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      setAllProducts(list);
    } catch (e) {
      console.error('Products fetch error:', e);
      showToast('Failed to load products.', true);
    }
  }, [authToken, user?.cid, showToast]);

  const fetchCategories = useCallback(async () => {
    if (!authToken) {
      showToast('No authentication token available.', true);
      return [];
    }
    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Categories fetch error ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json.categories) ? json.categories : [];
      return list.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
    } catch (e) {
      console.error('Categories fetch error:', e);
      showToast('Failed to load categories.', true);
      return [];
    }
  }, [authToken, showToast]);

  const fetchUnits = useCallback(async () => {
    if (!authToken) {
      showToast('No authentication token available.', true);
      return [];
    }
    try {
      const res = await fetch(`${API_BASE_URL}/units`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Units fetch error ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json.units)
        ? json.units
        : Array.isArray(json)
        ? json
        : [];
      return list.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
    } catch (e) {
      console.error('Units fetch error:', e);
      showToast('Failed to load units.', true);
      return [];
    }
  }, [authToken, showToast]);

  /* ────────────────────── FILTERS ────────────────────── */
  const filteredProducts = useMemo(() => {
    return allProducts
      .filter((p) => {
        const s = searchTerm.toLowerCase();
        const matchSearch =
          p.display_name.toLowerCase().includes(s) ||
          p.category.toLowerCase().includes(s) ||
          p.display_hscode.toLowerCase().includes(s) ||
          p.description.toLowerCase().includes(s);
        const matchCat = !categoryFilter || String(p.category_id) === categoryFilter;
        return matchSearch && matchCat;
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
  }, [allProducts, searchTerm, categoryFilter]);

  const filteredUnits = useMemo(() => {
    return units
      .filter((u) => u.name.toLowerCase().includes(unitSearchTerm.toLowerCase()))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
  }, [units, unitSearchTerm]);

  /* ────────────────────── PAGINATION ────────────────────── */
  const paginate = (list, page) => {
    const start = (page - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  };

  const Pagination = ({ total, page, type }) => {
    const totalPages = Math.ceil(total / itemsPerPage);
    const max = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="flex items-center justify-center space-x-2 mt-4">
        <button
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm sm:text-base"
          disabled={page === 1 || total === 0}
          onClick={() =>
            type === 'products'
              ? setAllProductsCurrentPage(page - 1)
              : setUnitsCurrentPage(page - 1)
          }
        >
          Previous
        </button>

        {total > 0 ? (
          pages.map((p) => (
            <button
              key={p}
              className={`px-3 py-1 rounded ${
                p === page ? 'bg-cyan-800 text-white' : 'bg-gray-200'
              } text-sm sm:text-base`}
              onClick={() =>
                type === 'products'
                  ? setAllProductsCurrentPage(p)
                  : setUnitsCurrentPage(p)
              }
            >
              {p}
            </button>
          ))
        ) : (
          <button
            className="px-3 py-1 bg-cyan-800 text-white rounded text-sm sm:text-base"
            disabled
          >
            1
          </button>
        )}

        <button
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm sm:text-base"
          disabled={page === totalPages || total === 0}
          onClick={() =>
            type === 'products'
              ? setAllProductsCurrentPage(page + 1)
              : setUnitsCurrentPage(page + 1)
          }
        >
          Next
        </button>
        <span className="text-sm sm:text-base">{total} total</span>
      </div>
    );
  };

  /* ────────────────────── EDIT PRODUCT ────────────────────── */
  const startEdit = useCallback((product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.display_name || '',
      category_id: product.category_id || '',
      hscode: product.display_hscode || '',
      p_unit: product.p_unit_id || '',
      s_unit: product.s_unit_id || '',
      c_factor: product.c_factor === 'N/A' ? '' : product.c_factor,
      description: product.description || '',
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({});
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) {
      showToast('No product selected for editing.', true);
      return;
    }

    const payload = {
      name: editForm.name?.trim(),
      category_id: parseInt(editForm.category_id, 10),
      hscode: editForm.hscode?.trim() || null,
      p_unit: editForm.p_unit ? parseInt(editForm.p_unit, 10) : null,
      s_unit: editForm.s_unit ? parseInt(editForm.s_unit, 10) : null,
      c_factor: editForm.c_factor ? parseFloat(editForm.c_factor) : null,
      description: editForm.description?.trim() || null,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/products/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      if (res.ok) {
        const updated = JSON.parse(txt).product;
        setAllProducts((prev) =>
          prev
            .map((p) =>
              p.id === editingId
                ? {
                    ...p,
                    name: updated.name,
                    category_id: updated.category_id,
                    category:
                      categories.find((c) => c.id === updated.category_id)?.name ||
                      'N/A',
                    hscode: updated.hscode,
                    description: updated.description || 'N/A',
                    primary_unit:
                      units.find((u) => u.id === updated.p_unit)?.name || 'N/A',
                    secondary_unit:
                      units.find((u) => u.id === updated.s_unit)?.name || 'N/A',
                    c_factor: updated.c_factor || 'N/A',
                    display_name: updated.name || 'N/A',
                    display_hscode: updated.hscode || 'N/A',
                    p_unit_id: updated.p_unit,
                    s_unit_id: updated.s_unit,
                  }
                : p
            )
            .sort((a, b) =>
              a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
            )
        );
        showToast('Product updated!');
        cancelEdit();
      } else {
        let msg = 'Update failed.';
        try {
          const err = JSON.parse(txt);
          msg = err.errors
            ? Object.entries(err.errors)
                .flatMap(([k, v]) => v.map((e) => `${k}: ${e}`))
                .join('; ')
            : err.message || txt;
        } catch (parseErr) {
          console.error('Error parsing response:', parseErr);
        }
        showToast(`Update error: ${msg}`, true);
      }
    } catch (e) {
      console.error('Product update error:', e);
      showToast(`Update error: ${e.message}`, true);
    }
  }, [editingId, editForm, authToken, categories, units, showToast, cancelEdit]);

  /* ────────────────────── DISPLAY PRODUCTS ────────────────────── */
  const displayProducts = () => {
    const paginated = paginate(filteredProducts, allProductsCurrentPage);
    const canEdit = user?.rid <= 7;

    if (isMobile) {
      return (
        <div className="space-y-4">
          {paginated.length === 0 ? (
            <p className="text-center py-6 text-sm text-cyan-700">
              {filteredProducts.length > 0
                ? 'No products on this page'
                : 'No products available'}
            </p>
          ) : (
            paginated.map((p, i) => {
              const editing = editingId === p.id;
              const idx = (allProductsCurrentPage - 1) * itemsPerPage + i + 1;

              return (
                <div
                  key={p.id}
                  className="bg-white border rounded-lg p-4 shadow-sm"
                >
                  {editing ? (
                    /* ── EDIT FORM (mobile) ── */
                    <div className="space-y-3">
                      <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.name || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        placeholder="Product Name *"
                        required
                      />
                      <select
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.category_id || ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            category_id: e.target.value,
                          })
                        }
                      >
                        <option value="" disabled>
                          Select Category
                        </option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.hscode || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, hscode: e.target.value })
                        }
                        placeholder="HSCODE"
                      />
                      <select
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.p_unit || ''}
                        onChange={(e) => {
                          setEditForm({ ...editForm, p_unit: e.target.value });
                          showUnitConversionPopup(
                            units.find((u) => u.id == e.target.value)
                          );
                        }}
                      >
                        <option value="" disabled>
                          Primary Unit
                        </option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.s_unit || ''}
                        onChange={(e) => {
                          setEditForm({ ...editForm, s_unit: e.target.value });
                          showUnitConversionPopup(
                            units.find((u) => u.id == e.target.value)
                          );
                        }}
                      >
                        <option value="" disabled>
                          Secondary Unit
                        </option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="any"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.c_factor || ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            c_factor: e.target.value,
                          })
                        }
                        placeholder="Conversion Factor"
                      />
                      <input
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.description || ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Description"
                      />
                      <div className="flex space-x-2">
                        <button
                          className="flex-1 px-3 py-1 bg-cyan-700 text-white rounded text-sm"
                          onClick={saveEdit}
                        >
                          Save
                        </button>
                        <button
                          className="flex-1 px-3 py-1 bg-gray-500 text-white rounded text-sm"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── VIEW (mobile) ── */
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-base">
                          {idx}. {p.display_name || 'N/A'}
                        </div>
                        {canEdit && (
                          <button
                            className="px-2 py-1 bg-cyan-800 text-white rounded text-xs hover:bg-red-500"
                            onClick={() => startEdit(p)}
                          >
                          Edit
                          </button>
                        )}
                      </div>
                      <div>
                        <strong>Category:</strong> {p.category || 'N/A'}
                      </div>
                      <div>
                        <strong>HScode:</strong> {p.display_hscode || 'N/A'}
                      </div>
                      <div>
                        <strong>P. Unit:</strong> {p.primary_unit || 'N/A'}
                      </div>
                      <div>
                        <strong>S. Unit:</strong> {p.secondary_unit || 'N/A'}
                      </div>
                      <div>
                        <strong>CF:</strong> {p.c_factor || 'N/A'}
                      </div>
                      <div>
                        <strong>Description:</strong> {p.description || 'N/A'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <Pagination
            total={filteredProducts.length}
            page={allProductsCurrentPage}
            type="products"
          />
        </div>
      );
    }

    /* ── DESKTOP TABLE ── */
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                S.No
              </th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                Product Name
              </th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                Category
              </th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                HScode
              </th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                P. Unit
              </th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                S. Unit
              </th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                CF
              </th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                Description
              </th>
              {canEdit && (
                <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 9 : 8}
                  className="py-2 px-3 sm:px-4 border text-center text-sm sm:text-base"
                >
                  {filteredProducts.length > 0
                    ? 'No products on this page'
                    : 'No products available'}
                </td>
              </tr>
            ) : (
              paginated.map((p, i) => {
                const editing = editingId === p.id;
                const idx = (allProductsCurrentPage - 1) * itemsPerPage + i + 1;

                return (
                  <tr key={p.id}>
                    <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                      {idx}
                    </td>
                    {editing ? (
                      <>
                        <td className="py-2 px-3 sm:px-4 border">
                          <input
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.name || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            required
                          />
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <select
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.category_id || ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                category_id: e.target.value,
                              })
                            }
                            required
                          >
                            <option value="" disabled>
                              Select Category
                            </option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <input
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.hscode || ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                hscode: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <select
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.p_unit || ''}
                            onChange={(e) => {
                              setEditForm({ ...editForm, p_unit: e.target.value });
                              showUnitConversionPopup(
                                units.find((u) => u.id == e.target.value)
                              );
                            }}
                          >
                            <option value="" disabled>
                              Primary Unit
                            </option>
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <select
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.s_unit || ''}
                            onChange={(e) => {
                              setEditForm({ ...editForm, s_unit: e.target.value });
                              showUnitConversionPopup(
                                units.find((u) => u.id == e.target.value)
                              );
                            }}
                          >
                            <option value="" disabled>
                              Secondary Unit
                            </option>
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <input
                            type="number"
                            step="any"
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.c_factor || ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                c_factor: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <input
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.description || ''}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                description: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <button
                            className="px-2 py-1 bg-cyan-700 text-white rounded text-xs"
                            onClick={saveEdit}
                          >
                            Save
                          </button>
                          <button
                            className="px-2 py-1 bg-gray-500 text-white rounded text-xs ml-1"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                          {p.display_name || 'N/A'}
                        </td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                          {p.category || 'N/A'}
                        </td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                          {p.display_hscode || 'N/A'}
                        </td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                          {p.primary_unit || 'N/A'}
                        </td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                          {p.secondary_unit || 'N/A'}
                        </td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                          {p.c_factor || 'N/A'}
                        </td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                          {p.description || 'N/A'}
                        </td>
                        {canEdit && (
                          <td className="py-2 px-3 sm:px-4 border">
                            <button
                              className="px-2 py-1 bg-cyan-800 text-white rounded text-xs"
                              onClick={() => startEdit(p)}
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination
          total={filteredProducts.length}
          page={allProductsCurrentPage}
          type="products"
        />
      </div>
    );
  };

  /* ────────────────────── DISPLAY UNITS ────────────────────── */
  const displayUnits = () => {
    const paginated = paginate(filteredUnits, unitsCurrentPage);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                S.No
              </th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                Unit Name
              </th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="py-2 px-3 sm:px-4 border text-center text-sm sm:text-base"
                >
                  {filteredUnits.length > 0
                    ? 'No units on this page'
                    : 'No units available'}
                </td>
              </tr>
            ) : (
              paginated.map((u, i) => (
                <tr key={u.id}>
                  <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                    {(unitsCurrentPage - 1) * itemsPerPage + i + 1}
                  </td>
                  <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                    {u.name}
                  </td>
                  <td className="py-2 px-3 sm:px-4 border">
                    <button className="px-2 py-1 bg-cyan-800 text-white rounded text-xs">
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          total={filteredUnits.length}
          page={unitsCurrentPage}
          type="units"
        />
      </div>
    );
  };

  /* ────────────────────── ADD PRODUCT POPUP ────────────────────── */
  const AddProductPopup = () => {
    const [productRows, setProductRows] = useState([
      {
        id: 1,
        name: '',
        category_id: '',
        hscode: '',
        p_unit: '',
        s_unit: '',
        c_factor: '',
        description: '',
      },
    ]);

    const handleAddRow = () => {
      setProductRows((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          name: '',
          category_id: '',
          hscode: '',
          p_unit: '',
          s_unit: '',
          c_factor: '',
          description: '',
        },
      ]);
    };

    const handleRemoveRow = (id) => {
      setProductRows((prev) => prev.filter((r) => r.id !== id));
    };

    const handleInputChange = (id, field, value) => {
      setProductRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
      if (field === 'p_unit' || field === 's_unit') {
        const unit = units.find((u) => u.id == value);
        showUnitConversionPopup(unit);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!user || !authToken) {
        showToast('You need to log in to add products.', true);
        navigate('/login');
        return;
      }

      let hasError = false;
      const products = productRows.map((r) => ({
        name: r.name.trim(),
        category_id: r.category_id ? parseInt(r.category_id, 10) : null,
        hscode: r.hscode ? r.hscode.trim() : null,
        p_unit: r.p_unit ? parseInt(r.p_unit, 10) : null,
        s_unit: r.s_unit ? parseInt(r.s_unit, 10) : null,
        c_factor: r.c_factor ? parseFloat(r.c_factor) : null,
        description: r.description ? r.description.trim() : null,
      }));

      products.forEach((p, i) => {
        if (!p.name) {
          showToast(`Product ${i + 1}: Name is required.`, true);
          hasError = true;
          return;
        }
        if (!p.category_id || isNaN(p.category_id)) {
          showToast(`Product ${i + 1}: Category is required.`, true);
          hasError = true;
          return;
        }
        if (
          allProducts.some(
            (ap) => ap.display_name.toLowerCase() === p.name.toLowerCase()
          )
        ) {
          showToast(`Product ${i + 1}: "${p.name}" already exists.`, true);
          hasError = true;
          return;
        }
        if (p.p_unit && !units.some((u) => u.id === p.p_unit)) {
          showToast(`Product ${i + 1}: Invalid primary unit.`, true);
          hasError = true;
          return;
        }
        if (p.s_unit && !units.some((u) => u.id === p.s_unit)) {
          showToast(`Product ${i + 1}: Invalid secondary unit.`, true);
          hasError = true;
          return;
        }
        if (p.c_factor && (isNaN(p.c_factor) || p.c_factor <= 0)) {
          showToast(
            `Product ${i + 1}: Conversion factor must be a positive number.`,
            true
          );
          hasError = true;
          return;
        }
        if (p.hscode && p.hscode.length > 50) {
          showToast(
            `Product ${i + 1}: HSCODE must not exceed 50 characters.`,
            true
          );
          hasError = true;
          return;
        }
        if (p.name.length > 255) {
          showToast(
            `Product ${i + 1}: Name must not exceed 255 characters.`,
            true
          );
          hasError = true;
          return;
        }
      });

      if (hasError) return;
      if (products.length === 0) {
        showToast('No products to save. Add at least one item.', true);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ products }),
        });
        const txt = await res.text();
        if (res.ok) {
          showToast('Products saved successfully!', false);
          const data = JSON.parse(txt);
          const newProds = (data.products || []).map((np) => ({
            id: np.id,
            name: np.name,
            category_id: np.category_id,
            category:
              categories.find((c) => c.id === np.category_id)?.name || 'N/A',
            hscode: np.hscode,
            description: np.description || 'N/A',
            display_name: np.name || 'N/A',
            display_hscode: np.hscode || 'N/A',
            primary_unit: units.find((u) => u.id === np.p_unit)?.name || 'N/A',
            secondary_unit: units.find((u) => u.id === np.s_unit)?.name || 'N/A',
            c_factor: np.c_factor || 'N/A',
            p_unit_id: np.p_unit,
            s_unit_id: np.s_unit,
          }));
          setAllProducts((prev) =>
            [...prev, ...newProds].sort((a, b) =>
              a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
            )
          );
          setShowAddProductPopup(false);
        } else {
          let msg = 'Failed to save products.';
          try {
            const err = JSON.parse(txt);
            msg = err.errors
              ? Object.entries(err.errors)
                  .flatMap(([k, v]) => v.map((e) => `${k}: ${e}`))
                  .join('; ')
              : err.message || txt;
          } catch (parseErr) {
            console.error('Error parsing response:', parseErr);
          }
          showToast(`Failed to save products: ${msg}`, true);
        }
      } catch (e) {
        console.error('Product save error:', e);
        showToast(`Could not save products: ${e.message}`, true);
      }
    };

    /* ── MOBILE ── */
    if (isMobile) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Add New Product</h2>
              <button
                onClick={() => setShowAddProductPopup(false)}
                className="text-cyan-700"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {productRows.map((row, i) => (
                <div
                  key={row.id}
                  className="border rounded p-3 space-y-3 relative"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">Item {i + 1}</span>
                    {productRows.length > 1 && (
                      <button
                        type="button"
                        className="text-red-500 text-xs"
                        onClick={() => handleRemoveRow(row.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="e.g., Laptop"
                      value={row.name}
                      onChange={(e) =>
                        handleInputChange(row.id, 'name', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Category *
                    </label>
                    <select
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={row.category_id}
                      onChange={(e) =>
                        handleInputChange(row.id, 'category_id', e.target.value)
                      }
                      required
                    >
                      <option value="" disabled>
                        Select Category
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      HSCODE
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="e.g., LAP123"
                      value={row.hscode}
                      onChange={(e) =>
                        handleInputChange(row.id, 'hscode', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Primary Unit
                    </label>
                    <select
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={row.p_unit}
                      onChange={(e) =>
                        handleInputChange(row.id, 'p_unit', e.target.value)
                      }
                    >
                      <option value="" disabled>
                        Select Primary Unit
                      </option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Secondary Unit
                    </label>
                    <select
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={row.s_unit}
                      onChange={(e) =>
                        handleInputChange(row.id, 's_unit', e.target.value)
                      }
                    >
                      <option value="" disabled>
                        Select Secondary Unit
                      </option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Conversion Factor
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="e.g., 25.5"
                      value={row.c_factor}
                      onChange={(e) =>
                        handleInputChange(row.id, 'c_factor', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="e.g., Product details"
                      value={row.description}
                      onChange={(e) =>
                        handleInputChange(row.id, 'description', e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
              <div className="flex flex-col space-y-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-cyan-800 text-white rounded text-sm"
                  onClick={handleAddRow}
                >
                  Add Another Item
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-cyan-800 text-white rounded text-sm"
                  onClick={() => {
                    setShowAddProductPopup(false);
                    setShowAddCategoryPopup(true);
                  }}
                >
                  Add Category
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 bg-red-800 text-white rounded text-sm"
                    onClick={() => setShowAddProductPopup(false)}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-cyan-700 text-white rounded text-sm"
                  >
                    Save All
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      );
    }

    /* ── DESKTOP ── */
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white p-4 sm:p-6 rounded shadow-lg w-full max-w-[95vw] sm:max-w-3xl md:max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Add New Product</h2>
            <button
              onClick={() => setShowAddProductPopup(false)}
              className="text-cyan-700"
            >
              Close
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border">
                <thead>
                  <tr>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base w-[60px] sm:w-[80px]">
                      S.No
                    </th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[150px]">
                      Product Name
                    </th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[120px]">
                      Category
                    </th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[100px]">
                      HSCODE
                    </th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[100px] sm:min-w-[120px]">
                      P. Unit
                    </th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[100px] sm:min-w-[120px]">
                      S. Unit
                    </th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[100px] sm:min-w-[120px]">
                      CF
                    </th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[150px]">
                      Description
                    </th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base w-[80px] sm:w-[100px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((row, i) => (
                    <tr key={row.id}>
                      <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                        {row.id}
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base"
                          placeholder="e.g., Laptop"
                          value={row.name}
                          onChange={(e) =>
                            handleInputChange(row.id, 'name', e.target.value)
                          }
                          required
                        />
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <select
                          className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base"
                          value={row.category_id}
                          onChange={(e) =>
                            handleInputChange(row.id, 'category_id', e.target.value)
                          }
                          required
                        >
                          <option value="" disabled>
                            Select Category
                          </option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base"
                          placeholder="e.g., LAP123"
                          value={row.hscode}
                          onChange={(e) =>
                            handleInputChange(row.id, 'hscode', e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <select
                          className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base"
                          value={row.p_unit}
                          onChange={(e) =>
                            handleInputChange(row.id, 'p_unit', e.target.value)
                          }
                        >
                          <option value="" disabled>
                            Select Primary Unit
                          </option>
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <select
                          className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base"
                          value={row.s_unit}
                          onChange={(e) =>
                            handleInputChange(row.id, 's_unit', e.target.value)
                          }
                        >
                          <option value="" disabled>
                            Select Secondary Unit
                          </option>
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <input
                          type="number"
                          step="any"
                          className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base"
                          placeholder="e.g., 25.5"
                          value={row.c_factor}
                          onChange={(e) =>
                            handleInputChange(row.id, 'c_factor', e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base"
                          placeholder="e.g., Product details"
                          value={row.description}
                          onChange={(e) =>
                            handleInputChange(row.id, 'description', e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <button
                          type="button"
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm sm:text-base"
                          onClick={() => handleRemoveRow(row.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-cyan-800 text-white rounded text-sm sm:text-base"
                  onClick={handleAddRow}
                >
                  Add New Item
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-cyan-800 text-white rounded text-sm sm:text-base"
                  onClick={() => {
                    setShowAddProductPopup(false);
                    setShowAddCategoryPopup(true);
                  }}
                >
                  Add Category
                </button>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-red-800 text-white rounded text-sm sm:text-base"
                  onClick={() => setShowAddProductPopup(false)}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-800 text-white rounded text-sm sm:text-base"
                >
                  Save Products
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  /* ────────────────────── ADD CATEGORY POPUP ────────────────────── */
  const AddCategoryPopup = () => {
    const [categoryName, setCategoryName] = useState('');

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!user || !authToken) {
        showToast('You need to log in to add a category.', true);
        navigate('/login');
        return;
      }
      if (!categoryName) {
        showToast('Please enter a category name.', true);
        return;
      }
      if (
        categories.some((c) => c.name.toLowerCase() === categoryName.toLowerCase())
      ) {
        showToast(`Category "${categoryName}" already exists.`, true);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ name: categoryName }),
        });
        if (!res.ok) throw new Error('Unable to add category.');
        const data = await res.json();
        showToast(`Category "${categoryName}" added!`, false);
        setCategories((prev) =>
          [...prev, data].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          )
        );
        setShowAddCategoryPopup(false);
      } catch (e) {
        console.error('Category add error:', e);
        showToast('Could not add the category.', true);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white p-4 sm:p-6 rounded shadow-lg w-full max-w-[95vw] sm:max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Add New Category</h2>
            <button
              onClick={() => setShowAddCategoryPopup(false)}
              className="text-cyan-700"
            >
              Close
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base mb-4"
              placeholder="Enter category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-800 text-white rounded text-sm sm:text-base"
            >
              Save Category
            </button>
          </form>
        </div>
      </div>
    );
  };

  /* ────────────────────── ADD UNIT POPUP ────────────────────── */
  const AddUnitPopup = () => {
    const [unitName, setUnitName] = useState('');

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!user || !authToken) {
        showToast('You need to log in to add a unit.', true);
        navigate('/login');
        return;
      }
      if (!unitName) {
        showToast('Please enter a unit name.', true);
        return;
      }
      if (units.some((u) => u.name.toLowerCase() === unitName.toLowerCase())) {
        showToast(`Unit "${unitName}" already exists.`, true);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/add-unit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ name: unitName }),
        });
        if (!res.ok) throw new Error('Unable to add unit.');
        const data = await res.json();
        showToast(`Unit "${unitName}" added!`, false);
        setUnits((prev) =>
          [...prev, data].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          )
        );
        setShowAddUnitPopup(false);
      } catch (e) {
        console.error('Unit add error:', e);
        showToast('Could not add the unit.', true);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white p-4 sm:p-6 rounded shadow-lg w-full max-w-[95vw] sm:max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Add New Unit</h2>
            <button
              onClick={() => setShowAddUnitPopup(false)}
              className="text-cyan-700"
            >
              Close
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base mb-4"
              placeholder="Enter unit name"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-800 text-white rounded text-sm sm:text-base"
            >
              Save Unit
            </button>
          </form>
        </div>
      </div>
    );
  };

  /* ────────────────────── INITIAL FETCH ────────────────────── */
  useEffect(() => {
    if (!user?.id || !authToken) {
      showToast('Session expired. Please log in again.', true);
      navigate('/login');
      return;
    }
    if (isDataFetched) return;

    Promise.all([fetchCategories(), fetchUnits(), fetchAllProducts()])
      .then(([cats, unis]) => {
        setCategories(cats);
        setUnits(unis);
        setIsDataFetched(true);
        fetchUserData();
        if (cats.length === 0)
          showToast('Add a category to get started!', false);
        if (unis.length === 0)
          showToast('No units – add some in the Units tab.', true);
      })
      .catch((e) => {
        console.error('Initial data fetch error:', e);
        showToast('Failed to load initial data.', true);
      });
  }, [
    user?.id,
    authToken,
    navigate,
    isDataFetched,
    fetchCategories,
    fetchUnits,
    fetchAllProducts,
    fetchUserData,
    showToast,
  ]);

  /* ────────────────────── RENDER ────────────────────── */
  return (
    <div className='p-6'>
      <Header
        title={showUnitSection ? 'Units Information' : 'Products'}
        bgColor="bg-gradient-to-r from-neutral-800 to-cyan-700 text-white"
        userName={userName}
        onProfileClick={() => navigate('/profile')}
      />
      <main className="flex-1 p-2 sm:p-6">
        {/* ── PRODUCTS SECTION ── */}
        <div
          className={`${
            showUnitSection ? 'hidden' : 'block'
          } bg-white rounded-lg shadow-lg overflow-hidden`}
        >
          <div className="p-4 sm:p-6">
            {/* Controls */}
    {/* Controls */}
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
      {/* Left: Title */}
      <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-left">
        All Products List
      </h3>

      {/* Right: Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-6 w-full lg:w-auto">
        {/* Search and Category Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm sm:text-base"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setAllProductsCurrentPage(1);
              }}
            />
          </div>
          <select
            className="w-full sm:w-48 border rounded-lg px-3 py-2 text-sm sm:text-base"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setAllProductsCurrentPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
          {user?.rid <= 7 && (
            <>
              <button
                className="px-4 py-2 bg-cyan-800 text-white rounded-lg text-sm sm:text-base flex items-center "
                onClick={() => setShowAddProductPopup(true)}
              >
               <FaPlus/>  Add Product
              </button>
              <button
                className="px-4 py-2 bg-cyan-800 text-white rounded-lg text-sm sm:text-base flex items-center"
                onClick={() => setShowUnitSection(true)}
              >
               <TbRulerMeasure /> Units
              </button>
            </>
          )}
        </div>
      </div>
    </div>
            {/* Table / List */}
            <div className=" p-4 rounded-lg">{displayProducts()}</div>
          </div>
        </div>
        {/* ── UNITS SECTION ── */}
        <div
          className={`${
            showUnitSection ? 'block' : 'hidden'
          } bg-white rounded-lg shadow-lg overflow-hidden`}
        >
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
              <button
                className="px-4 py-2 bg-cyan-800 text-white rounded-lg text-sm sm:text-base"
                onClick={() => {
                  setShowUnitSection(false);
                  fetchAllProducts();
                }}
              >
                Back to Products
              </button>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm sm:text-base"
                    placeholder="Search units..."
                    value={unitSearchTerm}
                    onChange={(e) => {
                      setUnitSearchTerm(e.target.value);
                      setUnitsCurrentPage(1);
                    }}
                  />
                </div>
                {user?.rid <= 7 && (
                  <button
                    className="px-4 py-2 bg-cyan-800 text-white rounded-lg text-sm sm:text-base"
                    onClick={() => setShowAddUnitPopup(true)}
                  >
                    Add Unit
                  </button>
                )}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">{displayUnits()}</div>
          </div>
        </div>
        {/* ── POPUPS ── */}
        {showAddProductPopup && <AddProductPopup />}
        {showAddCategoryPopup && <AddCategoryPopup />}
        {showAddUnitPopup && <AddUnitPopup />}
      </main>
    </div>
  );
};

export default Products;