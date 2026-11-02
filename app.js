/* ==========================================================================
   حُجرية بريس (Hujariya Press) — المحرك البرمجي للموقع العام (طابع الجزيرة الحديث)
   الهوية القرمزية الفخمة (#b80d38) + المساحات البيضاء النقية:
   - شبكة التغطية الرئيسية غير المتماثلة (Asymmetric Hero Grid: خبر رئيسي + 3 أخبار جانبية)
   - محرك البحث الذكي العائم في الأسفل (فلترة لحظية مع كل حرف + عداد نتائج فوري)
   - شارات الفيديو السينمائية المدمجة فوق الصور + الفيديوهات القصيرة (9:16) والعريضة (16:9)
   - الاكتفاء بأول تصنيفين في البطاقات لمنع تشوه الجوال + عرض كل التصنيفات داخل المقال
   - دعم الصور المتعددة المدمجة بين فقرات المقال (Inline Images & Figures) + عارض Lightbox
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

const VIEWED_POSTS_STORAGE_KEY = "hujariya_unique_views_v3";
const VIEWED_ADS_SESSION_KEY = "hujariya_ad_impressions_v1";
const MAX_ALLOWED_TAGS = 3;
const MAX_CARD_CATEGORIES = 2; // عرض أول تصنيفين فقط في بطاقات الصفحة الرئيسية لمنع تشوه الجوال
const DEFAULT_CRIMSON_COLOR = "#b80d38";

function getDynamicSiteBaseUrl() {
  try {
    const origin = window.location.origin;
    const cleanPath = window.location.pathname
      .replace(/\/index\.html$/i, "")
      .replace(/\/+$/, "");
    return `${origin}${cleanPath}`;
  } catch (_) {
    return "https://hujariyapress.rawi-ye.com";
  }
}

function getDynamicPostShareUrl(postId) {
  const base = getDynamicSiteBaseUrl();
  return `${base}/?post=${encodeURIComponent(postId)}`;
}

// ==================== 2. الأقسام الأساسية الشاملة والنصوص المؤسسية ====================
const DEFAULT_COMPASSES = [
  {
    id: "yemen-politics",
    name: "السياسة اليمنية",
    shortName: "السياسة اليمنية",
    slug: "yemen-politics",
    subcategories: ["الشرعية ومؤسسات الدولة", "التحليلات الاستراتيجية", "الشأن المحلي والمحافظات", "كشف زيف الميليشيات"],
    visible: true,
    order: 1
  },
  {
    id: "saudi-politics",
    name: "السياسة السعودية",
    shortName: "السياسة السعودية",
    slug: "saudi-politics",
    subcategories: ["الأمن القومي المشترك", "الدبلوماسية الإقليمية", "رؤية المملكة 2030", "المشاريع التنموية"],
    visible: true,
    order: 2
  },
  {
    id: "regional-international",
    name: "إقليمي ودولي",
    shortName: "إقليمي ودولي",
    slug: "regional-international",
    subcategories: ["الشرق الأوسط", "السياسة الدولية", "أمن البحر الأحمر والممرات"],
    visible: true,
    order: 3
  },
  {
    id: "economy-dev",
    name: "اقتصاد وأسواق",
    shortName: "اقتصاد وأسواق",
    slug: "economy-dev",
    subcategories: ["أسواق وعملات", "طاقة ونفط", "إعمار وتنمية", "بورصات عالمية"],
    visible: true,
    order: 4
  },
  {
    id: "sports",
    name: "الرياضة",
    shortName: "الرياضة",
    slug: "sports",
    subcategories: ["الكرة اليمنية", "الدوري السعودي", "الكرة العالمية", "بطولات دولية"],
    visible: true,
    order: 5
  },
  {
    id: "health-science",
    name: "صحة وعلوم وفضاء",
    shortName: "صحة وعلوم",
    slug: "health-science",
    subcategories: ["طب وصحة", "أبحاث الفضاء والفلك", "اكتشافات علمية", "بيئة ومناخ"],
    visible: true,
    order: 6
  },
  {
    id: "tech-future",
    name: "تقنية ومستقبل",
    shortName: "تقنية ومستقبل",
    slug: "tech-future",
    subcategories: ["الذكاء الاصطناعي", "الأمن السيبراني", "تطبيقات ومنصات", "ابتكارات"],
    visible: true,
    order: 7
  },
  {
    id: "culture-thought",
    name: "ثقافة وفكر",
    shortName: "ثقافة وفكر",
    slug: "culture-thought",
    subcategories: ["أدب وفكر", "تاريخ وهوية", "قراءات وكتب", "مقالات الرأي"],
    visible: true,
    order: 8
  },
  {
    id: "art-media",
    name: "فن وإعلام",
    shortName: "فن وإعلام",
    slug: "art-media",
    subcategories: ["فن ودراما", "إعلام رقمي", "تراث وفنون"],
    visible: true,
    order: 9
  }
];

const DEFAULT_ABOUT_HTML = `<p><strong>منصة إخبارية وتحليلية شاملة، تنبض بروح الوطن، وتؤمن بأن الكلمة أمانة والموقف مبدأ.</strong></p>
<p>تندرج <strong>حُجرية بريس (Hujariya Press)</strong> تحت مظلة <strong>مؤسسة RAWI-YE.COM الإعلامية الرقمية</strong>، وهي مؤسسة إعلامية مهنية رائدة تضم عدة منصات نوعية متكاملة في رؤيتها ومستقلة في خطوطها التحريرية. ننطلق من رسالة إعلامية راسخة لتكون منصتنا مساحة رحبة وموضوعية لكل الأقلام الحرة والمبدعة في مختلف المجالات؛ السياسية، الاقتصادية، الرياضية، الصحية، العلمية، الثقافية، والتقنية.</p>
<h3>التوجيه التحريري والثوابت الوطنية</h3>
<blockquote>
<p>• <strong>الانحياز للدولة والاستقرار:</strong> دعم مؤسسات الدولة الشرعية، وتعزيز مسار الأمن والاستقرار، ورفض كافة المشاريع الكيانية المتمردة أو الميليشيات التي تسعى لتقويض النسيج الاجتماعي.</p>
<p>• <strong>الأمن القومي المشترك:</strong> أمن الجمهورية اليمنية وأمن المملكة العربية السعودية يمثلان عمقاً استراتيجياً وأمناً قومياً مشتركاً لا يتجزأ.</p>
</blockquote>`;

const DEFAULT_CHARTER_HTML = `<p>يمثل هذا الميثاق الدستور المهني والأخلاقي والوطني لكافة المحررين والكتّاب في <strong>حُجرية بريس (Hujariya Press — RAWI-YE.COM)</strong>:</p>
<h3>أولاً: الثوابت الوطنية والسياسية</h3>
<p>1. الالتزام التام بدعم الدولة والشرعية والاصطفاف مع المصلحة الوطنية العليا، وعدم الترويج لأي خطاب يخدم الميليشيات أو المشاريع التخريبية المعادية.</p>
<p>2. احترام عمق الأمن القومي المشترك بين اليمن والمملكة العربية السعودية باعتباره ركيزة استقرار المنطقة.</p>
<h3>ثانياً: المعايير المهنية والتحريرية</h3>
<p>1. تحري الدقة والمصداقية والاعتماد على المصادر الموثوقة قبل نشر أي خبر أو تحليل.</p>
<p>2. الكتابة باللغة العربية الفصحى الرصينة، والابتعاد عن الألفاظ النابية أو التجريح الشخصي.</p>`;

const DEFAULT_PRIVACY_HTML = `<p>تحترم <strong>حُجرية بريس</strong> خصوصية كافة زوارها وقرّائها، وتلتزم بحماية البيانات وفق أعلى المعايير التقنية:</p>
<p>• لا نقوم بجمع أي بيانات شخصية عن الزوار أثناء تصفح الأخبار والمقالات.</p>
<p>• تُستخدم الإحصائيات العامة لقياس جودة المحتوى وتطوير تجربة القارئ دون المساس بخصوصيته.</p>`;

// ==================== 3. حالة النظام للموقع العام (State) ====================
const state = {
  settings: {
    siteName: "حُجرية بريس",
    networkName: "RAWI-YE.COM",
    siteDescription: "حُجرية بريس — منصة إخبارية وتحليلية شاملة تندرج تحت مظلة مؤسسة RAWI-YE.COM الإعلامية الرقمية.",
    logoUrl: "",
    hideSiteName: false,
    faviconUrl: "",
    appIconUrl: "",
    coverImageUrl: "",
    defaultPostImageUrl: "",
    accentColor: DEFAULT_CRIMSON_COLOR,
    aboutHtml: DEFAULT_ABOUT_HTML,
    charterHtml: DEFAULT_CHARTER_HTML,
    privacyHtml: DEFAULT_PRIVACY_HTML,
    socials: {}
  },
  compasses: [...DEFAULT_COMPASSES],
  posts: [],
  staff: [],
  ads: [],
  activeView: "home",
  activeCompass: "all",
  activeSubcategory: "all",
  activeTag: "",
  searchQuery: "",
  visiblePostsLimit: 12,
  currentArticleId: null,
  currentAuthorKey: null
};

// ==================== 4. الدوال المساعدة، الفيديو، والصور المدمجة الآمنة ====================
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtmlToPlain(html = "") {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
}

function showPubToast(msg) {
  const toast = document.getElementById("pub-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(window.__pubToastTimer);
  window.__pubToastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
}

function getCleanCategoryLabel(name = "") {
  return (
    String(name)
      .replace(/^بوصلة\s+/i, "")
      .replace(/^البوصلة\s+/i, "")
      .trim() || name
  );
}

function getPostTimestampMs(item) {
  if (!item) return 0;
  const t = item.createdAt || item.updatedAt;
  if (!t) return 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  const parsed = new Date(t).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function formatArabicDate(timestamp) {
  const ms = typeof timestamp === "number" ? timestamp : getPostTimestampMs({ createdAt: timestamp });
  if (!ms) return "حديثاً";
  const d = new Date(ms);
  return d.toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatRelativeTime(timestamp) {
  const ms = typeof timestamp === "number" ? timestamp : getPostTimestampMs({ createdAt: timestamp });
  if (!ms) return "الآن";
  const diffMinutes = Math.max(1, Math.floor((Date.now() - ms) / 60000));
  if (diffMinutes < 60) return `منذ ${diffMinutes} د`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `منذ ${diffHours} س`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `منذ ${diffDays} يوم`;
  return formatArabicDate(ms);
}

function extractYoutubeVideoId(url = "") {
  const clean = String(url || "").trim();
  if (!clean) return "";
  const regExp =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = clean.match(regExp);
  return match && match[1] ? match[1] : "";
}

function isPostVideo(post) {
  if (!post) return false;
  return Boolean(
    (post.videoUrl && String(post.videoUrl).trim() !== "") ||
      (post.videoType && post.videoType !== "none")
  );
}

function isPostShortVerticalVideo(post) {
  if (!isPostVideo(post)) return false;
  if (post.videoType === "short_vertical") return true;
  const vUrl = String(post.videoUrl || "").toLowerCase();
  return vUrl.includes("/shorts/") || vUrl.includes("tiktok.com") || vUrl.includes("/reel/");
}

function getPostEffectiveImageUrl(post) {
  if (post && post.imageUrl && String(post.imageUrl).trim() !== "") {
    return String(post.imageUrl).trim();
  }
  const ytId = extractYoutubeVideoId(post?.videoUrl);
  if (ytId) {
    return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  }
  const s = state.settings;
  if (s.defaultPostImageUrl && s.defaultPostImageUrl.trim() !== "") {
    return s.defaultPostImageUrl.trim();
  }
  if (s.coverImageUrl && s.coverImageUrl.trim() !== "") {
    return s.coverImageUrl.trim();
  }
  return "";
}

// توليد الصورة المصغرة مع شارة الفيديو السينمائية المدمجة فوق زاوية الصورة بأسلوب الجزيرة
function buildPostThumbnailHtml(post, altText = "", showFloatingMediaBadge = true) {
  const imgUrl = getPostEffectiveImageUrl(post);
  const s = state.settings;
  const fallbackLogo = (s.logoUrl || s.faviconUrl || s.appIconUrl || "").trim();
  const siteName =
    s.siteName && s.siteName !== "شبكة البوصلة" && s.siteName !== "نبض اليمن"
      ? s.siteName
      : "حُجرية بريس";

  const hasVideo = showFloatingMediaBadge && isPostVideo(post);
  const isShort = isPostShortVerticalVideo(post);
  const floatingBadgeHtml = hasVideo
    ? `<span class="media-floating-badge">
        <span class="material-symbols-rounded" translate="no">play_circle</span>
        <span>${isShort ? "فيديو قصير" : "فيديو"}${
        post?.videoDuration ? ` • ${escapeHtml(post.videoDuration)}` : ""
      }</span>
      </span>`
    : "";

  if (imgUrl) {
    return `
      <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(
      altText || post?.title || siteName
    )}" loading="lazy" decoding="async">
      ${floatingBadgeHtml}
    `;
  }

  return `
    <div class="brand-fallback-thumb">
      ${
        fallbackLogo
          ? `<img src="${escapeHtml(fallbackLogo)}" alt="${escapeHtml(siteName)}">`
          : `<strong class="brand-fallback-name">${escapeHtml(siteName)}</strong>`
      }
    </div>
    ${floatingBadgeHtml}
  `;
}

// ==================== محرك تطهير وتنسيق المقال ودعم الصور المدمجة بين الفقرات ====================
function isSafeImageSrc(src = "") {
  const clean = String(src || "").trim();
  if (!clean) return false;
  return (
    /^https?:\/\//i.test(clean) ||
    /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(clean) ||
    clean.startsWith("/")
  );
}

function sanitizeAndFormatArticleHtml(rawHtml = "") {
  if (!rawHtml) return "";

  let preprocessedHtml = String(rawHtml).replace(
    /\[صورة:\s*([^\]|\s]+)(?:\s*\|\s*([^\]]+))?\]/g,
    (_, imgUrl, caption) => {
      if (!isSafeImageSrc(imgUrl)) return "";
      const capHtml = caption
        ? `<figcaption>${escapeHtml(caption.trim())}</figcaption>`
        : "";
      return `<figure class="inline-article-figure"><img src="${escapeHtml(
        imgUrl.trim()
      )}" alt="${escapeHtml((caption || "صورة توضيحية").trim())}" loading="lazy">${capHtml}</figure>`;
    }
  );

  const container = document.createElement("div");
  container.innerHTML = preprocessedHtml;

  container
    .querySelectorAll("script, style, object, embed, form, input, button, meta, link, iframe")
    .forEach((el) => el.remove());

  container.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = String(attr.value || "").trim().toLowerCase();
      if (name.startsWith("on") || val.startsWith("javascript:") || val.startsWith("vbscript:")) {
        el.removeAttribute(attr.name);
      }
    });

    if (el.tagName === "A") {
      const rawHref = (el.getAttribute("href") || "").trim();
      if (
        rawHref &&
        !/^https?:\/\//i.test(rawHref) &&
        !rawHref.startsWith("/") &&
        !rawHref.startsWith("#")
      ) {
        el.setAttribute("href", `https://${rawHref}`);
      }
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }

    if (el.tagName === "IMG") {
      const src = (el.getAttribute("src") || "").trim();
      if (!isSafeImageSrc(src)) {
        el.remove();
        return;
      }
      el.setAttribute("loading", "lazy");
      el.setAttribute("decoding", "async");
      if (!el.getAttribute("alt")) {
        el.setAttribute("alt", "صورة مرفقة في التقرير");
      }
      if (el.parentElement?.tagName === "FIGURE") {
        el.parentElement.classList.add("inline-article-figure");
      }
    }
  });

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    const parentTag = currentNode.parentElement?.tagName;
    if (
      parentTag &&
      !["A", "SCRIPT", "STYLE", "CODE", "PRE", "FIGCAPTION"].includes(parentTag)
    ) {
      textNodes.push(currentNode);
    }
  }

  const tokenRegex = /(https?:\/\/[^\s<>"']+)|(^|\s)#([\u0600-\u06FFa-zA-Z0-9_]{2,40})/g;

  textNodes.forEach((node) => {
    const text = node.nodeValue || "";
    if (!tokenRegex.test(text)) return;
    tokenRegex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIdx = 0;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
      const matchStart = match.index;
      if (matchStart > lastIdx) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, matchStart)));
      }

      if (match[1]) {
        const cleanUrl = match[1].replace(/[.,؛،!?)"]+$/, "");
        const trailingPunct = match[1].slice(cleanUrl.length);

        const linkEl = document.createElement("a");
        linkEl.href = cleanUrl;
        linkEl.target = "_blank";
        linkEl.rel = "noopener noreferrer";
        linkEl.textContent = cleanUrl;
        fragment.appendChild(linkEl);

        if (trailingPunct) {
          fragment.appendChild(document.createTextNode(trailingPunct));
        }
      } else if (match[3]) {
        const leadingSpace = match[2] || "";
        const tagText = match[3];
        if (leadingSpace) {
          fragment.appendChild(document.createTextNode(leadingSpace));
        }
        const spanEl = document.createElement("span");
        spanEl.className = "inline-hashtag";
        spanEl.setAttribute("data-inline-tag", tagText);
        spanEl.textContent = `#${tagText}`;
        fragment.appendChild(spanEl);
      }

      lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
    }

    node.parentNode?.replaceChild(fragment, node);
  });

  return container.innerHTML;
}

// ==================== عارض الصور المكبر (Lightbox) ====================
function openImageLightbox(src, caption = "") {
  if (!src) return;
  const modal = document.getElementById("inline-image-lightbox");
  const fullImg = document.getElementById("lightbox-full-img");
  const capEl = document.getElementById("lightbox-caption-text");
  if (!modal || !fullImg) return;

  fullImg.src = src;
  fullImg.alt = caption || "صورة مكبرة";

  if (capEl) {
    const cleanCap = String(caption || "").trim();
    capEl.textContent = cleanCap;
    capEl.classList.toggle("hidden", !cleanCap || cleanCap === "صورة مرفقة في التقرير");
  }

  modal.classList.remove("hidden");
}

function closeImageLightbox() {
  const modal = document.getElementById("inline-image-lightbox");
  const fullImg = document.getElementById("lightbox-full-img");
  if (modal) modal.classList.add("hidden");
  if (fullImg) fullImg.src = "";
}

function bindArticleImagesZoom(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll("img").forEach((img) => {
    if (img.closest(".brand-fallback-thumb")) return;
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      const figCap = img.closest("figure")?.querySelector("figcaption")?.textContent || "";
      const caption = figCap || img.getAttribute("alt") || "";
      openImageLightbox(img.src, caption);
    });
  });
}

function resolvePostAuthorInfo(post) {
  const rawName = post?.author || "حُجرية بريس";
  const rawEmail = String(post?.authorEmail || post?.authorUsername || "").toLowerCase();
  const rawId = String(post?.authorId || "").toLowerCase();

  const matchedStaff = state.staff.find((s) => {
    if (rawId && String(s.id || "").toLowerCase() === rawId) return true;
    if (
      rawEmail &&
      (String(s.email || "").toLowerCase() === rawEmail ||
        String(s.username || "").toLowerCase() === rawEmail)
    ) {
      return true;
    }
    if (s.name && s.name.trim() === rawName.trim()) return true;
    return false;
  });

  const name = matchedStaff?.name || rawName;
  const avatar =
    matchedStaff?.avatar ||
    post?.authorAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=b80d38&color=fff`;
  const verified = matchedStaff
    ? Boolean(matchedStaff.verified || matchedStaff.role === "admin" || matchedStaff.isMasterAdmin)
    : Boolean(post?.authorVerified);
  const authorKey = matchedStaff?.id || rawEmail || name;

  return { name, avatar, verified, authorKey, staffMember: matchedStaff };
}

function getPostCompasses(post) {
  const list = [];
  if (Array.isArray(post?.categories)) {
    post.categories.forEach((c) => {
      if (c && !list.includes(c)) list.push(c);
    });
  }
  if (post?.category && !list.includes(post.category)) {
    list.push(post.category);
  }
  return list.length ? list : ["السياسة اليمنية"];
}

// ==================== دالة تصنيفات البطاقات الذكية (تعرض أول تصنيفين فقط في الصفحة الرئيسية) ====================
function buildCardCategoriesHtml(post, maxLimit = MAX_CARD_CATEGORIES) {
  const cats = getPostCompasses(post);
  const subcats = [];
  if (Array.isArray(post?.subcategories)) {
    post.subcategories.forEach((s) => {
      if (s && !subcats.includes(s)) subcats.push(s);
    });
  }
  if (post?.subcategory && !subcats.includes(post.subcategory)) {
    subcats.push(post.subcategory);
  }

  const allBadgeObjects = [
    ...cats.map((c) => ({
      type: "cat",
      raw: c,
      label: getCleanCategoryLabel(c)
    })),
    ...subcats.map((s) => ({
      type: "sub",
      raw: s,
      label: s
    }))
  ];

  const visibleSlice = allBadgeObjects.slice(0, maxLimit);
  const hiddenCount = Math.max(0, allBadgeObjects.length - visibleSlice.length);

  const pillsHtml = visibleSlice
    .map((item) => {
      if (item.type === "cat") {
        return `<span class="card-cat-pill" data-card-cat="${escapeHtml(
          item.raw
        )}">${escapeHtml(item.label)}</span>`;
      }
      return `<span class="card-subcat-pill">${escapeHtml(item.label)}</span>`;
    })
    .join("");

  const moreBadgeHtml =
    hiddenCount > 0
      ? `<span class="card-more-cats-pill" title="يوجد ${hiddenCount} تصنيفات إضافية داخل الخبر">+${hiddenCount}</span>`
      : "";

  return `<div class="card-categories-row">${pillsHtml}${moreBadgeHtml}</div>`;
}

function postMatchesCompass(post, targetCompass) {
  if (!targetCompass || targetCompass === "all") return true;
  if (targetCompass === "pulse-only") {
    return Boolean(post?.isQuickNews || isBreakingStillActive(post));
  }
  if (targetCompass === "shorts-only") {
    return isPostVideo(post);
  }
  const targetClean = getCleanCategoryLabel(targetCompass);
  return getPostCompasses(post).some(
    (c) => c === targetCompass || getCleanCategoryLabel(c) === targetClean
  );
}

function isBreakingStillActive(post) {
  if (!post || !post.isBreaking) return false;
  const now = Date.now();
  if (post.breakingExpiresAt) {
    const exp =
      typeof post.breakingExpiresAt === "number"
        ? post.breakingExpiresAt
        : new Date(post.breakingExpiresAt).getTime();
    if (exp && !isNaN(exp) && now > exp) return false;
  } else if (post.breakingDurationHours) {
    const createdMs = getPostTimestampMs(post);
    const durationMs = Number(post.breakingDurationHours) * 3600 * 1000;
    if (createdMs && durationMs > 0 && now > createdMs + durationMs) return false;
  }
  return true;
}

// ==================== 5. شريط الطقس المباشر (كافة المدن اليمنية + المدن السعودية المهمة) ====================
async function initRegionalWeatherStrip() {
  const track = document.getElementById("regional-weather-track");
  if (!track) return;

  const regionalCities = [
    { name: "صنعاء", lat: 15.3694, lon: 44.191 },
    { name: "عدن", lat: 12.7855, lon: 45.0187 },
    { name: "تعز", lat: 13.5795, lon: 44.0209 },
    { name: "الحجرية (التربة)", lat: 13.2167, lon: 44.1167 },
    { name: "المكلا", lat: 14.5425, lon: 49.1242 },
    { name: "مأرب", lat: 15.4591, lon: 45.3253 },
    { name: "الحديدة", lat: 14.7978, lon: 42.9545 },
    { name: "إب", lat: 13.9667, lon: 44.1833 },
    { name: "سيئون", lat: 15.943, lon: 48.7872 },
    { name: "المخا", lat: 13.3185, lon: 43.2495 },
    { name: "عتق", lat: 14.5377, lon: 46.8319 },
    { name: "الغيضة", lat: 16.2079, lon: 52.176 },
    { name: "سقطرى", lat: 12.6488, lon: 53.9963 },
    { name: "الرياض", lat: 24.7136, lon: 46.6753 },
    { name: "مكة المكرمة", lat: 21.3891, lon: 39.8579 },
    { name: "المدينة المنورة", lat: 24.5247, lon: 39.5692 },
    { name: "جدة", lat: 21.4858, lon: 39.1925 },
    { name: "الدمام", lat: 26.4207, lon: 50.0888 },
    { name: "أبها", lat: 18.2164, lon: 42.5053 },
    { name: "جازان", lat: 16.8892, lon: 42.5511 }
  ];

  try {
    const lats = regionalCities.map((c) => c.lat).join(",");
    const lons = regionalCities.map((c) => c.lon).join(",");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current_weather=true`;

    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const results = Array.isArray(data) ? data : [data];

    const singlePass = regionalCities
      .map((city, idx) => {
        const temp = results[idx]?.current_weather?.temperature;
        const tempRounded = typeof temp === "number" ? Math.round(temp) : 26;
        return `<span>${escapeHtml(city.name)} <strong dir="ltr">${tempRounded}°C</strong></span>`;
      })
      .join(`<span class="t-sep">•</span>`);

    if (singlePass) {
      track.innerHTML = `${singlePass}<span class="t-sep">•</span>${singlePass}`;
    }
  } catch (_) {}
}

// ==================== 6. شريط مؤشرات الأسواق العالمية والعملات والطاقة ====================
async function initGlobalMarketsStrip() {
  const track = document.getElementById("global-markets-track");
  if (!track) return;

  const marketItems = [
    { label: "الذهب (أونصة)", value: "$2,748.20", change: "+0.45%", up: true },
    { label: "نفط برنت", value: "$75.10", change: "+0.82%", up: true },
    { label: "خام تكساس", value: "$71.35", change: "+0.64%", up: true },
    { label: "تاسي السعودي", value: "12,068", change: "+0.38%", up: true },
    { label: "داو جونز", value: "42,415", change: "+0.25%", up: true },
    { label: "ناسداك", value: "18,540", change: "+0.51%", up: true },
    { label: "إس آند بي 500", value: "5,862", change: "+0.31%", up: true }
  ];

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      const rates = data?.rates || {};
      if (rates.SAR) {
        marketItems.push({
          label: "دولار / ريال سعودي",
          value: Number(rates.SAR).toFixed(2),
          change: "مستقر",
          up: true
        });
      }
      if (rates.EUR) {
        const eurUsd = (1 / Number(rates.EUR)).toFixed(4);
        marketItems.push({
          label: "اليورو / الدولار",
          value: `$${eurUsd}`,
          change: "+0.12%",
          up: true
        });
      }
      if (rates.GBP) {
        const gbpUsd = (1 / Number(rates.GBP)).toFixed(4);
        marketItems.push({
          label: "الإسترليني / الدولار",
          value: `$${gbpUsd}`,
          change: "+0.18%",
          up: true
        });
      }
    }
  } catch (_) {}

  const singlePass = marketItems
    .map((m) => {
      const arrow = m.up ? "▲" : "▼";
      const cls = m.up ? "m-up" : "m-down";
      return `<span class="m-item">${escapeHtml(m.label)} <strong dir="ltr">${escapeHtml(
        m.value
      )}</strong> <em class="${cls}">${arrow} ${escapeHtml(m.change)}</em></span>`;
    })
    .join(`<span class="t-sep">|</span>`);

  track.innerHTML = `${singlePass}<span class="t-sep">|</span>${singlePass}`;
}

// ==================== 7. تطبيق الهوية القرمزية الفخمة والحاضنة الذكية للشعار المفرغ ====================
function resolveEffectiveCrimsonColor(savedColor = "") {
  const clean = String(savedColor || "").trim().toLowerCase();
  // إذا كان اللون المخزن سابقاً هو الأحمر البرتقالي القديم (#ef3327)، نعتمد القرمزي الفخم الجديد تلقائياً
  if (!clean || clean === "#ef3327") {
    return DEFAULT_CRIMSON_COLOR;
  }
  return savedColor;
}

function applyDynamicSiteIdentity() {
  const s = state.settings;
  const siteName =
    s.siteName && s.siteName !== "شبكة البوصلة" && s.siteName !== "نبض اليمن"
      ? s.siteName
      : "حُجرية بريس";
  const siteDesc =
    s.siteDescription ||
    "حُجرية بريس — منصة إخبارية وتحليلية شاملة تندرج تحت مظلة مؤسسة RAWI-YE.COM الإعلامية الرقمية.";
  const brandColor = resolveEffectiveCrimsonColor(s.accentColor);

  document.documentElement.style.setProperty("--brand-red", brandColor);

  const themeMeta = document.getElementById("page-theme-color");
  if (themeMeta) themeMeta.setAttribute("content", brandColor);

  const textBrand = document.getElementById("site-text-brand");
  if (textBrand) textBrand.textContent = siteName;

  const sidebarTitle = document.getElementById("sidebar-brand-title");
  if (sidebarTitle) sidebarTitle.textContent = siteName;

  const footerName = document.getElementById("footer-site-name");
  if (footerName) footerName.textContent = siteName;

  const copyName = document.getElementById("copyright-site-name");
  if (copyName) copyName.textContent = siteName;

  const footerDesc = document.getElementById("footer-site-desc");
  if (footerDesc) footerDesc.textContent = siteDesc;

  const currentHost = window.location.host || "hujariyapress.rawi-ye.com";
  const sideDomain = document.getElementById("sidebar-domain-label");
  if (sideDomain) sideDomain.textContent = currentHost;
  const footDomain = document.getElementById("footer-domain-label");
  if (footDomain) footDomain.textContent = currentHost;

  // إدارة الشعار المفرغ داخل الكبسولة القرمزية لضمان وضوحه التام فوق الهيدر الأبيض
  const logoImg = document.getElementById("site-logo-img");
  const headerCapsule = document.getElementById("header-logo-capsule");
  const sidebarLogo = document.getElementById("sidebar-logo-img");
  const sidebarCapsule = document.getElementById("sidebar-logo-capsule");
  const footerLogo = document.getElementById("footer-logo-img");
  const hasLogo = Boolean(s.logoUrl && s.logoUrl.trim() !== "");

  [logoImg, sidebarLogo, footerLogo].forEach((imgEl) => {
    if (!imgEl) return;
    if (hasLogo) {
      imgEl.src = s.logoUrl.trim();
      imgEl.classList.remove("hidden");
    } else {
      imgEl.classList.add("hidden");
    }
  });

  headerCapsule?.classList.toggle("hidden", !hasLogo);
  sidebarCapsule?.classList.toggle("hidden", !hasLogo);

  if (textBrand) {
    const shouldHideText = hasLogo && Boolean(s.hideSiteName);
    textBrand.classList.toggle("hidden", shouldHideText);
  }

  const appIcon = (s.faviconUrl || s.appIconUrl || s.logoUrl || "").trim();
  if (appIcon) {
    const favEl = document.getElementById("dynamic-favicon");
    if (favEl) favEl.href = appIcon;

    const appleEl = document.getElementById("dynamic-apple-icon");
    if (appleEl) appleEl.href = appIcon;

    updateDynamicWebAppManifest(siteName, siteDesc, appIcon, brandColor);
  }

  const shareImage = (s.coverImageUrl || s.defaultPostImageUrl || s.logoUrl || "").trim();
  if (state.activeView === "home") {
    updateMetaAndOgTags(
      `${siteName} | Hujariya Press`,
      siteDesc,
      shareImage,
      getDynamicSiteBaseUrl()
    );
  }

  renderSocialPlatformsLinks();
  renderMasterSidebarContents();
}

function updateMetaAndOgTags(title, description, imageUrl, url) {
  document.title = title;
  const setAttr = (id, attr, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.setAttribute(attr, val);
  };
  setAttr("page-meta-desc", "content", description);
  setAttr("og-meta-title", "content", title);
  setAttr("og-meta-desc", "content", description);
  if (imageUrl) setAttr("og-meta-image", "content", imageUrl);
  if (url) setAttr("og-meta-url", "content", url);
}

function updateDynamicWebAppManifest(name, description, iconUrl, themeColor) {
  try {
    const manifestObj = {
      name: `${name} | Hujariya Press`,
      short_name: name,
      description,
      start_url: getDynamicSiteBaseUrl(),
      display: "standalone",
      background_color: "#ffffff",
      theme_color: themeColor || DEFAULT_CRIMSON_COLOR,
      dir: "rtl",
      lang: "ar",
      icons: [
        { src: iconUrl, sizes: "192x192", type: "image/png" },
        { src: iconUrl, sizes: "512x512", type: "image/png" }
      ]
    };
    const blob = new Blob([JSON.stringify(manifestObj)], { type: "application/json" });
    const manifestUrl = URL.createObjectURL(blob);
    let linkEl = document.querySelector('link[rel="manifest"]');
    if (!linkEl) {
      linkEl = document.createElement("link");
      linkEl.rel = "manifest";
      document.head.appendChild(linkEl);
    }
    linkEl.href = manifestUrl;
  } catch (_) {}
}

function renderSocialPlatformsLinks() {
  const soc = state.settings.socials || {};
  const allPlatforms = [
    { key: "whatsapp", label: "واتساب", url: soc.whatsapp },
    { key: "telegram", label: "تليجرام", url: soc.telegram },
    { key: "x", label: "منصة X", url: soc.x || soc.twitter },
    { key: "facebook", label: "فيسبوك", url: soc.facebook },
    { key: "youtube", label: "يوتيوب", url: soc.youtube },
    { key: "instagram", label: "إنستغرام", url: soc.instagram },
    { key: "tiktok", label: "تيك توك", url: soc.tiktok },
    { key: "threads", label: "ثريدز", url: soc.threads },
    { key: "snapchat", label: "سناب شات", url: soc.snapchat },
    { key: "linkedin", label: "لينكدإن", url: soc.linkedin }
  ].filter((item) => item.url && String(item.url).trim() !== "");

  const sideWrap = document.getElementById("sidebar-socials-wrap");
  const sideGrid = document.getElementById("sidebar-social-links");
  const footRow = document.getElementById("footer-social-links");

  const linksHtml = allPlatforms
    .map(
      (p) =>
        `<a href="${escapeHtml(p.url.trim())}" target="_blank" rel="noopener noreferrer">${escapeHtml(
          p.label
        )}</a>`
    )
    .join("");

  if (sideWrap && sideGrid) {
    if (allPlatforms.length) {
      sideWrap.classList.remove("hidden");
      sideGrid.innerHTML = linksHtml;
    } else {
      sideWrap.classList.add("hidden");
      sideGrid.innerHTML = "";
    }
  }

  if (footRow) {
    footRow.innerHTML = linksHtml;
  }
}

// ==================== 8. شريط الأقسام والقائمة الجانبية المباشرة ====================
function getVisibleCompasses() {
  return [...state.compasses]
    .filter((c) => c.visible !== false)
    .sort((a, b) => (a.order || 99) - (b.order || 99));
}

function renderCompassesNavigation() {
  const navEl = document.getElementById("public-compasses-nav");
  const compasses = getVisibleCompasses();

  if (navEl) {
    navEl.innerHTML = [
      `<button type="button" class="cat-tab-btn ${
        state.activeCompass === "all" ? "active" : ""
      }" data-compass-filter="all">الرئيسية</button>`,
      ...compasses.map((c) => {
        const isActive = state.activeCompass === c.name || state.activeCompass === c.id;
        const cleanTitle = c.shortName || getCleanCategoryLabel(c.name);
        return `<button type="button" class="cat-tab-btn ${
          isActive ? "active" : ""
        }" data-compass-filter="${escapeHtml(c.name)}">${escapeHtml(cleanTitle)}</button>`;
      })
    ].join("");

    navEl.querySelectorAll("[data-compass-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectCompassCategory(btn.getAttribute("data-compass-filter") || "all");
      });
    });
  }

  renderSubcategoriesBar();
  renderMasterSidebarContents();
}

function renderSubcategoriesBar() {
  const wrap = document.getElementById("subcategories-bar-wrap");
  const listEl = document.getElementById("public-subcategories-list");
  if (!wrap || !listEl) return;

  if (
    state.activeCompass === "all" ||
    state.activeCompass === "pulse-only" ||
    state.activeCompass === "shorts-only"
  ) {
    wrap.classList.add("hidden");
    return;
  }

  const comp = state.compasses.find(
    (c) =>
      c.name === state.activeCompass ||
      c.id === state.activeCompass ||
      getCleanCategoryLabel(c.name) === getCleanCategoryLabel(state.activeCompass)
  );
  const subs = Array.isArray(comp?.subcategories) ? comp.subcategories.filter(Boolean) : [];

  if (!subs.length) {
    wrap.classList.add("hidden");
    return;
  }

  wrap.classList.remove("hidden");
  listEl.innerHTML = [
    `<button type="button" class="subcat-chip ${
      state.activeSubcategory === "all" ? "active" : ""
    }" data-subcat-item="all">كل مواضيع ${escapeHtml(getCleanCategoryLabel(comp.name))}</button>`,
    ...subs.map(
      (sub) =>
        `<button type="button" class="subcat-chip ${
          state.activeSubcategory === sub ? "active" : ""
        }" data-subcat-item="${escapeHtml(sub)}">${escapeHtml(sub)}</button>`
    )
  ].join("");

  listEl.querySelectorAll("[data-subcat-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeSubcategory = btn.getAttribute("data-subcat-item") || "all";
      renderSubcategoriesBar();
      renderAllHomeSections();
    });
  });
}

function renderMasterSidebarContents() {
  const directGrid = document.getElementById("sidebar-categories-direct-list");
  const writersBlock = document.getElementById("sidebar-writers-block");
  const writersList = document.getElementById("sidebar-writers-list");

  const compasses = getVisibleCompasses();

  if (directGrid) {
    directGrid.innerHTML = compasses
      .map((c) => {
        const cleanTitle = c.shortName || getCleanCategoryLabel(c.name);
        return `
          <button type="button" class="sidebar-cat-direct-btn" data-side-direct-cat="${escapeHtml(
            c.name
          )}">
            <span>${escapeHtml(cleanTitle)}</span>
            <span class="material-symbols-rounded" style="font-size:15px;" translate="no">chevron_left</span>
          </button>
        `;
      })
      .join("");

    directGrid.querySelectorAll("[data-side-direct-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const catName = btn.getAttribute("data-side-direct-cat") || "all";
        closeMasterSidebar();
        selectCompassCategory(catName);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  if (writersBlock && writersList) {
    const writers = state.staff.filter((s) => s.name && !s.hiddenFromPublic);
    if (writers.length) {
      writersBlock.classList.remove("hidden");
      writersList.innerHTML = writers
        .map((w) => {
          const av =
            w.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              w.name
            )}&background=b80d38&color=fff`;
          return `
            <button type="button" class="sidebar-writer-btn" data-side-writer="${escapeHtml(w.id)}">
              <img src="${escapeHtml(av)}" alt="">
              <span>${escapeHtml(w.name)}</span>
            </button>
          `;
        })
        .join("");

      writersList.querySelectorAll("[data-side-writer]").forEach((btn) => {
        btn.addEventListener("click", () => {
          closeMasterSidebar();
          openAuthorProfile(btn.getAttribute("data-side-writer"));
        });
      });
    } else {
      writersBlock.classList.add("hidden");
    }
  }
}

function openMasterSidebar() {
  document.getElementById("master-sidebar-backdrop")?.classList.remove("hidden");
  document.getElementById("master-sidebar-drawer")?.classList.remove("hidden");
}

function closeMasterSidebar() {
  document.getElementById("master-sidebar-backdrop")?.classList.add("hidden");
  document.getElementById("master-sidebar-drawer")?.classList.add("hidden");
}

function selectCompassCategory(compassName) {
  state.activeCompass = compassName;
  state.activeSubcategory = "all";
  state.activeTag = "";
  state.visiblePostsLimit = 12;
  switchPublicView("home");
  renderCompassesNavigation();
  renderAllHomeSections();
}

// ==================== 9. العاجل، الإعلانات، وشبكة الجزيرة غير المتماثلة (Asymmetric Hero Grid) ====================
function getPublishedPosts() {
  return state.posts.filter((p) => !p.status || p.status === "published");
}

function renderBreakingNewsBar() {
  const bar = document.getElementById("breaking-news-bar");
  const track = document.getElementById("breaking-ticker-items");
  if (!bar || !track) return;

  const breakingPosts = getPublishedPosts().filter((p) => isBreakingStillActive(p));

  if (!breakingPosts.length) {
    bar.classList.add("hidden");
    return;
  }

  bar.classList.remove("hidden");

  const singlePass = breakingPosts
    .map(
      (p) => `
      <button type="button" class="tv-ticker-item" data-open-post="${escapeHtml(p.id)}">
        <span>${escapeHtml(p.title)}</span>
      </button>
      <span class="t-sep">◆</span>
    `
    )
    .join("");

  track.innerHTML = singlePass + singlePass;
  const durationSeconds = Math.max(20, breakingPosts.length * 10);
  track.style.animationDuration = `${durationSeconds}s`;

  track.querySelectorAll("[data-open-post]").forEach((btn) => {
    btn.addEventListener("click", () => openArticleReader(btn.getAttribute("data-open-post")));
  });
}

function recordAdImpressionOnce(adId) {
  if (!adId) return;
  try {
    const raw = sessionStorage.getItem(VIEWED_ADS_SESSION_KEY);
    const seen = raw ? JSON.parse(raw) : {};
    if (seen[adId]) return;
    seen[adId] = true;
    sessionStorage.setItem(VIEWED_ADS_SESSION_KEY, JSON.stringify(seen));
    updateDoc(doc(db, "ads", adId), { views: increment(1) }).catch(() => {});
  } catch (_) {}
}

function renderPublicAds() {
  const topSlot = document.getElementById("ad-slot-top");
  const midSlot = document.getElementById("ad-slot-middle");

  const activeAds = state.ads.filter(
    (a) => a.active !== false && a.status !== "paused" && a.status !== "frozen"
  );

  if (!activeAds.length) {
    topSlot?.classList.add("hidden");
    midSlot?.classList.add("hidden");
    return;
  }

  const buildAdHtml = (ad) => `
    <a href="${escapeHtml(ad.targetUrl || "#")}" target="_blank" rel="noopener noreferrer" class="ad-banner-card" data-ad-click="${escapeHtml(ad.id)}">
      <div>
        <span class="card-cat-pill">إعلان — ${escapeHtml(ad.sponsorName || "حُجرية بريس")}</span>
        <strong style="display:block;font-size:0.95rem;margin-top:4px;">${escapeHtml(ad.title)}</strong>
      </div>
      ${ad.imageUrl ? `<img src="${escapeHtml(ad.imageUrl)}" alt="${escapeHtml(ad.title)}" loading="lazy">` : ""}
    </a>
  `;

  if (topSlot && activeAds[0]) {
    topSlot.innerHTML = buildAdHtml(activeAds[0]);
    topSlot.classList.remove("hidden");
    recordAdImpressionOnce(activeAds[0].id);
  } else if (topSlot) {
    topSlot.classList.add("hidden");
  }

  if (midSlot && activeAds[1]) {
    midSlot.innerHTML = buildAdHtml(activeAds[1]);
    midSlot.classList.remove("hidden");
    recordAdImpressionOnce(activeAds[1].id);
  } else if (midSlot) {
    midSlot.classList.add("hidden");
  }

  document.querySelectorAll("[data-ad-click]").forEach((link) => {
    link.addEventListener("click", () => {
      const adId = link.getAttribute("data-ad-click");
      if (adId) {
        updateDoc(doc(db, "ads", adId), { clicks: increment(1) }).catch(() => {});
      }
    });
  });
}

// شبكة العرض غير المتماثلة بأسلوب الجزيرة (خبر رئيسي ضخم يميناً + عمود أبرز 3 أخبار يساراً)
function renderHeroAndPulseSection() {
  const heroSection = document.getElementById("hero-featured-section");
  const heroBox = document.getElementById("hero-featured-box");
  const pulseSection = document.getElementById("quick-pulse-strip-section");
  const pulseFeed = document.getElementById("quick-pulse-feed");

  if (!heroSection || !heroBox || !pulseSection || !pulseFeed) return;

  const hasSpecialFilter = Boolean(
    state.searchQuery ||
      state.activeTag ||
      state.activeSubcategory !== "all" ||
      state.activeCompass === "pulse-only" ||
      state.activeCompass === "shorts-only"
  );

  if (hasSpecialFilter) {
    heroSection.classList.add("hidden");
    pulseSection.classList.add("hidden");
    return;
  }

  heroSection.classList.remove("hidden");
  const published = getPublishedPosts();
  const scoped = published.filter((p) => postMatchesCompass(p, state.activeCompass));
  const heroPost = scoped.find((p) => p.isFeatured) || scoped[0];

  if (!heroPost) {
    heroBox.innerHTML = `<div class="skeleton-box">لا توجد أخبار منشورة في هذا القسم حالياً.</div>`;
  } else {
    const authorInfo = resolvePostAuthorInfo(heroPost);
    const summaryText =
      heroPost.summary || stripHtmlToPlain(heroPost.content).slice(0, 180) + "...";

    // اختيار أبرز 3 أخبار تالية للعمود الأيسر المرافق في شبكة الجزيرة
    const sideHeadlinePosts = scoped.filter((p) => p.id !== heroPost.id).slice(0, 3);
    const hasSideStack = sideHeadlinePosts.length > 0;

    const sideStackHtml = hasSideStack
      ? `
        <div class="aj-hero-side-stack">
          ${sideHeadlinePosts
            .map((sp) => {
              const spAuthor = resolvePostAuthorInfo(sp);
              return `
                <article class="aj-hero-side-item" data-open-post="${escapeHtml(sp.id)}">
                  <div class="aj-side-thumb">
                    ${buildPostThumbnailHtml(sp, sp.title, false)}
                  </div>
                  <div class="aj-side-info">
                    ${buildCardCategoriesHtml(sp, 1)}
                    <h3 class="aj-side-title">${escapeHtml(sp.title)}</h3>
                    <div style="font-size:0.71rem;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center;">
                      <span>${escapeHtml(spAuthor.name)}</span>
                      <span>${formatRelativeTime(sp.createdAt)}</span>
                    </div>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      `
      : "";

    heroBox.innerHTML = `
      <div class="aj-asymmetric-hero-grid ${hasSideStack ? "" : "aj-hero-Single-only"}">
        <article class="lead-story-card" data-open-post="${escapeHtml(heroPost.id)}">
          <div class="lead-story-media">
            ${buildPostThumbnailHtml(heroPost, heroPost.title, true)}
          </div>
          <div class="lead-story-body">
            <div>
              ${buildCardCategoriesHtml(heroPost, MAX_CARD_CATEGORIES)}
              <h2 class="lead-story-title">${escapeHtml(heroPost.title)}</h2>
              <p class="lead-story-summary">${escapeHtml(summaryText)}</p>
            </div>
            <div class="card-clean-meta">
              <span class="card-author-name" data-open-author="${escapeHtml(authorInfo.authorKey)}">
                <span>${escapeHtml(authorInfo.name)}</span>
                ${
                  authorInfo.verified
                    ? `<span class="material-symbols-rounded verified-icon" translate="no">verified</span>`
                    : ""
                }
              </span>
              <span>${formatRelativeTime(heroPost.createdAt)}</span>
            </div>
          </div>
        </article>
        ${sideStackHtml}
      </div>
    `;

    bindCardInteractiveEvents(heroBox);
  }

  // شريط موجز الأخبار السريعة (النبض)
  const pulsePosts = published
    .filter((p) => p.isQuickNews || isBreakingStillActive(p))
    .slice(0, 10);
  const pulseList = pulsePosts.length ? pulsePosts : published.slice(0, 8);

  if (!pulseList.length || state.activeCompass !== "all") {
    pulseSection.classList.add("hidden");
  } else {
    pulseSection.classList.remove("hidden");
    pulseFeed.innerHTML = pulseList
      .map(
        (p) => `
        <div class="pulse-mini-card" data-open-post="${escapeHtml(p.id)}">
          <span class="brief-item-time">${formatRelativeTime(p.createdAt)} • ${escapeHtml(
          getCleanCategoryLabel(getPostCompasses(p)[0])
        )}</span>
          <h3 class="brief-item-title">${escapeHtml(p.title)}</h3>
        </div>
      `
      )
      .join("");

    pulseFeed.querySelectorAll("[data-open-post]").forEach((item) => {
      item.addEventListener("click", () => openArticleReader(item.getAttribute("data-open-post")));
    });
  }
}

function renderShortsReelsSection() {
  const section = document.getElementById("shorts-reels-section");
  const listEl = document.getElementById("shorts-horizontal-list");
  if (!section || !listEl) return;

  if (state.activeCompass !== "all" || state.searchQuery || state.activeTag) {
    section.classList.add("hidden");
    return;
  }

  const videoPosts = getPublishedPosts()
    .filter((p) => isPostVideo(p))
    .slice(0, 10);

  if (!videoPosts.length) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  listEl.innerHTML = videoPosts
    .map((p) => {
      const isShort = isPostShortVerticalVideo(p);
      const badgeLabel = isShort ? "📱 ريلز" : "▶ فيديو";
      const dur = p.videoDuration ? ` • ${escapeHtml(p.videoDuration)}` : "";
      return `
        <article class="short-reel-card" data-open-post="${escapeHtml(p.id)}">
          ${buildPostThumbnailHtml(p, p.title, false)}
          <span class="short-play-badge">${badgeLabel}${dur}</span>
          <div class="short-reel-overlay">
            <h3 class="short-reel-title">${escapeHtml(p.title)}</h3>
          </div>
        </article>
      `;
    })
    .join("");

  listEl.querySelectorAll("[data-open-post]").forEach((card) => {
    card.addEventListener("click", () => openArticleReader(card.getAttribute("data-open-post")));
  });
}

function buildNewsCardHtml(post) {
  const authorInfo = resolvePostAuthorInfo(post);
  const excerpt = post.summary || stripHtmlToPlain(post.content).slice(0, 125) + "...";

  return `
    <article class="bbc-news-card" data-open-post="${escapeHtml(post.id)}">
      <div class="bbc-card-thumb">
        ${buildPostThumbnailHtml(post, post.title, true)}
      </div>
      <div class="bbc-card-content">
        <div>
          ${buildCardCategoriesHtml(post, MAX_CARD_CATEGORIES)}
          <h3 class="bbc-card-title">${escapeHtml(post.title)}</h3>
          <p class="bbc-card-excerpt">${escapeHtml(excerpt)}</p>
        </div>
        <div class="card-clean-meta">
          <span class="card-author-name" data-open-author="${escapeHtml(authorInfo.authorKey)}">
            <span>${escapeHtml(authorInfo.name)}</span>
            ${
              authorInfo.verified
                ? `<span class="material-symbols-rounded verified-icon" translate="no">verified</span>`
                : ""
            }
          </span>
          <span>${formatRelativeTime(post.createdAt)}</span>
        </div>
      </div>
    </article>
  `;
}

function bindCardInteractiveEvents(container) {
  if (!container) return;

  container.querySelectorAll("[data-open-post]").forEach((card) => {
    card.addEventListener("click", (e) => {
      const catEl = e.target.closest("[data-card-cat]");
      if (catEl) {
        e.stopPropagation();
        selectCompassCategory(catEl.getAttribute("data-card-cat"));
        return;
      }
      const authorEl = e.target.closest("[data-open-author]");
      if (authorEl) {
        e.stopPropagation();
        openAuthorProfile(authorEl.getAttribute("data-open-author"));
        return;
      }
      openArticleReader(card.getAttribute("data-open-post"));
    });
  });
}

function renderPublicPostsFeed() {
  const grid = document.getElementById("public-posts-grid");
  const heading = document.getElementById("feed-section-heading");
  const counterEl = document.getElementById("feed-posts-counter");
  const filterBanner = document.getElementById("active-filter-banner");
  const filterTitle = document.getElementById("active-filter-title");
  const loadMoreWrap = document.getElementById("load-more-wrap");
  const floatingSearchCount = document.getElementById("floating-search-count");

  if (!grid) return;

  let list = getPublishedPosts().filter((p) => postMatchesCompass(p, state.activeCompass));

  if (state.activeSubcategory !== "all") {
    list = list.filter(
      (p) =>
        p.subcategory === state.activeSubcategory ||
        (Array.isArray(p.subcategories) && p.subcategories.includes(state.activeSubcategory))
    );
  }

  if (state.activeTag) {
    const tagClean = state.activeTag.toLowerCase();
    list = list.filter(
      (p) =>
        Array.isArray(p.tags) &&
        p.tags.some((t) => String(t).toLowerCase() === tagClean)
    );
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter((p) => {
      const hay = `${p.title || ""} ${p.summary || ""} ${p.author || ""} ${(
        p.categories || []
      ).join(" ")} ${(p.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // تحديث عداد شريط البحث العائم الذكي في الأسفل
  if (floatingSearchCount) {
    if (state.searchQuery) {
      floatingSearchCount.textContent = `${list.length.toLocaleString("ar-YE")} نتيجة`;
      floatingSearchCount.classList.remove("hidden");
    } else {
      floatingSearchCount.classList.add("hidden");
    }
  }

  if (state.searchQuery || state.activeTag || state.activeCompass !== "all") {
    filterBanner?.classList.remove("hidden");
    if (filterTitle) {
      if (state.searchQuery)
        filterTitle.textContent = `نتائج البحث الفوري عن: "${state.searchQuery}"`;
      else if (state.activeTag) filterTitle.textContent = `الوسم: #${state.activeTag}`;
      else if (state.activeCompass === "pulse-only")
        filterTitle.textContent = "صفحة الأخبار السريعة والعاجلة (النبض)";
      else if (state.activeCompass === "shorts-only")
        filterTitle.textContent = "الفيديوهات القصيرة والتقارير المرئية";
      else if (state.activeSubcategory !== "all")
        filterTitle.textContent = `${getCleanCategoryLabel(state.activeCompass)} — ${
          state.activeSubcategory
        }`;
      else filterTitle.textContent = `قسم: ${getCleanCategoryLabel(state.activeCompass)}`;
    }
  } else {
    filterBanner?.classList.add("hidden");
  }

  if (heading) {
    if (state.searchQuery) {
      heading.textContent = "المواد المطابقة لبحثك";
    } else if (state.activeCompass === "pulse-only") {
      heading.textContent = "جميع الأخبار السريعة والعاجلة";
    } else if (state.activeCompass === "shorts-only") {
      heading.textContent = "الفيديوهات القصيرة والمرئيات";
    } else if (state.activeCompass === "all") {
      heading.textContent = "أحدث الأخبار والتقارير";
    } else {
      heading.textContent = getCleanCategoryLabel(state.activeCompass);
    }
  }

  if (counterEl) {
    counterEl.textContent = `${list.length.toLocaleString("ar-YE")} مادة`;
  }

  if (!list.length) {
    grid.innerHTML = `<div class="skeleton-box" style="grid-column:1/-1;height:140px;">لا توجد أخبار تطابق خيارات العرض أو البحث الحالي.</div>`;
    loadMoreWrap?.classList.add("hidden");
    return;
  }

  const visibleSlice = list.slice(0, state.visiblePostsLimit);
  grid.innerHTML = visibleSlice.map((p) => buildNewsCardHtml(p)).join("");
  bindCardInteractiveEvents(grid);

  if (loadMoreWrap) {
    loadMoreWrap.classList.toggle("hidden", list.length <= state.visiblePostsLimit);
  }
}

function renderWritersStrip() {
  const section = document.getElementById("writers-strip-section");
  const listEl = document.getElementById("writers-horizontal-list");
  if (!section || !listEl) return;

  const activeWriters = state.staff.filter((s) => s.name && !s.hiddenFromPublic);

  if (!activeWriters.length || state.activeCompass !== "all" || state.searchQuery || state.activeTag) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  listEl.innerHTML = activeWriters
    .map((w) => {
      const avatar =
        w.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          w.name
        )}&background=b80d38&color=fff`;
      const isVer = Boolean(w.verified || w.role === "admin" || w.isMasterAdmin);
      return `
        <button type="button" class="writer-clean-card" data-open-author="${escapeHtml(w.id)}">
          <img src="${escapeHtml(avatar)}" alt="${escapeHtml(w.name)}" loading="lazy">
          <div>
            <div class="writer-clean-name">
              <span>${escapeHtml(w.name)}</span>
              ${
                isVer
                  ? `<span class="material-symbols-rounded verified-icon" translate="no">verified</span>`
                  : ""
              }
            </div>
            <span class="writer-clean-role">${escapeHtml(w.jobTitle || "كاتب وصحفي")}</span>
          </div>
        </button>
      `;
    })
    .join("");

  listEl.querySelectorAll("[data-open-author]").forEach((btn) => {
    btn.addEventListener("click", () => openAuthorProfile(btn.getAttribute("data-open-author")));
  });
}

function renderAllHomeSections() {
  renderBreakingNewsBar();
  renderPublicAds();
  renderHeroAndPulseSection();
  renderShortsReelsSection();
  renderPublicPostsFeed();
  renderWritersStrip();
}

// ==================== 10. عداد المشاهدات الفعلي ومشاركة الخبر الذكية ====================
async function recordUniquePostView(postId) {
  if (!postId) return;
  try {
    const now = Date.now();
    const rawMap = localStorage.getItem(VIEWED_POSTS_STORAGE_KEY);
    const viewedMap = rawMap ? JSON.parse(rawMap) : {};
    const lastViewTime = Number(viewedMap[postId] || 0);

    if (lastViewTime && now - lastViewTime < 12 * 3600 * 1000) {
      return;
    }

    viewedMap[postId] = now;
    localStorage.setItem(VIEWED_POSTS_STORAGE_KEY, JSON.stringify(viewedMap));

    await updateDoc(doc(db, "posts", postId), {
      views: increment(1)
    });
  } catch (_) {}
}

async function fetchImageAsShareFile(imageUrl) {
  if (!imageUrl) return null;
  try {
    const response = await fetch(imageUrl, { mode: "cors", cache: "force-cache" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob || !blob.size) return null;
    const mimeType = blob.type || "image/jpeg";
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    return new File([blob], `hujariya-press.${ext}`, { type: mimeType });
  } catch (_) {
    return null;
  }
}

async function shareArticleUnified(post, triggerBtn = null) {
  if (!post) return;

  const siteName =
    state.settings.siteName &&
    state.settings.siteName !== "شبكة البوصلة" &&
    state.settings.siteName !== "نبض اليمن"
      ? state.settings.siteName
      : "حُجرية بريس";

  const shareUrl = getDynamicPostShareUrl(post.id);

  const summaryText =
    post.summary && String(post.summary).trim() !== ""
      ? String(post.summary).trim()
      : stripHtmlToPlain(post.content).slice(0, 165) + "...";

  const fullShareMessage = `📰 ${post.title}\n\n${summaryText}\n\n📌 باقي التفاصيل في موقع ${siteName}:\n${shareUrl}`;

  const topLabel = document.getElementById("unified-share-label");
  const bottomLabel = document.getElementById("unified-share-bottom-label");
  const originalTopText = topLabel ? topLabel.textContent : "مشاركة";
  const originalBottomText = bottomLabel ? bottomLabel.textContent : "مشاركة التقرير";

  if (triggerBtn) triggerBtn.disabled = true;
  if (topLabel) topLabel.textContent = "جاري التجهيز...";
  if (bottomLabel) bottomLabel.textContent = "جاري تجهيز المشاركة...";

  try {
    const effectiveImageUrl = getPostEffectiveImageUrl(post);

    if (navigator.share) {
      if (effectiveImageUrl && navigator.canShare) {
        const imageFile = await fetchImageAsShareFile(effectiveImageUrl);
        if (imageFile && navigator.canShare({ files: [imageFile] })) {
          await navigator.share({
            files: [imageFile],
            title: `${post.title} | ${siteName}`,
            text: fullShareMessage
          });
          return;
        }
      }

      await navigator.share({
        title: `${post.title} | ${siteName}`,
        text: `📰 ${post.title}\n\n${summaryText}\n\n📌 باقي التفاصيل في موقع ${siteName}:`,
        url: shareUrl
      });
      return;
    }

    await navigator.clipboard.writeText(fullShareMessage);
    showPubToast("تم نسخ العنوان والملخص والرابط الحقيقي للمشاركة ✓");
    if (topLabel) topLabel.textContent = "تم النسخ ✓";
    if (bottomLabel) bottomLabel.textContent = "تم النسخ ✓";
  } catch (err) {
    if (err && err.name !== "AbortError") {
      try {
        await navigator.clipboard.writeText(fullShareMessage);
        showPubToast("تم نسخ الخبر مع الملخص والرابط الحقيقي ✓");
      } catch (_) {
        showPubToast("رابط الخبر جاهز في شريط العنوان");
      }
    }
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
    setTimeout(() => {
      if (topLabel) topLabel.textContent = originalTopText;
      if (bottomLabel) bottomLabel.textContent = originalBottomText;
    }, 1800);
  }
}

// ==================== 11. قارئ الخبر الكامل (يعرض جميع التصنيفات والصور المدمجة) ====================
function buildSmartVideoPlayerHtml(post) {
  const rawUrl = String(post?.videoUrl || "").trim();
  if (!rawUrl) return "";

  const isVertical = isPostShortVerticalVideo(post);
  const frameClass = isVertical ? "video-frame-vertical" : "video-frame-landscape";
  const ytId = extractYoutubeVideoId(rawUrl);

  if (ytId) {
    const embedUrl = `https://www.youtube.com/embed/${ytId}?rel=0`;
    return `
      <div class="${frameClass}">
        <iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(
      post.title || "فيديو حُجرية بريس"
    )}" allowfullscreen loading="lazy"></iframe>
      </div>
    `;
  }

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(rawUrl)) {
    return `
      <div class="${frameClass}">
        <video src="${escapeHtml(rawUrl)}" controls playsinline preload="metadata"></video>
      </div>
    `;
  }

  return "";
}

function switchPublicView(viewName) {
  state.activeView = viewName;

  const views = {
    home: document.getElementById("view-home"),
    article: document.getElementById("view-article"),
    author: document.getElementById("view-author"),
    static: document.getElementById("view-static-page")
  };

  Object.entries(views).forEach(([key, el]) => {
    if (el) el.classList.toggle("hidden", key !== viewName);
  });
}

function openArticleReader(postId, updateHistory = true) {
  const post = getPublishedPosts().find((p) => p.id === postId);
  if (!post) {
    showPubToast("الخبر المطلوب غير متوفر حالياً");
    return;
  }

  state.currentArticleId = post.id;
  switchPublicView("article");

  recordUniquePostView(post.id);

  const compasses = getPostCompasses(post);
  const authorInfo = resolvePostAuthorInfo(post);
  const siteName =
    state.settings.siteName &&
    state.settings.siteName !== "شبكة البوصلة" &&
    state.settings.siteName !== "نبض اليمن"
      ? state.settings.siteName
      : "حُجرية بريس";

  const shareUrl = getDynamicPostShareUrl(post.id);
  const effectiveImage = getPostEffectiveImageUrl(post);
  const summaryMeta =
    post.summary || stripHtmlToPlain(post.content).slice(0, 160);

  updateMetaAndOgTags(
    `${post.title} | ${siteName}`,
    `${summaryMeta} — باقي التفاصيل في موقع ${siteName}`,
    effectiveImage,
    shareUrl
  );

  if (updateHistory) {
    try {
      window.history.pushState(
        { post: post.id },
        "",
        `?post=${encodeURIComponent(post.id)}`
      );
    } catch (_) {}
  }

  const badgesEl = document.getElementById("article-categories-badges");
  if (badgesEl) {
    const subcats = [];
    if (Array.isArray(post.subcategories)) {
      post.subcategories.forEach((s) => {
        if (s && !subcats.includes(s)) subcats.push(s);
      });
    }
    if (post.subcategory && !subcats.includes(post.subcategory)) {
      subcats.push(post.subcategory);
    }

    badgesEl.innerHTML = [
      ...compasses.map(
        (c) =>
          `<button type="button" class="subcat-chip active" data-reader-compass="${escapeHtml(
            c
          )}">${escapeHtml(getCleanCategoryLabel(c))}</button>`
      ),
      ...subcats.map((s) => `<span class="subcat-chip">${escapeHtml(s)}</span>`)
    ].join("");

    badgesEl.querySelectorAll("[data-reader-compass]").forEach((btn) => {
      btn.addEventListener("click", () =>
        selectCompassCategory(btn.getAttribute("data-reader-compass"))
      );
    });
  }

  const titleEl = document.getElementById("reader-article-title");
  if (titleEl) titleEl.textContent = post.title || "";

  const summaryEl = document.getElementById("reader-article-summary");
  if (summaryEl) {
    summaryEl.textContent = post.summary || "";
    summaryEl.classList.toggle("hidden", !post.summary);
  }

  const authorAvatarEl = document.getElementById("reader-author-avatar");
  if (authorAvatarEl) authorAvatarEl.src = authorInfo.avatar;

  const authorNameEl = document.getElementById("reader-author-name");
  if (authorNameEl) authorNameEl.textContent = authorInfo.name;

  const authorVerEl = document.getElementById("reader-author-verified");
  if (authorVerEl) authorVerEl.classList.toggle("hidden", !authorInfo.verified);

  const dateEl = document.getElementById("reader-publish-date");
  if (dateEl) dateEl.textContent = formatArabicDate(post.createdAt);

  const authorBox = document.getElementById("reader-author-box");
  if (authorBox) {
    authorBox.onclick = () => openAuthorProfile(authorInfo.authorKey);
  }

  const shareTopBtn = document.getElementById("unified-share-btn");
  if (shareTopBtn) {
    shareTopBtn.onclick = () => shareArticleUnified(post, shareTopBtn);
  }

  const shareBottomBtn = document.getElementById("unified-share-bottom-btn");
  if (shareBottomBtn) {
    shareBottomBtn.onclick = () => shareArticleUnified(post, shareBottomBtn);
  }

  const videoBox = document.getElementById("reader-video-box");
  const mediaFig = document.getElementById("reader-media-figure");
  const videoPlayerHtml = buildSmartVideoPlayerHtml(post);

  if (videoBox) {
    if (videoPlayerHtml) {
      videoBox.innerHTML = videoPlayerHtml;
      videoBox.classList.remove("hidden");
    } else {
      videoBox.innerHTML = "";
      videoBox.classList.add("hidden");
    }
  }

  if (mediaFig) {
    if (videoPlayerHtml && !post.imageUrl) {
      mediaFig.classList.add("hidden");
    } else {
      mediaFig.classList.remove("hidden");
      mediaFig.innerHTML = buildPostThumbnailHtml(post, post.title, false);
      bindArticleImagesZoom(mediaFig);
    }
  }

  const contentEl = document.getElementById("reader-article-content");
  if (contentEl) {
    contentEl.innerHTML = sanitizeAndFormatArticleHtml(post.content || "");
    bindArticleImagesZoom(contentEl);

    contentEl.querySelectorAll("[data-inline-tag]").forEach((tagSpan) => {
      tagSpan.addEventListener("click", () => {
        filterByHashtag(tagSpan.getAttribute("data-inline-tag"));
      });
    });
  }

  const tagsBox = document.getElementById("reader-tags-box");
  const tags = Array.isArray(post.tags)
    ? post.tags.filter(Boolean).slice(0, MAX_ALLOWED_TAGS)
    : [];
  if (tagsBox) {
    if (tags.length) {
      tagsBox.classList.remove("hidden");
      tagsBox.innerHTML = tags
        .map(
          (t) =>
            `<button type="button" class="tag-chip" data-tag-chip="${escapeHtml(
              t
            )}">#${escapeHtml(t)}</button>`
        )
        .join("");

      tagsBox.querySelectorAll("[data-tag-chip]").forEach((chip) => {
        chip.addEventListener("click", () =>
          filterByHashtag(chip.getAttribute("data-tag-chip"))
        );
      });
    } else {
      tagsBox.classList.add("hidden");
    }
  }

  const relatedGrid = document.getElementById("related-posts-grid");
  if (relatedGrid) {
    const related = getPublishedPosts()
      .filter(
        (p) =>
          p.id !== post.id &&
          getPostCompasses(p).some((c) => compasses.includes(c))
      )
      .slice(0, 3);

    relatedGrid.innerHTML = related.length
      ? related.map((r) => buildNewsCardHtml(r)).join("")
      : `<div class="skeleton-box" style="grid-column:1/-1;height:110px;">لا توجد أخبار أخرى مرتبطة في هذا القسم حالياً.</div>`;
    bindCardInteractiveEvents(relatedGrid);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function filterByHashtag(tag) {
  if (!tag) return;
  state.activeTag = tag.replace(/^#/, "").trim();
  state.activeCompass = "all";
  state.activeSubcategory = "all";
  switchPublicView("home");
  renderCompassesNavigation();
  renderAllHomeSections();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==================== 12. صفحة الكاتب والصفحات الثابتة ====================
function openAuthorProfile(authorKey, updateHistory = true) {
  if (!authorKey) return;
  state.currentAuthorKey = authorKey;
  switchPublicView("author");

  const keyLower = String(authorKey).trim().toLowerCase();

  const staffMember = state.staff.find(
    (s) =>
      String(s.id || "").toLowerCase() === keyLower ||
      String(s.username || "").toLowerCase() === keyLower ||
      String(s.name || "").trim().toLowerCase() === keyLower
  );

  const authorPosts = getPublishedPosts().filter((p) => {
    const info = resolvePostAuthorInfo(p);
    return (
      String(info.authorKey || "").toLowerCase() === keyLower ||
      String(info.name || "").trim().toLowerCase() === keyLower ||
      (staffMember &&
        String(info.name || "").trim() === String(staffMember.name || "").trim())
    );
  });

  const displayName = staffMember?.name || authorPosts[0]?.author || authorKey;
  const displayAvatar =
    staffMember?.avatar ||
    authorPosts[0]?.authorAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=b80d38&color=fff`;
  const isVerified = staffMember
    ? Boolean(
        staffMember.verified ||
          staffMember.role === "admin" ||
          staffMember.isMasterAdmin
      )
    : Boolean(authorPosts[0]?.authorVerified);
  const jobTitle = staffMember?.jobTitle || "كاتب وصحفي في حُجرية بريس";
  const bio =
    staffMember?.bio ||
    `أرشيف المقالات والتقارير المنشورة للكاتب ${displayName} في منصة حُجرية بريس.`;

  if (updateHistory) {
    try {
      window.history.pushState(
        { author: authorKey },
        "",
        `?author=${encodeURIComponent(authorKey)}`
      );
    } catch (_) {}
  }

  const avEl = document.getElementById("author-view-avatar");
  if (avEl) avEl.src = displayAvatar;

  const nameEl = document.getElementById("author-view-name");
  if (nameEl) nameEl.textContent = displayName;

  const verEl = document.getElementById("author-view-verified");
  if (verEl) verEl.classList.toggle("hidden", !isVerified);

  const jobEl = document.getElementById("author-view-job");
  if (jobEl) jobEl.textContent = jobTitle;

  const bioEl = document.getElementById("author-view-bio");
  if (bioEl) bioEl.textContent = bio;

  const headingEl = document.getElementById("author-articles-heading");
  if (headingEl) {
    headingEl.textContent = `مقالات الكاتب: ${displayName} (${authorPosts.length.toLocaleString(
      "ar-YE"
    )})`;
  }

  const gridEl = document.getElementById("author-posts-grid");
  if (gridEl) {
    gridEl.innerHTML = authorPosts.length
      ? authorPosts.map((p) => buildNewsCardHtml(p)).join("")
      : `<div class="skeleton-box" style="grid-column:1/-1;height:120px;">لا توجد مقالات منشورة لهذا الكاتب حالياً.</div>`;
    bindCardInteractiveEvents(gridEl);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openStaticPage(pageKey) {
  closeMasterSidebar();
  switchPublicView("static");

  const titleEl = document.getElementById("static-page-title");
  const bodyEl = document.getElementById("static-page-body");
  const s = state.settings;

  if (pageKey === "charter") {
    if (titleEl) titleEl.textContent = "ميثاق الشرف الصحفي والسياسة التحريرية";
    if (bodyEl) bodyEl.innerHTML = sanitizeAndFormatArticleHtml(s.charterHtml || DEFAULT_CHARTER_HTML);
  } else if (pageKey === "privacy") {
    if (titleEl) titleEl.textContent = "سياسة الخصوصية وحماية البيانات";
    if (bodyEl) bodyEl.innerHTML = sanitizeAndFormatArticleHtml(s.privacyHtml || DEFAULT_PRIVACY_HTML);
  } else {
    if (titleEl) titleEl.textContent = "من نحن والتوجيه الوطني";
    if (bodyEl) bodyEl.innerHTML = sanitizeAndFormatArticleHtml(s.aboutHtml || DEFAULT_ABOUT_HTML);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==================== 13. ربط الأحداث، البحث الذكي العائم، وعارض الصور المكبر ====================
function resetToHomeFeed() {
  closeMasterSidebar();
  state.activeCompass = "all";
  state.activeSubcategory = "all";
  state.activeTag = "";
  state.searchQuery = "";
  state.visiblePostsLimit = 12;

  const searchInput = document.getElementById("public-search-input");
  if (searchInput) searchInput.value = "";
  document.getElementById("clear-search-btn")?.classList.add("hidden");
  document.getElementById("floating-search-count")?.classList.add("hidden");

  try {
    window.history.pushState({}, "", window.location.pathname);
  } catch (_) {}

  switchPublicView("home");
  applyDynamicSiteIdentity();
  renderCompassesNavigation();
  renderAllHomeSections();
}

function openPulseDedicatedPage() {
  closeMasterSidebar();
  state.activeCompass = "pulse-only";
  state.activeSubcategory = "all";
  state.activeTag = "";
  state.visiblePostsLimit = 24;
  switchPublicView("home");
  renderCompassesNavigation();
  renderAllHomeSections();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openShortsDedicatedPage() {
  closeMasterSidebar();
  state.activeCompass = "shorts-only";
  state.activeSubcategory = "all";
  state.activeTag = "";
  state.visiblePostsLimit = 24;
  switchPublicView("home");
  renderCompassesNavigation();
  renderAllHomeSections();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindPublicEvents() {
  document
    .getElementById("open-master-sidebar-btn")
    ?.addEventListener("click", openMasterSidebar);
  document
    .getElementById("close-master-sidebar-btn")
    ?.addEventListener("click", closeMasterSidebar);
  document
    .getElementById("master-sidebar-backdrop")
    ?.addEventListener("click", closeMasterSidebar);

  document
    .getElementById("sidebar-home-btn")
    ?.addEventListener("click", resetToHomeFeed);
  document
    .getElementById("sidebar-pulse-page-btn")
    ?.addEventListener("click", openPulseDedicatedPage);
  document
    .getElementById("view-all-pulse-btn")
    ?.addEventListener("click", openPulseDedicatedPage);
  document
    .getElementById("header-pulse-shortcut")
    ?.addEventListener("click", openPulseDedicatedPage);

  document
    .getElementById("sidebar-shorts-page-btn")
    ?.addEventListener("click", openShortsDedicatedPage);
  document
    .getElementById("view-all-shorts-btn")
    ?.addEventListener("click", openShortsDedicatedPage);
  document
    .getElementById("header-shorts-shortcut")
    ?.addEventListener("click", openShortsDedicatedPage);

  document.getElementById("brand-home-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    resetToHomeFeed();
  });

  document.getElementById("back-from-article-btn")?.addEventListener("click", () => {
    try {
      window.history.pushState({}, "", window.location.pathname);
    } catch (_) {}
    switchPublicView("home");
  });

  document.getElementById("back-from-author-btn")?.addEventListener("click", () => {
    try {
      window.history.pushState({}, "", window.location.pathname);
    } catch (_) {}
    switchPublicView("home");
  });

  document.getElementById("back-from-static-btn")?.addEventListener("click", () => {
    switchPublicView("home");
  });

  document
    .getElementById("reset-all-filters-btn")
    ?.addEventListener("click", resetToHomeFeed);

  document.getElementById("load-more-posts-btn")?.addEventListener("click", () => {
    state.visiblePostsLimit += 12;
    renderPublicPostsFeed();
  });

  document
    .getElementById("close-lightbox-btn")
    ?.addEventListener("click", closeImageLightbox);

  document
    .getElementById("inline-image-lightbox")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "inline-image-lightbox") {
        closeImageLightbox();
      }
    });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeImageLightbox();
      closeMasterSidebar();
    }
  });

  // محرك البحث الذكي العائم في الأسفل (فلترة لحظية مع كل حرف بدون زر تأكيد)
  const searchForm = document.getElementById("public-search-form");
  const searchInput = document.getElementById("public-search-input");
  const clearBtn = document.getElementById("clear-search-btn");

  searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    searchInput?.blur();
  });

  searchInput?.addEventListener("input", () => {
    const val = (searchInput.value || "").trim();
    state.searchQuery = val;
    clearBtn?.classList.toggle("hidden", !val);
    if (state.activeView !== "home") {
      switchPublicView("home");
    }
    renderAllHomeSections();
  });

  clearBtn?.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
    state.searchQuery = "";
    clearBtn.classList.add("hidden");
    document.getElementById("floating-search-count")?.classList.add("hidden");
    renderAllHomeSections();
  });

  document.querySelectorAll("[data-open-page]").forEach((btn) => {
    btn.addEventListener("click", () =>
      openStaticPage(btn.getAttribute("data-open-page"))
    );
  });

  window.addEventListener("popstate", () => {
    checkUrlParamsOnLoad(false);
  });
}

function checkUrlParamsOnLoad(allowPush = false) {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("post");
  const authorKey = params.get("author");

  if (postId && state.posts.length) {
    openArticleReader(postId, allowPush);
  } else if (authorKey && (state.staff.length || state.posts.length)) {
    openAuthorProfile(authorKey, allowPush);
  } else {
    switchPublicView("home");
  }
}

function startPublicRealtimeSync() {
  onSnapshot(doc(db, "settings", "general"), (snap) => {
    if (snap.exists()) {
      const rawSettings = snap.data() || {};
      const { imgbbApiKey, ...publicSafeSettings } = rawSettings;
      state.settings = { ...state.settings, ...publicSafeSettings };
    }
    applyDynamicSiteIdentity();
    renderAllHomeSections();
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
    }
    renderCompassesNavigation();
    renderAllHomeSections();
  });

  onSnapshot(collection(db, "staff"), (snap) => {
    state.staff = snap.docs.map((d) => {
      const raw = d.data() || {};
      return {
        id: d.id,
        name: raw.name || "",
        username: raw.username || "",
        avatar: raw.avatar || "",
        jobTitle: raw.jobTitle || "",
        bio: raw.bio || "",
        verified: Boolean(raw.verified || raw.role === "admin" || raw.isMasterAdmin),
        role: raw.role || "writer",
        isMasterAdmin: Boolean(raw.isMasterAdmin),
        suspended: Boolean(raw.suspended),
        hiddenFromPublic: Boolean(raw.hiddenFromPublic)
      };
    });
    renderWritersStrip();
    renderPublicPostsFeed();
    renderMasterSidebarContents();
  });

  let initialUrlHandled = false;
  onSnapshot(collection(db, "posts"), (snap) => {
    state.posts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => getPostTimestampMs(b) - getPostTimestampMs(a));

    renderAllHomeSections();
    renderMasterSidebarContents();

    if (!initialUrlHandled) {
      initialUrlHandled = true;
      checkUrlParamsOnLoad(false);
    } else if (state.activeView === "article" && state.currentArticleId) {
      openArticleReader(state.currentArticleId, false);
    }
  });

  onSnapshot(collection(db, "ads"), (snap) => {
    state.ads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderPublicAds();
  });
}

// ==================== 14. نقطة انطلاق الموقع العام (حُجرية بريس) ====================
document.addEventListener("DOMContentLoaded", () => {
  initRegionalWeatherStrip();
  initGlobalMarketsStrip();
  applyDynamicSiteIdentity();
  renderCompassesNavigation();
  bindPublicEvents();
  startPublicRealtimeSync();
});
