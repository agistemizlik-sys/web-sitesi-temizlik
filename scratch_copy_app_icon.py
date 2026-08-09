import shutil
import os

src_icon = r"C:\Users\balik\.gemini\antigravity\brain\f4dbad33-e9ee-4658-a59f-edb94f58e92b\mobile_app_icon_1786235129224.jpg"
dst_icon = r"c:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\mobile-app\assets\icon.png"

if os.path.exists(src_icon):
    shutil.copy(src_icon, dst_icon)
    print("App icon copied successfully!")
else:
    print("Source image not found.")
