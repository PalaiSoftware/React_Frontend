import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import usePageTitle from "../hooks/usePageTitle"; // 👈 import the hook

export default function MainLayout() {
  usePageTitle(); // 👈 sets browser tab title dynamically

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar (fixed) */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
