import os
import json
import time
import random
import re
import hashlib
import requests
import pandas as pd
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ---------- 配置 ----------
EXCEL_FILE = "b站关注列表.xlsx"
SHEET_NAME = "关注列表"
AVATAR_DIR = "avatars"
MAP_FILE = "avatar_map.json"

# ⚠️ 请替换为你的完整 Cookie 字符串
COOKIE = "buvid3=885B4EA1-3348-92AE-6685-88AF4CD2682016771infoc; b_nut=1774790316; _uuid=895510D4C-9810D-B375-DFA10-D76ED8F7C2E118501infoc; buvid_fp=3e8fd97cb30612369731b90e05adf72e; buvid4=C987A675-89E8-CEDC-D096-0CF745D7170270732-024010410-6XIQdzoQbEKCwuZHMN/I4A%3D%3D; rpdid=0zbfVGpdm4|uoWR76Pe|38f|3w1W6Q2K; theme-tip-show=SHOWED; theme-avatar-tip-show=SHOWED; LIVE_BUVID=AUTO3417751191316927; hit-dyn-v2=1; DedeUserID=35143572; DedeUserID__ckMd5=6fc1ed16220ad537; theme-switch-show=SHOWED; ogv_device_support_hdr=0; ogv_device_support_dolby=0; CURRENT_QUALITY=120; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzcwMzM5NzMsImlhdCI6MTc3Njc3NDcxMywicGx0IjotMX0.PUkm-Xl6JNbevL24yeGTiJgwJAl9-a_loRbbCED4IEs; bili_ticket_expires=1777033913; CURRENT_FNVAL=2000; SESSDATA=347a46f3%2C1792326778%2C83468%2A42CjB0OMKyknaXiKZhfrugoZLIeIagTYGXUVvIHV_qqdvKA3-TV_qDvIiokLEchZw0jDgSVnIzajZFcGNCZVdhTmd2U0VVZlp6NjVWcFYxLVJvM2lZemtMRWFDR19XMEV2eVl2c3ZWTnZpeDQzTzlLVmNIRmxYR240andZUTlIZjgwYldtRGlfd2F3IIEC; bili_jct=99aa4650544b25a779ca36434cb61ace; sid=4zrjemk9; bp_t_offset_35143572=1193731261651222528; PVID=1; home_feed_column=5; browser_resolution=1600-900; b_lsid=86CDE143_19DB035EF86"

os.makedirs(AVATAR_DIR, exist_ok=True)

# 读取 UID
df = pd.read_excel(EXCEL_FILE, sheet_name=SHEET_NAME)
uids = df["UID"].astype(str).unique().tolist()
print(f"共需处理 {len(uids)} 个 UID")

# 加载已有映射
avatar_map = {}
if os.path.exists(MAP_FILE):
    with open(MAP_FILE, "r", encoding="utf-8") as f:
        avatar_map = json.load(f)
    print(f"已加载现有映射 {len(avatar_map)} 条")

# 构建 Session
session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.bilibili.com/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cookie": COOKIE
})

retry_strategy = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("http://", adapter)
session.mount("https://", adapter)

# ---------- Cookie 有效性检测 ----------
def check_cookie():
    try:
        resp = session.get("https://api.bilibili.com/x/web-interface/nav", timeout=10)
        data = resp.json()
        if data.get("code") == 0:
            uname = data.get("data", {}).get("uname", "未知")
            print(f"✅ Cookie 有效，当前用户：{uname}")
            return True
        else:
            print(f"❌ Cookie 无效，返回码 {data.get('code')}")
            return False
    except Exception as e:
        print(f"❌ Cookie 检测异常：{e}")
        return False

if not check_cookie():
    exit()

# ---------- WBI 签名 ----------
def get_wbi_keys():
    try:
        resp = session.get("https://api.bilibili.com/x/web-interface/nav", timeout=10)
        data = resp.json()
        if data.get("code") == 0:
            wbi_img = data["data"]["wbi_img"]
            img_match = re.search(r'/([^/]+)\.png', wbi_img['img_url'])
            sub_match = re.search(r'/([^/]+)\.png', wbi_img['sub_url'])
            if img_match and sub_match:
                return img_match.group(1), sub_match.group(1)
    except:
        pass
    return None, None

def sign_wbi(params, img_key, sub_key):
    mix_key = (img_key + sub_key).encode()
    sorted_params = sorted(params.items())
    query = '&'.join(f"{k}={v}" for k, v in sorted_params)
    w_rid = hashlib.md5((query + mix_key.decode()).encode()).hexdigest()
    return w_rid

WBI_IMG_KEY, WBI_SUB_KEY = get_wbi_keys()
print(f"✅ WBI 密钥获取" if WBI_IMG_KEY else "⚠️ 未获取到 WBI 密钥，跳过 WBI 接口")

# ---------- 核心获取函数 ----------
def extract_face_from_html(html):
    """从 HTML 中提取头像 URL，返回 (url, source)"""
    # 1. og:image 元数据
    match = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', html)
    if match:
        url = match.group(1).replace("&amp;", "&")
        if url.startswith('//'): url = 'https:' + url
        if not url.endswith(('favicon.ico', '/favicon.ico')):
            return url, "og:image"

    # 2. 页面内嵌初始数据 (常见于 __INITIAL_STATE__)
    match = re.search(r'<script[^>]*>window\.__INITIAL_STATE__\s*=\s*({.+?});\s*</script>', html, re.DOTALL)
    if match:
        try:
            import json as jsonlib
            data = jsonlib.loads(match.group(1))
            face = data.get("userInfo", {}).get("face") or data.get("user", {}).get("face")
            if face and not face.endswith('favicon.ico'):
                return face, "INITIAL_STATE"
        except:
            pass

    # 3. 普通 JSON 字段匹配
    match = re.search(r'"face"\s*:\s*"([^"]+)"', html)
    if match:
        url = match.group(1).replace("\\u002F", "/")
        if url.startswith('//'): url = 'https:' + url
        if not url.endswith(('favicon.ico', '/favicon.ico')):
            return url, "JSON face"

    # 4. 尝试 apple-touch-icon (头像有时会出现在这里)
    match = re.search(r'<link[^>]+rel="apple-touch-icon"[^>]+href="([^"]+)"', html)
    if match:
        url = match.group(1)
        if url.startswith('//'): url = 'https:' + url
        return url, "apple-touch-icon"

    return None, None

def fetch_face_url(uid, retry_count=0):
    """获取头像 URL，失败时返回 None，并返回来源信息"""
    # 1. WBI 接口
    if WBI_IMG_KEY:
        params = {"mid": uid, "wts": str(int(time.time()))}
        w_rid = sign_wbi(params, WBI_IMG_KEY, WBI_SUB_KEY)
        params["w_rid"] = w_rid
        try:
            resp = session.get("https://api.bilibili.com/x/space/wbi/acc/info", params=params, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == 0:
                    face = data["data"].get("face")
                    if face and not face.endswith('favicon.ico'):
                        return face, "WBI"
                # 若返回码非0，记录但不退出，继续尝试其他方式
        except:
            pass

    # 2. 普通 API
    try:
        resp = session.get(f"https://api.bilibili.com/x/space/acc/info?mid={uid}", timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            code = data.get("code")
            if code == 0:
                face = data["data"].get("face")
                if face and not face.endswith('favicon.ico'):
                    return face, "API"
            elif code == -799 and retry_count < 3:
                # 频率限制，等待后重试
                wait = (retry_count + 1) * 3
                time.sleep(wait)
                return fetch_face_url(uid, retry_count + 1)
    except:
        pass

    # 3. 手机 API (限制通常更少)
    try:
        resp = session.get(f"https://app.bilibili.com/x/v2/space?mid={uid}", timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == 0:
                face = data["data"].get("face")
                if face:
                    return face, "APP API"
    except:
        pass

    # 4. HTML 解析
    try:
        resp = session.get(f"https://space.bilibili.com/{uid}", timeout=15)
        if resp.status_code == 200:
            url, source = extract_face_from_html(resp.text)
            if url:
                return url, f"HTML({source})"
    except:
        pass

    return None, "None"

def download_avatar(uid):
    if uid in avatar_map:
        return avatar_map[uid], "cached"

    url, source = fetch_face_url(uid)
    if not url:
        return None, source

    ext = os.path.splitext(url.split("?")[0])[-1]
    if not ext or ext.lower() not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        ext = ".jpg"
    filename = f"{uid}{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)

    try:
        img_resp = session.get(url, timeout=20)
        if img_resp.status_code == 200:
            with open(filepath, "wb") as f:
                f.write(img_resp.content)
            avatar_map[uid] = filename
            return filename, source
    except Exception as e:
        return None, f"download error: {e}"
    return None, "download failed"

# ---------- 主循环 ----------
failed_uids = []
total = len(uids)
base_delay = 2.0

for idx, uid in enumerate(uids):
    print(f"[{idx+1}/{total}] UID: {uid}")
    result, source = download_avatar(uid)
    if result:
        print(f"  ✅ 成功 ({source}) -> {result}")
    else:
        print(f"  ❌ 失败 ({source})")
        failed_uids.append(uid)
        # 遇到频率限制时延长全局延迟
        if "799" in source or "403" in source:
            base_delay = min(base_delay + 0.5, 8.0)

    # 动态随机延迟
    delay = random.uniform(base_delay * 0.8, base_delay * 1.5)
    time.sleep(delay)

    # 每20个保存一次进度
    if (idx + 1) % 20 == 0:
        with open(MAP_FILE, "w", encoding="utf-8") as f:
            json.dump(avatar_map, f, ensure_ascii=False, indent=2)
        print(f"--- 已保存进度 ({idx+1}/{total})，失败 {len(failed_uids)} 个 ---")

# 最终保存
with open(MAP_FILE, "w", encoding="utf-8") as f:
    json.dump(avatar_map, f, ensure_ascii=False, indent=2)

print(f"\n完成！成功 {len(avatar_map)} 个，失败 {len(failed_uids)} 个")
if failed_uids:
    print("失败 UID 列表:", failed_uids)