# Sürüm notları

## Yönetim portalı v1.2 — Kullanıcı ve Yetki Yönetimi
- Genel sistem yöneticisi ile modül yöneticisi ayrımı; ilk genel yönetici açık SQL atamasıyla tanımlanır.
- Kayıtlı üyeleri ad/e-posta ile arama ve 50 kişilik sayfalama.
- Modül kayıt defteri ve operatör/inceleyici/modül yöneticisi/erişim yok seçenekleri.
- Sunucu tarafı yetki doğrulaması, değişiklik geçmişi (son 100 işlem), önceki/yeni rol.
- Sağlık verilerine erişim eklenmez; yetki kaldırma kayıtları ve fotoğrafları silmez.
- SQL kurulumu, ilk admin ataması ve iki hesaplı canlı test gerekir.

## Yönetim portalı v1.1 — Excel raporu ve fotoğraf indirme
- Kayıt oluşturan üyenin mevcut hesap adı ve e-postası; eski kayıtlar da created_by üzerinden eşleştirilir.
- Yalnızca Ford pilot reviewer/admin ve görünür kayıtlarla sınırlı kimlik sorgusu.
- Filtrelenmiş kayıtların XLSX raporu: Kayıtlar ve Özet sayfaları; ön izleme ve ayrı indirme düğmesi.
- Her fotoğraf için doğrudan JPEG indir ve fotoğraf ön izlemesinde indirme düğmesi.
- `20261124_ford_report.sql` kurulumu gerekir. Fotoğraflar Excel içine gömülmez. Gerçek Excel ve erişim testi bekliyor.

## Ford pilot — masaüstü yönetim portalı
- Ayrı `/admin/` arayüzü, ortak Google oturumu, reviewer/admin erişimi.
- Türkçe isim arama, teslim tarihi ve kurulum durumu filtreleri, sayfalama ve filtreli CSV.
- Tamamlanmış kayıtlar üzerinden oranlar ve özel fotoğraf görüntüleme.
- Admin için mobilde ve portalda geri alınabilir silme, çöp kutusu ve sunucu işlem kaydı.
- Yeni SQL kurulumu ve canlı yetki/işlem testleri gerekir. Kalıcı silme yok; mevcut yükleme algoritması korunur.

## Ford Uygulamaları — test pilotu (1.3 sonrası)
- Ford Hesabım ve Ford Uygulaması ayrı teyit, TEST müşteri adı, teslim tarihi.
- I-Deal e-posta eşleşmesi bilgilendirmesi.
- Fotoğraf başına 10 MB giriş ve depolama sınırı; mevcut cihaz içi JPEG optimizasyonu korunur; özel Storage.
- Operatör, inceleyici, admin rolleri; kendi veya tüm pilot kayıtları.
- Taslak ve tamamlanmış kayıt ayrımı; eksik yüklemeye devam.
- Tamamlanmış test kayıtları ve fotoğrafların JSON dışa aktarımı, SHA-256 özetleri.
- SQL ve rol ataması gerekir. Uçtan uca doğrulama, otomatik yedek ve geri yükleme bekliyor.

## v1.4 — ayrı geliştirme dalı, canlı değil
- Yönetim paneli ve toplu bildirim planı.
- Bildirim yöneticisi ve duyuru tercihi SQL şeması. Gönderim ve arayüz tamamlanmadı.

## v1.3.0 — otomatik su hatırlatmaları
- Cihaz bazlı tercih, sıklık ve saat aralığı; Türkiye saati.
- Beş dakikalık Cron kontrolü, Vault kimlik doğrulaması, tekrar gönderimi engelleyen slot kontrolü.
- Sağlık kayıtları okunmadan nötr bildirim.
- Kullanıcı otomatik hatırlatmayı doğruladı. Su hedefine göre durdurma henüz yok.

## v1.2.1 — bildirim iyileştirmeleri
- Cihaz içi test, bağlantı yenileme, izin ve hata bilgileri.
- iOS izin akışı, service worker sürüm kontrolü.
- VAPID biçim doğrulaması ve modern Supabase secret key desteği.
- Kullanıcı iPhone ve PC gerçek test bildirimlerini doğruladı.

## v1.2.0 — Web Push
- Oturum doğrulamalı cihaz kaydı, test ve devre dışı bırakma.
- Özel push_devices tablosu, test cooldown ve abonelik kontrolü.

## v1.1 — hesap ve eşitleme
- Google OAuth, isteğe bağlı bulut senkronizasyonu.
- Misafir ve hesap kayıtlarının ayrılması, olay bazlı eşitleme.
- Gizlilik/şartlar, sürümlü PWA önbelleği.
- Kullanıcı giriş ve eşitlemeyi doğruladı.

## v1.0.0 — ilk PWA
- Dumansız Yaşam, sağlık zaman çizelgesi, tasarruf, kriz sayacı ve ödül.
- Su Tüketimi, hedef ve haftalık görünüm.
- Yerel saklama, JSON yedek ve cihaz aktarımı, mobil/masaüstü arayüz.
