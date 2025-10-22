export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-800 to-sky-800 text-center py-4 px-4 text-sm sm:text-base text-gray-200 border-t">
      <p>
        © {new Date().getFullYear()} Inventory Management. Made by{" "}
        <span className="font-semibold text-gray-100">LMTools</span>.
      </p>
      <p className="text-[10px] sm:text-[11px] text-gray-400 mt-1">
        App Version: <span className="text-slate-50">1.0.0</span>
      </p>
    </footer>
  );
}
