import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function usePageTitle() {
  const location = useLocation();

  useEffect(() => {
    const routeMap = {
      "/": "Home",
      "/login": "Login",
      "/register": "Register",
      "/contact": "Contact",
      "/admin": "Admin",

      "/dashboard": "Dashboard",
      "/customers": "Customers",
      "/products": "Products",
      "/product-info": "Product Info",
      "/vendor": "Vendor",
      "/due-record": "Due Record",
      "/inventory/sales": "Sales",
      "/inventory/purchase": "Purchase",
      "/management/user": "User Management",
      "/profile": "Profile",
    };

    const title = routeMap[location.pathname] || "ERP Dashboard";

    // Pages that should show ONLY "LM Tools"
    const simplePages = ["/", "/login", "/register", "/contact"];

    if (simplePages.includes(location.pathname)) {
      document.title = "LM Tools";
    } else {
      document.title = `${title} `;
    }
  }, [location.pathname]);
}
