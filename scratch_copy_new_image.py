import shutil, os

generated_img = r"C:\Users\balik\.gemini\antigravity\brain\f4dbad33-e9ee-4658-a59f-edb94f58e92b\soap_foam_bubbles_1786454407099.jpg"
target_img = r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\public\images\soap_foam_bubbles.png"

shutil.copyfile(generated_img, target_img)
print("Successfully replaced public/images/soap_foam_bubbles.png with the new RELAXAX image!")
