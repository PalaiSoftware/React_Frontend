import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation(); // current URL

  const links = [
    { path: "/", label: "Home" },
    { path: "/login", label: "Login" },
    { path: "/register", label: "Register" },
    { path: "/contact", label: "Contact" }, // new contact page
  ];

  return (
    <nav className="bg-gradient-to-r from-gray-800 to-sky-800 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center px-4 py-3">
        <h1 className="text-xl font-semibold tracking-wide">LM Inventory</h1>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-4">
          {links.map(
            (link) =>
              link.path !== location.pathname && ( // hide current page
                <Link key={link.path} to={link.path} className="hover:text-gray-200">
                  {link.label}
                </Link>
              )
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-2xl focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden flex flex-col bg-gray-800 text-white px-4 py-3 space-y-2">
          {links.map(
            (link) =>
              link.path !== location.pathname && ( // hide current page
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
