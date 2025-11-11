import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, X, Calculator, User, ChevronLeft, ChevronRight,
  Edit as EditIcon, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

//const API_BASE_URL = "http://127.0.0.1:8000/api";

const paymentModeMap = {
  credit_card: 1, debit_card: 2, cash: 3, upi: 4, bank_transfer: 5, phonepe: 6
};
const reversePaymentModeMap = Object.fromEntries(
  Object.entries(paymentModeMap).map(([k, v]) => [v, k])
);

/* ------------------------------------------------------------------ */
/* Debounce */
const debounce = (fn, delay) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};

/* ------------------------------------------------------------------ */
/* Toast Hook */
const useToast = () => {
  const [toast, setToast] = useState({ show: false, msg: '', error: false });

  const show = (msg, error = false) => {
    setToast({ show: true, msg, error });
    setTimeout(() => setToast({ show: false, msg: '', error: false }), 3000);
  };

  return { toast, show };
};

/* ------------------------------------------------------------------ */
/* Row Total Calculator */
const calcRowTotal = (item) => {
  const qty = Number(item.quantity) || 0;
  const cost = Number(item.per_item_cost) || 0;
  const disc = Number(item.discount) || 0;
  const gst = Number(item.gst) || 0;

  let total = qty * cost;
  total -= total * (disc / 100);
  total += total * (gst / 100);
  return Number(total.toFixed(2));
};

/* ------------------------------------------------------------------ */
/* Handle Product Selection (Full Unit Pricing Logic) */
const handleProductSelection = async (row, productId, setItems, rowId, showToast) => {
  if (!productId) return;

  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  try {
    const res = await fetch(`${API_BASE_URL}/units/${productId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Network error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    const unitPricing = Array.isArray(data.unit_pricing) ? data.unit_pricing : [];

    const unitSelect = row.querySelector('.purchase-unit');
    const costInput = row.querySelector('.purchase-cost');
    const gstInput = row.querySelector('.purchase-gst');
    const sellInput = row.querySelector('.purchase-selling-price');
    const discountInput = row.querySelector('.purchase-discount');

    if (!unitSelect) return;

    // Clear and populate unit dropdown
    unitSelect.innerHTML = '<option value="" disabled selected>Select Unit</option>';
    unitPricing.forEach(unit => {
      const option = document.createElement('option');
      option.value = unit.unit_id;
      option.textContent = unit.unit_name;
      option.dataset.purchasePrice = unit.purchase_price || 0;
      option.dataset.salePrice = unit.sale_price || 0;
      option.dataset.gst = unit.gst || 0;
      option.dataset.profitPercentage = unit.profit_percentage || 0;
      unitSelect.appendChild(option);
    });

    if (unitPricing.length === 0) {
      showToast('No unit pricing data available for this product.', true);
      return;
    }

    // Set default to first unit
    const firstUnit = unitPricing[0];
    unitSelect.value = firstUnit.unit_id;
    costInput.value = Number(firstUnit.purchase_price || 0).toFixed(2);
    gstInput.value = Number(firstUnit.gst || 0).toFixed(2);
    sellInput.value = Number(firstUnit.sale_price || 0).toFixed(2);
    discountInput.value = '0.00';

    // Update React state
    setItems(prev => prev.map(i =>
      i.id === rowId
        ? {
            ...i,
            product_id: productId,
            unit_id: firstUnit.unit_id,
            per_item_cost: Number(firstUnit.purchase_price || 0),
            gst: Number(firstUnit.gst || 0),
            selling_price: Number(firstUnit.sale_price || 0),
            discount: 0,
            total: calcRowTotal({
              ...i,
              per_item_cost: Number(firstUnit.purchase_price || 0),
              quantity: i.quantity || 0,
              discount: 0,
              gst: Number(firstUnit.gst || 0)
            })
          }
        : i
    ));

    // Unit change event listener (replace existing to avoid duplicates)
    const handleUnitChange = (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (!selectedOption.dataset.salePrice) return;

      const purchasePrice = Number(selectedOption.dataset.purchasePrice || 0);
      const salePrice = Number(selectedOption.dataset.salePrice || 0);
      const gst = Number(selectedOption.dataset.gst || 0);

      costInput.value = purchasePrice.toFixed(2);
      gstInput.value = gst.toFixed(2);
      sellInput.value = salePrice.toFixed(2);
      discountInput.value = '0.00';

      setItems(prev => prev.map(i =>
        i.id === rowId
          ? {
              ...i,
              unit_id: selectedOption.value,
              per_item_cost: purchasePrice,
              gst: gst,
              selling_price: salePrice,
              discount: 0,
              total: calcRowTotal({
                ...i,
                per_item_cost: purchasePrice,
                quantity: i.quantity || 0,
                discount: 0,
                gst: gst
              })
            }
          : i
      ));
    };

    unitSelect.onchange = handleUnitChange;

  } catch (error) {
    console.error('Error fetching units:', error);
    showToast(`Failed to fetch units: ${error.message}`, true);
  }
};

/* ------------------------------------------------------------------ */
const Purchase = () => {
  const navigate = useNavigate();
  const { toast, show: showToast } = useToast();

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
  const [allProducts, setAllProducts] = useState([]);
  const [detailsCache, setDetailsCache] = useState({});
  const [openDetails, setOpenDetails] = useState({});
  const [vendorSearchResults, setVendorSearchResults] = useState([]);
  const [editForm, setEditForm] = useState({
    billName: '', dateTime: '', paymentMode: 'cash', absoluteDiscount: 0, setPaidAmount: 0
  });
  const [addTotals, setAddTotals] = useState({ subtotal: 0, payable: 0, due: 0 });
  const [editTotals, setEditTotals] = useState({ subtotal: 0, payable: 0, due: 0 });

  const itemsPerPage = 50;
  const autocompleteRefs = useRef({});

  /* ------------------------------------------------------------------ */
  /* USER & INITIAL DATA */
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
      showToast('Failed to fetch vendors', true);
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
      showToast('Failed to fetch purchases', true);
    }
  };

  const fetchProducts = async () => {
    const token = localStorage.getItem('authToken');
    if (!token || !user.cid) return;
    try {
      const res = await fetch(`${API_BASE_URL}/products?cid=${user.cid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const products = (data.products || []).map(p => ({
        ...p,
        purchase_price: parseFloat(p.purchase_price) || 0,
        post_gst_sale_cost: parseFloat(p.post_gst_sale_cost) || 0
      }));
      setAllProducts(products);
    } catch (err) {
      showToast('Failed to load products', true);
    }
  };

  useEffect(() => {
    if (user.cid) {
      fetchVendors();
      fetchPurchases();
      fetchProducts();
    }
  }, [user.cid]);

  /* ------------------------------------------------------------------ */
  /* SEARCH & PAGINATION */
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
  /* AUTOCOMPLETE SETUP */
  /* ------------------------------------------------------------------ */
  // const setupAutocomplete = (rowId, inputRef, isEdit = false) => {
  //   const suggestionsContainer = document.getElementById(`${isEdit ? 'edit' : 'add'}-suggestions-${rowId}`);
  //   if (!suggestionsContainer || !inputRef.current) return;

  //   const handleInput = debounce(() => {
  //     const query = inputRef.current.value.trim().toLowerCase();
  //     suggestionsContainer.innerHTML = '';
  //     suggestionsContainer.style.display = 'none';

  //     if (query.length < 2) return;

  //     const filteredProducts = allProducts.filter(product =>
  //       (product.product_name && product.product_name.toLowerCase().includes(query)) ||
  //       (product.hscode && product.hscode.toLowerCase().includes(query))
  //     ).slice(0, 12);

  //     if (filteredProducts.length === 0) return;

  //     filteredProducts.forEach(product => {
  //       const suggestion = document.createElement('div');
  //       suggestion.textContent = product.product_name;
  //       suggestion.className = 'p-2 hover:bg-gray-100 cursor-pointer border-b text-sm';
  //       suggestion.dataset.productId = product.id;
  //       suggestion.addEventListener('click', async () => {
  //         inputRef.current.value = product.product_name;
  //         const hiddenInput = document.getElementById(`${isEdit ? 'edit' : 'add'}-product-id-${rowId}`);
  //         if (hiddenInput) hiddenInput.value = product.id;

  //         suggestionsContainer.innerHTML = '';
  //         suggestionsContainer.style.display = 'none';

  //         const setItems = isEdit ? setEditPurchaseItems : setPurchaseItems;
  //         setItems(prev => prev.map(i =>
  //           i.id === rowId ? { ...i, product_id: product.id, product_name: product.product_name } : i
  //         ));

  //         const row = inputRef.current.closest('tr');
  //         if (row) {
  //           await handleProductSelection(row, product.id, setItems, rowId, showToast);
  //         }
  //       });
  //       suggestionsContainer.appendChild(suggestion);
  //     });
  //     suggestionsContainer.style.display = 'block';
  //   }, 300);

  //   inputRef.current.addEventListener('input', handleInput);

  //   // Hide on click outside
  //   const hideSuggestions = (e) => {
  //     if (!row.contains(e.target)) {
  //       suggestionsContainer.style.display = 'none';
  //     }
  //   };
  //   document.addEventListener('click', hideSuggestions);

  //   // Keyboard navigation
  //   inputRef.current.addEventListener('keydown', (e) => {
  //     const suggestions = suggestionsContainer.querySelectorAll('div');
  //     if (suggestions.length === 0) return;

  //     let selectedIndex = -1;
  //     suggestions.forEach((s, index) => {
  //       if (s.classList.contains('selected')) selectedIndex = index;
  //     });

  //     if (e.key === 'ArrowDown') {
  //       e.preventDefault();
  //       selectedIndex = (selectedIndex + 1) % suggestions.length;
  //       suggestions.forEach(s => s.classList.remove('selected'));
  //       suggestions[selectedIndex].classList.add('selected');
  //       suggestions[selectedIndex].scrollIntoView({ block: 'nearest' });
  //     } else if (e.key === 'ArrowUp') {
  //       e.preventDefault();
  //       selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
  //       suggestions.forEach(s => s.classList.remove('selected'));
  //       suggestions[selectedIndex].classList.add('selected');
  //       suggestions[selectedIndex].scrollIntoView({ block: 'nearest' });
  //     } else if (e.key === 'Enter' && selectedIndex >= 0) {
  //       e.preventDefault();
  //       suggestions[selectedIndex].click();
  //     } else if (e.key === 'Escape') {
  //       suggestionsContainer.style.display = 'none';
  //     }
  //   });

  //   return () => {
  //     inputRef.current.removeEventListener('input', handleInput);
  //     document.removeEventListener('click', hideSuggestions);
  //   };
  // };
const setupAutocomplete = (rowId, inputRef, isEdit = false) => {
  const suggestionsContainer = document.getElementById(`${isEdit ? 'edit' : 'add'}-suggestions-${rowId}`);
  if (!suggestionsContainer || !inputRef.current) return;

  const row = inputRef.current.closest('tr'); // Capture row here

  const handleInput = debounce(() => {
    const query = inputRef.current.value.trim().toLowerCase();
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.style.display = 'none';
    if (query.length < 2) return;

    const filteredProducts = allProducts.filter(product =>
      (product.product_name && product.product_name.toLowerCase().includes(query)) ||
      (product.hscode && product.hscode.toLowerCase().includes(query))
    ).slice(0, 12);

    if (filteredProducts.length === 0) return;

    filteredProducts.forEach(product => {
      const suggestion = document.createElement('div');
      suggestion.textContent = product.product_name;
      suggestion.className = 'p-2 hover:bg-gray-100 cursor-pointer border-b text-sm';
      suggestion.dataset.productId = product.id;
      suggestion.addEventListener('click', async () => {
        inputRef.current.value = product.product_name;
        const hiddenInput = document.getElementById(`${isEdit ? 'edit' : 'add'}-product-id-${rowId}`);
        if (hiddenInput) hiddenInput.value = product.id;
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';

        const setItems = isEdit ? setEditPurchaseItems : setPurchaseItems;
        setItems(prev => prev.map(i =>
          i.id === rowId ? { ...i, product_id: product.id, product_name: product.product_name } : i
        ));

        // Use the captured `row` here too
        if (row) {
          await handleProductSelection(row, product.id, setItems, rowId, showToast);
        }
      });
      suggestionsContainer.appendChild(suggestion);
    });
    suggestionsContainer.style.display = 'block';
  }, 300);

  inputRef.current.addEventListener('input', handleInput);

  // Fix: Use the captured `row`
  const hideSuggestions = (e) => {
    if (row && !row.contains(e.target)) {
      suggestionsContainer.style.display = 'none';
    }
  };
  document.addEventListener('click', hideSuggestions);

  // ... rest of keyboard navigation ...

  return () => {
    inputRef.current?.removeEventListener('input', handleInput);
    document.removeEventListener('click', hideSuggestions);
  };
};
  /* ------------------------------------------------------------------ */
  /* ITEM ROWS */
  /* ------------------------------------------------------------------ */
  const addItemRow = (isEdit = false) => {
    const id = Date.now() + Math.random();
    const newItem = {
      id,
      product_id: '',
      product_name: '',
      quantity: 0,
      unit_id: '',
      unit_name: '',
      discount: 0,
      gst: 0,
      per_item_cost: 0,
      selling_price: 0,
      total: 0
    };
    const setItems = isEdit ? setEditPurchaseItems : setPurchaseItems;
    setItems(prev => [...prev, newItem]);

    // Setup autocomplete after render
    setTimeout(() => {
      const input = document.getElementById(`${isEdit ? 'edit' : 'add'}-product-input-${id}`);
      if (input) {
        const ref = { current: input };
        autocompleteRefs.current[id] = ref;
        setupAutocomplete(id, ref, isEdit);
      }
    }, 100);
  };

  const removeItem = (id, isEdit = false) => {
    const setItems = isEdit ? setEditPurchaseItems : setPurchaseItems;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const recalculateAll = (items, setItems) => {
    setItems(items.map(i => ({ ...i, total: calcRowTotal(i) })));
  };

  const getFinalTotal = (items) => {
    return items.reduce((sum, i) => sum + i.total, 0).toFixed(2);
  };

  useEffect(() => {
    if (showAddPurchase) {
      const discount = parseFloat(document.getElementById('purchaseAbsoluteDiscount')?.value) || 0;
      const paid = parseFloat(document.getElementById('purchasePaidAmount')?.value) || 0;
      const subtotal = getFinalTotal(purchaseItems);
      const payable = Math.max(0, subtotal - discount).toFixed(2);
      const due = Math.max(0, payable - paid).toFixed(2);
      setAddTotals({ subtotal, payable, due });
    }
  }, [purchaseItems, showAddPurchase]);

  useEffect(() => {
    if (showEditPurchase) {
      const subtotal = getFinalTotal(editPurchaseItems);
      const payable = Math.max(0, subtotal - editForm.absoluteDiscount).toFixed(2);
      const newPaid = editOriginalPaidAmount + editForm.setPaidAmount;
      const due = Math.max(0, payable - newPaid).toFixed(2);
      setEditTotals({ subtotal, payable, due });
    }
  }, [editPurchaseItems, editForm, editOriginalPaidAmount, showEditPurchase]);

  const getCurrencySymbol = () => {
    const company = JSON.parse(localStorage.getItem('selectedCompany') || '{}');
    return company.currency || '₹';
  };

  /* ------------------------------------------------------------------ */
  /* VENDOR SEARCH & ADD */
  /* ------------------------------------------------------------------ */
  const searchVendors = () => {
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
      showToast('Vendor name is required', true);
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
        setPurchaseItems([]);
        addItemRow(false);
        showToast('Vendor added successfully');
      } else {
        showToast(result.message || 'Failed to add vendor', true);
      }
    } catch (err) {
      showToast('Failed to add vendor', true);
    }
  };

  /* ------------------------------------------------------------------ */
  /* SAVE PURCHASE */
  /* ------------------------------------------------------------------ */
  const savePurchase = async () => {
    const billName = document.getElementById('purchaseBillName').value.trim();
    const paymentMode = document.getElementById('purchasePaymentMode').value;
    const dateTime = document.getElementById('purchaseDateTime').value;
    const paidAmount = parseFloat(document.getElementById('purchasePaidAmount').value) || 0;
    const absoluteDiscount = parseFloat(document.getElementById('purchaseAbsoluteDiscount').value) || 0;

    if (!selectedVendor.id) return showToast('Please select a vendor', true);
    if (!dateTime) return showToast('Please select date and time', true);

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

    if (products.length === 0) return showToast('Add at least one valid product', true);

    const payload = {
      products,
      vendor_id: selectedVendor.id,
      payment_mode: paymentModeMap[paymentMode] || 3,
      purchase_date: dateTime.replace('T', ' ') + ':00',
      absolute_discount: absoluteDiscount.toFixed(2),
      paid_amount: paidAmount.toFixed(2),
      payable_amount: addTotals.payable,
      total_amount: addTotals.subtotal
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
        setShowAddPurchase(false);
        setPurchaseItems([]);
        setSelectedVendor({ id: '', name: '' });
        fetchPurchases();
      } else {
        showToast(result.message || 'Failed to save', true);
      }
    } catch (err) {
      showToast('Failed to save purchase', true);
    }
  };

  /* ------------------------------------------------------------------ */
  /* EDIT PURCHASE */
  /* ------------------------------------------------------------------ */
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
      const { data } = await res.json();

      setEditTransactionId(transactionId);
      setEditOriginalPaidAmount(parseFloat(data.paid_amount) || 0);
      setSelectedVendor({ id: data.vendor_id, name: data.vendor_name });
      setEditForm({
        billName: data.bill_name || '',
        dateTime: data.date.slice(0, 16),
        paymentMode: reversePaymentModeMap[data.payment_mode] || 'cash',
        absoluteDiscount: parseFloat(data.absolute_discount) || 0,
        setPaidAmount: 0
      });

      const items = data.products.map(p => {
        const id = Date.now() + Math.random();
        return {
          id,
          product_id: p.product_id,
          product_name: p.product_name,
          quantity: parseFloat(p.quantity),
          unit_id: p.unit_id,
          unit_name: p.unit_name,
          discount: parseFloat(p.discount) || 0,
          gst: parseFloat(p.gst) || 0,
          per_item_cost: parseFloat(p.per_item_cost),
          selling_price: parseFloat(p.selling_price) || 0,
          total: 0
        };
      });

      setEditPurchaseItems(items.length > 0 ? items : [createEmptyItem()]);
      setShowEditPurchase(true);

      // Setup autocomplete and load units after render
      setTimeout(() => {
        items.forEach(item => {
          const input = document.getElementById(`edit-product-input-${item.id}`);
          if (input) {
            const ref = { current: input };
            autocompleteRefs.current[item.id] = ref;
            setupAutocomplete(item.id, ref, true);
            const row = input.closest('tr');
            if (row && item.product_id) {
              handleProductSelection(row, item.product_id, setEditPurchaseItems, item.id, showToast);
            }
          }
        });
      }, 150);
    } catch (err) {
      showToast('Failed to load purchase', true);
    }
  };

  const createEmptyItem = () => ({
    id: Date.now() + Math.random(),
    product_id: '', product_name: '', quantity: 0, unit_id: '', unit_name: '',
    discount: 0, gst: 0, per_item_cost: 0, selling_price: 0, total: 0
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

    if (products.length === 0) return showToast('Add at least one valid product', true);

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
        showToast(result.message || 'Failed to update', true);
      }
    } catch (err) {
      showToast('Failed to update', true);
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
      showToast('Failed to delete', true);
    }
  };

  /* ------------------------------------------------------------------ */
  /* PURCHASE DETAILS */
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
      const { data } = await res.json();
      setDetailsCache(prev => ({ ...prev, [transactionId]: data }));
      return data;
    } catch (err) {
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
  /* RENDER */
  /* ------------------------------------------------------------------ */
  return (
    <>
      {/* Toast */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-md shadow-lg z-50 text-white ${toast.error ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Simple Navbar – No Effects */}
      <div className="bg-gradient-to-r from-neutral-800 to-cyan-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Purchase</h2>
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
                  className="pl-10 pr-4 py-2 border rounded-md w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              </div>
              <button
                onClick={async () => {
                  setShowSearchVendor(true);
                  await fetchVendors();
                  setPurchaseItems([]);
                  addItemRow(false);
                  await fetchProducts();
                }}
                className="bg-cyan-600 text-white px-4 py-2 rounded-md hover:bg-cyan-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Purchase Bill
              </button>
            </div>
          </div>

          {/* Responsive Table / Cards */}
          <div className="overflow-x-auto">
            {/* Desktop: Table */}
            <table className="w-full hidden md:table">
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
                      <tr key={`main-row-${tid}`}>
                        <td className="px-4 py-3 text-sm">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                        <td className="px-4 py-3 text-sm">{p.bill_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{p.vendor_name}</td>
                        <td className="px-4 py-3 text-sm">{reversePaymentModeMap[p.payment_mode] || p.payment_mode}</td>
                        <td className="px-4 py-3 text-sm">{p.date}</td>
                        <td className="px-4 py-3 text-sm">{p.purchased_by || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm flex gap-2">
                          <button onClick={() => toggleDetails(tid)} className="text-cyan-600 hover:underline">
                            {isOpen ? 'Hide' : 'View'}
                          </button>
                          <button onClick={() => openEdit(p.transaction_id)} className="text-green-600 hover:underline">Edit</button>
                          <button onClick={() => deletePurchase(p.transaction_id)} className="text-red-600 hover:underline">Delete</button>
                        </td>
                      </tr>

                      {isOpen && details && (
                        <tr key={`details-row-${tid}`}>
                          <td colSpan={7} className="px-4 py-3 bg-gray-50">
                            <div className="text-xs">
                              <div className="grid grid-cols-3 gap-2 mb-3">
                                <span><strong>Bill:</strong> {details.bill_name}</span>
                                <span><strong>ID:</strong> {p.transaction_id}</span>
                                <span><strong>Date:</strong> {p.date}</span>
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
                                  {details.products.map((prod, i) => (
                                    <tr key={prod.id || `desktop-prod-${tid}-${i}`}>
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile: Cards */}
            <div className="md:hidden p-4 space-y-4">
              {paginated.map((p, idx) => {
                const tid = p.transaction_id.toString();
                const isOpen = openDetails[tid];
                const details = detailsCache[tid];
                const currency = getCurrencySymbol();

                return (
                  <div key={`mobile-card-${tid}`} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>S.No:</strong></div>
                      <div>{(currentPage - 1) * itemsPerPage + idx + 1}</div>
                      <div><strong>Bill:</strong></div>
                      <div>{p.bill_name || 'N/A'}</div>
                      <div><strong>Vendor:</strong></div>
                      <div>{p.vendor_name}</div>
                      <div><strong>Payment:</strong></div>
                      <div>{reversePaymentModeMap[p.payment_mode] || p.payment_mode}</div>
                      <div><strong>Date:</strong></div>
                      <div>{p.date}</div>
                      <div><strong>By:</strong></div>
                      <div>{p.purchased_by || 'Unknown'}</div>
                    </div>

                    <div className="mt-3 flex gap-2 justify-end text-xs">
                      <button onClick={() => toggleDetails(tid)} className="text-cyan-600 hover:underline">
                        {isOpen ? 'Hide' : 'View'} Details
                      </button>
                      <button onClick={() => openEdit(p.transaction_id)} className="text-green-600 hover:underline">Edit</button>
                      <button onClick={() => deletePurchase(p.transaction_id)} className="text-red-600 hover:underline">Delete</button>
                    </div>

                    {isOpen && details && (
                      <div className="mt-4 border-t pt-3 text-xs">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <span><strong>ID:</strong> {p.transaction_id}</span>
                          <span><strong>Date:</strong> {p.date}</span>
                        </div>
                        <h4 className="font-medium mb-1">Items</h4>
                        <div className="space-y-2">
                          {details.products.map((prod, i) => (
                            <div key={prod.id || `mobile-prod-${tid}-${i}`} className="border-b pb-1">
                              <div><strong>{prod.product_name}</strong></div>
                              <div className="grid grid-cols-3 gap-1 text-xs">
                                <span>Qty: {prod.quantity}</span>
                                <span>Unit: {prod.unit_name}</span>
                                <span>Disc: {prod.discount}%</span>
                                <span>GST: {prod.gst}%</span>
                                <span>Cost: {currency}{parseFloat(prod.per_item_cost).toFixed(2)}</span>
                                <span>Total: {currency}{parseFloat(prod.per_product_total).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 space-y-1 text-xs font-medium">
                          <div>Total: {currency}{parseFloat(details.total_amount).toFixed(2)}</div>
                          <div>Discount: {currency}{parseFloat(details.absolute_discount).toFixed(2)}</div>
                          <div>Payable: {currency}{parseFloat(details.payable_amount).toFixed(2)}</div>
                          <div>Paid: {currency}{parseFloat(details.paid_amount).toFixed(2)}</div>
                          <div>Due: {currency}{parseFloat(details.due_amount).toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          <div className="p-4 flex justify-between items-center border-t">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 rounded border disabled:opacity-50"><ChevronLeft /></button>
            <div className="text-sm">Page {currentPage} of {totalPages}</div>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 rounded border disabled:opacity-50"><ChevronRight /></button>
          </div>
        </div>
      </div>

      {/* Vendor Search Modal */}
      {showSearchVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Search Vendor</h2>
              <button onClick={() => setShowSearchVendor(false)} className="text-gray-500 hover:text-gray-700"><X /></button>
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
                <button onClick={() => setShowAddVendor(true)} className="px-4 py-2 bg-cyan-600 text-white rounded">Add Vendor</button>
                <button onClick={searchVendors} className="px-4 py-2 border rounded">Search</button>
              </div>
              <div className="overflow-x-auto">
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
                    {vendorSearchResults.map(v => (
                      <tr key={`vendor-${v.id}`} className="border-b">
                        <td className="p-2">{v.vendor_name}</td>
                        <td className="p-2">{v.pan}</td>
                        <td className="p-2">{v.gst_no}</td>
                        <td className="p-2">{v.phone}</td>
                        <td className="p-2">
                          <button
                            onClick={async () => {
                              setSelectedVendor({ id: v.id, name: v.vendor_name });
                              setShowSearchVendor(false);
                              setShowAddPurchase(true);
                              setPurchaseItems([]);
                              addItemRow(false);
                              await fetchProducts();
                            }}
                            className="text-cyan-600 hover:underline"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                    {vendorSearchResults.length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-gray-500">No vendors found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <button onClick={() => setShowAddVendor(false)} className="text-gray-500"><ChevronLeft /></button>
              <h2 className="text-xl font-bold">Add Vendor</h2>
              <button onClick={() => setShowAddVendor(false)} className="text-gray-500"><X /></button>
            </div>
            <div className="p-4 space-y-3">
              <input id="addVendorName" placeholder="Name *" className="w-full px-3 py-2 border rounded" />
              <input id="addVendorPan" placeholder="PAN" className="w-full px-3 py-2 border rounded" />
              <input id="addVendorGst" placeholder="GST" className="w-full px-3 py-2 border rounded" />
              <input id="addVendorPhone" placeholder="Phone" className="w-full px-3 py-2 border rounded" />
              <input id="addVendorEmail" placeholder="Email" className="w-full px-3 py-2 border rounded" />
              <input id="addVendorAddress" placeholder="Address" className="w-full px-3 py-2 border rounded" />
              <button onClick={saveNewVendor} className="w-full py-2 bg-cyan-600 text-white rounded">Save Vendor</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showAddPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
            <form onSubmit={(e) => { e.preventDefault(); savePurchase(); }}>
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">Add Purchase</h2>
                <button type="button" onClick={() => { setShowAddPurchase(false); setPurchaseItems([]); }} className="text-gray-500 hover:text-gray-700"><X /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input id="purchaseBillName" placeholder="Bill Name" className="px-3 py-2 border rounded" />
                  <input value={selectedVendor.name} readOnly className="px-3 py-2 border rounded bg-gray-50" />
                  <input type="datetime-local" id="purchaseDateTime" className="px-3 py-2 border rounded" defaultValue={new Date().toISOString().slice(0, 16)} />
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
                        <th className="p-2">Sell</th>
                        <th className="p-2">Total</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseItems.map(item => (
                        <tr key={`add-item-${item.id}`} data-row-id={item.id}>
                          <td className="p-1 relative">
                            <input
                              id={`add-product-input-${item.id}`}
                              type="text"
                              placeholder="Search product..."
                              value={item.product_name || ''}
                              onChange={(e) => setPurchaseItems(prev => prev.map(i =>
                                i.id === item.id ? { ...i, product_name: e.target.value } : i
                              ))}
                              className="w-full p-1 border rounded text-sm"
                            />
                            <input type="hidden" id={`add-product-id-${item.id}`} value={item.product_id} />
                            <div id={`add-suggestions-${item.id}`} className="absolute z-10 bg-white border rounded mt-1 max-h-32 overflow-y-auto w-full hidden"></div>
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={e => setPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, quantity: parseFloat(e.target.value) || 0 }) } : i))}
                              className="w-16 p-1 border rounded"
                            />
                          </td>
                          <td className="p-1">
                            <select
                              className="purchase-unit w-full p-1 border rounded text-sm"
                              value={item.unit_id}
                              onChange={(e) => setPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, unit_id: e.target.value } : i))}
                            >
                              <option value="">Select Unit</option>
                            </select>
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              className="purchase-discount w-16 p-1 border rounded"
                              value={item.discount}
                              onChange={e => setPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, discount: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, discount: parseFloat(e.target.value) || 0 }) } : i))}
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              className="purchase-gst w-16 p-1 border rounded"
                              value={item.gst}
                              onChange={e => setPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, gst: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, gst: parseFloat(e.target.value) || 0 }) } : i))}
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.01"
                              className="purchase-cost w-full p-1 border rounded"
                              value={item.per_item_cost}
                              onChange={e => setPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, per_item_cost: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, per_item_cost: parseFloat(e.target.value) || 0 }) } : i))}
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              step="0.01"
                              className="purchase-selling-price w-full p-1 border rounded"
                              value={item.selling_price}
                              onChange={e => setPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, selling_price: parseFloat(e.target.value) || 0 } : i))}
                            />
                          </td>
                          <td className="p-1 text-right">{getCurrencySymbol()}{item.total.toFixed(2)}</td>
                          <td className="p-1 text-center">
                            <button type="button" onClick={() => removeItem(item.id, false)} className="text-red-600"><X className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => addItemRow(false)} className="text-cyan-600 text-sm">+ Add Item</button>
                  <button type="button" onClick={() => recalculateAll(purchaseItems, setPurchaseItems)} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><Calculator className="w-4 h-4" /> Calculate</button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div><strong>Subtotal:</strong> {getCurrencySymbol()}{addTotals.subtotal}</div>
                  <input id="purchaseAbsoluteDiscount" type="number" step="0.01" placeholder="Abs. Discount" className="p-2 border rounded" defaultValue={0} />
                  <div><strong>Payable:</strong> {getCurrencySymbol()}{addTotals.payable}</div>
                  <input id="purchasePaidAmount" type="number" step="0.01" placeholder="Paid" className="p-2 border rounded" defaultValue={0} />
                  <div><strong>Due:</strong> {getCurrencySymbol()}{addTotals.due}</div>
                </div>

                <select id="purchasePaymentMode" className="w-full md:w-64 p-2 border rounded" defaultValue="cash">
                  {Object.keys(paymentModeMap).map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>

                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-cyan-600 text-white py-2 rounded">Save Purchase</button>
                  <button type="button" onClick={() => { setShowAddPurchase(false); setPurchaseItems([]); }} className="flex-1 bg-gray-300 py-2 rounded">Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Purchase Modal */}
      {showEditPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Purchase</h2>
              <button onClick={() => { 
                setShowEditPurchase(false); 
                setEditPurchaseItems([]); 
                editForm.reset();
              }} className="text-gray-500 hover:text-gray-700"><X /></button>
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
                      <th className="p-2">Sell</th>
                      <th className="p-2">Total</th>
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editPurchaseItems.map(item => (
                      <tr key={`edit-item-${item.id}`} data-row-id={item.id}>
                        <td className="p-1 relative">
                          <input
                            id={`edit-product-input-${item.id}`}
                            type="text"
                            placeholder="Search product..."
                            value={item.product_name || ''}
                            onChange={(e) => setEditPurchaseItems(prev => prev.map(i =>
                              i.id === item.id ? { ...i, product_name: e.target.value } : i
                            ))}
                            className="w-full p-1 border rounded text-sm"
                          />
                          <input type="hidden" id={`edit-product-id-${item.id}`} value={item.product_id} />
                          <div id={`edit-suggestions-${item.id}`} className="absolute z-10 bg-white border rounded mt-1 max-h-32 overflow-y-auto w-full hidden"></div>
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={e => setEditPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, quantity: parseFloat(e.target.value) || 0 }) } : i))}
                            className="w-16 p-1 border rounded"
                          />
                        </td>
                        <td className="p-1">
                          <select
                            className="purchase-unit w-full p-1 border rounded text-sm"
                            value={item.unit_id}
                            onChange={(e) => setEditPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, unit_id: e.target.value } : i))}
                          >
                            <option value="">Select Unit</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            className="purchase-discount w-16 p-1 border rounded"
                            value={item.discount}
                            onChange={e => setEditPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, discount: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, discount: parseFloat(e.target.value) || 0 }) } : i))}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            className="purchase-gst w-16 p-1 border rounded"
                            value={item.gst}
                            onChange={e => setEditPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, gst: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, gst: parseFloat(e.target.value) || 0 }) } : i))}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="0.01"
                            className="purchase-cost w-full p-1 border rounded"
                            value={item.per_item_cost}
                            onChange={e => setEditPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, per_item_cost: parseFloat(e.target.value) || 0, total: calcRowTotal({ ...i, per_item_cost: parseFloat(e.target.value) || 0 }) } : i))}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="0.01"
                            className="purchase-selling-price w-full p-1 border rounded"
                            value={item.selling_price}
                            onChange={e => setEditPurchaseItems(prev => prev.map(i => i.id === item.id ? { ...i, selling_price: parseFloat(e.target.value) || 0 } : i))}
                          />
                        </td>
                        <td className="p-1 text-right">{getCurrencySymbol()}{item.total.toFixed(2)}</td>
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
                <button type="button" onClick={() => recalculateAll(editPurchaseItems, setEditPurchaseItems)} className="bg-yellow-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><Calculator className="w-4 h-4" /> Calculate</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div><strong>Subtotal:</strong> {getCurrencySymbol()}{editTotals.subtotal}</div>
                <input 
                  type="number" 
                  step="0.01" 
                  value={editForm.absoluteDiscount} 
                  onChange={e => setEditForm(prev => ({ ...prev, absoluteDiscount: parseFloat(e.target.value) || 0 }))} 
                  placeholder="Abs. Discount" 
                  className="p-2 border rounded" 
                />
                <div><strong>Payable:</strong> {getCurrencySymbol()}{editTotals.payable}</div>
                <input 
                  type="number" 
                  step="0.01" 
                  value={editForm.setPaidAmount} 
                  onChange={e => setEditForm(prev => ({ ...prev, setPaidAmount: parseFloat(e.target.value) || 0 }))} 
                  placeholder="Paid Adj." 
                  className="p-2 border rounded" 
                />
                <div><strong>Due:</strong> {getCurrencySymbol()}{editTotals.due}</div>
              </div>

              <select 
                value={editForm.paymentMode} 
                onChange={e => setEditForm(prev => ({ ...prev, paymentMode: e.target.value }))} 
                className="w-full md:w-64 p-2 border rounded"
              >
                {Object.keys(paymentModeMap).map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>

              <div className="flex gap-2">
                <button onClick={saveEditedPurchase} className="flex-1 bg-green-600 text-white py-2 rounded">Update Purchase</button>
                <button onClick={() => setShowEditPurchase(false)} className="flex-1 bg-gray-300 py-2 rounded">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Purchase;