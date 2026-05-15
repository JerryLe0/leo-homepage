// 音乐播放器模块
(function() {
    // 歌单配置（请将 mp3 文件放在项目根目录的 music/ 文件夹下）
    const playlist = [
        { name: "Anther", file: "music/Blue Wednesday - Anther.mp3" },
        { name: "past 3am", file: "music/J'san,Lofi Girl - past 3am.mp3" },
        { name: "Honeycomb", file: "music/Lazlow - Honeycomb.mp3" },
        { name: "blue skies", file: "music/No Spirit,marsquake - blue skies.mp3" },
        { name: "stick around", file: "music/Towerz,Quist,Lofi Girl - stick around.mp3" },
        { name: "太空漫步 Space Walk", file: "music/HOYO-MiX - 太空漫步 Space Walk.mp3" },
        { name: "60%的日常·悠闲", file: "music/三Z-STUDIO,HOYO-MiX - 日常·悠闲.mp3" },
        { name: "60%的遐想·静谧", file: "music/三Z-STUDIO,HOYO-MiX - 遐想·静谧.mp3" }
    ];

    let currentIndex = 0;
    let isPlaying = false;
    let audio = null;

    const disc = document.getElementById('vinylDisc');
    const playIcon = document.querySelector('.play-icon');
    const prevBtn = document.querySelector('.music-btn.prev');
    const nextBtn = document.querySelector('.music-btn.next');
    const discContainer = document.querySelector('.disc-container');

    let progressTip = null;

    function createProgressTip() {
        const tip = document.createElement('div');
        tip.className = 'song-progress-tip';
        discContainer.appendChild(tip);
        return tip;
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2,'0')}`;
    }

    function updateProgressTip() {
        if (!progressTip) progressTip = createProgressTip();
        if (!audio) return;
        const current = audio.currentTime || 0;
        const duration = audio.duration || 0;
        progressTip.textContent = `${playlist[currentIndex].name}  |  ${formatTime(current)} / ${formatTime(duration)}`;
    }

    function initAudio() {
        if (audio) {
            audio.pause();
            audio = null;
        }
        audio = new Audio(playlist[currentIndex].file);
        audio.addEventListener('ended', nextSong);
        audio.addEventListener('timeupdate', updateProgressTip);
        audio.addEventListener('loadedmetadata', updateProgressTip);
        audio.load();
    }

    function playCurrent() {
        if (!audio) initAudio();
        audio.play().catch(e => console.warn("播放失败:", e));
        isPlaying = true;
        disc.classList.add('playing');
        if (playIcon) 
            playIcon.textContent = '❙❙';
    }

    function pauseCurrent() {
        if (audio) audio.pause();
        isPlaying = false;
        disc.classList.remove('playing');
        if (playIcon) 
            playIcon.textContent = '⯈';
    }

    function togglePlay() {
        if (isPlaying) {
            pauseCurrent();
        } else {
            playCurrent();
        }
    }

    function nextSong() {
        currentIndex = (currentIndex + 1) % playlist.length;
        changeSong();
    }

    function prevSong() {
        currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        changeSong();
    }

    function changeSong() {
        const wasPlaying = isPlaying;
        if (wasPlaying) pauseCurrent();
        initAudio();
        updateProgressTip();
        if (wasPlaying) playCurrent();
    }

    function bindEvents() {
        if (discContainer) discContainer.addEventListener('click', togglePlay);
        if (prevBtn) prevBtn.addEventListener('click', prevSong);
        if (nextBtn) nextBtn.addEventListener('click', nextSong);
    }

    window.addEventListener('beforeunload', () => {
        if (audio) audio.pause();
    });

    function init() {
        if (!discContainer) return;
        initAudio();
        bindEvents();
        createProgressTip();
        updateProgressTip();
        if (playIcon) playIcon.textContent = '⯈';  // 初始显示播放符号
        // 默认不自动播放
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();