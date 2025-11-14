import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

// Reusable login function
async function loginUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.errors) {
      const messages = Object.values(data.errors).flat().join(", ");
      throw new Error(messages);
    } else {
      throw new Error(data.message || "Login failed");
    }
  }

  const modifiedUser = {
    ...data.user,
    cid: data.client?.id,
    client_name: data.client?.name,
  };

  // Save token & user permanently
  localStorage.setItem("authToken", data.token);
  localStorage.setItem("user", JSON.stringify(modifiedUser));

  return modifiedUser;
}

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });

  // ---------------------------------------------------
  // ✅ AUTO LOGIN IF USER IS ALREADY LOGGED IN (like Gmail)
  // ---------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("user");

    if (token && user) {
      const parsed = JSON.parse(user);

      // Admin = rid = 0
      // User = rid >= 1
      const redirectTo = parsed.rid === 0 ? "/admin" : "/dashboard";

      navigate(redirectTo, { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast({ message: "", type: "" });

    try {
      const user = await loginUser(formData.email, formData.password);

      setToast({ message: "Login successful!", type: "success" });

      setTimeout(() => {
        const redirectTo = user.rid === 0 ? "/admin" : "/dashboard";
        navigate(redirectTo);
      }, 500);

    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-3 py-4">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-md p-6 rounded-md w-full max-w-sm relative"
      >
        <h2 className="text-2xl font-semibold text-center mb-4 text-gray-800">
          Login
        </h2>

        {/* Email */}
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="border w-full p-2 rounded mb-3 focus:outline-sky-500"
        />

        {/* Password */}
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          className="border w-full p-2 rounded mb-4 focus:outline-sky-500"
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-gray-800 to-sky-700 text-white py-2 rounded-full hover:bg-sky-700 transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Forgot Password */}
        <div className="text-right mt-2 mb-3 text-sm">
          <span
            onClick={() => navigate("/forgot-password")}
            className="text-sky-600 hover:underline cursor-pointer"
          >
            Forgot Password?
          </span>
        </div>

        {/* Register Link */}
        <p className="text-center text-sm mt-2">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-sky-600 hover:underline cursor-pointer"
          >
            Register
          </span>
        </p>

        {/* Toast Notification */}
        {toast.message && (
          <div
            className={`absolute top-0 left-1/2 transform -translate-x-1/2 mt-2 px-4 py-2 rounded ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}
      </form>
    </div>
  );
}
