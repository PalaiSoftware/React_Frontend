// src/utils.js
// export function showToast(message, type = "info") {
//     alert(`${type.toUpperCase()}: ${message}`);
// }
// utils.js
export function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type} show`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="close-toast-btn">&times;</button>
  `;
  toastContainer.appendChild(toast);

  toast.querySelector(".close-toast-btn").onclick = () => toast.remove();

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
