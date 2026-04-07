
// 12 Palaces names in standard sequence (Counter-Clockwise relative to Life Palace)
// Life(0) -> Siblings(11) -> Spouse(10) -> Children(9) -> Wealth(8) -> Health(7) 
// -> Travel(6) -> Friends(5) -> Career(4) -> Property(3) -> Fortune(2) -> Parents(1)
// Wait, the standard sequence starts from Life Palace and goes COUNTER-CLOCKWISE on the Earthly Branches.
// So if Life is at Zi(0), Siblings is at Hai(11), Spouse at Xu(10)...
// But usually we just need to know "This branch is WHICH palace".

const PALACE_NAMES = [
  "命宮", "兄弟", "夫妻", "子女",
  "財帛", "疾厄", "遷移", "交友",
  "官祿", "田宅", "福德", "父母"
];

// Simplified Star Placement
function calculateLifePalace(lunarMonth, lunarHour) {
  // Demo Logic: (Month + Hour) % 12
  // Real logic needs complex table lookups based on school.
  // For demo, we use a simple hash to distribute across 12 palaces.
  return (lunarMonth + lunarHour) % 12;
}

function calculateWealthPalace(lifePalaceIndex) {
    // Wealth is always 4 steps Counter-Clockwise from Life Palace (standard index -4 mod 12)
    // In our array (Zi=0, Chou=1...), moving CCW is moving BACKWARDS in index.
    // Life -> Siblings -> Spouse -> Children -> Wealth
    // So Wealth is index - 4.
    let pos = lifePalaceIndex - 4;
    if (pos < 0) pos += 12;
    return pos;
}

function calculateFortunePalace(wealthPalaceIndex) {
  // Fortune is opposite Wealth (Always +6 steps)
  // Wait, Fortune is opposite Wealth's Career? 
  // Standard: Life, Siblings, Spouse, Children, Wealth, Health, Travel, Friends, Career, Property, Fortune, Parents.
  // Count: Life(1), Wealth(5), Fortune(11).
  // Relative to Life(1): Wealth is 5th (CCW), Fortune is 11th (CCW).
  // Distance: Life(0) -> Wealth(-4) -> Fortune(-10) = Life+2.
  // So Fortune is Life + 2 (CW? No, CCW 10 steps is CW 2 steps).
  // Let's stick to standard relative positions from Life Palace.
  // Life(0), Wealth(8), Fortune(10) in 0-11 index system where 0=Zi.
  // Wait, let's use a standard mapping function.
  let pos = wealthPalaceIndex + 2; 
  return pos % 12;
}

// Get full palace mapping based on Life Palace Index
function getFullPalaceMapping(lifePalaceIndex) {
    // Standard sequence starting from Life Palace, moving COUNTER-CLOCKWISE (Index - 1)
    // 0: Life
    // 1: Siblings
    // 2: Spouse
    // ...
    // But our grid is fixed (0=Zi, 1=Chou...). We need to assign names to indices.
    
    let mapping = {};
    for (let i = 0; i < 12; i++) {
        // Calculate offset from Life Palace
        // If Life is at L, Palace P is at (L - i + 12) % 12
        // where i is the index in PALACE_NAMES (0=Life, 1=Siblings...)
        
        let branchIndex = (lifePalaceIndex - i + 12) % 12;
        mapping[branchIndex] = PALACE_NAMES[i];
    }
    return mapping;
}

// Investment Strategy Recommendation based on Wealth/Fortune Palaces

// Investment Strategy Recommendation based on Wealth/Fortune Palaces
function getInvestmentStrategy(wealthStarStr, fortuneStarStr) {
  // Parse stars string "Name, Name" -> ["Name", "Name"]
  const wealthStars = wealthStarStr.split(', ').map(s => s.trim());
  
  let strategy = {
    action: "HOLD",
    sectors: [],
    riskLevel: "Medium",
    analysis: ""
  };

  // Default
  if (wealthStars.includes("空宮 (Empty)")) {
      strategy.action = "WAIT";
      strategy.riskLevel = "High (Unknown)";
      strategy.sectors = ["Cash", "Index Funds (ETF)"];
      strategy.analysis = "財帛宮無主星，財運起伏較大，宜借對宮（福德宮）之力，建議以被動投資或保守觀望為主。";
      return strategy;
  }

  // Logic Table
  // Strategy Priority: Aggressive Stars > Stable Stars
  
  if (wealthStars.some(s => s.includes("貪狼"))) {
      strategy.action = "TRADE (Active)";
      strategy.riskLevel = "High";
      strategy.sectors.push("Entertainment (娛樂)", "Crypto (加密貨幣)", "Gaming (博弈)");
      strategy.analysis += "貪狼入財帛，主偏財與投機。適合波動大、具爆發力的市場，如科技或新興資產。";
  }
  
  if (wealthStars.some(s => s.includes("武曲"))) {
      strategy.action = "BUY (Long)";
      strategy.riskLevel = "Medium";
      strategy.sectors.push("Finance (金融)", "Heavy Industry (重工)", "Hardware (硬體)");
      strategy.analysis += "武曲為正財星，利於實業與金融。建議佈局現金流穩定的龍頭股或債券。";
  }
  
  if (wealthStars.some(s => s.includes("天府"))) {
      strategy.action = "BUY & HOLD";
      strategy.riskLevel = "Low";
      strategy.sectors.push("Real Estate (房產)", "Banks (銀行)", "Insurance (保險)");
      strategy.analysis += "天府為庫星，善於守財。適合長期持有、領股息或投資房地產相關標的。";
  }
  
  if (wealthStars.some(s => s.includes("太陰"))) {
      strategy.action = "Accumulate";
      strategy.riskLevel = "Low";
      strategy.sectors.push("Real Estate (地產)", "Travel (旅遊)", "Cosmetics (美妝)");
      strategy.analysis += "太陰主富，積累之財。適合不動產、租賃業務或女性消費相關產業。";
  }
  
  if (wealthStars.some(s => s.includes("破軍"))) {
      strategy.action = "SWING TRADE";
      strategy.riskLevel = "Very High";
      strategy.sectors.push("Startups (新創)", "Defense (國防)", "Disruptive Tech (破壞式創新)");
      strategy.analysis += "破軍主耗，先破後立。財運大起大落，適合尋找被低估或轉型中的公司（轉機股）。";
  }
  
  if (wealthStars.some(s => s.includes("七殺"))) {
      strategy.action = "MOMENTUM";
      strategy.riskLevel = "High";
      strategy.sectors.push("Tech (科技)", "Manufacturing (製造)", "Commodities (原物料)");
      strategy.analysis += "七殺主肅殺，掌權。適合強勢股、順勢操作，切忌在此宮位做長期存股（若無祿存）。";
  }
  
  if (wealthStars.some(s => s.includes("紫微"))) {
      strategy.action = "ALLOCATE";
      strategy.riskLevel = "Medium";
      strategy.sectors.push("Blue Chips (權值股)", "Luxury (精品)", "Government (政府相關)");
      strategy.analysis += "紫微帝星，財源廣進但需靠人脈。適合投資大型企業、國家級建設或高端消費。";
  }

  if (wealthStars.some(s => s.includes("天機"))) {
      strategy.action = "ROTATE";
      strategy.riskLevel = "Medium";
      strategy.sectors.push("AI/Software (軟體)", "Logistics (物流)", "Consulting (顧問)");
      strategy.analysis += "天機主智，財來財去。適合靠腦力、技術分析或短線靈活操作，不宜死守。";
  }

  if (wealthStars.some(s => s.includes("太陽"))) {
      strategy.action = "GIVE/GROW";
      strategy.riskLevel = "Medium";
      strategy.sectors.push("Energy (能源)", "Public Utility (公用事業)", "Media (媒體)");
      strategy.analysis += "太陽主貴，先名後利。適合投資知名度高、公益性質或能源相關產業。";
  }
  
  if (strategy.sectors.length === 0) {
      strategy.action = "DIVERSIFY";
      strategy.sectors = ["Global ETF", "Bonds"];
      strategy.analysis = "財帛宮星曜平和，建議採取資產配置策略，分散風險。";
  }

  // Remove duplicates
  strategy.sectors = [...new Set(strategy.sectors)];
  
  return strategy;
}

module.exports = {
  PALACES: PALACE_NAMES,
  calculateLifePalace,
  calculateWealthPalace,
  calculateFortunePalace,
  getInvestmentStrategy,
  getFullPalaceMapping
};
