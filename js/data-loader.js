// 数据加载模块
window.avatarMap = {};

async function loadAvatarMap() {
    try {
        const res = await fetch('data/avatar_map.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        window.avatarMap = await res.json();
        console.log(`✅ 头像映射加载完成，共 ${Object.keys(window.avatarMap).length} 个`);
    } catch (e) {
        console.warn('⚠️ 加载头像映射失败，将使用首字母占位', e);
    }
}

async function loadCategoryData() {
    try {
        const res = await fetch('data/bilibili_categories_aggregated.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        for (const container of document.querySelectorAll('[data-preview]')) {
            const catKey = container.getAttribute('data-preview');
            if (catKey === '电影与电视') continue;
            const categoryData = data[catKey] || {};
            let allUps = [];
            for (let cat2 in categoryData) {
                for (let cat3 in categoryData[cat2]) {
                    allUps = allUps.concat(categoryData[cat2][cat3]);
                }
            }
            const seen = new Set();
            const uniqueUps = allUps.filter(up => {
                if (seen.has(up.uid)) return false;
                seen.add(up.uid);
                return true;
            }).sort((a, b) => b.follow_time.localeCompare(a.follow_time));
            await renderUpPreviewList(container, uniqueUps.slice(0, 5));
        }
        
        document.querySelectorAll('[data-link]').forEach(link => {
            const cat = link.getAttribute('data-link');
            link.href = '#';
            link.title = `查看全部${cat}类UP主`;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                alert(`“${cat}”类UP主详细页面即将上线，敬请期待！`);
            });
        });
    } catch (e) {
        console.error('❌ 加载分类数据失败:', e);
        document.querySelectorAll('[data-preview]').forEach(el => {
            if (el.id !== 'animePreview') el.textContent = '数据加载失败';
        });
    }
}

async function renderUpPreviewList(container, items) {
    if (!container) return;
    container.innerHTML = '';
    if (!items || items.length === 0) {
        container.innerHTML = '<div class="preview-meta">暂无关注</div>';
        return;
    }
    for (const up of items) {
        const div = document.createElement('div');
        div.className = 'preview-item';
        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'up-avatar';
        const placeholder = document.createElement('span');
        placeholder.textContent = up.name.charAt(0);
        avatarContainer.appendChild(placeholder);
        const localFilename = window.avatarMap[up.uid];
        if (localFilename) {
            const img = document.createElement('img');
            img.src = `avatars/${localFilename}`;
            img.alt = up.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            img.onload = () => {
                avatarContainer.innerHTML = '';
                avatarContainer.appendChild(img);
            };
            img.onerror = () => {
                console.warn(`本地头像加载失败: ${up.name} (${up.uid})`);
            };
        }
        const info = document.createElement('div');
        info.className = 'preview-info';
        const time = up.follow_time ? up.follow_time.split(' ')[0] : '';
        info.innerHTML = `<div class="preview-title">${up.name}</div><div class="preview-meta">关注于 ${time}</div>`;
        const link = document.createElement('a');
        link.href = `https://space.bilibili.com/${up.uid}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';
        link.style.display = 'flex';
        link.style.alignItems = 'center';
        link.style.gap = '0.75rem';
        link.appendChild(avatarContainer);
        link.appendChild(info);
        div.appendChild(link);
        container.appendChild(div);
    }
}

async function loadAnimePreview() {
    const container = document.getElementById('animePreview');
    if (!container) return;
    try {
        const res = await fetch('data/bangumi_data.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const parseDate = (str) => {
            const m = String(str).match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
            if (!m) return null;
            return Date.UTC(+m[1], +m[2] - 1, +m[3]);
        };
        const sorted = data.filter(item => item.release_date && item.release_date !== '敬请期待')
            .sort((a, b) => {
                const da = parseDate(a.release_date);
                const db = parseDate(b.release_date);
                if (da === null && db === null) return 0;
                if (da === null) return 1;
                if (db === null) return -1;
                return db - da;
            });
        const latest = sorted.slice(0, 4);
        container.innerHTML = '';
        latest.forEach(item => {
            const div = document.createElement('div');
            div.className = 'anime-preview-item';
            const img = document.createElement('img');
            img.className = 'anime-preview-img';
            img.loading = 'lazy';
            img.alt = item.title;
            img.referrerPolicy = 'no-referrer';
            img.src = item.cover || '';
            img.onerror = () => { img.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'56\' viewBox=\'0 0 40 56\'%3E%3Crect width=\'40\' height=\'56\' fill=\'%232a2a2a\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%238e8e9e\' font-size=\'8\'%3E暂无%3C/text%3E%3C/svg%3E'; };
            const info = document.createElement('div');
            info.className = 'preview-info';
            info.innerHTML = `<div class="preview-title">${item.title}</div><div class="preview-meta">${item.latest_episode || '即将开播'}</div>`;
            div.appendChild(img);
            div.appendChild(info);
            container.appendChild(div);
        });
    } catch (e) {
        console.error('追番数据加载失败:', e);
        container.innerHTML = '<div class="preview-meta">追番数据加载失败</div>';
    }
}

async function loadDetailedDataForChart() {
    try {
        const res = await fetch('data/bilibili_following_detailed.json');
        if (!res.ok) throw new Error('无法加载详细数据');
        window.allFollowData = await res.json();
        const yearsSet = new Set();
        window.allFollowData.forEach(item => {
            const yq = window.chart.getYearQuarter(item.follow_time);
            if (yq) yearsSet.add(yq.year);
        });
        const sortedYears = Array.from(yearsSet).sort((a,b)=>b-a);
        const yearSelect = document.getElementById('yearSelect');
        if (yearSelect) {
            yearSelect.innerHTML = '';
            sortedYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = `${y}年`;
                yearSelect.appendChild(opt);
            });
            if (sortedYears.length) {
                yearSelect.value = sortedYears[0];
                let maxQ = 1;
                window.allFollowData.forEach(item => {
                    const yq = window.chart.getYearQuarter(item.follow_time);
                    if (yq && yq.year === sortedYears[0] && yq.quarter > maxQ) maxQ = yq.quarter;
                });
                const qs = document.getElementById('quarterSelect');
                if (qs) qs.value = maxQ.toString();
            }
        }
        // 绑定切换事件
        document.getElementById('yearSelect')?.addEventListener('change', () => {
            window.chart.resetToTopLevel();
        });
        document.getElementById('quarterSelect')?.addEventListener('change', () => {
            window.chart.resetToTopLevel();
        });
        const backBtn = document.getElementById('drillBackBtn');
        if (backBtn) backBtn.addEventListener('click', window.chart.resetToTopLevel);
        
        window.chart.refreshTopLevelChart();
    } catch (err) {
        console.error('详细数据加载失败', err);
        const insightDiv = document.getElementById('insightMessage');
        if (insightDiv) insightDiv.innerHTML = '⚠️ 关注数据加载失败，请检查 bilibili_following_detailed.json 是否存在。';
    }
}

// 统一入口
window.loadAllData = async function() {
    await loadAvatarMap();
    await loadCategoryData();
    loadAnimePreview();
    await loadDetailedDataForChart();
};