import os

cities = [
    # Active
    ("Istanbul", "İstanbul", "Yedi Tepeli Şehir", "Marmara", [41.0082, 28.9784], "marmara", "active"),
    ("Kocaeli", "Kocaeli", "Sanayinin Merkezi", "Marmara", [40.7654, 29.9408], "marmara", "active"),
    ("Sakarya", "Sakarya", "Doğanın Kalbi", "Marmara", [40.7560, 30.3784], "marmara", "active"),
    ("Izmir", "İzmir", "Ege'nin İncisi", "Ege", [38.4237, 27.1428], "ege", "active"),
    ("Balikesir", "Balıkesir", "Zeytin Kokulu Kent", "Ege", [39.6484, 27.8904], "ege", "active"),
    ("Samsun", "Samsun", "Karadeniz'in Kapısı", "Karadeniz", [41.2867, 36.3300], "karadeniz", "active"),
    ("Antalya", "Antalya", "Akdeniz'in İncisi", "Akdeniz", [36.8969, 30.7133], "akdeniz", "active"),

    # Remaining 74
    ("Adana", "Adana", "Torosların Eteğinde", "Akdeniz", [37.0000, 35.3213], "akdeniz", "coming_soon"),
    ("Adiyaman", "Adıyaman", "Nemrut Dağı Diyarı", "Güneydoğu", [37.7644, 38.2786], "guneydogu", "coming_soon"),
    ("Afyon", "Afyonkarahisar", "Termal Başkent", "Ege", [38.7507, 30.5567], "ege", "coming_soon"),
    ("Agri", "Ağrı", "Ağrı Dağı Eteği", "Doğu Anadolu", [39.7191, 43.0503], "dogu", "coming_soon"),
    ("Amasya", "Amasya", "Şehzadeler Şehri", "Karadeniz", [40.6499, 35.8353], "karadeniz", "coming_soon"),
    ("Ankara", "Ankara", "Başkent", "İç Anadolu", [39.9334, 32.8597], "icanadolu", "coming_soon"),
    ("Artvin", "Artvin", "Yeşilin Her Tonu", "Karadeniz", [41.1828, 41.8183], "karadeniz", "coming_soon"),
    ("Aydin", "Aydın", "Efe Şehri", "Ege", [37.8560, 27.8416], "ege", "coming_soon"),
    ("Bilecik", "Bilecik", "Kuruluşun Şehri", "Marmara", [40.1506, 29.9792], "marmara", "coming_soon"),
    ("Bingol", "Bingöl", "Yüzen Adalar", "Doğu Anadolu", [38.8854, 40.4980], "dogu", "coming_soon"),
    ("Bitlis", "Bitlis", "Tarihi Yapılar Kenti", "Doğu Anadolu", [38.4006, 42.1095], "dogu", "coming_soon"),
    ("Bolu", "Bolu", "Abant & Yedi Göller", "Karadeniz", [40.7358, 31.6061], "karadeniz", "coming_soon"),
    ("Burdur", "Burdur", "Salda Gölü Diyarı", "Akdeniz", [37.7203, 30.2903], "akdeniz", "coming_soon"),
    ("Bursa", "Bursa", "Yeşil Bursa", "Marmara", [40.1885, 29.0610], "marmara", "coming_soon"),
    ("Canakkale", "Çanakkale", "Tarihin Yazıldığı Yer", "Marmara", [40.1553, 26.4142], "marmara", "coming_soon"),
    ("Cankiri", "Çankırı", "Tuz Mağarası Kenti", "İç Anadolu", [40.6013, 33.6134], "icanadolu", "coming_soon"),
    ("Corum", "Çorum", "Hattuşaş Şehri", "Karadeniz", [40.5506, 34.9556], "karadeniz", "coming_soon"),
    ("Denizli", "Denizli", "Pamukkale Diyarı", "Ege", [37.7765, 29.0864], "ege", "coming_soon"),
    ("Diyarbakir", "Diyarbakır", "Tarihi Surlar Kenti", "Güneydoğu", [37.9144, 40.2306], "guneydogu", "coming_soon"),
    ("Edirne", "Edirne", "Serhat Şehri", "Marmara", [41.6772, 26.5557], "marmara", "coming_soon"),
    ("Elazig", "Elazığ", "Harput Diyarı", "Doğu Anadolu", [38.6810, 39.2264], "dogu", "coming_soon"),
    ("Erzincan", "Erzincan", "Munzur Eteğinde", "Doğu Anadolu", [39.7500, 39.5000], "dogu", "coming_soon"),
    ("Erzurum", "Erzurum", "Palandöken Diyarı", "Doğu Anadolu", [39.9043, 41.2679], "dogu", "coming_soon"),
    ("Eskisehir", "Eskişehir", "Kültür & Gençlik Kenti", "İç Anadolu", [39.7667, 30.5256], "icanadolu", "coming_soon"),
    ("Gaziantep", "Gaziantep", "Güneydoğunun İncisi", "Güneydoğu", [37.0662, 37.3833], "guneydogu", "coming_soon"),
    ("Giresun", "Giresun", "Fındığın Başkenti", "Karadeniz", [40.9128, 38.3895], "karadeniz", "coming_soon"),
    ("Gumushane", "Gümüşhane", "Karaca Mağarası Kenti", "Karadeniz", [40.4600, 39.4814], "karadeniz", "coming_soon"),
    ("Hakkari", "Hakkari", "Sümbül Dağı Eteği", "Doğu Anadolu", [37.5833, 43.7333], "dogu", "coming_soon"),
    ("Hatay", "Hatay", "Medeniyetler Şehri", "Akdeniz", [36.2000, 36.1667], "akdeniz", "coming_soon"),
    ("Isparta", "Isparta", "Gül & Lavanta Diyarı", "Akdeniz", [37.7648, 30.5566], "akdeniz", "coming_soon"),
    ("Mersin", "Mersin", "Akdeniz Liman Kenti", "Akdeniz", [36.8121, 34.6415], "akdeniz", "coming_soon"),
    ("Kars", "Kars", "Ani Harabeleri Kenti", "Doğu Anadolu", [40.6013, 43.0975], "dogu", "coming_soon"),
    ("Kastamonu", "Kastamonu", "Ilgaz Dağı Eteği", "Karadeniz", [41.3887, 33.7827], "karadeniz", "coming_soon"),
    ("Kayseri", "Kayseri", "Erciyes'in Gölgesinde", "İç Anadolu", [38.7312, 35.4787], "icanadolu", "coming_soon"),
    ("Kirklareli", "Kırklareli", "Trakya'nın Yeşili", "Marmara", [41.7333, 27.2167], "marmara", "coming_soon"),
    ("Kirsehir", "Kırşehir", "Ahiler Şehri", "İç Anadolu", [39.1425, 34.1709], "icanadolu", "coming_soon"),
    ("Konya", "Konya", "Huzur & Mevlana Şehri", "İç Anadolu", [37.8746, 32.4932], "icanadolu", "coming_soon"),
    ("Kutahya", "Kütahya", "Çini Şehri", "Ege", [39.4167, 29.9833], "ege", "coming_soon"),
    ("Malatya", "Malatya", "Kayısının Başkenti", "Doğu Anadolu", [38.3552, 38.3095], "dogu", "coming_soon"),
    ("Manisa", "Manisa", "Spil Dağı Eteği", "Ege", [38.6191, 27.4289], "ege", "coming_soon"),
    ("Kahramanmaras", "Kahramanmaraş", "Akdeniz'in Kapısı", "Akdeniz", [37.5858, 36.9371], "akdeniz", "coming_soon"),
    ("Mardin", "Mardin", "Tarihi Taş Konaklar", "Güneydoğu", [37.3212, 40.7245], "guneydogu", "coming_soon"),
    ("Bodrum", "Bodrum / Muğla", "Tatil Beldeleri", "Ege", [37.0344, 27.4305], "ege", "coming_soon"),
    ("Mus", "Muş", "Muş Ovası Kenti", "Doğu Anadolu", [38.7438, 41.5064], "dogu", "coming_soon"),
    ("Nevsehir", "Nevşehir", "Kapadokya Diyarı", "İç Anadolu", [38.6244, 34.7144], "icanadolu", "coming_soon"),
    ("Nigde", "Niğde", "Aladağlar Eteği", "İç Anadolu", [37.9667, 34.6833], "icanadolu", "coming_soon"),
    ("Ordu", "Ordu", "Boztepe Şehri", "Karadeniz", [40.9833, 37.8781], "karadeniz", "coming_soon"),
    ("Rize", "Rize", "Çayın Başkenti", "Karadeniz", [41.0201, 40.5234], "karadeniz", "coming_soon"),
    ("Siirt", "Siirt", "Veysel Karani Diyarı", "Güneydoğu", [37.9333, 41.9500], "guneydogu", "coming_soon"),
    ("Sinop", "Sinop", "Türkiye'nin Kuzey Ucu", "Karadeniz", [42.0231, 35.1531], "karadeniz", "coming_soon"),
    ("Sivas", "Sivas", "Selçuklu Kenti", "İç Anadolu", [39.7477, 37.0179], "icanadolu", "coming_soon"),
    ("Tekirdag", "Tekirdağ", "Marmara Kıyısı", "Marmara", [40.9833, 27.5167], "marmara", "coming_soon"),
    ("Tokat", "Tokat", "Ballıca Mağarası Diyarı", "Karadeniz", [40.3167, 36.5500], "karadeniz", "coming_soon"),
    ("Trabzon", "Trabzon", "Karadeniz'in Fırtınası", "Karadeniz", [41.0027, 39.7168], "karadeniz", "coming_soon"),
    ("Tunceli", "Tunceli", "Munzur Vadisi Kenti", "Doğu Anadolu", [39.1079, 39.5401], "dogu", "coming_soon"),
    ("Sanliurfa", "Şanlıurfa", "Göbeklitepe Şehri", "Güneydoğu", [37.1591, 38.7969], "guneydogu", "coming_soon"),
    ("Usak", "Uşak", "Kanyonlar Şehri", "Ege", [38.6823, 29.4082], "ege", "coming_soon"),
    ("Van", "Van", "Van Gölü Diyarı", "Doğu Anadolu", [38.5012, 43.3730], "dogu", "coming_soon"),
    ("Yozgat", "Yozgat", "Çamlık Milli Parkı", "İç Anadolu", [39.8181, 34.8147], "icanadolu", "coming_soon"),
    ("Zonguldak", "Zonguldak", "Emeğin Başkenti", "Karadeniz", [41.4564, 31.7987], "karadeniz", "coming_soon"),
    ("Aksaray", "Aksaray", "Ihlara Vadisi Diyarı", "İç Anadolu", [38.3687, 34.0370], "icanadolu", "coming_soon"),
    ("Bayburt", "Bayburt", "Çoruh Nehrinin Kenti", "Karadeniz", [40.2552, 40.2249], "karadeniz", "coming_soon"),
    ("Karaman", "Karaman", "Türkçenin Başkenti", "İç Anadolu", [37.1759, 33.2287], "icanadolu", "coming_soon"),
    ("Kirikkale", "Kırıkkale", "Kızılırmak Kenti", "İç Anadolu", [39.8453, 33.5153], "icanadolu", "coming_soon"),
    ("Batman", "Batman", "Hasankeyf Diyarı", "Güneydoğu", [37.8812, 41.1351], "guneydogu", "coming_soon"),
    ("Sirnak", "Şırnak", "Cudi Dağı Eteği", "Güneydoğu", [37.5164, 42.4611], "guneydogu", "coming_soon"),
    ("Bartin", "Bartın", "Amasra & Karadeniz", "Karadeniz", [41.6358, 32.3375], "karadeniz", "coming_soon"),
    ("Ardahan", "Ardahan", "Çıldır Gölü Diyarı", "Doğu Anadolu", [41.1105, 42.7022], "dogu", "coming_soon"),
    ("Igdir", "Iğdır", "Doğunun Yükselen Yıldızı", "Doğu Anadolu", [39.9167, 44.0333], "dogu", "coming_soon"),
    ("Yalova", "Yalova", "Termal Şehir", "Marmara", [40.6500, 29.2667], "marmara", "coming_soon"),
    ("Karabuk", "Karabük", "Safranbolu Diyarı", "Karadeniz", [41.2061, 32.6204], "karadeniz", "coming_soon"),
    ("Kilis", "Kilis", "Zeytin Diyarı", "Güneydoğu", [36.7161, 37.1150], "guneydogu", "coming_soon"),
    ("Osmaniye", "Osmaniye", "Fıstığın Başkenti", "Akdeniz", [37.0742, 36.2478], "akdeniz", "coming_soon"),
    ("Duzce", "Düzce", "Samandere Şelalesi Kenti", "Karadeniz", [40.8438, 31.1565], "karadeniz", "coming_soon")
]

print(f"Total Turkey Cities Count: {len(cities)}")

# 1. Generate state.js content
city_to_region_str = "export const CITY_TO_REGION = {\n"
city_names_tr_str = "export const CITY_NAMES_TR = {\n"
city_names_title_str = "export const CITY_NAMES_TR_TITLE = {\n"
translations_cities_str = "      "

for key, name, sub, m_label, coords, market, status in cities:
    city_to_region_str += f"  {key}: '{market}',\n"
    city_names_tr_str += f"  {key}: '{name.upper()}',\n"
    city_names_title_str += f"  {key}: '{name}',\n"

print("Generated mapping dictionaries!")
