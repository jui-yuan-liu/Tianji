document.write(`
<nav class="bg-surface border-b border-slate-700 p-4 mb-4 relative z-50">
    <div class="max-w-7xl mx-auto flex justify-between items-center">
        <div class="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 flex items-center">
            <span class="mr-2 text-2xl">✨</span> 天機 (Tianji) 投資決策
        </div>
        <div class="flex gap-2 md:gap-4 items-center" id="nav-links">
            <a href="/" class="text-slate-300 hover:text-white font-bold px-3 py-2 rounded transition">首頁</a>
            <a href="/chart.html" class="text-slate-300 hover:text-white font-bold px-3 py-2 rounded transition">排盤室</a>
            <a href="/training.html" class="text-purple-300 hover:text-purple-100 font-bold px-3 py-2 rounded transition animate-pulse">AI 訓練</a>
            <button id="nav-auth-btn" class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-1.5 px-4 md:py-2 md:px-4 rounded shadow-lg transition text-sm md:text-base">登入 / 註冊</button>
        </div>
    </div>
</nav>
`);

// Async check for auth status and update nav button
window.addEventListener('DOMContentLoaded', async () => {
    if (typeof fetchMe === 'function') {
        const user = await fetchMe();
        const authBtn = document.getElementById('nav-auth-btn');
        if (user) {
            authBtn.innerText = `登出 (${user.realName || user.username})`;
            authBtn.classList.remove('bg-purple-600', 'hover:bg-purple-500');
            authBtn.classList.add('bg-slate-700', 'hover:bg-slate-600');
            authBtn.onclick = logout;
        } else {
            authBtn.onclick = () => { window.location.href = '/login.html'; };
        }
    }
});
