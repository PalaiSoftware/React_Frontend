import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = "http://127.0.0.1:8000/api";

const paymentModeMap = {
  'credit_card': 1, 'debit_card': 2, 'cash': 3, 'upi': 4, 'bank_transfer': 5, 'phonepe': 6
};

const reversePaymentModeMap = Object.fromEntries(
  Object.entries(paymentModeMap).map(([k, v]) => [v, k])
);

const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  return (...args) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  };
};

const Purchase = () => {
  const [user, setUser] = useState({});
  const [userName, setUserName] = useState('Loading...');
  const [vendorsList, setVendorsList] = useState([]);
  const [allPurchases, setAllPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchVendor, setShowSearchVendor] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showEditPurchase, setShowEditPurchase] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState({ id: '', name: '' });
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [editPurchaseItems, setEditPurchaseItems] = useState([]);
  const [editTransactionId, setEditTransactionId] = useState(null);
  const [editOriginalPaidAmount, setEditOriginalPaidAmount] = useState(0);
  const [productsCache, setProductsCache] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [detailsCache, setDetailsCache] = useState({});
  const [openDetails, setOpenDetails] = useState({});
  const [vendorSearchResults, setVendorSearchResults] = useState([]);

  // Edit form state (React way)
  const [editForm, setEditForm] = useState({
    billName: '',
    dateTime: '',
    paymentMode: 'cash',
    absoluteDiscount: 0,
    setPaidAmount: 0
  });

  // Totals for edit
  const [editTotals, setEditTotals] = useState({
    subtotal: 0,
    payable: 0,
    due: 0
  });

  const itemsPerPage = 50;

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  /* ------------------------------------------------------------------ */
  /*  USER & INITIAL DATA                                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      fetchUserName(parsed.id);
    }
  }, []);

  const fetchUserName = async (userId) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') setUserName(data.data.name);
    } catch (err) {
      setUserName('User');
    }
  };

  const fetchVendors = async () => {
    const token = localStorage.getItem('authToken');
    if (!user.cid || !token) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/vendors?cid=${user.cid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const vendors = data.purchase_clients?.map(v => ({
        id: v.id,
        vendor_name: v.name || 'N/A',
        email: v.email || 'N/A',
        phone: v.phone || 'N/A',
        gst_no: v.gst_no || 'N/A',
        pan: v.pan || 'N/A'
      })) || [];
      setVendorsList(vendors);
      return vendors;
    } catch (err) {
      showToast('Failed to fetch vendors');
      return [];
    }
  };

  const fetchPurchases = async () => {
    const token = localStorage.getItem('authToken');
    if (!token || !user.cid) return;
    try {
      const res = await fetch(`${API_BASE_URL}/transactions-by-cid`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cid: user.cid })
      });
      const data = await res.json();
      const purchases = data.data || [];
      setAllPurchases(purchases);
      setFilteredPurchases(purchases);
    } catch (err) {
      showToast('Failed to fetch purchases');
    }
  };

  useEffect(() => {
    if (user.cid) {
      fetchVendors();
      fetchPurchases();
    }
  }, [user.cid]);

  /* ------------------------------------------------------------------ */
  /*  SEARCH & PAGINATION                                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const filtered = allPurchases.filter(p =>
      p.transaction_id?.toString().includes(lower) ||
      p.bill_name?.toLowerCase().includes(lower) ||
      p.vendor_name?.toLowerCase().includes(lower) ||
      p.payment_mode?.toLowerCase().includes(lower) ||
      p.date?.toLowerCase().includes(lower) ||
      p.purchased_by?.toLowerCase().includes(lower)
    );
    setFilteredPurchases(filtered);
    setCurrentPage(1);
  }, [searchTerm, allPurchases]);

  const paginated = filteredPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

  /* ------------------------------------------------------------------ */
  /*  PRODUCTS & UNITS                                                  */
  /* ------------------------------------------------------------------ */
  const fetchProducts = async () => {
    if (productsCache.length > 0) return productsCache;
    const token = localStorage.getItem('authToken');
    if (!token || !user.cid) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/products?cid=${user.cid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const products = data.products || [];
      setProductsCache(products);
      return products;
    } catch (err) {
      return [];
    }
  };

  const fetchUnits = async (productId) => {
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`${API_BASE_URL}/units/${productId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return Array.isArray(data) ? data : data.units || [];
    } catch (err) {
      return [];
    }
  };

  const fetchProductDetails = async (productId) => {
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`${API_BASE_URL}/units/${productId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.product_info || {};
    } catch (err) {
      return {};
    }
  };

  /* ------------------------------------------------------------------ */
  /*  PURCHASE DETAILS                                                  */
  /* ------------------------------------------------------------------ */
  const fetchPurchaseDetails = async (transactionId) => {
    if (detailsCache[transactionId]) return detailsCache[transactionId];

    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`${API_BASE_URL}/purchases-by-transaction-id`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transaction_id: transactionId })
      });
      const data = await res.json();
      const details = data.data;
      setDetailsCache(prev => ({ ...prev, [transactionId]: details }));
      return details;
    } catch (err) {
      showToast('Failed to load details');
      return null;
    }
  };

  const toggleDetails = async (transactionId) => {
    const tid = transactionId.toString();
    const willOpen = !openDetails[tid];

    if (willOpen && !detailsCache[tid]) {
      await fetchPurchaseDetails(tid);
    }

    setOpenDetails(prev => ({ ...prev, [tid]: willOpen }));
  };

  /* ------------------------------------------------------------------ */
  /*  AUTOCOMPLETE INPUT                                                */
  /* ------------------------------------------------------------------ */
  const AutocompleteInput = ({ value, onChange, onSelect, placeholder, products, itemId, isEdit }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [show, setShow] = useState(false);
    const inputRef = useRef(null);

    const handleInput = useDebounce((val) => {
      if (!val.trim()) {
        setSuggestions([]);
        setShow(false);
        return;
      }
      const filtered = products.filter(p =>
        p.product_name.toLowerCase().includes(val.toLowerCase()) ||
        (p.hscode && p.hscode.toLowerCase().includes(val.toLowerCase()))
      );
      setSuggestions(filtered);
      setShow(true);
    }, 300);

    useEffect(() => {
      const handleClick = (e) => {
        if (inputRef.current && !inputRef.current.contains(e.target)) {
          setShow(false);
        }
      };
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
      <div className="relative" ref={inputRef}>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            handleInput(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full px-2 py-1 border rounded text-sm"
        />
        {show && suggestions.length > 0 && (
          <div className="absolute z-20 w-full bg-white border rounded shadow-lg max-h-40 overflow-y-auto mt-1">
            {suggestions.map(p => (
              <div
                key={p.id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={async () => {
                  onSelect(p, itemId, isEdit);
                  setShow(false);
                }}
              >
                {p.product_name}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  ITEM ROWS                                                         */
  /* ------------------------------------------------------------------ */
  const addItemRow = (isEdit = false) => {
    const newItem = {
      id: Date.now(),
      product_id: '',
      product_name: '',
      quantity: 0,
      unit_id: '',
      unit_name: '',
      discount: 0,
      gst: 0,
      per_item_cost: 0,
      selling_price: 0
    };
    if (isEdit) setEditPurchaseItems(prev => [...prev, newItem]);
    else setPurchaseItems(prev => [...prev, newItem]);
  };

  const removeItem = (id, isEdit = false) => {
    if (isEdit) setEditPurchaseItems(prev => prev.filter(i => i.id !== id));
    else setPurchaseItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id, field, value, isEdit = false) => {
    const updater = (prev) => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    if (isEdit) setEditPurchaseItems(updater);
    else setPurchaseItems(updater);
  };

  const handleProductSelect = async (product, itemId, isEdit = false) => {
    updateItem(itemId, 'product_id', product.id, isEdit);
    updateItem(itemId, 'product_name', product.product_name, isEdit);

    const units = await fetchUnits(product.id);
    if (units.length > 0) {
      updateItem(itemId, 'unit_id', units[0].id, isEdit);
      updateItem(itemId, 'unit_name', units[0].name || units[0].unit_name, isEdit);
    }

    const info = await fetchProductDetails(product.id);
    updateItem(itemId, 'per_item_cost', info.purchase_price || 0, isEdit);
    updateItem(itemId, 'selling_price', info.post_gst_sale_cost || 0, isEdit);
  };

  /* ------------------------------------------------------------------ */
  /*  CALCULATIONS                                                      */
  /* ------------------------------------------------------------------ */
  const calculateTotals = (items, absoluteDiscount = 0, paidAmount = 0, setPaidAdjustment = 0) => {
    let subtotal = 0;
    items.forEach(item => {
      let total = item.quantity * item.per_item_cost;
      total -= total * (item.discount / 100);
      total += total * (item.gst / 100);
      subtotal += total;
    });

    const payable = Math.max(0, subtotal - absoluteDiscount);
    const newPaid = paidAmount + setPaidAdjustment;
    const due = Math.max(0, payable - newPaid);

    return { subtotal, payable, due, newPaid };
  };

  /* ------------------------------------------------------------------ */
  /*  CURRENCY SYMBOL                                                   */
  /* ------------------------------------------------------------------ */
  const getCurrencySymbol = () => {
    const company = JSON.parse(localStorage.getItem('selectedCompany') || '{}');
    return company.currency || '₹';
  };

  /* ------------------------------------------------------------------ */
  /*  VENDOR SEARCH                                                     */
  /* ------------------------------------------------------------------ */
  const searchVendors = async () => {
    const name = document.getElementById('vendorNameSearch')?.value.trim().toLowerCase() || '';
    const pan = document.getElementById('vendorPanSearch')?.value.trim().toLowerCase() || '';
    const gst = document.getElementById('vendorGstSearch')?.value.trim().toLowerCase() || '';
    const phone = document.getElementById('vendorPhoneSearch')?.value.trim().toLowerCase() || '';
    const email = document.getElementById('vendorEmailSearch')?.value.trim().toLowerCase() || '';

    const filtered = vendorsList.filter(v =>
      (!name || v.vendor_name.toLowerCase().includes(name)) &&
      (!pan || v.pan.toLowerCase().includes(pan)) &&
      (!gst || v.gst_no.toLowerCase().includes(gst)) &&
      (!phone || v.phone.toLowerCase().includes(phone)) &&
      (!email || v.email.toLowerCase().includes(email))
    );
    setVendorSearchResults(filtered);
  };

  /* ------------------------------------------------------------------ */
  /*  ADD VENDOR                                                        */
  /* ------------------------------------------------------------------ */
  const saveNewVendor = async () => {
    const token = localStorage.getItem('authToken');
    const data = {
      name: document.getElementById('addVendorName').value.trim(),
      email: document.getElementById('addVendorEmail').value.trim(),
      phone: document.getElementById('addVendorPhone').value.trim(),
      address: document.getElementById('addVendorAddress').value.trim(),
      gst_no: document.getElementById('addVendorGst').value.trim(),
      pan: document.getElementById('addVendorPan').value.trim(),
      uid: user.id,
      cid: user.cid
    };

    if (!data.name) {
      showToast('Vendor name is required');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (res.ok && result.purchase_client) {
        const newVendor = {
          id: result.purchase_client.id,
          vendor_name: result.purchase_client.name,
          email: data.email,
          phone: data.phone,
          gst_no: data.gst_no,
          pan: data.pan
        };
        setVendorsList(prev => [...prev, newVendor]);
        setSelectedVendor({ id: newVendor.id, name: newVendor.vendor_name });
        setShowAddVendor(false);
        setShowAddPurchase(true);
        showToast('Vendor added successfully');
      } else {
        showToast(result.message || 'Failed to add vendor');
      }
    } catch (err) {
      showToast('Failed to add vendor');
    }
  };

  /* ------------------------------------------------------------------ */
  /*  SAVE PURCHASE                                                     */
  /* ------------------------------------------------------------------ */
  const savePurchase = async () => {
    const billName = document.getElementById('purchaseBillName').value.trim();
    const paymentMode = document.getElementById('purchasePaymentMode').value;
    const dateTime = document.getElementById('purchaseDateTime').value;
    const paidAmount = parseFloat(document.getElementById('purchasePaidAmount').value) || 0;
    const absoluteDiscount = parseFloat(document.getElementById('purchaseAbsoluteDiscount').value) || 0;

    if (!selectedVendor.id) {
      showToast('Please select a vendor');
      return;
    }
    if (!dateTime) {
      showToast('Please select date and time');
      return;
    }

    const products = purchaseItems
      .filter(p => p.product_id && p.quantity > 0 && p.unit_id)
      .map(p => ({
        product_id: p.product_id,
        quantity: parseFloat(p.quantity).toFixed(3),
        unit_id: p.unit_id,
        p_price: parseFloat(p.per_item_cost).toFixed(2),
        s_price: parseFloat(p.selling_price).toFixed(2),
        dis: p.discount,
        gst: parseFloat(p.gst).toFixed(2)
      }));

    if (products.length === 0) {
      showToast('Add at least one valid product');
      return;
    }

    const payload = {
      products,
      vendor_id: selectedVendor.id,
      payment_mode: paymentModeMap[paymentMode] || 3,
      purchase_date: dateTime.replace('T', ' ') + ':00',
      absolute_discount: absoluteDiscount.toFixed(2),
      paid_amount: paidAmount.toFixed(2),
      payable_amount: (calculateTotals(purchaseItems, absoluteDiscount, 0).payable).toFixed(2),
      total_amount: calculateTotals(purchaseItems, 0, 0).subtotal.toFixed(2)
    };
    if (billName) payload.bill_name = billName;

    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`${API_BASE_URL}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.message === 'Purchases recorded successfully') {
        showToast('Purchase added successfully');
        resetAddPurchase();
        fetchPurchases();
      } else {
        showToast('Failed to save purchase');
      }
    } catch (err) {
      showToast('Failed to save purchase');
    }
  };

  const resetAddPurchase = () => {
    setPurchaseItems([]);
    setSelectedVendor({ id: '', name: '' });
    setShowAddPurchase(false);
    setShowSearchVendor(false);
    addItemRow(false);
  };

  /* ------------------------------------------------------------------ */
  /*  EDIT PURCHASE                                                     */
  /* ------------------------------------------------------------------ */
  const openEdit = async (transactionId) => {
    const details = await fetchPurchaseDetails(transactionId);
    if (!details) return;

    setEditTransactionId(transactionId);
    setEditOriginalPaidAmount(parseFloat(details.paid_amount) || 0);
    setSelectedVendor({ id: details.vendor_id, name: details.vendor_name });

    // Set form state
    setEditForm({
      billName: details.bill_name || '',
      dateTime: details.date.slice(0, 16),
      paymentMode: reversePaymentModeMap[details.payment_mode] || 'cash',
      absoluteDiscount: parseFloat(details.absolute_discount) || 0,
      setPaidAmount: 0
    });

    const items = details.products.map(p => ({
      id: Date.now() + Math.random(),
      product_id: p.product_id,
      product_name: p.product_name,
      quantity: p.quantity,
      unit_id: p.unit_id,
      unit_name: p.unit_name,
      discount: p.discount || 0,
      gst: p.gst || 0,
      per_item_cost: p.per_item_cost,
      selling_price: p.selling_price || 0
    }));

    setEditPurchaseItems(items.length > 0 ? items : [createEmptyItem()]);
    setShowEditPurchase(true);
  };

  const createEmptyItem = () => ({
    id: Date.now(),
    product_id: '',
    product_name: '',
    quantity: 0,
    unit_id: '',
    unit_name: '',
    discount: 0,
    gst: 0,
    per_item_cost: 0,
    selling_price: 0
  });

  const saveEditedPurchase = async () => {
    const products = editPurchaseItems
      .filter(p => p.product_id && p.quantity > 0 && p.unit_id)
      .map(p => ({
        product_id: p.product_id,
        quantity: parseFloat(p.quantity).toFixed(3),
        unit_id: p.unit_id,
        p_price: parseFloat(p.per_item_cost).toFixed(2),
        s_price: parseFloat(p.selling_price).toFixed(2),
        dis: p.discount,
        gst: parseFloat(p.gst).toFixed(2)
      }));

    if (products.length === 0) {
      showToast('Add at least one valid product');
      return;
    }

    const payload = {
      bill_name: editForm.billName,
      vendor_id: selectedVendor.id,
      payment_mode: paymentModeMap[editForm.paymentMode] || 3,
      updated_at: editForm.dateTime.replace('T', ' ') + ':00',
      absolute_discount: editForm.absoluteDiscount.toFixed(2),
      set_paid_amount: editForm.setPaidAmount.toFixed(2),
      products
    };

    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`${API_BASE_URL}/transactions/${editTransactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.status === 'success') {
        showToast('Purchase updated');
        setShowEditPurchase(false);
        fetchPurchases();
        setDetailsCache(prev => ({ ...prev, [editTransactionId]: null }));
      } else {
        showToast('Failed to update');
      }
    } catch (err) {
      showToast('Failed to update');
    }
  };

  const deletePurchase = async (id) => {
    if (!confirm('Delete this purchase?')) return;
    const token = localStorage.getItem('authToken');
    try {
      await fetch(`${API_BASE_URL}/destroy-purchase/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('Purchase deleted');
      fetchPurchases();
    } catch (err) {
      showToast('Failed to delete');
    }
  };

  // Calculate Edit Totals
  useEffect(() => {
    if (showEditPurchase) {
      const { subtotal, payable, due } = calculateTotals(
        editPurchaseItems,
        editForm.absoluteDiscount,
        editOriginalPaidAmount,
        editForm.setPaidAmount
      );
      setEditTotals({ subtotal, payable, due });
    }
  }, [editPurchaseItems, editForm, editOriginalPaidAmount, showEditPurchase]);

  /* ------------------------------------------------------------------ */
  /*  RENDER                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Purchase</h2>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <span className="text-gray-700">{userName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-lg font-semibold">Vendor Purchases</h3>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search purchases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-md w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={() => { setShowSearchVendor(true); fetchVendors(); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Purchase Bill
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.map((p, idx) => {
                  const tid = p.transaction_id.toString();
                  const isOpen = openDetails[tid];
                  const details = detailsCache[tid];
                  const currency = getCurrencySymbol();

                  return (
                    <React.Fragment key={tid}>
                      <tr>
                        <td className="px-4 py-3 text-sm">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                        <td className="px-4 py-3 text-sm">{p.bill_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{p.vendor_name}</td>
                        <td className="px-4 py-3 text-sm">{p.payment_mode}</td>
                        <td className="px-4 py-3 text-sm">{p.date}</td>
                        <td className="px-4 py-3 text-sm">{p.purchased_by || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm flex gap-2">
                          <button onClick={() => toggleDetails(tid)} className="text-blue-600 hover:underline">
                            {isOpen ? 'Hide' : 'View'}
                          </button>
                          <button onClick={() => openEdit(p.transaction_id)} className="text-green-600 hover:underline">Edit</button>
                          <button onClick={() => deletePurchase(p.transaction_id)} className="text-red-600 hover:underline">Delete</button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 bg-gray-50">
                            {details ? (
                              <div className="text-xs">
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                  <span><strong>Bill:</strong> {details.bill_name}</span>
                                  <span><strong>ID:</strong> {p.transaction_id}</span>
                                  <span><strong>Date:</strong> {p.date}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                  <span><strong>Vendor:</strong> {p.vendor_name}</span>
                                  <span><strong>By:</strong> {p.purchased_by}</span>
                                  <span><strong>Pay:</strong> {p.payment_mode}</span>
                                </div>
                                <hr className="my-2" />
                                <h4 className="font-medium mb-1">Items</h4>
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th className="px-2 py-1 text-left">Product</th>
                                      <th className="px-2 py-1 text-left">Qty</th>
                                      <th className="px-2 py-1 text-left">Unit</th>
                                      <th className="px-2 py-1 text-left">Disc</th>
                                      <th className="px-2 py-1 text-left">GST</th>
                                      <th className="px-2 py-1 text-left">Cost</th>
                                      <th className="px-2 py-1 text-left">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {details.products.map(prod => (
                                      <tr key={prod.id}>
                                        <td className="px-2 py-1">{prod.product_name}</td>
                                        <td className="px-2 py-1">{prod.quantity}</td>
                                        <td className="px-2 py-1">{prod.unit_name}</td>
                                        <td className="px-2 py-1">{prod.discount}</td>
                                        <td className="px-2 py-1">{prod.gst}</td>
                                        <td className="px-2 py-1">{currency}{parseFloat(prod.per_item_cost).toFixed(2)}</td>
                                        <td className="px-2 py-1">{currency}{parseFloat(prod.per_product_total).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-gray-50">
                                    <tr><td colSpan={6} className="text-right font-medium">Total:</td><td>{currency}{parseFloat(details.total_amount).toFixed(2)}</td></tr>
                                    <tr><td colSpan={6} className="text-right font-medium">Discount:</td><td>{currency}{parseFloat(details.absolute_discount).toFixed(2)}</td></tr>
                                    <tr><td colSpan={6} className="text-right font-medium">Payable:</td><td>{currency}{parseFloat(details.payable_amount).toFixed(2)}</td></tr>
                                    <tr><td colSpan={6} className="text-right font-medium">Paid:</td><td>{currency}{parseFloat(details.paid_amount).toFixed(2)}</td></tr>
                                    <tr><td colSpan={6} className="text-right font-medium">Due:</td><td>{currency}{parseFloat(details.due_amount).toFixed(2)}</td></tr>
                                  </tfoot>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-2 text-gray-500">Loading...</div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {paginated.map((p, idx) => {
              const tid = p.transaction_id.toString();
              const isOpen = openDetails[tid];
              const details = detailsCache[tid];
              const currency = getCurrencySymbol();

              return (
                <div key={tid} className="border-b p-4">
                  <div className="font-semibold">{p.bill_name || 'N/A'}</div>
                  <div className="text-sm text-gray-600">Vendor: {p.vendor_name}</div>
                  <div className="text-sm text-gray-600">Date: {p.date}</div>
                  <div className="mt-2 flex gap-2 flex-wrap text-xs">
                    <button onClick={() => toggleDetails(tid)} className="text-blue-600 underline">{isOpen ? 'Hide' : 'View'}</button>
                    <button onClick={() => openEdit(p.transaction_id)} className="text-green-600 underline">Edit</button>
                    <button onClick={() => deletePurchase(p.transaction_id)} className="text-red-600 underline">Delete</button>
                  </div>
                  {isOpen && details && (
                    <div className="mt-3 bg-gray-50 p-3 rounded text-xs">
                      <div className="grid grid-cols-2 gap-1 mb-2">
                        <span><strong>Bill:</strong> {details.bill_name}</span>
                        <span><strong>ID:</strong> {p.transaction_id}</span>
                      </div>
                      <h4 className="font-medium mb-1">Items</h4>
                      {details.products.map(prod => (
                        <div key={prod.id} className="flex justify-between">
                          <span>{prod.product_name}</span>
                          <span>{prod.quantity} {prod.unit_name} @ {currency}{parseFloat(prod.per_item_cost).toFixed(2)}</span>
                        </div>
                      ))}
                      <hr className="my-2" />
                      <div className="grid grid-cols-2 gap-1">
                        <span>Total:</span><span className="text-right">{currency}{parseFloat(details.total_amount).toFixed(2)}</span>
                        <span>Discount:</span><span className="text-right">{currency}{parseFloat(details.absolute_discount).toFixed(2)}</span>
                        <span>Payable:</span><span className="text-right">{currency}{parseFloat(details.payable_amount).toFixed(2)}</span>
                        <span>Paid:</span><span className="text-right">{currency}{parseFloat(details.paid_amount).toFixed(2)}</span>
                        <span>Due:</span><span className="text-right">{currency}{parseFloat(details.due_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="p-4 flex justify-between items-center border-t">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 rounded border disabled:opacity-50">Previous</button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, currentPage - 2) + i;
                if (page > totalPages) return null;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded ${page === currentPage ? 'bg-blue-600 text-white' : 'border'}`}>
                    {page}
                  </button>
                );
              })}
            </div>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Popups */}
      {showSearchVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Search Vendor</h2>
              <button onClick={() => setShowSearchVendor(false)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input id="vendorNameSearch" placeholder="Name" className="px-3 py-2 border rounded" onInput={searchVendors} />
                <input id="vendorPanSearch" placeholder="PAN" className="px-3 py-2 border rounded" onInput={searchVendors} />
                <input id="vendorGstSearch" placeholder="GST" className="px-3 py-2 border rounded" onInput={searchVendors} />
                <input id="vendorPhoneSearch" placeholder="Phone" className="px-3 py-2 border rounded" onInput={searchVendors} />
                <input id="vendorEmailSearch" placeholder="Email" className="px-3 py-2 border rounded col-span-2" onInput={searchVendors} />
              </div>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setShowAddVendor(true)} className="px-4 py-2 bg-blue-600 text-white rounded">Add Vendor</button>
                <button onClick={searchVendors} className="px-4 py-2 border rounded">Search</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">PAN</th>
                    <th className="p-2 text-left">GST</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorSearchResults.length > 0 ? vendorSearchResults.map(v => (
                    <tr key={v.id} className="border-b">
                      <td className="p-2">{v.vendor_name}</td>
                      <td className="p-2">{v.pan}</td>
                      <td className="p-2">{v.gst_no}</td>
                      <td className="p-2">{v.phone}</td>
                      <td className="p-2">
                        <button
                          onClick={() => {
                            setSelectedVendor({ id: v.id, name: v.vendor_name });
                            setShowSearchVendor(false);
                            setShowAddPurchase(true);
                            addItemRow(false);
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">No vendors found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAddVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <button onClick={() => setShowAddVendor(false)} className="text-gray-500">←</button>
              <h2 className="text-xl font-bold">Add Vendor</h2>
              <button onClick={() => setShowAddVendor(false)} className="text-gray-500">×</button>
            </div>
            <div className="p-4 space-y-3">
              <input id="addVendorName" placeholder="Name *" className="w-full px-3 py-2 border rounded" />
              <input id="addVendorPan" placeholder="PAN" className="w-full px-3 py-2 border rounded" />
              <input id="addVendorGst" placeholder="GST" className="w-full px-3 py-2 border rounded" />
              <input id="addVendorPhone" placeholder="Phone" className="w-full px-3 py-2 border rounded" />
              <input id="addVendorEmail" placeholder="Email" className="w-full px-3 py-2 border rounded" />
              <input id="addVendorAddress" placeholder="Address" className="w-full px-3 py-2 border rounded" />
              <button onClick={saveNewVendor} className="w-full py-2 bg-blue-600 text-white rounded">Save Vendor</button>
            </div>
          </div>
        </div>
      )}

      {showAddPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Add Purchase</h2>
              <button onClick={resetAddPurchase} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input id="purchaseBillName" placeholder="Bill Name" className="px-3 py-2 border rounded" />
                <input value={selectedVendor.name} readOnly placeholder="Vendor" className="px-3 py-2 border rounded bg-gray-50" />
                <input type="datetime-local" id="purchaseDateTime" className="px-3 py-2 border rounded" defaultValue={new Date().toISOString().slice(0, 16)} />
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">S.No</th>
                    <th className="p-2">Product</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Unit</th>
                    <th className="p-2">Disc %</th>
                    <th className="p-2">GST %</th>
                    <th className="p-2">Cost</th>
                    <th className="p-2">Sell</th>
                    <th className="p-2">Total</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseItems.map((item, idx) => {
                    const total = (item.quantity * item.per_item_cost * (1 - item.discount / 100) * (1 + item.gst / 100)).toFixed(2);
                    return (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 text-center">{idx + 1}</td>
                        <td className="p-2">
                          <AutocompleteInput
                            value={item.product_name}
                            onChange={(val) => updateItem(item.id, 'product_name', val, false)}
                            onSelect={handleProductSelect}
                            placeholder="Product"
                            products={productsCache}
                            itemId={item.id}
                            isEdit={false}
                          />
                        </td>
                        <td className="p-2"><input type="number" step="0.01" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0, false)} className="w-full px-2 py-1 border rounded" /></td>
                        <td className="p-2">
                          <select value={item.unit_id} onChange={e => updateItem(item.id, 'unit_id', e.target.value, false)} className="w-full px-2 py-1 border rounded">
                            <option value="">Select</option>
                            {item.unit_id && <option value={item.unit_id}>{item.unit_name}</option>}
                          </select>
                        </td>
                        <td className="p-2"><input type="number" value={item.discount} onChange={e => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0, false)} className="w-16 px-1 py-1 border rounded" /></td>
                        <td className="p-2"><input type="number" value={item.gst} onChange={e => updateItem(item.id, 'gst', parseFloat(e.target.value) || 0, false)} className="w-16 px-1 py-1 border rounded" /></td>
                        <td className="p-2"><input type="number" step="0.01" value={item.per_item_cost} onChange={e => updateItem(item.id, 'per_item_cost', parseFloat(e.target.value) || 0, false)} className="w-full px-2 py-1 border rounded" /></td>
                        <td className="p-2"><input type="number" step="0.01" value={item.selling_price} onChange={e => updateItem(item.id, 'selling_price', parseFloat(e.target.value) || 0, false)} className="w-full px-2 py-1 border rounded" /></td>
                        <td className="p-2 text-right">{total}</td>
                        <td className="p-2 text-center">
                          <button onClick={() => removeItem(item.id, false)} className="text-red-600 hover:text-red-800">×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-end gap-2">
                <button onClick={() => addItemRow(false)} className="px-3 py-1 border rounded text-sm">+ Add Item</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <input id="purchaseFinalTotal" readOnly placeholder="Final Total" className="px-3 py-2 border rounded bg-gray-50" />
                <input id="purchaseAbsoluteDiscount" type="number" step="0.01" placeholder="Abs. Discount" className="px-3 py-2 border rounded" />
                <input id="purchasePayableAmount" readOnly placeholder="Payable" className="px-3 py-2 border rounded bg-gray-50" />
                <input id="purchasePaidAmount" type="number" step="0.01" placeholder="Paid" className="px-3 py-2 border rounded" />
                <input id="purchaseDueAmount" readOnly placeholder="Due" className="px-3 py-2 border rounded bg-gray-50" />
              </div>

              <select id="purchasePaymentMode" className="w-full md:w-64 px-3 py-2 border rounded">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="phonepe">PhonePe</option>
              </select>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddPurchase(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={savePurchase} className="px-4 py-2 bg-blue-600 text-white rounded">Save Purchase</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Purchase Popup */}
      {showEditPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Purchase</h2>
              <button onClick={() => setShowEditPurchase(false)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  value={editForm.billName}
                  onChange={e => setEditForm(prev => ({ ...prev, billName: e.target.value }))}
                  placeholder="Bill Name"
                  className="px-3 py-2 border rounded"
                />
                <input value={selectedVendor.name} readOnly className="px-3 py-2 border rounded bg-gray-50" />
                <input
                  type="datetime-local"
                  value={editForm.dateTime}
                  onChange={e => setEditForm(prev => ({ ...prev, dateTime: e.target.value }))}
                  className="px-3 py-2 border rounded"
                />
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">S.No</th>
                    <th className="p-2">Product</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Unit</th>
                    <th className="p-2">Disc %</th>
                    <th className="p-2">GST %</th>
                    <th className="p-2">Cost</th>
                    <th className="p-2">Sell</th>
                    <th className="p-2">Total</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {editPurchaseItems.map((item, idx) => {
                    const total = (item.quantity * item.per_item_cost * (1 - item.discount / 100) * (1 + item.gst / 100)).toFixed(2);
                    return (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 text-center">{idx + 1}</td>
                        <td className="p-2">
                          <AutocompleteInput
                            value={item.product_name}
                            onChange={(val) => updateItem(item.id, 'product_name', val, true)}
                            onSelect={handleProductSelect}
                            placeholder="Product"
                            products={productsCache}
                            itemId={item.id}
                            isEdit={true}
                          />
                        </td>
                        <td className="p-2"><input type="number" step="0.01" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0, true)} className="w-full px-2 py-1 border rounded" /></td>
                        <td className="p-2">
                          <select value={item.unit_id} onChange={e => updateItem(item.id, 'unit_id', e.target.value, true)} className="w-full px-2 py-1 border rounded">
                            <option value="">Select</option>
                            {item.unit_id && <option value={item.unit_id}>{item.unit_name}</option>}
                          </select>
                        </td>
                        <td className="p-2"><input type="number" value={item.discount} onChange={e => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0, true)} className="w-16 px-1 py-1 border rounded" /></td>
                        <td className="p-2"><input type="number" value={item.gst} onChange={e => updateItem(item.id, 'gst', parseFloat(e.target.value) || 0, true)} className="w-16 px-1 py-1 border rounded" /></td>
                        <td className="p-2"><input type="number" step="0.01" value={item.per_item_cost} onChange={e => updateItem(item.id, 'per_item_cost', parseFloat(e.target.value) || 0, true)} className="w-full px-2 py-1 border rounded" /></td>
                        <td className="p-2"><input type="number" step="0.01" value={item.selling_price} onChange={e => updateItem(item.id, 'selling_price', parseFloat(e.target.value) || 0, true)} className="w-full px-2 py-1 border rounded" /></td>
                        <td className="p-2 text-right">{total}</td>
                        <td className="p-2 text-center">
                          <button onClick={() => removeItem(item.id, true)} className="text-red-600 hover:text-red-800">×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-end gap-2">
                <button onClick={() => addItemRow(true)} className="px-3 py-1 border rounded text-sm">+ Add Item</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium">Final Total</label>
                  <input value={editTotals.subtotal.toFixed(2)} readOnly className="w-full px-3 py-2 border rounded bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium">Abs. Discount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.absoluteDiscount}
                    onChange={e => setEditForm(prev => ({ ...prev, absoluteDiscount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Payable</label>
                  <input value={editTotals.payable.toFixed(2)} readOnly className="w-full px-3 py-2 border rounded bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium">Paid (Original)</label>
                  <input value={editOriginalPaidAmount.toFixed(2)} readOnly className="w-full px-3 py-2 border rounded bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium">Set Paid Adj.</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.setPaidAmount}
                    onChange={e => setEditForm(prev => ({ ...prev, setPaidAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Due</label>
                  <input value={editTotals.due.toFixed(2)} readOnly className="w-full px-3 py-2 border rounded bg-gray-50" />
                </div>
              </div>

              <select
                value={editForm.paymentMode}
                onChange={e => setEditForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                className="w-full md:w-64 px-3 py-2 border rounded"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="phonepe">PhonePe</option>
              </select>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowEditPurchase(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={saveEditedPurchase} className="px-4 py-2 bg-green-600 text-white rounded">Update Purchase</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-md shadow-lg z-50 animate-pulse">
          {toast.message}
        </div>
      )}
    </>
  );
};

export default Purchase;