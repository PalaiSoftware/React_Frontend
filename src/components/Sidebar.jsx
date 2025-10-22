import { Link, useLocation } from "react-router-dom";
import { FaHome, FaBox, FaUsers, FaChartBar } from "react-icons/fa";

export default function Sidebar() {
  const { pathname } = useLocation();

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: <FaHome /> },
    { to: "/products", label: "Products", icon: <FaBox /> },
    { to: "/users", label: "Users", icon: <FaUsers /> },
    { to: "/reports", label: "Reports", icon: <FaChartBar /> },
  ];

  return (
    <aside className="w-64 bg-white shadow-md p-4 border-r">
      <h2 className="text-lg font-semibold text-sky-700 mb-4">ERP Menu</h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sky-100 ${
                pathname === link.to ? "bg-sky-200 text-sky-700 font-medium" : ""
              }`}
            >
              {link.icon} {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
