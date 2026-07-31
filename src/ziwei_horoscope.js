/**
 * 大運／流年／流月／流日 運限統一計算
 * 宮位索引以地支固定盤為準：子=0 … 亥=11
 */
const { fixIndex } = require('./ziwei_core');
const { getTigerStartStem } = require('./ziwei_stars');
const { getAnnualTransformations, getAnnualLifePalace } = require('./ziwei_annual');
const {
    getDecadeLifePalace,
    getMonthlyLifePalace,
    getDailyLifePalace,
    getTimeTransformations,
    getPalaceStemAtBranch,
    getLunarMonthAdjustments,
    getNominalAge,
} = require('./ziwei_periods');

const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * @param {object} opts
 * @param {import('lunar-javascript').Solar} opts.birthSolar
 * @param {number} opts.birthHourBranchIdx
 * @param {number} opts.lifePalaceIdx
 * @param {number} opts.fiveElementBureau
 * @param {number} opts.birthYearStemIndex
 * @param {import('lunar-javascript').Solar} opts.targetSolar
 * @param {'male'|'female'} [opts.gender='male'] 未登錄性別時預設陽男順行
 */
function resolveHoroscope({
    birthSolar,
    birthHourBranchIdx,
    lifePalaceIdx,
    fiveElementBureau,
    birthYearStemIndex,
    targetSolar,
    gender = 'male',
}) {
    const birthLunar = birthSolar.getLunar();
    const targetLunar = targetSolar.getLunar();

    const targetYearStem = targetLunar.getYearGan();
    const targetYearBranch = targetLunar.getYearZhi();
    const annualLifePos = getAnnualLifePalace(EARTHLY_BRANCHES.indexOf(targetYearBranch));

    const nominalAge = getNominalAge(birthLunar, targetLunar);
    const decadeLifePos = getDecadeLifePalace(
        lifePalaceIdx,
        fiveElementBureau,
        nominalAge,
        birthYearStemIndex,
        gender
    );
    const decadeStem = getPalaceStemAtBranch(birthYearStemIndex, decadeLifePos);

    const birthMonthAdj = getLunarMonthAdjustments(birthLunar);
    const targetMonthAdj = getLunarMonthAdjustments(targetLunar);
    const monthlyLifePos = getMonthlyLifePalace(
        annualLifePos,
        birthMonthAdj.month,
        birthHourBranchIdx,
        targetMonthAdj.month,
        birthMonthAdj.leapAddition,
        targetMonthAdj.leapAddition
    );
    const dailyLifePos = getDailyLifePalace(monthlyLifePos, targetLunar.getDay());

    const monthStem = targetLunar.getMonthGan();
    const dayStem = targetLunar.getDayGan();

    return {
        birthLunar,
        targetLunar,
        nominalAge,
        isChildhood: nominalAge < fiveElementBureau,
        annualLifePos,
        decadeLifePos,
        monthlyLifePos,
        dailyLifePos,
        targetYearStem,
        targetYearBranch,
        decadeStem,
        monthStem,
        dayStem,
        annualTrans: getAnnualTransformations(targetYearStem),
        decadeTrans: getTimeTransformations(decadeStem),
        monthlyTrans: getTimeTransformations(monthStem),
        dailyTrans: getTimeTransformations(dayStem),
    };
}

module.exports = {
    EARTHLY_BRANCHES,
    resolveHoroscope,
};
