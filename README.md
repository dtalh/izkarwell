# izkarwell.

**Çalışan deneyimi ve modüler dijital iş platformu** — PWA pilotu.

[Uygulamayı aç](https://dtalh.github.io/izkarwell/) · [Sürüm notları](CHANGELOG.md) · [Ford pilot test kılavuzu](docs/ford-pilot-test.md)

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

## Ford Uygulamaları test pilotu
İki bağımsız uygulama teyidi, TEST müşteri adı, teslim tarihi, fotoğraf, operatör/inceleyici/admin rolleri, taslak devamı ve fotoğraflı dışa aktarım. SQL kurulumu ve rol ataması olmadan görünmez. Gerçek müşteri verisi kullanılmaz. Fotoğraflar cihazda optimize edilir ve özel Storage alanına yüklenir (fotoğraf başına 10 MB sınırı). Otomatik bağımsız şifreli yedekleme ve geri yükleme henüz tamamlanmadı.

## Güvenlik
Google girişi sağlık eşitlemesini kendiliğinden açmaz. İş ve kişisel sağlık verileri ayrı tutulur. Kurumsal kullanım öncesi şirket onayı, KVKK ve yurt dışı aktarımı değerlendirmesi, saklama/silme politikası, yetki ve geri yükleme testleri gereklidir. Yedekleri güvenli saklayın. Sağlık içeriği genel bilgilendirmedir.

## Yol haritası
Yönetim paneli, toplu bildirim, modül bazlı roller, ortak fotoğraf/dosya altyapısı, dinamik form ve checklist, raporlama. Toplu bildirim şeması ayrı geliştirme dalında; gönderim henüz yok. Müşteri ziyaretleri kapsam dışıdır. Yeni modüller ihtiyaca göre belirlenir.

## Test durumu
Kullanıcı Google giriş/eşitleme, iPhone ve PC test bildirimleri ve otomatik su hatırlatmalarının çalıştığını bildirdi. Ford pilotu için uçtan uca Supabase, cihaz, erişim ve geri yükleme testleri bekliyor.
