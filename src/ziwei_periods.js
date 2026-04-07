
const { getTigerStartStem } = require('./ziwei_stars');

// 天干四化表 (重複使用)
const TRANSFORMATIONS = {
  "甲": { lu: "廉貞", quan: "破軍", ke: "武曲", ji: "太陽" },
  "乙": { lu: "天機", quan: "天梁", ke: "紫微", ji: "太陰" },
  "丙": { lu: "天同", quan: "天機", ke: "文昌", ji: "廉貞" },
  "丁": { lu: "太陰", quan: "天同", ke: "天機", ji: "巨門" },
  "戊": { lu: "貪狼", quan: "太陰", ke: "右弼", ji: "天機" },
  "己": { lu: "武曲", quan: "貪狼", ke: "天梁", ji: "文曲" },
  "庚": { lu: "太陽", quan: "武曲", ke: "太陰", ji: "天同" },
  "辛": { lu: "巨門", quan: "太陽", ke: "文曲", ji: "文昌" },
  "壬": { lu: "天梁", quan: "紫微", ke: "左輔", ji: "武曲" },
  "癸": { lu: "破軍", quan: "巨門", ke: "太陰", ji: "貪狼" }
};

const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// --- 大運 (Decade) ---
// 根據局數與順逆行計算
// 順逆: 陽男陰女順(1), 陰男陽女逆(-1)
// 這裡預設順行 (1) 用於 Demo
function getDecadeLifePalace(lifePalaceIdx, bureau, age, direction = 1) {
    // age: 虛歲
    // bureau: 2,3,4,5,6
    // 計算大運序數: (age - bureau) / 10
    // 第1大運: bureau ~ bureau+9
    // 第2大運: bureau+10 ~ bureau+19
    
    let decadeIdx = Math.floor((age - bureau) / 10);
    if (decadeIdx < 0) decadeIdx = 0; // 還沒起運算第一運
    
    // 宮位移動
    // 順行: life + decadeIdx
    // 逆行: life - decadeIdx
    let pos = lifePalaceIdx + (direction * decadeIdx);
    if (pos < 0) pos = (pos % 12 + 12) % 12;
    else pos = pos % 12;
    
    return pos;
}

// --- 流月 (Monthly) ---
// 斗數流月法：流年命宮起「逆」數生月，再起「順」數生時?
// 簡易法：從流年命宮起「逆」數到正月，然後順數至本月? 
// 這裡採用「五虎遁月」定天干，宮位則用簡單順行法：
// 正月在流年命宮? 不，正月在流年寅宮? 
// 通用法：流年命宮起逆行至生月(birthMonth)，即為正月位置? 
// 讓我們用「流年斗君」法：
// 流年斗君(正月) = 流年命宮 逆數 生月，再 順數 生時。
function getMonthlyLifePalace(annualLifeIdx, birthMonth, birthHourBranchIdx, currentMonth) {
    // 1. 定斗君 (正月命宮)
    // 逆數生月: annual - (month - 1)
    let douJun = annualLifeIdx - (birthMonth - 1);
    // 順數生時: + (hourBranchIdx) (子=0, 丑=1...)
    douJun = douJun + birthHourBranchIdx; 
    
    // 2. 定本月命宮
    // 正月在 douJun，二月在 douJun+1...
    // currentMonth (1-12)
    let monthPos = douJun + (currentMonth - 1);
    
    // Normalize
    if (monthPos < 0) monthPos = (monthPos % 12 + 12) % 12;
    else monthPos = monthPos % 12;
    
    return monthPos;
}

// --- 流日 (Daily) ---
// 流日命宮：流月命宮起順數至本日
function getDailyLifePalace(monthLifeIdx, currentDay) {
    // 1日在 monthLifeIdx
    // 2日在 monthLifeIdx + 1
    let dayPos = monthLifeIdx + (currentDay - 1);
    return dayPos % 12;
}

// 取得該宮位的天干 (用於四化)
// 需要知道該宮位的干支。
// 命盤固定後，宮位天干由「五虎遁」決定 (出生年干 -> 寅宮干)。
// 但流年/流月/流日的天干四化，通常是依「時間的天干」還是「宮位的天干」?
// 大運：依大運宮位的天干 (宮干四化)。
// 流年：依流年年份的天干 (歲干四化) -> 已實作。
// 流月：依流月月份的天干 (月干四化) 還是 流月宮位干? -> 通常用「歲干」或「月令干」。
// 投資應用上，我們用「時間天干」最準確：
// 2026年 (丙) -> 廉貞化忌
// 2026年6月 (甲午月) -> 甲干 -> 太陽化忌
// 2026年6月15日 (XX日) -> 日干 -> XX化忌
function getTimeTransformations(stemStr) {
    return TRANSFORMATIONS[stemStr] || {};
}

module.exports = {
    getDecadeLifePalace,
    getMonthlyLifePalace,
    getDailyLifePalace,
    getTimeTransformations,
    HEAVENLY_STEMS
};
