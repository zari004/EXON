/* EXON — public sahifalar uchun UZ / RU / EN tarjima tizimi. */
(function () {
  'use strict';

  var STORAGE_KEY = 'exon_lang';
  var currentLang = 'uz';
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'uz' || saved === 'ru' || saved === 'en') currentLang = saved;
  } catch (e) {}

  var DICT = Object.create(null);
  function add(uz, ru, en) { DICT[uz] = { ru: ru, en: en }; }

  /* Umumiy navigatsiya */
  add("Asosiy kontentga o'tish", 'Перейти к основному содержанию', 'Skip to main content');
  add("Forma maydoniga o'tish", 'Перейти к форме', 'Skip to the form');
  add("Blog maqolalariga o'tish", 'Перейти к статьям блога', 'Skip to blog articles');
  add("Jarayonga o'tish", 'Перейти к процессу', 'Skip to process');
  add("Keyslar ro'yxatiga o'tish", 'Перейти к списку кейсов', 'Skip to case studies');
  add("Narxlarga o'tish", 'Перейти к тарифам', 'Skip to pricing');
  add('Xizmatlar', 'Услуги', 'Services');
  add('Keyslar', 'Кейсы', 'Cases');
  add('Narxlar', 'Тарифы', 'Pricing');
  add('Jarayon', 'Процесс', 'Process');
  add('Blog', 'Блог', 'Blog');
  add('Bepul audit', 'Бесплатный аудит', 'Free audit');
  add('Bepul Audit', 'Бесплатный аудит', 'Free Audit');
  add('Bosh sahifa', 'Главная', 'Home');
  add('Orqaga', 'Назад', 'Back');
  add('Keyingi', 'Далее', 'Next');
  add('Batafsil', 'Подробнее', 'Learn more');
  add('Yuklanmoqda...', 'Загрузка...', 'Loading...');
  add('Hisobotni yuborish', 'Отправить отчёт', 'Submit report');
  add('Mavzuni almashtirish', 'Сменить тему', 'Change theme');
  add("Qorong'i mavzu", 'Тёмная тема', 'Dark theme');
  add("Yorug' mavzu", 'Светлая тема', 'Light theme');
  add('Menyuni ochish', 'Открыть меню', 'Open menu');
  add('Menyuni yopish', 'Закрыть меню', 'Close menu');
  add('Asosiy menyu', 'Главное меню', 'Main menu');
  add('Til tanlash', 'Выбор языка', 'Language selection');

  /* Bosh sahifadagi konsultatsiya formasi */
  add('Bepul konsultatsiya', 'Бесплатная консультация', 'Free consultation');
  add("Biz bilan bog'laning", 'Свяжитесь с нами', 'Contact us');
  add("Ismingiz, biznes turingiz va telefon raqamingizni qoldiring — mutaxassislarimiz siz bilan tez orada bog'lanadi.", 'Оставьте имя, тип бизнеса и номер телефона — наши специалисты скоро свяжутся с вами.', 'Leave your name, business type and phone number — our specialists will contact you shortly.');
  add('Ismingiz', 'Ваше имя', 'Your name');
  add('Biznes turi', 'Тип бизнеса', 'Business type');
  add('Telefon raqam', 'Номер телефона', 'Phone number');
  add('Tanlang', 'Выберите', 'Select');
  add('Biznes egasi', 'Владелец бизнеса', 'Business owner');
  add('Brend egasi', 'Владелец бренда', 'Brand owner');
  add('Ishlab chiqaruvchi', 'Производитель', 'Manufacturer');
  add('Importyor', 'Импортёр', 'Importer');
  add('Olib sotar', 'Перепродавец', 'Reseller');
  add('Distribyutor', 'Дистрибьютор', 'Distributor');
  add('Ariza yuborish', 'Отправить заявку', 'Submit application');

  /* Bosh sahifa */
  add("EXON — Marketpleysda savdongizni tizimli o'stiramiz", 'EXON — системно развиваем продажи на маркетплейсах', 'EXON — systematic marketplace growth');
  add('Marketpleys ekspertlari', 'Эксперты по маркетплейсам', 'Marketplace experts');
  add("Marketplace'larda real natija beruvchi", 'Реальный результат на маркетплейсах —', 'Real results on marketplaces —');
  add('professional jamoa', 'профессиональная команда', 'a professional team');
  add("Biz marketplace'larni boshqariladigan biznesga aylantiramiz.", 'Мы превращаем маркетплейсы в управляемый бизнес.', 'We turn marketplaces into a manageable business.');
  add("Do'koningiz havolasi", 'Ссылка на ваш магазин', 'Your store link');
  add('Bepul audit olish', 'Получить бесплатный аудит', 'Get a free audit');
  add("3 ish kunida 12 nuqta bo'yicha yozma hisobot. Majburiyatsiz.", 'Письменный отчёт по 12 пунктам за 3 рабочих дня. Без обязательств.', 'A written 12-point report within 3 business days. No obligation.');
  add("Marketpleysda o'sish bosqichlari", 'Этапы роста на маркетплейсе', 'Marketplace growth stages');
  add("Audit, upakovka, reklama va o'sish bosqichlaridan iborat ko'tariluvchi egri chiziq.", 'Восходящая кривая из этапов аудита, упаковки, рекламы и роста.', 'An upward curve covering audit, packaging, advertising and growth.');
  // Egri chiziq (jarayon bosqichlari) — "Xizmatlar" bo'limidagi kartalardan alohida matnlar
  add('Strategiya', 'Стратегия', 'Strategy');
  add("Do'koningizni va raqobatchilarni tahlil qilib, aniq o'sish rejasini tuzamiz.", 'Анализируем ваш магазин и конкурентов, составляем чёткий план роста.', 'We analyze your store and competitors, and build a clear growth plan.');
  add('Ishga tushirish', 'Запуск', 'Launch');
  add('Kartochka, professional foto, infografika va reklama kampaniyalarini ishga tushiramiz.', 'Запускаем карточки, профессиональные фото, инфографику и рекламные кампании.', 'We launch product cards, professional photos, infographics and ad campaigns.');
  add('Boshqaruv', 'Управление', 'Management');
  add("Trafik, narxlar va reklama samaradorligini kunlik kuzatib, boshqarib boramiz.", 'Ежедневно отслеживаем и управляем трафиком, ценами и эффективностью рекламы.', 'We monitor and manage traffic, pricing and advertising performance daily.');
  // "Xizmatlar" bo'limidagi kartalar — bular hali ham eski nomlarda
  add('Audit', 'Аудит', 'Audit');
  add("Do'koningizni 12 nuqta bo'yicha tekshiramiz va o'sish nuqtalarini topamiz.", 'Проверим магазин по 12 пунктам и найдём точки роста.', 'We audit your store across 12 points and identify growth opportunities.');
  add('Upakovka', 'Упаковка', 'Packaging');
  add('Kartochka, professional foto, infografika va ikki tilda SEO matn.', 'Карточка, профессиональные фото, инфографика и SEO-текст на двух языках.', 'Product cards, professional photos, infographics and bilingual SEO copy.');
  add('Reklama', 'Реклама', 'Advertising');
  add("Trafik, qidiruvdagi pozitsiya va reklama samaradorligini o'stiramiz.", 'Увеличим трафик, позиции в поиске и эффективность рекламы.', 'We improve traffic, search ranking and advertising efficiency.');
  add("O'sish", 'Рост', 'Growth');
  add("Oborot va konversiya barqaror o'sadi — har oy raqamli hisobot bilan.", 'Оборот и конверсия стабильно растут — с ежемесячным отчётом в цифрах.', 'Revenue and conversion grow steadily — backed by monthly reports.');
  add('Bizga ishonishdi', 'Нам доверяют', 'Trusted by');
  add("To'liq marketpleys paketi", 'Полный пакет для маркетплейса', 'Complete marketplace package');
  add("Audit'dan boshlab, barqaror o'sishgacha — har bosqichni biz olamiz.", 'От аудита до стабильного роста — берём на себя каждый этап.', 'From audit to sustainable growth — we handle every stage.');
  add("Narxlarni ko'ring", 'Посмотреть тарифы', 'View pricing');
  add("50+ do'konning natijalari", 'Результаты 50+ магазинов', 'Results from 50+ stores');
  add('Elektronika dan kosmetikagacha — 100 000+ buyurtmada tasdiqlangan.', 'От электроники до косметики — подтверждено на 100 000+ заказах.', 'From electronics to cosmetics — proven across 100,000+ orders.');
  add('Barcha keyslar', 'Все кейсы', 'All cases');
  add('📱 Elektronika', '📱 Электроника', '📱 Electronics');
  add('🏠 Uy buyumlari', '🏠 Товары для дома', '🏠 Home goods');
  add('👶 Bolalar', '👶 Детские товары', '👶 Kids');
  add('Smartfon Aksessuarlari', 'Аксессуары для смартфонов', 'Smartphone Accessories');
  add('Oshxona Janglari', 'Товары для кухни', 'Kitchen Essentials');
  add('Bolalar Paltolari', 'Детские пальто', 'Kids Coats');
  add('Trafik', 'Трафик', 'Traffic');
  add('Buyurtma', 'Заказы', 'Orders');
  add('Pozitsiya', 'Позиция', 'Position');
  add('Konversiya', 'Конверсия', 'Conversion');
  add('Shaffof, segmentga mos narx', 'Прозрачные тарифы для каждого сегмента', 'Transparent pricing for every segment');
  add('S-1 dan S-4 gacha — 4 ta tayyor paket. Eng ommaboplari:', 'Четыре готовых пакета от S-1 до S-4. Самые популярные:', 'Four ready-made packages from S-1 to S-4. Most popular:');
  add('Barcha 4 ta paket', 'Все 4 пакета', 'All 4 packages');
  add('Yangi boshlovchilar', 'Для начинающих', 'For beginners');
  add('Audit & Rejasi', 'Аудит и план', 'Audit & Plan');
  add('Bepul', 'Бесплатно', 'Free');
  add("Bepul audit + tafsilotli yo'l xaritasi", 'Бесплатный аудит + подробная дорожная карта', 'Free audit + detailed roadmap');
  add('Eng mashhur', 'Самый популярный', 'Most popular');
  add('Upakovka Pro', 'Упаковка Pro', 'Packaging Pro');
  add('/ 5 SKU', '/ 5 SKU', '/ 5 SKUs');
  add('Kartochka, foto, matn, SEO — hammasi', 'Карточка, фото, текст и SEO — всё включено', 'Cards, photos, copy and SEO — all included');
  add("30–90 kunlik yo'l xaritasi", 'Дорожная карта на 30–90 дней', '30–90 day roadmap');
  add('Auditdan birinchi natijagacha — 4 aniq bosqich.', 'От аудита до первого результата — 4 чётких этапа.', 'Four clear stages from audit to first results.');
  add("To'liq jarayon", 'Полный процесс', 'Full process');
  add('Audit va Tahlil', 'Аудит и анализ', 'Audit and Analysis');
  add('Strategiya va Rejalash', 'Стратегия и планирование', 'Strategy and Planning');
  add('Amalga Oshirish', 'Реализация', 'Implementation');
  add('Kuzatish va ROAS', 'Контроль и ROAS', 'Monitoring and ROAS');
  add("Qo'llanma va tajribalar", 'Гайды и опыт', 'Guides and insights');
  add('50+ maqola — SEO, reklama, kartochka, analitika.', '50+ статей — SEO, реклама, карточки и аналитика.', '50+ articles on SEO, advertising, product cards and analytics.');
  add("Blog'ga o'tish", 'Перейти в блог', 'Visit the blog');

  /* Audit */
  add('Bepul Audit — EXON Marketpleys Ekspertlari', 'Бесплатный аудит — эксперты EXON', 'Free Audit — EXON Marketplace Experts');
  add('3 BOSQICH, 12 SAVOL', '3 ЭТАПА, 12 ВОПРОСОВ', '3 STAGES, 12 QUESTIONS');
  add('Audit Formasi', 'Форма аудита', 'Audit Form');
  add("Do'koningizni 3 bosqichda tekshiramiz: audit, kartochka yoki reklama. Yozma hisobot 3 ish kunida.", 'Проверим магазин в 3 этапа: аудит, карточка и реклама. Письменный отчёт за 3 рабочих дня.', 'We review your store in 3 stages: audit, product card and advertising. Written report in 3 business days.');
  add("Audit — Do'kon tahlili", 'Аудит — анализ магазина', 'Audit — Store Analysis');
  add("Do'kon qancha vaqtdan faoldir?", 'Как долго работает магазин?', 'How long has the store been active?');
  add('0–3 oy (yangi)', '0–3 месяца (новый)', '0–3 months (new)');
  add('3–12 oy', '3–12 месяцев', '3–12 months');
  add('1+ yil', '1+ год', '1+ year');
  add('Asosiy muammo nima?', 'Какая главная проблема?', 'What is the main challenge?');
  add("Trafikni ko'paytirish kerak", 'Нужно увеличить трафик', 'Need more traffic');
  add('Konversiya past', 'Низкая конверсия', 'Low conversion');
  add('Reklama xarajati yuqori', 'Высокие расходы на рекламу', 'High advertising costs');
  add("Hozir necha oyning ROI'ni aniqlaysiz?", 'За сколько месяцев вы сейчас рассчитываете ROI?', 'For how many months do you currently track ROI?');
  add('Bilmayman, hisoblash qiyin', 'Не знаю, сложно посчитать', 'I do not know; it is hard to calculate');
  add("Qisman o'lchayman", 'Измеряю частично', 'I measure it partially');
  add('Har oyni aniq bilan bilamiz', 'Точно знаем за каждый месяц', 'We know it precisely every month');
  add('Kartochka va Reklama', 'Карточка и реклама', 'Product Card and Advertising');
  add('Kartochka qanday?', 'Как оформлена карточка?', 'How is the product card?');
  add("Arzon foto, narigi matn yo'q", 'Простые фото, текста почти нет', 'Basic photos, almost no copy');
  add("Oddiy foto, asosiy ma'lumot bor", 'Обычные фото, основная информация есть', 'Standard photos with basic information');
  add("Professional foto va to'liq matn", 'Профессиональные фото и полный текст', 'Professional photos and complete copy');
  add('Reklama qanday boshqariladi?', 'Как управляется реклама?', 'How is advertising managed?');
  add("Manual, taxtimda o'zgartiriladi", 'Вручную, изменения от случая к случаю', 'Manually, with occasional changes');
  add('Bazan optimallashtirish qilamiz', 'Иногда оптимизируем', 'We optimize occasionally');
  add('Avtomatik sistema yoki xizmat', 'Автоматическая система или сервис', 'Automated system or service');
  add("SEO qanday qo'llaniladi?", 'Как применяется SEO?', 'How is SEO applied?');
  add('Bilmayman, nima bu?', 'Не знаю, что это', 'I do not know what it is');
  add("Kalit so'zlarni o'rnatapmiz", 'Используем ключевые слова', 'We use keywords');
  add('Kompleks SEO strategiyasini ishlattik', 'Используем комплексную SEO-стратегию', 'We use a comprehensive SEO strategy');
  add('Analitika va Maqsadlar', 'Аналитика и цели', 'Analytics and Goals');
  add('Analitika qanday tekshiriladi?', 'Как проверяется аналитика?', 'How often is analytics reviewed?');
  add("Hech qachon ko'rilmaydi", 'Никогда', 'Never');
  add('Oyiga bir marta', 'Раз в месяц', 'Once a month');
  add('Haftalik yoki kunlik', 'Еженедельно или ежедневно', 'Weekly or daily');
  add('Oylik buyurtma soni qancha?', 'Сколько заказов в месяц?', 'How many monthly orders?');
  add("Keyingi 3 oyda o'stirish maqsadi qancha?", 'Какова цель роста на следующие 3 месяца?', 'What is your growth goal for the next 3 months?');
  add("Biroz ko'payish (10-20%)", 'Небольшой рост (10–20%)', 'Moderate growth (10–20%)');
  add('Sezilarli (30-50%)', 'Заметный рост (30–50%)', 'Significant growth (30–50%)');
  add("Tezkor (2x yoki ato'z)", 'Быстрый рост (2x и более)', 'Rapid growth (2x or more)');
  add('Hisob email', 'Email для отчёта', 'Report email');
  add("Yozma hisobot shu email'ga yuboriladi (Telegram ham)", 'Письменный отчёт будет отправлен на этот email (и в Telegram)', 'The written report will be sent to this email (and Telegram)');
  add('Audit natijalari', 'Результаты аудита', 'Audit results');
  add('Siz qanday kategoriyada ekaningizni bilamiz', 'Мы определили вашу категорию', 'We identified your category');
  add('Segment nomi', 'Название сегмента', 'Segment name');
  add('Tavsif yoziladi', 'Здесь появится описание', 'Description will appear here');
  add('Konsultatsiya olish', 'Получить консультацию', 'Get a consultation');
  add('Bosh sahifaga', 'На главную', 'Back to home');
  add("Hisoboti 3 ish kunida email'ga yuboriladi", 'Отчёт будет отправлен на email в течение 3 рабочих дней', 'The report will be emailed within 3 business days');

  /* Blog, keyslar va narxlar */
  add("Blog — EXON Marketpleys Qo'llanmasi va Maslahatlar", 'Блог — руководства и советы EXON', 'Blog — EXON Marketplace Guides and Advice');
  add('50+ QOLLANMA', '50+ РУКОВОДСТВ', '50+ GUIDES');
  add("Blog va Qo'llanmalar", 'Блог и руководства', 'Blog and Guides');
  add("Marketpleys o'stirish uchun — tahlil, strategiya, SEO va reklama bo'yicha maslahatlar.", 'Советы по аналитике, стратегии, SEO и рекламе для роста на маркетплейсах.', 'Advice on analytics, strategy, SEO and advertising for marketplace growth.');
  add('Keyslar — EXON Marketpleys Konsultansiyasi', 'Кейсы — консалтинг EXON', 'Cases — EXON Marketplace Consulting');
  add("50+ DO'KON", '50+ МАГАЗИНОВ', '50+ STORES');
  add('Keyslarimiz', 'Наши кейсы', 'Our Cases');
  add("Elektronika dan kosmetikagacha — hamma nishada tajriba. 100 000+ buyurtmada ko'paytirish.", 'Опыт во всех нишах — от электроники до косметики. Рост на 100 000+ заказах.', 'Experience across every niche, from electronics to cosmetics. Growth proven on 100,000+ orders.');
  add('Sizning hikoyangizni boshlay', 'Начните свою историю', 'Start your success story');
  add('Bepul audit — 12 nuqtali tahlil. Keyingi qadam uchun plan 3 kunda.', 'Бесплатный аудит по 12 пунктам. План следующего шага за 3 дня.', 'Free 12-point audit. Get your next-step plan in 3 days.');
  add('Narxlar — EXON Xizmatlar va Paketlar', 'Тарифы — услуги и пакеты EXON', 'Pricing — EXON Services and Packages');
  add('SHAFFOF NARX', 'ПРОЗРАЧНЫЕ ЦЕНЫ', 'TRANSPARENT PRICING');
  add("Har Segmentga O'z Paket", 'Свой пакет для каждого сегмента', 'A Package for Every Segment');
  add("Audit dan scalig'gacha — 4 ta tayyorlangan paket. 3 oylik garantiya, qaytarish shart emas.", 'Четыре готовых пакета от аудита до масштабирования. Гарантия 3 месяца.', 'Four ready-made packages from audit to scaling, with a 3-month guarantee.');
  add("Tez-Tez So'raladigan Savollar", 'Часто задаваемые вопросы', 'Frequently Asked Questions');
  add('Kontraktning shartlari qanday?', 'Каковы условия договора?', 'What are the contract terms?');
  add("Minimum 3 oy. Upakovka paketi bir xil (to'liq hammasini bitta 2-3 hafta ichida qilamiz). Reklama va Scaling ayliq, istalmay to'xtatish mumkin.", 'Минимум 3 месяца. Упаковка выполняется разово за 2–3 недели. Реклама и масштабирование оплачиваются ежемесячно, их можно остановить.', 'Minimum 3 months. Packaging is completed once within 2–3 weeks. Advertising and scaling are monthly and can be stopped.');
  add("Reklama xarajati qo'shimcha?", 'Расходы на рекламу оплачиваются отдельно?', 'Are advertising costs separate?');
  add("Ha, reklama puli (Uzum, Wildberries, Yandex Market) alohida. Biz faqat boshqarish va optimizatsiya xizmatini olamiz. Ko'pi bilan reklama 30-50 ming dollar/oy.", 'Да, рекламный бюджет площадок оплачивается отдельно. Мы берём оплату только за управление и оптимизацию.', 'Yes. Marketplace ad spend is separate; we charge only for management and optimization.');
  add('Natijalari kafolatlangan?', 'Результат гарантирован?', 'Are results guaranteed?');
  add("Full Scaling paketida — 3 oylik kafolat. Agar 2x ROI olmasak, to'loq pul qaytarish yoki bepul davomi 4-oy.", 'В пакете Full Scaling действует гарантия 3 месяца. Если не получим ROI 2x, вернём оплату или продолжим бесплатно.', 'Full Scaling includes a 3-month guarantee. If we do not achieve 2x ROI, we refund the fee or continue free of charge.');
  add("Mana markaziy ishlash bo'ladimi?", 'Можно работать централизованно?', 'Can everything be managed centrally?');
  add("Ha, barcha marketpleys — Uzum, Wildberries, Yandex Market. Bir markazdan boshqaramiz, siz faqat natijalani ko'rasiz.", 'Да, управляем Uzum, Wildberries и Yandex Market из одного центра — вы видите только результат.', 'Yes. We manage Uzum, Wildberries and Yandex Market from one place while you focus on results.');

  /* Jarayon */
  add('Jarayon — EXON Boshqaruv Tizimi', 'Процесс — система управления EXON', 'Process — EXON Management System');
  add('4 BOSQICH', '4 ЭТАПА', '4 STAGES');
  add('Ishlashtirish Jarayoni', 'Процесс работы', 'How We Work');
  add("Birinchi auditsiyadan oxirgi so'rash buyurtmagacha — 30-90 kun, 4 ta aniq bosqich.", 'От первого аудита до стабильных заказов — 30–90 дней и 4 чётких этапа.', 'From the first audit to stable orders — 30–90 days and 4 clear stages.');
  add('1 hafta', '1 неделя', '1 week');
  add("Do'koningizni 12 nuqta bo'yicha tekshiramiz. Bosh muammolarni aniqlayabdi.", 'Проверим магазин по 12 пунктам и выявим основные проблемы.', 'We audit your store across 12 points and identify the main issues.');
  add("Marketpleys taraflardagi ko'rishlar", 'Анализ показателей маркетплейса', 'Marketplace performance review');
  add("Kartochka kalitsi so'zlar tahlili", 'Анализ ключевых слов карточки', 'Product-card keyword analysis');
  add('Reklama kampaniyasi baholash', 'Оценка рекламных кампаний', 'Advertising campaign review');
  add('Raqobat tahlili', 'Анализ конкурентов', 'Competitor analysis');
  add('Stratejiya va Rejalash', 'Стратегия и планирование', 'Strategy and Planning');
  add('1-2 hafta', '1–2 недели', '1–2 weeks');
  add("Audit asosida 90 kunlik o'sish rejasi tuzamiz.", 'На основе аудита составим план роста на 90 дней.', 'We create a 90-day growth plan based on the audit.');
  add("Kalit so'zlar strategiyasi", 'Стратегия ключевых слов', 'Keyword strategy');
  add("Kartochka o'zgarish rejasi", 'План изменений карточек', 'Product-card improvement plan');
  add('Reklama budjet taqsimoti', 'Распределение рекламного бюджета', 'Advertising budget allocation');
  add("KPI va target'lar belgilash", 'Определение KPI и целей', 'KPI and target setting');
  add('4-8 hafta', '4–8 недель', '4–8 weeks');
  add('Kartochka, reklama va boshqaruv — hammasini biz boshqaramiz.', 'Карточки, реклама и управление — всё берём на себя.', 'We handle product cards, advertising and management.');
  add('Kartochka fotografi va matn tayyorlash', 'Подготовка фото и текста карточки', 'Product photography and copy');
  add('Reklama kampaniyalarini ishga tushirish', 'Запуск рекламных кампаний', 'Advertising campaign launch');
  add('Kunlik optimizatsiya', 'Ежедневная оптимизация', 'Daily optimization');
  add('Haftalik hisobot', 'Еженедельный отчёт', 'Weekly report');
  add('Shuning Kuzatish', 'Контроль и развитие', 'Monitoring and Growth');
  add('Davom etuvchi', 'Постоянно', 'Ongoing');
  add("Natijalari ko'ribdan rabo'tib, shunchaki o'stiramiz.", 'Отслеживаем результаты и продолжаем рост.', 'We track results and keep growing.');
  add('Kunlik ROAS tracking', 'Ежедневный контроль ROAS', 'Daily ROAS tracking');
  add('AB-testing va variantlar', 'A/B-тесты и варианты', 'A/B testing and variants');
  add('Oylik baholash va taatlif', 'Ежемесячная оценка и рекомендации', 'Monthly review and recommendations');
  add('2x ROI garantiyasi bilan', 'С гарантией ROI 2x', 'With a 2x ROI guarantee');
  add('Audit va Hisobot', 'Аудит и отчёт', 'Audit and Report');
  add('30–90 kun', '30–90 дней', '30–90 days');
  add("To'liq Tsikl", 'Полный цикл', 'Full Cycle');
  add("O'rtacha O'sish", 'Средний рост', 'Average Growth');
  add('3 oylik', '3 месяца', '3 months');
  add('Garantiya', 'Гарантия', 'Guarantee');
  add('Bugun boshlang', 'Начните сегодня', 'Start Today');
  add("Bepul auditga qo'ng'iroq qilib, 3 kundan keyin rejani oling.", 'Запишитесь на бесплатный аудит и получите план через 3 дня.', 'Book a free audit and receive your plan within 3 days.');

  /* Ma'lum dinamik kontent */
  add('SEO', 'SEO', 'SEO');
  add('REKLAMA', 'РЕКЛАМА', 'ADVERTISING');
  add('KARTOCHKA', 'КАРТОЧКА', 'PRODUCT CARD');
  add('BIZNES', 'БИЗНЕС', 'BUSINESS');
  add('ANALITIKA', 'АНАЛИТИКА', 'ANALYTICS');
  add('MARKETING', 'МАРКЕТИНГ', 'MARKETING');
  add("Uzum'da Kalit So'zlar — 2025 Qo'llanmasi", 'Ключевые слова в Uzum — руководство 2025', 'Keywords on Uzum — 2025 Guide');
  add("Wildberries'da Reklama — Budjet Taqsimoti", 'Реклама на Wildberries — распределение бюджета', 'Wildberries Advertising — Budget Allocation');
  add('Rasmni Optimallashtirish — Konversiya +40%', 'Оптимизация изображений — конверсия +40%', 'Image Optimization — Conversion +40%');
  add("Chop etilgan aksessuarlar uchun Uzum'da kartochka optimallashtirish va reklama kampaniyasi.", 'Оптимизация карточек и рекламная кампания аксессуаров на Uzum.', 'Product-card optimization and an advertising campaign for accessories on Uzum.');
  add("Vileda, Grohe uchun Wildberries'da brend pozitsiyasi tuzatish va reklama ROI +45%.", 'Корректировка позиционирования Vileda и Grohe на Wildberries и рост ROI рекламы на 45%.', 'Brand-positioning improvements for Vileda and Grohe on Wildberries, with advertising ROI up 45%.');
  add("Fanlar paltochasi — 3 ta tilsiz kartochka dan boshlab, professional reklama bilan +420% buyurtma.", 'Детские пальто: от трёх неоформленных карточек до роста заказов на 420% благодаря профессиональной рекламе.', 'Kids coats: from three basic listings to 420% more orders with professional advertising.');
  add("Yosh brend — Yandex Market'da 0 dan 50+ reklama qilingan mahsulot, 8 oyda +$180k oborot.", 'Молодой бренд: от нуля до 50+ продвигаемых товаров на Yandex Market и оборота $180k за 8 месяцев.', 'A young brand grew from zero to 50+ promoted products on Yandex Market and $180k revenue in 8 months.');
  add("O'z brendi — 3 ta marketpleys, 12 ta SKU, unifikatsiya va pozitsiya tuzatish, aylik +$45k.", 'Собственный бренд: 3 маркетплейса, 12 SKU, унификация и корректировка позиционирования — плюс $45k в месяц.', 'Own brand across 3 marketplaces and 12 SKUs, with unified positioning and $45k additional monthly revenue.');
  add("Yangi do'kon — kartochka, reklama, boshqaruv hammasiga. 6 oyda istiqomiy o'sish va 3 ta tilga.", 'Новый магазин: карточки, реклама и управление. Стабильный рост и выход на 3 языка за 6 месяцев.', 'A new store with complete product-card, advertising and management support, reaching steady growth and 3 languages in 6 months.');
  add('💄 Kosmetika', '💄 Косметика', '💄 Cosmetics');
  add('🌿 Brend', '🌿 Бренд', '🌿 Brand');
  add('🚀 Startup', '🚀 Стартап', '🚀 Startup');
  add('Organikal Kremlar', 'Органические кремы', 'Organic Creams');
  add('Mahsulot Brendining Scalelash', 'Масштабирование товарного бренда', 'Product Brand Scaling');
  add("Boshdan Boshla — Oy'da $35k", 'Старт с нуля — $35k в месяц', 'Start from Scratch — $35k/month');
  add('Oborot', 'Оборот', 'Revenue');
  add('Oylik', 'В месяц', 'Monthly');
  add("Hajm O'shishi", 'Рост объёма', 'Volume Growth');
  add('6-Oy Oborot', 'Оборот за 6 месяцев', '6-Month Revenue');
  add('Mom Foyda', 'Прибыль', 'Profit');

  add("Qidiruvda rost chiqish uchun kalit so'zlarni qanday tanlash, aylantirish va test qilish?", 'Как выбирать, менять и тестировать ключевые слова для роста в поиске?', 'How do you select, rotate and test keywords to rank higher in search?');
  add('CPA, CPC, ROAS — hamma metrika nima va qanday o\'lchash kerak?', 'CPA, CPC и ROAS: что означают метрики и как их измерять?', 'CPA, CPC and ROAS: what do these metrics mean and how should you measure them?');
  add('Professional foto usullari, RGB ranglar, tasvir nisbati — hammasi bir yerda.', 'Профессиональная съёмка, RGB-цвета и пропорции изображения — всё в одном материале.', 'Professional photography, RGB colors and image ratios — all in one guide.');
  add('3 Marketpleys vs 1 — Qaysi Tanlash?', '3 маркетплейса или 1 — что выбрать?', '3 Marketplaces vs 1 — Which Should You Choose?');
  add('Siz yangi boshlovchi ekanligiz yoki masshtabichgan — har segment uchun roka.', 'Рекомендации для каждого сегмента — от новичка до масштабирования.', 'Recommendations for every segment, from beginners to scaling sellers.');
  add('Yandex Market — Analitika Panel Naqib', 'Yandex Market — обзор панели аналитики', 'Yandex Market — Analytics Dashboard Guide');
  add('Qaysi raqamlar asosiy va qaysi ularni kuzatish mumkin — har satrda tavsifi.', 'Какие показатели важны и как их отслеживать — подробное объяснение.', 'Which numbers matter and how to track them — explained clearly.');
  add('Brend Pozisiyasini Qanday Tuzatish?', 'Как скорректировать позиционирование бренда?', 'How Do You Improve Brand Positioning?');
  add("Qo'lini va reklama strategiyasini xelsa uyg'unlashtirish — kompleks usul.", 'Комплексный подход к согласованию бренда и рекламной стратегии.', 'A comprehensive approach to aligning brand and advertising strategy.');

  add('YANGI BOSHLOVCHILAR', 'ДЛЯ НАЧИНАЮЩИХ', 'FOR BEGINNERS');
  add("SOTIB TURGAN SELLER'LAR", 'ДЛЯ ДЕЙСТВУЮЩИХ ПРОДАВЦОВ', 'FOR ACTIVE SELLERS');
  add('BREND & DISTRIBYUTOR', 'БРЕНД И ДИСТРИБЬЮТОР', 'BRAND & DISTRIBUTOR');
  add('ISHLAB CHIQARUVCHI', 'ПРОИЗВОДИТЕЛЬ', 'MANUFACTURER');
  add("Bepul audit + tafsil yo'l xaritasi", 'Бесплатный аудит + подробная дорожная карта', 'Free audit + detailed roadmap');
  add('Faqat taqdim qilish', 'Однократно', 'One-time delivery');
  add("12 nuqtali do'kon tahlili", 'Анализ магазина по 12 пунктам', '12-point store analysis');
  add('Raqamli hisobot PDF', 'Цифровой PDF-отчёт', 'Digital PDF report');
  add('30 daqiqa konsultatsiya', '30-минутная консультация', '30-minute consultation');
  add('Yana xizmatlarga 10% chegirma', 'Скидка 10% на дополнительные услуги', '10% discount on additional services');
  add('Bepul Olish', 'Получить бесплатно', 'Get it free');
  add('Kartochka, foto, matn, SEO — hammasini qilmiz', 'Карточка, фото, текст и SEO — всё включено', 'Product cards, photos, copy and SEO — all included');
  add('Har 5 ta SKU uchun', 'За каждые 5 SKU', 'For every 5 SKUs');
  add('Professional foto 360° (10+ bur)', 'Профессиональные фото 360° (10+ ракурсов)', 'Professional 360° photos (10+ angles)');
  add('Infografika (2 dizayn varyanti)', 'Инфографика (2 варианта дизайна)', 'Infographics (2 design options)');
  add('SEO matn (UZ + RU)', 'SEO-текст (UZ + RU)', 'SEO copy (UZ + RU)');
  add('3 marketpleys uchun optimallashtirish', 'Оптимизация для 3 маркетплейсов', 'Optimization for 3 marketplaces');
  add('2 hafta ichida tayyor', 'Готово за 2 недели', 'Ready within 2 weeks');
  add('Konsultatsiya', 'Консультация', 'Consultation');
  add('Reklama + Boshqaruv', 'Реклама + управление', 'Advertising + Management');
  add('Kunlik kampaniya boshqaruvi, optimizatsiya', 'Ежедневное управление и оптимизация кампаний', 'Daily campaign management and optimization');
  add('Reklama hajmi 30k+ dan', 'При рекламном бюджете от 30k+', 'For ad spend of 30k+');
  add("Kalit so'z tahlili va tanlash", 'Анализ и подбор ключевых слов', 'Keyword analysis and selection');
  add('Kunlik kampaniya optimizatsiyasi', 'Ежедневная оптимизация кампаний', 'Daily campaign optimization');
  add('AB-testlar va variantlar', 'A/B-тесты и варианты', 'A/B tests and variants');
  add('Haftalik hisobotlar', 'Еженедельные отчёты', 'Weekly reports');
  add('Aniq ROAS + ROI tracking', 'Точный контроль ROAS и ROI', 'Precise ROAS and ROI tracking');
  add('Full Scaling', 'Полное масштабирование', 'Full Scaling');
  add('Kartochka + Reklama + Analitika + Qayta urinish', 'Карточки + реклама + аналитика + развитие', 'Product Cards + Advertising + Analytics + Iteration');
  add('Dedikatsiya xizmat', 'Выделенный сервис', 'Dedicated service');
  add('Kartochka fotografi va matn', 'Фото и текст карточек', 'Product photography and copy');
  add('3 ta til (UZ, RU, EN)', '3 языка (UZ, RU, EN)', '3 languages (UZ, RU, EN)');
  add('Reklama + 24/7 boshqaruv', 'Реклама + управление 24/7', 'Advertising + 24/7 management');
  add('Dedikatsiya akkaunt menedzheri', 'Выделенный аккаунт-менеджер', 'Dedicated account manager');
  add('Kunlik KPI tracking', 'Ежедневный контроль KPI', 'Daily KPI tracking');
  add('6 oylik garantiya +2x ROI', 'Гарантия 6 месяцев + ROI 2x', '6-month guarantee + 2x ROI');

  var textSources = new WeakMap();
  var attrSources = new WeakMap();

  function translated(source) {
    if (currentLang === 'uz') return source;
    var entry = DICT[source];
    return entry && entry[currentLang] ? entry[currentLang] : source;
  }

  function translateTextNode(node) {
    if (!node || !node.nodeValue || !node.parentElement) return;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(node.parentElement.tagName)) return;
    var raw = textSources.has(node) ? textSources.get(node) : node.nodeValue;
    if (!textSources.has(node)) textSources.set(node, raw);
    var leading = raw.match(/^\s*/)[0];
    var trailing = raw.match(/\s*$/)[0];
    var source = raw.trim();
    if (!source) return;
    node.nodeValue = leading + translated(source) + trailing;
  }

  function translateAttributes(el) {
    if (!el || !el.getAttribute) return;
    var attrs = ['placeholder', 'title', 'aria-label'];
    var stored = attrSources.get(el) || {};
    attrs.forEach(function (attr) {
      if (!Object.prototype.hasOwnProperty.call(stored, attr) && el.hasAttribute(attr)) {
        stored[attr] = el.getAttribute(attr);
      }
      if (Object.prototype.hasOwnProperty.call(stored, attr)) {
        el.setAttribute(attr, translated(stored[attr]));
      }
    });
    attrSources.set(el, stored);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) translateAttributes(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === 3) translateTextNode(node);
      else translateAttributes(node);
    }
  }

  function syncControls() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('.lang').forEach(function (group) {
      var buttons = group.querySelectorAll('.lang__btn');
      buttons.forEach(function (btn) {
        var code = (btn.dataset.lang || btn.textContent || '').trim().toLowerCase();
        btn.dataset.lang = code;
        btn.classList.toggle('is-active', code === currentLang);
        btn.setAttribute('aria-pressed', String(code === currentLang));
      });
      if (!group.querySelector('[data-lang="en"]')) {
        var en = document.createElement('button');
        en.className = 'lang__btn' + (currentLang === 'en' ? ' is-active' : '');
        en.type = 'button';
        en.dataset.lang = 'en';
        en.textContent = 'EN';
        en.setAttribute('aria-pressed', String(currentLang === 'en'));
        group.appendChild(en);
      }
    });
  }

  function applyLanguage() {
    syncControls();
    walk(document.body);
    var titleSource = document.documentElement.dataset.i18nTitle || document.title;
    document.documentElement.dataset.i18nTitle = titleSource;
    document.title = translated(titleSource);
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('.lang__btn[data-lang]');
    if (!button) return;
    var next = button.dataset.lang;
    if (next !== 'uz' && next !== 'ru' && next !== 'en') return;
    currentLang = next;
    try { localStorage.setItem(STORAGE_KEY, currentLang); } catch (e) {}
    applyLanguage();
  });

  document.addEventListener('DOMContentLoaded', function () {
    applyLanguage();
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(walk);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
