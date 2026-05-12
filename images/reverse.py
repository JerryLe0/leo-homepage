import cv2
import numpy as np

def green_to_white(image_path, output_path, lower_green=None, upper_green=None):
    """
    将图像中的绿色区域转换为白色。
    
    参数:
        image_path: 输入图像路径（支持 PNG、JPG 等格式）
        output_path: 输出图像路径（推荐使用 .png 以保留透明度）
        lower_green: HSV 中绿色下限 (H, S, V)，默认针对中山大学校徽的深绿色
        upper_green: HSV 中绿色上限 (H, S, V)
    """
    # 默认绿色范围（HSV 色彩空间，OpenCV 中 H 范围 0~180）
    # 中山大学校徽绿色接近 #004529，对应 H~40~80，S~50~255，V~50~255
    if lower_green is None:
        lower_green = (40, 50, 50)
    if upper_green is None:
        upper_green = (80, 255, 255)
    
    # 读取图像（保留 alpha 通道，若存在）
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise FileNotFoundError(f"无法读取图像: {image_path}")
    
    # 判断是否有透明度通道
    has_alpha = img.shape[2] == 4
    if has_alpha:
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
    else:
        bgr = img
        alpha = None
    
    # 转换为 HSV 色彩空间
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    
    # 创建绿色掩码
    mask = cv2.inRange(hsv, lower_green, upper_green)
    
    # 可选：对掩码进行轻微膨胀/腐蚀，使边缘过渡更自然（注释掉，按需启用）
    # kernel = np.ones((3,3), np.uint8)
    # mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    # 将掩码区域替换为白色 (BGR 格式下白色为 255,255,255)
    bgr[mask > 0] = [255, 255, 255]
    
    # 合并 alpha 通道
    if has_alpha:
        result = cv2.merge([bgr, alpha])
    else:
        result = bgr
    
    # 保存结果
    cv2.imwrite(output_path, result)
    print(f"处理完成，结果已保存至: {output_path}")

# 使用示例
if __name__ == "__main__":
    # 请将 input.png 替换为你的校徽图片路径
    input_file = "./images/sysu-logo.png"
    output_file = "./images/sysu-logo-white.png"
    
    # 若绿色范围需要微调，可尝试以下调整：
    # - 如果部分绿色未改变，扩大 H 范围（如 35~85）
    # - 如果误改了其他颜色，缩小 H 范围或提高 S 下限
    # custom_lower = (35, 40, 40)
    # custom_upper = (85, 255, 255)
    # green_to_white(input_file, output_file, custom_lower, custom_upper)
    
    green_to_white(input_file, output_file)