# izkarwell.

**Çalışan deneyimi ve modüler dijital iş platformu** — PWA pilotu.

[Uygulamayı aç](https://dtalh.github.io/izkarwell/) · [Yönetim merkezi](https://dtalh.github.io/izkarwell/admin/overview.html) · [Ford yönetimi](https://dtalh.github.io/izkarwell/admin/) · [Sürüm notları](CHANGELOG.md) · [Ford pilot test kılavuzu](docs/ford-pilot-test.md)

## Foundation Update — v2.0 pilot
- Mobil çalışma alanı: İş Merkezi, İyi Yaşam, Bildirimler, Profil; yetkiye göre modüller ve hızlı işlemler. Aktif Yaşam ve Uyku kaldırıldı.
- Yönetim merkezi: genel bakış, gerçek kayıt göstergeleri, ortak tema, personel/tarih/durum filtreleri, kayıtlı filtreler, sayfalama, XLSX personel özeti, ZIP ve tam ekran fotoğraf.
- Ford: benzer kayıt uyarısı (devam edilebilir), isteğe bağlı açıklama, düzenleme ve geçmiş, fotoğraf ön izleme/kırpma/yükleme ilerlemesi.
- Yeni SQL: `supabase/migrations/20261124_ford_enhancements.sql` — önceki Ford pilot/admin/report/platform kurulumları sonrası çalıştırılır. Mevcut kayıt/fotoğraf silmez; yeni alanlar ve yetkili fonksiyonlar ekler. Eski arayüzle uyumlu; SQL olmadan yeni düzenleme ve mükerrer kontrolü açılmaz.
- Otomatik testler: [regression workflow](.github/workflows/regression.yml), sentetik tarayıcı testleri ve statik kontroller. Gerçek OAuth, Supabase RLS, fiziksel iPhone, push ve geri yükleme ayrıca doğrulanmalıdır.
- Geri dönüş ve ertelenen işler: [ROADMAP.md](ROADMAP.md).

## Mevcut özellikler
- Dumansız Yaşam: sigara ve elektronik sigara takibi, tasarruf, genel sağlık bilgileri, kriz sayacı ve hedefler.
- Su Tüketimi: günlük hedef, hızlı kayıt ve 7 günlük grafik.
- Google OAuth, isteğe bağlı bulut eşitleme, ayrı yerel ve hesap kayıtları.
- iPhone ve PC Web Push, cihaz bazlı otomatik su hatırlatmaları.

## Mimari
GitHub Pages statik PWA; Supabase Auth, PostgreSQL, RLS, özel Storage, Edge Functions, Cron ve Vault.

| Dosya | İşlev |
|---|---|
| index.html / style.css | Ortak arayüz |
| smoking.js / water.js | İyi yaşam modülleri |
| cloud-namespace.js / cloud-core.js / cloud-auth.js | Hesap ayrımı, eşitleme ve kimlik doğrulama |
| notifications.js / sw.js | Bildirimler ve PWA |
| ford-pilot.js | Yetkili test modülü, fotoğraf sıkıştırma ve kayıt takibi |
| supabase/migrations/ | Veritabanı kurulumu |
| supabase/functions/izkarwell-push/index.ts | Bildirim servisi |
| supabase/setup/ | Cron kurulumu |

## Dağıtım
GitHub Pages: main / root. iPhone: Safari → Paylaş → Ana Ekrana Ekle. PC: HTTPS adresini aç. Yeni sürüm sonrası uygulamayı yeniden aç. Supabase SQL ve Edge Function güncellemeleri ayrıca yönetim panelinde uygulanır. VAPID private key ve servis anahtarlarını repoya koymayın.

## Masaüstü yönetim portalı
`admin/` aynı Google oturumunu kullanır. Ford pilot reviewer/admin yetkisiyle arama, tarih/durum filtreleri, kayıt bazlı oranlar, fotoğraf ve gerçek XLSX raporu, kayıt oluşturan üye bilgisi ve JPEG indirme sunar. Admin çöp kutusuna taşıyabilir ve geri alabilir. Kurulum: `supabase/migrations/20261124_ford_admin.sql` (Ford pilot SQL sonrasında), ardından `supabase/migrations/20261124_ford_report.sql`. Fotoğraflar arşivde korunur; kalıcı silme henüz yok. Toplu bildirim henüz tamamlanmadı. Genel rol yönetimi aşağıda açıklanmıştır.

## Ford Uygulamaları test pilotu
İki bağımsız uygulama teyidi, TEST müşteri adı, teslim tarihi, fotoğraf, operatör/inceleyici/admin rolleri, taslak devamı ve fotoğraflı dışa aktarım. SQL kurulumu ve rol ataması olmadan görünmez. Gerçek müşteri verisi kullanılmaz. Fotoğraflar cihazda optimize edilir ve özel Storage alanına yüklenir (fotoğraf başına 10 MB sınırı). Otomatik bağımsız şifreli yedekleme ve geri yükleme henüz tamamlanmadı.

## Güvenlik
Google girişi sağlık eşitlemesini kendiliğinden açmaz. İş ve kişisel sağlık verileri ayrı tutulur. Kurumsal kullanım öncesi şirket onayı, KVKK ve yurt dışı aktarımı değerlendirmesi, saklama/silme politikası, yetki ve geri yükleme testleri gereklidir. Yedekleri güvenli saklayın. Sağlık içeriği genel bilgilendirmedir.

## Yol haritası
Yönetim paneli, toplu bildirim, modül bazlı roller, ortak fotoğraf/dosya altyapısı, dinamik form ve checklist, raporlama. Toplu bildirim şeması ayrı geliştirme dalında; gönderim henüz yok. Müşteri ziyaretleri kapsam dışıdır. Yeni modüller ihtiyaca göre belirlenir.

## Test durumu
Kullanıcı Google giriş/eşitleme, iPhone ve PC test bildirimleri ve otomatik su hatırlatmalarının çalıştığını bildirdi. Ford pilotu için uçtan uca Supabase, cihaz, erişim ve geri yükleme testleri bekliyor.

## Kullanıcı ve Yetki Yönetimi (Admin v1.2)
`admin/users.html`: yalnızca açıkça tanımlanmış genel sistem yöneticileri için kullanıcı arama, modül rolü atama/kaldırma ve son 100 işlem geçmişi. `20261124_platform_users.sql` kurulumu ve SQL Editor üzerinden ilk genel yönetici UID ataması gerekir. Modül yöneticiliği genel yönetici yetkisi vermez. Yeni modüller kayıt defterine eklenebilir; modülün kendi RLS kuralları ayrıca gerekir. Yetki kaldırma kayıtları/fotoğrafları silmez. Sağlık verileri sorgulanmaz. Canlı rol ve yetkisiz erişim testi bekliyor.
