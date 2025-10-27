import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = "http://127.0.0.1:8000/api";

const Products = () => {
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

  // Safe localStorage parsing
  const user = useMemo(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return {};
    try { return JSON.parse(stored); }
    catch { localStorage.removeItem('user'); return {}; }
  }, []);

  const authToken = useMemo(() => localStorage.getItem('authToken') || null, []);

  // Responsive: Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Toast Notification
  const showToast = (message, isError = false) => {
    const toast = document.createElement('div');
    toast.className = `fixed top-5 right-5 p-4 rounded shadow-lg z-50 text-sm sm:text-base ${isError ? 'bg-red-500' : 'bg-cyan-800'} text-white`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Unit Conversion Popup
  const showUnitConversionPopup = (unit) => {
    if (unit && ['kg', 'gram'].includes(unit.name.toLowerCase())) {
      const popup = document.createElement('div');
      popup.className = 'fixed top-5 right-5 bg-cyan-800 text-white p-4 rounded shadow-lg z-50 text-sm sm:text-base';
      popup.textContent = 'To buy in grams, select kg and enter the quantity in decimals (e.g., 0.25 kg = 250 g).';
      document.body.appendChild(popup);
      setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 300);
      }, 3000);
    }
  };

  // Fetch User Data
  const fetchUserData = async () => {
    if (!authToken || !user?.id) {
      showToast('Authentication token or user ID missing. Redirecting to login.', true);
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/user/${user.id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          navigate('/login');
          throw new Error('Unauthorized');
        }
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      const userData = await response.json();
      setUserName(userData.data?.name || 'User');
    } catch (error) {
      console.error('Error fetching user data:', error);
      showToast('Failed to load user data.', true);
    }
  };

  // Fetch All Products
  const fetchAllProducts = async () => {
    if (!user || !authToken) {
      showToast('You need to log in to view all products.', true);
      setAllProducts([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/products?cid=${user.cid}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!response.ok) throw new Error(`Unable to fetch all products. Status: ${response.status}`);
      const data = await response.json();
      const sortedProducts = (data.products || []).map(product => ({
        id: product.id,
        name: product.product_name || product.name || 'N/A',
        category: product.category_name || product.category || 'N/A',
        category_id: product.category_id || null,
        hscode: product.hscode || 'N/A',
        description: product.description || 'N/A',
        display_name: product.product_name || product.name || 'N/A',
        display_hscode: product.hscode || 'N/A',
        primary_unit: product.primary_unit ? product.primary_unit.replace(/,$/, '') : 'N/A',
        secondary_unit: product.secondary_unit ? product.secondary_unit.replace(/,$/, '') : 'N/A',
        c_factor: product.c_factor || 'N/A',
        p_unit_id: product.p_unit,
        s_unit_id: product.s_unit,
      })).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      setAllProducts(sortedProducts);
      if (sortedProducts.length === 0) {
        showToast('No products found.', false);
      }
    } catch (error) {
      console.error('Error fetching all products:', error);
      showToast('Something went wrong while fetching all products.', true);
      setAllProducts([]);
    }
  };

  // Fetch Categories
  const fetchCategories = async () => {
    if (!authToken) {
      showToast('You need to log in to view categories.', true);
      return [];
    }
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!response.ok) throw new Error('Unable to fetch categories.');
      const data = await response.json();
      const categories = Array.isArray(data.categories) ? data.categories : [];
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      showToast('Couldn’t load categories. Please try again later.', true);
      return [];
    }
  };

  // Fetch Units
  const fetchUnits = async () => {
    if (!authToken) {
      showToast('You need to log in to fetch units.', true);
      return [];
    }
    try {
      const response = await fetch(`${API_BASE_URL}/units`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Unable to fetch units: ${response.status}`);
      }
      const data = await response.json();
      const fetchedUnits = Array.isArray(data.units) ? data.units : Array.isArray(data) ? data : [];
      const sortedUnits = fetchedUnits.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
      return sortedUnits;
    } catch (error) {
      console.error('Error fetching units:', error);
      showToast('Couldn’t load units. Please try again later.', true);
      return [];
    }
  };

  // Filter Products
  const filteredProducts = useMemo(() => {
    return allProducts
      .filter(product => {
        const matchesSearch =
          product.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.display_hscode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || String(product.category_id) === String(categoryFilter);
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }, [allProducts, searchTerm, categoryFilter]);

  // Filter Units
  const filteredUnits = useMemo(() => {
    return units
      .filter(unit => unit.name.toLowerCase().includes(unitSearchTerm.toLowerCase()))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }, [units, unitSearchTerm]);

  // Pagination
  const paginate = (items, page) => {
    const start = (page - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  };

  const Pagination = ({ total, page, type }) => {
    const totalPages = Math.ceil(total / itemsPerPage);
    const maxPagesToShow = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage < startPage + maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="flex items-center justify-center space-x-2 mt-4">
        <button
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm sm:text-base"
          disabled={page === 1 || total === 0}
          onClick={() => type === 'products' ? setAllProductsCurrentPage(page - 1) : setUnitsCurrentPage(page - 1)}
        >
          Previous
        </button>
        {total > 0 ? (
          pages.map(p => (
            <button
              key={p}
              className={`px-3 py-1 rounded ${p === page ? 'bg-cyan-800 text-white' : 'bg-gray-200'} text-sm sm:text-base`}
              onClick={() => type === 'products' ? setAllProductsCurrentPage(p) : setUnitsCurrentPage(p)}
            >
              {p}
            </button>
          ))
        ) : (
          <button className="px-3 py-1 bg-cyan-800 text-white rounded text-sm sm:text-base" disabled>1</button>
        )}
        <button
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm sm:text-base"
          disabled={page === totalPages || total === 0}
          onClick={() => type === 'products' ? setAllProductsCurrentPage(page + 1) : setUnitsCurrentPage(page + 1)}
        >
          Next
        </button>
        <span className="text-sm sm:text-base">{total} total</span>
      </div>
    );
  };

  // Start Editing
  const startEdit = (product) => {
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Save Edit
  const saveEdit = async () => {
    if (!editingId) return;

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
      const response = await fetch(`${API_BASE_URL}/products/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      if (response.ok) {
        showToast('Product updated successfully!');
        const updatedProduct = JSON.parse(responseText).product;
        setAllProducts(prev =>
          prev.map(p =>
            p.id === editingId
              ? {
                  ...p,
                  name: updatedProduct.name,
                  category_id: updatedProduct.category_id,
                  category: categories.find(cat => cat.id === updatedProduct.category_id)?.name || 'N/A',
                  hscode: updatedProduct.hscode,
                  description: updatedProduct.description || 'N/A',
                  primary_unit: units.find(unit => unit.id === updatedProduct.p_unit)?.name || 'N/A',
                  secondary_unit: units.find(unit => unit.id === updatedProduct.s_unit)?.name || 'N/A',
                  c_factor: updatedProduct.c_factor || 'N/A',
                  display_name: updatedProduct.name || 'N/A',
                  display_hscode: updatedProduct.hscode || 'N/A',
                  p_unit_id: updatedProduct.p_unit,
                  s_unit_id: updatedProduct.s_unit,
                }
              : p
          ).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
        );
        cancelEdit();
      } else {
        let errorMessage = 'Couldn’t update the product.';
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.errors) {
            const messages = Object.entries(errorData.errors).flatMap(([field, errs]) =>
              errs.map(err => `${field}: ${err}`)
            );
            errorMessage = messages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else {
            errorMessage = responseText;
          }
        } catch (e) {
          errorMessage = responseText || 'Unknown server error.';
        }
        showToast(`Failed to update product: ${errorMessage}`, true);
      }
    } catch (error) {
      showToast(`Couldn’t update product: ${error.message}`, true);
    }
  };

  // Display Products
  const displayProducts = () => {
    const paginatedProducts = paginate(filteredProducts, allProductsCurrentPage);
    const showActions = user && user.rid <= 7;

    if (isMobile) {
      return (
        <div className="space-y-4">
          {paginatedProducts.length === 0 ? (
            <div className="text-center py-6 text-sm text-cyan-700">
              {filteredProducts.length > 0 ? 'No products on this page' : 'No products available'}
            </div>
          ) : (
            paginatedProducts.map((product, index) => {
              const isEditing = editingId === product.id;
              const idx = (allProductsCurrentPage - 1) * itemsPerPage + index + 1;

              return (
                <div key={product.id} className="bg-white border rounded-lg p-4 shadow-sm">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.name || ''}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Product Name *"
                        required
                      />
                      <select
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.category_id || ''}
                        onChange={e => setEditForm({ ...editForm, category_id: e.target.value })}
                      >
                        <option value="" disabled>Select Category</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.hscode || ''}
                        onChange={e => setEditForm({ ...editForm, hscode: e.target.value })}
                        placeholder="HSCODE"
                      />
                      <select
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.p_unit || ''}
                        onChange={e => {
                          setEditForm({ ...editForm, p_unit: e.target.value });
                          showUnitConversionPopup(units.find(u => u.id == e.target.value));
                        }}
                      >
                        <option value="" disabled>Select Primary Unit</option>
                        {units.map(unit => (
                          <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                      </select>
                      <select
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.s_unit || ''}
                        onChange={e => {
                          setEditForm({ ...editForm, s_unit: e.target.value });
                          showUnitConversionPopup(units.find(u => u.id == e.target.value));
                        }}
                      >
                        <option value="" disabled>Select Secondary Unit</option>
                        {units.map(unit => (
                          <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="any"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.c_factor || ''}
                        onChange={e => setEditForm({ ...editForm, c_factor: e.target.value })}
                        placeholder="Conversion Factor"
                      />
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editForm.description || ''}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Description"
                      />
                      <div className="flex space-x-2">
                        <button className="flex-1 px-3 py-1 bg-cyan-700 text-white rounded text-sm" onClick={saveEdit}>Save</button>
                        <button className="flex-1 px-3 py-1 bg-gray-500 text-white rounded text-sm" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-base">
                          {idx}. {product.display_name || 'N/A'}
                        </div>
                        {showActions && (
                          <button
                            className="px-2 py-1 bg-cyan-800 text-white rounded text-xs hover:bg-red-500"
                            onClick={() => startEdit(product)}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      <div><strong>Category:</strong> {product.category || 'N/A'}</div>
                      <div><strong>HScode:</strong> {product.display_hscode || 'N/A'}</div>
                      <div><strong>P. Unit:</strong> {product.primary_unit || 'N/A'}</div>
                      <div><strong>S. Unit:</strong> {product.secondary_unit || 'N/A'}</div>
                      <div><strong>CF:</strong> {product.c_factor || 'N/A'}</div>
                      <div><strong>Description :</strong> {product.description || 'N/A'}</div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <Pagination total={filteredProducts.length} page={allProductsCurrentPage} type="products" />
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">S.No</th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">Product Name</th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">Category</th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">HScode</th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">P. Unit</th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">S. Unit</th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">CF</th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">Description</th>
              {showActions && <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 9 : 8} className="py-2 px-3 sm:px-4 border text-center text-sm sm:text-base">
                  {filteredProducts.length > 0 ? 'No products on this page' : 'No products available'}
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product, index) => {
                const isEditing = editingId === product.id;
                const idx = (allProductsCurrentPage - 1) * itemsPerPage + index + 1;

                return (
                  <tr key={product.id}>
                    <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">{idx}</td>

                    {isEditing ? (
                      <>
                        <td className="py-2 px-3 sm:px-4 border">
                          <input
                            type="text"
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.name || ''}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            required
                          />
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <select
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.category_id || ''}
                            onChange={e => setEditForm({ ...editForm, category_id: e.target.value })}
                            required
                          >
                            <option value="" disabled>Select Category</option>
                            {categories.map(category => (
                              <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <input
                            type="text"
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.hscode || ''}
                            onChange={e => setEditForm({ ...editForm, hscode: e.target.value })}
                          />
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <select
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.p_unit || ''}
                            onChange={e => {
                              setEditForm({ ...editForm, p_unit: e.target.value });
                              showUnitConversionPopup(units.find(u => u.id == e.target.value));
                            }}
                          >
                            <option value="" disabled>Select Primary Unit</option>
                            {units.map(unit => (
                              <option key={unit.id} value={unit.id}>{unit.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <select
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.s_unit || ''}
                            onChange={e => {
                              setEditForm({ ...editForm, s_unit: e.target.value });
                              showUnitConversionPopup(units.find(u => u.id == e.target.value));
                            }}
                          >
                            <option value="" disabled>Select Secondary Unit</option>
                            {units.map(unit => (
                              <option key={unit.id} value={unit.id}>{unit.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <input
                            type="number"
                            step="any"
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.c_factor || ''}
                            onChange={e => setEditForm({ ...editForm, c_factor: e.target.value })}
                          />
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <input
                            type="text"
                            className="w-full border rounded px-2 py-1 text-sm sm:text-base"
                            value={editForm.description || ''}
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          />
                        </td>
                        <td className="py-2 px-3 sm:px-4 border">
                          <button
                            className="px-2 py-1 bg-cyan-700 text-white rounded text-xs mr-1"
                            onClick={saveEdit}
                          >
                            Save
                          </button>
                          <button
                            className="px-2 py-1 bg-gray-500 text-white rounded text-xs"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">{product.display_name || 'N/A'}</td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">{product.category || 'N/A'}</td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">{product.display_hscode || 'N/A'}</td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">{product.primary_unit || 'N/A'}</td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">{product.secondary_unit || 'N/A'}</td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">{product.c_factor || 'N/A'}</td>
                        <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">{product.description || 'N/A'}</td>
                        {showActions && (
                          <td className="py-2 px-3 sm:px-4 border">
                            <button
                              className="px-2 py-1 bg-cyan-800 text-white rounded text-xs"
                              onClick={() => startEdit(product)}
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
        <Pagination total={filteredProducts.length} page={allProductsCurrentPage} type="products" />
      </div>
    );
  };

  // Display Units
  const displayUnits = () => {
    const paginatedUnits = paginate(filteredUnits, unitsCurrentPage);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">S.No</th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">Unit Name</th>
              <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUnits.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-2 px-3 sm:px-4 border text-center text-sm sm:text-base">
                  {filteredUnits.length > 0 ? 'No units on this page' : 'No units available'}
                </td>
              </tr>
            ) : (
              paginatedUnits.map((unit, index) => (
                <tr key={unit.id}>
                  <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">
                    {(unitsCurrentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">{unit.name}</td>
                  <td className="py-2 px-3 sm:px-4 border">
                    <button className="px-2 py-1 bg-cyan-800 text-white rounded text-xs">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination total={filteredUnits.length} page={unitsCurrentPage} type="units" />
      </div>
    );
  };

  // Add Product Popup
  const AddProductPopup = () => {
    const [productRows, setProductRows] = useState([
      { id: 1, name: '', category_id: '', hscode: '', p_unit: '', s_unit: '', c_factor: '', description: '' },
    ]);
    const inputRefs = useRef([]);

    const handleAddRow = () => {
      setProductRows([...productRows, {
        id: productRows.length + 1,
        name: '', category_id: '', hscode: '', p_unit: '', s_unit: '', c_factor: '', description: ''
      }]);
    };

    const handleRemoveRow = (id) => {
      setProductRows(productRows.filter(row => row.id !== id));
    };

    const handleInputChange = (id, field, value) => {
      setProductRows(productRows.map(row =>
        row.id === id ? { ...row, [field]: value } : row
      ));
      if (field === 'p_unit' || field === 's_unit') {
        const selectedUnit = units.find(unit => unit.id == value);
        showUnitConversionPopup(selectedUnit);
      }
    };

    useEffect(() => {
      if (isMobile) return;
      productRows.forEach((row, index) => {
        const input = inputRefs.current[index];
        if (!input) return;

        const wrapper = input.parentNode;
        let suggestionList = wrapper.querySelector('ul');
        if (!suggestionList) {
          suggestionList = document.createElement('ul');
          suggestionList.style.cssText = `
            position: absolute; top: 100%; left: 0; right: 0; background: white;
            border: 1px solid #ddd; border-radius: 4px; list-style: none; margin: 0; padding: 0;
            z-index: 1000; max-height: 150px; overflow-y: auto; display: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          `;
          wrapper.appendChild(suggestionList);
        }

        const showSuggestions = (query) => {
          suggestionList.innerHTML = '';
          if (query.length < 1) {
            suggestionList.style.display = 'none';
            return;
          }
          const filteredProducts = allProducts
            .filter(product => product.display_name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);
          if (filteredProducts.length > 0) {
            filteredProducts.forEach(product => {
              const li = document.createElement('li');
              li.style.cssText = 'padding: 8px 12px; cursor: pointer; transition: background-color 0.2s;';
              li.textContent = product.display_name;
              li.addEventListener('mouseover', () => li.style.backgroundColor = '#f0f0f0');
              li.addEventListener('mouseout', () => li.style.backgroundColor = 'white');
              li.addEventListener('click', () => {
                input.value = product.display_name;
                handleInputChange(row.id, 'name', product.display_name);
                suggestionList.innerHTML = '';
                suggestionList.style.display = 'none';
              });
              suggestionList.appendChild(li);
            });
            suggestionList.style.display = 'block';
          } else {
            suggestionList.style.display = 'none';
          }
        };

        const handleInput = () => showSuggestions(input.value.trim());
        const handleBlur = () => setTimeout(() => suggestionList.style.display = 'none', 200);
        const handleFocus = () => input.value.trim().length > 0 && showSuggestions(input.value.trim());

        input.addEventListener('input', handleInput);
        input.addEventListener('blur', handleBlur);
        input.addEventListener('focus', handleFocus);

        return () => {
          input.removeEventListener('input', handleInput);
          input.removeEventListener('blur', handleBlur);
          input.removeEventListener('focus', handleFocus);
        };
      });
    }, [productRows, isMobile, allProducts]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!user || !authToken) {
        showToast('You need to log in to add products.', true);
        navigate('/login');
        return;
      }
      let hasError = false;

      const products = productRows.map(row => ({
        name: row.name.trim(),
        category_id: row.category_id ? parseInt(row.category_id, 10) : null,
        hscode: row.hscode ? row.hscode.trim() : null,
        p_unit: row.p_unit ? parseInt(row.p_unit, 10) : null,
        s_unit: row.s_unit ? parseInt(row.s_unit, 10) : null,
        c_factor: row.c_factor ? parseFloat(row.c_factor) : null,
        description: row.description ? row.description.trim() : null,
      }));

      products.forEach((product, index) => {
        if (!product.name) {
          showToast(`Product ${index + 1}: Name is required.`, true);
          hasError = true;
        }
        if (!product.category_id || isNaN(product.category_id)) {
          showToast(`Product ${index + 1}: Category is required.`, true);
          hasError = true;
        }
        if (allProducts.some(p => p.display_name.toLowerCase() === product.name.toLowerCase())) {
          showToast(`Product ${index + 1}: "${product.name}" already exists.`, true);
          hasError = true;
        }
        if (product.p_unit && !units.some(u => u.id === product.p_unit)) {
          showToast(`Product ${index + 1}: Invalid primary unit.`, true);
          hasError = true;
        }
        if (product.s_unit && !units.some(u => u.id === product.s_unit)) {
          showToast(`Product ${index + 1}: Invalid secondary unit.`, true);
          hasError = true;
        }
        if (product.c_factor && (isNaN(product.c_factor) || product.c_factor <= 0)) {
          showToast(`Product ${index + 1}: Conversion factor must be a positive number.`, true);
          hasError = true;
        }
        if (product.hscode && product.hscode.length > 50) {
          showToast(`Product ${index + 1}: HSCODE must not exceed 50 characters.`, true);
          hasError = true;
        }
        if (product.name.length > 255) {
          showToast(`Product ${index + 1}: Name must not exceed 255 characters.`, true);
          hasError = true;
        }
      });

      if (hasError) return;
      if (products.length === 0) {
        showToast('No products to save. Add at least one item.', true);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ products }),
        });
        const responseText = await response.text();
        if (response.ok) {
          showToast('Products saved successfully!', false);
          const responseData = JSON.parse(responseText);
          const newProducts = responseData.products || [];
          const newAllProducts = newProducts.map(newProduct => ({
            id: newProduct.id,
            name: newProduct.name,
            category_id: newProduct.category_id,
            category: categories.find(cat => cat.id === newProduct.category_id)?.name || 'N/A',
            hscode: newProduct.hscode,
            description: newProduct.description || 'N/A',
            display_name: newProduct.name || 'N/A',
            display_hscode: newProduct.hscode || 'N/A',
            primary_unit: units.find(unit => unit.id === newProduct.p_unit)?.name || 'N/A',
            secondary_unit: units.find(unit => unit.id === newProduct.s_unit)?.name || 'N/A',
            c_factor: newProduct.c_factor || 'N/A',
            p_unit_id: newProduct.p_unit,
            s_unit_id: newProduct.s_unit,
          }));
          setAllProducts([...allProducts, ...newAllProducts].sort((a, b) =>
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          ));
          setShowAddProductPopup(false);
        } else {
          let errorMessage = 'Failed to save products.';
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.errors) {
              const messages = Object.entries(errorData.errors).flatMap(([field, errs]) =>
                errs.map(err => `${field}: ${err}`)
              );
              errorMessage = messages.join('; ');
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else {
              errorMessage = responseText;
            }
          } catch (e) {
            errorMessage = responseText || 'Unknown server error.';
          }
          showToast(`Failed to save products: ${errorMessage}`, true);
        }
      } catch (error) {
        showToast(`Couldn’t save products: ${error.message}`, true);
      }
    };

    if (isMobile) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Add New Product</h2>
              <button onClick={() => setShowAddProductPopup(false)} className="text-cyan-700">
                Close
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {productRows.map((row, index) => (
                <div key={row.id} className="border rounded p-3 space-y-3 relative">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">Item {index + 1}</span>
                    {productRows.length > 1 && (
                      <button type="button" className="text-red-500 text-xs" onClick={() => handleRemoveRow(row.id)}>Remove</button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Product Name *</label>
                    <input type="text" className="w-full border rounded px-2 py-1 text-sm" placeholder="e.g., Laptop" value={row.name} onChange={e => handleInputChange(row.id, 'name', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Category *</label>
                    <select className="w-full border rounded px-2 py-1 text-sm" value={row.category_id} onChange={e => handleInputChange(row.id, 'category_id', e.target.value)} required>
                      <option value="" disabled>Select Category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">HSCODE</label>
                    <input type="text" className="w-full border rounded px-2 py-1 text-sm" placeholder="e.g., LAP123" value={row.hscode} onChange={e => handleInputChange(row.id, 'hscode', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Primary Unit</label>
                    <select className="w-full border rounded px-2 py-1 text-sm" value={row.p_unit} onChange={e => handleInputChange(row.id, 'p_unit', e.target.value)}>
                      <option value="" disabled>Select Primary Unit</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Secondary Unit</label>
                    <select className="w-full border rounded px-2 py-1 text-sm" value={row.s_unit} onChange={e => handleInputChange(row.id, 's_unit', e.target.value)}>
                      <option value="" disabled>Select Secondary Unit</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Conversion Factor</label>
                    <input type="number" step="any" className="w-full border rounded px-2 py-1 text-sm" placeholder="e.g., 25.5" value={row.c_factor} onChange={e => handleInputChange(row.id, 'c_factor', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Description</label>
                    <input type="text" className="w-full border rounded px-2 py-1 text-sm" placeholder="e.g., Product details" value={row.description} onChange={e => handleInputChange(row.id, 'description', e.target.value)} />
                  </div>
                </div>
              ))}
              <div className="flex flex-col space-y-2">
                <button type="button" className="px-4 py-2 bg-cyan-800 text-white rounded text-sm" onClick={handleAddRow}>Add Another Item</button>
                <button type="button" className="px-4 py-2 bg-cyan-800 text-white rounded text-sm" onClick={() => { setShowAddProductPopup(false); setShowAddCategoryPopup(true); }}>Add Category</button>
                <div className="flex space-x-2">
                  <button type="button" className="flex-1 px-4 py-2 bg-red-800 text-white rounded text-sm" onClick={() => setShowAddProductPopup(false)}>Close</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-cyan-700 text-white rounded text-sm">Save All</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white p-4 sm:p-6 rounded shadow-lg w-full max-w-[95vw] sm:max-w-3xl md:max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Add New Product</h2>
            <button onClick={() => setShowAddProductPopup(false)} className="text-cyan-700">
              Close
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border">
                <thead>
                  <tr>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base w-[60px] sm:w-[80px]">S.No</th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[150px]">Product Name</th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[120px]">Category</th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[100px]">HSCODE</th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[100px] sm:min-w-[120px]">P. Unit</th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[100px] sm:min-w-[120px]">S. Unit</th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[100px] sm:min-w-[120px]">CF</th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base min-w-[150px]">Description</th>
                    <th className="py-2 px-3 sm:px-4 border text-sm sm:text-base w-[80px] sm:w-[100px]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((row, index) => (
                    <tr key={row.id}>
                      <td className="py-2 px-3 sm:px-4 border text-sm sm:text-base">{row.id}</td>
                      <td className="py-2 px-3 sm:px-4 border relative">
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base"
                          placeholder="e.g., Laptop"
                          value={row.name}
                          onChange={e => handleInputChange(row.id, 'name', e.target.value)}
                          required
                          ref={el => (inputRefs.current[index] = el)}
                        />
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <select className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base" value={row.category_id} onChange={e => handleInputChange(row.id, 'category_id', e.target.value)} required>
                          <option value="" disabled>Select Category</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <input type="text" className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base" placeholder="e.g., LAP123" value={row.hscode} onChange={e => handleInputChange(row.id, 'hscode', e.target.value)} />
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <select className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base" value={row.p_unit} onChange={e => handleInputChange(row.id, 'p_unit', e.target.value)}>
                          <option value="" disabled>Select Primary Unit</option>
                          {units.map(unit => (
                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <select className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base" value={row.s_unit} onChange={e => handleInputChange(row.id, 's_unit', e.target.value)}>
                          <option value="" disabled>Select Secondary Unit</option>
                          {units.map(unit => (
                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <input type="number" step="any" className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base" placeholder="e.g., 25.5" value={row.c_factor} onChange={e => handleInputChange(row.id, 'c_factor', e.target.value)} />
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <input type="text" className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base" placeholder="e.g., Product details" value={row.description} onChange={e => handleInputChange(row.id, 'description', e.target.value)} />
                      </td>
                      <td className="py-2 px-3 sm:px-4 border">
                        <button type="button" className="px-2 py-1 bg-red-500 text-white rounded text-sm sm:text-base" onClick={() => handleRemoveRow(row.id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button type="button" className="px-4 py-2 bg-cyan-800 text-white rounded text-sm sm:text-base" onClick={handleAddRow}>Add New Item</button>
                <button type="button" className="px-4 py-2 bg-cyan-800 text-white rounded text-sm sm:text-base" onClick={() => { setShowAddProductPopup(false); setShowAddCategoryPopup(true); }}>Add Category</button>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button type="button" className="px-4 py-2 bg-red-800 text-white rounded text-sm sm:text-base" onClick={() => setShowAddProductPopup(false)}>Close</button>
                <button type="submit" className="px-4 py-2 bg-cyan-800 text-white rounded text-sm sm:text-base">Save Products</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Add Category Popup
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
        showToast('Please enter a category name to add.', true);
        return;
      }
      if (categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase())) {
        showToast(`Category "${categoryName}" is already in the list.`, true);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ name: categoryName }),
        });
        if (!response.ok) throw new Error('Unable to add category.');
        const data = await response.json();
        showToast(`Category "${categoryName}" added successfully!`, false);
        setCategories([...categories, data]);
        setShowAddCategoryPopup(false);
        window.location.reload();
      } catch (error) {
        showToast('Couldn’t add the category. Please try again.', true);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white p-4 sm:p-6 rounded shadow-lg w-full max-w-[95vw] sm:max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Add New Category</h2>
            <button onClick={() => setShowAddCategoryPopup(false)} className="text-cyan-700">
              Close
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base mb-4"
              placeholder="Enter category name"
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              required
            />
            <button type="submit" className="px-4 py-2 bg-cyan-800 text-white rounded text-sm sm:text-base">Save Category</button>
          </form>
        </div>
      </div>
    );
  };

  // Add Unit Popup
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
        showToast('Please enter a unit name to add.', true);
        return;
      }
      if (units.some(unit => unit.name.toLowerCase() === unitName.toLowerCase())) {
        showToast(`Unit "${unitName}" is already in the list.`, true);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/add-unit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ name: unitName }),
        });
        if (!response.ok) throw new Error('Unable to add unit.');
        const data = await response.json();
        showToast(`Unit "${unitName}" added successfully!`, false);
        setUnits([...units, data].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
        setShowAddUnitPopup(false);
        window.location.reload();
      } catch (error) {
        showToast('Couldn’t add the unit. Please try again.', true);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white p-4 sm:p-6 rounded shadow-lg w-full max-w-[95vw] sm:max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Add New Unit</h2>
            <button onClick={() => setShowAddUnitPopup(false)} className="text-cyan-700">
              Close
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base mb-4"
              placeholder="Enter unit name"
              value={unitName}
              onChange={e => setUnitName(e.target.value)}
              required
            />
            <button type="submit" className="px-4 py-2 bg-cyan-800 text-white rounded text-sm sm:text-base">Save Unit</button>
          </form>
        </div>
      </div>
    );
  };

  // Header
  const Header = ({ title }) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
      <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/profile')}>
          <i className="fas fa-user-circle text-xl sm:text-2xl"></i>
          <span className="text-sm sm:text-base">{userName}</span>
        </div>
        {!showUnitSection ? (
          <>
            <div className="relative w-full sm:w-auto">
              <i className="fas fa-search absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                className="w-full sm:w-64 pl-8 pr-2 py-1 h-10 sm:h-12 border rounded text-sm sm:text-base"
                placeholder="Search all products..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setAllProductsCurrentPage(1); }}
              />
            </div>
            <select
              className="w-full sm:w-48 border rounded px-2 py-1 h-10 sm:h-12 text-sm sm:text-base"
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setAllProductsCurrentPage(1); }}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {user && user.rid <= 7 && (
              <>
                <button className="w-full sm:w-auto px-4 py-2 bg-cyan-800 text-white rounded flex items-center text-sm sm:text-base" onClick={() => setShowAddProductPopup(true)}>
                  Add Product
                </button>
                <button className="w-full sm:w-auto px-4 py-2 bg-cyan-800 text-white rounded flex items-center text-sm sm:text-base" onClick={() => setShowUnitSection(true)}>
                  Units
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button className="w-full sm:w-auto px-4 py-2 bg-cyan-800 text-white rounded flex items-center text-sm sm:text-base" onClick={() => { setShowUnitSection(false); fetchAllProducts(); }}>
              Back
            </button>
            <div className="relative w-full sm:w-auto">
              <i className="fas fa-search absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                className="w-full sm:w-64 pl-8 pr-2 py-1 h-10 sm:h-12 border rounded text-sm sm:text-base"
                placeholder="Search units..."
                value={unitSearchTerm}
                onChange={e => { setUnitSearchTerm(e.target.value); setUnitsCurrentPage(1); }}
              />
            </div>
            {user && user.rid <= 7 && (
              <button className="w-full sm:w-auto px-4 py-2 bg-cyan-800 text-white rounded flex items-center text-sm sm:text-base" onClick={() => setShowAddUnitPopup(true)}>
                Add Unit
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Initial Fetch
  useEffect(() => {
    if (!user || !user.id || !authToken) {
      showToast('Session expired or invalid. Please log in again.', true);
      navigate('/login');
      return;
    }
    if (isDataFetched) return;

    Promise.all([fetchCategories(), fetchUnits(), fetchAllProducts()])
      .then(([fetchedCategories, fetchedUnits]) => {
        setCategories(fetchedCategories);
        setUnits(fetchedUnits);
        setIsDataFetched(true);
        if (fetchedCategories.length === 0) {
          showToast('No categories available yet. Add one to get started!', false);
        }
        if (fetchedUnits.length === 0) {
          showToast('No units available. Please add units in the Units section.', true);
        }
        fetchUserData();
      })
      .catch(error => {
        showToast('Failed to load initial data. Please try again.', true);
      });
  }, [user, authToken, navigate, isDataFetched]);

  return (
    <main className="flex-1 p-2 sm:p-6">
      <div className={`${showUnitSection ? 'hidden' : ''}`}>
        <Header title="Products" />
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg sm:text-xl font-semibold">All Products List</h3>
          </div>
          {displayProducts()}
        </div>
      </div>
      <div className={`${showUnitSection ? '' : 'hidden'}`}>
        <Header title="Units" />
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg sm:text-xl font-semibold mb-4">All Units</h3>
          {displayUnits()}
        </div>
      </div>
      {showAddProductPopup && <AddProductPopup />}
      {showAddCategoryPopup && <AddCategoryPopup />}
      {showAddUnitPopup && <AddUnitPopup />}
    </main>
  );
};

export default Products;