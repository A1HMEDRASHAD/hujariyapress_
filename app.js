/* ==========================================================================
   حُجرية بريس (Hujariya Press) — المحرك البرمجي الشامل للموقع العام (app.js)
   النسخة الصافية فائقة السرعة والمجهزة لمحركات البحث (SEO):
   - تخزين مؤقت فوري (0ms Instant LocalStorage Cache) لفتح الموقع بسرعة البرق قبل انتظار الشبكة
   - تحميل تدريجي للأخبار (Pagination / On-Demand Rendering) لتخفيف الحمل وتسريع التصفح
   - فهرسة ديناميكية متكاملة لمحركات البحث (Dynamic Meta, Open Graph, Canonical, Schema.org JSON-LD)
   - تحديث حي وتلقائي لشريط الطقس الموسع (30 مدينة يمنية وسعودية وعربية)
   - الحفاظ التام 100% على الهوية القرمزية (#b80d38) وجميع الميزات السابقة
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==================== 1. إعدادات الاتصال بقاعدة بيانات Firebase ====================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAd4Df_Fpp2GlGkRPyvmKuFW68LbL_a4yU",
  authDomain: "rawi-01.firebaseapp.com",
  databaseURL: "https://rawi-01-default-rtdb.firebaseio.com",
  projectId: "rawi-01",
  storageBucket: "rawi-01.firebasestorage.app",
  messagingSenderId: "91203142966",
  appId: "1:91203142966:web:a44f7c06c98529a57a9f97",
  measurementId: "G-2VNWNSZLBJ"
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const OFFICIAL_SITE_ORIGIN = "https://www.hujariyapress.rawi-ye.com";
const DEFAULT_CRIMSON_COLOR = "#b80d38";
const PUBLIC_CACHE_STORAGE_KEY = "hujariya_public_clean_cache_v4";
const WEATHER_CACHE_STORAGE_KEY = "hujariya_weather_cache_v2";
const POSTS_BATCH_SIZE = 12;

// الأقسام الافتراضية المعتمدة
const DEFAULT_COMPASSES = [
  {
    id: "yemen-politics",
    name: "السياسة اليمنية",
    subcategories: ["الشرعية ومؤسسات الدولة", "التحليلات الاستراتيجية", "الشأن المحلي والمحافظات", "كشف زيف الميليشيات"],
    visible: true,
    order: 1
  },
  {
    id: "saudi-politics",
    name: "السياسة السعودية",
    subcategories: ["الأمن القومي المشترك", "الدبلوماسية الإقليمية", "رؤية المملكة 2030", "المشاريع التنموية"],
    visible: true,
    order: 2
  },
  {
    id: "regional-international",
    name: "إقليمي ودولي",
    subcategories: ["الشرق الأوسط", "السياسة الدولية", "أمن البحر الأحمر والممرات"],
    visible: true,
    order: 3
  },
  {
    id: "economy-dev",
    name: "اقتصاد وأسواق",
    subcategories: ["أسواق وعملات", "طاقة ونفط", "إعمار وتنمية", "بورصات عالمية"],
    visible: true,
    order: 4
  },
  {
    id: "sports",
    name: "الرياضة",
    subcategories: ["الكرة اليمنية", "الدوري السعودي", "الكرة العالمية", "بطولات دولية"],
    visible: true,
    order: 5
  },
  {
    id: "health-science",
    name: "صحة وعلوم وفضاء",
    subcategories: ["طب وصحة", "أبحاث الفضاء والفلك", "اكتشافات علمية", "بيئة ومناخ"],
    visible: true,
    order: 6
  },
  {
    id: "tech-future",
    name: "تقنية ومستقبل",
    subcategories: ["الذكاء الاصطناعي", "الأمن السيبراني", "تطبيقات ومنصات", "ابتكارات"],
    visible: true,
    order: 7
  },
  {
    id: "culture-thought",
    name: "ثقافة وفكر",
    subcategories: ["أدب وفكر", "تاريخ وهوية", "قراءات وكتب", "مقالات الرأي"],
    visible: true,
    order: 8
  },
  {
    id: "art-media",
    name: "فن وإعلام",
    subcategories: ["فن ودراما", "إعلام رقمي", "تراث وفنون"],
    visible: true,
    order: 9
  }
];

// قائمة الـ 30 مدينة يمنية وسعودية وعربية لشريط الطقس الموسع
const REGIONAL_WEATHER_CITIES = [
  { name: "صنعاء", lat: 15.3694, lon: 44.1910, temp: 24 },
  { name: "عدن", lat: 12.7855, lon: 45.0187, temp: 31 },
  { name: "تعز", lat: 13.5795, lon: 44.0209, temp: 26 },
  { name: "الحجرية (التربة)", lat: 13.2167, lon: 44.1167, temp: 23 },
  { name: "إب", lat: 13.9667, lon: 44.1833, temp: 22 },
  { name: "الحديدة", lat: 14.7978, lon: 42.9545, temp: 33 },
  { name: "مأرب", lat: 15.4591, lon: 45.3253, temp: 29 },
  { name: "المكلا", lat: 14.5425, lon: 49.1242, temp: 30 },
  { name: "سيئون", lat: 15.9430, lon: 48.7873, temp: 31 },
  { name: "شبوة (عتق)", lat: 14.5377, lon: 46.8319, temp: 29 },
  { name: "المهرة (الغيضة)", lat: 16.2079, lon: 52.1760, temp: 28 },
  { name: "سقطرى", lat: 12.6488, lon: 53.9906, temp: 29 },
  { name: "الضالع", lat: 13.6957, lon: 44.7314, temp: 25 },
  { name: "لحج", lat: 13.0578, lon: 44.8831, temp: 31 },
  { name: "ذمار", lat: 14.5427, lon: 44.4051, temp: 21 },
  { name: "صعدة", lat: 16.9402, lon: 43.7639, temp: 23 },
  { name: "الرياض", lat: 24.7136, lon: 46.6753, temp: 30 },
  { name: "مكة المكرمة", lat: 21.3891, lon: 39.8579, temp: 34 },
  { name: "المدينة المنورة", lat: 24.5247, lon: 39.5692, temp: 32 },
  { name: "جدة", lat: 21.4858, lon: 39.1925, temp: 31 },
  { name: "الدمام", lat: 26.4207, lon: 50.0888, temp: 29 },
  { name: "أبها", lat: 18.2164, lon: 42.5053, temp: 21 },
  { name: "جازان", lat: 16.8892, lon: 42.5511, temp: 32 },
  { name: "نجران", lat: 17.4924, lon: 44.1277, temp: 28 },
  { name: "القاهرة", lat: 30.0444, lon: 31.2357, temp: 27 },
  { name: "الدوحة", lat: 25.2854, lon: 51.5310, temp: 30 },
  { name: "أبوظبي", lat: 24.4539, lon: 54.3773, temp: 31 },
  { name: "مسقط", lat: 23.5880, lon: 58.3829, temp: 30 },
  { name: "الكويت", lat: 29.3759, lon: 47.9774, temp: 29 },
  { name: "عمّان", lat: 31.9539, lon: 35.9106, temp: 24 }
];

// النصوص المؤسسية الافتراضية
const DEFAULT_INSTITUTIONAL_TEXTS = {
  about: `
    <h2>من نحن — حُجرية بريس (Hujariya Press)</h2>
    <p><strong>حُجرية بريس</strong> منصة إخبارية وتحليلية يمنية وإقليمية شاملة، تندرج تحت مظلة <strong>مؤسسة RAWI-YE.COM الإعلامية الرقمية</strong>، وتنطلق من التزام وطني ومهني راسخ بنقل الحقيقة وتقديم التحليل العميق لقضايا اليمن والمملكة العربية السعودية والمنطقة.</p>
    <h3>رؤيتنا ورسالتنا</h3>
    <p>نؤمن بصحافة الرصانة والمعلومة الموثقة، ونسعى لتقديم تغطية إخبارية عاجلة وتقارير معمقة تحترم عقل القارئ وتواكب أرقى المعايير الصحفية الحديثة.</p>
  `,
  charter: `
    <h2>ميثاق الشرف الصحفي والتحريري</h2>
    <p>يلتزم كافة المحررين والكتّاب في <strong>حُجرية بريس</strong> بمبادئ الدقة والموضوعية، والتحقق من المصادر قبل النشر، واحترام الثوابت الوطنية، والابتعاد التام عن الشائعات أو التضليل الإعلامي.</p>
  `,
  privacy: `
    <h2>سياسة الخصوصية وحماية البيانات</h2>
    <p>تحترم منصة <strong>حُجرية بريس</strong> خصوصية زوارها وقرائها، ولا تقوم بجمع أي بيانات شخصية غير مصرح بها، وتستخدم تقنيات التخزين المؤقت المحلي فقط لتسريع تصفح الأخبار وتحسين تجربة القارئ.</p>
  `
};

// ==================== 2. حالة التطبيق (Application State) ====================
const state = {
  settings: {
    siteName: "حُجرية بريس",
    siteDescription:
      "حُجرية بريس — منصة إخبارية وتحليلية شاملة تندرج تحت مظلة مؤسسة RAWI-YE.COM الإعلامية الرقمية.",
    accentColor: DEFAULT_CRIMSON_COLOR,
    logoUrl: "",
    hideSiteName: false,
    defaultPostImageUrl: "",
    coverImageUrl: "",
    faviconUrl: "",
    appIconUrl: "",
    aboutHtml: "",
    charterHtml: "",
    privacyHtml: "",
    socials: {}
  },
  compasses: [...DEFAULT_COMPASSES],
  posts: [],
  staff: [],
  ads: [],
  weatherCities: structuredClone(REGIONAL_WEATHER_CITIES),
  activeCompassId: "all",
  activeSubcategory: "",
  activeTag: "",
  searchQuery: "",
  visiblePostsCount: POSTS_BATCH_SIZE,
  currentArticleId: null,
  currentAuthorKey: null,
  trackedAdImpressions: new Set()
};

// ==================== 3. الدوال المساعدة الأساسية ====================
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtmlTags(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCleanCategoryLabel(name = "") {
  return (
    String(name)
      .replace(/^بوصلة\s+/i, "")
      .replace(/^البوصلة\s+/i, "")
      .trim() || name
  );
}

function resolveEffectiveCrimsonColor(savedColor = "") {
  const clean = String(savedColor || "").trim().toLowerCase();
  if (!clean || clean === "#ef3327") return DEFAULT_CRIMSON_COLOR;
  return savedColor;
}

function showPublicToast(msg) {
  const toast = document.getElementById("pub-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(window.__pubToastTimer);
  window.__pubToastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
}

function getPostTimestampMs(post) {
  if (!post) return 0;
  const t = post.createdAt || post.updatedAt;
  if (!t) return 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  const parsed = new Date(t).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function formatArabicDate(postOrMs) {
  const ms =
    typeof postOrMs === "number" ? postOrMs : getPostTimestampMs(postOrMs);
  if (!ms) return "منذ قليل";

  const diffMin = Math.floor((Date.now() - ms) / 60000);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;

  return new Date(ms).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function toIsoDateString(postOrMs) {
  const ms =
    typeof postOrMs === "number" ? postOrMs : getPostTimestampMs(postOrMs);
  return new Date(ms || Date.now()).toISOString();
}

// ==================== 4. محرك التخزين المؤقت الفوري (0ms Instant Local Caching) ====================
function savePublicDataToLocalCache() {
  try {
    const cachePayload = {
      savedAt: Date.now(),
      settings: state.settings,
      compasses: state.compasses,
      // نخزن أحدث 60 خبراً في ذاكرة المتصفح ليفتح الموقع في جزء من الثانية دون انتظار الشبكة
      posts: state.posts.slice(0, 60),
      staff: state.staff.map((s) => ({
        id: s.id,
        name: s.name,
        username: s.username,
        jobTitle: s.jobTitle,
        avatar: s.avatar,
        bio: s.bio,
        verified: s.verified,
        role: s.role,
        isMasterAdmin: s.isMasterAdmin
      }))
    };
    localStorage.setItem(PUBLIC_CACHE_STORAGE_KEY, JSON.stringify(cachePayload));
  } catch (_) {}
}

function restorePublicDataFromLocalCache() {
  try {
    const rawWeather = localStorage.getItem(WEATHER_CACHE_STORAGE_KEY);
    if (rawWeather) {
      const parsedWeather = JSON.parse(rawWeather);
      if (Array.isArray(parsedWeather?.cities) && parsedWeather.cities.length) {
        state.weatherCities = parsedWeather.cities;
      }
    }

    const raw = localStorage.getItem(PUBLIC_CACHE_STORAGE_KEY);
    if (!raw) return false;
    const cached = JSON.parse(raw);
    if (!cached) return false;

    if (cached.settings) state.settings = { ...state.settings, ...cached.settings };
    if (Array.isArray(cached.compasses) && cached.compasses.length) {
      state.compasses = cached.compasses;
    }
    if (Array.isArray(cached.posts) && cached.posts.length) {
      state.posts = cached.posts;
    }
    if (Array.isArray(cached.staff) && cached.staff.length) {
      state.staff = cached.staff;
    }

    applyPublicBrandingAndIdentity();
    renderRegionalWeatherStrip();
    renderNavigationAndSidebar();
    renderAllHomeSections();
    return true;
  } catch (_) {
    return false;
  }
}

// ==================== 5. تحديث شريط الطقس الموسع (30 مدينة يمنية وسعودية وعربية) ====================
function renderRegionalWeatherStrip() {
  const track = document.getElementById("regional-weather-track");
  if (!track) return;

  const citiesHtml = state.weatherCities
    .map(
      (c) =>
        `<span>${escapeHtml(c.name)} <strong dir="ltr">${Math.round(
          Number(c.temp)
        )}°C</strong></span>`
    )
    .join(`<span class="t-sep">•</span>`);

  // تكرار الشريط لضمان انسيابية الحركة المستمرة بدون أي فراغ
  track.innerHTML = `${citiesHtml}<span class="t-sep">•</span>${citiesHtml}`;
}

async function syncLiveRegionalWeather() {
  try {
    const rawCache = localStorage.getItem(WEATHER_CACHE_STORAGE_KEY);
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      // إذا تم تحديث الطقس خلال آخر 45 دقيقة نكتفي بالكاش لسرعة الأداء
      if (parsed?.updatedAt && Date.now() - parsed.updatedAt < 45 * 60 * 1000) {
        return;
      }
    }

    const lats = state.weatherCities.map((c) => c.lat).join(",");
    const lons = state.weatherCities.map((c) => c.lon).join(",");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current_weather=true`;

    const response = await fetch(url);
    if (!response.ok) return;
    const data = await response.json();

    if (Array.isArray(data)) {
      state.weatherCities = state.weatherCities.map((city, idx) => {
        const liveTemp = data[idx]?.current_weather?.temperature;
        return {
          ...city,
          temp: typeof liveTemp === "number" ? Math.round(liveTemp) : city.temp
        };
      });

      localStorage.setItem(
        WEATHER_CACHE_STORAGE_KEY,
        JSON.stringify({ updatedAt: Date.now(), cities: state.weatherCities })
      );
      renderRegionalWeatherStrip();
    }
  } catch (_) {
    // في حال عدم توفر اتصال، يستمر الشريط بالعمل بالقيم المخزنة بكل سلاسة
  }
}

// ==================== 6. محرك الـ SEO الديناميكي والبيانات المنظمة (Schema.org JSON-LD) ====================
function updateDynamicSeoAndSchema({
  title,
  description,
  canonicalPath = "/",
  imageUrl = "",
  type = "website",
  schemaObject = null
}) {
  const siteName =
    state.settings.siteName &&
    state.settings.siteName !== "شبكة البوصلة" &&
    state.settings.siteName !== "نبض اليمن"
      ? state.settings.siteName
      : "حُجرية بريس";

  const fullTitle = title
    ? `${title} | ${siteName}`
    : `${siteName} | Hujariya Press — منصة إخبارية وتحليلية شاملة`;

  const cleanDesc =
    (description || state.settings.siteDescription || "").slice(0, 240) ||
    "حُجرية بريس — منصة إخبارية وتحليلية شاملة تغطي أخبار اليمن والمملكة العربية السعودية والإقليم والعالم لحظة بلحظة.";

  const cleanCanonical = canonicalPath.startsWith("http")
    ? canonicalPath
    : `${OFFICIAL_SITE_ORIGIN}${canonicalPath.startsWith("/") ? "" : "/"}${canonicalPath}`;

  const fallbackImg =
    imageUrl ||
    state.settings.defaultPostImageUrl ||
    state.settings.coverImageUrl ||
    state.settings.logoUrl ||
    "";

  document.title = fullTitle;
  document.getElementById("page-meta-title")?.setAttribute("content", fullTitle);
  document.getElementById("page-meta-desc")?.setAttribute("content", cleanDesc);
  document.getElementById("dynamic-canonical")?.setAttribute("href", cleanCanonical);

  document.getElementById("og-meta-type")?.setAttribute("content", type);
  document.getElementById("og-meta-title")?.setAttribute("content", fullTitle);
  document.getElementById("og-meta-desc")?.setAttribute("content", cleanDesc);
  document.getElementById("og-meta-url")?.setAttribute("content", cleanCanonical);
  if (fallbackImg) {
    document.getElementById("og-meta-image")?.setAttribute("content", fallbackImg);
    document.getElementById("twitter-meta-image")?.setAttribute("content", fallbackImg);
  }

  document.getElementById("twitter-meta-title")?.setAttribute("content", fullTitle);
  document.getElementById("twitter-meta-desc")?.setAttribute("content", cleanDesc);

  const schemaEl = document.getElementById("schema-org-dynamic");
  if (schemaEl) {
    if (schemaObject) {
      schemaEl.textContent = JSON.stringify(schemaObject);
    } else {
      schemaEl.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: fullTitle,
        description: cleanDesc,
        url: cleanCanonical,
        inLanguage: "ar",
        isPartOf: {
          "@type": "WebSite",
          name: siteName,
          url: OFFICIAL_SITE_ORIGIN
        }
      });
    }
  }
}

// ==================== 7. تطبيق الهوية البصرية القرمزية والشعار الشفاف المفرغ ====================
function applyPublicBrandingAndIdentity() {
  const s = state.settings;
  const siteName =
    s.siteName && s.siteName !== "شبكة البوصلة" && s.siteName !== "نبض اليمن"
      ? s.siteName
      : "حُجرية بريس";
  const brandColor = resolveEffectiveCrimsonColor(s.accentColor);

  document.documentElement.style.setProperty("--brand-red", brandColor);
  document.getElementById("page-theme-color")?.setAttribute("content", brandColor);

  const hasLogo = Boolean(s.logoUrl && s.logoUrl.trim() !== "");
  const headerLogoImg = document.getElementById("site-logo-img");
  const headerLogoCapsule = document.getElementById("header-logo-capsule");
  const headerTextBrand = document.getElementById("site-text-brand");

  const sidebarLogoImg = document.getElementById("sidebar-logo-img");
  const sidebarLogoCapsule = document.getElementById("sidebar-logo-capsule");
  const sidebarBrandTitle = document.getElementById("sidebar-brand-title");

  const footerLogoImg = document.getElementById("footer-logo-img");

  if (headerTextBrand) {
    headerTextBrand.textContent = siteName;
    headerTextBrand.classList.toggle("hidden", hasLogo && Boolean(s.hideSiteName));
  }
  if (sidebarBrandTitle) sidebarBrandTitle.textContent = siteName;

  const footerNameEl = document.getElementById("footer-site-name");
  if (footerNameEl) footerNameEl.textContent = siteName;

  const copyNameEl = document.getElementById("copyright-site-name");
  if (copyNameEl) copyNameEl.textContent = siteName;

  const footerDescEl = document.getElementById("footer-site-desc");
  if (footerDescEl && s.siteDescription) {
    footerDescEl.textContent = s.siteDescription;
  }

  [headerLogoImg, sidebarLogoImg, footerLogoImg].forEach((img) => {
    if (!img) return;
    if (hasLogo) {
      img.src = s.logoUrl.trim();
      img.classList.remove("hidden");
    } else {
      img.classList.add("hidden");
    }
  });

  headerLogoCapsule?.classList.toggle("hidden", !hasLogo);
  sidebarLogoCapsule?.classList.toggle("hidden", !hasLogo);

  const favUrl = (s.faviconUrl || s.appIconUrl || s.logoUrl || "").trim();
  if (favUrl) {
    document.getElementById("dynamic-favicon")?.setAttribute("href", favUrl);
    document.getElementById("dynamic-apple-icon")?.setAttribute("href", favUrl);
  }

  renderPublicSocialLinks();
}

function renderPublicSocialLinks() {
  const soc = state.settings.socials || {};
  const labels = {
    whatsapp: "واتساب",
    telegram: "تليجرام",
    x: "منصة X",
    facebook: "فيسبوك",
    youtube: "يوتيوب",
    tiktok: "تيك توك",
    instagram: "إنستغرام",
    threads: "ثريدز",
    snapchat: "سناب شات",
    linkedin: "لينكدإن"
  };

  const linksHtml = Object.entries(labels)
    .filter(([key]) => soc[key] && String(soc[key]).trim() !== "")
    .map(
      ([key, label]) =>
        `<a href="${escapeHtml(
          String(soc[key]).trim()
        )}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
    )
    .join("");

  const sidebarWrap = document.getElementById("sidebar-socials-wrap");
  const sidebarList = document.getElementById("sidebar-social-links");
  const footerList = document.getElementById("footer-social-links");

  if (sidebarWrap && sidebarList) {
    sidebarList.innerHTML = linksHtml;
    sidebarWrap.classList.toggle("hidden", !linksHtml);
  }
  if (footerList) {
    footerList.innerHTML = linksHtml;
  }
}

// ==================== 8. بناء شريط الأقسام والقائمة الجانبية ====================
function getVisibleCompasses() {
  return [...state.compasses]
    .filter((c) => c.visible !== false)
    .sort((a, b) => (a.order || 99) - (b.order || 99));
}

function renderNavigationAndSidebar() {
  const navBar = document.getElementById("public-compasses-nav");
  const sideDirectList = document.getElementById("sidebar-categories-direct-list");
  const visibleCats = getVisibleCompasses();

  if (navBar) {
    const isAll = state.activeCompassId === "all";

    navBar.innerHTML = [
      `<button type="button" class="cat-tab-btn ${
        isAll ? "active" : ""
      }" data-compass-filter="all">الرئيسية</button>`,
      ...visibleCats.map((c) => {
        const cleanName = getCleanCategoryLabel(c.name);
        const isActive =
          state.activeCompassId === c.id || state.activeCompassId === cleanName;
        return `<button type="button" class="cat-tab-btn ${
          isActive ? "active" : ""
        }" data-compass-filter="${escapeHtml(c.id)}">${escapeHtml(cleanName)}</button>`;
      })
    ].join("");

    navBar.querySelectorAll("[data-compass-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectCompassFilter(btn.getAttribute("data-compass-filter") || "all", true);
      });
    });
  }

  if (sideDirectList) {
    sideDirectList.innerHTML = visibleCats
      .map((c) => {
        const cleanName = getCleanCategoryLabel(c.name);
        return `
          <button type="button" class="sidebar-cat-direct-btn" data-side-compass="${escapeHtml(
            c.id
          )}">
            <span>${escapeHtml(cleanName)}</span>
            <span class="material-symbols-rounded" style="font-size:16px;" translate="no">chevron_left</span>
          </button>
        `;
      })
      .join("");

    sideDirectList.querySelectorAll("[data-side-compass]").forEach((btn) => {
      btn.addEventListener("click", () => {
        closeMasterSidebar();
        selectCompassFilter(btn.getAttribute("data-side-compass") || "all", true);
      });
    });
  }

  renderSubcategoriesBar();
  renderWritersStripAndSidebar();
}

function renderSubcategoriesBar() {
  const wrap = document.getElementById("subcategories-bar-wrap");
  const list = document.getElementById("public-subcategories-list");
  if (!wrap || !list) return;

  if (
    state.activeCompassId === "all" ||
    state.activeCompassId === "pulse-only" ||
    state.activeCompassId === "shorts-only"
  ) {
    wrap.classList.add("hidden");
    return;
  }

  const targetCat = state.compasses.find(
    (c) =>
      c.id === state.activeCompassId ||
      getCleanCategoryLabel(c.name) === getCleanCategoryLabel(state.activeCompassId)
  );

  const subs = targetCat?.subcategories || [];
  if (!subs.length) {
    wrap.classList.add("hidden");
    return;
  }

  wrap.classList.remove("hidden");
  list.innerHTML = [
    `<button type="button" class="subcat-chip ${
      !state.activeSubcategory ? "active" : ""
    }" data-subcat-val="">كل فرعيات ${escapeHtml(
      getCleanCategoryLabel(targetCat.name)
    )}</button>`,
    ...subs.map(
      (s) =>
        `<button type="button" class="subcat-chip ${
          state.activeSubcategory === s ? "active" : ""
        }" data-subcat-val="${escapeHtml(s)}">${escapeHtml(s)}</button>`
    )
  ].join("");

  list.querySelectorAll("[data-subcat-val]").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.activeSubcategory = chip.getAttribute("data-subcat-val") || "";
      state.visiblePostsCount = POSTS_BATCH_SIZE;
      renderSubcategoriesBar();
      renderAllHomeSections();
    });
  });
}

function selectCompassFilter(compassId, pushUrlState = true) {
  state.activeCompassId = compassId || "all";
  state.activeSubcategory = "";
  state.activeTag = "";
  state.visiblePostsCount = POSTS_BATCH_SIZE;

  switchActiveAppView("home");
  renderNavigationAndSidebar();
  renderAllHomeSections();

  if (compassId === "all") {
    updateDynamicSeoAndSchema({
      title: "",
      description: state.settings.siteDescription,
      canonicalPath: "/"
    });
    if (pushUrlState) {
      window.history.pushState({}, "", "/");
    }
  } else {
    const matchedCat = state.compasses.find(
      (c) =>
        c.id === compassId ||
        getCleanCategoryLabel(c.name) === getCleanCategoryLabel(compassId)
    );
    const label =
      compassId === "pulse-only"
        ? "موجز الأخبار السريعة (النبض)"
        : compassId === "shorts-only"
        ? "الفيديوهات القصيرة والمرئيات"
        : getCleanCategoryLabel(matchedCat?.name || compassId);

    updateDynamicSeoAndSchema({
      title: `أخبار وتقارير قسم ${label}`,
      description: `تابع أحدث الأخبار والتقارير والتحليلات في قسم ${label} عبر منصة حُجرية بريس الإخبارية.`,
      canonicalPath: `/?compass=${encodeURIComponent(compassId)}`
    });

    if (pushUrlState) {
      window.history.pushState(
        { compass: compassId },
        "",
        `/?compass=${encodeURIComponent(compassId)}`
      );
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==================== 9. بناء البطاقات الإخبارية، التغطية الرئيسية، والفيديوهات ====================
function getPublishedPosts() {
  return state.posts.filter((p) => !p.status || p.status === "published");
}

function resolveAuthorInfoForPost(post) {
  const staffMatch = state.staff.find(
    (s) =>
      (post.authorId && s.id === post.authorId) ||
      (post.authorUsername &&
        String(s.username || "").toLowerCase() ===
          String(post.authorUsername).toLowerCase()) ||
      (post.author &&
        String(s.name || "").trim().toLowerCase() ===
          String(post.author).trim().toLowerCase())
  );

  const name = staffMatch?.name || post.author || "هيئة التحرير — حُجرية بريس";
  const verified = Boolean(
    staffMatch
      ? staffMatch.verified || staffMatch.isMasterAdmin || staffMatch.role === "admin"
      : post.authorVerified
  );
  const avatar =
    staffMatch?.avatar ||
    post.authorAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=b80d38&color=fff`;
  const authorKey = staffMatch?.id || post.authorId || name;

  return { name, verified, avatar, authorKey, staffMatch };
}

function buildPostThumbnailHtml(post) {
  const imgUrl = (
    post.imageUrl ||
    state.settings.defaultPostImageUrl ||
    state.settings.coverImageUrl ||
    ""
  ).trim();
  const hasVideo =
    (post.videoType && post.videoType !== "none") ||
    (post.videoUrl && String(post.videoUrl).trim() !== "");

  const videoBadge = hasVideo
    ? `<span class="media-floating-badge">
        <span class="material-symbols-rounded" translate="no">play_circle</span>
        <span>${
          post.videoType === "short_vertical"
            ? "فيديو قصير"
            : post.videoDuration || "فيديو"
        }</span>
      </span>`
    : "";

  if (imgUrl) {
    return `
      <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(post.title)}" loading="lazy" decoding="async">
      ${videoBadge}
    `;
  }

  const logoUrl = (state.settings.logoUrl || "").trim();
  const siteName = state.settings.siteName || "حُجرية بريس";
  return `
    <div class="brand-fallback-thumb">
      ${
        logoUrl
          ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}">`
          : `<span class="brand-fallback-name">${escapeHtml(siteName)}</span>`
      }
    </div>
    ${videoBadge}
  `;
}

// عرض أول تصنيفين فقط في البطاقات لمنع الازدحام
function buildCardCategoriesPillsHtml(post) {
  const rawCats =
    Array.isArray(post.categories) && post.categories.length
      ? post.categories
      : [post.category || "أخبار"];
  const cleanCats = rawCats.map(getCleanCategoryLabel).filter(Boolean);
  const visibleTwo = cleanCats.slice(0, 2);
  const extraCount = Math.max(0, cleanCats.length - 2);

  return `
    <div class="card-categories-row">
      ${visibleTwo
        .map((c) => `<span class="card-cat-pill">${escapeHtml(c)}</span>`)
        .join("")}
      ${
        post.subcategory
          ? `<span class="card-subcat-pill">${escapeHtml(post.subcategory)}</span>`
          : ""
      }
      ${extraCount > 0 ? `<span class="card-more-cats-pill">+${extraCount}</span>` : ""}
    </div>
  `;
}

function renderBreakingNewsBar(publishedPosts) {
  const bar = document.getElementById("breaking-news-bar");
  const track = document.getElementById("breaking-ticker-items");
  if (!bar || !track) return;

  const now = Date.now();
  const breakingList = publishedPosts.filter((p) => {
    if (!p.isBreaking) return false;
    if (p.breakingExpiresAt && Number(p.breakingExpiresAt) < now) return false;
    return true;
  });

  if (!breakingList.length) {
    bar.classList.add("hidden");
    return;
  }

  bar.classList.remove("hidden");
  const itemsHtml = breakingList
    .slice(0, 10)
    .map(
      (p) =>
        `<button type="button" class="tv-ticker-item" data-open-post="${escapeHtml(
          p.id
        )}">${escapeHtml(p.title)}</button>`
    )
    .join(`<span class="t-sep">•</span>`);

  track.innerHTML = `${itemsHtml}<span class="t-sep">•</span>${itemsHtml}`;
  track.querySelectorAll("[data-open-post]").forEach((btn) => {
    btn.addEventListener("click", () =>
      openArticleReader(btn.getAttribute("data-open-post"), true)
    );
  });
}

function renderHeroFeaturedSection(publishedPosts) {
  const section = document.getElementById("hero-featured-section");
  const box = document.getElementById("hero-featured-box");
  if (!section || !box) return;

  const isDefaultHome =
    state.activeCompassId === "all" &&
    !state.activeSubcategory &&
    !state.activeTag &&
    !state.searchQuery;

  if (!isDefaultHome || !publishedPosts.length) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  const leadPost = publishedPosts.find((p) => p.isFeatured) || publishedPosts[0];
  const sidePosts = publishedPosts.filter((p) => p.id !== leadPost.id).slice(0, 3);
  const leadAuthor = resolveAuthorInfoForPost(leadPost);

  const sideHtml = sidePosts
    .map((sp) => {
      const spAuthor = resolveAuthorInfoForPost(sp);
      return `
        <article class="aj-hero-side-item" data-open-post="${escapeHtml(sp.id)}">
          <div class="aj-side-thumb">
            ${buildPostThumbnailHtml(sp)}
          </div>
          <div class="aj-side-info">
            ${buildCardCategoriesPillsHtml(sp)}
            <h3 class="aj-side-title">${escapeHtml(sp.title)}</h3>
            <div style="font-size:0.72rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
              <span>${escapeHtml(spAuthor.name)}</span>
              <span>•</span>
              <span>${formatArabicDate(sp)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  box.innerHTML = `
    <div class="aj-asymmetric-hero-grid ${!sidePosts.length ? "aj-hero-Single-only" : ""}">
      <article class="lead-story-card" data-open-post="${escapeHtml(leadPost.id)}">
        <div class="lead-story-media">
          ${buildPostThumbnailHtml(leadPost)}
        </div>
        <div class="lead-story-body">
          <div>
            ${buildCardCategoriesPillsHtml(leadPost)}
            <h2 class="lead-story-title">${escapeHtml(leadPost.title)}</h2>
            <p class="lead-story-summary">${escapeHtml(
              leadPost.summary || stripHtmlTags(leadPost.content).slice(0, 180)
            )}</p>
          </div>
          <div class="card-clean-meta">
            <span class="card-author-name">
              <span>${escapeHtml(leadAuthor.name)}</span>
              ${
                leadAuthor.verified
                  ? `<span class="material-symbols-rounded verified-icon" translate="no">verified</span>`
                  : ""
              }
            </span>
            <span>${formatArabicDate(leadPost)}</span>
          </div>
        </div>
      </article>

      ${sidePosts.length ? `<div class="aj-hero-side-stack">${sideHtml}</div>` : ""}
    </div>
  `;

  box.querySelectorAll("[data-open-post]").forEach((el) => {
    el.addEventListener("click", () =>
      openArticleReader(el.getAttribute("data-open-post"), true)
    );
  });
}

function renderQuickPulseSection(publishedPosts) {
  const section = document.getElementById("quick-pulse-strip-section");
  const feed = document.getElementById("quick-pulse-feed");
  if (!section || !feed) return;

  const isDefaultHome =
    state.activeCompassId === "all" &&
    !state.activeSubcategory &&
    !state.activeTag &&
    !state.searchQuery;

  if (!isDefaultHome) {
    section.classList.add("hidden");
    return;
  }

  const pulsePosts = publishedPosts
    .filter((p) => p.isQuickNews || p.isBreaking)
    .slice(0, 10);
  const listToUse = pulsePosts.length ? pulsePosts : publishedPosts.slice(0, 8);

  if (!listToUse.length) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  feed.innerHTML = listToUse
    .map(
      (p) => `
      <article class="pulse-mini-card" data-open-post="${escapeHtml(p.id)}">
        <span class="brief-item-time">⚡ ${formatArabicDate(p)}</span>
        <h3 class="brief-item-title">${escapeHtml(p.title)}</h3>
      </article>
    `
    )
    .join("");

  feed.querySelectorAll("[data-open-post]").forEach((card) => {
    card.addEventListener("click", () =>
      openArticleReader(card.getAttribute("data-open-post"), true)
    );
  });
}

function renderShortsReelsSection(publishedPosts) {
  const section = document.getElementById("shorts-reels-section");
  const row = document.getElementById("shorts-horizontal-list");
  if (!section || !row) return;

  const isDefaultHome =
    state.activeCompassId === "all" &&
    !state.activeSubcategory &&
    !state.activeTag &&
    !state.searchQuery;

  const videoPosts = publishedPosts.filter(
    (p) =>
      p.videoType === "short_vertical" ||
      (p.videoUrl && String(p.videoUrl).includes("/shorts/"))
  );

  if (!isDefaultHome || !videoPosts.length) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  row.innerHTML = videoPosts
    .slice(0, 10)
    .map((p) => {
      const thumb =
        p.imageUrl ||
        state.settings.defaultPostImageUrl ||
        state.settings.logoUrl ||
        "";
      return `
        <article class="short-reel-card" data-open-post="${escapeHtml(p.id)}">
          ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(p.title)}" loading="lazy" decoding="async">` : ""}
          <span class="short-play-badge">▶ ${escapeHtml(p.videoDuration || "ريلز")}</span>
          <div class="short-reel-overlay">
            <h3 class="short-reel-title">${escapeHtml(p.title)}</h3>
          </div>
        </article>
      `;
    })
    .join("");

  row.querySelectorAll("[data-open-post]").forEach((card) => {
    card.addEventListener("click", () =>
      openArticleReader(card.getAttribute("data-open-post"), true)
    );
  });
}

function buildNewsCardHtml(post) {
  const authorInfo = resolveAuthorInfoForPost(post);
  const excerpt =
    post.summary || stripHtmlTags(post.content || "").slice(0, 140);

  return `
    <article class="bbc-news-card" data-open-post="${escapeHtml(post.id)}">
      <div class="bbc-card-thumb">
        ${buildPostThumbnailHtml(post)}
      </div>
      <div class="bbc-card-content">
        <div>
          ${buildCardCategoriesPillsHtml(post)}
          <h3 class="bbc-card-title">${escapeHtml(post.title)}</h3>
          ${excerpt ? `<p class="bbc-card-excerpt">${escapeHtml(excerpt)}</p>` : ""}
        </div>
        <div class="card-clean-meta">
          <span class="card-author-name">
            <span>${escapeHtml(authorInfo.name)}</span>
            ${
              authorInfo.verified
                ? `<span class="material-symbols-rounded verified-icon" translate="no">verified</span>`
                : ""
            }
          </span>
          <span>${formatArabicDate(post)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderMainPostsFeed(publishedPosts) {
  const grid = document.getElementById("public-posts-grid");
  const counterEl = document.getElementById("feed-posts-counter");
  const headingEl = document.getElementById("feed-section-heading");
  const filterBanner = document.getElementById("active-filter-banner");
  const filterTitle = document.getElementById("active-filter-title");
  const loadMoreWrap = document.getElementById("load-more-wrap");
  const floatingSearchCount = document.getElementById("floating-search-count");

  if (!grid) return;

  let filtered = [...publishedPosts];
  let bannerText = "";

  if (state.activeCompassId === "pulse-only") {
    filtered = filtered.filter((p) => p.isQuickNews || p.isBreaking);
    bannerText = "موجز الأخبار السريعة والعاجلة (النبض)";
  } else if (state.activeCompassId === "shorts-only") {
    filtered = filtered.filter(
      (p) =>
        (p.videoType && p.videoType !== "none") ||
        (p.videoUrl && String(p.videoUrl).trim() !== "")
    );
    bannerText = "الفيديوهات القصيرة والمرئيات";
  } else if (state.activeCompassId !== "all") {
    const targetCatObj = state.compasses.find(
      (c) =>
        c.id === state.activeCompassId ||
        getCleanCategoryLabel(c.name) === getCleanCategoryLabel(state.activeCompassId)
    );
    const targetName = getCleanCategoryLabel(
      targetCatObj?.name || state.activeCompassId
    );

    filtered = filtered.filter((p) => {
      const postCats = Array.isArray(p.categories)
        ? p.categories.map(getCleanCategoryLabel)
        : [getCleanCategoryLabel(p.category || "")];
      return postCats.includes(targetName) || p.category === state.activeCompassId;
    });
    bannerText = `قسم: ${targetName}`;
  }

  if (state.activeSubcategory) {
    filtered = filtered.filter((p) => p.subcategory === state.activeSubcategory);
    bannerText += ` — ${state.activeSubcategory}`;
  }

  if (state.activeTag) {
    const cleanT = state.activeTag.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        Array.isArray(p.tags) &&
        p.tags.some((t) => String(t).replace(/^#+/, "").toLowerCase() === cleanT)
    );
    bannerText = `نتائج الوسم: #${state.activeTag}`;
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter((p) =>
      `${p.title || ""} ${p.summary || ""} ${p.author || ""} ${(
        p.categories || []
      ).join(" ")} ${(p.tags || []).join(" ")}`
        .toLowerCase()
        .includes(q)
    );
    bannerText = `نتائج البحث الفوري عن: «${state.searchQuery}»`;
  }

  if (floatingSearchCount) {
    if (state.searchQuery) {
      floatingSearchCount.textContent = `${filtered.length.toLocaleString("ar-YE")} نتيجة`;
      floatingSearchCount.classList.remove("hidden");
    } else {
      floatingSearchCount.classList.add("hidden");
    }
  }

  if (filterBanner && filterTitle) {
    if (bannerText) {
      filterTitle.textContent = bannerText;
      filterBanner.classList.remove("hidden");
      if (headingEl) headingEl.textContent = bannerText;
    } else {
      filterBanner.classList.add("hidden");
      if (headingEl) headingEl.textContent = "أحدث الأخبار والتقارير";
    }
  }

  if (counterEl) {
    counterEl.textContent = `${filtered.length.toLocaleString("ar-YE")} مادة صحفية`;
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="skeleton-box" style="grid-column:1/-1;height:150px;">
        لا توجد مواد صحفية مطابقة لهذا الفلتر حالياً.
      </div>
    `;
    loadMoreWrap?.classList.add("hidden");
    return;
  }

  // التحميل التدريجي (Pagination) لعرض دفعات سريعة وخفيفة على المتصفح
  const visibleSlice = filtered.slice(0, state.visiblePostsCount);
  grid.innerHTML = visibleSlice.map(buildNewsCardHtml).join("");

  grid.querySelectorAll("[data-open-post]").forEach((card) => {
    card.addEventListener("click", () =>
      openArticleReader(card.getAttribute("data-open-post"), true)
    );
  });

  if (loadMoreWrap) {
    loadMoreWrap.classList.toggle("hidden", filtered.length <= state.visiblePostsCount);
  }
}

function renderWritersStripAndSidebar() {
  const writersSection = document.getElementById("writers-strip-section");
  const writersRow = document.getElementById("writers-horizontal-list");
  const sideWritersBlock = document.getElementById("sidebar-writers-block");
  const sideWritersList = document.getElementById("sidebar-writers-list");

  const activeWriters = state.staff.filter((s) => s.name && s.username);
  if (!activeWriters.length) {
    writersSection?.classList.add("hidden");
    sideWritersBlock?.classList.add("hidden");
    return;
  }

  writersSection?.classList.remove("hidden");
  sideWritersBlock?.classList.remove("hidden");

  if (writersRow) {
    writersRow.innerHTML = activeWriters
      .map((w) => {
        const isVer = Boolean(w.verified || w.isMasterAdmin || w.role === "admin");
        const av =
          w.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            w.name
          )}&background=b80d38&color=fff`;
        return `
          <button type="button" class="writer-clean-card" data-open-author="${escapeHtml(
            w.id
          )}">
            <img src="${escapeHtml(av)}" alt="${escapeHtml(w.name)}" loading="lazy">
            <div>
              <div class="writer-clean-name">
                <span>${escapeHtml(w.name)}</span>
                ${
                  isVer
                    ? `<span class="material-symbols-rounded verified-icon" translate="no">verified</span>`
                    : ""
                }
              </div>
              <span class="writer-clean-role">${escapeHtml(
                w.jobTitle || "كاتب وصحفي"
              )}</span>
            </div>
          </button>
        `;
      })
      .join("");

    writersRow.querySelectorAll("[data-open-author]").forEach((btn) => {
      btn.addEventListener("click", () =>
        openAuthorProfileView(btn.getAttribute("data-open-author"), true)
      );
    });
  }

  if (sideWritersList) {
    sideWritersList.innerHTML = activeWriters
      .slice(0, 8)
      .map((w) => {
        const isVer = Boolean(w.verified || w.isMasterAdmin || w.role === "admin");
        const av =
          w.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            w.name
          )}&background=b80d38&color=fff`;
        return `
          <button type="button" class="sidebar-writer-btn" data-open-author="${escapeHtml(
            w.id
          )}">
            <img src="${escapeHtml(av)}" alt="${escapeHtml(w.name)}" loading="lazy">
            <span>${escapeHtml(w.name)}</span>
            ${
              isVer
                ? `<span class="material-symbols-rounded verified-icon" translate="no">verified</span>`
                : ""
            }
          </button>
        `;
      })
      .join("");

    sideWritersList.querySelectorAll("[data-open-author]").forEach((btn) => {
      btn.addEventListener("click", () => {
        closeMasterSidebar();
        openAuthorProfileView(btn.getAttribute("data-open-author"), true);
      });
    });
  }
}

function renderPublicAds() {
  const activeAds = state.ads.filter(
    (ad) => ad.active !== false && ad.status !== "paused" && ad.status !== "frozen"
  );
  const topSlot = document.getElementById("ad-slot-top");
  const midSlot = document.getElementById("ad-slot-middle");

  const renderSingleAdSlot = (slotEl, adObj) => {
    if (!slotEl) return;
    if (!adObj) {
      slotEl.classList.add("hidden");
      return;
    }

    slotEl.classList.remove("hidden");
    slotEl.innerHTML = `
      <a href="${escapeHtml(
        adObj.targetUrl || "#"
      )}" target="_blank" rel="noopener sponsored" class="ad-banner-card" data-ad-click="${escapeHtml(
      adObj.id
    )}">
        <div>
          <span style="font-size:0.68rem;color:var(--brand-red);font-weight:800;display:block;">إعلان ممول • ${escapeHtml(
            adObj.sponsorName || "شركاء حُجرية بريس"
          )}</span>
          <strong style="font-size:0.95rem;">${escapeHtml(adObj.title)}</strong>
        </div>
        ${
          adObj.imageUrl
            ? `<img src="${escapeHtml(adObj.imageUrl)}" alt="${escapeHtml(
                adObj.title
              )}" loading="lazy">`
            : ""
        }
      </a>
    `;

    if (!state.trackedAdImpressions.has(adObj.id)) {
      state.trackedAdImpressions.add(adObj.id);
      updateDoc(doc(db, "ads", adObj.id), { views: increment(1) }).catch(() => {});
    }

    slotEl.querySelector("[data-ad-click]")?.addEventListener("click", () => {
      updateDoc(doc(db, "ads", adObj.id), { clicks: increment(1) }).catch(() => {});
    });
  };

  renderSingleAdSlot(topSlot, activeAds[0] || null);
  renderSingleAdSlot(midSlot, activeAds[1] || null);
}

function renderAllHomeSections() {
  const published = getPublishedPosts();
  renderBreakingNewsBar(published);
  renderHeroFeaturedSection(published);
  renderQuickPulseSection(published);
  renderShortsReelsSection(published);
  renderMainPostsFeed(published);
  renderPublicAds();
}

// ==================== 10. قارئ المقال الكامل مع حقن NewsArticle Schema.org ====================
function extractYoutubeVideoId(url = "") {
  const str = String(url).trim();
  const shortsMatch = str.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/i);
  if (shortsMatch) return shortsMatch[1];
  const stdMatch = str.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i
  );
  return stdMatch ? stdMatch[1] : null;
}

function buildVideoEmbedHtml(post) {
  const rawUrl = (post.videoUrl || "").trim();
  if (!rawUrl) return "";

  const isVertical =
    post.videoType === "short_vertical" || rawUrl.includes("/shorts/");
  const wrapperClass = isVertical
    ? "video-frame-vertical"
    : "video-frame-landscape";

  const ytId = extractYoutubeVideoId(rawUrl);
  if (ytId) {
    return `
      <div class="${wrapperClass}">
        <iframe
          src="https://www.youtube.com/embed/${escapeHtml(ytId)}?rel=0"
          title="${escapeHtml(post.title)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
    `;
  }

  return `
    <div class="${wrapperClass}">
      <video src="${escapeHtml(rawUrl)}" controls playsinline preload="metadata"></video>
    </div>
  `;
}

function openArticleReader(postId, pushUrlState = true) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;

  state.currentArticleId = post.id;
  switchActiveAppView("article");

  // زيادة عداد المشاهدات الفعلي للمنشور في Firestore
  updateDoc(doc(db, "posts", post.id), { views: increment(1) }).catch(() => {});

  const authorInfo = resolveAuthorInfoForPost(post);

  const catsBox = document.getElementById("article-categories-badges");
  if (catsBox) {
    const allCats =
      Array.isArray(post.categories) && post.categories.length
        ? post.categories.map(getCleanCategoryLabel)
        : [getCleanCategoryLabel(post.category || "أخبار")];

    catsBox.innerHTML = [
      ...allCats.map((c) => `<span class="card-cat-pill">${escapeHtml(c)}</span>`),
      post.subcategory
        ? `<span class="card-subcat-pill">${escapeHtml(post.subcategory)}</span>`
        : ""
    ].join("");
  }

  const titleEl = document.getElementById("reader-article-title");
  if (titleEl) titleEl.textContent = post.title || "";

  const summaryEl = document.getElementById("reader-article-summary");
  if (summaryEl) {
    if (post.summary && post.summary.trim()) {
      summaryEl.textContent = post.summary.trim();
      summaryEl.classList.remove("hidden");
    } else {
      summaryEl.classList.add("hidden");
    }
  }

  const authorAv = document.getElementById("reader-author-avatar");
  if (authorAv) authorAv.src = authorInfo.avatar;

  const authorName = document.getElementById("reader-author-name");
  if (authorName) authorName.textContent = authorInfo.name;

  document
    .getElementById("reader-author-verified")
    ?.classList.toggle("hidden", !authorInfo.verified);

  const pubDate = document.getElementById("reader-publish-date");
  if (pubDate) {
    pubDate.textContent = formatArabicDate(post);
    pubDate.setAttribute("datetime", toIsoDateString(post));
  }

  const authorBox = document.getElementById("reader-author-box");
  if (authorBox) {
    authorBox.onclick = () => openAuthorProfileView(authorInfo.authorKey, true);
  }

  const videoBox = document.getElementById("reader-video-box");
  if (videoBox) {
    const embedHtml = buildVideoEmbedHtml(post);
    if (embedHtml) {
      videoBox.innerHTML = embedHtml;
      videoBox.classList.remove("hidden");
    } else {
      videoBox.innerHTML = "";
      videoBox.classList.add("hidden");
    }
  }

  const figureEl = document.getElementById("reader-media-figure");
  if (figureEl) {
    const mainImg = (post.imageUrl || "").trim();
    if (mainImg) {
      figureEl.innerHTML = `<img src="${escapeHtml(mainImg)}" alt="${escapeHtml(
        post.title
      )}">`;
      figureEl.classList.remove("hidden");
      figureEl.querySelector("img")?.addEventListener("click", () => {
        openImageLightbox(mainImg, post.title);
      });
    } else {
      figureEl.innerHTML = "";
      figureEl.classList.add("hidden");
    }
  }

  const contentEl = document.getElementById("reader-article-content");
  if (contentEl) {
    contentEl.innerHTML = post.content || `<p>${escapeHtml(post.summary || "")}</p>`;
    // تفعيل تكبير أي صورة مدمجة بين فقرات المقال عند النقر عليها
    contentEl.querySelectorAll("img").forEach((img) => {
      img.addEventListener("click", () => {
        const cap =
          img.closest("figure")?.querySelector("figcaption")?.textContent ||
          img.alt ||
          post.title;
        openImageLightbox(img.src, cap);
      });
    });
  }

  const tagsBox = document.getElementById("reader-tags-box");
  if (tagsBox) {
    const tags = Array.isArray(post.tags) ? post.tags.slice(0, 3) : [];
    if (tags.length) {
      tagsBox.classList.remove("hidden");
      tagsBox.innerHTML = tags
        .map((t) => {
          const clean = String(t).replace(/^#+/, "").trim();
          return `<button type="button" class="tag-chip" data-filter-tag="${escapeHtml(
            clean
          )}">#${escapeHtml(clean)}</button>`;
        })
        .join("");

      tagsBox.querySelectorAll("[data-filter-tag]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.activeTag = btn.getAttribute("data-filter-tag") || "";
          switchActiveAppView("home");
          renderAllHomeSections();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
    } else {
      tagsBox.classList.add("hidden");
    }
  }

  // أخبار ذات صلة
  const relatedGrid = document.getElementById("related-posts-grid");
  if (relatedGrid) {
    const related = getPublishedPosts()
      .filter((p) => p.id !== post.id && p.category === post.category)
      .slice(0, 3);
    relatedGrid.innerHTML = related.map(buildNewsCardHtml).join("");
    relatedGrid.querySelectorAll("[data-open-post]").forEach((card) => {
      card.addEventListener("click", () =>
        openArticleReader(card.getAttribute("data-open-post"), true)
      );
    });
  }

  // تحديث بيانات الـ SEO وحقن NewsArticle Schema.org الكامل لمحركات البحث وجوجل نيوز
  const articleCanonicalUrl = `${OFFICIAL_SITE_ORIGIN}/?post=${encodeURIComponent(post.id)}`;
  const articleDesc =
    post.summary || stripHtmlTags(post.content || "").slice(0, 200) || post.title;
  const articleImg =
    post.imageUrl ||
    state.settings.defaultPostImageUrl ||
    state.settings.logoUrl ||
    "";

  const newsArticleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleCanonicalUrl
    },
    headline: (post.title || "").slice(0, 110),
    description: articleDesc,
    image: articleImg ? [articleImg] : [],
    datePublished: toIsoDateString(post.createdAt || post),
    dateModified: toIsoDateString(post.updatedAt || post.createdAt || post),
    author: {
      "@type": "Person",
      name: authorInfo.name
    },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: state.settings.siteName || "حُجرية بريس",
      url: OFFICIAL_SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: state.settings.logoUrl || articleImg
      }
    }
  };

  updateDynamicSeoAndSchema({
    title: post.title,
    description: articleDesc,
    canonicalPath: `/?post=${encodeURIComponent(post.id)}`,
    imageUrl: articleImg,
    type: "article",
    schemaObject: newsArticleSchema
  });

  if (pushUrlState) {
    window.history.pushState(
      { post: post.id },
      "",
      `/?post=${encodeURIComponent(post.id)}`
    );
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==================== 11. صفحة الكاتب، الصفحات الثابتة، والمشاركة الموحدة ====================
function openAuthorProfileView(authorKey, pushUrlState = true) {
  if (!authorKey) return;
  state.currentAuthorKey = authorKey;
  switchActiveAppView("author");

  const staffMember = state.staff.find(
    (s) =>
      s.id === authorKey ||
      String(s.username || "").toLowerCase() === String(authorKey).toLowerCase() ||
      String(s.name || "").trim() === String(authorKey).trim()
  );

  const name = staffMember?.name || authorKey;
  const isVer = Boolean(
    staffMember?.verified ||
      staffMember?.isMasterAdmin ||
      staffMember?.role === "admin"
  );
  const avatar =
    staffMember?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=b80d38&color=fff`;

  document.getElementById("author-view-avatar")?.setAttribute("src", avatar);
  const nameEl = document.getElementById("author-view-name");
  if (nameEl) nameEl.textContent = name;
  document
    .getElementById("author-view-verified")
    ?.classList.toggle("hidden", !isVer);

  const jobEl = document.getElementById("author-view-job");
  if (jobEl) jobEl.textContent = staffMember?.jobTitle || "كاتب وصحفي في حُجرية بريس";

  const bioEl = document.getElementById("author-view-bio");
  if (bioEl) bioEl.textContent = staffMember?.bio || "";

  const headingEl = document.getElementById("author-articles-heading");
  if (headingEl) headingEl.textContent = `أرشيف مقالات: ${name}`;

  const authorPosts = getPublishedPosts().filter((p) => {
    if (staffMember && p.authorId === staffMember.id) return true;
    return String(p.author || "").trim() === String(name).trim();
  });

  const grid = document.getElementById("author-posts-grid");
  if (grid) {
    grid.innerHTML = authorPosts.length
      ? authorPosts.map(buildNewsCardHtml).join("")
      : `<div class="skeleton-box" style="grid-column:1/-1;height:140px;">لا توجد مقالات منشورة لهذا الكاتب حالياً.</div>`;

    grid.querySelectorAll("[data-open-post]").forEach((card) => {
      card.addEventListener("click", () =>
        openArticleReader(card.getAttribute("data-open-post"), true)
      );
    });
  }

  updateDynamicSeoAndSchema({
    title: `مقالات الكاتب ${name}`,
    description:
      staffMember?.bio || `أرشيف المقالات والتحليلات الصحفية للكاتب ${name} في منصة حُجرية بريس.`,
    canonicalPath: `/?author=${encodeURIComponent(authorKey)}`,
    imageUrl: avatar,
    type: "profile"
  });

  if (pushUrlState) {
    window.history.pushState(
      { author: authorKey },
      "",
      `/?author=${encodeURIComponent(authorKey)}`
    );
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openStaticInstitutionalPage(pageKey, pushUrlState = true) {
  closeMasterSidebar();
  switchActiveAppView("static");

  const titles = {
    about: "من نحن والتوجيه الوطني",
    charter: "ميثاق الشرف الصحفي",
    privacy: "سياسة الخصوصية"
  };

  const customBodies = {
    about: state.settings.aboutHtml || DEFAULT_INSTITUTIONAL_TEXTS.about,
    charter: state.settings.charterHtml || DEFAULT_INSTITUTIONAL_TEXTS.charter,
    privacy: state.settings.privacyHtml || DEFAULT_INSTITUTIONAL_TEXTS.privacy
  };

  const titleEl = document.getElementById("static-page-title");
  const bodyEl = document.getElementById("static-page-body");

  const pageTitle = titles[pageKey] || "حُجرية بريس";
  const pageHtml = customBodies[pageKey] || DEFAULT_INSTITUTIONAL_TEXTS.about;

  if (titleEl) titleEl.textContent = pageTitle;
  if (bodyEl) bodyEl.innerHTML = pageHtml;

  updateDynamicSeoAndSchema({
    title: pageTitle,
    description: stripHtmlTags(pageHtml).slice(0, 200),
    canonicalPath: `/?page=${encodeURIComponent(pageKey)}`
  });

  if (pushUrlState) {
    window.history.pushState(
      { page: pageKey },
      "",
      `/?page=${encodeURIComponent(pageKey)}`
    );
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleUnifiedShareCurrentArticle() {
  const post = state.posts.find((p) => p.id === state.currentArticleId);
  if (!post) return;

  const shareUrl = `${OFFICIAL_SITE_ORIGIN}/?post=${encodeURIComponent(post.id)}`;
  const shareTitle = post.title || "حُجرية بريس";
  const shareSummary = post.summary ? `\n\n${post.summary}` : "";
  const fullShareText = `${shareTitle}${shareSummary}\n\nاقرأ التفاصيل عبر حُجرية بريس:\n${shareUrl}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: `${shareTitle}${shareSummary}`,
        url: shareUrl
      });
      return;
    } catch (_) {}
  }

  try {
    await navigator.clipboard.writeText(fullShareText);
    showPublicToast("تم نسخ الخبر مع الملخص والرابط للمشاركة ✓");
  } catch (_) {
    showPublicToast("تم تجهيز الرابط للمشاركة");
  }
}

// ==================== 12. إدارة التنقل بين الواجهات والروابط العميقة (Deep Linking & Sitemap Router) ====================
function switchActiveAppView(viewName) {
  const viewsMap = {
    home: document.getElementById("view-home"),
    article: document.getElementById("view-article"),
    author: document.getElementById("view-author"),
    static: document.getElementById("view-static-page")
  };

  Object.entries(viewsMap).forEach(([key, el]) => {
    if (el) el.classList.toggle("hidden", key !== viewName);
  });

  renderNavigationAndSidebar();
}

function handleUrlRoutingOnLoadOrPopState() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("post");
  const pageKey = params.get("page");
  const compassKey = params.get("compass");
  const authorKey = params.get("author");

  if (postId) {
    const found = state.posts.find((p) => p.id === postId);
    if (found) {
      openArticleReader(postId, false);
      return true;
    }
  }

  if (pageKey && ["about", "charter", "privacy"].includes(pageKey)) {
    openStaticInstitutionalPage(pageKey, false);
    return true;
  }

  if (authorKey) {
    openAuthorProfileView(authorKey, false);
    return true;
  }

  if (compassKey) {
    selectCompassFilter(compassKey, false);
    return true;
  }

  switchActiveAppView("home");
  updateDynamicSeoAndSchema({
    title: "",
    description: state.settings.siteDescription,
    canonicalPath: "/"
  });
  return false;
}

function openMasterSidebar() {
  document.getElementById("master-sidebar-backdrop")?.classList.remove("hidden");
  document.getElementById("master-sidebar-drawer")?.classList.remove("hidden");
}

function closeMasterSidebar() {
  document.getElementById("master-sidebar-backdrop")?.classList.add("hidden");
  document.getElementById("master-sidebar-drawer")?.classList.add("hidden");
}

function openImageLightbox(src, caption = "") {
  const modal = document.getElementById("inline-image-lightbox");
  const img = document.getElementById("lightbox-full-img");
  const cap = document.getElementById("lightbox-caption-text");
  if (!modal || !img) return;

  img.src = src;
  if (cap) {
    cap.textContent = caption || "";
    cap.classList.toggle("hidden", !caption);
  }
  modal.classList.remove("hidden");
}

// ==================== 13. ربط جميع الأحداث والمزامنة الخلفية مع Firestore ====================
function bindAllPublicEvents() {
  document
    .getElementById("open-master-sidebar-btn")
    ?.addEventListener("click", openMasterSidebar);
  document
    .getElementById("close-master-sidebar-btn")
    ?.addEventListener("click", closeMasterSidebar);
  document
    .getElementById("master-sidebar-backdrop")
    ?.addEventListener("click", closeMasterSidebar);

  document.getElementById("brand-home-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    selectCompassFilter("all", true);
  });

  document.getElementById("sidebar-home-btn")?.addEventListener("click", () => {
    closeMasterSidebar();
    selectCompassFilter("all", true);
  });

  // منافذ النبض والمرئيات
  ["header-pulse-shortcut", "view-all-pulse-btn", "sidebar-pulse-page-btn"].forEach(
    (id) => {
      document.getElementById(id)?.addEventListener("click", () => {
        closeMasterSidebar();
        selectCompassFilter("pulse-only", true);
      });
    }
  );

  ["header-shorts-shortcut", "view-all-shorts-btn", "sidebar-shorts-page-btn"].forEach(
    (id) => {
      document.getElementById(id)?.addEventListener("click", () => {
        closeMasterSidebar();
        selectCompassFilter("shorts-only", true);
      });
    }
  );

  // الصفحات المؤسسية
  document.querySelectorAll("[data-open-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openStaticInstitutionalPage(btn.getAttribute("data-open-page") || "about", true);
    });
  });

  // أزرار العودة
  ["back-from-article-btn", "back-from-author-btn", "back-from-static-btn"].forEach(
    (id) => {
      document.getElementById(id)?.addEventListener("click", () => {
        selectCompassFilter("all", true);
      });
    }
  );

  document.getElementById("reset-all-filters-btn")?.addEventListener("click", () => {
    state.searchQuery = "";
    const sInp = document.getElementById("public-search-input");
    if (sInp) sInp.value = "";
    document.getElementById("clear-search-btn")?.classList.add("hidden");
    selectCompassFilter("all", true);
  });

  // زر تحميل المزيد من الأخبار (Pagination)
  document.getElementById("load-more-posts-btn")?.addEventListener("click", () => {
    state.visiblePostsCount += POSTS_BATCH_SIZE;
    renderMainPostsFeed(getPublishedPosts());
  });

  // المشاركة الموحدة
  document
    .getElementById("unified-share-btn")
    ?.addEventListener("click", handleUnifiedShareCurrentArticle);
  document
    .getElementById("unified-share-bottom-btn")
    ?.addEventListener("click", handleUnifiedShareCurrentArticle);

  // شريط البحث الذكي العائم في الأسفل
  const searchForm = document.getElementById("public-search-form");
  const searchInput = document.getElementById("public-search-input");
  const clearSearchBtn = document.getElementById("clear-search-btn");

  searchForm?.addEventListener("submit", (e) => e.preventDefault());

  searchInput?.addEventListener("input", () => {
    const val = (searchInput.value || "").trim();
    state.searchQuery = val;
    state.visiblePostsCount = POSTS_BATCH_SIZE;
    clearSearchBtn?.classList.toggle("hidden", !val);

    if (document.getElementById("view-home")?.classList.contains("hidden")) {
      switchActiveAppView("home");
    }
    renderAllHomeSections();
  });

  clearSearchBtn?.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
    state.searchQuery = "";
    clearSearchBtn.classList.add("hidden");
    renderAllHomeSections();
  });

  // عارض الصور المكبر (Lightbox)
  document.getElementById("close-lightbox-btn")?.addEventListener("click", () => {
    document.getElementById("inline-image-lightbox")?.classList.add("hidden");
  });
  document
    .getElementById("inline-image-lightbox")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "inline-image-lightbox") {
        e.currentTarget.classList.add("hidden");
      }
    });

  window.addEventListener("popstate", () => {
    handleUrlRoutingOnLoadOrPopState();
  });
}

function startFirestoreBackgroundSync() {
  onSnapshot(doc(db, "settings", "general"), (snap) => {
    if (snap.exists()) {
      state.settings = { ...state.settings, ...snap.data() };
      applyPublicBrandingAndIdentity();
      savePublicDataToLocalCache();
    }
  });

  onSnapshot(collection(db, "categories"), (snap) => {
    if (!snap.empty) {
      const dbCats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const merged = [...DEFAULT_COMPASSES];
      dbCats.forEach((cat) => {
        const idx = merged.findIndex(
          (m) =>
            m.id === cat.id ||
            getCleanCategoryLabel(m.name) === getCleanCategoryLabel(cat.name)
        );
        if (idx >= 0) merged[idx] = { ...merged[idx], ...cat };
        else merged.push(cat);
      });
      state.compasses = merged;
      renderNavigationAndSidebar();
      savePublicDataToLocalCache();
    }
  });

  onSnapshot(collection(db, "staff"), (snap) => {
    state.staff = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderWritersStripAndSidebar();
    renderAllHomeSections();
    savePublicDataToLocalCache();
  });

  let deepLinkCheckedAfterCloud = false;
  onSnapshot(collection(db, "posts"), (snap) => {
    state.posts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => getPostTimestampMs(b) - getPostTimestampMs(a));

    renderAllHomeSections();
    savePublicDataToLocalCache();

    if (!deepLinkCheckedAfterCloud) {
      deepLinkCheckedAfterCloud = true;
      const params = new URLSearchParams(window.location.search);
      if (params.get("post")) {
        openArticleReader(params.get("post"), false);
      }
    }
  });

  onSnapshot(collection(db, "ads"), (snap) => {
    state.ads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderPublicAds();
  });
}

// ==================== 14. نقطة انطلاق المنصة (سرعة البرق 0ms + فهرسة ذكية) ====================
document.addEventListener("DOMContentLoaded", () => {
  bindAllPublicEvents();

  // 1. قراءة الكاش المحلي فوراً في اللحظة (0ms) لعرض الأخبار والهوية والطقس دون أي انتظار
  restorePublicDataFromLocalCache();
  renderRegionalWeatherStrip();

  // 2. معالجة الرابط المفتوح (الرئيسية، مقال، قسم، كاتب، أو صفحة مؤسسية من خريطة الموقع)
  handleUrlRoutingOnLoadOrPopState();

  // 3. تشغيل المزامنة الصامتة في الخلفية لجلب أي أخبار جديدة وتحديث درجات الحرارة
  startFirestoreBackgroundSync();
  syncLiveRegionalWeather();
});
