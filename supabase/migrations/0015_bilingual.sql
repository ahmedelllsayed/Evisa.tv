alter table faqs add column if not exists question_ar text;
alter table faqs add column if not exists answer_ar text;
alter table faqs add column if not exists category_ar text;

alter table reviews add column if not exists title_ar text;
alter table reviews add column if not exists body_ar text;

alter table destinations add column if not exists name_ar text;
alter table destinations add column if not exists validity_ar text;
alter table destinations add column if not exists stay_ar text;
alter table destinations add column if not exists entry_ar text;
alter table destinations add column if not exists method_ar text;

alter table applications add column if not exists locale text not null default 'en-EG';

update faqs set category_ar = 'معلومات عامة' where category = 'General Information' and category_ar is null;
update faqs set category_ar = 'الأهلية والمتطلبات' where category = 'Eligibility & Requirements' and category_ar is null;
update faqs set category_ar = 'إجراءات الطلب' where category = 'Application Process' and category_ar is null;
update faqs set category_ar = 'متابعة الحالة' where category = 'Status Tracking' and category_ar is null;
update faqs set category_ar = 'الاسترداد والرفض وإعادة التقديم' where category = 'Refunds, Rejections & Reapplications' and category_ar is null;
update faqs set category_ar = 'التمديد وتجاوز الإقامة' where category = 'Visa Extension & Overstays' and category_ar is null;
update faqs set category_ar = 'عام' where category = 'General' and category_ar is null;
update faqs set category_ar = 'الاسترداد' where category = 'Refunds' and category_ar is null;
update faqs set category_ar = 'الطوارئ' where category = 'Emergency' and category_ar is null;

update faqs set
  question_ar = 'هل يحتاج المواطن المصري تأشيرة لـ {country}؟',
  answer_ar = 'نعم. حامل الجواز المصري يحتاج تأشيرة سارية لدخول {country}. تعرض هذه الصفحة النوع والرسم والتاريخ الذي نسعى لإنهاء المراجعة فيه قبل الدفع.'
where question = 'Do Egyptian citizens need a visa for {country}?' and question_ar is null;

update faqs set
  question_ar = 'أي نوع من تأشيرة {country} أطلب؟',
  answer_ar = 'للسياحة والزيارات القصيرة اطلب النوع الظاهر في هذه الصفحة. للعمل أو الدراسة أو الإقامة تواصل مع الفريق لاختيار الفئة المناسبة.'
where question = 'What type of {country} visa should I apply for?' and question_ar is null;

update faqs set
  question_ar = 'كم تكلفة تأشيرة {country}؟',
  answer_ar = 'الإجمالي الظاهر هو رسم الجهة مضافاً إليه رسم الخدمة. تغييرات الرسوم من لوحة الإدارة تظهر في سجل الرسوم.'
where question = 'How much does the {country} visa cost?' and question_ar is null;

update faqs set
  question_ar = 'ما المستندات اللازمة لتأشيرة {country}؟',
  answer_ar = 'المستندات المطلوبة مذكورة في هذه الصفحة. أغلب المتقدمين يحتاجون جوازاً وصورة حديثة. يراجع الفريق الملفات بعد الدفع. لا يُرسل شيء إلى جهة تلقائياً.'
where question = 'Which documents do I need for a {country} visa?' and question_ar is null;

update faqs set
  question_ar = 'كم يجب أن تكون صلاحية الجواز؟',
  answer_ar = 'يفضل أن يكون الجواز صالحاً 6 أشهر على الأقل من تاريخ الوصول إلى {country} وفيه صفحتان فارغتان على الأقل.'
where question = 'How long must my passport be valid?' and question_ar is null;

update faqs set
  question_ar = 'هل أقدّم لعائلتي في طلب واحد؟',
  answer_ar = 'نعم. أضف كل المسافرين في طلب واحد. ترفع مرة، وتدفع مرة، ويظهر تاريخ مستهدف واحد للمجموعة.'
where question = 'Can I apply for my family in one application?' and question_ar is null;

update faqs set
  question_ar = 'كيف أطلب تأشيرة {country} عبر الإنترنت؟',
  answer_ar = 'اختر تاريخ المغادرة، وأضف المسافرين، وارفع الجواز والصورة، ثم راجع وادفع. يراجع الفريق الملف بعد ذلك. التقديم إلى الجهة خطوة يدوية من لوحة الإدارة.'
where question = 'How do I apply for a {country} visa online?' and question_ar is null;

update faqs set
  question_ar = 'متى أقدّم؟',
  answer_ar = 'قدّم عندما تثبت تواريخ السفر. التاريخ المستهدف يظهر قبل الدفع حتى تتأكد أنه يناسب رحلتك.'
where question = 'How early should I apply?' and question_ar is null;

update faqs set
  question_ar = 'كيف أتابع طلب تأشيرة {country}؟',
  answer_ar = 'سجّل الدخول وافتح الطلب. ترى الحالة التي يضبطها الفريق، بما فيها فحص المستندات. لا يوجد بث مباشر من الجهة.'
where question = 'How can I track my {country} visa application?' and question_ar is null;

update faqs set
  question_ar = 'هل يصلني إشعار عند الموافقة؟',
  answer_ar = 'نعم. يصلك بريد عندما يضبط الفريق الحالة، ويظهر ملف التأشيرة في حسابك بعد رفعه.'
where question = 'Will I be notified when my visa is approved?' and question_ar is null;

update faqs set
  question_ar = 'ماذا لو تأخرت تأشيرة {country}؟',
  answer_ar = 'إذا بقي الملف مفتوحاً بعد التاريخ المستهدف، اطلب استرداداً من حسابك. يراجعه موظف. لا يُصرف تلقائياً.'
where question = 'What happens if my {country} visa is late?' and question_ar is null;

update faqs set
  question_ar = 'ماذا لو رُفضت تأشيرة {country}؟',
  answer_ar = 'الرفض لا يعيد الرسم تلقائياً. اطلب مراجعة من حسابك. ملاحظات الرفض تظهر للوجهة فقط إذا أدخلها الفريق.'
where question = 'What if my {country} visa is rejected?' and question_ar is null;

update faqs set
  question_ar = 'هل أمدد تأشيرة {country}؟',
  answer_ar = 'التمديد يعتمد على قواعد هجرة {country}. تواصل مع الدعم قبل انتهاء التأشيرة.'
where question = 'Can I extend my {country} visa?' and question_ar is null;

update faqs set
  question_ar = 'ماذا لو تجاوزت مدة الإقامة؟',
  answer_ar = 'تجاوز الإقامة قد يؤدي إلى غرامات أو رفض لاحق. غادر قبل انتهاء المدة المسموحة.'
where question = 'What happens if I overstay?' and question_ar is null;

update faqs set
  question_ar = 'هل أحتاج تأشيرة لوجهتي؟',
  answer_ar = 'اختر الجواز والوجهة. تظهر الصفحة إن كانت التأشيرة مطلوبة، مع الرسم والمدة المستهدفة.'
where question = 'Do I need a visa for my destination?' and question_ar is null;

update faqs set
  question_ar = 'هل تقدّمون استرداداً؟',
  answer_ar = 'يمكنك طلب استرداد من حسابك قبل تعليم الطلب كمقدَّم. يوافق الموظف أو يرفض. لا يوجد استرداد تلقائي.'
where question = 'Do you give refunds?' and question_ar is null;

update reviews set
  title_ar = 'تأشيرة {country} بلا تعقيد',
  body_ar = 'قدّمت من الموقع وصدرت تأشيرة {country} خلال أيام. كان ذلك أوضح من البوابة الرسمية.'
where body = 'Applied on the website and my {country} visa was approved in a few days. Much easier than the official portal.' and body_ar is null;
