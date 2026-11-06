/* ==========================================================================
   حُجرية بريس (Hujariya Press) — المحرك البرمجي للموقع العام (X-Glass Edition)
   [الجزء الأول من 2]:
   - التوجيه التلقائي لمنع خطأ شهادة SSL في النطاقات الفرعية (إزالة www.)
   - الدرع السيبراني: تطهير البيانات الحساسة (Data Stripping) + مانع هجمات XSS
   - الهوية اللونية الديناميكية + الشعارات الثلاثة المحمية من الانكسار
   - مسرح البطاقات الزجاجية المتناثرة بأناقة للواجهة الكبرى مع التقليب السلس
   - موجز النبض السريع + شبكة الأخبار مع التمرير اللانهائي التلقائي (Infinite Scroll)
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

// ==================== 1. حارس النطاق الفرعي وإعداد الاتصال بـ Firebase ====================
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

const PUB_SAFE_CACHE_KEY = "hujariya_pub_xglass_cache_v1";
const VIEWED_STORAGE_KEY = "hujariya_pub_viewed_guard_v1";
const DEFAULT_BRAND_COLOR = "#b80d38";
const INITIAL_FEED_BATCH = 10;
const DECK_CARDS_PER_SLIDE = 4;

// غلاف بصري مدمج عالي الدقة يظهر للأخبار التي نُشرت بدون صورة في حال عدم تحديد صورة افتراضية
const FALLBACK_POST_COVER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#b80d38"/>
          <stop offset="100%" stop-color="#2b030d"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#bg)"/>
      <circle cx="1060" cy="110" r="250" fill="rgba(255,255,255,0.05)"/>
      <circle cx="140" cy="570" r="310" fill="rgba(255,255,255,0.04)"/>
      <text x="600" y="335" fill="#ffffff" font-family="Almarai, sans-serif" font-size="74" font-weight="800" text-anchor="middle">حُجرية بريس</text>
      <text x="600" y="405" fill="rgba(255,255,255,0.82)" font-family="Alexandria, sans-serif" font-size="28" font-weight="600" text-anchor="middle">Hujariya Press</text>
    </svg>
  `);

const DEFAULT_COMPASSES = [
  {
    id: "yemen-politics",
    name: "السياسة اليمنية",
    subcategories: ["الشرعية ومؤسسات الدولة", "التحليلات الاستراتيجية", "الشأن المحلي والمحافظات", "تقارير الميدان"],
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

const DEFAULT_ABOUT_HTML = `
  <h3>عن حُجرية بريس</h3>
  <p>منصة إخبارية وتحليلية مستقلة تندرج تحت مظلة مؤسسة <strong>RAWI-YE.COM</strong> الإعلامية الرقمية، تُعنى بتقديم الخبر الدقيق والتغطيات الميدانية والتحليلات المعمقة في الشأن اليمني والإقليمي والدولي.</p>
`;

const DEFAULT_CHARTER_HTML = `
  <h3>أولاً: المصداقية والتحقق المهني</h3>
  <p>تلتزم هيئة التحرير وجميع الكتّاب في <strong>حُجرية بريس</strong> بأعلى معايير الدقة والموضوعية، والتثبت من المصادر قبل نشر أي مادة إخبارية أو تحليلية.</p>
  <h3>ثانياً: المسؤولية المهنية والأخلاقية</h3>
  <p>تحترم المنصة الثوابت الوطنية والقيم الإنسانية، وتفصل فصلاً تاماً بين الخبر الصحفي المجرد وبين مقالات الرأي والتحليل.</p>
`;

const DEFAULT_PRIVACY_HTML = `
  <h3>سياسة الخصوصية</h3>
  <p>تحترم منصة <strong>حُجرية بريس</strong> خصوصية القراء والزوار، وتلتزم بحماية البيانات وفق أعلى معايير الأمان الرقمي وحقوق الملكية الفكرية.</p>
`;

// ==================== 2. الحالة المركزية للموقع العام (Clean Public State) ====================
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
  publicStaff: [], // يحتوي حصراً على البيانات العامة المطهرة بدون أي بيانات سرية
  ads: [],
  activeCategory: "all",
  activeSubcategory: "",
  activeTag: "",
  activeAuthorFilter: "",
  searchQuery: "",
  visibleFeedCount: INITIAL_FEED_BATCH,
  totalFilteredCount: 0,
  isLoadingMore: false,
  deckSlideIndex: 0,
  deckTotalSlides: 1,
  deckAutoTimer: null,
  currentReadingPostId: null,
  viewedGuard: new Set()
};

// ==================== 3. الدرع السيبراني: تطهير البيانات ومنع هجمات XSS ====================
function escapeHtml(str = "") {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(html = "") {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSafeHttpUrl(rawUrl = "") {
  const clean = String(rawUrl || "").trim();
  if (!clean) return false;
  if (clean.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(clean, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_) {
    return false;
  }
}

// مطهر HTML السيبراني: يزيل أي سكريبت أو أوامر خبيثة ويحافظ على تنسيق المقالات
function sanitizeEditorialHtml(dirtyHtml = "") {
  if (!dirtyHtml) return "";
  try {
    const parser = new DOMParser();
    const docNode = parser.parseFromString(String(dirtyHtml), "text/html");

    const forbiddenSelectors = [
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "textarea",
      "select",
      "meta",
      "link",
      "base"
    ];
    docNode.querySelectorAll(forbiddenSelectors.join(",")).forEach((el) => el.remove());

    const allowedTags = new Set([
      "P",
      "BR",
      "H2",
      "H3",
      "H4",
      "STRONG",
      "B",
      "EM",
      "I",
      "U",
      "BLOCKQUOTE",
      "UL",
      "OL",
      "LI",
      "FIGURE",
      "FIGCAPTION",
      "IMG",
      "A",
      "SPAN",
      "DIV"
    ]);

    const walkAndClean = (root) => {
      const children = Array.from(root.children || []);
      children.forEach((el) => {
        if (!allowedTags.has(el.tagName)) {
          const textNode = docNode.createTextNode(el.textContent || "");
          el.replaceWith(textNode);
          return;
        }

        // مسح كافة الخصائص الخطرة مثل onerror, onclick, style, id, data-*
        Array.from(el.attributes).forEach((attr) => {
          const attrName = attr.name.toLowerCase();
          const attrVal = String(attr.value || "").trim();

          if (el.tagName === "IMG" && (attrName === "src" || attrName === "alt")) {
            if (attrName === "src" && !isSafeHttpUrl(attrVal)) {
              el.remove();
            }
            return;
          }

          if (el.tagName === "A" && attrName === "href") {
            if (!isSafeHttpUrl(attrVal)) {
              el.removeAttribute("href");
            } else {
              el.setAttribute("target", "_blank");
              el.setAttribute("rel", "noopener noreferrer");
            }
            return;
          }

          if (attrName === "class" && el.classList.contains("inline-article-figure")) {
            return;
          }

          el.removeAttribute(attr.name);
        });

        walkAndClean(el);
      });
    };

    walkAndClean(docNode.body);
    return docNode.body.innerHTML;
  } catch (_) {
    return `<p>${escapeHtml(stripHtml(dirtyHtml))}</p>`;
  }
}

// بتر كافة البيانات السرية للكادر وإبقاء البطاقة العامة فقط
function stripSensitiveStaffData(rawMember = {}, docId = "") {
  return {
    id: docId || String(rawMember.id || ""),
    name: String(rawMember.name || "هيئة التحرير").trim(),
    jobTitle: String(rawMember.jobTitle || "صحفي ومحرر إخباري").trim(),
    bio: String(rawMember.bio || "").trim(),
    avatar: isSafeHttpUrl(rawMember.avatar) ? String(rawMember.avatar).trim() : "",
    verified: Boolean(rawMember.verified || rawMember.isMasterAdmin)
  };
}

// بتر كلمات مرور الإدارة ومفاتيح الـ API من الإعدادات قبل حفظها في ذاكرة الموقع العام
function stripSensitiveSettingsData(rawSettings = {}) {
  const safeCopy = { ...rawSettings };
  delete safeCopy.masterUsername;
  delete safeCopy.masterPassword;
  delete safeCopy.masterPin;
  delete safeCopy.imgbbApiKey;
  return safeCopy;
}

// تطهير بيانات الخبر وإزالة رقم الهوية الصحفية الداخلي منه
function stripSensitivePostData(rawPost = {}, docId = "") {
  const copy = { ...rawPost, id: docId || rawPost.id };
  delete copy.authorPressId;
  delete copy.authorUsername;
  delete copy.deleteReason;
  return copy;
}

// ==================== 4. الدوال المساعدة، الهوية اللونية، والشعارات المحمية ====================
function cleanCategoryName(name = "") {
  return (
    String(name || "")
      .replace(/^بوصلة\s+/i, "")
      .replace(/^البوصلة\s+/i, "")
      .trim() || name
  );
}

function showToast(msg) {
  const toast = document.getElementById("pub-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(window.__pubToastTimer);
  window.__pubToastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

function debounce(fn, delay = 180) {
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
    return `منذ ${mins} د`;
  }
  if (diffSec >= 3600 && diffSec < 86400) {
    const hrs = Math.floor(diffSec / 3600);
    return `منذ ${hrs} س`;
  }
  return new Date(ms).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getCleanBaseSiteUrl() {
  const origin = window.location.origin.replace("://www.", "://");
  const path = window.location.pathname.replace(/index\.html$/i, "");
  return `${origin}${path}`.replace(/\/+$/, "");
}

function getCleanPostShareUrl(postId) {
  return `${getCleanBaseSiteUrl()}/?post=${encodeURIComponent(postId)}`;
}

function resolvePostImage(post) {
  const postImg = String(post?.imageUrl || "").trim();
  if (isSafeHttpUrl(postImg)) return postImg;
  const defImg = String(
    state.settings.defaultPostImageUrl || state.settings.coverImageUrl || ""
  ).trim();
  if (isSafeHttpUrl(defImg)) return defImg;
  return FALLBACK_POST_COVER_SVG;
}

// استخراج البطاقة العامة للكاتب دون أي إشارة لرقم هويته الصحفية (HP)
function resolvePublicAuthor(post) {
  const matched = state.publicStaff.find((s) => {
    if (post?.authorId && s.id === post.authorId) return true;
    if (
      post?.author &&
      String(s.name || "").trim() === String(post.author || "").trim()
    ) {
      return true;
    }
    return false;
  });

  const name = matched?.name || post?.author || "هيئة التحرير";
  const verified = Boolean(matched?.verified || post?.authorVerified);
  const jobTitle = matched?.jobTitle || "صحفي ومحرر في حُجرية بريس";
  const bio =
    matched?.bio ||
    `كاتب ومحرر صحفي في منصة ${state.settings.siteName || "حُجرية بريس"}.`;
  const rawAvatar = matched?.avatar || post?.authorAvatar || "";
  const avatar = isSafeHttpUrl(rawAvatar)
    ? rawAvatar
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=b80d38&color=fff`;

  return {
    id: matched?.id || post?.authorId || "",
    name,
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

// تحميل آمن للشعارات يمنع ظهور أيقونة الصورة المكسورة نهائياً
function bindSafeLogoImage(imgId, capsuleId, rawUrl) {
  const imgEl = document.getElementById(imgId);
  const capEl = capsuleId ? document.getElementById(capsuleId) : null;
  if (!imgEl) return;

  const cleanUrl = String(rawUrl || "").trim();
  if (!isSafeHttpUrl(cleanUrl)) {
    imgEl.removeAttribute("src");
    imgEl.classList.add("hidden");
    capEl?.classList.add("hidden");
    return;
  }

  imgEl.onload = () => {
    imgEl.classList.remove("hidden");
    capEl?.classList.remove("hidden");
  };

  imgEl.onerror = () => {
    imgEl.removeAttribute("src");
    imgEl.classList.add("hidden");
    capEl?.classList.add("hidden");
  };

  imgEl.src = cleanUrl;
}

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
  root.style.setProperty("--brand-glow", `0 10px 28px -8px rgba(${rgb}, 0.18)`);

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

  const headerLogo = (s.headerLogoUrl || s.logoUrl || "").trim();
  const sidebarLogo = (s.sidebarLogoUrl || s.authLogoUrl || headerLogo).trim();
  const footerLogo = (s.footerLogoUrl || headerLogo).trim();

  bindSafeLogoImage("header-logo-img", "header-logo-capsule", headerLogo);
  bindSafeLogoImage("sidebar-logo-img", "sidebar-logo-capsule", sidebarLogo);
  bindSafeLogoImage("footer-logo-img", "footer-logo-capsule", footerLogo);

  const headerTextWrap = document.getElementById("header-text-wrap");
  if (headerTextWrap) {
    headerTextWrap.classList.toggle(
      "hidden",
      Boolean(s.hideSiteName && isSafeHttpUrl(headerLogo))
    );
  }

  const fav = (s.faviconUrl || s.appIconUrl || headerLogo || "").trim();
  if (isSafeHttpUrl(fav)) {
    document.getElementById("pub-dynamic-favicon")?.setAttribute("href", fav);
    document.getElementById("pub-dynamic-apple-icon")?.setAttribute("href", fav);
  }

  // ضبط وسوم المشاركة لمنصات التواصل الاجتماعي
  const pageTitle = activePost
    ? `${activePost.title} | ${siteName}`
    : `${siteName} | Hujariya Press`;
  const pageDesc = activePost
    ? activePost.summary || stripHtml(activePost.content).slice(0, 175)
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
  const list = [
    { label: "واتساب", url: soc.whatsapp },
    { label: "تليجرام", url: soc.telegram },
    { label: "منصة X", url: soc.x },
    { label: "فيسبوك", url: soc.facebook },
    { label: "يوتيوب", url: soc.youtube },
    { label: "تيك توك", url: soc.tiktok }
  ].filter((item) => isSafeHttpUrl(item.url));

  const sideSec = document.getElementById("sidebar-socials-section");
  const sideWrap = document.getElementById("sidebar-socials-list");
  const footWrap = document.getElementById("footer-socials-row");

  if (!list.length) {
    sideSec?.classList.add("hidden");
    if (sideWrap) sideWrap.innerHTML = "";
    if (footWrap) footWrap.innerHTML = "";
    return;
  }

  const html = list
    .map(
      (item) =>
        `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="x-social-pill">${escapeHtml(
          item.label
        )}</a>`
    )
    .join("");

  sideSec?.classList.remove("hidden");
  if (sideWrap) sideWrap.innerHTML = html;
  if (footWrap) footWrap.innerHTML = html;
}

// ==================== 5. الكاش الفوري الآمن (Zero-Latency Safe Cache) ====================
function loadViewedGuardFromSession() {
  try {
    const raw = sessionStorage.getItem(VIEWED_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) state.viewedGuard = new Set(arr);
    }
  } catch (_) {}
}

function markItemViewedInSession(key) {
  if (!key || state.viewedGuard.has(key)) return false;
  state.viewedGuard.add(key);
  try {
    sessionStorage.setItem(
      VIEWED_STORAGE_KEY,
      JSON.stringify(Array.from(state.viewedGuard).slice(-120))
    );
  } catch (_) {}
  return true;
}

function saveFastCache() {
  try {
    const safePayload = {
      savedAt: Date.now(),
      settings: stripSensitiveSettingsData(state.settings),
      compasses: state.compasses,
      posts: getPublishedPostsOnly().slice(0, 45),
      publicStaff: state.publicStaff,
      ads: state.ads
    };
    localStorage.setItem(PUB_SAFE_CACHE_KEY, JSON.stringify(safePayload));
  } catch (_) {}
}

function restoreFastCache() {
  try {
    // تنظيف أي كاش قديم من الإصدارات السابقة لضمان عدم بقاء أي بيانات غير مطهرة
    localStorage.removeItem("hujariya_public_fast_cache_v6");

    const raw = localStorage.getItem(PUB_SAFE_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed) return false;

    if (parsed.settings) {
      state.settings = {
        ...state.settings,
        ...stripSensitiveSettingsData(parsed.settings)
      };
    }
    if (Array.isArray(parsed.compasses) && parsed.compasses.length) {
      state.compasses = parsed.compasses;
    }
    if (Array.isArray(parsed.posts)) {
      state.posts = parsed.posts.map((p) => stripSensitivePostData(p, p.id));
    }
    if (Array.isArray(parsed.publicStaff)) {
      state.publicStaff = parsed.publicStaff.map((s) =>
        stripSensitiveStaffData(s, s.id)
      );
    }
    if (Array.isArray(parsed.ads)) {
      state.ads = parsed.ads;
    }

    applyDynamicIdentityAndMeta();
    return true;
  } catch (_) {
    return false;
  }
}

// ==================== 6. الأقسام، شريط العاجل، والإعلانات الممولة ====================
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
      `<button type="button" class="x-cat-tab ${
        state.activeCategory === "all" ? "active" : ""
      }" data-cat="all">الرئيسية</button>`,
      ...visibleCats.map((c) => {
        const clean = cleanCategoryName(c.name);
        const isActive = state.activeCategory === clean;
        return `<button type="button" class="x-cat-tab ${
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
      `<button type="button" class="x-sidebar-link" data-side-cat="all">
        <span class="material-symbols-rounded" translate="no">home</span>
        <span>الرئيسية</span>
      </button>`,
      ...visibleCats.map((c) => {
        const clean = cleanCategoryName(c.name);
        return `
          <button type="button" class="x-sidebar-link" data-side-cat="${escapeHtml(clean)}">
            <span class="material-symbols-rounded" translate="no">tag</span>
            <span>${escapeHtml(clean)}</span>
          </button>
        `;
      })
    ].join("");

    sideList.querySelectorAll("[data-side-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (typeof closePublicSidebar === "function") closePublicSidebar();
        selectPublicCategory(btn.getAttribute("data-side-cat") || "all");
      });
    });
  }

  if (footLinks) {
    footLinks.innerHTML = visibleCats
      .slice(0, 6)
      .map((c) => {
        const clean = cleanCategoryName(c.name);
        return `<button type="button" class="x-footer-link" data-foot-cat="${escapeHtml(
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
    `<button type="button" class="x-subcat-chip ${
      !state.activeSubcategory ? "active" : ""
    }" data-subcat="">الكل</button>`,
    ...subs.map(
      (sub) => `
      <button type="button" class="x-subcat-chip ${
        state.activeSubcategory === sub ? "active" : ""
      }" data-subcat="${escapeHtml(sub)}">${escapeHtml(sub)}</button>
    `
    )
  ].join("");

  nav.querySelectorAll("[data-subcat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeSubcategory = btn.getAttribute("data-subcat") || "";
      state.visibleFeedCount = INITIAL_FEED_BATCH;
      renderSubcategoriesBar();
      renderPublicFeedAndShowcase();
    });
  });
}

function selectPublicCategory(catName) {
  state.activeCategory = catName || "all";
  state.activeSubcategory = "";
  state.activeTag = "";
  state.activeAuthorFilter = "";
  state.visibleFeedCount = INITIAL_FEED_BATCH;

  if (typeof exitArticleReaderToHome === "function") {
    exitArticleReaderToHome(false);
  }
  renderCategoriesNavigation();
  renderPublicFeedAndShowcase();
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
      <span class="x-breaking-item" data-open-post="${escapeHtml(p.id)}">
        <span>${escapeHtml(p.title)}</span>
        <span style="opacity:0.55;">•</span>
      </span>
    `
    )
    .join("");

  bindPostTriggerElements(track);
}

function renderSponsoredAdsSlots() {
  const activeAds = state.ads.filter(
    (ad) => ad.active !== false && ad.status !== "paused" && isSafeHttpUrl(ad.targetUrl)
  );
  const topSlot = document.getElementById("top-sponsored-ad-slot");
  const bottomSlot = document.getElementById("bottom-sponsored-ad-slot");

  if (!activeAds.length) {
    topSlot?.classList.add("hidden");
    bottomSlot?.classList.add("hidden");
    return;
  }

  const buildAdHtml = (ad) => `
    <a href="${escapeHtml(ad.targetUrl)}" target="_blank" rel="noopener noreferrer sponsored" class="x-ad-card" data-ad-click="${escapeHtml(
      ad.id
    )}">
      <div>
        <small style="display:inline-block;font-size:0.67rem;font-weight:900;color:var(--brand-primary);background:var(--brand-soft);padding:1px 8px;border-radius:99px;margin-bottom:4px;">
          مادة إعلانية ${ad.sponsorName ? `• ${escapeHtml(ad.sponsorName)}` : ""}
        </small>
        <strong style="display:block;font-size:0.93rem;font-weight:900;color:var(--x-text);">${escapeHtml(
          ad.title
        )}</strong>
      </div>
      ${
        isSafeHttpUrl(ad.imageUrl)
          ? `<img src="${escapeHtml(ad.imageUrl)}" alt="${escapeHtml(ad.title)}" loading="lazy">`
          : ""
      }
    </a>
  `;

  if (topSlot && activeAds[0]) {
    topSlot.classList.remove("hidden");
    topSlot.innerHTML = buildAdHtml(activeAds[0]);
    if (markItemViewedInSession(`ad_view_${activeAds[0].id}`)) {
      updateDoc(doc(db, "ads", activeAds[0].id), { views: increment(1) }).catch(() => {});
    }
  }

  if (bottomSlot) {
    const secondAd = activeAds[1] || activeAds[0];
    bottomSlot.classList.remove("hidden");
    bottomSlot.innerHTML = buildAdHtml(secondAd);
    if (markItemViewedInSession(`ad_view_${secondAd.id}`)) {
      updateDoc(doc(db, "ads", secondAd.id), { views: increment(1) }).catch(() => {});
    }
  }

  document.querySelectorAll("[data-ad-click]").forEach((link) => {
    link.onclick = () => {
      const adId = link.getAttribute("data-ad-click");
      if (adId && markItemViewedInSession(`ad_click_${adId}`)) {
        updateDoc(doc(db, "ads", adId), { clicks: increment(1) }).catch(() => {});
      }
    };
  });
}

// ==================== 7. الواجهة الكبرى الزجاجية المتناثرة بأناقة + موجز النبض + التمرير اللانهائي ====================
function getFeaturedDeckPool(allPublished) {
  const markedFeatured = allPublished.filter((p) => Boolean(p.isFeatured));
  const others = allPublished.filter((p) => !p.isFeatured);
  return [...markedFeatured, ...others].slice(0, 12);
}

function renderAsymmetricGlassShowcase(allPublished, animateSwitch = false) {
  const stage = document.getElementById("featured-mosaic-stage");
  const controls = document.getElementById("featured-deck-controls");
  const dotsWrap = document.getElementById("deck-dots-wrap");
  const pulseList = document.getElementById("quick-pulse-list");
  if (!stage || !pulseList || !allPublished.length) return;

  const deckPool = getFeaturedDeckPool(allPublished);
  const totalSlides = Math.max(1, Math.ceil(deckPool.length / DECK_CARDS_PER_SLIDE));
  state.deckTotalSlides = totalSlides;

  if (state.deckSlideIndex >= totalSlides) state.deckSlideIndex = 0;
  if (state.deckSlideIndex < 0) state.deckSlideIndex = totalSlides - 1;

  const startIdx = state.deckSlideIndex * DECK_CARDS_PER_SLIDE;
  const currentCards = deckPool.slice(startIdx, startIdx + DECK_CARDS_PER_SLIDE);

  if (controls && dotsWrap) {
    controls.classList.toggle("hidden", totalSlides <= 1);
    dotsWrap.innerHTML = Array.from({ length: totalSlides })
      .map(
        (_, idx) =>
          `<span class="x-deck-dot ${
            idx === state.deckSlideIndex ? "active" : ""
          }" data-deck-dot="${idx}" style="cursor:pointer;"></span>`
      )
      .join("");

    dotsWrap.querySelectorAll("[data-deck-dot]").forEach((dot) => {
      dot.addEventListener("click", () => {
        state.deckSlideIndex = Number(dot.getAttribute("data-deck-dot") || 0);
        renderAsymmetricGlassShowcase(getPublishedPostsOnly(), true);
        restartDeckAutoTimer();
      });
    });
  }

  if (animateSwitch) {
    stage.classList.remove("is-switching");
    void stage.offsetWidth;
    stage.classList.add("is-switching");
  }

  stage.innerHTML = currentCards
    .map((post, idx) => {
      const cat = cleanCategoryName(
        (Array.isArray(post.categories) && post.categories[0]) ||
          post.category ||
          "تغطية"
      );
      const author = resolvePublicAuthor(post);

      return `
        <article class="x-glass-tile tile-slot-${idx % 4}" data-open-post="${escapeHtml(
          post.id
        )}">
          <div class="x-tile-media">
            <img src="${escapeHtml(resolvePostImage(post))}" alt="${escapeHtml(
              post.title
            )}" loading="eager">
            <span class="x-tile-badge">${escapeHtml(cat)}</span>
          </div>
          <div class="x-tile-glass-dock">
            <h3 class="x-tile-title">${escapeHtml(post.title)}</h3>
            <div class="x-tile-meta">
              <span>
                ${escapeHtml(author.name)}
                ${
                  author.verified
                    ? `<span class="material-symbols-rounded x-verified-badge" translate="no">verified</span>`
                    : ""
                }
              </span>
              <span>${formatArabicDate(post)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  bindPostTriggerElements(stage);

  // تغذية عمود موجز النبض السريع
  const quickPosts = allPublished.filter((p) => Boolean(p.isQuickNews));
  const pulseItems = (quickPosts.length ? quickPosts : allPublished).slice(0, 7);

  pulseList.innerHTML = pulseItems
    .map(
      (p) => `
      <div class="x-pulse-node" data-open-post="${escapeHtml(p.id)}">
        <small>${formatArabicDate(p)}</small>
        <strong>${escapeHtml(p.title)}</strong>
      </div>
    `
    )
    .join("");

  bindPostTriggerElements(pulseList);
}

function stepFeaturedDeckSlide(direction = 1) {
  const allPublished = getPublishedPostsOnly();
  if (!allPublished.length || state.deckTotalSlides <= 1) return;
  state.deckSlideIndex =
    (state.deckSlideIndex + direction + state.deckTotalSlides) %
    state.deckTotalSlides;
  renderAsymmetricGlassShowcase(allPublished, true);
}

function restartDeckAutoTimer() {
  clearInterval(state.deckAutoTimer);
  state.deckAutoTimer = setInterval(() => {
    if (!state.currentReadingPostId && state.deckTotalSlides > 1) {
      stepFeaturedDeckSlide(1);
    }
  }, 8500);
}

function getFilteredFeedPosts() {
  let list = [...getPublishedPostsOnly()];

  if (state.activeCategory !== "all") {
    list = list.filter((p) => {
      const cat = cleanCategoryName(
        (Array.isArray(p.categories) && p.categories[0]) || p.category || ""
      );
      return cat === state.activeCategory;
    });
  }

  if (state.activeSubcategory) {
    list = list.filter((p) => p.subcategory === state.activeSubcategory);
  }

  if (state.activeTag) {
    list = list.filter(
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
    list = list.filter((p) => p.author === state.activeAuthorFilter);
  }

  if (state.searchQuery) {
    const terms = state.searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    list = list.filter((p) => {
      const hay = `${p.title || ""} ${p.summary || ""} ${p.author || ""} ${
        p.category || ""
      } ${Array.isArray(p.tags) ? p.tags.join(" ") : ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  return list;
}

function renderPublicFeedAndShowcase() {
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

  if (!isHomeDefault) {
    heroSection?.classList.add("hidden");
    filterBanner?.classList.remove("hidden");

    const parts = [];
    if (state.activeCategory !== "all") parts.push(state.activeCategory);
    if (state.activeSubcategory) parts.push(state.activeSubcategory);
    if (state.activeTag) parts.push(`#${state.activeTag}`);
    if (state.activeAuthorFilter) parts.push(state.activeAuthorFilter);
    if (state.searchQuery) parts.push(`"${state.searchQuery}"`);
    if (filterText) filterText.textContent = parts.join(" • ");
  } else {
    filterBanner?.classList.add("hidden");
    heroSection?.classList.toggle("hidden", allPublished.length === 0);
    renderAsymmetricGlassShowcase(allPublished, false);
  }

  const filtered = getFilteredFeedPosts();
  state.totalFilteredCount = filtered.length;

  const headingEl = document.getElementById("feed-section-heading");
  if (headingEl) {
    headingEl.textContent =
      state.activeCategory === "all"
        ? "أحدث الأخبار والتقارير"
        : state.activeCategory;
  }

  const gridEl = document.getElementById("public-articles-grid");
  const spinnerEl = document.getElementById("infinite-scroll-spinner");
  if (!gridEl) return;

  if (!filtered.length) {
    gridEl.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:36px 16px;background:var(--x-surface);border-radius:16px;border:1px solid var(--x-border);color:var(--x-muted);font-weight:800;">
        لا توجد أخبار منشورة في هذا التصنيف حالياً.
      </div>
    `;
    spinnerEl?.classList.add("hidden");
    return;
  }

  const visibleSlice = filtered.slice(0, state.visibleFeedCount);
  gridEl.innerHTML = visibleSlice.map((post) => buildNewsCardHtml(post)).join("");
  bindPostTriggerElements(gridEl);

  if (state.visibleFeedCount >= filtered.length) {
    spinnerEl?.classList.add("hidden");
  }
}

function buildNewsCardHtml(post) {
  const cat = cleanCategoryName(
    (Array.isArray(post.categories) && post.categories[0]) || post.category || "أخبار"
  );
  const author = resolvePublicAuthor(post);
  const excerpt = post.summary || stripHtml(post.content).slice(0, 135);

  return `
    <article class="x-news-card" data-open-post="${escapeHtml(post.id)}">
      <div class="x-card-thumb">
        <img src="${escapeHtml(resolvePostImage(post))}" alt="${escapeHtml(
          post.title
        )}" loading="lazy">
      </div>
      <div class="x-card-body">
        <div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span class="x-cat-pill">${escapeHtml(cat)}</span>
            ${
              post.subcategory
                ? `<span class="x-subcat-pill">${escapeHtml(post.subcategory)}</span>`
                : ""
            }
          </div>
          <h3 class="x-card-title">${escapeHtml(post.title)}</h3>
          <p class="x-card-summary">${escapeHtml(excerpt)}</p>
        </div>
        <div class="x-card-foot">
          <span>
            ${escapeHtml(author.name)}
            ${
              author.verified
                ? `<span class="material-symbols-rounded x-verified-badge" translate="no">verified</span>`
                : ""
            }
          </span>
          <span>${formatArabicDate(post)}</span>
        </div>
      </div>
    </article>
  `;
}

function loadNextInfiniteBatch() {
  if (
    state.isLoadingMore ||
    state.currentReadingPostId ||
    state.visibleFeedCount >= state.totalFilteredCount
  ) {
    return;
  }

  state.isLoadingMore = true;
  const spinnerEl = document.getElementById("infinite-scroll-spinner");
  spinnerEl?.classList.remove("hidden");

  setTimeout(() => {
    state.visibleFeedCount += INITIAL_FEED_BATCH;
    state.isLoadingMore = false;
    renderPublicFeedAndShowcase();
  }, 180);
}

function bindPostTriggerElements(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll("[data-open-post]").forEach((el) => {
    el.addEventListener("click", () => {
      const pid = el.getAttribute("data-open-post");
      if (pid && typeof openArticleReader === "function") {
        openArticleReader(pid);
      }
    });
  });
}

/* === نهاية الجزء الأول من app.js للموقع العام — يُلصق الجزء الثاني تحته مباشرة === */
/* ==========================================================================
   حُجرية بريس (Hujariya Press) — المحرك البرمجي للموقع العام (X-Glass Edition)
   [الجزء الثاني من 2 — يُلصق مباشرة أسفل الجزء الأول]:
   - قارئ المقال الصافي مع التطهير السيبراني للنصوص (XSS Sanitized Reader)
   - مشغل الفيديو الذكي الآمن (يدعم 16:9 العريض و 9:16 العمودي القصير)
   - البطاقة الصحفية العامة للكاتب (بدون أي أرقام هويات أو بيانات داخلية)
   - المراقب الذكي للتمرير اللانهائي التلقائي (IntersectionObserver Infinite Scroll)
   - دعم السحب باللمس (Touch Swipe) لتقليب بطاقات الواجهة الكبرى الزجاجية
   - المزامنة الفورية مع Firestore مع العزل الصارم للبيانات الحساسة
   ========================================================================== */

// ==================== 8. قارئ الخبر الصافي + مشغل الفيديو الآمن ====================
function buildSafeEmbeddedVideoHtml(videoUrl = "", videoType = "standard") {
  const clean = String(videoUrl || "").trim();
  if (!isSafeHttpUrl(clean)) return { html: "", isVertical: false };

  const isVertical =
    videoType === "short_vertical" || clean.includes("/shorts/");

  const ytMatch = clean.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = encodeURIComponent(ytMatch[1]);
    return {
      isVertical,
      html: `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`
    };
  }

  return {
    isVertical,
    html: `<video src="${escapeHtml(clean)}" controls preload="metadata" playsinline></video>`
  };
}

function openArticleReader(postId, updateHistory = true) {
  const post = getPublishedPostsOnly().find((p) => p.id === postId);
  if (!post) {
    showToast("عذراً، هذه المادة غير متاحة حالياً");
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

  // احتساب القراءة مرة واحدة فقط في الجلسة لمنع التضخيم الوهمي
  if (markItemViewedInSession(`post_view_${post.id}`)) {
    post.views = Number(post.views || 0) + 1;
    updateDoc(doc(db, "posts", post.id), { views: increment(1) }).catch(() => {});
  }

  const cat = cleanCategoryName(
    (Array.isArray(post.categories) && post.categories[0]) || post.category || "أخبار"
  );
  const author = resolvePublicAuthor(post);

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

  const avatarEl = document.getElementById("reader-author-avatar");
  if (avatarEl) {
    avatarEl.src = author.avatar;
    avatarEl.alt = author.name;
  }

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

  // الفيديو المدمج الآمن
  const videoBox = document.getElementById("reader-video-container");
  if (videoBox) {
    const vid = buildSafeEmbeddedVideoHtml(post.videoUrl, post.videoType);
    if (vid.html) {
      videoBox.className = `x-video-frame ${
        vid.isVertical ? "is-vertical" : "is-standard"
      }`;
      videoBox.innerHTML = vid.html;
    } else {
      videoBox.className = "x-video-frame hidden";
      videoBox.innerHTML = "";
    }
  }

  // تطهير وعرض محتوى المقال بأمان سيبراني كامل
  const contentEl = document.getElementById("reader-article-content");
  if (contentEl) {
    const cleanHtml = sanitizeEditorialHtml(post.content || "");
    contentEl.innerHTML = cleanHtml || `<p>${escapeHtml(post.summary || "")}</p>`;
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
          return `<button type="button" class="x-tag-chip" data-filter-tag="${escapeHtml(
            cleanT
          )}">#${escapeHtml(cleanT)}</button>`;
        })
        .join("");

      tagsRow.querySelectorAll("[data-filter-tag]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.activeTag = btn.getAttribute("data-filter-tag") || "";
          state.visibleFeedCount = INITIAL_FEED_BATCH;
          exitArticleReaderToHome(true);
          renderPublicFeedAndShowcase();
        });
      });
    } else {
      tagsRow.classList.add("hidden");
    }
  }

  // بطاقة تعريف الكاتب المدمجة أسفل المقال (نظيفة تماماً من أي معرفات داخلية)
  const bioBox = document.getElementById("reader-author-bio-box");
  if (bioBox) {
    bioBox.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${escapeHtml(
          author.avatar
        )}" alt="${escapeHtml(author.name)}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid var(--brand-primary);">
        <div>
          <div style="display:flex;align-items:center;gap:5px;">
            <strong style="font-size:0.95rem;">${escapeHtml(author.name)}</strong>
            ${
              author.verified
                ? `<span class="material-symbols-rounded x-verified-badge" translate="no">verified</span>`
                : ""
            }
          </div>
          <span style="display:block;font-size:0.75rem;color:var(--brand-primary);font-weight:800;">${escapeHtml(
            author.jobTitle
          )}</span>
          <p style="font-size:0.8rem;color:var(--x-muted);font-weight:700;margin-top:2px;">${escapeHtml(
            author.bio
          )}</p>
        </div>
      </div>
      <button type="button" id="footer-open-author-btn" class="x-btn x-btn-glass x-btn-sm">
        <span>مقالات الكاتب</span>
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
        const aSameCat =
          cleanCategoryName((a.categories && a.categories[0]) || a.category) === cat
            ? 1
            : 0;
        const bSameCat =
          cleanCategoryName((b.categories && b.categories[0]) || b.category) === cat
            ? 1
            : 0;
        return bSameCat - aSameCat;
      })
      .slice(0, 3);

    relatedGrid.innerHTML = related.map((r) => buildNewsCardHtml(r)).join("");
    bindPostTriggerElements(relatedGrid);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exitArticleReaderToHome(updateHistory = true) {
  state.currentReadingPostId = null;
  document.getElementById("article-reader-view")?.classList.add("hidden");
  document.getElementById("home-feed-view")?.classList.remove("hidden");

  const videoBox = document.getElementById("reader-video-container");
  if (videoBox) videoBox.innerHTML = "";

  if (updateHistory && window.location.search.includes("post=")) {
    window.history.pushState({}, "", window.location.pathname);
  }
  applyDynamicIdentityAndMeta(null);
}

// ==================== 9. نافذة ملف الكاتب العام والصفحات المؤسسية ====================
function openAuthorProfileModal(authorObj) {
  const modal = document.getElementById("author-profile-modal");
  const body = document.getElementById("author-modal-body");
  if (!modal || !body) return;

  const authorPosts = getPublishedPostsOnly().filter(
    (p) =>
      p.author === authorObj.name ||
      (authorObj.id && p.authorId === authorObj.id)
  );

  body.innerHTML = `
    <div style="text-align:center;padding:18px 16px;background:var(--x-bg);border-radius:16px;border:1px solid var(--x-border);margin-bottom:16px;">
      <img src="${escapeHtml(
        authorObj.avatar
      )}" alt="${escapeHtml(authorObj.name)}" style="width:82px;height:82px;border-radius:50%;object-fit:cover;border:3px solid var(--brand-primary);margin:0 auto 10px;">
      <div style="display:flex;align-items:center;justify-content:center;gap:5px;">
        <h3 style="font-size:1.15rem;font-weight:900;">${escapeHtml(authorObj.name)}</h3>
        ${
          authorObj.verified
            ? `<span class="material-symbols-rounded x-verified-badge" translate="no">verified</span>`
            : ""
        }
      </div>
      <span style="display:inline-block;font-size:0.78rem;color:var(--brand-primary);font-weight:800;margin-top:2px;">
        ${escapeHtml(authorObj.jobTitle)}
      </span>
      <p style="font-size:0.84rem;color:var(--x-text-sec);margin-top:8px;line-height:1.65;">
        ${escapeHtml(authorObj.bio)}
      </p>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <strong style="font-size:0.92rem;">أحدث مقالات الكاتب</strong>
      <button type="button" id="filter-by-this-author-btn" class="x-btn x-btn-primary x-btn-sm">
        <span>عرض كافة مقالاته</span>
      </button>
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;">
      ${authorPosts
        .slice(0, 12)
        .map(
          (p) => `
        <div class="x-pulse-node" data-modal-post="${escapeHtml(p.id)}">
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
    state.visibleFeedCount = INITIAL_FEED_BATCH;
    exitArticleReaderToHome(true);
    renderPublicFeedAndShowcase();
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
    titleEl.textContent = "من نحن";
    bodyEl.innerHTML = sanitizeEditorialHtml(
      state.settings.aboutHtml || DEFAULT_ABOUT_HTML
    );
  } else if (docType === "privacy") {
    titleEl.textContent = "سياسة الخصوصية";
    bodyEl.innerHTML = sanitizeEditorialHtml(
      state.settings.privacyHtml || DEFAULT_PRIVACY_HTML
    );
  } else {
    titleEl.textContent = "ميثاق الشرف الصحفي";
    bodyEl.innerHTML = sanitizeEditorialHtml(
      state.settings.charterHtml || DEFAULT_CHARTER_HTML
    );
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

// ==================== 10. المراقب الذكي للتمرير اللانهائي + ربط كافة الأحداث ====================
function initInfiniteScrollObserver() {
  const sentinel = document.getElementById("infinite-scroll-sentinel");
  if (!sentinel || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadNextInfiniteBatch();
        }
      });
    },
    { rootMargin: "280px 0px" }
  );

  observer.observe(sentinel);
}

function setMobileDockActive(activeId) {
  ["dock-home-btn", "dock-pulse-btn", "dock-search-btn", "dock-menu-btn"].forEach(
    (id) => {
      document.getElementById(id)?.classList.toggle("active", id === activeId);
    }
  );
}

function bindAllPublicEvents() {
  // القائمة الجانبية
  document.getElementById("open-sidebar-btn")?.addEventListener("click", openPublicSidebar);
  document.getElementById("close-sidebar-btn")?.addEventListener("click", closePublicSidebar);
  document.getElementById("sidebar-backdrop")?.addEventListener("click", closePublicSidebar);

  // العودة للرئيسية
  document.getElementById("brand-home-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    setMobileDockActive("dock-home-btn");
    selectPublicCategory("all");
  });

  // شريط الأخبار العاجلة
  document.getElementById("close-breaking-bar-btn")?.addEventListener("click", () => {
    document.getElementById("breaking-news-bar")?.classList.add("hidden");
  });

  // زر النبض العلوي
  document.getElementById("header-pulse-btn")?.addEventListener("click", () => {
    exitArticleReaderToHome(true);
    document
      .getElementById("quick-pulse-aside")
      ?.scrollIntoView({ behavior: "smooth" });
  });

  // أزرار التقليب السلس للواجهة الكبرى الزجاجية + دعم اللمس (Swipe)
  document.getElementById("deck-prev-btn")?.addEventListener("click", () => {
    stepFeaturedDeckSlide(-1);
    restartDeckAutoTimer();
  });

  document.getElementById("deck-next-btn")?.addEventListener("click", () => {
    stepFeaturedDeckSlide(1);
    restartDeckAutoTimer();
  });

  const mosaicStage = document.getElementById("featured-mosaic-stage");
  let touchStartX = 0;
  mosaicStage?.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches?.[0]?.screenX || 0;
    },
    { passive: true }
  );

  mosaicStage?.addEventListener(
    "touchend",
    (e) => {
      const touchEndX = e.changedTouches?.[0]?.screenX || 0;
      const delta = touchEndX - touchStartX;
      if (Math.abs(delta) > 45) {
        stepFeaturedDeckSlide(delta > 0 ? 1 : -1);
        restartDeckAutoTimer();
      }
    },
    { passive: true }
  );

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
    state.visibleFeedCount = INITIAL_FEED_BATCH;
    exitArticleReaderToHome(true);
    renderPublicFeedAndShowcase();
  }, 180);

  searchInput?.addEventListener("input", (e) => {
    const val = (e.target.value || "").trim();
    clearSearchBtn?.classList.toggle("hidden", !val);
    runDebouncedSearch(val);
  });

  clearSearchBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    state.searchQuery = "";
    state.visibleFeedCount = INITIAL_FEED_BATCH;
    renderPublicFeedAndShowcase();
  });

  document.getElementById("reset-active-filter-btn")?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    clearSearchBtn?.classList.add("hidden");
    state.searchQuery = "";
    selectPublicCategory("all");
  });

  // الشريط السفلي الزجاجي العائم للجوال (Mobile Bottom Dock)
  document.getElementById("dock-home-btn")?.addEventListener("click", () => {
    setMobileDockActive("dock-home-btn");
    selectPublicCategory("all");
  });

  document.getElementById("dock-pulse-btn")?.addEventListener("click", () => {
    setMobileDockActive("dock-pulse-btn");
    exitArticleReaderToHome(true);
    document
      .getElementById("quick-pulse-aside")
      ?.scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("dock-search-btn")?.addEventListener("click", () => {
    setMobileDockActive("dock-search-btn");
    searchDrawer?.classList.remove("hidden");
    searchInput?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("dock-menu-btn")?.addEventListener("click", () => {
    setMobileDockActive("dock-menu-btn");
    openPublicSidebar();
  });

  // قارئ المقال وأزرار المشاركة النظيفة
  document.getElementById("reader-back-home-btn")?.addEventListener("click", () => {
    exitArticleReaderToHome(true);
  });

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
      showToast("تم نسخ رابط الخبر للمشاركة ✓");
    } catch (_) {}
  });

  document.getElementById("share-whatsapp-btn")?.addEventListener("click", () => {
    const post = state.posts.find((p) => p.id === state.currentReadingPostId);
    if (!post) return;
    const shareUrl = getCleanPostShareUrl(post.id);
    const text = `*${post.title}*\n\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  });

  document.getElementById("share-copy-link-btn")?.addEventListener("click", async () => {
    if (!state.currentReadingPostId) return;
    const shareUrl = getCleanPostShareUrl(state.currentReadingPostId);
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("تم نسخ رابط الخبر ✓");
    } catch (_) {}
  });

  // النوافذ المنبثقة
  document.querySelectorAll("[data-open-doc]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openInstitutionalModal(btn.getAttribute("data-open-doc") || "about");
    });
  });

  document.getElementById("close-inst-modal-btn")?.addEventListener("click", () => {
    document.getElementById("institutional-modal")?.classList.add("hidden");
  });

  document.getElementById("close-author-modal-btn")?.addEventListener("click", () => {
    document.getElementById("author-profile-modal")?.classList.add("hidden");
  });

  // إغلاق النوافذ عند النقر على الخلفية الزجاجية أو زر Escape
  ["institutional-modal", "author-profile-modal"].forEach((modalId) => {
    const m = document.getElementById(modalId);
    m?.addEventListener("click", (e) => {
      if (e.target === m) m.classList.add("hidden");
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePublicSidebar();
      document.getElementById("institutional-modal")?.classList.add("hidden");
      document.getElementById("author-profile-modal")?.classList.add("hidden");
    }
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

// ==================== 11. المزامنة الحية الآمنة مع Firestore ونقطة الانطلاق ====================
function startPublicFirestoreSync() {
  // 1. الإعدادات العامة (مع بتر فوري لكلمات المرور والمفاتيح السرية)
  onSnapshot(doc(db, "settings", "general"), (snap) => {
    if (snap.exists()) {
      const safeSettings = stripSensitiveSettingsData(snap.data());
      state.settings = { ...state.settings, ...safeSettings };
      const activePost = state.posts.find((p) => p.id === state.currentReadingPostId);
      applyDynamicIdentityAndMeta(activePost || null);
      saveFastCache();
    }
  });

  // 2. الأقسام والتصنيفات الفرعية
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

  // 3. الكادر الصحفي (تطهير فوري: استخراج الاسم، المسمى، النبذة، الصورة، والشارة الزرقاء فقط)
  onSnapshot(collection(db, "staff"), (snap) => {
    state.publicStaff = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.accountStatus !== "frozen" && !s.suspended)
      .map((s) => stripSensitiveStaffData(s, s.id));

    saveFastCache();
    renderPublicFeedAndShowcase();
  });

  // 4. الأخبار المنشورة (تطهير فوري واستبعاد المسودات والمراجعات وطلبات الحذف)
  onSnapshot(collection(db, "posts"), (snap) => {
    state.posts = snap.docs
      .map((d) => stripSensitivePostData(d.data(), d.id))
      .sort((a, b) => getTimestampMs(b) - getTimestampMs(a));

    saveFastCache();
    renderPublicFeedAndShowcase();

    const params = new URLSearchParams(window.location.search);
    const targetPostId = params.get("post");
    if (targetPostId) {
      openArticleReader(targetPostId, false);
    }
  });

  // 5. الإعلانات الممولة
  onSnapshot(collection(db, "ads"), (snap) => {
    state.ads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    saveFastCache();
    renderSponsoredAdsSlots();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadViewedGuardFromSession();
  restoreFastCache();
  applyDynamicIdentityAndMeta();
  renderCategoriesNavigation();
  renderPublicFeedAndShowcase();
  bindAllPublicEvents();
  initInfiniteScrollObserver();
  restartDeckAutoTimer();
  handleInitialUrlRoute();
  startPublicFirestoreSync();
});
