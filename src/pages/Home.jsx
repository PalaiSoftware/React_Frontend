import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <h1 className="text-5xl font-bold text-gray-900 mb-4">
        Inventory Management
      </h1>
      {/* <p className="text-gray-600 mb-8">
        Manage your business efficiently with a modern ERP solution.
      </p> */}
      <div className="max-w-md mx-auto mt-10 h-36 w-80  p-6 bg-white shadow-lg rounded-2xl border border-gray-200 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
          Get Started
        </h2>

        <button
          onClick={() => navigate("/login")}
          className="bg-gradient-to-r from-gray-800 to-sky-700 text-white px-6 py-2 w-60 rounded-full transition-colors duration-300"
        >
          Login
        </button>
      </div>
    </div>
  );
}
