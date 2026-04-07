
// 流年四化表 (Ten Heavenly Stems Transformation)
// 根據天干決定四化: 祿, 權, 科, 忌
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

// 取得流年四化
function getAnnualTransformations(yearStem) {
  return TRANSFORMATIONS[yearStem] || {};
}

// 取得流年命宮位置 (根據地支)
// 子年(0)在子宮? 不，流年命宮就是地支所在宮位。
// 子年 -> 命宮在子(0)
// 丑年 -> 命宮在丑(1)
// ...
// 2026 丙午 -> 午年 -> 命宮在午(6)
function getAnnualLifePalace(yearBranchIndex) {
    return yearBranchIndex; 
}

module.exports = {
  getAnnualTransformations,
  getAnnualLifePalace
};
