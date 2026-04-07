
// Generate plain text advice based on stars and transformations
function getPalaceAdvice(stars, palaceFunction) {
    let doList = [];
    let dontList = [];
    
    // Check Transformations first (High Priority)
    const hasLu = stars.some(s => s.includes('祿'));
    const hasQuan = stars.some(s => s.includes('權'));
    const hasKe = stars.some(s => s.includes('科'));
    const hasJi = stars.some(s => s.includes('忌'));

    if (hasLu) {
        doList.push("積極進取", "擴大投資", "廣結善緣");
        dontList.push("過度保守", "錯失良機");
    }
    if (hasQuan) {
        doList.push("爭取主導", "升職競賽", "創業");
        dontList.push("軟弱退讓", "依賴他人");
    }
    if (hasKe) {
        doList.push("簽訂合約", "建立名聲", "學術研究");
        dontList.push("毀約", "造謠");
    }
    if (hasJi) {
        doList.push("韜光養晦", "還債", "進修", "保守觀望");
        dontList.push("重大投資", "為人擔保", "擴張信用", "口舌爭辯");
    }

    // Check Specific Stars
    if (stars.some(s => s.includes('紫微'))) {
        doList.push("尋求貴人", "領導統御");
    }
    if (stars.some(s => s.includes('天機'))) {
        doList.push("策略規劃", "短期變動");
        dontList.push("鑽牛角尖");
    }
    if (stars.some(s => s.includes('太陽'))) {
        doList.push("公益付出", "公開透明");
        dontList.push("私下交易");
    }
    if (stars.some(s => s.includes('武曲'))) {
        doList.push("理財規劃", "執行任務");
        dontList.push("借貸");
    }
    if (stars.some(s => s.includes('天同'))) {
        doList.push("享受生活", "聚餐");
        dontList.push("好逸惡勞");
    }
    if (stars.some(s => s.includes('廉貞'))) {
        doList.push("社交公關");
        dontList.push("涉險違法", "賭博");
    }
    if (stars.some(s => s.includes('天府'))) {
        doList.push("儲蓄置產", "守成");
        dontList.push("冒險犯難");
    }
    if (stars.some(s => s.includes('太陰'))) {
        doList.push("投資房產", "女性市場");
    }
    if (stars.some(s => s.includes('貪狼'))) {
        doList.push("交際應酬", "學習才藝");
        dontList.push("沈迷酒色", "投機貪婪");
    }
    if (stars.some(s => s.includes('巨門'))) {
        doList.push("演講教學", "學術研究");
        dontList.push("背後議論", "捲入是非");
    }
    if (stars.some(s => s.includes('七殺'))) {
        doList.push("突破現狀", "果斷執行");
        dontList.push("猶豫不決");
    }
    if (stars.some(s => s.includes('破軍'))) {
        doList.push("破舊立新", "轉行");
        dontList.push("守舊不變");
    }

    // Deduplicate
    doList = [...new Set(doList)];
    dontList = [...new Set(dontList)];

    // Default if empty
    if (doList.length === 0) doList.push("順其自然", "靜觀其變");
    if (dontList.length === 0) dontList.push("無特別禁忌");

    return {
        do: doList.slice(0, 3), // Top 3
        dont: dontList.slice(0, 3)
    };
}

module.exports = { getPalaceAdvice };
