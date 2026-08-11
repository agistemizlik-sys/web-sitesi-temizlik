import os

files_to_update = [
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\index.html",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\src\js\translations.js",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\src\js\state.js",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\src\main.js",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\src\style.css",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\functions\_middleware.js",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\functions\api\conversion.js",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\functions\api\leads.js",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\public\sitemap.xml",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\public\robots.txt",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\public\site.webmanifest",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\HANDOFF.md"
]

for file_path in files_to_update:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace occurrences safely
        new_content = content.replace("acleanserwis.com", "relaxaxserwis.com")
        new_content = new_content.replace("acleanserwis", "relaxaxserwis")
        new_content = new_content.replace("info@aclean.com", "info@relaxax.com")
        new_content = new_content.replace("Aclean", "RELAXAX")
        new_content = new_content.replace("ACLEAN", "RELAXAX")
        new_content = new_content.replace("aclean", "relaxax")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")
