import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";

export default function Header({
  title = "Dashboard",
  bgColor = "bg-white text-slate-800",
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const hiddenRoutes = ["/login", "/register"];
  if (hiddenRoutes.includes(location.pathname)) return null;

  return (
    <div
      className={`flex justify-between items-center p-3 shadow rounded-xl mb-6 transition-colors duration-300 ${bgColor}`}
    >
      {/* Responsive Title Text */}
      <h4 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold">
        {title}
      </h4>

      <div
        className="flex items-center gap-2 cursor-pointer hover:text-cyan-300 transition"
        onClick={() => navigate("/profile")}
      >
        <FaUserCircle className="text-2xl" />
        <span className="font-medium">
          {user?.name || user?.client_name || "User"}
        </span>
      </div>
    </div>
  );
}
