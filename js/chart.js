// 环形图模块
let chartInstance = null;
let currentDrillParent = null;
let categoryColorMap = new Map();
let animationFrameId = null;
let orbitAnimationStart = 0;

// 辅助函数：从日期字符串获取年份和季度
function getYearQuarter(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    let quarter = 1;
    if (month >= 4 && month <= 6) quarter = 2;
    else if (month >= 7 && month <= 9) quarter = 3;
    else if (month >= 10 && month <= 12) quarter = 4;
    return { year, quarter };
}

// 一级分类聚合
function aggregateByCategory(items) {
    const countMap = new Map();
    for (const item of items) {
        let mainCat = '其他';
        if (item.tags && item.tags.length > 0 && item.tags[0].category1) {
            mainCat = item.tags[0].category1;
        }
        countMap.set(mainCat, (countMap.get(mainCat) || 0) + 1);
    }
    const sorted = Array.from(countMap.entries()).sort((a,b)=>b[1]-a[1]);
    return { labels: sorted.map(v=>v[0]), data: sorted.map(v=>v[1]) };
}

// 二级分类聚合（钻取）
function aggregateByCategory2(items, parentCat) {
    const filtered = items.filter(item => {
        let cat1 = '其他';
        if (item.tags && item.tags[0] && item.tags[0].category1) cat1 = item.tags[0].category1;
        return cat1 === parentCat;
    });
    const map = new Map();
    filtered.forEach(item => {
        let cat2 = '未分类';
        if (item.tags && item.tags[0] && item.tags[0].category2) cat2 = item.tags[0].category2;
        map.set(cat2, (map.get(cat2) || 0) + 1);
    });
    return {
        labels: Array.from(map.keys()),
        data: Array.from(map.values()),
        total: filtered.length
    };
}

// 渲染自定义图例
function renderCustomLegend(chart) {
    const legendContainer = document.getElementById('customLegend');
    if (!legendContainer || !chart) return;
    legendContainer.innerHTML = '';
    const meta = chart.getDatasetMeta(0);
    const items = chart.data.labels.map((label, i) => ({
        text: label,
        color: chart.data.datasets[0].backgroundColor[i],
        hidden: meta.data[i]?.hidden,
        index: i
    }));
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'legend-item' + (item.hidden ? ' dimmed' : '');
        div.innerHTML = `<span class="legend-color" style="background-color: ${item.color};"></span><span class="legend-text">${item.text}</span>`;
        div.addEventListener('click', () => {
            const datasetMeta = chart.getDatasetMeta(0);
            const dataItem = datasetMeta.data[item.index];
            dataItem.hidden = !dataItem.hidden;
            chart.update();
            renderCustomLegend(chart);
        });
        legendContainer.appendChild(div);
    });
}

// 顶层洞察
function updateInsightForTop(filteredItems, year, quarter) {
    const map = new Map();
    filteredItems.forEach(item => {
        let cat = '其他';
        if (item.tags && item.tags[0]?.category1) cat = item.tags[0].category1;
        map.set(cat, (map.get(cat) || 0) + 1);
    });
    const sorted = Array.from(map.entries()).sort((a,b) => b[1] - a[1]);
    const top = sorted[0] || ['无', 0];
    const total = filteredItems.length;
    
    // 获取主导兴趣对应的扇形颜色（若映射不存在则使用默认色）
    const mainColor = categoryColorMap.get(top[0]) || '#CBB9C0';
    
    let secondHtml = '';
    if (sorted.length > 1) {
        const sec = sorted[1];
        const secColor = categoryColorMap.get(sec[0]) || '#AFA7B5';
        secondHtml = `<div class="second-focus" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.1);">
            <span class="label" style="font-size: 0.85rem;">第二关注</span>
            <strong style="color: ${secColor}; font-size: 1.1rem; margin-left: 0.3rem;">${sec[0]}</strong>
            <span style="font-size: 0.85rem;"> (${sec[1]}个，${((sec[1]/total)*100).toFixed(1)}%)</span>
        </div>`;
    }

    // 根据真实数据分析的文案（已有）
    let hobbyMsg = '';
    if (top[0] === '游戏') {
        const gameCats = new Set();
        filteredItems.filter(i => i.tags?.[0]?.category1 === '游戏').forEach(i => {
            if (i.tags[0]?.category2) gameCats.add(i.tags[0].category2);
        });
        if (gameCats.has('游戏官方')) hobbyMsg = '🎮 我是“游戏公司粉”，密切关注米哈游、腾讯等官方动态，对新游和版本更新如数家珍。';
        else if (gameCats.has('电子竞技')) hobbyMsg = '⚡ 电竞热情高涨，LPL、无畏契约的赛事和选手动态从不落下。';
        else hobbyMsg = '二游是我的第二人生，从攻略到主播，涉猎广泛。';
    } else if (top[0] === '知识') {
        if (filteredItems.some(i => i.tags?.[0]?.category2 === '科技理工')) hobbyMsg = '我是硬核知识控，尤其痴迷AI/深度学习，吴恩达、代码随想录都是我的收藏。';
        else if (filteredItems.some(i => i.tags?.[0]?.category2 === '社会科学')) hobbyMsg = '我对国际时政、历史地理有浓厚兴趣，常看波士顿圆脸、高志凯的深度分析。';
        else hobbyMsg = '知识边界不断拓展，语言学习、科学科普都是我的充电站。';
    } else if (top[0] === '音乐') {
        const hasPop = filteredItems.some(i => i.tags?.[0]?.category2 === '流行歌手');
        const hasInst = filteredItems.some(i => i.tags?.[0]?.category2 === '器乐演奏');
        if (hasPop && hasInst) hobbyMsg = '🎶 音乐品味多元，从流行歌手到钢琴吉他，华语、J-Pop、欧美通吃。';
        else if (hasPop) hobbyMsg = '🎤 我是流行音乐发烧友，华语、J-Pop、欧美榜单信手拈来。';
        else hobbyMsg = '🎹 钟情器乐演奏，钢琴、吉他的旋律让我沉浸。';
    } else if (top[0] === '生活') {
        hobbyMsg = '🍜 生活类内容占比最高，我喜欢美食教程、搞笑日常和旅行vlog，是个懂享受的乐活派。';
    } else {
        hobbyMsg = '✨ 兴趣广泛，关注点折射出我独特的生活视角。';
    }

    const insightHtml = `
        <div class="insight-card">
            <div class="card-header">
                <span class="time-badge">📅 ${year}年 Q${quarter}</span>
                <span class="total-badge">共关注 ${total} 人</span>
            </div>
            <div class="main-focus">
                <span class="label" style="font-size: 0.85rem;">· 主导兴趣 ·</span>
                <h3 style="color: ${mainColor}; margin: 0.25rem 0; font-size: 1.4rem;">${top[0]}</h3>
                <p style="font-size: 0.9rem;">占 ${top[1]} 位 (${((top[1]/total)*100).toFixed(1)}%)</p>
            </div>
            ${secondHtml}
            <p class="card-tip">${hobbyMsg}</p>
        </div>
    `;
    document.getElementById('insightMessage').innerHTML = insightHtml;
}

// 钻取后的洞察
function updateInsightForDrill(filteredAll, parentCat, year, quarter) {
    const filteredParent = filteredAll.filter(item => {
        let cat1 = '其他';
        if (item.tags && item.tags[0] && item.tags[0].category1) cat1 = item.tags[0].category1;
        return cat1 === parentCat;
    });
    const map = new Map();
    filteredParent.forEach(item => {
        let cat2 = '未分类';
        if (item.tags && item.tags[0] && item.tags[0].category2) cat2 = item.tags[0].category2;
        map.set(cat2, (map.get(cat2) || 0) + 1);
    });
    const sorted = Array.from(map.entries()).sort((a,b) => b[1] - a[1]);
    const top = sorted[0] || ['无', 0];
    const total = filteredParent.length;
    
    const mainColor = categoryColorMap.get(top[0]) || '#F27907';
    
    let secondHtml = '';
    if (sorted.length > 1) {
        const sec = sorted[1];
        const secColor = categoryColorMap.get(sec[0]) || '#AFA7B5';
        secondHtml = `<div class="second-focus" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.1);">
            <span class="label" style="font-size: 0.85rem;">次要偏好</span>
            <strong style="color: ${secColor}; font-size: 1.1rem; margin-left: 0.3rem;">${sec[0]}</strong>
            <span style="font-size: 0.85rem;"> (${sec[1]}个，${((sec[1]/total)*100).toFixed(1)}%)</span>
        </div>`;
    }

    // 已有的 drillMsg 逻辑保持不变（略长，此处不重复）
    let drillMsg = '';
    if (parentCat === '游戏') {
        if (top[0] === '电子竞技') drillMsg = '⚡ 你热衷于电竞赛事，LPL、LCK、无畏契约的职业选手和比赛时刻牵动你的心。';
        else if (top[0] === '游戏官方') drillMsg = '🎮 你是游戏产业的“媒体人”，关注米哈游、腾讯、鹰角等厂商的一举一动。';
        else if (top[0] === '游戏攻略') drillMsg = '📚 喜欢钻研游戏机制，攻略和教程是你的得力助手。';
        else drillMsg = `🎲 在游戏领域，你尤其关注「${top[0]}」相关内容。`;
    } else if (parentCat === '知识') {
        if (top[0] === '科技理工') drillMsg = '🤖 硬核科技爱好者，AI、深度学习、编程教程占据你的收藏夹。';
        else if (top[0] === '社会科学') drillMsg = '🌏 关心世界局势与历史脉络，常看时政评论和社科分析。';
        else if (top[0] === '语言学习') drillMsg = '🗣️ 语言能力持续进化，英语、日语学习资源是你每日必备。';
        else drillMsg = `📖 知识海洋中，你聚焦在「${top[0]}」领域。`;
    } else if (parentCat === '音乐') {
        if (top[0] === '流行歌手') drillMsg = '🎤 流行音乐是你的精神食粮，华语、J-Pop、欧美流行全战线覆盖。';
        else if (top[0] === '器乐演奏') drillMsg = '🎹 纯音乐爱好者，钢琴、吉他的旋律让你沉静或振奋。';
        else if (top[0] === '游戏/动画音乐') drillMsg = '🎧 游戏原声和动画配乐是你的宝藏歌单。';
        else drillMsg = `🎵 音乐品味独特，偏爱「${top[0]}」这类风格。`;
    } else if (parentCat === '生活') {
        if (top[0] === '搞笑/日常') drillMsg = '😂 生活需要笑声，搞笑UP主和日常吐槽是你放松的方式。';
        else if (top[0] === '美食') drillMsg = '🍳 美食博主是你的“云饭搭子”，探店、烹饪教程收藏无数。';
        else if (top[0] === '旅行') drillMsg = '✈️ 身体和灵魂总有一个在路上，旅行vlog带你走遍世界。';
        else drillMsg = `🌿 生活中你关注「${top[0]}」，享受真实与趣味。`;
    } else {
        drillMsg = `✨ 在“${parentCat}”领域，你主要聚焦于「${top[0]}」相关内容。`;
    }

    const insightHtml = `
        <div class="insight-card">
            <div class="card-header">
                <span class="time-badge">📅 ${year}年 Q${quarter}</span>
                <span class="total-badge">🔍 钻取至 ${parentCat}</span>
                <span class="total-badge">共 ${total} 人</span>
            </div>
            <div class="main-focus">
                <span class="label" style="font-size: 0.85rem;">· 二级主导 ·</span>
                <h3 style="color: ${mainColor}; margin: 0.25rem 0; font-size: 1.4rem;">${top[0]}</h3>
                <p style="font-size: 0.9rem;">占 ${top[1]} 位 (${((top[1]/total)*100).toFixed(1)}%)</p>
            </div>
            ${secondHtml}
            <p class="card-tip">${drillMsg}</p>
        </div>
    `;
    document.getElementById('insightMessage').innerHTML = insightHtml;
}


// 动画圆点（每帧动态计算圆心和半径）
function startOrbitGlowAnimation(chart) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    const dot = document.querySelector('.orbit-glow-dot');
    if (!dot || !chart || !chart.data || !chart.getDatasetMeta(0)) return;
    
    const canvas = chart.canvas;
    const area = chart.chartArea;
    if (!area) return;
    
    const logicalRadius = Math.min(area.right - area.left, area.bottom - area.top) / 2;
    const angularSpeed = 1.0;
    const dataPoints = chart.getDatasetMeta(0).data;
    let firstStart = dataPoints[0].startAngle;
    let initialOffset = firstStart % (2 * Math.PI);
    if (initialOffset < 0) initialOffset += 2 * Math.PI;
    orbitAnimationStart = performance.now();
    
    function updateOrbit(now) {
        const canvasRect = canvas.getBoundingClientRect();
        const ratioX = canvasRect.width / canvas.width;
        const ratioY = canvasRect.height / canvas.height;
        const scale = (ratioX + ratioY) / 2;
        const absoluteCenterX = canvasRect.left + canvasRect.width / 2;
        const absoluteCenterY = canvasRect.top + canvasRect.height / 2;
        const radius = logicalRadius * 0.975 * scale;
        
        const elapsed = (now - orbitAnimationStart) / 1000;
        let angleRad = (angularSpeed * elapsed + initialOffset) % (2 * Math.PI);
        
        let activeColor = '#F27907';
        for (let i = 0; i < dataPoints.length; i++) {
            const point = dataPoints[i];
            let start = point.startAngle;
            let end = point.endAngle;
            let normStart = start % (2 * Math.PI);
            let normEnd = end % (2 * Math.PI);
            if (normStart < 0) normStart += 2 * Math.PI;
            if (normEnd < 0) normEnd += 2 * Math.PI;
            let inSector = false;
            if (normStart < normEnd) {
                inSector = (angleRad >= normStart && angleRad < normEnd);
            } else {
                inSector = (angleRad >= normStart || angleRad < normEnd);
            }
            if (inSector) {
                activeColor = chart.data.datasets[0].backgroundColor[i];
                break;
            }
        }
        
        const dotX = absoluteCenterX + radius * Math.cos(angleRad);
        const dotY = absoluteCenterY + radius * Math.sin(angleRad);
        const container = dot.parentNode;
        const containerRect = container.getBoundingClientRect();
        dot.style.left = (dotX - containerRect.left) + 'px';
        dot.style.top = (dotY - containerRect.top) + 'px';
        dot.style.backgroundColor = activeColor;
        
        animationFrameId = requestAnimationFrame(updateOrbit);
    }
    animationFrameId = requestAnimationFrame(updateOrbit);
}

// 构建环形图（核心）
function buildDoughnutChart(labels, data, total, centerText, drillEnabled = true) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    const ctx = document.getElementById('interestChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#b77f70', '#d89c7a', '#bca295', '#bca289', '#ceb797', '#cfc3a9', '#e1ccb1', '#e8d3c0', '#feecd8'],
                borderColor: '#1a1a1a',
                borderWidth: 0,
                hoverBorderWidth: 2,
                hoverBorderColor: '#ffffff',
                borderRadius: 4,
                spacing: 4,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { animateScale: true, animateRotate: true },
            onClick: (event, activeElements) => {
                if (!drillEnabled) return;
                if (activeElements.length === 0) return;
                const index = activeElements[0].index;
                const clickedLabel = chartInstance.data.labels[index];
                if (currentDrillParent === null) {
                    window.drillToCategory2(clickedLabel);
                } else {
                    alert(`当前已是“${currentDrillParent}”的二级分布，请点击“返回一级分类”查看顶层数据。`);
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.raw} 个 (${((ctx.raw/total)*100).toFixed(1)}%)`
                    }
                }
            }
        },
        plugins: [{
            id: 'centerText',
            afterDraw(chart) {
                const { ctx, chartArea: { width, height } } = chart;
                ctx.save();
                ctx.font = 'bold 2rem system-ui, -apple-system, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(total, width / 2, height / 2 - 10);
                ctx.font = '0.8rem system-ui, -apple-system, sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillText(centerText, width / 2, height / 2 + 20);
                ctx.restore();
            }
        }]
    });
    
    categoryColorMap.clear();
    chartInstance.data.labels.forEach((label, idx) => {
        categoryColorMap.set(label, chartInstance.data.datasets[0].backgroundColor[idx]);
    });
    
    renderCustomLegend(chartInstance);
    startOrbitGlowAnimation(chartInstance);
}

// 钻取到二级分类
function drillToCategory2(parentCategory) {
    const year = parseInt(document.getElementById('yearSelect').value);
    const quarter = parseInt(document.getElementById('quarterSelect').value);
    const filteredAll = window.allFollowData.filter(item => {
        const yq = getYearQuarter(item.follow_time);
        return yq && yq.year === year && yq.quarter === quarter;
    });
    const { labels, data, total } = aggregateByCategory2(filteredAll, parentCategory);
    if (labels.length === 0) {
        alert(`“${parentCategory}” 分类下暂无二级数据。`);
        return;
    }
    currentDrillParent = parentCategory;
    document.getElementById('drillBackBtn').style.display = 'inline-block';
    buildDoughnutChart(labels, data, total, `二级分类 · ${parentCategory}`, false);
    updateInsightForDrill(filteredAll, parentCategory, year, quarter);
}

// 返回顶层
function resetToTopLevel() {
    currentDrillParent = null;
    document.getElementById('drillBackBtn').style.display = 'none';
    window.refreshTopLevelChart();
}

// 刷新顶层图表（根据当前年份/季度）
function refreshTopLevelChart() {
    if (!window.allFollowData || !window.allFollowData.length) return;
    const year = parseInt(document.getElementById('yearSelect').value);
    const quarter = parseInt(document.getElementById('quarterSelect').value);
    const filtered = window.allFollowData.filter(item => {
        const yq = getYearQuarter(item.follow_time);
        return yq && yq.year === year && yq.quarter === quarter;
    });
    if (filtered.length === 0) {
        if (chartInstance) chartInstance.destroy();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        document.getElementById('insightMessage').innerHTML = `📭 ${year}年第${quarter}季度没有关注记录，尝试其他时段。`;
        document.getElementById('customLegend').innerHTML = '';
        return;
    }
    const { labels, data } = aggregateByCategory(filtered);
    const total = filtered.length;
    buildDoughnutChart(labels, data, total, '总关注', true);
    updateInsightForTop(filtered, year, quarter);
}


// 暴露需要全局使用的函数和变量
window.chart = {
    getYearQuarter,
    aggregateByCategory,
    aggregateByCategory2,
    buildDoughnutChart,
    refreshTopLevelChart,
    drillToCategory2,
    resetToTopLevel,
    startOrbitGlowAnimation
};