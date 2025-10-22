import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaPhone,
  FaBuilding,
  FaMapMarkerAlt,
  FaGlobe,
  FaIdCard,
} from "react-icons/fa";

const API_BASE_URL = "http://127.0.0.1:8000/api";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    country: "",
    password: "",
    confirmPassword: "",
    clientName: "",
    clientPhone: "",
    clientAddress: "",
    gst: "",
    pan: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend validation
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (formData.password.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.mobile)) {
      alert("Mobile number must be 10 digits.");
      return;
    }

    if (formData.clientPhone && !phoneRegex.test(formData.clientPhone)) {
      alert("Client phone must be 10 digits.");
      return;
    }

    // Build payload including required 'rid'
    const payload = {
      name: formData.name,
      email: formData.email.toLowerCase(),
      mobile: formData.mobile,
      country: formData.country,
      password: formData.password,
      rid: 1, // Required by backend
      client_name: formData.clientName,
      client_phone: formData.clientPhone,
      client_address: formData.clientAddress,
      gst_no: formData.gst,
      pan: formData.pan,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle backend validation errors
        if (data.errors) {
          const messages = Object.values(data.errors).flat();
          alert("Registration failed: " + messages.join(", "));
        } else {
          alert(data.message || "Registration failed");
        }
        return;
      }

      alert("Registration successful!");
      navigate("/login");
    } catch (error) {
      console.error("Error:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-100 px-3 py-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-5">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-4">
          Register
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {/* Name */}
          <div>
            <label className="block text-gray-700 text-xs mb-1">Name</label>
            <div className="relative">
              <FaUser className="absolute top-2.5 left-3 text-gray-400 text-sm" />
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 text-xs mb-1">Email</label>
            <div className="relative">
              <FaEnvelope className="absolute top-2.5 left-3 text-gray-400 text-sm" />
              <input
                type="email"
                name="email"
                placeholder="user@gmail.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-gray-700 text-xs mb-1">
              Mobile Number
            </label>
            <div className="relative">
              <FaPhone className="absolute top-2.5 left-3 text-gray-400 text-sm" />
              <input
                type="text"
                name="mobile"
                placeholder="9876543210"
                value={formData.mobile}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-gray-700 text-xs mb-1">Country</label>
            <div className="relative">
              <FaGlobe className="absolute top-2.5 left-3 text-gray-400 text-sm" />
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
              >
                <option value="">Select</option>
                <option value="India">India</option>
                <option value="USA">USA</option>
                <option value="UK">UK</option>
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 text-xs mb-1">Password</label>
            <div className="relative">
              <FaLock className="absolute top-2.5 left-3 text-gray-400 text-sm" />
              <input
                type="password"
                name="password"
                placeholder="••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-gray-700 text-xs mb-1">Confirm Password</label>
            <div className="relative">
              <FaLock className="absolute top-2.5 left-3 text-gray-400 text-sm" />
              <input
                type="password"
                name="confirmPassword"
                placeholder="••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Client Name */}
          <div>
            <label className="block text-gray-700 text-xs mb-1">Client Name</label>
            <div className="relative">
              <FaBuilding className="absolute top-2.5 left-3 text-gray-400 text-sm" />
              <input
                type="text"
                name="clientName"
                placeholder="ABC Corp"
                value={formData.clientName}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Client Phone */}
          <div>
            <label className="block text-gray-700 text-xs mb-1">Client Phone</label>
            <div className="relative">
              <FaPhone className="absolute top-2.5 left-3 text-gray-400 text-sm" />
              <input
                type="text"
                name="clientPhone"
                placeholder="9123456789"
                value={formData.clientPhone}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Client Address */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 text-xs mb-1">Client Address</label>
            <textarea
              name="clientAddress"
              placeholder="123 Main St, City"
              value={formData.clientAddress}
              onChange={handleChange}
              required
              rows="2"
              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          {/* GST */}
          <div>
            <label className="block text-gray-700 text-xs mb-1">GST</label>
            <div className="relative">
              <FaIdCard className="absolute top-2.5 left-3 text-gray-400 text-sm" />
              <input
                type="text"
                name="gst"
                placeholder="22AAAAA0000A1Z5"
                value={formData.gst}
                onChange={handleChange}
                className="w-full pl-9 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* PAN */}
          <div>
            <label className="block text-gray-700 text-xs mb-1">PAN</label>
            <div className="relative">
              <FaIdCard className="absolute top-2.5 left-3 text-gray-400 text-sm" />
              <input
                type="text"
                name="pan"
                placeholder="ABCDE1234F"
                value={formData.pan}
                onChange={handleChange}
                className="w-full pl-9 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 rounded-md text-sm transition"
            >
              Register
            </button>
          </div>
        </form>

        <p className="text-center text-gray-600 text-xs mt-2">
          Already have an account?{" "}
          <a href="/login" className="text-sky-600 hover:underline font-semibold">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
