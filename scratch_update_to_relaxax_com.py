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
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\public\404.html",
    r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\HANDOFF.md"
]

for file_path in files_to_update:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace occurrences safely
        new_content = content.replace("https://acleanserwis.com", "https://relaxax.com")
        new_content = new_content.replace("https://www.acleanserwis.com", "https://www.relaxax.com")
        new_content = new_content.replace("https://relaxaxserwis.com", "https://relaxax.com")
        new_content = new_content.replace("https://www.relaxaxserwis.com", "https://www.relaxax.com")
        new_content = new_content.replace("acleanserwis.com", "relaxax.com")
        new_content = new_content.replace("relaxaxserwis.com", "relaxax.com")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")
