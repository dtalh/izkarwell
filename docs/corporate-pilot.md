# v2.1 kurumsal pilot hazırlığı — kabul ve yayın kontrolü

**Gerçek müşteri verisi kapalı kalır.** Bu dosya gerçek giriş açma talimatı değildir.

1. Önce önceki Ford pilot, admin, report, platform users ve enhancements migration'larının canlı projede eksiksiz çalıştığını doğrula.
2. Kaynak geri dönüş noktası: backup/pre-v2.1-2026-11-25. Canlı DB ve Storage bağımsız yedeği değildir.
3. `supabase/migrations/20261125_ford_corporate_preparation.sql` transaction içinde eklemeli alan, settings tablosu, sunucu gate trigger, RPC ve özel Storage politikalarını ekler; mevcut kayıtları veya fotoğrafları silmez. Mevcut kayıtlar test olarak sınıflandırılır. Eski TEST-prefix constraint kaldırılır fakat gate kapalıyken TEST dışı isimlere sunucu izin vermez. Test/gerçek türü isim ön ekinden sunucuda türetilir; test etiketi gerçek kişisel veri kullanma izni vermez. Kayıt türü sonradan değişmez. Migration tekrar çalıştırılırsa giriş tekrar kapanır.
4. SQL Editor yöneticisi ile aşağıdaki yalnızca okuma sorgusunu çalıştır:
```sql
select real_entry_enabled from public.ford_corporate_settings where singleton;
select is_test, count(*) from public.ford_pilot_records group by is_test;
select public, file_size_limit from storage.buckets where id='ford-pilot-private';
```
İlk sonuç false, mevcut örnek kayıtların tümü test, bucket public false olmalıdır. Gerçek müşteri veri girişi açma komutu bu sürümün kapsamı değildir.
5. CI statik ve tarayıcı testleri tamamlanmalı. Sentetik testler gerçek PostgreSQL/RLS doğrulamaz.
6. Gerçek Supabase üzerinde sadece sentetik kayıtlarla, iki farklı hesap ve oturumsuz erişim kullanarak: operator kendi kayıtları; başka operator kayıtlarına ve fotoğraflarına erişim reddi; reviewer okuma/rapor; admin arşiv/düzenleme; yetki iptali sonrası yeni istek ve indirme reddi; TEST dışı kayıt isteğinin RPC ve eski istemcilerde reddi; private bucket ve test/gerçek rapor ayrımı; iki cihaz revizyon çakışması; iPhone fotoğraf yükle/düzenle ve iptal. Test ortamında gerçek isim veya fotoğraf kullanma.
7. Ayrı kurumsal aktivasyon kararı: şirket onayı, veri sorumlusu/hukuki dayanak ve aydınlatma, yurtdışı aktarımı, saklama/imha, şirket hesap sahipliği/hosting, yönetici güvenliği ve MFA, dosya içerik doğrulaması, bağımsız şifreli veritabanı + Storage yedeği ve geri yükleme testi, cihaz/izin testleri. Bu maddeler bu PR ile tamamlanmış değildir.
8. Geri dönüş: eski v2.0 kaynakları yeni commit ile yayınla; migration'ı tersine çevirmek için tablo/kolon veya kayıt silme. Giriş kapalı kalsın. Eğer gelecekte gerçek kayıtlar oluşturulduysa v2.0 raporları bunları testten ayırmaz; o durumda eski arayüze dönmek yerine uyumlu düzeltme gerekir.

Kullanıcı yönetimi: admin/users.html genel sistem yöneticilerine açık; modül yetkisi ver/kaldır ve geçmiş. Genel sistem yöneticisi ataması ayrı SQL işlemi; mobil yönetim erişimi profil bağlantısı ve telefon dostu kullanıcı/rol geçmişi görünümüyle dahildir.
