document.addEventListener('DOMContentLoaded', () => {
    // 页面加载动画
    const loadingEl = document.getElementById('pageLoading');
    window.addEventListener('load', () => loadingEl.classList.add('loading_out'));
    
    // 初始化液态玻璃姓名 + 横向滚动
    if (window.initAnimations) window.initAnimations();
    
    // 加载所有数据（包括图表）
    if (window.loadAllData) window.loadAllData();
});