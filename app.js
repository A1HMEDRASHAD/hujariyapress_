/* ==========================================================================
   حُجرية بريس (Hujariya Press) — المحرك البرمجي للموقع العام (app.js v6.0)
   النسخة المتكاملة مع غرفتي الأخبار والتحكم:
   - إقلاع فوري (0ms Cache) + مزامنة حية مع Firebase Firestore
   - دعم الشعارات الثلاثة، اللون الديناميكي العام، والصورة الافتراضية للأخبار
   - معالجة تلقائية لمشكلة (www.) في روابط النطاق الفرعي لمنع خطأ SSL
   - فلترة صارمة تستبعد المسودات والمراجعات وطلبات الحذف (Soft Delete)
   - شريط عاجل ذكي + واجهة كبرى (Bento Hero) + موجز النبض + مشغل فيديو (16:9 و 9:16)
   - بطاقة الهوية الصحفية التفاعلية للكاتب (HP#####) + البحث الذكي الفوري
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  updateDoc,
  increment,
  onSnapshot
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

// التوجيه الفوري إذا دخل الزائر عبر www. على النطاق الفرعي لمنع خطأ شهادة SSL في Cloudflare
if (
  typeof window !== "undefined" &&
  window.location.hostname.startsWith("www.") &&
  window.location.hostname.split(".").length > 3
) {
  const cleanHost = window.location.hostname.replace(/^www\./i, "");
  window.location.replace(
    `${window.location.protocol}//${cleanHost}${window.location.pathname}${window.location.search}`
  );
}

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const PUB_FAST_CACHE_KEY = "hujariya_public_fast_cache_v6";
const DEFAULT_BRAND_COLOR = "#b80d38";
const FEED_PAGE_SIZE = 9;

// صورة افتراضية مدمجة عالية الدقة في حال لم يكن للخبر صورة ولم تُرفع صورة افتراضية بعد
const FALLBACK_BRAND_POST_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#b80d38"/>
          <stop offset="100%" stop-color="#3a0412"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#g)"/>
      <circle cx="1050" cy="120" r="260" fill="rgba(255,255,255,0.05)"/>
      <circle cx="160" cy="560" r="320" fill="rgba(255,255,255,0.04)"/>
      <text x="600" y="330" fill="#ffffff" font-family="Almarai, sans-serif" font-size="76" font-weight="800" text-anchor="middle">حُجرية بريس</text>
      <text x="600" y="405" fill="rgba(255,255,255,0.85)" font-family="Alexandria, sans-serif" font-size="30" font-weight="600" text-anchor="middle">Hujariya Press — RAWI-YE.COM</text>
    </svg>
  `);

const DEFAULT_COMPASSES = [
  {
    id: "yemen-politics",
    name: "السياسة اليمنية",
    subcategories: ["الشرعية ومؤسسات الدولة", "التحليلات الاستراتيجية", "الشأن المحلي والمحافظات", "ملفات ميدانية"],
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

const DEFAULT_CHARTER_HTML = `
  <h3>أولاً: الالتزام المهني والمصداقية الصحفية</h3>
  <p>يلتزم الصحفي والكاتب في منصة <strong>حُجرية بريس (Hujariya Press)</strong> بتحري الدقة والموضوعية، والتثبت من صحة الأخبار والمصادر قبل صياغتها أو إرسالها للنشر.</p>
  <h3>ثانياً: الثوابت الوطنية والمسؤولية القانونية</h3>
  <p>يلتزم العضو باحترام الثوابت الوطنية والمهنية، والامتناع التام عن نشر الشائعات أو المواد المنتهكة للحقوق.</p>
`;

const DEFAULT_ABOUT_HTML = `
  <h3>عن منصة حُجرية بريس (Hujariya Press)</h3>
  <p>منصة إخبارية وتحليلية شاملة تندرج تحت مظلة مؤسسة <strong>RAWI-YE.COM</strong> الإعلامية الرقمية، تُعنى بتقديم الخبر الدقيق والتحليل الرصين في الشأن اليمني والإقليمي والدولي.</p>
`;

const DEFAULT_PRIVACY_HTML = `
  <h3>سياسة الخصوصية وحماية البيانات</h3>
  <p>تحترم منصة <strong>حُجرية بريس</strong> خصوصية القراء والزوار، ولا تجمع أي بيانات شخصية دون علم المستخدم، وتلتزم بمعايير الأمان الرقمي وحقوق الملكية الفكرية.</p>
`;

// ==================== 2. الحالة المركزية للموقع العام ====================
const state = {
  settings: {
    siteName: "حُجرية بريس",
    siteDescription: "منصة إخبارية وتحليلية شاملة تندرج تحت مظلة مؤسسة RAWI-YE.COM الإعلامية الرقمية.",
    accentColor: DEFAULT_BRAND_COLOR,
    hideSiteName: false,
    logoUrl: "",
    headerLogoUrl: "",
    sidebarLogoUrl: "",
    footerLogoUrl: "",
    defaultPostImageUrl: "",
    faviconUrl: "",
    appIconUrl: "",
    charterHtml: DEFAULT_CHARTER_HTML,
    aboutHtml: DEFAULT_ABOUT_HTML,
    privacyHtml: DEFAULT_PRIVACY_HTML,
    socials: {}
  },
  compasses: structuredClone(DEFAULT_COMPASSES),
  posts: [],
  staff: [],
  ads: [],
  activeCategory: "all",
  activeSubcategory: "",
  activeTag: "",
  activeAuthorFilter: "",
  searchQuery: "",
  visibleFeedCount: FEED_PAGE_SIZE,
  currentReadingPostId: null,
  viewedPostsInSession: new Set(),
  viewedAdsInSession: new Set()
};

// ==================== 3. الدوال المساعدة، الروابط النظيفة، والهوية الديناميكية ====================
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCategoryName(name = "") {
  return (
    String(name)
      .replace(/^بوصلة\s+/i, "")
      .replace(/^البوصلة\s+/i, "")
      .trim() || name
  );
}

function normalizePressId(raw = "") {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function showToast(msg) {
  const toast = document.getElementById("pub-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(window.__pubToastTimer);
  window.__pubToastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3200);
}

function debounce(fn, delay = 200) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function getTimestampMs(item) {
  if (!item) return 0;
  const t = item.createdAt || item.updatedAt || item.createdTimestamp;
  if (!t) return 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  const parsed = new Date(t).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function formatArabicDate(msOrItem) {
  const ms = typeof msOrItem === "number" ? msOrItem : getTimestampMs(msOrItem);
  if (!ms) return "منذ قليل";
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec >= 0 && diffSec < 3600) {
    const mins = Math.max(1, Math.floor(diffSec / 60));
    return `منذ ${mins} دقيقة`;
  }
  if (diffSec >= 3600 && diffSec < 86400) {
    const hrs = Math.floor(diffSec / 3600);
    return `منذ ${hrs} ساعة`;
  }
  return new Date(ms).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// توليد رابط نظيف خالٍ من (www.) لمنع مشكلة شهادة الأمان في النطاقات الفرعية
function getCleanBaseSiteUrl() {
  const origin = window.location.origin.replace("://www.", "://");
  const path = window.location.pathname.replace(/index\.html$/i, "");
  return `${origin}${path}`.replace(/\/+$/, "");
}

function getCleanPostShareUrl(postId) {
  return `${getCleanBaseSiteUrl()}/?post=${encodeURIComponent(postId)}`;
}

// اختيار صورة الخبر أو الصورة الافتراضية المرفوعة في غرفة التحكم
function resolvePostImage(post) {
  const postImg = String(post?.imageUrl || "").trim();
  if (postImg) return postImg;
  const defaultSettingImg = String(
    state.settings.defaultPostImageUrl || state.settings.coverImageUrl || ""
  ).trim();
  if (defaultSettingImg) return defaultSettingImg;
  return FALLBACK_BRAND_POST_SVG;
}

// استخراج بيانات الكاتب الحية من سجل الكادر (الصورة، الشارة الزرقاء، الهوية الصحفية HP)
function resolveAuthorData(post) {
  const staffMatch = state.staff.find((s) => {
    if (post.authorId && s.id === post.authorId) return true;
    if (
      post.authorPressId &&
      normalizePressId(s.pressId) === normalizePressId(post.authorPressId)
    ) {
      return true;
    }
    if (
      post.author &&
      String(s.name || "").trim() === String(post.author || "").trim()
    ) {
      return true;
    }
    return false;
  });

  const name = staffMatch?.name || post?.author || "هيئة التحرير";
  const pressId = normalizePressId(
    staffMatch?.pressId || post?.authorPressId || "HP10001"
  );
  const verified = Boolean(staffMatch?.verified || post?.authorVerified);
  const jobTitle = staffMatch?.jobTitle || "صحفي ومحرر في حُجرية بريس";
  const bio =
    staffMatch?.bio ||
    `كاتب وصحفي معتمد في منصة ${state.settings.siteName || "حُجرية بريس"}.`;
  const avatar =
    staffMatch?.avatar ||
    post?.authorAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=b80d38&color=fff`;

  return {
    id: staffMatch?.id || post?.authorId || "",
    name,
    pressId,
    verified,
    jobTitle,
    bio,
    avatar
  };
}

function hexToRgbTuple(hex = DEFAULT_BRAND_COLOR) {
  const clean = String(hex).replace("#", "").trim();
  if (clean.length !== 6) return "184, 13, 56";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "184, 13, 56";
  return `${r}, ${g}, ${b}`;
}

function darkenHexColor(hex = DEFAULT_BRAND_COLOR, factor = 0.76) {
  const clean = String(hex).replace("#", "").trim();
  if (clean.length !== 6) return "#8e0729";
  const r = Math.max(0, Math.floor(parseInt(clean.slice(0, 2), 16) * factor));
  const g = Math.max(0, Math.floor(parseInt(clean.slice(2, 4), 16) * factor));
  const b = Math.max(0, Math.floor(parseInt(clean.slice(4, 6), 16) * factor));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

// تطبيق الهوية اللونية والشعارات الثلاثة والوسوم الدلالية
function applyDynamicIdentityAndMeta(activePost = null) {
  const s = state.settings;
  const rawColor = (s.accentColor || "").trim();
  const primaryColor =
    !rawColor || rawColor.toLowerCase() === "#ef3327"
      ? DEFAULT_BRAND_COLOR
      : rawColor;
  const rgb = hexToRgbTuple(primaryColor);
  const darkColor = darkenHexColor(primaryColor, 0.76);

  const root = document.documentElement;
  root.style.setProperty("--brand-primary", primaryColor);
  root.style.setProperty("--brand-dark", darkColor);
  root.style.setProperty("--brand-soft", `rgba(${rgb}, 0.08)`);
  root.style.setProperty("--brand-border", `rgba(${rgb}, 0.22)`);
  root.style.setProperty("--brand-shadow", `0 12px 32px -8px rgba(${rgb}, 0.16)`);

  document.getElementById("pub-theme-color")?.setAttribute("content", primaryColor);

  const siteName =
    s.siteName && s.siteName !== "شبكة البوصلة" && s.siteName !== "نبض اليمن"
      ? s.siteName
      : "حُجرية بريس";
  const siteDesc =
    s.siteDescription ||
    "منصة إخبارية وتحليلية شاملة تندرج تحت مظلة مؤسسة RAWI-YE.COM الإعلامية الرقمية.";

  ["header-site-name", "sidebar-site-name", "footer-site-name", "footer-copy-name"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = siteName;
    }
  );

  ["sidebar-site-desc", "footer-site-desc"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = siteDesc;
  });

  const yearEl = document.getElementById("footer-copy-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const dateEl = document.getElementById("header-date-display");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("ar-YE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  // ربط الشعارات الثلاثة وخيار إخفاء الاسم النصي بجانب شعار الهيدر
  const headerLogo = (s.headerLogoUrl || s.logoUrl || "").trim();
  const sidebarLogo = (s.sidebarLogoUrl || s.authLogoUrl || headerLogo).trim();
  const footerLogo = (s.footerLogoUrl || headerLogo).trim();

  const bindLogo = (imgId, capId, url) => {
    const imgEl = document.getElementById(imgId);
    const capEl = document.getElementById(capId);
    if (!imgEl) return;
    if (url) {
      imgEl.src = url;
      imgEl.classList.remove("hidden");
      capEl?.classList.remove("hidden");
    } else {
      imgEl.classList.add("hidden");
      capEl?.classList.add("hidden");
    }
  };

  bindLogo("header-logo-img", "header-logo-capsule", headerLogo);
  bindLogo("sidebar-logo-img", "sidebar-logo-capsule", sidebarLogo);
  bindLogo("footer-logo-img", "footer-logo-capsule", footerLogo);

  const headerTextWrap = document.getElementById("header-text-wrap");
  if (headerTextWrap) {
    headerTextWrap.classList.toggle("hidden", Boolean(s.hideSiteName && headerLogo));
  }

  const fav = (s.faviconUrl || s.appIconUrl || headerLogo || "").trim();
  if (fav) {
    document.getElementById("pub-dynamic-favicon")?.setAttribute("href", fav);
    document.getElementById("pub-dynamic-apple-icon")?.setAttribute("href", fav);
  }

  // تحديث وسوم Open Graph و Twitter Cards للمعاينة
  const pageTitle = activePost
    ? `${activePost.title} | ${siteName}`
    : `${siteName} | Hujariya Press — منصة إخبارية وتحليلية شاملة`;
  const pageDesc = activePost
    ? activePost.summary || stripHtml(activePost.content).slice(0, 180)
    : siteDesc;
  const pageUrl = activePost
    ? getCleanPostShareUrl(activePost.id)
    : `${getCleanBaseSiteUrl()}/`;
  const pageImg = activePost
    ? resolvePostImage(activePost)
    : s.defaultPostImageUrl || headerLogo || `${getCleanBaseSiteUrl()}/og-cover.jpg`;

  document.title = pageTitle;
  document.getElementById("pub-meta-desc")?.setAttribute("content", pageDesc);
  document.getElementById("pub-canonical-link")?.setAttribute("href", pageUrl);
  document.getElementById("og-site-name")?.setAttribute("content", siteName);
  document.getElementById("og-title")?.setAttribute("content", pageTitle);
  document.getElementById("og-desc")?.setAttribute("content", pageDesc);
  document.getElementById("og-url")?.setAttribute("content", pageUrl);
  document.getElementById("og-image")?.setAttribute("content", pageImg);
  document.getElementById("tw-title")?.setAttribute("content", pageTitle);
  document.getElementById("tw-desc")?.setAttribute("content", pageDesc);
  document.getElementById("tw-image")?.setAttribute("content", pageImg);

  renderSocialLinksInDom();
}

function renderSocialLinksInDom() {
  const soc = state.settings.socials || {};
  const items = [
    { key: "whatsapp", label: "واتساب", url: soc.whatsapp },
    { key: "telegram", label: "تليجرام", url: soc.telegram },
    { key: "x", label: "منصة X", url: soc.x },
    { key: "facebook", label: "فيسبوك", url: soc.facebook },
    { key: "youtube", label: "يوتيوب", url: soc.youtube },
    { key: "tiktok", label: "تيك توك", url: soc.tiktok }
  ].filter((x) => x.url && String(x.url).trim());

  const html = items
    .map(
      (item) => `
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="pub-social-pill">
        ${escapeHtml(item.label)}
      </a>
    `
    )
    .join("");

  const sideSoc = document.getElementById("sidebar-socials-list");
  const footSoc = document.getElementById("footer-socials-row");
  if (sideSoc) sideSoc.innerHTML = html || `<small style="color:var(--text-muted);">روابط التواصل الرسمية</small>`;
  if (footSoc) footSoc.innerHTML = html;
}

// ==================== 4. الكاش الفوري (0ms Cache) ====================
function saveFastCache() {
  try {
    const payload = {
      savedAt: Date.now(),
      settings: state.settings,
      compasses: state.compasses,
      posts: state.posts.slice(0, 65),
      staff: state.staff,
      ads: state.ads
    };
    localStorage.setItem(PUB_FAST_CACHE_KEY, JSON.stringify(payload));
  } catch (_) {}
}

function restoreFastCache() {
  try {
    const raw = localStorage.getItem(PUB_FAST_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed) return false;

    if (parsed.settings) state.settings = { ...state.settings, ...parsed.settings };
    if (Array.isArray(parsed.compasses) && parsed.compasses.length) {
      state.compasses = parsed.compasses;
    }
    if (Array.isArray(parsed.posts)) state.posts = parsed.posts;
    if (Array.isArray(parsed.staff)) state.staff = parsed.staff;
    if (Array.isArray(parsed.ads)) state.ads = parsed.ads;

    applyDynamicIdentityAndMeta();
    return true;
  } catch (_) {
    return false;
  }
}

// ==================== 5. الأقسام، شريط العاجل، والإعلانات الممولة ====================
function getPublishedPostsOnly() {
  return state.posts.filter((p) => !p.status || p.status === "published");
}

function renderCategoriesNavigation() {
  const visibleCats = [...state.compasses]
    .filter((c) => c.visible !== false)
    .sort((a, b) => (a.order || 99) - (b.order || 99));

  const navEl = document.getElementById("public-categories-nav");
  const sideList = document.getElementById("sidebar-categories-list");
  const footLinks = document.getElementById("footer-categories-links");

  if (navEl) {
    navEl.innerHTML = [
      `<button type="button" class="pub-cat-link ${
        state.activeCategory === "all" ? "active" : ""
      }" data-cat="all">الرئيسية</button>`,
      ...visibleCats.map((c) => {
        const clean = cleanCategoryName(c.name);
        const isActive = state.activeCategory === clean;
        return `<button type="button" class="pub-cat-link ${
          isActive ? "active" : ""
        }" data-cat="${escapeHtml(clean)}">${escapeHtml(clean)}</button>`;
      })
    ].join("");

    navEl.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectPublicCategory(btn.getAttribute("data-cat") || "all");
      });
    });
  }

  if (sideList) {
    sideList.innerHTML = [
      `<button type="button" class="pub-sidebar-item" data-side-cat="all">
        <span class="material-symbols-rounded" translate="no">home</span>
        <span>الرئيسية وكافة الأخبار</span>
      </button>`,
      ...visibleCats.map((c) => {
        const clean = cleanCategoryName(c.name);
        return `
          <button type="button" class="pub-sidebar-item" data-side-cat="${escapeHtml(clean)}">
            <span class="material-symbols-rounded" translate="no">label_important</span>
            <span>${escapeHtml(clean)}</span>
          </button>
        `;
      })
    ].join("");

    sideList.querySelectorAll("[data-side-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        closePublicSidebar();
        selectPublicCategory(btn.getAttribute("data-side-cat") || "all");
      });
    });
  }

  if (footLinks) {
    footLinks.innerHTML = visibleCats
      .slice(0, 6)
      .map((c) => {
        const clean = cleanCategoryName(c.name);
        return `<button type="button" class="pub-footer-link" data-foot-cat="${escapeHtml(
          clean
        )}">${escapeHtml(clean)}</button>`;
      })
      .join("");

    footLinks.querySelectorAll("[data-foot-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectPublicCategory(btn.getAttribute("data-foot-cat") || "all");
      });
    });
  }

  renderSubcategoriesBar();
}

function renderSubcategoriesBar() {
  const wrap = document.getElementById("public-subcategories-wrap");
  const nav = document.getElementById("public-subcategories-nav");
  if (!wrap || !nav) return;

  if (state.activeCategory === "all") {
    wrap.classList.add("hidden");
    return;
  }

  const matchedCat = state.compasses.find(
    (c) => cleanCategoryName(c.name) === state.activeCategory
  );
  const subs = Array.isArray(matchedCat?.subcategories) ? matchedCat.subcategories : [];

  if (!subs.length) {
    wrap.classList.add("hidden");
    return;
  }

  wrap.classList.remove("hidden");
  nav.innerHTML = [
    `<button type="button" class="pub-subcat-btn ${
      !state.activeSubcategory ? "active" : ""
    }" data-subcat="">كل أخبار ${escapeHtml(state.activeCategory)}</button>`,
    ...subs.map(
      (sub) => `
      <button type="button" class="pub-subcat-btn ${
        state.activeSubcategory === sub ? "active" : ""
      }" data-subcat="${escapeHtml(sub)}">${escapeHtml(sub)}</button>
    `
    )
  ].join("");

  nav.querySelectorAll("[data-subcat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeSubcategory = btn.getAttribute("data-subcat") || "";
      state.visibleFeedCount = FEED_PAGE_SIZE;
      renderSubcategoriesBar();
      renderPublicFeedAndHero();
    });
  });
}

function selectPublicCategory(catName) {
  state.activeCategory = catName || "all";
  state.activeSubcategory = "";
  state.activeTag = "";
  state.activeAuthorFilter = "";
  state.visibleFeedCount = FEED_PAGE_SIZE;

  exitArticleReaderToHome(false);
  renderCategoriesNavigation();
  renderPublicFeedAndHero();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderBreakingNewsBar() {
  const bar = document.getElementById("breaking-news-bar");
  const track = document.getElementById("breaking-ticker-track");
  if (!bar || !track) return;

  const now = Date.now();
  const breakingPosts = getPublishedPostsOnly().filter(
    (p) => p.isBreaking && (!p.breakingExpiresAt || Number(p.breakingExpiresAt) > now)
  );

  if (!breakingPosts.length) {
    bar.classList.add("hidden");
    return;
  }

  bar.classList.remove("hidden");
  track.innerHTML = breakingPosts
    .slice(0, 8)
    .map(
      (p) => `
      <span class="pub-breaking-item" data-open-post="${escapeHtml(p.id)}">
        <span>${escapeHtml(p.title)}</span>
        <span style="opacity:0.65;">•</span>
      </span>
    `
    )
    .join("");

  track.querySelectorAll("[data-open-post]").forEach((el) => {
    el.addEventListener("click", () => {
      openArticleReader(el.getAttribute("data-open-post"));
    });
  });
}

function renderSponsoredAdsSlots() {
  const activeAds = state.ads.filter(
    (ad) => ad.active !== false && ad.status !== "paused"
  );
  const topSlot = document.getElementById("top-sponsored-ad-slot");
  const bottomSlot = document.getElementById("bottom-sponsored-ad-slot");

  if (!activeAds.length) {
    topSlot?.classList.add("hidden");
    bottomSlot?.classList.add("hidden");
    return;
  }

  const buildAdHtml = (ad) => `
    <a href="${escapeHtml(ad.targetUrl || "#")}" target="_blank" rel="noopener sponsored" class="pub-ad-banner" data-ad-click="${escapeHtml(
      ad.id
    )}">
      <div>
        <small style="display:inline-block;font-size:0.68rem;font-weight:900;color:var(--brand-primary);background:var(--brand-soft);padding:1px 8px;border-radius:99px;margin-bottom:4px;">
          إعلان ممول ${ad.sponsorName ? `• ${escapeHtml(ad.sponsorName)}` : ""}
        </small>
        <strong style="display:block;font-size:0.95rem;font-weight:900;color:var(--text-main);">${escapeHtml(
          ad.title
        )}</strong>
      </div>
      ${ad.imageUrl ? `<img src="${escapeHtml(ad.imageUrl)}" alt="${escapeHtml(ad.title)}">` : ""}
    </a>
  `;

  if (topSlot && activeAds[0]) {
    topSlot.classList.remove("hidden");
    topSlot.innerHTML = buildAdHtml(activeAds[0]);
    trackAdImpressionOnce(activeAds[0].id);
  }

  if (bottomSlot) {
    const secondAd = activeAds[1] || activeAds[0];
    bottomSlot.classList.remove("hidden");
    bottomSlot.innerHTML = buildAdHtml(secondAd);
    trackAdImpressionOnce(secondAd.id);
  }

  document.querySelectorAll("[data-ad-click]").forEach((link) => {
    link.onclick = () => {
      const adId = link.getAttribute("data-ad-click");
      if (adId) {
        updateDoc(doc(db, "ads", adId), { clicks: increment(1) }).catch(() => {});
      }
    };
  });
}

function trackAdImpressionOnce(adId) {
  if (!adId || state.viewedAdsInSession.has(adId)) return;
  state.viewedAdsInSession.add(adId);
  updateDoc(doc(db, "ads", adId), { views: increment(1) }).catch(() => {});
}

// ==================== 6. الواجهة الكبرى (Hero Bento)، موجز النبض، وشبكة الأخبار ====================
function renderPublicFeedAndHero() {
  renderBreakingNewsBar();
  renderSponsoredAdsSlots();

  const allPublished = getPublishedPostsOnly();
  const isHomeDefault =
    state.activeCategory === "all" &&
    !state.activeSubcategory &&
    !state.activeTag &&
    !state.activeAuthorFilter &&
    !state.searchQuery;

  const heroSection = document.getElementById("hero-bento-section");
  const filterBanner = document.getElementById("active-filter-banner");
  const filterText = document.getElementById("active-filter-text");

  // 1. عرض أو إخفاء شريط الفلترة النشطة
  if (!isHomeDefault) {
    heroSection?.classList.add("hidden");
    filterBanner?.classList.remove("hidden");

    const parts = [];
    if (state.activeCategory !== "all") parts.push(`القسم: ${state.activeCategory}`);
    if (state.activeSubcategory) parts.push(`الفرعي: ${state.activeSubcategory}`);
    if (state.activeTag) parts.push(`الوسم: #${state.activeTag}`);
    if (state.activeAuthorFilter) parts.push(`الكاتب: ${state.activeAuthorFilter}`);
    if (state.searchQuery) parts.push(`البحث: "${state.searchQuery}"`);
    if (filterText) filterText.textContent = parts.join(" • ");
  } else {
    filterBanner?.classList.add("hidden");
    heroSection?.classList.toggle("hidden", allPublished.length === 0);
    renderHeroBentoAndPulse(allPublished);
  }

  // 2. فلترة قائمة الأخبار
  let filtered = [...allPublished];

  if (state.activeCategory !== "all") {
    filtered = filtered.filter((p) => {
      const cat = cleanCategoryName(
        (Array.isArray(p.categories) && p.categories[0]) || p.category || ""
      );
      return cat === state.activeCategory;
    });
  }

  if (state.activeSubcategory) {
    filtered = filtered.filter((p) => p.subcategory === state.activeSubcategory);
  }

  if (state.activeTag) {
    filtered = filtered.filter(
      (p) =>
        Array.isArray(p.tags) &&
        p.tags.some(
          (t) =>
            String(t).replace(/^#+/, "").toLowerCase() ===
            state.activeTag.toLowerCase()
        )
    );
  }

  if (state.activeAuthorFilter) {
    filtered = filtered.filter(
      (p) =>
        p.author === state.activeAuthorFilter ||
        normalizePressId(p.authorPressId) === normalizePressId(state.activeAuthorFilter)
    );
  }

  if (state.searchQuery) {
    const terms = state.searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    filtered = filtered.filter((p) => {
      const hay = `${p.title || ""} ${p.summary || ""} ${p.author || ""} ${
        p.category || ""
      } ${Array.isArray(p.tags) ? p.tags.join(" ") : ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  const headingEl = document.getElementById("feed-section-heading");
  if (headingEl) {
    headingEl.textContent =
      state.activeCategory === "all"
        ? "أحدث الأخبار والتقارير"
        : `أخبار وتقارير: ${state.activeCategory}`;
  }

  const countBadge = document.getElementById("feed-articles-count");
  if (countBadge) countBadge.textContent = `${filtered.length} مادة صحفية`;

  const gridEl = document.getElementById("public-articles-grid");
  const loadMoreWrap = document.getElementById("public-load-more-wrap");
  if (!gridEl) return;

  if (!filtered.length) {
    gridEl.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:38px 16px;background:#fff;border-radius:14px;border:1.5px dashed var(--border-med);color:var(--text-muted);font-weight:800;">
        لا توجد أخبار مطابقة في هذا التصنيف حالياً.
      </div>
    `;
    loadMoreWrap?.classList.add("hidden");
    return;
  }

  const visibleSlice = filtered.slice(0, state.visibleFeedCount);
  loadMoreWrap?.classList.toggle("hidden", filtered.length <= state.visibleFeedCount);

  gridEl.innerHTML = visibleSlice.map((post) => buildNewsCardHtml(post)).join("");
  bindPostCardsClick(gridEl);
}

function renderHeroBentoAndPulse(allPublished) {
  const mainSlot = document.getElementById("hero-main-slot");
  const secSlot = document.getElementById("hero-secondary-slot");
  const pulseList = document.getElementById("quick-pulse-list");
  if (!mainSlot || !secSlot || !pulseList || !allPublished.length) return;

  const featuredPosts = allPublished.filter((p) => Boolean(p.isFeatured));
  const leadPost = featuredPosts[0] || allPublished[0];

  const remainingForSecondary = allPublished.filter((p) => p.id !== leadPost.id);
  const secondaryPosts = [
    ...featuredPosts.slice(1),
    ...remainingForSecondary.filter((p) => !p.isFeatured)
  ].slice(0, 3);

  const leadCat = cleanCategoryName(
    (Array.isArray(leadPost.categories) && leadPost.categories[0]) ||
      leadPost.category ||
      "تغطية خاصة"
  );
  const leadAuthor = resolveAuthorData(leadPost);

  mainSlot.innerHTML = `
    <article class="pub-hero-lead-card" data-open-post="${escapeHtml(leadPost.id)}">
      <div class="pub-hero-lead-media">
        <img src="${escapeHtml(resolvePostImage(leadPost))}" alt="${escapeHtml(leadPost.title)}">
      </div>
      <div class="pub-hero-lead-body">
        <div>
          <span class="pub-cat-pill">${escapeHtml(leadCat)}</span>
          <h1>${escapeHtml(leadPost.title)}</h1>
          <p>${escapeHtml(
            leadPost.summary || stripHtml(leadPost.content).slice(0, 170)
          )}</p>
        </div>
        <div class="pub-card-footer">
          <span>
            ${escapeHtml(leadAuthor.name)}
            ${
              leadAuthor.verified
                ? `<span class="material-symbols-rounded pub-verified-icon" translate="no">verified</span>`
                : ""
            }
          </span>
          <span>${formatArabicDate(leadPost)}</span>
        </div>
      </div>
    </article>
  `;

  secSlot.innerHTML = secondaryPosts
    .map((p) => {
      const cat = cleanCategoryName(
        (Array.isArray(p.categories) && p.categories[0]) || p.category || "أخبار"
      );
      return `
        <article class="pub-sub-lead-card" data-open-post="${escapeHtml(p.id)}">
          <div class="pub-sub-lead-thumb">
            <img src="${escapeHtml(resolvePostImage(p))}" alt="${escapeHtml(p.title)}" loading="lazy">
          </div>
          <div class="pub-sub-lead-info">
            <span class="pub-cat-pill">${escapeHtml(cat)}</span>
            <h3>${escapeHtml(p.title)}</h3>
            <small style="color:var(--text-muted);font-size:0.72rem;font-weight:700;">
              ${formatArabicDate(p)}
            </small>
          </div>
        </article>
      `;
    })
    .join("");

  const quickPosts = allPublished.filter((p) => Boolean(p.isQuickNews));
  const pulseItems = (quickPosts.length ? quickPosts : allPublished).slice(0, 7);

  pulseList.innerHTML = pulseItems
    .map(
      (p) => `
      <div class="pub-pulse-item" data-open-post="${escapeHtml(p.id)}">
        <small>${formatArabicDate(p)}</small>
        <strong>${escapeHtml(p.title)}</strong>
      </div>
    `
    )
    .join("");

  bindPostCardsClick(mainSlot);
  bindPostCardsClick(secSlot);
  bindPostCardsClick(pulseList);
}

function buildNewsCardHtml(post) {
  const cat = cleanCategoryName(
    (Array.isArray(post.categories) && post.categories[0]) || post.category || "عام"
  );
  const author = resolveAuthorData(post);
  const excerpt = post.summary || stripHtml(post.content).slice(0, 140);

  return `
    <article class="pub-news-card" data-open-post="${escapeHtml(post.id)}">
      <div class="pub-card-media">
        <img src="${escapeHtml(resolvePostImage(post))}" alt="${escapeHtml(post.title)}" loading="lazy">
      </div>
      <div class="pub-card-body">
        <div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span class="pub-cat-pill">${escapeHtml(cat)}</span>
            ${
              post.subcategory
                ? `<span class="pub-subcat-pill">${escapeHtml(post.subcategory)}</span>`
                : ""
            }
          </div>
          <h3 class="pub-card-title">${escapeHtml(post.title)}</h3>
          <p class="pub-card-excerpt">${escapeHtml(excerpt)}</p>
        </div>
        <div class="pub-card-footer">
          <span>
            ${escapeHtml(author.name)}
            ${
              author.verified
                ? `<span class="material-symbols-rounded pub-verified-icon" translate="no">verified</span>`
                : ""
            }
          </span>
          <span>${formatArabicDate(post)}</span>
        </div>
      </div>
    </article>
  `;
}

function bindPostCardsClick(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll("[data-open-post]").forEach((el) => {
    el.addEventListener("click", () => {
      const pid = el.getAttribute("data-open-post");
      if (pid) openArticleReader(pid);
    });
  });
}

// ==================== 7. قارئ الخبر الكامل + المشاركة النظيفة + الفيديو المدمج ====================
function buildEmbeddedVideoHtml(videoUrl = "", videoType = "standard") {
  const clean = String(videoUrl || "").trim();
  if (!clean) return { html: "", isVertical: false };

  const isVertical =
    videoType === "short_vertical" || clean.includes("/shorts/");

  // فحص روابط يوتيوب
  const ytMatch = clean.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      isVertical,
      html: `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen loading="lazy"></iframe>`
    };
  }

  return {
    isVertical,
    html: `<video src="${escapeHtml(clean)}" controls preload="metadata"></video>`
  };
}

function openArticleReader(postId, updateHistory = true) {
  const post = getPublishedPostsOnly().find((p) => p.id === postId);
  if (!post) {
    showToast("عذراً، هذا الخبر غير متاح حالياً");
    exitArticleReaderToHome(true);
    return;
  }

  state.currentReadingPostId = post.id;

  if (updateHistory) {
    const nextUrl = `?post=${encodeURIComponent(post.id)}`;
    window.history.pushState({ postId: post.id }, "", nextUrl);
  }

  applyDynamicIdentityAndMeta(post);

  document.getElementById("home-feed-view")?.classList.add("hidden");
  document.getElementById("article-reader-view")?.classList.remove("hidden");

  // زيادة عداد القراءات مرة واحدة في الجلسة
  if (!state.viewedPostsInSession.has(post.id)) {
    state.viewedPostsInSession.add(post.id);
    post.views = Number(post.views || 0) + 1;
    updateDoc(doc(db, "posts", post.id), { views: increment(1) }).catch(() => {});
  }

  const cat = cleanCategoryName(
    (Array.isArray(post.categories) && post.categories[0]) || post.category || "عام"
  );
  const author = resolveAuthorData(post);

  const catBadge = document.getElementById("reader-cat-badge");
  if (catBadge) catBadge.textContent = cat;

  const subBadge = document.getElementById("reader-subcat-badge");
  if (subBadge) {
    subBadge.textContent = post.subcategory || "";
    subBadge.classList.toggle("hidden", !post.subcategory);
  }

  const titleEl = document.getElementById("reader-article-title");
  if (titleEl) titleEl.textContent = post.title || "";

  const sumEl = document.getElementById("reader-article-summary");
  if (sumEl) {
    sumEl.textContent = post.summary || "";
    sumEl.classList.toggle("hidden", !post.summary);
  }

  document.getElementById("reader-author-avatar")?.setAttribute("src", author.avatar);
  const authNameEl = document.getElementById("reader-author-name");
  if (authNameEl) authNameEl.textContent = author.name;

  document
    .getElementById("reader-author-verified")
    ?.classList.toggle("hidden", !author.verified);

  const dateEl = document.getElementById("reader-publish-date");
  if (dateEl) dateEl.textContent = formatArabicDate(post);

  const viewsEl = document.getElementById("reader-views-count");
  if (viewsEl) {
    viewsEl.textContent = `${Number(post.views || 1).toLocaleString("en-US")} قراءة`;
  }

  const authTrigger = document.getElementById("reader-author-trigger");
  if (authTrigger) {
    authTrigger.onclick = () => openAuthorProfileModal(author);
  }

  // الصورة البارزة للخبر
  const heroFig = document.getElementById("reader-hero-figure");
  const heroImg = document.getElementById("reader-hero-image");
  const resolvedImg = resolvePostImage(post);
  if (heroFig && heroImg) {
    heroImg.src = resolvedImg;
    heroImg.alt = post.title || "";
    heroFig.classList.remove("hidden");
  }

  // الفيديو المدمج إن وجد
  const videoBox = document.getElementById("reader-video-container");
  if (videoBox) {
    const vid = buildEmbeddedVideoHtml(post.videoUrl, post.videoType);
    if (vid.html) {
      videoBox.className = `pub-video-wrapper ${
        vid.isVertical ? "is-vertical" : "is-standard"
      }`;
      videoBox.innerHTML = vid.html;
    } else {
      videoBox.className = "pub-video-wrapper hidden";
      videoBox.innerHTML = "";
    }
  }

  // محتوى الخبر
  const contentEl = document.getElementById("reader-article-content");
  if (contentEl) {
    contentEl.innerHTML = post.content || `<p>${escapeHtml(post.summary || "")}</p>`;
  }

  // الوسوم الدلالية
  const tagsRow = document.getElementById("reader-tags-row");
  if (tagsRow) {
    const tags = Array.isArray(post.tags) ? post.tags.filter(Boolean) : [];
    if (tags.length) {
      tagsRow.classList.remove("hidden");
      tagsRow.innerHTML = tags
        .map((t) => {
          const cleanT = String(t).replace(/^#+/, "").trim();
          return `<button type="button" class="pub-tag-btn" data-filter-tag="${escapeHtml(
            cleanT
          )}">#${escapeHtml(cleanT)}</button>`;
        })
        .join("");

      tagsRow.querySelectorAll("[data-filter-tag]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.activeTag = btn.getAttribute("data-filter-tag") || "";
          exitArticleReaderToHome(true);
          renderPublicFeedAndHero();
        });
      });
    } else {
      tagsRow.classList.add("hidden");
    }
  }

  // بطاقة تعريف الكاتب أسفل المقال مع رقم الهوية الصحفية (HP#####)
  const bioBox = document.getElementById("reader-author-bio-box");
  if (bioBox) {
    bioBox.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${escapeHtml(
          author.avatar
        )}" alt="" style="width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid var(--brand-primary);">
        <div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <strong style="font-size:0.98rem;">${escapeHtml(author.name)}</strong>
            ${
              author.verified
                ? `<span class="material-symbols-rounded pub-verified-icon" translate="no">verified</span>`
                : ""
            }
            <span style="font-family:monospace;background:#111317;color:#fff;padding:1px 7px;border-radius:5px;font-size:0.74rem;font-weight:900;" dir="ltr">${escapeHtml(
              author.pressId
            )}</span>
          </div>
          <p style="font-size:0.8rem;color:var(--text-muted);font-weight:700;margin-top:2px;">${escapeHtml(
            author.bio
          )}</p>
        </div>
      </div>
      <button type="button" id="footer-open-author-btn" class="pub-btn pub-btn-secondary pub-btn-sm">
        <span>جميع مقالات الكاتب</span>
      </button>
    `;

    document.getElementById("footer-open-author-btn")?.addEventListener("click", () => {
      openAuthorProfileModal(author);
    });
  }

  // أخبار ذات صلة
  const relatedGrid = document.getElementById("reader-related-grid");
  if (relatedGrid) {
    const related = getPublishedPostsOnly()
      .filter((p) => p.id !== post.id)
      .sort((a, b) => {
        const aCat =
          cleanCategoryName((a.categories && a.categories[0]) || a.category) === cat
            ? 1
            : 0;
        const bCat =
          cleanCategoryName((b.categories && b.categories[0]) || b.category) === cat
            ? 1
            : 0;
        return bCat - aCat;
      })
      .slice(0, 3);

    relatedGrid.innerHTML = related.map((r) => buildNewsCardHtml(r)).join("");
    bindPostCardsClick(relatedGrid);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exitArticleReaderToHome(updateHistory = true) {
  state.currentReadingPostId = null;
  document.getElementById("article-reader-view")?.classList.add("hidden");
  document.getElementById("home-feed-view")?.classList.remove("hidden");

  if (updateHistory && window.location.search.includes("post=")) {
    window.history.pushState({}, "", window.location.pathname);
  }
  applyDynamicIdentityAndMeta(null);
}

// ==================== 8. البطاقة الصحفية للكاتب والصفحات المؤسسية ====================
function openAuthorProfileModal(authorObj) {
  const modal = document.getElementById("author-profile-modal");
  const body = document.getElementById("author-modal-body");
  if (!modal || !body) return;

  const authorPosts = getPublishedPostsOnly().filter(
    (p) =>
      p.author === authorObj.name ||
      (authorObj.id && p.authorId === authorObj.id) ||
      normalizePressId(p.authorPressId) === authorObj.pressId
  );

  body.innerHTML = `
    <div style="text-align:center;padding:16px;background:var(--bg-page);border-radius:14px;border:1px solid var(--border-light);margin-bottom:16px;">
      <img src="${escapeHtml(
        authorObj.avatar
      )}" alt="" style="width:86px;height:86px;border-radius:50%;object-fit:cover;border:3px solid var(--brand-primary);margin:0 auto 10px;">
      <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
        <h3 style="font-size:1.18rem;font-weight:900;">${escapeHtml(authorObj.name)}</h3>
        ${
          authorObj.verified
            ? `<span class="material-symbols-rounded pub-verified-icon" translate="no">verified</span>`
            : ""
        }
      </div>
      <p style="font-size:0.8rem;color:var(--text-muted);font-weight:800;margin-bottom:8px;">${escapeHtml(
        authorObj.jobTitle
      )}</p>
      <span style="display:inline-block;font-family:monospace;background:#111317;color:#fff;padding:4px 12px;border-radius:6px;font-size:0.86rem;font-weight:900;letter-spacing:1px;" dir="ltr">
        الهوية الصحفية: ${escapeHtml(authorObj.pressId)}
      </span>
      <p style="font-size:0.84rem;color:var(--text-body);margin-top:10px;">${escapeHtml(
        authorObj.bio
      )}</p>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <strong style="font-size:0.94rem;">المقالات المنشورة للكاتب (${
        authorPosts.length
      })</strong>
      <button type="button" id="filter-by-this-author-btn" class="pub-btn pub-btn-primary pub-btn-sm">
        <span>عرض في الصفحة الرئيسية</span>
      </button>
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;">
      ${authorPosts
        .slice(0, 12)
        .map(
          (p) => `
        <div class="pub-pulse-item" data-modal-post="${escapeHtml(p.id)}">
          <small>${formatArabicDate(p)}</small>
          <strong>${escapeHtml(p.title)}</strong>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  modal.classList.remove("hidden");

  document.getElementById("filter-by-this-author-btn")?.addEventListener("click", () => {
    modal.classList.add("hidden");
    state.activeAuthorFilter = authorObj.name;
    exitArticleReaderToHome(true);
    renderPublicFeedAndHero();
  });

  body.querySelectorAll("[data-modal-post]").forEach((el) => {
    el.addEventListener("click", () => {
      modal.classList.add("hidden");
      openArticleReader(el.getAttribute("data-modal-post"));
    });
  });
}

function openInstitutionalModal(docType) {
  const modal = document.getElementById("institutional-modal");
  const titleEl = document.getElementById("inst-modal-title");
  const bodyEl = document.getElementById("inst-modal-body");
  if (!modal || !titleEl || !bodyEl) return;

  if (docType === "about") {
    titleEl.textContent = "من نحن والتوجه الوطني";
    bodyEl.innerHTML = state.settings.aboutHtml || DEFAULT_ABOUT_HTML;
  } else if (docType === "privacy") {
    titleEl.textContent = "سياسة الخصوصية";
    bodyEl.innerHTML = state.settings.privacyHtml || DEFAULT_PRIVACY_HTML;
  } else {
    titleEl.textContent = "ميثاق الشرف الصحفي والتحريري";
    bodyEl.innerHTML = state.settings.charterHtml || DEFAULT_CHARTER_HTML;
  }

  closePublicSidebar();
  modal.classList.remove("hidden");
}

function openPublicSidebar() {
  document.getElementById("sidebar-backdrop")?.classList.remove("hidden");
  document.getElementById("public-sidebar")?.classList.remove("hidden");
}

function closePublicSidebar() {
  document.getElementById("sidebar-backdrop")?.classList.add("hidden");
  document.getElementById("public-sidebar")?.classList.add("hidden");
}

// ==================== 9. ربط جميع الأحداث والمشاركة النظيفة ====================
function bindAllPublicEvents() {
  document.getElementById("open-sidebar-btn")?.addEventListener("click", openPublicSidebar);
  document.getElementById("close-sidebar-btn")?.addEventListener("click", closePublicSidebar);
  document.getElementById("sidebar-backdrop")?.addEventListener("click", closePublicSidebar);

  document.getElementById("brand-home-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    selectPublicCategory("all");
  });

  document.getElementById("close-breaking-bar-btn")?.addEventListener("click", () => {
    document.getElementById("breaking-news-bar")?.classList.add("hidden");
  });

  document.getElementById("header-pulse-btn")?.addEventListener("click", () => {
    exitArticleReaderToHome(true);
    document
      .getElementById("quick-pulse-aside")
      ?.scrollIntoView({ behavior: "smooth" });
  });

  // البحث الذكي الفوري
  const searchDrawer = document.getElementById("public-search-drawer");
  const searchInput = document.getElementById("public-search-input");
  const clearSearchBtn = document.getElementById("clear-public-search-btn");

  document.getElementById("toggle-search-btn")?.addEventListener("click", () => {
    searchDrawer?.classList.toggle("hidden");
    if (!searchDrawer?.classList.contains("hidden")) {
      searchInput?.focus();
    }
  });

  const runDebouncedSearch = debounce((val) => {
    state.searchQuery = val;
    state.visibleFeedCount = FEED_PAGE_SIZE;
    exitArticleReaderToHome(true);
    renderPublicFeedAndHero();
  }, 200);

  searchInput?.addEventListener("input", (e) => {
    const val = (e.target.value || "").trim();
    clearSearchBtn?.classList.toggle("hidden", !val);
    runDebouncedSearch(val);
  });

  clearSearchBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    state.searchQuery = "";
    renderPublicFeedAndHero();
  });

  document.getElementById("reset-active-filter-btn")?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    clearSearchBtn?.classList.add("hidden");
    state.searchQuery = "";
    selectPublicCategory("all");
  });

  document.getElementById("load-more-posts-btn")?.addEventListener("click", () => {
    state.visibleFeedCount += FEED_PAGE_SIZE;
    renderPublicFeedAndHero();
  });

  document.getElementById("reader-back-home-btn")?.addEventListener("click", () => {
    exitArticleReaderToHome(true);
  });

  // أزرار المشاركة الذكية (تستخدم الرابط النظيف بدون www. ليفتح فوراً في كل مكان)
  document.getElementById("share-native-btn")?.addEventListener("click", async () => {
    const post = state.posts.find((p) => p.id === state.currentReadingPostId);
    if (!post) return;
    const shareUrl = getCleanPostShareUrl(post.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: `${post.title}\n`,
          url: shareUrl
        });
        return;
      } catch (_) {}
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("تم نسخ رابط الخبر النظيف للمشاركة ✓");
    } catch (_) {}
  });

  document.getElementById("share-whatsapp-btn")?.addEventListener("click", () => {
    const post = state.posts.find((p) => p.id === state.currentReadingPostId);
    if (!post) return;
    const shareUrl = getCleanPostShareUrl(post.id);
    const text = `*${post.title}*\n\nاقرأ التفاصيل عبر حُجرية بريس:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  });

  document.getElementById("share-copy-link-btn")?.addEventListener("click", async () => {
    if (!state.currentReadingPostId) return;
    const shareUrl = getCleanPostShareUrl(state.currentReadingPostId);
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("تم نسخ رابط الخبر المباشر بنجاح ✓");
    } catch (_) {}
  });

  // النوافذ المؤسسية ونافذة الكاتب
  document.querySelectorAll("[data-open-doc]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openInstitutionalModal(btn.getAttribute("data-open-doc") || "charter");
    });
  });

  document.getElementById("close-inst-modal-btn")?.addEventListener("click", () => {
    document.getElementById("institutional-modal")?.classList.add("hidden");
  });

  document.getElementById("close-author-modal-btn")?.addEventListener("click", () => {
    document.getElementById("author-profile-modal")?.classList.add("hidden");
  });

  window.addEventListener("popstate", () => {
    handleInitialUrlRoute();
  });
}

function handleInitialUrlRoute() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("post");
  if (postId) {
    const exists = getPublishedPostsOnly().some((p) => p.id === postId);
    if (exists) {
      openArticleReader(postId, false);
    }
  } else if (state.currentReadingPostId) {
    exitArticleReaderToHome(false);
  }
}

// ==================== 10. المزامنة الحية مع Firestore ونقطة الانطلاق ====================
function startPublicFirestoreSync() {
  onSnapshot(doc(db, "settings", "general"), (snap) => {
    if (snap.exists()) {
      state.settings = { ...state.settings, ...snap.data() };
      const activePost = state.posts.find((p) => p.id === state.currentReadingPostId);
      applyDynamicIdentityAndMeta(activePost || null);
      saveFastCache();
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
            cleanCategoryName(m.name) === cleanCategoryName(cat.name)
        );
        if (idx >= 0) merged[idx] = { ...merged[idx], ...cat };
        else merged.push(cat);
      });
      state.compasses = merged;
      saveFastCache();
      renderCategoriesNavigation();
    }
  });

  onSnapshot(collection(db, "staff"), (snap) => {
    state.staff = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    saveFastCache();
    renderPublicFeedAndHero();
  });

  onSnapshot(collection(db, "posts"), (snap) => {
    state.posts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => getTimestampMs(b) - getTimestampMs(a));

    saveFastCache();
    renderPublicFeedAndHero();

    const params = new URLSearchParams(window.location.search);
    const targetPostId = params.get("post");
    if (targetPostId) {
      openArticleReader(targetPostId, false);
    }
  });

  onSnapshot(collection(db, "ads"), (snap) => {
    state.ads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    saveFastCache();
    renderSponsoredAdsSlots();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  restoreFastCache();
  applyDynamicIdentityAndMeta();
  renderCategoriesNavigation();
  renderPublicFeedAndHero();
  bindAllPublicEvents();
  handleInitialUrlRoute();
  startPublicFirestoreSync();
});
