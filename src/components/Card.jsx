// src/components/Card.jsx
export default function Card({ 
  title, 
  value, 
  growth, 
  icon,        // main icon (optional, usually top-left)
  cornerIcon,  // icon to display at bottom-right
  onClick, 
  className = "" 
}) {
  return (
    <div
      className={`relative bg-white shadow-md rounded-md p-2 pl-4 hover:shadow-lg cursor-pointer transition-all min-h-[80px] flex flex-col justify-center ${className}`}
      onClick={onClick}
    >
      {/* Top-left Icon */}
      {icon && <div className="text-xl text-gray-500 mb-1">{icon}</div>}

      {/* Title */}
      {title && <h3 className="text-gray-700 font-medium text-sm mb-1">{title}</h3>}

      {/* Value + Growth */}
      {value && (
        <p className="text-xl font-semibold text-slate-900">
          {value}{" "}
          {growth && <span className="text-green-500 text-xs ml-1">{growth}</span>}
        </p>
      )}

      {/* Bottom-right corner icon */}
      {cornerIcon && (
        <div className="absolute bottom-4 right-8 text-gray-500 text-lg">
          {cornerIcon}
        </div>
      )}
    </div>
  );
}
