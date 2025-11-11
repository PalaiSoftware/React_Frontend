import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card"; // Reusable Card component
import { FaArrowRight, FaUserCircle } from "react-icons/fa";
import Header from "../components/Header";
import { API_BASE_URL } from "../config";

//const API_BASE_URL = "http://127.0.0.1:8000/api"; // or your backend URL

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalSales: "₹0.00",
    totalOrders: 0,
    totalCustomers: 0,
    totalPurchase: "₹0.00",
    totalPurchaseOrders: 0,
    totalVendors: 0,
  });
  const [showPendingRequests, setShowPendingRequests] = useState(false);

  useEffect(() => {
    // Load user from localStorage
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("authToken");

    if (!storedUser || !storedUser.cid || !token) {
      alert("Please log in to access the dashboard.");
      navigate("/login");
      return;
    }

    setUser(storedUser);

    // Show pending requests only for role id 1 or 2
    setShowPendingRequests(storedUser.rid === 1 || storedUser.rid === 2);

    const fetchDashboardData = async () => {
      try {
        // Fetch Sales / Orders / Customers
        const salesRes = await fetch(
          `${API_BASE_URL}/total-sale/${storedUser.cid}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        const salesData = await salesRes.json();

        // Fetch Purchases / Vendors
        const purchaseRes = await fetch(`${API_BASE_URL}/purchase-widget`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cid: storedUser.cid, period: "month" }),
        });

        const purchaseData = await purchaseRes.json();

        setStats({
          totalSales: `₹${(salesData.grand_total || 0).toLocaleString(
            "en-IN"
          )}`,
          totalOrders: salesData.total_sale_order || 0,
          totalCustomers: salesData.total_customer || 0,
          totalPurchase: `₹${(
            parseFloat(purchaseData.total_purchase_amount) || 0
          ).toLocaleString("en-IN")}`,
          totalPurchaseOrders: purchaseData.total_purchase_order || 0,
          totalVendors: purchaseData.total_vendor || 0,
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  return (
    <main className="flex-1 p-6">
      {/* Header */}
      <Header title="Dashboard" />
      {/* <div className="flex justify-between items-center bg-white p-3  shadow rounded-xl mb-6">
        <h4 className="text-2xl font-base text-slate-800">Dashboard</h4>
        <div
          className="flex items-center gap-2 text-slate-700 cursor-pointer"
          onClick={() => navigate("/profile")}
        >
<FaUserCircle className="text-2xl" />
          <span className="font-medium">{user?.name || user?.client_name || "User"}</span>
        </div>
      </div> */}

      {/* Welcome */}
      <div className="text-center mb-8 bg-gradient-to-r from-neutral-800 to-cyan-700 text-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold">
          Welcome{" "}
          <span className="text-yellow-600">{user?.client_name || "User"}</span>{" "}
          to Your Inventory Management Dashboard!
        </h3>
        <p className="text-slate-400">
          Streamline Your Business, Amplify Your Success
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Total Sales" value={stats.totalSales} growth="+0%" />
        <Card title="Total Orders" value={stats.totalOrders} growth="+0%" />
        <Card
          title="Total Customers"
          value={stats.totalCustomers}
          growth="+0%"
        />
        <Card title="Total Purchase" value={stats.totalPurchase} growth="+0%" />
        <Card
          title="Total Purchase Orders"
          value={stats.totalPurchaseOrders}
          growth="+0%"
        />
        <Card title="Total Vendors" value={stats.totalVendors} growth="+0%" />
        {showPendingRequests && (
          <Card
            title="Pending User Requests"
            onClick={() => navigate("/admin")}
            cornerIcon={<FaArrowRight />} // arrow in bottom-right
            className=" bg-blue-100 border-2 border-blue-950 hover:bg-blue-200  "
          />
        )}
      </div>
    </main>
  );
}
