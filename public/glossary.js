const GLOSSARY_DATA = {
    branches: {
        "子": "水旺之地，流動性強。代表半夜、隆冬，充滿潛能與暗流。",
        "丑": "金庫之地，保守穩健。代表黎明前、初春，堅忍不拔。",
        "寅": "木旺之地，生機勃勃。代表破曉、初春，充滿活力與開創。",
        "卯": "木旺之地，桃花人緣。代表日出、春季，溫和且具吸引力。",
        "辰": "水庫之地，變動潛藏。代表早晨、季春，吉凶交雜，天羅地網。",
        "巳": "火旺之地，積極變動。代表近午、初夏，熱情奔放，變化多端。",
        "午": "火旺之地，熱情奔放。代表正午、盛夏，極度活躍，光明磊落。",
        "未": "木庫之地，收斂沈澱。代表午後、季夏，較為固執，孕育後勁。",
        "申": "金旺之地，肅殺果決。代表傍晚、初秋，果斷剛毅，活動力強。",
        "酉": "金旺之地，人緣桃花。代表日落、仲秋，追求完美，帶有桃花。",
        "戌": "火庫之地，守成不易。代表入夜、季秋，天羅地網，孤獨且堅忍。",
        "亥": "水旺之地，智慧流動。代表深夜、初冬，包容性強，思緒深遠。"
    },
    palaces: {
        "命宮": "【核心運勢】 代表個性、天賦與整體運勢的基礎。決定一生的格局高低與財富潛力。",
        "兄弟": "【現金/周轉】 在投資上可視為「現金庫」或私人借貸關係。也代表與你合作夥伴的運勢。",
        "夫妻": "【變現能力】 投資獲利後的變現順利度，或是市場情緒對你的影響。",
        "子女": "【合夥/桃花】 代表合夥投資運，也與消費娛樂相關產業有關。暗示下屬的助力。",
        "財帛": "【資金運用】 判斷財運強弱、賺錢模式與資金控管能力的核心宮位。看正財與現金流。",
        "疾厄": "【身心狀態】 投資時的心理素質與抗壓性。也代表實體辦公場所或潛藏危機。",
        "遷移": "【外部環境】 出外發展的機遇，代表國際市場、外匯或外部消息面的影響。",
        "交友": "【市場人氣】 代表散戶指標或市場消息來源的可信度。大眾市場的反應。",
        "官祿": "【事業經營】 代表正職收入的穩定度，影響你可投入投資的本金規模。",
        "田宅": "【資產庫存】 代表不動產或長期持有的股票庫存，是財富累積的總倉庫。",
        "福德": "【投資心態】 影響偏財運、直覺與承擔風險的心理素質。也是享受財富的能力。",
        "父母": "【監管/文書】 代表與銀行、政府機關的關係，或合約文書運。"
    },
    stars: typeof STAR_INVESTMENT_GUIDE !== 'undefined'
        ? Object.fromEntries(
            Object.entries(STAR_INVESTMENT_GUIDE).map(([name, star]) => [
                name,
                `${star.title} ${star.glossary}`,
            ])
        )
        : {
        "紫微": "【帝王之星】 屬土。代表領導統御、尊貴、權力與面子。投資偏好大型權值股、龍頭企業。",
        "天機": "【智慧之星】 屬木。代表機智變動、分析、計算。適合軟體、AI、科技股或短線靈活操作。",
        "太陽": "【官祿之主】 屬火。代表博愛光明、名聲、對外擴展。適合能源、公用事業、大眾傳播。",
        "武曲": "【正財之星】 屬金。代表剛毅果決、執行力與財富。適合金融保險、重工機械、金屬硬體。",
        "天同": "【福德之星】 屬水。代表溫和安逸、協調、享受。偏好穩健、低風險的投資標的(定存股)。",
        "廉貞": "【權威之星】 屬火。代表精密嚴謹、外交、桃花。適合精密儀器、電子零組件、時尚設計。",
        "天府": "【庫藏之星】 屬土。代表守成穩健、包容、富足。適合房地產、銀行金控。重視資產保值。",
        "太陰": "【田宅之主】 屬水。代表溫柔細膩、財富、積累。偏好穩定收租或長線慢慢增值的標的。",
        "貪狼": "【慾望之星】 屬木/水。代表多才多藝、投機、交際。適合娛樂、博弈。偏財運旺盛敢冒險。",
        "巨門": "【暗曜之星】 屬水。代表口才辯論、深層研究、是非。適合學術研究、生技製藥、冷門產業。",
        "天相": "【印鑑之星】 屬水。代表輔佐協調、形象、文書。偏好跟隨大趨勢或依附強者(如ETF)。",
        "天梁": "【蔭庇之星】 屬土。代表清高正直、解厄、長者。投資風格極度保守，適合防禦型類股。",
        "七殺": "【將軍之星】 屬金。代表剛烈衝勁、開創、肅殺。極具爆發力，適合趨勢明確時大波段操作。",
        "破軍": "【耗損之星】 屬水。代表破舊立新、變動、先破後立。最適合尋找被嚴重低估的轉機股。"
    },
    trans: {
        "化祿": "【資金/機遇】 象徵資金流入、機會爆發、順利與福氣。投資上代表獲利機會極大，適合進場。",
        "化權": "【權力/擴張】 象徵競爭力、主導權、行動力增強。投資上代表波動劇烈，適合擴大槓桿搶強勢股。",
        "化科": "【名聲/平穩】 象徵知名度、貴人相助、平穩發展。投資上代表適合長年配息紀錄的穩健成長股。",
        "化忌": "【阻礙/虧損】 象徵波折、是非、虧損、黏著。投資上代表強烈空方訊號，資金易卡住，建議避險。"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Inject Modal HTML
    const modalHtml = `
    <div id="glossary-modal" class="hidden fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-slate-900 border border-slate-600 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
            <div class="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800 rounded-t-xl">
                <h3 class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">📖 天機命理與財經辭典</h3>
                <button onclick="document.getElementById('glossary-modal').classList.add('hidden')" class="text-slate-400 hover:text-white text-2xl font-bold">&times;</button>
            </div>
            <div class="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div>
                    <h4 class="text-lg font-bold text-sky-400 mb-4 border-b border-sky-900/50 pb-2 flex items-center gap-2"><span class="w-1 h-5 bg-sky-500 rounded"></span> 📌 命理盤閱讀方式與流程</h4>
                    <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 text-sm text-slate-300 space-y-4 leading-relaxed">
                        <p>透過天機系統進行投資決策，建議依照以下四個步驟進行由宏觀到微觀的判斷：</p>
                        <ol class="list-decimal list-inside space-y-2 ml-2">
                            <li><strong class="text-purple-300">1. 本命盤 (Natal Chart)：確立投資基底</strong><br>
                                <span class="ml-5 text-slate-400">了解先天的性格特質與一生的財富格局。請重點觀察您的「命宮」與「財帛宮」，主星代表您適合的投資標的性質。</span>
                            </li>
                            <li><strong class="text-purple-300">2. 大運盤 (Decade Chart)：掌握十年趨勢</strong><br>
                                <span class="ml-5 text-slate-400">大運財帛宮若逢「化祿」，代表這十年容易有大筆資金進帳，是您擴張投資的黃金期；若逢「化忌」，這十年宜保守穩健，避免高風險操作。</span>
                            </li>
                            <li><strong class="text-purple-300">3. 流年/流月/流日：尋找進出場時機</strong><br>
                                <span class="ml-5 text-slate-400">這是操作的關鍵。流年或流日的財帛宮出現「化祿」，為強烈的買進訊號；若出現「化忌」，代表資金恐有被套牢的風險，強烈建議賣出或空手。</span>
                            </li>
                            <li><strong class="text-purple-300">4. 綜合判斷原則：星曜定性，四化定吉凶</strong><br>
                                <span class="ml-5 text-slate-400">「星曜」告訴您應該關注哪類產業（如紫微看權值股，天機看科技股）；「四化」告訴您何時該買進賣出（祿買忌賣）。</span>
                            </li>
                        </ol>
                    </div>
                </div>
                <div>
                    <h4 class="text-lg font-bold text-amber-500 mb-4 border-b border-amber-900/50 pb-2 flex items-center gap-2"><span class="w-1 h-5 bg-amber-500 rounded"></span> 十四主星 (Major Stars)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${Object.keys(GLOSSARY_DATA.stars).map(k => `<div class="bg-slate-800 p-3 rounded border border-slate-700"><span class="font-bold text-white">${k}</span> ${GLOSSARY_DATA.stars[k]}</div>`).join('')}
                    </div>
                </div>
                <div>
                    <h4 class="text-lg font-bold text-green-400 mb-4 border-b border-green-900/50 pb-2 flex items-center gap-2"><span class="w-1 h-5 bg-green-500 rounded"></span> 四化星 (Transformations)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${Object.keys(GLOSSARY_DATA.trans).map(k => `<div class="bg-slate-800 p-3 rounded border border-slate-700"><span class="font-bold text-white">${k}</span> ${GLOSSARY_DATA.trans[k]}</div>`).join('')}
                    </div>
                </div>
                <div>
                    <h4 class="text-lg font-bold text-blue-400 mb-4 border-b border-blue-900/50 pb-2 flex items-center gap-2"><span class="w-1 h-5 bg-blue-500 rounded"></span> 十二宮位 (12 Palaces)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${Object.keys(GLOSSARY_DATA.palaces).map(k => `<div class="bg-slate-800 p-3 rounded border border-slate-700"><span class="font-bold text-white">${k}</span> ${GLOSSARY_DATA.palaces[k]}</div>`).join('')}
                    </div>
                </div>
                <div>
                    <h4 class="text-lg font-bold text-purple-400 mb-4 border-b border-purple-900/50 pb-2 flex items-center gap-2"><span class="w-1 h-5 bg-purple-500 rounded"></span> 十二地支 (12 Earthly Branches)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${Object.keys(GLOSSARY_DATA.branches).map(k => `<div class="bg-slate-800 p-3 rounded border border-slate-700"><span class="font-bold text-white">${k}</span> ${GLOSSARY_DATA.branches[k]}</div>`).join('')}
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
});

function openGlossary() {
    document.getElementById('glossary-modal').classList.remove('hidden');
}
