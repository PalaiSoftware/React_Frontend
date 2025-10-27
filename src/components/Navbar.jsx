import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  let links = [];

  // Define links based on route
  if (path === "/admin") {
    links = [
      { path: "/dashboard", label: "Dashboard" },
      { path: "/profile", label: "Profile" },
    ];
  } else if (path === "/register") {
    links = [
      { path: "/register", label: "Register" },
      { path: "/contact", label: "Contact" },
    ];
  } else if (["/", "/login", "/contact"].includes(path)) {
    links = [
      { path: "/", label: "Home" },
      { path: "/login", label: "Login" },
      { path: "/register", label: "Register" },
      { path: "/contact", label: "Contact" },
    ];
  }

  return (
    <nav className="bg-gradient-to-r from-sky-800 to-gray-800 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center px-4 py-3">
        {/* Logo + Title */}
        <div className="flex items-center space-x-2">
          <img
            src="/lmlogo.png" // 👈 place your logo file in the "public" folder
            alt="LM Inventory Logo"
            className="h-8 w-8 md:h-10 md:w-10 rounded-full"
          />
          <h1 className="text-lg md:text-xl font-semibold tracking-wide">
            LM Inventory
          </h1>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-4">
          {links.map(
            (link) =>
              link.path !== path && (
                <Link
                  key={link.path}
                  to={link.path}
                  className="hover:text-gray-200"
                >
                  {link.label}
                </Link>
              )
          )}
        </div>

        {/* Mobile Menu Button */}
        {links.length > 0 && (
          <button
            className="md:hidden text-2xl focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
        )}
      </div>

      {/* Mobile Menu */}
      {isOpen && links.length > 0 && (
        <div className="md:hidden flex flex-col bg-gray-800 text-white px-4 py-3 space-y-2">
          {links.map(
            (link) =>
              link.path !== path && (
                <Link
                  key={link.path}
                  to={link.path}
                  className="hover:text-gray-200"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              )
          )}
        </div>
      )}
    </nav>
  );
}
