
const { Lunar, Solar } = require('lunar-javascript');
const { PALACES, calculateLifePalace, calculateWealthPalace, calculateFortunePalace, getInvestmentStrategy } = require('./ziwei_core');
const { getFiveElementBureau, getZiWeiStarPosition, getTianFuStarPosition } = require('./ziwei_stars');

function calculateInvestmentLuck(birthYear, birthMonth, birthDay, birthHour) {
  console.log(`--- Tianji Zi Wei Dou Shu Engine Test (Phase 2) ---`);
  console.log(`Birth Date: ${birthYear}-${birthMonth}-${birthDay} ${birthHour}:00`);

  // Create Solar date
  const solar = Solar.fromYmd(birthYear, birthMonth, birthDay);
  const lunar = solar.getLunar();
  const lunarMonth = lunar.getMonth();
  const lunarDay = lunar.getDay();
  
  // Calculate Life Palace (Simplified Demo Logic)
  const lifePalaceIdx = calculateLifePalace(lunarMonth, birthHour);
  const lifePalaceName = PALACES[lifePalaceIdx];

  // Calculate Wealth Palace
  const wealthPalaceIdx = calculateWealthPalace(lifePalaceIdx);
  const wealthPalaceName = PALACES[wealthPalaceIdx];
  
  // Calculate Fortune Palace
  const fortunePalaceIdx = calculateFortunePalace(wealthPalaceIdx);
  const fortunePalaceName = PALACES[fortunePalaceIdx];

  console.log(`\n[Chart Structure]`);
  console.log(`Life Palace (命宮): ${lifePalaceName} (Base Personality & Destiny)`);
  console.log(`Wealth Palace (財帛宮): ${wealthPalaceName} (Financial Capacity)`);
  console.log(`Fortune Palace (福德宮): ${fortunePalaceName} (Investment Luck)`);

  // Real Star Logic (Phase 2)
  // Need to get Heavenly Stem of Birth Year for Wu Hu Dun
  // Lunar Year GanZhi: lunar.getYearGan() returns string char? No, lunar-javascript uses getYearGan() for string.
  // We need index.
  const yearGan = lunar.getYearGan(); 
  const yearGanIndex = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"].indexOf(yearGan);

  // Life Palace Branch is calculated in calculateLifePalace
  // We need to expose the index from ziwei_core or re-calculate.
  // calculateLifePalace returns index (0-11).
  
  const fiveElementBureau = getFiveElementBureau(yearGanIndex, lifePalaceIdx); 
  const ziWeiPos = getZiWeiStarPosition(fiveElementBureau, lunarDay);
  const tianFuPos = getTianFuStarPosition(ziWeiPos);

  console.log(`\n[Star Placement (An Xing Fa)]`);
  console.log(`Birth Year Stem: ${yearGan} (Index: ${yearGanIndex})`);
  const stemBranch = require('./ziwei_stars').getLifePalaceStemBranch(yearGanIndex, lifePalaceIdx);
  console.log(`Life Palace Stem/Branch: ${stemBranch}`);
  console.log(`Five Element Bureau: ${fiveElementBureau} (局)`);
  console.log(`Zi Wei Star Position: ${PALACES[ziWeiPos]}`);
  console.log(`Tian Fu Star Position: ${PALACES[tianFuPos]}`);

  // Determine Wealth Star based on Wealth Palace match
  let wealthStar = "Empty (空宮)";
  if (ziWeiPos === wealthPalaceIdx) wealthStar = "Purple Star (Zi Wei)";
  if (tianFuPos === wealthPalaceIdx) wealthStar = "Heavenly Treasury (Tian Fu)";
  
  // Fallback for demo if no star in Wealth Palace
  if (wealthStar === "Empty (空宮)") wealthStar = "Greedy Wolf (Tan Lang)"; // Retain demo fallback

  console.log(`Wealth Star: ${wealthStar}`);

  // Get Strategy
  const strategy = getInvestmentStrategy(wealthStar, "Tian Liang");
  
  console.log(`\n[Investment Strategy Recommendation]`);
  console.log(`Action: ${strategy.action}`);
  console.log(`Sectors: ${strategy.sectors.join(', ')}`);
  console.log(`Risk Level: ${strategy.riskLevel}`);
  console.log(`\n[Analysis]`);
  if (strategy.action === "BUY") {
      console.log(`With ${wealthStar} in the Wealth Palace, your financial foundation is strong. Focus on long-term assets.`);
  } else {
      console.log(`With ${wealthStar} in the Wealth Palace, market volatility brings opportunity. Focus on active trading.`);
  }
}

// Test with a sample date: 1990-06-15 08:30
calculateInvestmentLuck(1990, 6, 15, 8);
