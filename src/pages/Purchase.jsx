import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = "http://127.0.0.1:8000/api";

const paymentModeMap = {
  'credit_card': 1, 'debit_card': 2, 'cash': 3, 'upi': 4, 'bank_transfer': 5, 'phonepe': 6
};

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
  const [productsCache, setProductsCache] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '' });
  const itemsPerPage = 50;

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

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
    if (!user.cid || !token) return;
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
      console.error(err);
    }
  };

  useEffect(() => {
    if (user.cid) {
      fetchVendors();
      fetchPurchases();
    }
  }, [user.cid]);

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

  const AutocompleteInput = ({ value, onChange, onSelect, placeholder, products }) => {
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
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {show && suggestions.length > 0 && (
          <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
            {suggestions.map(p => (
              <div
                key={p.id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  onSelect(p);
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
    if (isEdit) {
      setEditPurchaseItems(prev => [...prev, newItem]);
    } else {
      setPurchaseItems(prev => [...prev, newItem]);
    }
  };

  const removeItem = (id, isEdit = false) => {
    if (isEdit) {
      setEditPurchaseItems(prev => prev.filter(i => i.id !== id));
    } else {
      setPurchaseItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const updateItem = (id, field, value, isEdit = false) => {
    const update = (prev) => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    if (isEdit) {
      setEditPurchaseItems(update);
    } else {
      setPurchaseItems(update);
    }
  };

  const handleProductSelect = async (product, itemId, isEdit = false) => {
    updateItem(itemId, 'product_id', product.id, isEdit);
    updateItem(itemId, 'product_name', product.product_name, isEdit);

    const units = await fetchUnits(product.id);
    if (units.length > 0) {
      updateItem(itemId, 'unit_id', units[0].id, isEdit);
      updateItem(itemId, 'unit_name', units[0].name || units[0].unit_name, isEdit);
    }

    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`${API_BASE_URL}/units/${product.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const info = data.product_info || {};
      updateItem(itemId, 'per_item_cost', info.purchase_price || 0, isEdit);
      updateItem(itemId, 'selling_price', info.post_gst_sale_cost || 0, isEdit);
    } catch (err) { }
  };

  const calculateTotals = (items, absDiscount = 0) => {
    let subtotal = 0;
    items.forEach(item => {
      let total = (item.quantity || 0) * (item.per_item_cost || 0);
      total -= total * (item.discount || 0) / 100;
      total += total * (item.gst || 0) / 100;
      subtotal += total;
    });
    const payable = Math.max(0, subtotal - absDiscount);
    return { subtotal, payable };
  };

  const savePurchase = async () => {
    const token = localStorage.getItem('authToken');
    if (!selectedVendor.id) return showToast('Select a vendor');
    if (purchaseItems.length === 0) return showToast('Add at least one item');

    const products = purchaseItems.map(i => ({
      product_id: i.product_id,
      quantity: parseFloat(i.quantity).toFixed(3),
      unit_id: i.unit_id,
      p_price: parseFloat(i.per_item_cost).toFixed(2),
      s_price: parseFloat(i.selling_price).toFixed(2),
      dis: i.discount || 0,
      gst: parseFloat(i.gst).toFixed(2)
    }));

    const payload = {
      products,
      vendor_id: selectedVendor.id,
      payment_mode: paymentModeMap[document.getElementById('purchasePaymentMode')?.value] || 3,
      purchase_date: new Date(document.getElementById('purchaseDateTime')?.value).toISOString().slice(0, 16) + ':00',
      absolute_discount: parseFloat(document.getElementById('purchaseAbsoluteDiscount')?.value || 0).toFixed(2),
      paid_amount: parseFloat(document.getElementById('purchasePaidAmount')?.value || 0).toFixed(2),
      payable_amount: parseFloat(document.getElementById('purchasePayableAmount')?.value || 0).toFixed(2),
      total_amount: parseFloat(document.getElementById('purchaseFinalTotal')?.value || 0).toFixed(2),
      bill_name: document.getElementById('purchaseBillName')?.value
    };

    try {
      const res = await fetch(`${API_BASE_URL}/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.message === 'Purchases recorded successfully') {
        showToast('Purchase added!');
        setShowAddPurchase(false);
        setPurchaseItems([]);
        fetchPurchases();
      }
    } catch (err) {
      showToast('Failed to save');
    }
  };

  const deletePurchase = async (id) => {
    if (!window.confirm('Delete this purchase?')) return;
    const token = localStorage.getItem('authToken');
    try {
      await fetch(`${API_BASE_URL}/destroy-purchase/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('Deleted');
      fetchPurchases();
    } catch (err) {
      showToast('Failed');
    }
  };

  const openEdit = async (transactionId) => {
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

      setEditTransactionId(transactionId);
      setShowEditPurchase(true);

      // Populate form
      const setVal = (id, val) => document.getElementById(id)?.setAttribute('value', val);
      setVal('editPurchaseBillName', details.bill_name || '');
      setVal('editVendorName', details.vendor_name || '');
      setVal('editPurchaseDateTime', details.date.slice(0, 16));
      document.getElementById('editPurchasePaymentMode').value = Object.keys(paymentModeMap).find(k => paymentModeMap[k] === details.payment_mode) || 'cash';
      setVal('editPurchaseFinalTotal', parseFloat(details.total_amount).toFixed(2));
      setVal('editPurchaseAbsoluteDiscount', parseFloat(details.absolute_discount).toFixed(2));
      setVal('editPurchasePayableAmount', parseFloat(details.payable_amount).toFixed(2));
      setVal('editPurchasePaidAmount', parseFloat(details.paid_amount).toFixed(2));
      setVal('editPurchaseDueAmount', parseFloat(details.due_amount).toFixed(2));

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
      setEditPurchaseItems(items.length ? items : []);
    } catch (err) {
      showToast('Failed to load');
    }
  };

  const saveEdit = async () => {
    const token = localStorage.getItem('authToken');
    const products = editPurchaseItems.map(i => ({
      product_id: i.product_id,
      quantity: parseFloat(i.quantity).toFixed(3),
      unit_id: i.unit_id,
      p_price: parseFloat(i.per_item_cost).toFixed(2),
      s_price: parseFloat(i.selling_price).toFixed(2),
      dis: i.discount || 0,
      gst: parseFloat(i.gst).toFixed(2)
    }));

    const payload = {
      bill_name: document.getElementById('editPurchaseBillName').value,
      vendor_id: selectedVendor.id || vendorsList.find(v => v.vendor_name === document.getElementById('editVendorName').value)?.id,
      payment_mode: paymentModeMap[document.getElementById('editPurchasePaymentMode').value] || 3,
      updated_at: new Date(document.getElementById('editPurchaseDateTime').value).toISOString().slice(0, 16) + ':00',
      absolute_discount: parseFloat(document.getElementById('editPurchaseAbsoluteDiscount').value || 0).toFixed(2),
      set_paid_amount: parseFloat(document.getElementById('editPurchaseSetPaidAmount').value || 0).toFixed(2),
      products
    };

    try {
      const res = await fetch(`${API_BASE_URL}/transactions/${editTransactionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Updated!');
        setShowEditPurchase(false);
        fetchPurchases();
      }
    } catch (err) {
      showToast('Failed');
    }
  };

  const addVendor = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      gst_no: formData.get('gst'),
      pan: formData.get('pan'),
      uid: user.id,
      cid: user.cid
    };

    try {
      const res = await fetch(`${API_BASE_URL}/vendors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.purchase_client) {
        const newV = {
          id: result.purchase_client.id,
          vendor_name: result.purchase_client.name
        };
        setVendorsList(prev => [...prev, newV]);
        setSelectedVendor(newV);
        setShowAddVendor(false);
        setShowAddPurchase(true);
        showToast('Vendor added');
      }
    } catch (err) {
      showToast('Failed');
    }
  };

  const [expandedRow, setExpandedRow] = useState(null);
  const toggleDetails = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.map((p, idx) => (
                  <React.Fragment key={p.transaction_id}>
                    <tr>
                      <td className="px-4 py-3 text-sm">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-4 py-3 text-sm">{p.bill_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{p.vendor_name}</td>
                      <td className="px-4 py-3 text-sm">{p.payment_mode}</td>
                      <td className="px-4 py-3 text-sm">{p.date}</td>
                      <td className="px-4 py-3 text-sm">{p.purchased_by || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm">
                        <button onClick={() => toggleDetails(p.transaction_id)} className="text-blue-600 hover:underline mr-2">View</button>
                        <button onClick={() => openEdit(p.transaction_id)} className="text-green-600 hover:underline mr-2">Edit</button>
                        <button onClick={() => deletePurchase(p.transaction_id)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                    {expandedRow === p.transaction_id && (
                      <tr>
                        <td colSpan="7" className="px-4 py-3 bg-gray-50">
                          <div className="text-sm">Details loading...</div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {paginated.map((p, idx) => (
              <div key={p.transaction_id} className="border-b p-4">
                <div className="font-semibold">{p.bill_name || 'N/A'}</div>
                <div className="text-sm text-gray-600">Vendor: {p.vendor_name}</div>
                <div className="text-sm text-gray-600">Date: {p.date}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => toggleDetails(p.transaction_id)} className="text-xs text-blue-600">View</button>
                  <button onClick={() => openEdit(p.transaction_id)} className="text-xs text-green-600">Edit</button>
                  <button onClick={() => deletePurchase(p.transaction_id)} className="text-xs text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="p-4 flex justify-between items-center border-t">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, currentPage - 2) + i;
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${page === currentPage ? 'bg-blue-600 text-white' : 'border'}`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Search Vendor Modal */}
      {showSearchVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Search Vendor</h2>
              <button onClick={() => setShowSearchVendor(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <table className="w-full mb-4">
                <tbody>
                  <tr><td className="pb-2">Name:</td><td><input id="vendorNameSearch" className="w-full px-3 py-2 border rounded-md" /></td></tr>
                  <tr><td className="pb-2">PAN:</td><td><input id="vendorPanSearch" className="w-full px-3 py-2 border rounded-md" /></td></tr>
                  <tr><td className="pb-2">GST:</td><td><input id="vendorGstSearch" className="w-full px-3 py-2 border rounded-md" /></td></tr>
                  <tr><td className="pb-2">Phone:</td><td><input id="vendorPhoneSearch" className="w-full px-3 py-2 border rounded-md" /></td></tr>
                </tbody>
              </table>
              <div className="flex gap-2 mb-4">
                <button onClick={() => { setShowAddVendor(true); setShowSearchVendor(false); }} className="bg-gray-600 text-white px-4 py-2 rounded-md">Add Vendor</button>
                <button onClick={async () => {
                  const name = document.getElementById('vendorNameSearch').value.toLowerCase();
                  const filtered = vendorsList.filter(v => v.vendor_name.toLowerCase().includes(name));
                  setVendorsList(filtered);
                }} className="bg-blue-600 text-white px-4 py-2 rounded-md">Search</button>
              </div>
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {vendorsList.length === 0 ? (
                  <p className="p-4 text-center text-gray-500">No vendors found</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Action</th></tr>
                    </thead>
                    <tbody>
                      {vendorsList.map(v => (
                        <tr key={v.id} className="border-t">
                          <td className="px-4 py-2">{v.vendor_name}</td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => {
                                setSelectedVendor({ id: v.id, name: v.vendor_name });
                                setShowSearchVendor(false);
                                setShowAddPurchase(true);
                                setPurchaseItems([]);
                                addItemRow();
                              }}
                              className="text-blue-600 hover:underline"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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