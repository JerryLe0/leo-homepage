# Jerry Leo 个人主页

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue)](https://JerryLe0.github.io/leo-homepage/)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?logo=chartdotjs&logoColor=white)

> 一个集**个人简历**与**B站兴趣分析**于一体的交互式主页，通过可交互的可视化图表动态展示我的关注偏好，并支持钻取查看二级分类，通过实打实的数据探索我是一个怎么样的人。

## 🚀 在线访问

项目已部署在 GitHub Pages，点击下方链接体验：

[https://JerryLe0.github.io/leo-homepage/](https://JerryLe0.github.io/leo-homepage/)

## ✨ 功能特性

- **液态玻璃姓名动画**：中英文姓名带有手写描边特效，自动轮播。
- **教育背景与经历**：硕士/学士卡片附带校徽背景，展示技能标签。
- **音乐播放器**：位于导航栏左侧，支持播放/暂停、上一首/下一首。黑胶唱片在播放时旋转，中央显示 ⏸ / ⯈ 图标，悬停时显示歌曲信息，唱片上刻有弧形“JERRY LEO”文字（与唱片同步旋转）。
- **照片墙**：横向滚动展示个人生活、项目、毕业照片（3:2 比例圆角卡片），使用 GSAP 实现滚动视差效果。
- **核心理念滚动视差**：采用原生滚动驱动，卡片水平移动，城市背景与卡车前景以不同速率平移，营造空间穿行感。
- **B站关注数据分析**：
  - 按年份/季度统计关注的一级分类分布（环形图 + 自定义图例）
  - **钻取功能**：点击环形图任一扇形，展示其下的二级分类分布
  - 返回按钮可回到顶层视图
  - 动态生成洞察文案，主导兴趣颜色与扇形颜色一致
  - 旋转光点跟随扇形颜色变化，增强交互趣味
- **兴趣卡片预览**：
  - 知识、音乐、科技、游戏、生活等类别 UP 主预览（头像 + 关注时间）
  - 点击 UP 主直接跳转 B 站空间
  - “查看更多”按钮（示意，完整功能待扩展）
- **追番列表**：独立页面 `bangumi.html`，支持搜索、风格筛选、分页，展示番剧信息及本地封面。

## 📊 数据说明

项目使用以下 JSON 数据文件（均位于 `data/` 目录）：

| 文件 | 说明 |
|------|------|
| `bilibili_following_detailed.json` | B 站关注 UP 主详细列表（包含 name, uid, follow_time, tags） |
| `bilibili_categories_aggregated.json` | 按分类聚合后的 UP 主数据（用于兴趣卡片预览） |
| `avatar_map.json` | UP 主 uid 到本地头像图片的映射 |
| `bangumi_data.json` | 追番数据（标题、封面、简介、更新集数、开播日期、风格标签） |
| `font-paths-fzyansj.json` | 中文姓名 SVG 笔画路径数据 |

> 头像图片位于 `avatars/`，追番封面位于 `cover_images/`，校徽及音乐相关图片位于 `images/`。

## 🎵 音乐文件

播放器使用以下 MP3 文件（位于 `music/` 目录）：
- Blue Wednesday - Anther.mp3
- J'san,Lofi Girl - past 3am.mp3
- Lazlow - Honeycomb.mp3
- No Spirit,marsquake - blue skies.mp3
- Towerz,Quist,Lofi Girl - stick around.mp3
- HOYO-MiX - 太空漫步 Space Walk.mp3
- 三Z-STUDIO,HOYO-MiX - 60%的日常·悠闲.mp3
- 三Z-STUDIO,HOYO-MiX - 60%的遐想·静谧.mp3

> 请确保文件名称与上述完全一致，并放入 `music/` 文件夹。

## 🛠️ 本地运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/JerryLe0/leo-homepage.git
   cd leo-homepage

2. **启动 HTTP 服务器**
   # 方法一：Python 3
    python -m http.server 8080
   # 方法二：使用 VS Code Live Server 插件
   
3. **访问页面**
   打开浏览器访问 http://localhost:8080

## 🛠️ 技术栈
1. **前端**
- HTML5, CSS3, JavaScript (ES6+)

2. **可视化**
- Chart.js（环形图）
   
3. **动画**
- GSAP + ScrollTrigger（横向滚动）、自定义 requestAnimationFrame（旋转光点、唱片旋转）

4. **字体图标**
- Font Awesome 6

5. **版本**
- Git + GitHub
   
## 📂 项目结构  
├── index.html               # 主页（简历 + 分析 + 音乐播放器 + 照片墙）
├── bangumi.html             # 追番列表页
├── css/
│   └── style.css            # 全部样式
├── js/
│   ├── main.js              # 入口：初始化动画与数据加载
│   ├── animations.js        # 液态姓名 + GSAP 横向滚动 + 核心理念滚动视差
│   ├── chart.js             # 环形图构建、钻取、旋转光点、洞察文案
│   ├── data-loader.js       # 加载所有 JSON 数据
│   └── music-player.js      # 音乐播放器逻辑
├── data/                    # 静态数据文件
├── images/                  # 校徽、城市剪影、卡车图标等
├── avatars/                 # UP 主头像
├── cover_images/            # 追番封面
└── music/                   # 音乐文件（MP3）

## 🔧 未来计划
- 添加“更多”分类的完整列表页面

- 优化移动端触摸交互

- 接入 B 站 API 自动更新关注数据

- 增加深色/浅色主题切换


## 📄 许可证
- 本项目仅供个人展示与学习，所有数据来源于个人 B 站账号，请勿用于商业用途。

## 📧 联系

- 邮箱：9318299@qq.com

⭐ 如果觉得这个项目有意思，欢迎点个 Star！