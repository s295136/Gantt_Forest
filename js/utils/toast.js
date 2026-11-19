export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold text-white flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto ${
        type === 'error' ? 'bg-rose-600' : 'bg-slate-800 border border-slate-700'
    }`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation text-rose-300' : 'fa-circle-check text-emerald-400'}"></i> ${message}`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
