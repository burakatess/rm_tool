/**
 * Yerleşik örnek veri — 5 Kasım 2026 gözden geçirmesinde paylaşılan BGD risk ve kontrol matrisi.
 * Uygulama ilk açılışta ve "Yerleşik örnek veriye dön" seçildiğinde bu veriyi kullanır.
 */
import type { Control, Dataset, DimValue, Risk } from "./types";
import { legacyPV } from "./constants";

const SOC = "Siber Güvenlik Operasyon Merkezi (SOC) Yönetimi";
const BGYS = "Bilgi Güvenliği Yönetim Sistemi";
const KVK = "Kişisel Veri Yönetimi";

/** [id, süreç, alt süreç, tanım, G, B, E, O, [kayıtlı etki, bütünleşik puan, bütünleşik skor, kalıntı skor]] */
type RawRisk = [string, string, string, string, DimValue, DimValue, DimValue, number, [number, number, number, number]];
/** [id, statü A/I, risk, tanım, tür O/B/M, işlev O/D/T, kayıt S/E/N, denetim 0-3, raporlama 0-3, sıklık, doküman?] */
type RawControl = [string, "A" | "I", string, string, string, string, string, number, number, string, number?];

const RISKS: RawRisk[] = [
["RE-1",SOC,"SOC Uygulamalarının Kurulumu ve Bakımı","Güvenlik loglarının tutulduğu uygulamada yaşanabilecek donanım ve yazılım sorunları nedeniyle log kaybı","N/A",5,4,4,[5,7.90,3,2]],
["RE-2",SOC,"SOC Uygulamalarının Kurulumu ve Bakımı","Güvenlik loglarının tutulduğu uygulamada yaşanabilecek konfigürasyon hatası nedeniyle log kaybı","N/A",5,4,4,[5,7.90,3,2]],
["RE-3",SOC,"SOC Uygulamalarının Kurulumu ve Bakımı","Merkezi log yönetimi sisteminde tutulan log kayıtlarının değişmezliğinin kaybedilmesi nedeni ile log kaybı veya loglarda tutarsızlık",2,5,4,3,[4,8.50,3,1]],
["RE-4",SOC,"SOC Uygulamalarının Kurulumu ve Bakımı","Siber güvenlik uygulamalarının kullanıcı haklarının kötüye kullanımı nedeniyle yetkisiz erişim ya da veri sızıntısı",4,4,2,5,[4,8.25,3,2]],
["RE-5",SOC,"Korelasyon Kurallarının Yönetilmesi","Güncel siber tehditlere göre korelasyon kurallarının hatalı/eksik güncellenmesi sonucunda veri gizliliğini ve bütünlüğünü bozacak olayların geç tespit edilmesi",4,3,3,4,[4,5.45,2,2]],
["RE-6",SOC,"İzleme","Log Yönetimi sürecinin etkin işletilememesi nedeniyle kritik olayların gözden kaçırılması",4,5,5,5,[5,7.05,2,3]],
["RE-7",SOC,"Siber Güvenlik Olaylarına Müdahale","Alarmların ve bildirimlerin etkin takip edilememesi nedeniyle siber saldırılar yaşanması",4,5,5,5,[5,10.35,3,2]],
["RE-8",BGYS,"BGYS Metodolojisinin Oluşturulması","Çalışanların bilgi güvenliği farkındalığının yeterli olmaması nedeniyle iş kesintisi veya veri sızıntısı",4,3,4,4,[4,6.90,2,2]],
["RE-9",BGYS,"BGYS Metodolojisinin Oluşturulması","Parola Yönetim Politikasının etkin işletilememesi nedeniyle yetkisiz erişim",4,3,2,3,[3,4.90,1,2]],
["RE-10",BGYS,"BGYS Metodolojisinin Oluşturulması","Erişim yönetimi ve yetkilendirme sürecinin etkin işletilememesi nedeniyle yetkisiz erişim, veri/bilgi ifşası ve iş kesintisi",4,3,2,4,[3,6.15,2,2]],
["RE-11",BGYS,"BGYS Metodolojisinin Oluşturulması","BGYS'nin etkin işletilmemesi sonucunda düzenlemelere uyumsuzluk ya da hatalı raporlama","N/A",4,"N/A",3,[4,5.20,2,2]],
["RE-12",BGYS,"BGYS Uygulamalarının Kurulumu ve Bakımı","Uygulamaların güvenlik mimarisine hatalı uyumlandırılması sonucunda veri sızıntısı",4,2,3,3,[3,7.15,2,1]],
["RE-13",BGYS,"BGYS Ölçümü, İzlenmesi ve Raporlanması","Merkezi log yönetim sistemine alınacak varlıkların hatalı/eksik belirlenmesi nedeniyle kritik olayların gözden kaçırılması",4,5,5,2,[5,3.00,1,2]],
["RE-14",BGYS,"BGYS Ölçümü, İzlenmesi ve Raporlanması","Bilgi varlıklarının korunması, saklanması ve sürekliliğinin sağlanması sürecinin etkin işletilmemesi nedeniyle veri/bilgi ifşası",4,3,2,5,[3,7.10,2,2]],
["RE-15",BGYS,"BGYS Ölçümü, İzlenmesi ve Raporlanması","Sistemler üzerindeki zafiyetlerin tespit edilememesi sonucu veri sızıntısı",4,3,2,4,[3,8.50,3,1]],
["RE-16",BGYS,"BGYS Ölçümü, İzlenmesi ve Raporlanması","Tedarikçi nezdinde bilgi varlıklarının korunması, saklanması ve sürekliliğinin sağlanmasına yönelik politikaların güncelliğini yitirmesi nedeniyle veri/bilgi ifşası",4,3,2,5,[3,5.30,2,2]],
["RE-237",KVK,"Kişisel Verilerin İşlenmesi","Kişisel ve özel nitelikli verinin işlenmesi sürecinin etkin işletilememesi sonucunda veri gizliliğinin bozulması",4,"N/A","N/A",4,[4,7.35,2,2]],
["RE-238",KVK,"Kişisel Verilerin Korunması, Saklanması ve İmhası","Kişisel ve özel nitelikli kişisel bilgilerin korunması, saklanması ve imhasının sağlanması sürecinin etkin işletilememesi nedeniyle veri/bilgi ifşası sonucunda veri gizliliğinin ve bütünlüğünün bozulması",4,4,2,4,[4,4.35,1,3]],
["RE-239",KVK,"KVKK Farkındalığı","Çalışanların kişisel verilerin korunması konusundaki farkındalığının yeterli olmaması nedeniyle veri sızıntısı sonucunda veri gizliliğinin bozulması",4,"N/A","N/A",4,[4,6.45,2,2]],
["RE-514",SOC,"İzleme","Son kullanıcı cihazlarına zararlı yazılımların bulaşması sonucu veri gizliğinin bozulması ve hizmet kesintisi yaşanması",4,4,4,5,[4,15.10,3,2]]
];

const CTRLS: RawControl[] = [
["KE-1","A","RE-1","Güvenlik loglarının tutulduğu uygulamalar SOD tarafından 7/24 izlenmekte ve herhangi bir süreç durduğunda alarm gelmektedir.","O","T","S",1,0,"Gerektiğinde"],
["KE-2","A","RE-1","SIEM uygulaması üzerinde kesinti durumuna ilişkin alarmlar (sistem hata mesajları) oluşturulmuştur.","O","T","S",2,0,"Gerektiğinde"],
["KE-3","A","RE-1","SIEM uygulaması üzerinde log kaynaklarından log alınamaması durumunda kritik seviyede alarm üretilmekte, uygulama/sistem sahiplerine iletilmekte ve SOC analistleri tarafından incelenmektedir.","O","T","S",1,0,"Gerektiğinde"],
["KE-4","A","RE-1","Herhangi bir arızada ilgili firmadan bakım destek şartları kapsamından hizmet alınmaktadır.","M","D","E",1,0,"Gerektiğinde"],
["KE-1082","A","RE-1","SIEM ürünü yedekli yapıda çalışmaktadır. Ayrıca, ODVM ortamı için de bir SIEM ürünü konumlandırılmıştır.","O","D","S",0,0,"İşlem Anında"],
["KE-5","A","RE-2","Güvenlik loglarının tutulduğu uygulamalar SOD tarafından 7/24 izlenmekte ve herhangi bir süreç durduğunda alarm gelmektedir.","O","T","S",1,0,"Gerektiğinde"],
["KE-6","A","RE-2","SIEM uygulaması üzerinde kesinti durumuna ilişkin alarmlar (sistem hata mesajları) oluşturulmuştur.","O","T","S",2,0,"Gerektiğinde"],
["KE-7","A","RE-2","SIEM uygulaması üzerinde log kaynaklarından log alınamaması durumunda kritik seviyede alarm üretilmekte, uygulama/sistem sahiplerine iletilmekte ve SOC analistleri tarafından incelenmektedir.","O","T","S",1,0,"Gerektiğinde"],
["KE-8","A","RE-2","Herhangi bir arızada ilgili firmadan bakım destek şartları kapsamından hizmet alınmaktadır.","M","D","E",1,0,"Gerektiğinde"],
["KE-1083","A","RE-2","SIEM ürünü yedekli yapıda çalışmaktadır. Ayrıca, ODVM ortamı için de bir SIEM ürünü konumlandırılmıştır.","O","D","S",0,0,"İşlem Anında"],
["KE-9","A","RE-3","Loglar zaman damgası eklenerek QRadar'a aktarılmaktadır.","O","O","S",0,0,"Gerektiğinde"],
["KE-845","A","RE-3","Bilgi Güvenliği Direktörlüğü'nün yönettiği tüm sistemlerde kullanılan zaman bilgisi tek bir referans kaynağına göre senkronize edilmektedir.","B","O","S",0,0,"İşlem Anında"],
["KE-851","A","RE-3","İz kayıtları değiştirilmek ya da silinmek istendiğinde sistem alarm üretmektedir.","O","O","S",0,0,"İşlem Anında"],
["KE-852","A","RE-3","İz kayıtlarına sadece yetkili kişiler erişebilmektedir. İz kayıtlarına erişim yetkileri periyodik olarak gözden geçirilmektedir.","M","O","E",0,0,"Yıllık"],
["KE-853","A","RE-3","İz kayıtları şifreli olarak saklanmaktadır.","B","O","E",0,0,"İşlem Anında"],
["KE-854","A","RE-3","Merkezi log sistemine zafiyet taramaları yapılmaktadır.","M","T","S",0,0,"Yıllık"],
["KE-10","A","RE-4","SIEM uygulaması üzerinden yapılan sorgulamalar (korelasyon değişiklikleri ve admin hakları değişiklikleri, vb) raporlanmaktadır.","O","T","S",1,1,"Gerektiğinde"],
["KE-11","A","RE-4","Erişimler periyodik olarak gözden geçirilen güncel rol-yetki matrisine uygun olarak tanımlanmaktadır.","M","T","E",1,0,"Gerektiğinde"],
["KE-12","A","RE-4","DLP uygulaması hariç diğer kritik bilgi güvenliği uygulamalarına erişim VDI üzerinden yapılmaktadır.","B","O","S",0,0,"Gerektiğinde"],
["KE-496","A","RE-4","Bilgi güvenliği uygulamalarına ve uygulamaların bulunduğu IP bloğuna erişim yetkileri SMAX üzerinden BGD onayı ile verilmektedir.","B","O","S",2,0,"Gerektiğinde"],
["KE-497","A","RE-4","Bilgi güvenliği uygulamalarına BGD haricinde dışarıdan erişim olduğunda alarm üretilmekte ve e-posta yolu ile BGD'ye iletilmektedir.","O","T","S",0,0,"Gerektiğinde"],
["KE-13","A","RE-5","Güncel siber tehditlere göre atak senaryoları değerlendirilmekte ve korelasyon kuralları güncellenmektedir.","M","O","S",1,0,"Gerektiğinde"],
["KE-14","A","RE-5","Korelasyon kuralları yılda en az bir sefer olacak şekilde periyodik olarak gözden geçirilmektedir.","M","O","E",1,0,"Yıllık"],
["KE-15","A","RE-5","Sistem üzerinde yapılan korelasyon kurallarındaki değişikliklerin raporlanması ve takibi yapılmaktadır.","B","D","S",1,0,"Günlük"],
["KE-16","A","RE-6","Log Yönetim Prosedürü bulunmaktadır.","M","O","S",0,0,"Gerektiğinde",1],
["KE-17","A","RE-6","Log Yönetim Prosedürü kapsamında güvenliğe ilişkin loglar alınmaktadır.","M","O","S",0,0,"Gerektiğinde"],
["KE-18","I","RE-6","POTA üzerinden yeni projelerin, Borsada geliştirilen veya tedarik edilen tüm uygulamaların güvenlik loglarının SIEM'e aktarılması değerlendirilmektedir.","M","O","E",0,0,"Gerektiğinde"],
["KE-19","A","RE-6","Tedarik edilen veya Borsada geliştirilen uygulamaların/sistemlerin log mekanizmasının Borsa standartlarında olduğu Bilgi Güvenliği Servisi tarafından görüş verilmektedir.","M","O","E",2,2,"Gerektiğinde"],
["KE-20","A","RE-6","Kritik log kaynakları için belirlenen eşik değeri (zaman) içinde log gelmediği takdirde alarmlar üretilmektedir.","M","T","S",1,0,"Günlük"],
["KE-21","A","RE-7","Alarmlar ve bildirimler SOAR ürünü ile merkezi olarak izlenmektedir.","O","T","S",3,3,"Günlük"],
["KE-22","A","RE-7","Personelin yetkinliğini geliştirmeye yönelik eğitimler alınmaktadır.","M","O","E",0,0,"Gerektiğinde"],
["KE-23","A","RE-7","SOC, alarmları ve tehdit-istihbarat/marka koruma bildirimlerini 7/24 izlemektedir.","B","O","S",1,1,"Günlük"],
["KE-24","A","RE-7","SOAR üzerinden kapatılan incident'lar, analist bazlı kapatılan incident'lar süreleri ile birlikte raporlanır. Açıkta kalan alarmlar tespit edilip sorgulanmaktadır.","O","O","S",1,0,"Günlük"],
["KE-25","A","RE-7","Korelasyon kuralları yılda en az bir sefer olacak şekilde periyodik olarak gözden geçirilmektedir.","M","O","E",1,0,"Yıllık"],
["KE-26","A","RE-8","Çalışanların bilgi güvenliği farkındalığının arttırılması için her yıl bilgi güvenliği farkındalık eğitimleri düzenlenmektedir.","M","O","S",1,2,"Yıllık"],
["KE-27","A","RE-8","Her ay düzenli olarak bilgi güvenliği farkındalık bülteni hazırlanarak çalışanlarla paylaşılmaktadır.","M","O","E",1,2,"Aylık"],
["KE-28","A","RE-8","Oltalama testleri yapılarak farkındalık düzeyinin arttırılmasına yönelik çalışmalar yapılmaktadır.","M","O","E",1,2,"Yıllık"],
["KE-29","A","RE-9","Erişim yönetimi prosedüründe Borsa'nın parola politikası net bir şekilde belirtilmiştir.","M","O","E",1,0,"Gerektiğinde",1],
["KE-30","A","RE-9","Sistem Yönetimi Direktörlüğü tarafından Active Directory üzerinde parola politikası tanımlanmıştır.","O","O","S",0,0,"Gerektiğinde"],
["KE-31","A","RE-10","Erişim yönetimi prosedüründe Borsa yetkilendirme süreçlerine dair hususlar belirtilmiştir.","M","O","E",1,0,"Gerektiğinde",1],
["KE-32","A","RE-10","Borsa içerisindeki uygulamalar ve süreçler için rol-yetki matrisleri oluşturulmuş ve bu matrisler süreç/uygulama sahipleri ile paylaşılmıştır.","M","D","E",1,0,"Yıllık"],
["KE-33","A","RE-10","IDM üzerinden yönetilen active directory grupları için yetkiler talep üzerine gözden geçirilmektedir.","B","O","S",1,1,"Gerektiğinde"],
["KE-34","A","RE-11","BGYS kapsamında gerçekleştirilen denetimlerde tespit edilen uygunsuzlukların kapatılması için düzeltici faaliyet çalışmaları yapılmaktadır.","M","T","E",0,2,"Gerektiğinde"],
["KE-35","A","RE-11","BGYS kapsamında her yıl tüm prosedürler gözden geçirilmekte ve ihtiyaç durumuna göre güncellenmektedir.","M","T","E",1,0,"Yıllık"],
["KE-36","A","RE-11","BGYS'nin işletimine dair Borsa içerisinde BGYS Planı yıllık olarak hazırlanmakta ve yıl boyu izlenmektedir.","M","T","E",0,2,"6 Aylık"],
["KE-37","A","RE-11","Bilgi Güvenliği Yönetimi Komitesi 6 ayda 1 toplanmakta ve BGYS çerçevesinde yürütülen faaliyetleri izlemektedir.","M","T","E",1,0,"6 Aylık"],
["KE-849","A","RE-11","ISO 27001 EkA kontrolleri ve ilgili riskler belirlenmekte ve izlenmektedir.","M","O","E",0,0,"Yıllık"],
["KE-38","A","RE-12","Uygulamaların/sistemlerin kurum içerisinde konumlandırılmalarına dair güvenlik adımları Bilgi Güvenliği Mimarisi Prosedürü'nde tanımlanmıştır.","M","O","E",1,0,"Gerektiğinde",1],
["KE-39","A","RE-12","Pota üzerinden yeni projelerin (büyük ölçekli) devreye alımı öncesinde bilgi güvenliği mimarisi açısından görüş verilmektedir.","B","O","S",1,0,"Gerektiğinde"],
["KE-40","A","RE-12","SMAX ve/veya mail üzerinden iletilen talepler için bilgi güvenliği mimarisi açısından Bilgi Güvenliği görüşü verilmektedir.","B","O","S",1,0,"Gerektiğinde"],
["KE-41","A","RE-12","Değişiklik Değerlendirme Komitesi'nde güvenlik mimarisi değerlendirme sürecine dahil olacak uygulamalar tespit edilmektedir.","M","O","E",2,0,"Haftalık"],
["KE-42","A","RE-13","Pota üzerinden yeni (büyük ölçekli) projelerin devreye alımı öncesinde bilgi güvenliği görüşü sürecinde merkezi log yönetim sistemi ile entegrasyon istenmektedir.","M","O","E",1,0,"Gerektiğinde"],
["KE-43","A","RE-14","Tüm son kullanıcı cihazlarında veri sızıntısı önlemesi uygulama ajanı kuruludur; tanımlı kurallara istinaden kritik veriler kontrol edilmekte ve alarmlar üretilmektedir.","O","O","S",0,0,"Gerektiğinde"],
["KE-44","A","RE-14","Ortak alanlarda veri sınıflandırma yapılmış, e-postalar sınıflandırılmakta ve DLP politikaları verinin dışarı çıkarılmasını engellemektedir.","O","D","S",2,1,"Gerektiğinde"],
["KE-45","A","RE-14","Bilgi varlıklarının korunmasına yönelik olarak varlık yönetimi prosedürü yazılmıştır.","M","O","S",0,0,"Gerektiğinde",1],
["KE-46","A","RE-15","Ağ Güvenlik Servisi internete açacağı uygulamalar için önceden BGD'den sızma testine ve sonuçlarına ilişkin teyit almaktadır.","M","O","E",1,0,"Gerektiğinde"],
["KE-47","A","RE-15","Zafiyet yönetimi talimatnamesi yazılarak KDY üzerinde yayınlanmıştır.","M","O","S",1,1,"Gerektiğinde",1],
["KE-48","A","RE-15","Kurum içerisinde sistemler üzerinde zafiyet taraması yapılmakta ve tespit edilen zafiyetlere ilişkin aksiyon alınmaktadır.","B","T","S",1,2,"Gerektiğinde"],
["KE-49","A","RE-15","SPK Bilgi Sistemleri Yönetimi Tebliği kapsamında düzenli olarak bağımsız kuruluşa sızma testi yaptırılmakta ve bulgulara aksiyon alınmaktadır.","M","T","E",3,2,"Yıllık"],
["KE-50","A","RE-15","Yeni geliştirilmiş ve internete açılacak uygulamalar için sızma testi yapılmakta; yüksek ve kritik zafiyetler kapatılmadan internete açılmamaktadır.","M","T","E",3,2,"Gerektiğinde"],
["KE-51","A","RE-16","Bilgi Güvenliği Mimarisi Prosedürü'nde tedarikçi ile paylaşılan varlıkların korunması tanımlanmış; gizlilik sözleşmesi ve BGYS hükümleri yer almaktadır.","M","O","E",0,0,"Gerektiğinde"],
["KE-52","A","RE-16","Tedarikçiler dev ve test ortamlarına VPN üzerinden ve izin verildiği takdirde erişebilmektedir.","B","O","S",0,0,"Gerektiğinde"],
["KE-1262","A","RE-16","Onaylanan sipariş talepleri otomatik e-posta ile BGD'ye iletilmekte ve Bilgi Güvenliği Değerlendirme Raporu oluşturulmaktadır.","B","O","E",1,0,"Gerektiğinde"],
["KE-585","A","RE-237","KVKK mevzuatına uygun şekilde Kişisel Veri Envanteri oluşturulmuş ve periyodik olarak gözden geçirilmektedir.","M","O","E",1,0,"Yıllık"],
["KE-844","A","RE-237","Özel nitelikli kişisel verilerin korunması politikada, açık rıza unsurlarının belirlenmesi KVK prosedüründe tanımlanmıştır.","M","O","S",0,0,"Gerektiğinde",1],
["KE-846","I","RE-237","Verilecek herhangi bir hizmet için Açık Rıza Unsurlarının belirlenmesine ilişkin hususlar Kişisel Verilerin Korunması Prosedürü içerisinde tanımlanmıştır.","M","O","S",0,0,"Gerektiğinde"],
["KE-1269","A","RE-237","KVKK verisi barındıran uygulamalara erişim yetkisi rol-yetki matrisine uygun olarak ve sadece ihtiyacı olan kullanıcılara verilmektedir.","M","O","S",1,0,"İşlem Anında"],
["KE-1270","A","RE-237","Bilgi güvenliği farkındalık eğitimleri verilmektedir.","M","O","S",1,2,"Yıllık"],
["KE-586","A","RE-238","Kişisel veri envanteri mevcut olup periyodik olarak gözden geçirilerek güncellenmektedir.","M","O","E",0,0,"Yıllık"],
["KE-587","A","RE-238","Kişisel Verilerin Korunması Prosedürü, Saklama ve İmha Politikası ve Log Yönetimi Prosedürü bulunmaktadır.","M","O","S",0,0,"Gerektiğinde",1],
["KE-843","I","RE-238","Merkezi log yönetimi sistemine özel nitelikli kişisel verilere ilişkin log alınmamasına yönelik prosedürde yönlendirme bulunmaktadır.","M","O","E",0,0,"Gerektiğinde"],
["KE-847","I","RE-238","İletişimin şifrelenmesi ve verinin maskelenmesi konusuna ilişkin hususlar Kişisel Verilerin Korunması Prosedürü'nde tanımlanmıştır.","M","O","E",0,0,"Gerektiğinde"],
["KE-848","A","RE-238","Verilerin tutulduğu sistemler üzerindeki yetkiler KVKK prosedüründe tanımlandığı şekilde sistem/uygulama sahipleri tarafından gözden geçirilmektedir.","B","T","E",0,0,"Yıllık"],
["KE-588","A","RE-239","Her yıl bilgi güvenliği farkındalık eğitimleri düzenlenmektedir; eğitimler KVKK farkındalığını da kapsamaktadır.","M","O","S",1,2,"Yıllık"],
["KE-589","A","RE-239","Her ay düzenli olarak bilgi güvenliği farkındalık bülteni hazırlanarak çalışanlarla paylaşılmaktadır.","M","O","E",1,2,"Aylık"],
["KE-590","A","RE-239","İşe girişte tüm çalışanlardan kişisel verilerin korunmasına yönelik hükümler içeren bilgi güvenliği taahhütnamesi alınmaktadır.","M","O","E",0,0,"Gerektiğinde"],
["KE-1276","A","RE-514","Domainde olan son kullanıcı cihazlarında anti-virüs programı bulunmaktadır.","O","O","S",3,3,"Aylık"],
["KE-1277","A","RE-514","Domainde olan son kullanıcı cihazlarında EDR programı bulunmaktadır.","O","O","S",1,3,"Aylık"],
["KE-1278","A","RE-514","Son kullanıcı cihazlarında güvenlik amacıyla GPO politikaları uygulanmaktadır.","O","O","S",3,3,"Aylık"],
["KE-1279","A","RE-514","Domainde olan son kullanıcı cihazlarının USB portları iş ihtiyacı dışında kapatılmaktadır.","O","O","S",3,3,"Aylık"],
["KE-1280","A","RE-514","Sunuculara erişim VDI tanımı ile sınırlandırılmış olup son kullanıcı cihazları doğrudan Borsa sunucularına erişememektedir.","O","O","S",3,3,"Aylık"]
];

/** Gözden geçirme raporunun 7. bölümündeki tür/işlev düzeltmeleri (eski kod biçiminde). */
export const FIXES: Record<string, Partial<Record<"t" | "f" | "k", string>>> = {"KE-11":{f:"O"},"KE-12":{t:"O"},"KE-14":{f:"T"},"KE-25":{f:"T"},"KE-15":{f:"T"},"KE-20":{t:"O"},"KE-23":{f:"T"},"KE-24":{f:"T"},"KE-28":{f:"T"},"KE-32":{f:"O"},"KE-33":{f:"T"},"KE-34":{f:"D"},"KE-35":{f:"O"},"KE-44":{f:"O"},"KE-845":{t:"O"},"KE-848":{t:"M"},"KE-851":{f:"T"},"KE-853":{t:"O",k:"S"},"KE-1082":{f:"O"},"KE-1083":{f:"O"}};

export function builtinDataset(): Dataset {
  const risks: Risk[] = RISKS.map((r) => {
    const [imp, integ, is, rs] = r[8];
    return {
      id: r[0], status: "Onaylı", proc: r[1], sub: r[2], desc: r[3], it: true,
      fin: null, iti: null, reg: null, mus: null, g: r[4], b: r[5], e: r[6], o: r[7],
      ex: { "Risk Sahibi": "Bilgi Güvenliği Direktörlüğü" }, rec: { imp, integ, is, rs }
    };
  });
  Object.assign(risks[0].ex, {
    "Kayıt ID": 313673, "Risk İşleme": "Risk Kabulü", "Mutabakat Tarihi": "d:2023-04-07",
    "Oluşturma Tarihi": "d:2023-04-07", "Güncelleme": "d:2026-05-06", "Özet": "R0001"
  });
  const controls: Control[] = CTRLS.map((c) => ({
    id: c[0], status: c[1] === "A" ? "Onaylı" : "İptal", risk: c[2], desc: c[3],
    pv: legacyPV({ t: c[4], f: c[5], k: c[6], d: c[7], r: c[8] }), freq: c[9], doc: !!c[10], ex: {}
  }));
  Object.assign(controls[0].ex, {
    "Kayıt ID": 314211, "Mutabakat Tarihi": "d:2023-04-07", "Oluşturma Tarihi": "d:2023-04-07",
    "Güncelleme": "d:2026-02-04", "Özet": "K0001", "Outward issue link (Risk-Kontrol)": "RE-1"
  });
  return { risks, controls, src: { name: "Yerleşik örnek: Kasım 2026 BGD matrisi", date: null } };
}
