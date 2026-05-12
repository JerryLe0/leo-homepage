// 液态玻璃姓名动画
class LiquidGlassName {
    constructor() {
        this.lang = 'chinese';
        this.zhSvg = document.getElementById('zhSvg');
        this.enSvg = document.getElementById('enSvg');
        this.zhGroup = document.getElementById('zhGroup');
        this.label = document.getElementById('langLabel');
        this.loading = document.getElementById('nameLoading');
        this.fontData = null;
    }

    fadeTo(element, targetOpacity, duration = 500) {
        return new Promise(resolve => {
            if (!element) return resolve();
            const start = performance.now();
            const startOp = parseFloat(element.style.opacity);
            const initialOp = !isNaN(startOp) ? startOp : (window.getComputedStyle(element).opacity === '' ? 1 : parseFloat(window.getComputedStyle(element).opacity));
            const step = (now) => {
                const t = Math.min((now - start) / duration, 1);
                const ease = 1 - Math.pow(1 - t, 3);
                element.style.opacity = initialOp + (targetOpacity - initialOp) * ease;
                if (t < 1) requestAnimationFrame(step);
                else { element.style.opacity = targetOpacity; resolve(); }
            };
            requestAnimationFrame(step);
        });
    }

    async init() {
        try {
            const resp = await fetch('../data/font-paths-fzyansj.json');
            this.fontData = await resp.json();
            this.loading.style.display = 'none';
            this.label.style.display = 'block';
            this.buildChinese();
            this.zhSvg.style.display = 'block';
            this.zhSvg.style.opacity = '1';
            this.enSvg.style.display = 'none';
            this.enSvg.style.opacity = '0';
            this.run();
        } catch (e) {
            this.loading.textContent = '加载失败: ' + e.message;
            console.error(e);
        }
    }

    buildChinese() {
        const offsets = [0, 260, 500];
        const chars = this.fontData.chinese.chars;
        chars.forEach((charData, ci) => {
            const offsetX = offsets[ci];
            charData.contours.forEach(contourD => {
                const sg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                sg.classList.add('sg');
                const cx = charData.bounds ? (charData.bounds[0] + charData.bounds[2]) / 2 : 125;
                const cy = charData.bounds ? (charData.bounds[1] + charData.bounds[3]) / 2 : 90;
                sg.setAttribute('transform', `translate(${offsetX}, 0) translate(${cx * 2}, 0) scale(-1, 1) rotate(180, ${cx}, ${cy})`);
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('class', 'stroke');
                path.setAttribute('d', contourD);
                sg.appendChild(path);
                this.zhGroup.appendChild(sg);
            });
        });
    }

    resetStrokes(g) {
        if (!g) return;
        g.querySelectorAll('.sg').forEach(sg => {
            sg.querySelectorAll('.stroke, .stroke-tip').forEach(el => {
                el.classList.remove('active', 'complete');
                el.style.strokeDashoffset = '';
                void el.offsetHeight;
            });
        });
    }

    async draw(lang, skipReset = false) {
        const g = lang === 'chinese' ? this.zhGroup : document.querySelector('[data-name="english"]');
        if (!g) return;
        const groups = Array.from(g.querySelectorAll('.sg'));
        if (!skipReset) this.resetStrokes(g);
        for (const sg of groups) {
            sg.querySelectorAll('.stroke, .stroke-tip').forEach(el => el.classList.add('active'));
            await this.wait(220);
        }
        groups.forEach(sg => sg.querySelectorAll('.stroke').forEach(el => el.classList.add('complete')));
    }

    swapDisplay() {
        if (this.lang === 'chinese') {
            this.lang = 'english';
            this.zhSvg.style.display = 'none';
            this.enSvg.style.display = 'block';
            this.label.textContent = 'ENGLISH';
        } else {
            this.lang = 'chinese';
            this.enSvg.style.display = 'none';
            this.zhSvg.style.display = 'block';
            this.label.textContent = '中文';
        }
    }

    async run() {
        await this.draw('chinese');
        await this.wait(2200);
        while (true) {
            const currentSvg = this.lang === 'chinese' ? this.zhSvg : this.enSvg;
            const nextSvg = this.lang === 'chinese' ? this.enSvg : this.zhSvg;
            const nextLang = this.lang === 'chinese' ? 'english' : 'chinese';
            await this.fadeTo(currentSvg, 0, 500);
            this.swapDisplay();
            nextSvg.style.opacity = '0';
            const nextG = nextLang === 'chinese' ? this.zhGroup : document.querySelector('[data-name="english"]');
            this.resetStrokes(nextG);
            await this.wait(20);
            await this.fadeTo(nextSvg, 1, 500);
            await this.draw(nextLang, true);
            await this.wait(2400);
        }
    }

    wait(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// GSAP 横向滚动初始化
function initGSAPScroll() {
    const hWrap = document.querySelector('.h-wrap');
    const hTrack = document.getElementById('hTrack');
    if (hWrap && hTrack && typeof gsap !== 'undefined' && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
        const getScroll = () => Math.max(0, hTrack.scrollWidth - window.innerWidth);
        gsap.to(hTrack, {
            x: () => -getScroll(),
            ease: 'none',
            scrollTrigger: {
                trigger: hWrap,
                start: 'top top',
                end: () => `+=${getScroll()}`,
                pin: true,
                scrub: 1,
                invalidateOnRefresh: true
            }
        });
    }
}

// 暴露全局初始化函数
window.initAnimations = function() {
    new LiquidGlassName().init();
    initGSAPScroll();
};