let currentModelId = 'latest';

async function runBacktestData(user) {
    if(!document.getElementById('bt-roi')) return; // Check if element exists
    document.getElementById('bt-roi').innerText = '載入中...';
    document.getElementById('bt-roi').className = 'px-3 py-1 rounded bg-slate-800 text-sm font-bold';
    
    fetch(`/api/backtest?userId=${user.id}&modelId=${currentModelId}&birthYear=${user.birthYear}&birthMonth=${user.birthMonth}&birthDay=${user.birthDay}&birthHour=${user.birthHour}`)
        .then(r => r.json()).then(data => {
            document.getElementById('bt-final').innerText = `${Number(data.finalValue).toLocaleString()}`;
            const isPos = data.roi >= 0;
            document.getElementById('bt-roi').innerText = `ROI: ${isPos ? '+' : ''}${data.roi}%`;
            document.getElementById('bt-roi').className = `px-3 py-1 rounded text-sm font-bold ${isPos ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`;
            
            document.getElementById('bt-winrate').innerText = `${data.winRate}%`;
            document.getElementById('bt-mdd').innerText = `-${data.maxDrawdown}%`;
            document.getElementById('bt-alpha').innerText = `${data.alpha > 0 ? '+' : ''}${data.alpha}%`;
            document.getElementById('bt-model-type').innerText = data.isAI ? 'AI 專屬模型' : '靜態命理策略';

            // Generate Trade Log (identical to index.html)
            const tradesHtml = data.trades.slice().reverse().map(t => {
                const isBuy = t.action === 'BUY';
                return `<div class="flex justify-between items-center bg-slate-700/50 p-2 rounded">
                    <div>
                        <span class="font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}">${isBuy ? '買入' : '賣出'}</span>
                        <span class="text-xs text-slate-400 ml-2">${t.date}</span>
                    </div>
                    <div class="font-bold text-white">$${t.price}</div>
                </div>`;
            }).join('');
            document.getElementById('bt-trades').innerHTML = tradesHtml || '<div class="text-slate-500 text-center py-4">無交易訊號</div>';
        }).catch(err => {
            console.error("Backtest Error:", err);
            document.getElementById('bt-roi').innerText = '回測失敗';
            document.getElementById('bt-trades').innerHTML = '<div class="text-red-400 text-center py-4">無法載入回測資料</div>';
        });
}
