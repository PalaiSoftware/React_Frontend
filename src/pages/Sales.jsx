'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Download, Edit, Trash2,
  ChevronLeft, ChevronRight, X, Save, RotateCcw, Calculator
} from 'lucide-react';

// ---------------------------------------------------------------------
// API Base URL
// ---------------------------------------------------------------------
const API_BASE_URL = "http://127.0.0.1:8000/api";

const paymentModeMap = {
  credit_card: 1, debit_card: 2, cash: 3, upi: 4,
  bank_transfer: 5, phonepe: 6
};
const reversePaymentModeMap = Object.fromEntries(
  Object.entries(paymentModeMap).map(([k, v]) => [v, k])
);

// ---------------------------------------------------------------------
// Helper – populate unit <select>
// ---------------------------------------------------------------------
const populateUnitDropdown = (select, units) => {
  if (!select) return;
  select.innerHTML = '<option value="">Select</option>';
  units.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name;
    select.appendChild(opt);
  });
  if (units.length > 0) select.value = units[0].id;
};

// ---------------------------------------------------------------------
// fetch units + pricing
// ---------------------------------------------------------------------
const handleProductSelection = async (row, productId) => {
  if (!productId) return;
  const token = localStorage.getItem('authToken');
  try {
    const response = await fetch(`${API_BASE_URL}/units/${productId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Network error: ${response.status} - ${errorText}`);
    }
    const result = await response.json();
    const productInfo = result.product_info || {};
    const units = Array.isArray(result.units) ? result.units : [];

    const unitSelect = row.querySelector('.sale-unit');
    populateUnitDropdown(unitSelect, units);

    const discountInput = row.querySelector('.sale-discount');
    const gstInput = row.querySelector('.sale-gst');
    const costInput = row.querySelector('.sale-cost');

    if (discountInput) discountInput.value = '0.00';
    if (gstInput) gstInput.value = '0.00';
    if (costInput) costInput.value = parseFloat(productInfo.post_gst_sale_cost || 0).toFixed(2);

    // ---- Update React state (keep product_name) ----
    const rowId = row.dataset.rowId;
    const isEdit = row.classList.contains('edit-row');
    const setState = isEdit ? setEditRowData : setSaleItems;

    setState(prev => {
      const items = Array.isArray(isEdit ? prev?.items : prev) ? (isEdit ? prev.items : prev) : [];
      return isEdit
        ? {
            ...prev,
            items: items.map(i =>
              i.id === rowId
                ? {
                    ...i,
                    product_id: productId,
                    product_name: row.querySelector(`input[id*="-product-input-"]`).value, // keep name
                    unit_id: units.length > 0 ? units[0].id : '',
                    discount: 0,
                    gst: 0,
                    cost: parseFloat(productInfo.post_gst_sale_cost || 0),
                    total: calculateRowTotal({
                      ...i,
                      product_id: productId,
                      unit_id: units.length > 0 ? units[0].id : '',
                      discount: 0,
                      gst: 0,
                      cost: parseFloat(productInfo.post_gst_sale_cost || 0),
                      quantity: i.quantity || 1
                    })
                  }
                : i
            )
          }
        : items.map(i =>
            i.id === rowId
              ? {
                  ...i,
                  product_id: productId,
                  product_name: row.querySelector(`input[id*="-product-input-"]`).value, // keep name
                  unit_id: units.length > 0 ? units[0].id : '',
                  discount: 0,
                  gst: 0,
                  cost: parseFloat(productInfo.post_gst_sale_cost || 0),
                  total: calculateRowTotal({
                    ...i,
                    product_id: productId,
                    unit_id: units.length > 0 ? units[0].id : '',
                    discount: 0,
                    gst: 0,
                    cost: parseFloat(productInfo.post_gst_sale_cost || 0),
                    quantity: i.quantity || 1
                  })
                }
              : i
          );
    });
  } catch (error) {
    console.error('Error fetching product details or units:', error);
    showToast(`Failed to fetch product details or units: ${error.message}`, true);
  }
};

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
export default function SalesDashboard() {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage] = useState(50);
  const [showSearchCustomer, setShowSearchCustomer] = useState(false);
  const [showAddSale, setShowAddSale] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [editRowData, setEditRowData] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState('');

  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const cid = user.cid;
  const currency = JSON.parse(localStorage.getItem('selectedCompany') || '{}')?.currency || '₹';

  const autocompleteRefs = useRef({});

  // -----------------------------------------------------------------
  // Toast
  // -----------------------------------------------------------------
  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  };

  // -----------------------------------------------------------------
  // Fetch Data
  // -----------------------------------------------------------------
  const fetchSales = async () => {
    if (!token || !cid) return showToast('Login required', true);
    try {
      const res = await fetch(`${API_BASE_URL}/sales/company/${cid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch sales');
      const data = await res.json();
      setSales(data.data || []);
      setFilteredSales(data.data || []);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers?cid=${cid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const custs = (data.sales_clients || []).map(c => ({
        id: c.id,
        name: c.name || 'N/A',
        pan: c.pan || 'N/A',
        gst_no: c.gst_no || 'N/A',
        phone: c.phone || 'N/A',
        email: c.email || 'N/A'
      }));
      setAllCustomers(custs);
      setCustomers(custs);
    } catch (err) {
      showToast('Failed to load customers', true);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/stock/${cid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      const normalized = (Array.isArray(data) ? data : []).map(p => ({
        ...p,
        selling_price: parseFloat(p.selling_price) || 0
      }));

      setProducts(normalized);
    } catch (err) {
      showToast('Failed to load products', true);
    }
  };

  useEffect(() => {
    if (token && cid) {
      fetchSales();
      fetchCustomers();
      fetchProducts();
    }
  }, [token, cid]);

  // -----------------------------------------------------------------
  // Search & Pagination
  // -----------------------------------------------------------------
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = sales.filter(s =>
      s.transaction_id?.toString().includes(term) ||
      s.customer_name?.toLowerCase().includes(term) ||
      s.bill_name?.toLowerCase().includes(term) ||
      s.date?.toLowerCase().includes(term)
    );
    setFilteredSales(filtered);
    setCurrentPage(1);
  }, [searchTerm, sales]);

  const paginated = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  // -----------------------------------------------------------------
  // Calculations
  // -----------------------------------------------------------------
  const calculateRowTotal = (item) => {
    let total = item.quantity * item.cost;
    total = total - (total * (item.discount || 0)) / 100;
    total = total + (total * (item.gst || 0)) / 100;
    return parseFloat(total.toFixed(2));
  };

  // ---- FIXED recalculateAll – keep product_name ----
  const recalculateAll = (items, setItems) => {
    if (!Array.isArray(items)) return;
    setItems(items.map(item => ({
      ...item,
      total: calculateRowTotal(item)
    })));
  };

  const getFinalTotal = (items) => {
    return (Array.isArray(items) ? items.reduce((sum, i) => sum + i.total, 0) : 0).toFixed(2);
  };

  // -----------------------------------------------------------------
  // SYNC COST INPUTS WITH REACT STATE
  // -----------------------------------------------------------------
  useEffect(() => {
    saleItems.forEach(item => {
      const costEl = document.getElementById(`add-cost-${item.id}`);
      if (costEl && parseFloat(costEl.value) !== item.cost) {
        costEl.value = item.cost;
      }
    });

    if (editRowData?.items) {
      editRowData.items.forEach(item => {
        const costEl = document.getElementById(`edit-cost-${item.id}`);
        if (costEl && parseFloat(costEl.value) !== item.cost) {
          costEl.value = item.cost;
        }
      });
    }
  }, [saleItems, editRowData]);

  // -----------------------------------------------------------------
  // Autocomplete
  // -----------------------------------------------------------------
  const setupAutocomplete = (rowId, inputRef, isEdit = false) => {
    const suggestions = document.getElementById(
      `${isEdit ? 'edit' : 'add'}-suggestions-${rowId}`
    );
    if (!suggestions || !inputRef.current) return;

    const handle = () => {
      const val = inputRef.current.value.toLowerCase();
      suggestions.innerHTML = '';
      if (!val) return;

      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(val) ||
        p.hscode?.toLowerCase().includes(val)
      );

      filtered.forEach(p => {
        const div = document.createElement('div');
        div.textContent = p.name;
        div.className = 'p-2 hover:bg-gray-100 cursor-pointer border-b';
        div.onclick = () => {
          inputRef.current.value = p.name;
          const hiddenId = document.getElementById(
            `${isEdit ? 'edit' : 'add'}-product-id-${rowId}`
          );
          if (hiddenId) hiddenId.value = p.id;

          const row = inputRef.current.closest('tr');
          row.dataset.rowId = rowId;
          if (isEdit) row.classList.add('edit-row');

          handleProductSelection(row, p.id);
          suggestions.innerHTML = '';
        };
        suggestions.appendChild(div);
      });
    };

    inputRef.current.oninput = handle;
  };

  // -----------------------------------------------------------------
  // Add Item Row
  // -----------------------------------------------------------------
  const addItemRow = (isEdit = false) => {
    const id = Date.now() + Math.random();
    const newItem = {
      id,
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_id: '',
      discount: 0,
      gst: 0,
      cost: 0,
      total: 0
    };

    if (isEdit) {
      setEditRowData(prev => ({
        ...prev,
        items: Array.isArray(prev?.items) ? [...prev.items, newItem] : [newItem]
      }));
    } else {
      setSaleItems(prev => Array.isArray(prev) ? [...prev, newItem] : [newItem]);
    }

    setTimeout(() => {
      const input = document.getElementById(
        isEdit ? `edit-product-input-${id}` : `product-input-${id}`
      );
      if (input) {
        const ref = { current: input };
        autocompleteRefs.current[id] = ref;
        setupAutocomplete(id, ref, isEdit);
      }
    }, 100);
  };

  // -----------------------------------------------------------------
  // Add Sale
  // -----------------------------------------------------------------
  const handleAddSale = async e => {
    e.preventDefault();
    const form = e.target;
    const date = form.saleDateTime.value;
    const formattedDate = date
      ? new Date(date).toISOString().slice(0, 19).replace('T', ' ')
      : '';

    const itemsWithTotal = (saleItems || []).map(i => ({
      ...i,
      total: calculateRowTotal(i)
    }));

    const payload = {
      sales_date: formattedDate,
      customer_id: selectedCustomer.id,
      payment_mode: paymentModeMap[form.paymentMode.value],
      absolute_discount: parseFloat(form.absoluteDiscount.value) || 0,
      total_paid: parseFloat(form.paidAmount.value) || 0,
      products: itemsWithTotal.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        discount: i.discount,
        s_price: i.cost,
        unit_id: i.unit_id,
        gst: i.gst
      }))
    };

    try {
      const res = await fetch(`${API_BASE_URL}/sales`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(text.includes('Stock') ? 'Not enough stock!' : text || 'Save failed');
      }

      setShowAddSale(false);
      setSaleItems([]);
      setSelectedCustomer(null);
      setCurrentDateTime('');
      fetchSales();
      showToast('Sale added!');
    } catch (err) {
      showToast(err.message || 'Save failed', true);
    }
  };

  // -----------------------------------------------------------------
  // Inline Edit
  // -----------------------------------------------------------------
  const startInlineEdit = async sale => {
    setEditingRow(sale.transaction_id);
    setEditRowData(null);

    try {
      const res = await fetch(`${API_BASE_URL}/sales/${sale.transaction_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { data: fullSale } = await res.json();

      const items = (fullSale.products || []).map(p => {
        const id = Date.now() + Math.random();
        return {
          id,
          product_id: p.product_id,
          product_name: p.product_name,
          quantity: parseFloat(p.quantity) || 0,
          unit_id: p.unit_id,
          discount: parseFloat(p.discount) || 0,
          gst: parseFloat(p.gst) || 0,
          cost: parseFloat(p.selling_price) || 0,
          total: parseFloat(p.per_product_total) || 0
        };
      });

      setEditRowData({
        transaction_id: sale.transaction_id,
        customer_id: fullSale.customer_id,
        customer_name: sale.customer_name,
        bill_name: sale.bill_name,
        date: sale.date.slice(0, 16).replace(' ', 'T'),
        payment_mode: reversePaymentModeMap[sale.payment_mode] || 'cash',
        absolute_discount: sale.absolute_discount || 0,
        paid_amount: sale.paid_amount || 0,
        items
      });

      items.forEach(item => {
        setTimeout(() => {
          const input = document.getElementById(`edit-product-input-${item.id}`);
          if (input && !autocompleteRefs.current[item.id]) {
            const ref = { current: input };
            autocompleteRefs.current[item.id] = ref;
            setupAutocomplete(item.id, ref, true);
          }
        }, 100);
      });
    } catch (err) {
      showToast('Failed to load sale details', true);
      setEditingRow(null);
    }
  };

  const saveInlineEdit = async () => {
    if (!editRowData || !Array.isArray(editRowData.items)) return;

    const itemsWithTotal = (editRowData.items || []).map(i => ({
      ...i,
      total: calculateRowTotal(i)
    }));

    const payload = {
      customer_id: editRowData.customer_id,
      bill_name: editRowData.bill_name,
      payment_mode: paymentModeMap[editRowData.payment_mode],
      absolute_discount: parseFloat(editRowData.absolute_discount) || 0,
      total_paid: parseFloat(editRowData.paid_amount) || 0,
      sales_date: editRowData.date.replace('T', ' ') + ':00',
      products: itemsWithTotal.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_id: i.unit_id,
        discount: i.discount,
        gst: i.gst,
        s_price: i.cost
      }))
    };

    try {
      const res = await fetch(`${API_BASE_URL}/sales/${editingRow}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 422 && txt.includes('Stock')) {
          showToast('Not enough stock!', true);
          return;
        }
        throw new Error(txt);
      }

      setEditingRow(null);
      setEditRowData(null);
      fetchSales();
      showToast('Sale updated!');
    } catch (err) {
      showToast(err.message || 'Update failed', true);
    }
  };

  const cancelInlineEdit = () => {
    setEditingRow(null);
    setEditRowData(null);
    autocompleteRefs.current = {};
  };

  // -----------------------------------------------------------------
  // Delete & Invoice
  // -----------------------------------------------------------------
  const deleteSale = async id => {
    if (!confirm('Delete this sale?')) return;
    try {
      await fetch(`${API_BASE_URL}/destroy-sales/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSales();
      showToast('Sale deleted');
    } catch (err) {
      showToast('Delete failed', true);
    }
  };

  const downloadInvoice = async id => {
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${id}.pdf`;
      a.click();
    } catch (err) {
      showToast('Download failed', true);
    }
  };

  // -----------------------------------------------------------------
  // Customer Search
  // -----------------------------------------------------------------
  const searchCustomers = () => {
    const fields = ['Name', 'PAN', 'GST', 'Phone', 'Email'].map(f =>
      document.getElementById(`search${f}`)?.value.toLowerCase() || ''
    );
    const filtered = allCustomers.filter(c => {
      return fields.every((val, i) => {
        if (!val) return true;
        const key = ['name', 'pan', 'gst_no', 'phone', 'email'][i];
        return c[key]?.toLowerCase().includes(val);
      });
    });
    setCustomers(filtered);
  };

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Sales</h1>

          {/* Search + Add */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search sales..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowSearchCustomer(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Sale Bill
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">S.No</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Bill Name</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Sold By</th>
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((sale, i) => {
                  const isEditing = editingRow === sale.transaction_id;
                  const edit = isEditing ? editRowData : null;

                  return (
                    <React.Fragment key={sale.transaction_id}>
                      <tr className="border-t">
                        <td className="px-4 py-3">
                          {(currentPage - 1) * itemsPerPage + i + 1}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing && edit ? (
                            <input
                              type="datetime-local"
                              value={edit.date || ''}
                              onChange={e => setEditRowData(prev => ({ ...prev, date: e.target.value }))}
                              className="p-1 border rounded text-sm"
                            />
                          ) : sale.date}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing && edit ? (
                            <input
                              value={edit.bill_name || ''}
                              onChange={e => setEditRowData(prev => ({ ...prev, bill_name: e.target.value }))}
                              className="p-1 border rounded text-sm w-full"
                            />
                          ) : sale.bill_name}
                        </td>
                        <td className="px-4 py-3">{sale.customer_name}</td>
                        <td className="px-4 py-3">
                          {isEditing && edit ? (
                            <select
                              value={edit.payment_mode || 'cash'}
                              onChange={e => setEditRowData(prev => ({ ...prev, payment_mode: e.target.value }))}
                              className="p-1 border rounded text-sm"
                            >
                              {Object.keys(paymentModeMap).map(m => (
                                <option key={m} value={m}>{m.replace('_', ' ')}</option>
                              ))}
                            </select>
                          ) : reversePaymentModeMap[sale.payment_mode] || 'Cash'}
                        </td>
                        <td className="px-4 py-3">{sale.sales_by}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => downloadInvoice(sale.transaction_id)} className="text-blue-600">
                            <Download className="w-5 h-5" />
                          </button>
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={saveInlineEdit} className="text-green-600"><Save className="w-5 h-5" /></button>
                              <button onClick={cancelInlineEdit} className="text-gray-600"><RotateCcw className="w-5 h-5" /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startInlineEdit(sale)} className="text-green-600"><Edit className="w-5 h-5" /></button>
                              <button onClick={() => deleteSale(sale.transaction_id)} className="text-red-600"><Trash2 className="w-5 h-5" /></button>
                            </>
                          )}
                        </td>
                      </tr>

                      {/* Inline Edit Table */}
                      {isEditing && edit && Array.isArray(edit.items) && (
                        <tr>
                          <td colSpan={8} className="p-0 bg-gray-50">
                            <div className="p-4">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="p-2 text-left">Product</th>
                                    <th className="p-2 text-left">Qty</th>
                                    <th className="p-2 text-left">Unit</th>
                                    <th className="p-2 text-left">Disc %</th>
                                    <th className="p-2 text-left">GST %</th>
                                    <th className="p-2 text-left">Cost</th>
                                    <th className="p-2 text-left">Total</th>
                                    <th></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {edit.items.map(item => (
                                    <tr key={item.id} className="edit-row" data-row-id={item.id}>
                                      <td className="p-1">
                                        <input id={`edit-product-input-${item.id}`} type="text" placeholder="Product" defaultValue={item.product_name} className="w-full p-1 border rounded text-sm" />
                                        <input type="hidden" id={`edit-product-id-${item.id}`} value={item.product_id} />
                                        <div id={`edit-suggestions-${item.id}`} className="border rounded mt-1 max-h-32 overflow-y-auto"></div>
                                      </td>
                                      <td className="p-1">
                                        <input type="number" step="0.01" className="w-16 p-1 border rounded text-sm" value={item.quantity} onChange={e => {
                                          const qty = parseFloat(e.target.value) || 0;
                                          setEditRowData(prev => ({
                                            ...prev,
                                            items: (prev?.items || []).map(i =>
                                              i.id === item.id
                                                ? { ...i, quantity: qty, total: calculateRowTotal({ ...i, quantity: qty }) }
                                                : i
                                            )
                                          }));
                                        }} />
                                      </td>
                                      <td className="p-1">
                                        <select className="sale-unit w-full p-1 border rounded text-sm" value={item.unit_id} onChange={e => {
                                          setEditRowData(prev => ({
                                            ...prev,
                                            items: (prev?.items || []).map(i =>
                                              i.id === item.id ? { ...i, unit_id: e.target.value } : i
                                            )
                                          }));
                                        }}>
                                          <option value="">Select</option>
                                        </select>
                                      </td>
                                      <td className="p-1">
                                        <input type="number" className="sale-discount w-16 p-1 border rounded text-sm" value={item.discount} onChange={e => {
                                          const disc = parseFloat(e.target.value) || 0;
                                          setEditRowData(prev => ({
                                            ...prev,
                                            items: (prev?.items || []).map(i =>
                                              i.id === item.id
                                                ? { ...i, discount: disc, total: calculateRowTotal({ ...i, discount: disc }) }
                                                : i
                                            )
                                          }));
                                        }} />
                                      </td>
                                      <td className="p-1">
                                        <input type="number" className="sale-gst w-16 p-1 border rounded text-sm" value={item.gst} onChange={e => {
                                          const gst = parseFloat(e.target.value) || 0;
                                          setEditRowData(prev => ({
                                            ...prev,
                                            items: (prev?.items || []).map(i =>
                                              i.id === item.id
                                                ? { ...i, gst, total: calculateRowTotal({ ...i, gst }) }
                                                : i
                                            )
                                          }));
                                        }} />
                                      </td>
                                      <td className="p-1">
                                        <input id={`edit-cost-${item.id}`} type="number" step="0.01" className="sale-cost w-20 p-1 border rounded text-sm" value={item.cost} onChange={e => {
                                          const cost = parseFloat(e.target.value) || 0;
                                          setEditRowData(prev => ({
                                            ...prev,
                                            items: (prev?.items || []).map(i =>
                                              i.id === item.id
                                                ? { ...i, cost, total: calculateRowTotal({ ...i, cost }) }
                                                : i
                                            )
                                          }));
                                        }} />
                                      </td>
                                      <td className="p-1 font-medium">{currency}{item.total.toFixed(2)}</td>
                                      <td>
                                        <button type="button" onClick={() => setEditRowData(prev => ({
                                          ...prev,
                                          items: (prev?.items || []).filter(i => i.id !== item.id)
                                        }))} className="text-red-600">
                                          <X className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                  <tr>
                                    <td colSpan={8}>
                                      <button type="button" onClick={() => addItemRow(true)} className="text-blue-600 text-sm mr-2">+ Add Item</button>
                                      <button type="button" onClick={() => recalculateAll(editRowData?.items || [], items => setEditRowData(d => ({ ...d, items })))} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1">
                                        <Calculator className="w-4 h-4" /> Calculate
                                      </button>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>

                              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                <div><strong>Final:</strong> {currency}{getFinalTotal(edit.items)}</div>
                                <input type="number" step="0.01" placeholder="Abs. Discount" value={edit.absolute_discount || ''} onChange={e => setEditRowData(prev => ({ ...prev, absolute_discount: parseFloat(e.target.value) || 0 }))} className="p-2 border rounded" />
                                <div><strong>Payable:</strong> {currency}{(getFinalTotal(edit.items) - (edit.absolute_discount || 0)).toFixed(2)}</div>
                                <input type="number" step="0.01" placeholder="Paid" value={edit.paid_amount || ''} onChange={e => setEditRowData(prev => ({ ...prev, paid_amount: parseFloat(e.target.value) || 0 }))} className="p-2 border rounded" />
                                <div><strong>Due:</strong> {currency}{(getFinalTotal(edit.items) - (edit.absolute_discount || 0) - (edit.paid_amount || 0)).toFixed(2)}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"><ChevronLeft /></button>
            <span>Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"><ChevronRight /></button>
          </div>
        </div>

        {/* Customer Search Modal */}
        {showSearchCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-4 border-b flex justify-between">
                <h2 className="text-xl font-bold">Search Customer</h2>
                <button onClick={() => setShowSearchCustomer(false)}><X /></button>
              </div>
              <div className="p-4 space-y-3">
                {['Name', 'PAN', 'GST', 'Phone', 'Email'].map(f => (
                  <input key={f} id={`search${f}`} type="text" placeholder={`Enter ${f.toLowerCase()}`} className="w-full p-2 border rounded" onInput={searchCustomers} />
                ))}
              </div>
              <div className="p-4 border-t max-h-64 overflow-y-auto">
                {customers.length === 0 ? (
                  <p className="text-center text-gray-500">No customers found</p>
                ) : (
                  customers.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer({ id: c.id, name: c.name });
                        setShowSearchCustomer(false);
                        setShowAddSale(true);
                        setSaleItems([]);
                        addItemRow();
                        setCurrentDateTime(new Date().toISOString().slice(0, 16));
                      }}
                      className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                    >
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-sm text-gray-600">{c.phone} | {c.email}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Sale Modal */}
        {showAddSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
              <form onSubmit={handleAddSale}>
                <div className="p-4 border-b flex justify-between">
                  <h2 className="text-xl font-bold">Add New Sale</h2>
                  <button type="button" onClick={() => {
                    setShowAddSale(false);
                    setSaleItems([]);
                    setCurrentDateTime('');
                  }}><X /></button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input name="billName" placeholder="Bill Name" className="p-2 border rounded" required />
                    <input value={selectedCustomer?.name || ''} readOnly className="p-2 border rounded bg-gray-100" />
                    <input
                      name="saleDateTime"
                      type="datetime-local"
                      className="p-2 border rounded"
                      value={currentDateTime}
                      onChange={e => setCurrentDateTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 text-left">Product</th>
                          <th className="p-2 text-left">Qty</th>
                          <th className="p-2 text-left">Unit</th>
                          <th className="p-2 text-left">Disc %</th>
                          <th className="p-2 text-left">GST %</th>
                          <th className="p-2 text-left">Cost</th>
                          <th className="p-2 text-left">Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(saleItems || []).map(item => (
                          <tr key={item.id} data-row-id={item.id}>
                            <td className="p-1">
                              <input id={`product-input-${item.id}`} type="text" placeholder="Product" className="w-full p-1 border rounded text-sm" defaultValue={item.product_name} />
                              <input type="hidden" id={`add-product-id-${item.id}`} value={item.product_id} />
                              <div id={`add-suggestions-${item.id}`} className="border rounded mt-1 max-h-32 overflow-y-auto"></div>
                            </td>
                            <td className="p-1">
                              <input type="number" step="0.01" className="w-16 p-1 border rounded text-sm" value={item.quantity} onChange={e => {
                                const qty = parseFloat(e.target.value) || 0;
                                setSaleItems(prev => (prev || []).map(i =>
                                  i.id === item.id
                                    ? { ...i, quantity: qty, total: calculateRowTotal({ ...i, quantity: qty }) }
                                    : i
                                ));
                              }} />
                            </td>
                            <td className="p-1">
                              <select className="sale-unit w-full p-1 border rounded text-sm" value={item.unit_id} onChange={e => {
                                setSaleItems(prev => (prev || []).map(i =>
                                  i.id === item.id ? { ...i, unit_id: e.target.value } : i
                                ));
                              }}>
                                <option value="">Select</option>
                              </select>
                            </td>
                            <td className="p-1">
                              <input type="number" className="sale-discount w-16 p-1 border rounded text-sm" value={item.discount} onChange={e => {
                                const disc = parseFloat(e.target.value) || 0;
                                setSaleItems(prev => (prev || []).map(i =>
                                  i.id === item.id
                                    ? { ...i, discount: disc, total: calculateRowTotal({ ...i, discount: disc }) }
                                    : i
                                ));
                              }} />
                            </td>
                            <td className="p-1">
                              <input type="number" className="sale-gst w-16 p-1 border rounded text-sm" value={item.gst} onChange={e => {
                                const gst = parseFloat(e.target.value) || 0;
                                setSaleItems(prev => (prev || []).map(i =>
                                  i.id === item.id
                                    ? { ...i, gst, total: calculateRowTotal({ ...i, gst }) }
                                    : i
                                ));
                              }} />
                            </td>
                            <td className="p-1">
                              <input id={`add-cost-${item.id}`} type="number" step="0.01" className="sale-cost w-20 p-1 border rounded text-sm" value={item.cost} onChange={e => {
                                const cost = parseFloat(e.target.value) || 0;
                                setSaleItems(prev => (prev || []).map(i =>
                                  i.id === item.id
                                    ? { ...i, cost, total: calculateRowTotal({ ...i, cost }) }
                                    : i
                                ));
                              }} />
                            </td>
                            <td className="p-1 font-medium">{currency}{item.total.toFixed(2)}</td>
                            <td>
                              <button type="button" onClick={() => setSaleItems(prev => (prev || []).filter(i => i.id !== item.id))} className="text-red-600">
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => addItemRow()} className="text-blue-600 text-sm">+ Add Item</button>
                      <button type="button" onClick={() => recalculateAll(saleItems, setSaleItems)} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1">
                        <Calculator className="w-4 h-4" /> Calculate
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div><strong>Final:</strong> {currency}{getFinalTotal(saleItems)}</div>
                    <input name="absoluteDiscount" type="number" step="0.01" placeholder="Abs. Discount" className="p-2 border rounded" />
                    <div><strong>Payable:</strong> {currency}{(getFinalTotal(saleItems) - (parseFloat(document.querySelector('[name="absoluteDiscount"]')?.value) || 0)).toFixed(2)}</div>
                    <input name="paidAmount" type="number" step="0.01" placeholder="Paid" className="p-2 border rounded" />
                    <div><strong>Due:</strong> {currency}{(getFinalTotal(saleItems) - (parseFloat(document.querySelector('[name="absoluteDiscount"]')?.value) || 0) - (parseFloat(document.querySelector('[name="paidAmount"]')?.value) || 0)).toFixed(2)}</div>
                  </div>

                  <select name="paymentMode" className="w-full p-2 border rounded" defaultValue="cash">
                    {Object.keys(paymentModeMap).map(m => (
                      <option key={m} value={m}>{m.replace('_', ' ')}</option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Save</button>
                    <button type="button" onClick={() => {
                      setShowAddSale(false);
                      setSaleItems([]);
                      setCurrentDateTime('');
                    }} className="flex-1 bg-gray-300 py-2 rounded">Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-lg text-white shadow-lg ${toast.error ? 'bg-red-600' : 'bg-green-600'}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}