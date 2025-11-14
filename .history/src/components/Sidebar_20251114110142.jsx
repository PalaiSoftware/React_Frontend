import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MdManageAccounts, MdOutlineShoppingCartCheckout } from "react-icons/md";
import { RiListSettingsFill } from "react-icons/ri";
import {
  FaTachometerAlt,
  FaUsers,
  FaBox,
  FaInfoCircle,
  FaStore,
  FaFileInvoiceDollar,
  FaShoppingCart,
  FaChartBar,
  FaUser,
  FaBars,
  FaTimes,
  FaSignOutAlt,
} from "react-icons/fa";

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [companyName, setCompanyName] = useState(
    JSON.parse(localStorage.getItem("user") || "{}")?.client_name ||
      localStorage.getItem("companyName") ||
      "Company"
  );

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  // Listen for login update (storage event)
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedName =
        JSON.parse(localStorage.getItem("user") || "{}")?.client_name ||
        localStorage.getItem("companyName") ||
        "Company";
      setCompanyName(updatedName);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ✅ UPDATED GMAIL-STYLE LOGOUT FUNCTION
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("companyName");

    // Force sidebar + top bar to update instantly
    window.dispatchEvent(new Event("storage"));

    // Redirect to login (like Gmail)
    navigate("/login", { replace: true });

    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-sky-700 text-white p-2 rounded-md shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-zinc-900 to-cyan-800 text-white shadow-lg flex flex-col justify-between overflow-hidden z-40
        transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Sidebar Scrollable Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-700 sticky top-0 flex flex-col items-center justify-center text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
              {companyName.split(" ").slice(0, 2).join(" ")} <br />
              {companyName.split(" ").slice(2).join(" ")}
            </h2>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <SidebarLink
              to="/dashboard"
              icon={<FaTachometerAlt />}
              label="Dashboard"
              active={pathname === "/dashboard"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarLink
              to="/customers"
              icon={<FaUsers />}
              label="Customers"
              active={pathname === "/customers"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarLink
              to="/products"
              icon={<FaBox />}
              label="Products"
              active={pathname === "/products"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarLink
              to="/product-info"
              icon={<FaInfoCircle />}
              label="Product Info"
              active={pathname === "/product-info"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarLink
              to="/vendor"
              icon={<FaStore />}
              label="Vendor"
              active={pathname === "/vendor"}
              onClick={() => setIsOpen(false)}
            />
            <SidebarLink
              to="/due-record"
              icon={<FaFileInvoiceDollar />}
              label="Due Record"
              active={pathname === "/due-record"}
              onClick={() => setIsOpen(false)}
            />

            {/* Inventory Dropdown */}
            <SidebarDropdown
              label="Inventory"
              icon={<FaChartBar />}
              isOpen={openDropdown === "inventory"}
              toggle={() => toggleDropdown("inventory")}
              links={[
                {
                  to: "/inventory/sales",
                  label: "Sales",
                  icon: <FaShoppingCart />,
                },
                {
                  to: "/inventory/purchase",
                  label: "Purchase",
                  icon: <MdOutlineShoppingCartCheckout />,
                },
              ]}
              pathname={pathname}
              closeSidebar={() => setIsOpen(false)}
            />

            {/* Management Dropdown */}
            <SidebarDropdown
              label="Management"
              icon={<RiListSettingsFill />}
              isOpen={openDropdown === "management"}
              toggle={() => toggleDropdown("management")}
              links={[
                { to: "/management/user", label: "User", icon: <MdManageAccounts /> },
              ]}
              pathname={pathname}
              closeSidebar={() => setIsOpen(false)}
            />
          </nav>
        </div>

        {/* Bottom Links */}
        <div className="p-4 border-t border-gray-600 bg-cyan-800">
          <SidebarLink
            to="/profile"
            icon={<FaUser />}
            label="Profile"
            active={pathname === "/profile"}
            onClick={() => setIsOpen(false)}
          />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-700 hover:text-white text-white w-full"
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
}

// SidebarLink Component
function SidebarLink({ to, icon, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-200 ${
        active
          ? "bg-cyan-900 text-white"
          : "hover:bg-cyan-900 hover:text-white text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

// Dropdown Component
function SidebarDropdown({ label, icon, links, isOpen, toggle, pathname, closeSidebar }) {
  return (
    <div>
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-sky-800 hover:text-white text-white transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span>{label}</span>
        </div>
        <span className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="ml-6 mt-1 space-y-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeSidebar}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
                pathname === link.to
                  ? "bg-cyan-900 text-white"
                  : "hover:bg-cyan-800 text-white"
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
