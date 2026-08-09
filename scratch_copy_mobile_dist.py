import shutil
import os

src_dir = r"c:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\mobile-app\dist"
dst_dir = r"c:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\public\mobile"

if os.path.exists(dst_dir):
    shutil.rmtree(dst_dir)

shutil.copytree(src_dir, dst_dir)
print("Mobile app web build copied to public/mobile successfully!")
