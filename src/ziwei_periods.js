
const { fixIndex } = require('./ziwei_core');
const { getTigerStartStem } = require('./ziwei_stars');

// 天干四化表
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
const YANG_STEM_INDICES = new Set([0, 2, 4, 6, 8]);

/** 童限：一命二財三疾厄、四歲夫妻五福德、六歲事業 */
const CHILDHOOD_PALACE_OFFSETS = [0, 4, 5, 2, 10, 8];

function getLunarMonthAdjustments(lunar) {
    const rawMonth = lunar.getMonth();
    const isLeap = rawMonth < 0;
    const month = Math.abs(rawMonth);
    const leapAddition = isLeap && lunar.getDay() > 15 ? 1 : 0;
    return { month, leapAddition, isLeap };
}

function getNominalAge(birthLunar, targetLunar) {
    return targetLunar.getYear() - birthLunar.getYear() + 1;
}

/** 陽男陰女順行，陰男陽女逆行 */
function getDecadeDirection(yearStemIndex, gender = 'male') {
    const yearYang = YANG_STEM_INDICES.has(yearStemIndex);
    const isMale = gender === 'male';
    const forward = (isMale && yearYang) || (!isMale && !yearYang);
    return forward ? 1 : -1;
}

/** 依出生年干五虎遁，求指定地支宮位的天干 */
function getPalaceStemAtBranch(yearStemIndex, branchIndex) {
    const tigerStem = getTigerStartStem(yearStemIndex);
    let offset = branchIndex - 2;
    if (offset < 0) offset += 12;
    return HEAVENLY_STEMS[(tigerStem + offset) % 10];
}

/**
 * 大限命宮（大運）
 * 起運歲數＝五行局數；每十年一宮；未起運走童限
 */
function getDecadeLifePalace(lifePalaceIdx, bureau, nominalAge, yearStemIndex, gender = 'male') {
    if (nominalAge < bureau) {
        if (nominalAge >= 1 && nominalAge <= CHILDHOOD_PALACE_OFFSETS.length) {
            const offset = CHILDHOOD_PALACE_OFFSETS[nominalAge - 1];
            return fixIndex(lifePalaceIdx - offset);
        }
        return lifePalaceIdx;
    }

    const direction = getDecadeDirection(yearStemIndex, gender);
    const decadeIdx = Math.floor((nominalAge - bureau) / 10);
    return fixIndex(lifePalaceIdx + direction * decadeIdx);
}

/**
 * 流月命宮（斗君法）
 * 流年地支宮逆數生月，再順數生時為正月，逐月順行
 */
function getMonthlyLifePalace(
    annualLifeIdx,
    birthMonth,
    birthHourBranchIdx,
    currentMonth,
    birthLeapAddition = 0,
    currentLeapAddition = 0
) {
    const hourBranch = birthHourBranchIdx >= 12 ? 0 : birthHourBranchIdx;
    let douJun = annualLifeIdx - (birthMonth - 1 + birthLeapAddition);
    douJun += hourBranch;
    return fixIndex(douJun + (currentMonth - 1 + currentLeapAddition));
}

/** 流日命宮：流月命宮起順數至本日 */
function getDailyLifePalace(monthLifeIdx, currentDay) {
    return fixIndex(monthLifeIdx + currentDay - 1);
}

function getTimeTransformations(stemStr) {
    return TRANSFORMATIONS[stemStr] || {};
}

module.exports = {
    getDecadeLifePalace,
    getMonthlyLifePalace,
    getDailyLifePalace,
    getTimeTransformations,
    getPalaceStemAtBranch,
    getLunarMonthAdjustments,
    getNominalAge,
    getDecadeDirection,
    HEAVENLY_STEMS,
};
