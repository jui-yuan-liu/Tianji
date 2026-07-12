
const { fixIndex } = require('./ziwei_core');

// 六十甲子納音表 (Sixty Jiazi Na Yin)
const NA_YIN = {
  "甲子": 4, "乙丑": 4, "丙寅": 6, "丁卯": 6, "戊辰": 3, "己巳": 3,
  "庚午": 5, "辛未": 5, "壬申": 4, "癸酉": 4, "甲戌": 6, "乙亥": 6,
  "丙子": 2, "丁丑": 2, "戊寅": 5, "己卯": 5, "庚辰": 4, "辛巳": 4,
  "壬午": 3, "癸未": 3, "甲申": 2, "乙酉": 2, "丙戌": 5, "丁亥": 5,
  "戊子": 6, "己丑": 6, "庚寅": 3, "辛卯": 3, "壬辰": 2, "癸巳": 2,
  "甲午": 4, "乙未": 4, "丙申": 6, "丁酉": 6, "戊戌": 3, "己亥": 3,
  "庚子": 5, "辛丑": 5, "壬寅": 4, "癸卯": 4, "甲辰": 6, "乙巳": 6,
  "丙午": 2, "丁未": 2, "戊申": 5, "己酉": 5, "庚戌": 4, "辛亥": 4,
  "壬子": 3, "癸丑": 3, "甲寅": 2, "乙卯": 2, "丙辰": 5, "丁巳": 5,
  "戊午": 6, "己未": 6, "庚申": 3, "辛酉": 3, "壬戌": 2, "癸亥": 2
};

const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

function getTigerStartStem(yearStemIndex) {
  const map = { 0: 2, 5: 2, 1: 4, 6: 4, 2: 6, 7: 6, 3: 8, 8: 8, 4: 0, 9: 0 };
  return map[yearStemIndex];
}

function getLifePalaceStemBranch(yearStemIndex, lifePalaceBranchIndex) {
  const tigerStem = getTigerStartStem(yearStemIndex);
  let offset = lifePalaceBranchIndex - 2;
  if (offset < 0) offset += 12;
  const lifeStemIndex = (tigerStem + offset) % 10;
  return HEAVENLY_STEMS[lifeStemIndex] + EARTHLY_BRANCHES[lifePalaceBranchIndex];
}

function getFiveElementBureau(yearStemIndex, lifePalaceBranchIndex) {
  const ganzhi = getLifePalaceStemBranch(yearStemIndex, lifePalaceBranchIndex);
  return NA_YIN[ganzhi] || 4;
}

/**
 * 紫微星定位（起紫微星訣）
 * 局數除日數，商數宮前走；奇偶決定順逆偏移。
 */
function getZiWeiStarPosition(bureau, lunarDay) {
  const fiveElementsValue = bureau;
  let remainder = -1;
  let offset = -1;
  let quotient;

  do {
    offset++;
    const divisor = lunarDay + offset;
    quotient = Math.floor(divisor / fiveElementsValue);
    remainder = divisor % fiveElementsValue;
  } while (remainder !== 0);

  quotient %= 12;
  let ziweiIndexFromYin = quotient - 1;
  if (offset % 2 === 0) {
    ziweiIndexFromYin += offset;
  } else {
    ziweiIndexFromYin -= offset;
  }

  return fixIndex(ziweiIndexFromYin + 2);
}

/** 天府星與紫微相對（以寅宮為起點的索引換算） */
function getTianFuStarPosition(ziWeiPos) {
  const ziweiIndexFromYin = fixIndex(ziWeiPos - 2);
  const tianfuIndexFromYin = fixIndex(12 - ziweiIndexFromYin);
  return fixIndex(tianfuIndexFromYin + 2);
}

// 取得所有主星位置 (完整安星法)
function getAllMajorStars(ziWeiPos, tianFuPos) {
    const stars = [];

    // 紫微星系 (逆行)
    const zwOffsets = [
        { name: "紫微", offset: 0 },
        { name: "天機", offset: -1 },
        { name: "太陽", offset: -3 },
        { name: "武曲", offset: -4 },
        { name: "天同", offset: -5 },
        { name: "廉貞", offset: -8 }
    ];

    zwOffsets.forEach(star => {
        let pos = (ziWeiPos + star.offset);
        if (pos < 0) pos = (pos % 12 + 12) % 12; // Handle negative modulo correctly
        else pos = pos % 12;
        
        stars.push({ name: star.name, position: pos, series: "ZiWei" });
    });

    // 天府星系 (順行)
    const tfOffsets = [
        { name: "天府", offset: 0 },
        { name: "太陰", offset: 1 },
        { name: "貪狼", offset: 2 },
        { name: "巨門", offset: 3 },
        { name: "天相", offset: 4 },
        { name: "天梁", offset: 5 },
        { name: "七殺", offset: 6 },
        { name: "破軍", offset: 10 }
    ];

    tfOffsets.forEach(star => {
        let pos = (tianFuPos + star.offset) % 12;
        stars.push({ name: star.name, position: pos, series: "TianFu" });
    });

    return stars;
}

module.exports = {
  getTigerStartStem,
  getFiveElementBureau,
  getZiWeiStarPosition,
  getTianFuStarPosition,
  getLifePalaceStemBranch,
  getAllMajorStars
};
