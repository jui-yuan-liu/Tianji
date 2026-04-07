import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { createChart, CandlestickSeries } from 'lightweight-charts'
import { Activity, Clock, Compass, Search } from 'lucide-react'

export default function App() {
  const [chartData, setChartData] = useState(null)
  const [dailyFortune, setDailyFortune] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    year: '1990',
    month: '1',
    day: '1',
    hour: '12'
  })
  const chartContainerRef = useRef()
  const lwChart = useRef()

  const fetchChart = async () => {
    setLoading(true)
    try {
      const res = await axios.post('/api/calculate', formData)
      setChartData(res.data)
      
      const fortuneRes = await axios.get('/api/daily-fortune', { params: {
        date: new Date().toISOString().split('T')[0],
        birthYear: formData.year,
        birthMonth: formData.month,
        birthDay: formData.day,
        birthHour: formData.hour
      }})
      setDailyFortune(fortuneRes.data)
    } catch(err) {
      console.error(err)
      alert("Error fetching data")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchChart()
  }, [])

  // Basic K-line Chart Simulation
  useEffect(() => {
    if(!chartContainerRef.current) return;
    lwChart.current = createChart(chartContainerRef.current, { width: chartContainerRef.current.clientWidth, height: 300 });
    const candlestickSeries = lwChart.current.addSeries(CandlestickSeries);
    
    axios.get('/api/market-data').then(res => {
        if(res.data) {
           candlestickSeries.setData(res.data);
           lwChart.current.timeScale().fitContent();
        }
    });

    return () => {
       lwChart.current.remove();
    }
  }, []);

  const branchOrder = [5, 6, 7, 8, 4, 9, 3, 10, 2, 1, 0, 11] // 巳, 午, 未, 申, 辰... etc mapped for a 4x4 layout roughly
  // To draw a proper 4x4 square:
  // 5(巳) 6(午) 7(未) 8(申)
  // 4(辰)          9(酉)
  // 3(卯)          10(戌)
  // 2(寅) 1(丑) 0(子) 11(亥)

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-4">
      <header className="mb-6 flex items-center justify-between border-b border-neutral-700 pb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Compass className="text-amber-500" /> 天機 Tianji</h1>
        <div className="flex items-center gap-2">
           <input type="text" className="bg-neutral-800 p-2 rounded w-20" value={formData.year} onChange={e=>setFormData({...formData, year: e.target.value})} placeholder="Year"/>
           <input type="text" className="bg-neutral-800 p-2 rounded w-16" value={formData.month} onChange={e=>setFormData({...formData, month: e.target.value})} placeholder="Mon"/>
           <input type="text" className="bg-neutral-800 p-2 rounded w-16" value={formData.day} onChange={e=>setFormData({...formData, day: e.target.value})} placeholder="Day"/>
           <input type="text" className="bg-neutral-800 p-2 rounded w-16" value={formData.hour} onChange={e=>setFormData({...formData, hour: e.target.value})} placeholder="Hour"/>
           <button onClick={fetchChart} disabled={loading} className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded flex items-center gap-2">
             <Search size={18} /> 排盤
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 12 Palaces Chart */}
        <div className="lg:col-span-2 bg-neutral-800 p-4 rounded-xl shadow-lg border border-neutral-700">
           <h2 className="text-xl font-semibold mb-4 text-amber-500">十二宮位星盤</h2>
           <div className="grid grid-cols-4 grid-rows-4 gap-2 w-full max-w-2xl mx-auto aspect-square text-sm">
             {chartData ? (
                 <>
                   {[5, 6, 7, 8].map(i => <Palace key={i} data={chartData.chart[i]} />)}
                   <Palace data={chartData.chart[4]} />
                   <div className="col-span-2 row-span-2 bg-neutral-900/50 rounded flex flex-col items-center justify-center p-4 text-center">
                     <div className="text-amber-500 text-lg font-bold mb-2">天機運勢引擎</div>
                     <div className="text-neutral-400">農曆: {chartData.meta.lunarDate}</div>
                     <div className="text-neutral-400">五行局: {chartData.meta.bureau}</div>
                   </div>
                   <Palace data={chartData.chart[9]} />
                   <Palace data={chartData.chart[3]} />
                   <Palace data={chartData.chart[10]} />
                   {[2, 1, 0, 11].map(i => <Palace key={i} data={chartData.chart[i]} />)}
                 </>
             ) : (
                 <div className="col-span-4 row-span-4 flex items-center justify-center text-neutral-500">
                    載入中...
                 </div>
             )}
           </div>
        </div>

        {/* Dashboard Side */}
        <div className="flex flex-col gap-6">
            {/* Daily Fortune */}
            <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-amber-500 flex items-center gap-2"><Clock /> 今日運勢 ({dailyFortune?.date})</h2>
                {dailyFortune ? (
                  <div className="space-y-4">
                     <div className="flex justify-between items-center bg-neutral-900 p-3 rounded">
                        <span>綜合評分</span>
                        <span className={`text-2xl font-bold ${dailyFortune.user.advice.score > 60 ? 'text-green-500' : 'text-red-500'}`}>{dailyFortune.user.advice.score}</span>
                     </div>
                     <p className="text-neutral-300">{dailyFortune.user.advice.details}</p>
                     <div className="bg-amber-900/20 text-amber-400 p-3 rounded text-sm border border-amber-800/50">
                        <strong>策略建議：</strong> {dailyFortune.user.advice.strategy}
                     </div>
                  </div>
                ) : <div className="text-neutral-500">載入中...</div>}
            </div>

            {/* K-Line Chart */}
            <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 shadow-lg flex-1">
                <h2 className="text-xl font-semibold mb-4 text-amber-500 flex items-center gap-2"><Activity /> 大盤走勢 (TAIEX)</h2>
                <div ref={chartContainerRef} className="w-full h-full min-h-[300px]" />
            </div>
        </div>
      </div>
    </div>
  )
}

function Palace({ data }) {
    if (!data) return null;
    const isSpecial = data.isAnnualLife || data.isDailyLife;
    
    return (
        <div className={`p-2 border rounded flex flex-col relative overflow-hidden transition-colors ${isSpecial ? 'bg-amber-900/20 border-amber-500/50' : 'bg-neutral-800 border-neutral-700'}`}>
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>{data.earthlyBranch}</span>
                <span className="font-bold text-neutral-300">{data.functionName.split(' ')[0]}</span>
            </div>
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                {data.layers.all.stars.map((s, idx) => (
                    <div key={idx} className={`text-xs ${s.includes('祿') ? 'text-red-400' : s.includes('忌') ? 'text-blue-400' : 'text-neutral-400'}`}>
                        {s}
                    </div>
                ))}
            </div>
            {isSpecial && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-bl-md"></div>
            )}
        </div>
    )
}
