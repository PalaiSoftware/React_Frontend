'use client';

// ---------------------------------------------------------------------
// USER INFO (DO NOT MODIFY)
// ---------------------------------------------------------------------
// Current time: November 10, 2025 04:07 PM IST
// Location: Airoli, Maharashtra, IN

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Download, Edit, Trash2, Eye,
  ChevronLeft, ChevronRight, X, Save, RotateCcw, Calculator,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

// ---------------------------------------------------------------------
// API Base URL
// ---------------------------------------------------------------------
//const API_BASE_URL = "http://127.0.0.1:8000/api";

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
  select.innerHTML = '<option value="" disabled selected>Select Unit</option>';
  units.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.unit_id;
    opt.textContent = u.unit_name;
    opt.dataset.salePrice = u.sale_price;
    opt.dataset.gst = u.gst;
    select.appendChild(opt);
  });
};

// ---------------------------------------------------------------------
// Row total calculator
// ---------------------------------------------------------------------
const calcRowTotal = (item) => {
  const qty = Number(item.quantity) || 0;
  const cost = Number(item.cost) || 0;
  const disc = Number(item.discount) || 0;
  const gst = Number(item.gst) || 0;
  let total = qty * cost;
  total -= total * (disc / 100);
  total += total * (gst / 100);
  return Number(total.toFixed(2));
};

// ---------------------------------------------------------------------
// handleProductSelection – works for add & edit
// ---------------------------------------------------------------------
const handleProductSelection = async (row, productId, isEdit = false, setItems, rowId, showToast) => {
  if (!productId) return;
  const token = localStorage.getItem('authToken');
  try {
    const res = await fetch(`${API_BASE_URL}/units/${productId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Failed');
    const { unit_pricing } = await res.json();
    const units = Array.isArray(unit_pricing) ? unit_pricing : [];

    const unitSelect = row.querySelector('.sale-unit');
    const costInput = row.querySelector('.sale-cost');
    const gstInput = row.querySelector('.sale-gst');
    const discountInput = row.querySelector('.sale-discount');

    populateUnitDropdown(unitSelect, units);

    if (units.length > 0) {
      const first = units[0];
      unitSelect.value = first.unit_id;
      costInput.value = Number(first.sale_price || 0).toFixed(2);
      gstInput.value = Number(first.gst || 0).toFixed(2);
      discountInput.value = '0.00';

      setItems(prev => prev.map(i =>
        i.id === rowId
          ? {
              ...i,
              product_id: productId,
              unit_id: first.unit_id,
              cost: Number(first.sale_price || 0),
              gst: Number(first.gst || 0),
              discount: 0,
              total: calcRowTotal({
                ...i,
                cost: Number(first.sale_price || 0),
                quantity: i.quantity || 0,
                discount: 0,
                gst: Number(first.gst || 0)
              })
            }
          : i
      ));
    }

    // unit change handler
    const onUnitChange = (e) => {
      const sel = e.target.options[e.target.selectedIndex];
      const price = Number(sel.dataset.salePrice || 0);
      const gstVal = Number(sel.dataset.gst || 0);
      costInput.value = price.toFixed(2);
      gstInput.value = gstVal.toFixed(2);
      discountInput.value = '0.00';

      setItems(prev => prev.map(i =>
        i.id === rowId
          ? {
              ...i,
              unit_id: sel.value,
              cost: price,
              gst: gstVal,
              discount: 0,
              total: calcRowTotal({
                ...i,
                cost: price,
                quantity: i.quantity || 0,
                discount: 0,
                gst: gstVal
              })
            }
          : i
      ));
    };
    unitSelect.onchange = onUnitChange;
  } catch (error) {
    showToast(`Failed to load units: ${error.message}`, true);
  }
};

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
export default function SalesDashboard() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage] = useState(50);
  const [showSearchCustomer, setShowSearchCustomer] = useState(false);
  const [showAddSale, setShowAddSale] = useState(false);
  const [showEditSale, setShowEditSale] = useState(false);
  const [showViewSale, setShowViewSale] = useState(false);
  const [viewSaleData, setViewSaleData] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [editSaleItems, setEditSaleItems] = useState([]);
  const [editTransactionId, setEditTransactionId] = useState(null);
  const [editOriginalPaid, setEditOriginalPaid] = useState(0);
  const [editForm, setEditForm] = useState({
    nameWithDate: '', dateTime: '', paymentMode: 'cash',
    absoluteDiscount: 0, setPaidAmount: 0
  });
  const [editTotals, setEditTotals] = useState({ subtotal: 0, payable: 0, due: 0 });
  const [toast, setToast] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [userName, setUserName] = useState('Loading...'); // Fetch user name

  const token = localS.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const cid = user.cid;
  const currency = JSON.parse(localStorage.getItem('selectedCompany') || '{}')?.currency || '₹';

  const autocompleteRefs = useRef({});
  const saleItemsBodyRef = useRef(null);

  // -----------------------------------------------------------------
  // Fetch User Name (Same as Purchase)
  // -----------------------------------------------------------------
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      fetchUserName(parsed.id);
    }
  }, []);

  const fetchUserName = async (userId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUserName(data.data.name);
      } else {
        setUserName('User');
      }
    } catch (err) {
      setUserName('User');
    }
  };

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

  // -----------------------------------------------------------------
  // NEW: fetch single sale for View modal (lazy)
  // -----------------------------------------------------------------
  const fetchSaleForView = async (transactionId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/sales/${transactionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load sale details');
      const result = await res.json();
      if (result.status !== 'success') throw new Error(result.message || 'Unknown error');
      setViewSaleData(result.data);
      setShowViewSale(true);
    } catch (err) {
      showToast(err.message, true);
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
  const getFinalTotal = (items) => {
    return items.reduce((sum, i) => sum + i.total, 0).toFixed(2);
  };

  useEffect(() => {
    if (showEditSale) {
      const subtotal = getFinalTotal(editSaleItems);
      const payable = Math.max(0, subtotal - editForm.absoluteDiscount).toFixed(2);
      const newPaid = editOriginalPaid + editForm.setPaidAmount;
      const due = Math.max(0, payable - newPaid).toFixed(2);
      setEditTotals({ subtotal, payable, due });
    }
  }, [editSaleItems, editForm, editOriginalPaid, showEditSale]);

  // -----------------------------------------------------------------
  // Autocomplete
  // -----------------------------------------------------------------
  const setupAutocomplete = (rowId, inputRef, isEdit = false, setItems) => {
    const suggestions = document.getElementById(
      `${isEdit ? 'edit-sale' : 'add'}-suggestions-${rowId}`
    );
    if (!suggestions || !inputRef.current) return;

    const row = inputRef.current.closest('tr');
    const handle = () => {
      const val = inputRef.current.value.toLowerCase();
      suggestions.innerHTML = '';
      if (!val) return;

      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(val) ||
        p.hscode?.toLowerCase().includes(val)
      ).slice(0, 12);

      filtered.forEach(p => {
        const div = document.createElement('div');
        div.textContent = p.name;
        div.className = 'p-2 hover:bg-gray-100 cursor-pointer border-b text-sm';
        div.onclick = () => {
          inputRef.current.value = p.name;
          const hidden = document.getElementById(
            `${isEdit ? 'edit-sale' : 'add'}-product-id-${rowId}`
          );
          if (hidden) hidden.value = p.id;

          setItems(prev => prev.map(i =>
            i.id === rowId ? { ...i, product_id: p.id, product_name: p.name } : i
          ));

          handleProductSelection(row, p.id, isEdit, setItems, rowId, showToast);
          suggestions.innerHTML = '';
        };
        suggestions.appendChild(div);
      });
      suggestions.style.display = filtered.length ? 'block' : 'none';
    };

    inputRef.current.oninput = handle;
  };

  // -----------------------------------------------------------------
  // Add / Remove rows
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
    const setItems = isEdit ? setEditSaleItems : setSaleItems;
    setItems(prev => [...prev, newItem]);

    setTimeout(() => {
      const input = document.getElementById(
        isEdit ? `edit-sale-product-input-${id}` : `product-input-${id}`
      );
      if (input) {
        const ref = { current: input };
        autocompleteRefs.current[id] = ref;
        setupAutocomplete(id, ref, isEdit, setItems);
      }
    }, 100);
  };

  const removeItem = (id, isEdit = false) => {
    const setItems = isEdit ? setEditSaleItems : setSaleItems;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // -----------------------------------------------------------------
  // Add Sale – Auto-fill name if empty + dis fix
  // -----------------------------------------------------------------
  const handleAddSale = async e => {
    e.preventDefault();
    const form = e.target;

    // Get values
    const rawName = form.nameWithDate?.value?.trim() || '';
    const dateInput = form.saleDateTime.value;

    // Validate date
    if (!dateInput) {
      showToast('Please select date & time', true);
      return;
    }

    const formattedDate = new Date(dateInput).toISOString().slice(0, 19).replace('T', ' ');
    const displayDate = dateInput.slice(0, 16).replace('T', ' ');

    // Auto-fill name if empty
    const nameWithDate = rawName 
      ? `${rawName} ${displayDate}` 
      : formattedDate;  // Just date-time if blank

    const itemsWithTotal = (saleItems || []).map(i => ({
      ...i,
      total: calcRowTotal(i)
    }));

    const payload = {
      name: nameWithDate,
      sales_date: formattedDate,
      customer_id: selectedCustomer.id,
      payment_mode: paymentModeMap[form.paymentMode.value],
      absolute_discount: parseFloat(form.absoluteDiscount.value) || 0,
      total_paid: parseFloat(form.paidAmount.value) || 0,
      gst: 0,
      products: itemsWithTotal.map(i => ({
        product_id: i.product_id,
        quantity: parseFloat(i.quantity.toFixed(3)),
        unit_id: i.unit_id,
        s_price: parseFloat(i.cost.toFixed(2)),
        discount: i.discount,
        dis: i.discount,  // ← REQUIRED for backend
        gst: parseFloat(i.gst.toFixed(2))
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
  // EDIT SALE – Auto-fill name if empty
  // -----------------------------------------------------------------
  const createEmptySaleItem = () => ({
    id: Date.now() + Math.random(),
    product_id: '', product_name: '', quantity: 0, unit_id: '',
    discount: 0, gst: 0, cost: 0, total: 0
  });

  const openEditSale = async (transactionId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/sales/${transactionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { data } = await res.json();

      setEditTransactionId(transactionId);
      setEditOriginalPaid(parseFloat(data.paid_amount) || 0);
      setSelectedCustomer({ id: data.customer_id, name: data.customer_name });

      // Extract name without date
      const nameParts = (data.bill_name || '').split(' ');
      const possibleDate = nameParts.slice(-5).join(' ');
      const nameWithoutDate = nameParts.slice(0, -5).join(' ') || '';

      setEditForm({
        nameWithDate: nameWithoutDate,
        dateTime: data.date.slice(0, 16).replace(' ', 'T'),
        paymentMode: reversePaymentModeMap[data.payment_mode] || 'cash',
        absoluteDiscount: parseFloat(data.absolute_discount) || 0,
        setPaidAmount: 0
      });

      const items = (data.products || []).map(p => {
        const id = Date.now() + Math.random();
        return {
          id,
          product_id: p.product_id,
          product_name: p.product_name,
          quantity: parseFloat(p.quantity) || 0,
          unit_id: p.unit_id,
          discount: parseFloat(p.discount) || 0,
          gst: parseFloat(p.gst) || 0,
          cost: parseFloat(p.s_price) || 0,
          total: 0
        };
      });

      setEditSaleItems(items.length ? items : [createEmptySaleItem()]);
      setShowEditSale(true);

      setTimeout(() => {
        items.forEach(itm => {
          const inp = document.getElementById(`edit-sale-product-input-${itm.id}`);
          if (inp) {
            const ref = { current: inp };
            autocompleteRefs.current[itm.id] = ref;
            setupAutocomplete(itm.id, ref, true, setEditSaleItems);

            const row = inp.closest('tr');
            if (row && itm.product_id) {
              handleProductSelection(row, itm.product_id, true, setEditSaleItems, itm.id, showToast);
            }
          }
        });
      }, 150);
    } catch (err) {
      showToast('Failed to load sale', true);
    }
  };

  // -----------------------------------------------------------------
  // saveEditedSale – CRITICAL FIX: Add `dis` key
  // -----------------------------------------------------------------
  const saveEditedSale = async () => {
    const validProducts = editSaleItems
      .filter(p => p.product_id && p.quantity > 0 && p.unit_id)
      .map(p => {
        const cost = parseFloat(p.cost) || 0;
        const qty = parseFloat(p.quantity) || 0;
        const dis = parseFloat(p.discount) || 0;
        const gst = parseFloat(p.gst) || 0;

        if (cost <= 0) {
          showToast(`Invalid cost for "${p.product_name}"`, true);
          throw new Error('Invalid cost');
        }

        return {
          product_id: parseInt(p.product_id, 10),
          quantity: parseFloat(qty.toFixed(3)),
          p_price: 0,
          s_price: parseFloat(cost.toFixed(2)),
          unit_id: parseInt(p.unit_id, 10),
          discount: dis,     // optional, for frontend
          dis: dis,          // ← REQUIRED for backend
          gst: gst
        };
      });

    if (validProducts.length === 0) {
      return showToast('Add at least one valid product', true);
    }

    // Auto-fill name if empty
    const rawName = editForm.nameWithDate?.trim() || '';
    const dateInput = editForm.dateTime || new Date().toISOString().slice(0, 16);
    const displayDate = dateInput.slice(0, 16).replace('T', ' ');
    const formattedDate = `${dateInput.replace('T', ' ')}:00`;

    const nameWithDate = rawName 
      ? `${rawName} ${displayDate}` 
      : formattedDate;

    const payload = {
      name: nameWithDate,
      payment_mode: paymentModeMap[editForm.paymentMode] || 3,
      customer_id: selectedCustomer?.id,
      absolute_discount: parseFloat(editForm.absoluteDiscount)f || 0,
      set_paid_amount: parseFloat(editForm.setPaidAmount) || 0,
      updated_at: formattedDate,
      gst: 0,
      products: validProducts
    };

    try {
      const res = await fetch(`${API_BASE_URL}/sales/${editTransactionId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      if (!res.ok) {
        let errorMsg = 'Update failed';
        try {
          const err = JSON.parse(text);
          errorMsg = err.message || JSON.stringify(err.errors || {});
        } catch {
          errorMsg = text;
        }
        throw new Error(errorMsg);
      }

      showToast('Sale updated successfully');
      setShowEditSale(false);
      setEditSaleItems([]);
      setEditForm({
        nameWithDate: '', dateTime: '', paymentMode: 'cash',
        absoluteDiscount: 0, setPaidAmount: 0
      });
      fetchSales();
    } catch (err) {
      showToast(err.message || 'Failed to update', true);
    }
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
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-md shadow-lg z-50 text-white ${toast.error ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* ==================== HEADER ==================== */}
      <div className="bg-gradient-to-r from-neutral-800 to-cyan-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Sales</h2>
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
          >
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md">
              <User className="w-5 h-5 text-gray-800" />
            </div>
            <span className="font-medium">{userName}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
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
            className="bg-cyan-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Sale Bill
          </button>
        </div>

        {/* Sales List - Responsive: Table on md+, Cards on mobile */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Desktop Table Header */}
          <div className="hidden md:block">
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
                {paginated.map((sale, i) => (
                  <tr key={sale.transaction_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {(currentPage - 1) * itemsPerPage + i + 1}
                    </td>
                    <td className="px-4 py-3">{sale.date}</td>
                    <td className="px-4 py-3">{sale.bill_name}</td>
                    <td className="px-4 py-3">{sale.customer_name}</td>
                    <td className="px-4 py-3">
                      {reversePaymentModeMap[sale.payment_mode] || 'Cash'}
                    </td>
                    <td className="px-4 py-3">{sale.sales_by}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => downloadInvoice(sale.transaction_id)} className="text-cyan-600 hover:text-cyan-800">
                        <Download className="w-5 h-5" />
                      </button>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => fetchSaleForView(sale.transaction_id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button onClick={() => openEditSale(sale.transaction_id)} className="text-green-600 hover:text-green-800">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button onClick={() => deleteSale(sale.transaction_id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 p-4">
            {paginated.map((sale, i) => (
              <div key="mobile-card" className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-lg">#{sale.transaction_id}</p>
                    <p className="text-sm text-gray-600">{sale.date}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => fetchSaleForView(sale.transaction_id)}
                      className="p-1 text-blue-600"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button onClick={() => openEditSale(sale.transaction_id)} className="p-1 text-green-600">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => deleteSale(sale.transaction_id)} className="p-1 text-red-600">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Bill:</span>
                    <span>{sale.bill_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Customer:</span>
                    <span>{sale.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Payment:</span>
                    <span>{reversePaymentModeMap[sale.payment_mode] || 'Cash'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Sold By:</span>
                    <span>{sale.sales_by}</span>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button onClick={() => downloadInvoice(sale.transaction_id)} className="text-cyan-600 flex items-center gap-1 text-sm">
                    <Download className="w-4 h-4" />
                    Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-4 mt-6">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"><ChevronLeft /></button>
          <span>Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"><ChevronRight /></button>
        </div>
      </div>

      {/* ==================== VIEW SALE MODAL ==================== */}
      {showViewSale && viewSaleData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Sale Details - #{viewSaleData.transaction_id}</h2>
              <button onClick={() => setShowViewSale(false)} className="text-gray-500 hover:text-gray-700"><X /></button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><strong>Bill Name:</strong> {viewSaleData.bill_name || '-'}</div>
                <div><strong>Customer:</strong> {viewSaleData.customer_name || '-'}</div>
                <div><strong>Date & Time:</strong> {viewSaleData.date || '-'}</div>
                <div><strong>Sold By:</strong> {viewSaleData.sales_by || '-'}</div>
                <div><strong>Payment Mode:</strong> {reversePaymentModeMap[viewSaleData.payment_mode] || 'Cash'}</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1000px] border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Product</th>
                      <th className="p-2 border">Qty</th>
                      <th className="p-2 border">Unit</th>
                      <th className="p-2 border">Price</th>
                      <th className="p-2 border">Disc %</th>
                      <th className="p-2 border">Pre-GST</th>
                      <th className="p-2 border">GST %</th>
                      <th className="p-2 border">GST Amt</th>
                      <th className="p-2 border">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewSaleData.products || []).map((p, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 border">{p.product_name}</td>
                        <td className="p-2 border text-right">{parseFloat(p.quantity).toFixed(3)}</td>
                        <td className="p-2 border">{p.unit_name || '-'}</td>
                        <td className="p-2 border text-right">{currency}{parseFloat(p.selling_price).toFixed(2)}</td>
                        <td className="p-2 border text-right">{parseFloat(p.discount).toFixed(2)}</td>
                        <td className="p-2 border text-right">{currency}{parseFloat(p.pre_gst_total).toFixed(2)}</td>
                        <td className="p-2 border text-right">{parseFloat(p.gst).toFixed(2)}</td>
                        <td className="p-2 border text-right">{currency}{parseFloat(p.gst_amount).toFixed(2)}</td>
                        <td className="p-2 border text-right font-medium">{currency}{parseFloat(p.per_product_total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm font-medium">
                <div><strong>Subtotal:</strong> {currency}{parseFloat(viewSaleData.total_amount || 0).toFixed(2)}</div>
                <div><strong>Abs. Discount:</strong> {currency}{parseFloat(viewSaleData.absolute_discount || 0).toFixed(2)}</div>
                <div><strong>Payable:</strong> {currency}{parseFloat(viewSaleData.payable_amount || 0).toFixed(2)}</div>
                <div><strong>Paid:</strong> {currency}{parseFloat(viewSaleData.paid_amount || 0).toFixed(2)}</div>
                <div><strong>Due:</strong> {currency}{parseFloat(viewSaleData.due_amount || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT SALE MODAL ==================== */}
      {showEditSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Sale</h2>
              <button onClick={() => {
                setShowEditSale(false);
                setEditSaleItems([]);
              }} className="text-gray-500 hover:text-gray-700"><X /></button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  value={editForm.nameWithDate}
                  onChange={e => setEditForm(p => ({ ...p, nameWithDate: e.target.value }))}
                  placeholder="Bill Name (date will be appended)"
                  className="px-3 py-2 border rounded"
                />
                <input value={selectedCustomer?.name || ''} readOnly className="px-3 py-2 border rounded bg-gray-50" />
                <input
                  type="datetime-local"
                  value={editForm.dateTime}
                  onChange={e => setEditForm(p => ({ ...p, dateTime: e.target.value }))}
                  className="px-3 py-2 border rounded"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2">Product</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Unit</th>
                      <th className="p-2">Disc %</th>
                      <th className="p-2">GST %</th>
                      <th className="p-2">Cost</th>
                      <th className="p-2">Total</th>
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editSaleItems.map(item => (
                      <tr key={`edit-sale-item-${item.id}`} data-row-id={item.id}>
                        <td className="p-1 relative">
                          <input
                            id={`edit-sale-product-input-${item.id}`}
                            type="text"
                            placeholder="Search product..."
                            value={item.product_name || ''}
                            onChange={e => setEditSaleItems(prev => prev.map(i =>
                              i.id === item.id ? { ...i, product_name: e.target.value } : i
                            ))}
                            className="w-full p-1 border rounded text-sm"
                          />
                          <input type="hidden" id={`edit-sale-product-id-${item.id}`} value={item.product_id} />
                          <div id={`edit-sale-suggestions-${item.id}`} className="absolute z-10 bg-white border rounded mt-1 max-h-32 overflow-y-auto w-full hidden"></div>
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={e => setEditSaleItems(prev => prev.map(i =>
                              i.id === item.id ? { ...i, quantity: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, quantity: parseFloat(e.target.value) || 0 }) } : i
                            ))}
                            className="w-16 p-1 border rounded"
                          />
                        </td>
                        <td className="p-1">
                          <select
                            className="sale-unit w-full p-1 border rounded text-sm"
                            value={item.unit_id}
                            onChange={e => setEditSaleItems(prev => prev.map(i =>
                              i.id === item.id ? { ...i, unit_id: e.target.value } : i
                            ))}
                          >
                            <option value="">Select Unit</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            className="sale-discount w-16 p-1 border rounded"
                            value={item.discount}
                            onChange={e => setEditSaleItems(prev => prev.map(i =>
                              i.id === item.id ? { ...i, discount: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, discount: parseFloat(e.target.value) || 0 }) } : i
                            ))}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            className="sale-gst w-16 p-1 border rounded"
                            value={item.gst}
                            onChange={e => setEditSaleItems(prev => prev.map(i =>
                              i.id === item.id ? { ...i, gst: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, gst: parseFloat(e.target.value) || 0 }) } : i
                            ))}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="0.01"
                            className="sale-cost w-full p-1 border rounded"
                            value={item.cost}
                            onChange={e => setEditSaleItems(prev => prev.map(i =>
                              i.id === item.id ? { ...i, cost: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, cost: parseFloat(e.target.value) || 0 }) } : i
                            ))}
                          />
                        </td>
                        <td className="p-1 text-right">{currency}{item.total.toFixed(2)}</td>
                        <td className="p-1 text-center">
                          <button type="button" onClick={() => removeItem(item.id, true)} className="text-red-600"><X className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => addItemRow(true)} className="text-cyan-600 text-sm">+ Add Item</button>
                <button type="button" onClick={() => {
                  setEditSaleItems(prev => prev.map(i => ({ ...i, total: calcRowTotal(i) })));
                }} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><Calculator className="w-4 h-4" /> Calculate</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div><strong>Subtotal:</strong> {currency}{editTotals.subtotal}</div>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.absoluteDiscount}
                  onChange={e => setEditForm(p => ({ ...p, absoluteDiscount: parseFloat(e.target.value) || 0 }))}
                  placeholder="Abs. Discount"
                  className="p-2 border rounded"
                />
                <div><strong>Payable:</strong> {currency}{editTotals.payable}</div>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.setPaidAmount}
                  onChange={e => setEditForm(p => ({ ...p, setPaidAmount: parseFloat(e.target.value) || 0 }))}
                  placeholder="Paid Adj."
                  className="p-2 border rounded"
                />
                <div><strong>Due:</strong> {currency}{editTotals.due}</div>
              </div>

              <select
                value={editForm.paymentMode}
                onChange={e => setEditForm(p => ({ ...p, paymentMode: e.target.value }))}
                className="w-full md:w-64 p-2 border rounded"
              >
                {Object.keys(paymentModeMap).map(m => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>

              <div className="flex gap-2">
                <button onClick={saveEditedSale} className="flex-1 bg-green-600 text-white py-2 rounded">Update Sale</button>
                <button onClick={() => setShowEditSale(false)} className="flex-1 bg-gray-300 py-2 rounded">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SEARCH CUSTOMER MODAL ==================== */}
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

      {/* ==================== ADD SALE MODAL ==================== */}
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
                  <input 
                    name="nameWithDate" 
                    placeholder="Bill Name (date will be appended)" 
                    className="p-2 border rounded" 
                  />
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
                  <table className="w-full text-sm" ref={saleItemsBodyRef}>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 text-left">S.No</th>
                        <th className="py-2 text-left">Product</th>
                        <th className="py-2 text-left">Qty</th>
                        <th className="py-2 text-left">Unit</th>
                        <th className="py-2 text-left">Disc %</th>
                        <th className="py-2 text-left">GST %</th>
                        <th className="py-2 text-left">Cost</th>
                        <th className="py-2 text-left">Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleItems.map((item, index) => (
                        <tr key={item.id} data-row-id={item.id}>
                          <td className="p-1 text-center font-medium">{index + 1}</td>

                          <td className="p-1">
                            <div className="autocomplete-container">
                              <input
                                id={`product-input-${item.id}`}
                                type="text"
                                placeholder="Product"
                                className="w-full p-1 border rounded text-sm sale-product-input"
                                value={item.product_name || ''}
                                onChange={e => {
                                  const newName = e.target.value;
                                  setSaleItems(prev => prev.map(i =>
                                    i.id === item.id ? { ...i, product_name: newName } : i
                                  ));
                                }}
                              />
                              <input type="hidden" id={`add-product-id-${item.id}`} className="sale-product-id" value={item.product_id} />
                              <div id={`add-suggestions-${item.id}`} className="border rounded mt-1 max-h-32 overflow-y-auto"></div>
                            </div>
                          </td>

                          <td className="p-1">
                            <input
                              type="number"
                              step="0.01"
                              className="w-16 p-1 border rounded text-sm sale-quantity"
                              value={item.quantity}
                              onChange={e => {
                                const qty = parseFloat(e.target.value) || 0;
                                setSaleItems(prev => prev.map(i =>
                                  i.id === item.id ? { ...i, quantity: qty, total: calcRowTotal({ ...i, quantity: qty }) } : i
                                ));
                              }}
                            />
                          </td>

                          <td className="p-1">
                            <select className="sale-unit w-full p-1 border rounded text-sm">
                              <option value="" disabled selected>Select Unit</option>
                            </select>
                          </td>

                          <td className="p-1">
                            <input
                              type="number"
                              className="sale-discount w-16 p-1 border rounded text-sm"
                              value={item.discount}
                              onChange={e => {
                                const disc = parseFloat(e.target.value) || 0;
                                setSaleItems(prev => prev.map(i =>
                                  i.id === item.id ? { ...i, discount: disc, total: calcRowTotal({ ...i, discount: disc }) } : i
                                ));
                              }}
                            />
                          </td>

                          <td className="p-1">
                            <input
                              type="number"
                              className="sale-gst w-16 p-1 border rounded text-sm"
                              value={item.gst}
                              onChange={e => {
                                const gst = parseFloat(e.target.value) || 0;
                                setSaleItems(prev => prev.map(i =>
                                  i.id === item.id ? { ...i, gst, total: calcRowTotal({ ...i, gst }) } : i
                                ));
                              }}
                            />
                          </td>

                          <td className="p-1">
                            <input
                              id={`add-cost-${item.id}`}
                              type="number"
                              step="0.01"
                              className="sale-cost w-20 p-1 border rounded text-sm"
                              value={item.cost}
                              onChange={e => {
                                const cost = parseFloat(e.target.value) || 0;
                                setSaleItems(prev => prev.map(i =>
                                  i.id === item.id ? { ...i, cost, total: calcRowTotal({ ...i, cost }) } : i
                                ));
                              }}
                            />
                          </td>

                          <td className="p-1 font-medium sale-total-cost">{currency}{item.total.toFixed(2)}</td>

                          <td>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => addItemRow()} className="text-cyan-600 text-sm">+ Add Item</button>
                    <button
                      type="button"
                      onClick={() => {
                        setSaleItems(prev => prev.map(i => ({ ...i, total: calcRowTotal(i) })));
                      }}
                      className="bg-yellow-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                      <Calculator className="w-4 h-4" /> Calculate
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div><strong>Final:</strong> <span id="saleFinalTotal">{currency}{getFinalTotal(saleItems)}</span></div>
                  <input
                    name="absoluteDiscount"
                    type="number"
                    step="0.01"
                    placeholder="Abs. Discount"
                    className="p-2 border rounded"
                    onChange={e => {
                      const disc = parseFloat(e.target.value) || 0;
                      const final = getFinalTotal(saleItems);
                      const payable = (final - disc).toFixed(2);
                      const paid = parseFloat(document.querySelector('[name="paidAmount"]')?.value) || 0;
                      const due = (payable - paid).toFixed(2);
                      document.getElementById('salePayableAmount').textContent = `${currency}${payable}`;
                      document.getElementById('saleDueAmount').textContent = `${currency}${due}`;
                    }}
                  />
                  <div><strong>Payable:</strong> <span id="salePayableAmount">{currency}0</span></div>
                  <input
                    name="paidAmount"
                    type="number"
                    step="0.01"
                    placeholder="Paid"
                    className="p-2 border rounded"
                    onChange={e => {
                      const paid = parseFloat(e.target.value) || 0;
                      const disc = parseFloat(document.querySelector('[name="absoluteDiscount"]')?.value) || 0;
                      const final = getFinalTotal(saleItems);
                      const payable = (final - disc).toFixed(2);
                      const due = (payable - paid).toFixed(2);
                      document.getElementById('saleDueAmount').textContent = `${currency}${due}`;
                    }}
                  />
                  <div><strong>Due:</strong> <span id="saleDueAmount">{currency}0</span></div>
                </div>

                <select name="paymentMode" className="w-full p-2 border rounded" defaultValue="cash">
                  {Object.keys(paymentModeMap).map(m => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-cyan-600 text-white py-2 rounded">Save</button>
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
    </>
  );
}