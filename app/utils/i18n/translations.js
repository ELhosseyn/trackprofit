/**
 * Internationalization utility for TrackProfit
 * Provides translation capabilities for English and Arabic
 */

// Default language setting
export const DEFAULT_LANGUAGE = 'ar';

// Available languages
export const LANGUAGES = {
  ar: {
    code: 'ar',
    name: 'العربية',
    dir: 'rtl',
    flagEmoji: '🇩🇿',
  },
  en: {
    code: 'en',
    name: 'English',
    dir: 'ltr',
    flagEmoji: '🇬🇧',
  }
};

// Function to determine the initial language from localStorage or browser settings
export const getInitialLanguage = () => {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    // First priority: check localStorage
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && LANGUAGES[savedLanguage]) {
      return savedLanguage;
    }
    
    // Second priority: check browser language
    const browserLanguage = navigator.language.split('-')[0];
    if (LANGUAGES[browserLanguage]) {
      return browserLanguage;
    }
  }
  
  // Default fallback
  return DEFAULT_LANGUAGE;
};

// Function to set the document direction based on language
export const setDocumentDirection = (language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = LANGUAGES[language]?.dir || 'rtl';
    document.documentElement.lang = language || DEFAULT_LANGUAGE;
  }
};

// Translation function
export const t = (key, language, params = {}) => {
  // Get the translation object for the current language
  const translations = language === 'en' ? en : ar;
  
  // Navigate through nested keys (e.g., 'dashboard.title')
  let value = key.split('.').reduce((obj, k) => obj && obj[k], translations);
  
  // Fallback to key if translation not found
  if (!value) {
    console.warn(`Translation missing for key: ${key} in language: ${language}`);
    return key;
  }
  
  // Check if value is an object - don't allow rendering objects directly
  if (typeof value === 'object' && value !== null) {
    console.warn(`Translation for key: ${key} is an object, not a string. Use a more specific key.`);
    return key; // Return the key as fallback
  }
  
  // Replace parameters in the translation string
  if (params && Object.keys(params).length) {
    Object.keys(params).forEach(param => {
      value = value.replace(`{{${param}}}`, params[param]);
    });
  }
  
  return value;
};

// Arabic translations
export const ar = {
  general: {
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    edit: 'تعديل',
    delete: 'حذف',
    search: 'بحث',
    noData: 'لا توجد بيانات',
    back: 'رجوع',
    next: 'التالي',
    close: 'إغلاق',
    currency: 'دج',
    today: 'اليوم',
    yesterday: 'أمس',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
    lastMonth: 'الشهر الماضي',
    custom: 'مخصص',
    apply: 'تطبيق',
    refresh: 'تحديث',
    tryAgain: 'حاول مرة أخرى',
    create: 'إنشاء',
    upload: 'تحميل',
    previous: 'السابق',
    connected: '🟢 متصل',
    disconnected: '🔴 غير متصل',
    loading: '⏳ جاري التحميل...',
    uploading: '⏳ جاري الرفع...',
    pageInfo: 'الصفحة {{current}} من {{total}}',
    page: 'الصفحة',
    of: 'من',
    totalCampaigns: 'إجمالي الحملات: {{count}}',
  },
  navigation: {
    home: 'الرئيسية',
    dashboard: 'لوحة التحكم',
    products: 'المنتجات',
    orders: 'الطلبات',
    shipping: 'الشحن',
    zrExpress: 'ZR Express',
    facebook: 'إعلانات فيسبوك',
    billing: 'الفواتير',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    additional: 'صفحة إضافية',
  },
  dashboard: {
    title: 'لوحة تحكم الأرباح',
    subtitle: 'تتبع أرباحك ومبيعاتك وأداء إعلاناتك في مكان واحد',
    dateRange: 'الفترة الزمنية',
    facebookAccount: 'حساب فيسبوك للإعلانات',
    selectAccount: 'اختر حساب الإعلانات',
    exchangeRate: 'سعر الصرف (دج/دولار)',
    updateData: 'تحديث البيانات',
    updating: 'جاري التحديث...',
    noDataTitle: 'ابدأ بتتبع أرباحك',
    noDataDesc: 'لا توجد بيانات لعرضها. يرجى البدء بإضافة شحناتك أو ربط حساب فيسبوك الإعلاني لرؤية التحليلات.',
    addShipments: 'إضافة شحنات',
    connectFacebook: 'ربط حساب فيسبوك',
    dataLoadingTitle: 'جاري تحميل البيانات...',
  },
  stats: {
    netProfit: 'صافي الربح',
    totalSales: 'إجمالي المبيعات',
    adCosts: 'تكلفة الإعلانات',
    shippingCancelFees: 'رسوم الشحن والإلغاء',
    cogsCosts: 'تكلفة البضاعة',
    totalShipments: 'إجمالي الشحنات',
    insufficientData: 'لا توجد بيانات كافية للعرض',
  },
  facebook: {
    title: 'أداء إعلانات فيسبوك',
    currency: 'العملة',
    metrics: {
      roas: 'عائد الإعلان (ROAS)',
      netRoas: 'العائد الصافي (Net ROAS)',
      netRoasSubtitle: 'بعد خصم تكلفة البضاعة',
      mer: 'كفاءة التسويق (MER)',
      adSpend: 'مصروف الإعلانات',
      adRevenue: 'إيراد الإعلانات',
      purchases: 'عدد المشتريات',
      impressions: 'عدد المشاهدات',
      costPerPurchase: 'تكلفة الشراء',
      costPerPurchaseSubtitle: 'متوسط تكلفة الشراء الواحد',
      cpm: 'تكلفة المشاهدة',
      cpmSubtitle: 'تكلفة الألف ظهور (CPM)',
      conversionRate: 'نسبة التحويل',
      conversionRateSubtitle: 'من المشاهدات إلى الشراء',
    },
    selectAccount: 'قم باختيار حساب فيسبوك للإعلانات',
    selectAccountDesc: 'اختر حساب فيسبوك للإعلانات من القائمة المنسدلة أعلاه لعرض بيانات الأداء',
    chooseAccount: 'اختر حساب',
    pageTitle: 'تحليلات إعلانات فيسبوك - TrackProfit',
    description: 'تتبع وحلل أداء حملات إعلانات فيسبوك، العائد على الاستثمار، والمقاييس في الوقت الحقيقي.',
    
    // حالة الاتصال
    connected: '✓ متصل',
    notConnected: '⚠ غير متصل',
    connectionSettings: '⚙️ إعدادات الاتصال',
    reconnectAccount: 'إعادة الاتصال بالحساب',
    
    // عناصر التحكم في لوحة القيادة
    dashboardControls: '📊 عناصر التحكم في لوحة القيادة',
    adAccount: 'حساب الإعلان',
    selectAdAccount: 'اختر حساب إعلان',
    dateRange: 'نطاق التاريخ',
    customDateRange: 'نطاق تاريخ مخصص',
    
    // الإجراءات
    createNewCampaign: '🚀 إنشاء حملة جديدة',
    saveAndConnect: 'حفظ & اتصال',
    cancel: 'إلغاء',
    
    // المقاييس
    performanceOverview: '📈 نظرة عامة على الأداء',
    adSpend: 'إنفاق الإعلان',
    revenue: 'الإيرادات',
    roas: 'ROAS',
    purchases: 'المشتريات',
    impressions: 'الانطباعات',
    costPerPurchase: 'تكلفة الشراء',
    
    // جدول الحملات
    campaign: 'الحملة',
    status: 'الحالة',
    objective: 'الهدف',
    spend: 'الإنفاق',
    budget: 'الميزانية',
    startDate: 'بداية',
    endDate: 'نهاية',
    totalCampaigns: '📊 إجمالي الحملات: {{count}}',
    noCampaigns: 'لا توجد حملات في هذه الفترة',
    tryDifferentFilters: 'حاول اختيار حساب إعلان مختلف أو تغيير نطاق التاريخ.',
    loadingAccount: 'جاري تحميل بيانات الحساب...',
    
    // إنشاء الحملة
    campaignDetails: 'تفاصيل الحملة',
    campaignName: 'اسم الحملة',
    campaignNameRequired: 'اسم الحملة مطلوب',
    campaignObjective: 'هدف الحملة',
    
    // الميزانية
    budgetAndSchedule: 'الميزانية والجدول الزمني',
    budgetType: 'نوع الميزانية',
    dailyBudget: 'الميزانية اليومية',
    lifetimeBudget: 'الميزانية مدى الحياة',
    budgetAmount: '{{type}} (USD)',
    
    // محتوى الإعلان
    adContent: 'محتوى الإعلان',
    adSetName: 'اسم مجموعة الإعلان',
    adSetNamePlaceholder: 'مثل، جمهور واسع - الولايات المتحدة',
    productId: 'معرف منتج Shopify',
    productIdHelp: 'المنتج الذي تريد الإعلان عنه من متجرك.',
    
    // الحالات
    active: 'نشط',
    paused: 'مؤقت',
    
    // الأهداف
    objectives: {
      LINK_CLICKS: 'حركة المرور (نقرات الروابط)',
      CONVERSIONS: 'التحويلات',
      BRAND_AWARENESS: 'زيادة الوعي بالعلامة التجارية'
    },
    
    // نطاقات التاريخ
    dateRanges: {
      today: 'اليوم',
      yesterday: 'أمس',
      last_7_days: 'آخر 7 أيام',
      last_30_days: 'آخر 30 يوم',
      this_month: 'هذا الشهر',
      last_month: 'الشهر الماضي',
      lifetime: 'مدى الحياة',
      custom: 'نطاق مخصص'
    },
    
    // الرسائل
    errors: {
      loading: 'خطأ في تحميل البيانات',
      action: 'خطأ في الإجراء',
      missingFields: 'حقول مطلوبة مفقودة. يرجى ملء جميع المعلومات المطلوبة.',
      invalidBudget: 'الرجاء إدخال مبلغ ميزانية صالح.',
      noAccounts: 'لا توجد حسابات إعلانات. يرجى التأكد من أن لديك وصول إلى حساب إعلان واحد على الأقل.',
      tokenExpired: 'انتهت صلاحية رمز وصول فيسبوك. يرجى إعادة الاتصال بحسابك.',
      connectionFailed: 'فشل الاتصال بفيسبوك. يرجى المحاولة مرة أخرى.',
      campaignCreateFailed: 'فشل إنشاء الحملة: {{message}}'
    },
    success: {
      connected: 'تم الاتصال بنجاح بفيسبوك مع {{count}} حسابات إعلانات!',
      campaignCreated: 'تم إنشاء الحملة بنجاح! الحملة حالياً مؤقتة وجاهزة لمراجعتك.'
    }
  },
  charts: {
    performanceAnalysis: 'تحليل الأداء',
    chartError: 'خطأ في تحميل الرسوم البيانية',
    chartErrorDesc: 'حدث خطأ أثناء تحميل الرسوم البيانية. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
    insufficientDataChart: 'بيانات غير كافية',
    insufficientDataDesc: 'لا توجد بيانات كافية لعرض المخطط',
    profitDistribution: 'توزيع الأرباح',
    performanceMetrics: 'مؤشرات الأداء',
  },
  diagnostics: {
    title: 'تشخيص البيانات',
    ordersWithCost: 'طلبات بتكلفة',
    totalCogsValue: 'مجموع تكلفة البضاعة',
    totalShipments: 'إجمالي الشحنات',
    shipmentsWithCost: 'شحنات بتكلفة',
    shippingFees: 'رسوم الشحن',
    cancelFees: 'رسوم الإلغاء',
  },
  roasCalculation: {
    title: 'معادلة حساب العائد الصافي (Net ROAS)',
    description: 'العائد الصافي هو مقياس دقيق لأداء الإعلانات بعد خصم تكلفة البضاعة المباعة.',
    formula: 'المعادلة',
    netRevenue: 'صافي الإيرادات = إيرادات الإعلانات - (إيرادات الإعلانات ÷ إجمالي الإيرادات × تكلفة البضاعة)',
    netRoas: 'العائد الصافي = صافي الإيرادات ÷ تكلفة الإعلانات',
    calculation: 'الحساب ببياناتك الحالية:',
    step1: '1. صافي إيرادات الإعلانات:',
    step2: '2. العائد الصافي:',
    finalResult: 'النتيجة النهائية (Net ROAS)',
    insufficientData: 'لا يمكن حساب العائد الصافي بسبب عدم وجود بيانات كافية.',
    learnMore: 'تعرف على المزيد',
  },
  products: {
    bestSelling: 'المنتج الأكثر مبيعاً',
    mostProfitable: 'المنتج الأكثر ربحاً',
    salesCount: 'عدد المبيعات:',
    netProfit: 'صافي الربح:',
    unavailable: 'غير متوفر',
    title: 'المنتجات',
    management: 'إدارة المنتجات',
    dashboard: 'لوحة تحكم المنتجات',
    totalProducts: 'عدد المنتجات',
    totalInventory: 'إجمالي المخزون',
    totalCost: 'إجمالي التكلفة',
    totalProfit: 'إجمالي الربح',
    avgProfit: 'متوسط الربح للمنتج',
    avgMargin: 'متوسط الهامش',
    loadingProducts: 'جاري تحميل المنتجات',
    noProducts: 'لا توجد منتجات',
    noProductsInRange: 'لا توجد منتجات في النطاق الزمني المحدد',
    updateCost: 'تحديث تكلفة المنتج',
    enterCostFor: 'أدخل التكلفة الجديدة للمنتج: {{title}}',
    cost: 'التكلفة',
    setCost: 'إدخال التكلفة',
    save: 'حفظ',
    cancel: 'إلغاء',
    table: {
      date: 'التاريخ',
      product: 'المنتج',
      category: 'الفئة',
      status: 'الحالة',
      price: 'السعر',
      cost: 'التكلفة',
      profit: 'الربح',
      margin: 'الهامش',
      inventory: 'المخزون',
      uncategorized: 'غير مصنف'
    },
    pagination: {
      previous: 'السابق',
      next: 'التالي',
      page: 'الصفحة',
      of: 'من',
      totalProducts: 'إجمالي المنتجات'
    },
    updating: 'جاري التحديث...',
    refreshed: 'تم تحديث البيانات',
    errors: {
      loading: 'خطأ في تحميل المنتجات',
      variantNotFound: 'لم يتم العثور على المنتج',
      invalidCost: 'الرجاء إدخال قيمة تكلفة صالحة',
      missingFields: 'حقول مطلوبة مفقودة'
    }
  },
  datePresets: {
    today: 'اليوم',
    last7Days: 'آخر 7 أيام',
    last30Days: 'آخر 30 يوم',
    thisMonth: 'هذا الشهر',
    last3Months: 'آخر 3 أشهر',
    last6Months: 'آخر 6 أشهر',
    thisYear: 'هذه السنة',
  },
  toast: {
    accountUpdated: 'تم تحديث بيانات حساب {{account}} بنجاح',
    dataUpdated: 'تم تحديث البيانات للفترة: {{period}} بنجاح',
    exchangeRateUpdated: 'تم تحديث سعر الصرف إلى {{rate}} دج/دولار',
    updatingAccount: 'جاري تحديث بيانات حساب {{account}}...',
    updatingPeriod: 'جاري تحديث البيانات للفترة: {{period}}...',
    shipmentCreated: 'تم إنشاء الشحنة بنجاح',
  },
  errors: {
    general: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    dataFetch: 'خطأ في تحميل البيانات',
    chartLoad: 'خطأ في تحميل الرسم البياني',
    subscriptionAPIError: 'حدث خطأ في الاتصال بواجهة برمجة تطبيقات Shopify. قد تكون بعض الميزات محدودة.',
    ordersLoading: 'خطأ في تحميل الطلبات',
    shipmentCreation: 'فشل في إنشاء الشحنة: {{error}}'
  },
  orders: {
    title: 'الطلبات',
    noOrders: 'لا توجد طلبات',
    createShipment: 'إنشاء شحنة',
    datePresets: {
      today: 'اليوم',
      last7Days: 'آخر 7 أيام',
      thisMonth: 'هذا الشهر',
      last3Months: 'آخر 3 أشهر',
      last6Months: 'آخر 6 أشهر',
      thisYear: 'هذه السنة',
    },
    dateRange: 'المدة الزمنية',
    selectDate: 'اختر التاريخ',
    apply: 'تطبيق',
    cancel: 'إلغاء',
    stats: {
      totalOrders: 'إجمالي الطلبات',
      totalRevenue: 'إجمالي الإيرادات',
      totalCost: 'إجمالي التكلفة',
      totalProfit: 'إجمالي الربح',
      avgOrderValue: 'متوسط قيمة الطلب',
      avgProfit: 'متوسط الربح',
    },
    orderDetails: 'تفاصيل الطلب',
    shipmentDetails: 'تفاصيل الشحنة',
    customer: 'العميل',
    phone: 'الهاتف',
    secondaryPhone: 'هاتف ثانوي',
    address: 'العنوان',
    wilaya: 'الولاية',
    commune: 'البلدية',
    state: 'الولاية',
    city: 'المدينة',
    
    // Form placeholders
    selectWilayaFirst: 'اختر الولاية أولاً',
    selectCommune: 'اختر البلدية',
    
    total: 'المبلغ الإجمالي',
    productName: 'اسم المنتج',
    deliveryType: 'نوع التوصيل',
    packageType: 'نوع الطرد',
    confirmationStatus: 'حالة التأكيد',
    note: 'ملاحظة',
    createShipmentButton: 'إنشاء شحنة',
    table: {
      order: 'الطلب',
      date: 'التاريخ',
      customer: 'العميل',
      total: 'المبلغ',
      status: 'الحالة',
      actions: 'الإجراءات',
    },
    filter: {
      searchPlaceholder: 'بحث عن طلب...',
    },
    pagination: {
      previous: 'السابق',
      next: 'التالي',
      of: 'من',
      page: 'صفحة',
      totalOrders: 'إجمالي الطلبات'
    },
    deliveryTypes: {
      home: 'توصيل منزلي',
      office: 'مكتب التوصيل'
    },
    packageTypes: {
      regular: 'طرد عادي',
      exchange: 'طرد تبديل'
    },
    confirmationStatus: {
      label: 'حالة التأكيد',
      confirmed: 'مؤكد',
      notConfirmed: 'غير مؤكد'
    },
    loadingOrders: 'جاري تحميل الطلبات...',
    noOrdersInRange: 'لا توجد طلبات في هذا النطاق الزمني',
    dashboardTitle: 'لوحة تحكم الطلبات',
    
    // Add missing Arabic translations for all order-related terms
    orderNumber: 'رقم الطلب',
    fulfillment: 'تجهيز الطلب',
    payment: 'الدفع',
    delivery: 'التوصيل',
    view: 'عرض',
    unknown: 'غير معروف',
    unfulfilled: 'غير مجهز',
    anonymous: 'مجهول',
    noAddress: 'لا يوجد عنوان',
    profit: 'الربح',
    actions: 'الإجراءات',
    showing: 'عرض',
    of: 'من',
    orders: 'طلبات',
    cachedData: 'بيانات مخزنة',
    
    productDescription: 'وصف المنتج',
    notes: 'ملاحظات',
    totalSummary: 'المجموع',
    cost: 'التكلفة:',
    profit: 'الربح:',
    updating: 'جاري التحديث',
  },
  zrExpress: {
    title: 'ZR Express - إدارة الشحن',
    createNewShipment: '➕ إنشاء شحنة جديدة',
    connectionSettings: '⚙️ إعدادات الاتصال',
    uploadExcel: '📤 تحميل ملف Excel',
    fileSelected: 'تم اختيار الملف',
    
    // Date Range
    dateRange: '📅 الفترة الزمنية',
    showingResultsFrom: 'عرض النتائج من {{startDate}} إلى {{endDate}}',
    
    // Date Range Options
    today: 'اليوم',
    lastSevenDays: 'آخر 7 أيام',
    thisMonth: 'هذا الشهر',
    lastThreeMonths: 'آخر 3 أشهر',
    lastSixMonths: 'آخر 6 أشهر',
    thisYear: 'هذه السنة',
    custom: 'مخصص',
    
    // Dashboard
    dashboard: '📊 لوحة التحكم',
    connectionError: 'خطأ في الاتصال',
    
    // Stats
    totalSales: '💰 إجمالي المبيعات',
    shippingCancelFees: '🚚 رسوم الشحن والإلغاء',
    netRevenue: '💎 صافي الإيرادات',
    delivered: '✅ طرود مسلمة',
    inPreparation: '⏳ قيد التحضير',
    inTransit: '🚛 قيد التوصيل',
    
    // Table
    preparingData: 'جاري تحضير البيانات...',
    noShipmentsFound: 'لا توجد شحنات في النطاق الزمني المحدد',
    date: '📅 التاريخ',
    trackingNumber: '🏷️ رقم الشحنة',
    client: '👤 العميل',
    phone1: '📱 الهاتف 1',
    phone2: '📱 الهاتف 2',
    wilaya: '🏘️ الولاية',
    commune: '🏙️ البلدية',
    status: '📊 الحالة',
    amount: '💰 المبلغ',
    totalShipments: '📊 إجمالي الشحنات: {{count}}',
    page: '| الصفحة {{currentPage}} من {{totalPages}}',
    
    // Modals
    connectionSettingsTitle: 'إعدادات الاتصال',
    createNewShipmentTitle: 'إنشاء شحنة جديدة',
    
    // Form Fields
    clientName: 'اسم العميل',
    phone1Label: 'رقم الهاتف 1',
    phone2Label: 'رقم الهاتف 2 (اختياري)',
    address: 'العنوان',
    wilayaLabel: 'الولاية',
    communeLabel: 'البلدية',
    totalAmount: 'المبلغ الإجمالي (دج)',
    orderId: 'رقم الطلب (لحساب التكلفة)',
    orderIdHelp: 'أدخل رقم طلب Shopify لحساب تكلفة المنتج',
    deliveryType: 'نوع التوصيل',
    homeDelivery: 'توصيل للمنزل',
    stopDesk: 'توصيل للمكتب',
    deliveryPrice: 'سعر التوصيل: {{price}} دج',
    packageType: 'نوع الطرد',
    regularPackage: 'طرد عادي',
    exchange: 'تبديل',
    productType: 'نوع المنتج',
    notes: 'ملاحظات (اختياري)',
    selectWilayaFirst: 'اختر الولاية أولاً',
    selectCommune: 'اختر البلدية',
    
    // Messages
    invalidCredentials: 'بيانات الاعتماد غير صالحة. يرجى التحقق من الرمز والمفتاح.',
    credentialsRequired: 'رمز الوصول ومفتاح الوصول مطلوبان',
    invalidCredentialsMessage: 'بيانات الاعتماد غير صالحة - يرجى التحقق من الرمز والمفتاح',
    errorValidatingCredentials: 'حدث خطأ أثناء التحقق أو حفظ بيانات الاعتماد',
    fieldRequired: 'الحقل {{field}} مطلوب',
    selectFileFirst: 'الرجاء اختيار ملف أولا',
    selectExcelFile: 'يرجى تحديد ملف Excel (.xlsx, .xls)',
    dataUpdatedSuccess: 'تم تحديث البيانات بنجاح!',
  },
  facebookAds: {
    title: 'مركز إعلانات فيسبوك',
    connectionStatus: {
      connected: '✓ متصل',
      notConnected: '⚠ غير متصل',
    },
    actions: {
      createCampaign: '🚀 إنشاء حملة جديدة',
      connectionSettings: '⚙️ إعدادات الاتصال',
      reconnectAccount: 'إعادة ربط الحساب',
    },
    errors: {
      dataLoading: 'خطأ في تحميل البيانات',
      actionError: 'خطأ في الإجراء',
      tokenError: 'انتهت صلاحية رمز الوصول. يرجى إعادة ربط حسابك.',
      noAccounts: 'لم يتم العثور على حسابات إعلانية. تأكد من وصولك لحساب إعلاني واحد على الأقل.',
    },
    success: {
      connected: 'تم الاتصال بنجاح بفيسبوك مع {{count}} حساب إعلاني!',
      campaignCreated: 'تم إنشاء الحملة بنجاح! الحملة متوقفة حالياً وجاهزة للمراجعة.',
    },
    dashboard: {
      controls: '📊 لوحة التحكم',
      performance: '📈 نظرة عامة على الأداء',
    },
    filters: {
      adAccount: 'حساب الإعلانات',
      selectAccount: 'اختر حساب إعلانات',
      dateRange: 'النطاق الزمني',
      customDateRange: 'نطاق زمني مخصص',
    },
    metrics: {
      adSpend: 'نفقات الإعلانات',
      revenue: 'الإيرادات',
      roas: 'العائد على الإنفاق الإعلاني',
      purchases: 'المشتريات',
      impressions: 'المشاهدات',
      costPerPurchase: 'تكلفة الشراء',
    },
    dateRanges: {
      today: 'اليوم',
      yesterday: 'الأمس',
      last7days: 'آخر 7 أيام',
      last30days: 'آخر 30 يوماً',
      thisMonth: 'هذا الشهر',
      lastMonth: 'الشهر الماضي',
      lifetime: 'منذ البداية',
      custom: 'نطاق مخصص',
    },
    campaign: {
      create: {
        title: 'إنشاء حملة فيسبوك جديدة',
        details: 'تفاصيل الحملة',
        name: 'اسم الحملة',
        nameRequired: 'اسم الحملة مطلوب',
        objective: 'هدف الحملة',
        objectives: {
          linkClicks: 'الزيارات (النقرات)',
          conversions: 'التحويلات',
          brandAwareness: 'الوعي بالعلامة التجارية',
        },
        budget: {
          title: 'الميزانية والجدولة',
          type: 'نوع الميزانية',
          daily: 'ميزانية يومية',
          lifetime: 'ميزانية إجمالية',
          amount: 'الميزانية (دولار أمريكي)',
        },
        content: {
          title: 'محتوى الإعلان',
          adSetName: 'اسم مجموعة الإعلانات',
          adSetPlaceholder: 'مثال: US - الجمهور العام',
          productId: 'معرف المنتج في Shopify',
          productIdHelp: 'المنتج الذي تريد الإعلان عنه من متجرك',
        },
      },
      status: {
        active: 'نشطة',
        paused: 'متوقفة',
        deleted: 'محذوفة',
      },
      table: {
        campaign: 'الحملة',
        status: 'الحالة',
        objective: 'الهدف',
        spend: 'الإنفاق',
        revenue: 'الإيرادات',
        roas: 'العائد',
        impressions: 'المشاهدات',
        purchases: 'المشتريات',
        costPerPurchase: 'تكلفة/شراء',
        budget: 'الميزانية',
        start: 'بداية',
        end: 'نهاية',
        total: 'إجمالي الحملات: {{count}}',
      },
    },
    connect: {
      title: 'ربط حساب فيسبوك',
      instructions: 'للبدء، يرجى تقديم رمز وصول المستخدم من Facebook Graph API Explorer مع أذونات `ads_read` و `ads_management`.',
      tokenLabel: 'رمز وصول فيسبوك',
      tokenPlaceholder: 'الصق رمز الوصول الخاص بك هنا...',
      saveAndConnect: 'حفظ وربط',
    },
  },
};

// English translations
export const en = {
  general: {
    loading: 'Loading...',
    error: 'An error occurred',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Search',
    noData: 'No data available',
    back: 'Back',
    next: 'Next',
    close: 'Close',
    currency: 'DZD',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    custom: 'Custom',
    apply: 'Apply',
    refresh: 'Refresh',
    tryAgain: 'Try Again',
    create: 'Create',
    upload: 'Upload',
    previous: 'Previous',
    connected: '🟢 Connected',
    disconnected: '🔴 Disconnected',
    loading: '⏳ Loading...',
    uploading: '⏳ Uploading...',
    pageInfo: 'Page {{current}} of {{total}}',
    page: 'Page',
    of: 'of',
    totalCampaigns: 'Total Campaigns: {{count}}',
  },
  navigation: {
    home: 'Home',
    dashboard: 'Dashboard',
    products: 'Products',
    orders: 'Orders',
    shipping: 'Shipping',
    zrExpress: 'ZR Express',
    facebook: 'Facebook Ads',
    billing: 'Billing',
    settings: 'Settings',
    logout: 'Logout',
    additional: 'Additional Page',
  },
  dashboard: {
    title: 'Profit Dashboard',
    subtitle: 'Track your profits, sales, and ad performance in one place',
    dateRange: 'Date Range',
    facebookAccount: 'Facebook Ad Account',
    selectAccount: 'Select Ad Account',
    exchangeRate: 'Exchange Rate (DZD/USD)',
    updateData: 'Update Data',
    updating: 'Updating...',
    noDataTitle: 'Start Tracking Your Profits',
    noDataDesc: 'No data to display. Please start by adding your shipments or connecting your Facebook ad account to see analytics.',
    addShipments: 'Add Shipments',
    connectFacebook: 'Connect Facebook',
    dataLoadingTitle: 'Loading data...',
  },
  stats: {
    netProfit: 'Net Profit',
    totalSales: 'Total Sales',
    adCosts: 'Ad Costs',
    shippingCancelFees: 'Shipping & Cancel Fees',
    cogsCosts: 'COGS',
    totalShipments: 'Total Shipments',
    insufficientData: 'Insufficient data to display',
  },
  facebook: {
    title: 'Facebook Ad Center',
    pageTitle: 'Facebook Ads Analytics - TrackProfit',
    description: 'Track and analyze your Facebook ad campaigns performance, ROI, and metrics in real-time.',
    
    // Connection Status
    connected: '✓ Connected',
    notConnected: '⚠ Not Connected',
    connectionSettings: '⚙️ Connection Settings',
    reconnectAccount: 'Reconnect Account',
    
    // Dashboard Controls
    dashboardControls: '📊 Dashboard Controls',
    adAccount: 'Ad Account',
    selectAdAccount: 'Select an ad account',
    dateRange: 'Date Range',
    customDateRange: 'Custom Date Range',
    
    // Actions
    createNewCampaign: '🚀 Create New Campaign',
    saveAndConnect: 'Save & Connect',
    cancel: 'Cancel',
    
    // Metrics
    performanceOverview: '📈 Performance Overview',
    adSpend: 'Ad Spend',
    revenue: 'Revenue',
    roas: 'ROAS',
    purchases: 'Purchases',
    impressions: 'Impressions',
    costPerPurchase: 'Cost per Purchase',
    
    // Campaign Table
    campaign: 'Campaign',
    status: 'Status',
    objective: 'Objective',
    spend: 'Spend',
    revenue: 'Revenue',
    roas: 'ROAS',
    impressions: 'Impressions',
    purchases: 'Purchases',
    costPerPurchase: 'Cost/Purchase',
    budget: 'Budget',
    start: 'Start',
    end: 'End',
    totalCampaigns: '📊 Total Campaigns: {{count}}',
    noCampaigns: 'No campaigns found for this period',
    tryDifferentFilters: 'Try selecting a different ad account or changing the date range.',
    loadingAccount: 'Loading account data...',
    
    // Campaign Creation
    campaignDetails: 'Campaign Details',
    campaignName: 'Campaign Name',
    campaignNameRequired: 'Campaign name is required',
    campaignObjective: 'Campaign Objective',
    
    // Budget
    budgetAndSchedule: 'Budget & Schedule',
    budgetType: 'Budget Type',
    dailyBudget: 'Daily Budget',
    lifetimeBudget: 'Lifetime Budget',
    budgetAmount: '{{type}} (USD)',
    
    // Ad Content
    adContent: 'Ad Content',
    adSetName: 'Ad Set Name',
    adSetNamePlaceholder: 'e.g., US - Broad Audience',
    productId: 'Shopify Product ID',
    productIdHelp: 'The product you want to advertise from your store.',
    
    // Statuses
    active: 'Active',
    paused: 'Paused',
    
    // Objectives
    objectives: {
      LINK_CLICKS: 'Traffic (Link Clicks)',
      CONVERSIONS: 'Conversions',
      BRAND_AWARENESS: 'Brand Awareness'
    },
    
    // Date Ranges
    dateRanges: {
      today: 'Today',
      yesterday: 'Yesterday',
      last_7_days: 'Last 7 days',
      last_30_days: 'Last 30 days',
      this_month: 'This month',
      last_month: 'Last month',
      lifetime: 'Lifetime',
      custom: 'Custom range'
    },
    
    // Messages
    errors: {
      loading: 'Data Loading Error',
      action: 'Action Error',
      missingFields: 'Missing required fields. Please fill in all required information.',
      invalidBudget: 'Please enter a valid budget amount.',
      noAccounts: 'No ad accounts found. Please make sure you have access to at least one ad account.',
      tokenExpired: 'Facebook access token has expired. Please reconnect your account.',
      connectionFailed: 'Failed to connect to Facebook. Please try again.',
      campaignCreateFailed: 'Failed to create campaign: {{message}}'
    },
    success: {
      connected: 'Successfully connected to Facebook with {{count}} ad accounts!',
      campaignCreated: 'Campaign created successfully! The campaign is currently paused and ready for your review.'
    }
  },
  charts: {
    performanceAnalysis: 'Performance Analysis',
    chartError: 'Error Loading Charts',
    chartErrorDesc: 'An error occurred while loading the charts. Please refresh the page and try again.',
    insufficientDataChart: 'Insufficient Data',
    insufficientDataDesc: 'Not enough data to display the chart',
    profitDistribution: 'Profit Distribution',
    performanceMetrics: 'Performance Metrics',
  },
  diagnostics: {
    title: 'Data Diagnostics',
    ordersWithCost: 'Orders with Cost',
    totalCogsValue: 'Total COGS Value',
    totalShipments: 'Total Shipments',
    shipmentsWithCost: 'Shipments with Cost',
    shippingFees: 'Shipping Fees',
    cancelFees: 'Cancellation Fees',
  },
  roasCalculation: {
    title: 'Net ROAS Calculation Formula',
    description: 'Net ROAS is a precise measure of ad performance after deducting the cost of goods sold.',
    formula: 'Formula',
    netRevenue: 'Net Revenue = Ad Revenue - (Ad Revenue ÷ Total Revenue × COGS)',
    netRoas: 'Net ROAS = Net Revenue ÷ Ad Costs',
    calculation: 'Calculation with your current data:',
    step1: '1. Net Ad Revenue:',
    step2: '2. Net ROAS:',
    finalResult: 'Final Result (Net ROAS)',
    insufficientData: 'Cannot calculate Net ROAS due to insufficient data.',
    learnMore: 'Learn More',
  },
  products: {
    bestSelling: 'Best Selling Product',
    mostProfitable: 'Most Profitable Product',
    salesCount: 'Sales Count:',
    netProfit: 'Net Profit:',
    unavailable: 'Unavailable',
    title: 'Products',
    management: 'Products Management',
    dashboard: 'Products Dashboard',
    totalProducts: 'Total Products',
    totalInventory: 'Total Inventory',
    totalCost: 'Total Cost',
    totalProfit: 'Total Profit',
    avgProfit: 'Avg. Profit / Product',
    avgMargin: 'Avg. Margin',
    loadingProducts: 'Loading products',
    noProducts: 'No products found',
    noProductsInRange: 'No products found in the selected date range',
    updateCost: 'Update Product Cost',
    enterCostFor: 'Enter the new cost for: {{title}}',
    cost: 'Cost',
    setCost: 'Set Cost',
    save: 'Save',
    cancel: 'Cancel',
    table: {
      date: 'Date',
      product: 'Product',
      category: 'Category',
      status: 'Status',
      price: 'Price',
      cost: 'Cost',
      profit: 'Profit',
      margin: 'Margin',
      inventory: 'Inventory',
      uncategorized: 'Uncategorized'
    },
    pagination: {
      previous: 'Previous',
      next: 'Next',
      page: 'Page',
      of: 'of',
      totalProducts: 'Total Products'
    },
    updating: 'Updating...',
    refreshed: 'Data refreshed',
    errors: {
      loading: 'Error loading products',
      variantNotFound: 'Product variant not found',
      invalidCost: 'Please enter a valid cost value',
      missingFields: 'Missing required fields'
    }
  },
  datePresets: {
    today: 'Today',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    thisMonth: 'This Month',
  },
  toast: {
    accountUpdated: 'Successfully updated data for {{account}} account',
    dataUpdated: 'Successfully updated data for period: {{period}}',
    exchangeRateUpdated: 'Exchange rate updated to {{rate}} DZD/USD',
    updatingAccount: 'Updating data for {{account}} account...',
    updatingPeriod: 'Updating data for period: {{period}}...',
    shipmentCreated: 'Shipment created successfully',
  },
  errors: {
    general: 'An error occurred. Please try again.',
    dataFetch: 'Error loading data',
    chartLoad: 'Error loading chart',
    subscriptionAPIError: 'There was an issue connecting to the Shopify API. Some features may be limited.',
    ordersLoading: 'Error loading orders',
    shipmentCreation: 'Failed to create shipment: {{error}}'
  },
  orders: {
    title: 'Orders',
    noOrders: 'No orders found',
    createShipment: 'Create Shipment',
    datePresets: {
      today: 'Today',
      last7Days: 'Last 7 Days',
      thisMonth: 'This Month',
      last3Months: 'Last 3 Months',
      last6Months: 'Last 6 Months',
      thisYear: 'This Year',
    },
    dateRange: 'Date Range',
    selectDate: 'Select Date',
    apply: 'Apply',
    cancel: 'Cancel',
    stats: {
      totalOrders: 'Total Orders',
      totalRevenue: 'Total Revenue',
      totalCost: 'Total Cost',
      totalProfit: 'Total Profit',
      avgOrderValue: 'Avg Order Value',
      avgProfit: 'Avg Profit',
    },
    orderDetails: 'Order Details',
    shipmentDetails: 'Shipment Details',
    customer: 'Customer',
    phone: 'Phone',
    secondaryPhone: 'Secondary Phone',
    address: 'Address',
    state: 'State',
    city: 'City',
    wilaya: 'wilaya',
    commune: 'commune',
    
    // Add missing translations to handle all order-related terms
    orderNumber: 'Order Number',
    fulfillment: 'Fulfillment',
    payment: 'Payment',
    delivery: 'Delivery',
    view: 'View',
    unknown: 'Unknown',
    unfulfilled: 'Unfulfilled',
    anonymous: 'Anonymous',
    noAddress: 'No Address',
    profit: 'Profit',
    actions: 'Actions',
    showing: 'Showing',
    of: 'of',
    orders: 'orders',
    cachedData: 'Cached Data',
    
    // Form placeholders
    selectWilayaFirst: 'Select wilaya first',
    selectCommune: 'Select commune',
    
    total: 'Total Amount',
    productName: 'Product Name',
    deliveryType: 'Delivery Type',
    packageType: 'Package Type',
    confirmationStatus: {
      label: 'Confirmation Status',
      confirmed: 'Confirmed',
      notConfirmed: 'Not Confirmed'
    },
    note: 'Note',
    createShipmentButton: 'Create Shipment',
    table: {
      order: 'Order',
      date: 'Date',
      customer: 'Customer',
      total: 'Amount',
      status: 'Status',
      actions: 'Actions',
    },
    filter: {
      searchPlaceholder: 'Search orders...',
    },
    pagination: {
      previous: 'Previous',
      next: 'Next',
      of: 'of',
      page: 'Page',
      totalOrders: 'Total Orders'
    },
    deliveryTypes: {
      home: 'Home Delivery',
      office: 'Delivery Office'
    },
    packageTypes: {
      regular: 'Regular Package',
      exchange: 'Exchange Package'
    },
    confirmationStatus: {
      label: 'Confirmation Status',
      confirmed: 'Confirmed',
      notConfirmed: 'Not Confirmed'
    },
    loadingOrders: 'Loading orders...',
    noOrdersInRange: 'No orders found in this date range',
    dashboardTitle: 'Orders Dashboard',
    productDescription: 'Product Description',
    notes: 'Notes',
    totalSummary: 'Total',
    cost: 'Cost:',
    profit: 'Profit:',
    updating: 'Updating',
  },
  zrExpress: {
    title: 'ZR Express - Shipping Management',
    createNewShipment: '➕ Create New Shipment',
    connectionSettings: '⚙️ Connection Settings',
    uploadExcel: '📤 Upload Excel File',
    fileSelected: 'File Selected',
    
    // Date Range
    dateRange: '📅 Date Range',
    showingResultsFrom: 'Showing results from {{startDate}} to {{endDate}}',
    
    // Date Range Options
    today: 'Today',
    lastSevenDays: 'Last 7 days',
    thisMonth: 'This month',
    lastThreeMonths: 'Last 3 months',
    lastSixMonths: 'Last 6 months',
    thisYear: 'This year',
    custom: 'Custom',
    
    // Dashboard
    dashboard: '📊 Dashboard',
    connectionError: 'Connection Error',
    
    // Stats
    totalSales: '💰 Total Sales',
    shippingCancelFees: '🚚 Shipping & Cancel Fees',
    netRevenue: '💎 Net Revenue',
    delivered: '✅ Delivered',
    inPreparation: '⏳ In Preparation',
    inTransit: '🚛 In Transit',
    
    // Table
    preparingData: 'Preparing data...',
    noShipmentsFound: 'No shipments found in the selected date range',
    date: '📅 Date',
    trackingNumber: '🏷️ Tracking #',
    client: '👤 Client',
    phone1: '📱 Phone 1',
    phone2: '📱 Phone 2',
    wilaya: '🏘️ Wilaya',
    commune: '🏙️ Commune',
    status: '📊 Status',
    amount: '💰 Amount',
    totalShipments: '📊 Total Shipments: {{count}} | Page {{currentPage}} of {{totalPages}}',
    page: 'Page {{currentPage}} of {{totalPages}}',
    
    // Modals
    connectionSettingsTitle: 'Connection Settings',
    createNewShipmentTitle: 'Create New Shipment',
    
    // Form Fields
    clientName: 'Client Name',
    phone1Label: 'Phone Number 1',
    phone2Label: 'Phone Number 2 (Optional)',
    address: 'Full Address',
    wilayaLabel: 'Wilaya',
    communeLabel: 'Commune',
    totalAmount: 'Total Amount (DZD)',
    orderId: 'Order ID (for COGS)',
    orderIdHelp: 'Enter Shopify order ID to calculate product cost',
    deliveryType: 'Delivery Type',
    homeDelivery: 'Home Delivery',
    stopDesk: 'Stop Desk',
    deliveryPrice: 'Delivery Price: {{price}} DZD',
    packageType: 'Package Type',
    regularPackage: 'Regular Package',
    exchange: 'Exchange',
    productType: 'Product Type',
    notes: 'Notes (Optional)',
    selectWilayaFirst: 'Select wilaya first',
    selectCommune: 'Select commune',
    
    // Messages
    invalidCredentials: 'Invalid credentials. Please check your token and key.',
    credentialsRequired: 'Token and key are required',
    invalidCredentialsMessage: 'Invalid credentials - please check your token and key',
    errorValidatingCredentials: 'Error validating or saving credentials',
    fieldRequired: 'Field {{field}} is required',
    selectFileFirst: 'Please select a file first',
    selectExcelFile: 'Please select an Excel file (.xlsx, .xls)',
    dataUpdatedSuccess: 'Data updated successfully!',
  },
  facebookAds: {
    title: 'Facebook Ad Center',
    connectionStatus: {
      connected: '✓ Connected',
      notConnected: '⚠ Not Connected',
    },
    actions: {
      createCampaign: '🚀 Create New Campaign',
      connectionSettings: '⚙️ Connection Settings',
      reconnectAccount: 'Reconnect Account',
    },
    errors: {
      dataLoading: 'Data Loading Error',
      actionError: 'Action Error',
      tokenError: 'Facebook access token has expired. Please reconnect your account.',
      noAccounts: 'No ad accounts found. Please make sure you have access to at least one ad account.',
    },
    success: {
      connected: 'Successfully connected to Facebook with {{count}} ad accounts!',
      campaignCreated: 'Campaign created successfully! The campaign is currently paused and ready for your review.',
    },
    dashboard: {
      controls: '📊 Dashboard Controls',
      performance: '📈 Performance Overview',
    },
    filters: {
      adAccount: 'Ad Account',
      selectAccount: 'Select an ad account',
      dateRange: 'Date Range',
      customDateRange: 'Custom Date Range',
    },
    metrics: {
      adSpend: 'Ad Spend',
      revenue: 'Revenue',
      roas: 'ROAS',
      purchases: 'Purchases',
      impressions: 'Impressions',
      costPerPurchase: 'Cost per Purchase',
    },
    dateRanges: {
      today: 'Today',
      yesterday: 'Yesterday',
      last7days: 'Last 7 days',
      last30days: 'Last 30 days',
      thisMonth: 'This month',
      lastMonth: 'Last month',
      lifetime: 'Lifetime',
      custom: 'Custom range',
    },
    campaign: {
      create: {
        title: 'Create New Facebook Campaign',
        details: 'Campaign Details',
        name: 'Campaign Name',
        nameRequired: 'Campaign name is required',
        objective: 'Campaign Objective',
        objectives: {
          linkClicks: 'Traffic (Link Clicks)',
          conversions: 'Conversions',
          brandAwareness: 'Brand Awareness',
        },
        budget: {
          title: 'Budget & Schedule',
          type: 'Budget Type',
          daily: 'Daily Budget',
          lifetime: 'Lifetime Budget',
          amount: 'Budget (USD)',
        },
        content: {
          title: 'Ad Content',
          adSetName: 'Ad Set Name',
          adSetPlaceholder: 'e.g., US - Broad Audience',
          productId: 'Shopify Product ID',
          productIdHelp: 'The product you want to advertise from your store',
        },
      },
      status: {
        active: 'Active',
        paused: 'Paused',
        deleted: 'Deleted',
      },
      table: {
        campaign: 'Campaign',
        status: 'Status',
        objective: 'Objective',
        spend: 'Spend',
        revenue: 'Revenue',
        roas: 'ROAS',
        impressions: 'Impressions',
        purchases: 'Purchases',
        costPerPurchase: 'Cost/Purchase',
        budget: 'Budget',
        start: 'Start',
        end: 'End',
        total: 'Total Campaigns: {{count}}',
      },
    },
    connect: {
      title: 'Connect Facebook Account',
      instructions: 'To get started, please provide a User Access Token from the Facebook Graph API Explorer with `ads_read` and `ads_management` permissions.',
      tokenLabel: 'Facebook Access Token',
      tokenPlaceholder: 'Paste your token here...',
      saveAndConnect: 'Save & Connect',
    },
  },
};
