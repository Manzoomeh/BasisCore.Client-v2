/* =============================================================================
 * BasisCore_Mock_1.js — Single-file mock layer for BasisCore (v2.39.6)
 * -----------------------------------------------------------------------------
 * Drop-in mock layer for BasisCore-based pages. Loads via a single <script>
 * tag, patches window.fetch in-place, and routes requests against user-defined
 * URL/method/body patterns. Designed for educational use: students can build
 * BasisCore pages without any backend, then swap to a real API by removing
 * this script tag.
 *
 *   <script src="./BasisCore_Mock_1.js"></script>
 *   <script>
 *     BasisCoreMock.useAllSamples();   // mounts /products, /users, /orders, ...
 *     BasisCoreMock.panel();           // floating control overlay
 *   </script>
 *   <script src="https://cdn.basiscore.net/_js/basiscore-2.39.6.min.js"></script>
 *
 * To go to production: remove this <script> tag. Nothing else changes.
 *
 * License: MIT-style — free to use, modify, redistribute.
 * ===========================================================================*/
(function (global) {
  "use strict";

  if (global.BasisCoreMock) {
    console.warn("[BasisCoreMock] already loaded; skipping re-init.");
    return;
  }

  /* =========================================================================
   * STATE
   * =======================================================================*/

  var STATE = {
    enabled: true,
    routes: [],
    scenarios: {},
    activeScenario: "default",
    latencyMs: 0,
    errorRate: 0,
    log: [],
    listeners: [],
    panel: null,
  };
  var LOG_LIMIT = 80;
  var ORIGINAL_FETCH = global.fetch ? global.fetch.bind(global) : null;

  /* =========================================================================
   * SAMPLE DATASETS
   * Rich, realistic, English-language data designed to make demo screens
   * look polished. Use BasisCoreMock.samples.{name} or .useAllSamples().
   * =======================================================================*/

  var SAMPLES = {
    /* --- products: e-commerce catalog ------------------------------------ */
    products: [
      {
        id: 1,
        sku: "LP-MBP14-M3",
        name: "MacBook Pro 14″",
        category: "Laptops",
        brand: "Apple",
        price: 1999.0,
        currency: "USD",
        stock: 12,
        rating: 4.8,
        reviewCount: 247,
        tags: ["premium", "professional", "apple-silicon"],
        releaseDate: "2023-10-30",
        imageUrl: "https://picsum.photos/seed/p1/600/400",
        inStock: true,
        isFeatured: true,
      },
      {
        id: 2,
        sku: "PH-IP15PRO",
        name: "iPhone 15 Pro",
        category: "Phones",
        brand: "Apple",
        price: 1099.0,
        currency: "USD",
        stock: 38,
        rating: 4.7,
        reviewCount: 893,
        tags: ["flagship", "5g", "titanium"],
        releaseDate: "2023-09-22",
        imageUrl: "https://picsum.photos/seed/p2/600/400",
        inStock: true,
        isFeatured: true,
      },
      {
        id: 3,
        sku: "TB-IPADAIR",
        name: "iPad Air 13″",
        category: "Tablets",
        brand: "Apple",
        price: 799.0,
        currency: "USD",
        stock: 21,
        rating: 4.6,
        reviewCount: 312,
        tags: ["portable", "m2-chip"],
        releaseDate: "2024-05-15",
        imageUrl: "https://picsum.photos/seed/p3/600/400",
        inStock: true,
        isFeatured: false,
      },
      {
        id: 4,
        sku: "HP-WH1000XM5",
        name: "Sony WH-1000XM5",
        category: "Audio",
        brand: "Sony",
        price: 399.0,
        currency: "USD",
        stock: 7,
        rating: 4.9,
        reviewCount: 1542,
        tags: ["noise-cancelling", "wireless", "premium"],
        releaseDate: "2022-05-12",
        imageUrl: "https://picsum.photos/seed/p4/600/400",
        inStock: true,
        isFeatured: true,
      },
      {
        id: 5,
        sku: "WT-APPLEW9",
        name: "Apple Watch Series 9",
        category: "Wearables",
        brand: "Apple",
        price: 429.0,
        currency: "USD",
        stock: 54,
        rating: 4.5,
        reviewCount: 678,
        tags: ["fitness", "smart", "health"],
        releaseDate: "2023-09-22",
        imageUrl: "https://picsum.photos/seed/p5/600/400",
        inStock: true,
        isFeatured: false,
      },
      {
        id: 6,
        sku: "CM-SONYA7IV",
        name: "Sony Alpha A7 IV",
        category: "Cameras",
        brand: "Sony",
        price: 2499.0,
        currency: "USD",
        stock: 4,
        rating: 4.8,
        reviewCount: 187,
        tags: ["mirrorless", "full-frame", "professional"],
        releaseDate: "2021-12-15",
        imageUrl: "https://picsum.photos/seed/p6/600/400",
        inStock: true,
        isFeatured: true,
      },
      {
        id: 7,
        sku: "GP-PS5SLIM",
        name: "PlayStation 5 Slim",
        category: "Gaming",
        brand: "Sony",
        price: 499.0,
        currency: "USD",
        stock: 19,
        rating: 4.7,
        reviewCount: 2341,
        tags: ["console", "4k", "next-gen"],
        releaseDate: "2023-11-08",
        imageUrl: "https://picsum.photos/seed/p7/600/400",
        inStock: true,
        isFeatured: false,
      },
      {
        id: 8,
        sku: "KB-MX-KEYS",
        name: "Logitech MX Keys S",
        category: "Accessories",
        brand: "Logitech",
        price: 119.0,
        currency: "USD",
        stock: 84,
        rating: 4.6,
        reviewCount: 521,
        tags: ["keyboard", "wireless", "backlit"],
        releaseDate: "2023-06-01",
        imageUrl: "https://picsum.photos/seed/p8/600/400",
        inStock: true,
        isFeatured: false,
      },
      {
        id: 9,
        sku: "MN-LG27UP",
        name: "LG UltraFine 27″ 4K",
        category: "Monitors",
        brand: "LG",
        price: 549.0,
        currency: "USD",
        stock: 11,
        rating: 4.4,
        reviewCount: 198,
        tags: ["4k", "usb-c", "color-accurate"],
        releaseDate: "2022-08-20",
        imageUrl: "https://picsum.photos/seed/p9/600/400",
        inStock: true,
        isFeatured: false,
      },
      {
        id: 10,
        sku: "BK-KINDLEOA",
        name: "Kindle Oasis",
        category: "E-Readers",
        brand: "Amazon",
        price: 279.0,
        currency: "USD",
        stock: 0,
        rating: 4.5,
        reviewCount: 412,
        tags: ["e-ink", "waterproof", "reading"],
        releaseDate: "2019-07-24",
        imageUrl: "https://picsum.photos/seed/p10/600/400",
        inStock: false,
        isFeatured: false,
      },
      {
        id: 11,
        sku: "SP-SONOSERA",
        name: "Sonos Era 300",
        category: "Audio",
        brand: "Sonos",
        price: 449.0,
        currency: "USD",
        stock: 16,
        rating: 4.6,
        reviewCount: 234,
        tags: ["spatial-audio", "wifi", "smart-speaker"],
        releaseDate: "2023-03-28",
        imageUrl: "https://picsum.photos/seed/p11/600/400",
        inStock: true,
        isFeatured: true,
      },
      {
        id: 12,
        sku: "DR-DJIMINI4",
        name: "DJI Mini 4 Pro",
        category: "Drones",
        brand: "DJI",
        price: 759.0,
        currency: "USD",
        stock: 3,
        rating: 4.7,
        reviewCount: 156,
        tags: ["compact", "4k", "obstacle-sensing"],
        releaseDate: "2023-09-25",
        imageUrl: "https://picsum.photos/seed/p12/600/400",
        inStock: true,
        isFeatured: false,
      },
    ],

    /* --- users: directory of staff / customers --------------------------- */
    users: [
      {
        id: 1,
        username: "sarah.connor",
        fullName: "Sarah Connor",
        email: "sarah.connor@example.com",
        phone: "+1-555-0142",
        role: "admin",
        department: "Engineering",
        jobTitle: "Principal Engineer",
        country: "United States",
        city: "San Francisco",
        joinedAt: "2021-03-15",
        lastActive: "2026-04-28T09:14:00Z",
        isActive: true,
        avatarUrl: "https://i.pravatar.cc/150?u=1",
      },
      {
        id: 2,
        username: "kenji.watanabe",
        fullName: "Kenji Watanabe",
        email: "kenji.watanabe@example.com",
        phone: "+81-3-5555-0188",
        role: "manager",
        department: "Product",
        jobTitle: "Senior PM",
        country: "Japan",
        city: "Tokyo",
        joinedAt: "2020-07-08",
        lastActive: "2026-04-29T01:42:00Z",
        isActive: true,
        avatarUrl: "https://i.pravatar.cc/150?u=2",
      },
      {
        id: 3,
        username: "amelia.singh",
        fullName: "Amelia Singh",
        email: "amelia.singh@example.com",
        phone: "+44-20-7946-0210",
        role: "editor",
        department: "Marketing",
        jobTitle: "Content Lead",
        country: "United Kingdom",
        city: "London",
        joinedAt: "2022-01-20",
        lastActive: "2026-04-28T16:30:00Z",
        isActive: true,
        avatarUrl: "https://i.pravatar.cc/150?u=3",
      },
      {
        id: 4,
        username: "marcus.brennan",
        fullName: "Marcus Brennan",
        email: "marcus.brennan@example.com",
        phone: "+1-555-0167",
        role: "member",
        department: "Sales",
        jobTitle: "Account Executive",
        country: "United States",
        city: "Austin",
        joinedAt: "2023-06-12",
        lastActive: "2026-04-29T07:58:00Z",
        isActive: true,
        avatarUrl: "https://i.pravatar.cc/150?u=4",
      },
      {
        id: 5,
        username: "fatima.alqasimi",
        fullName: "Fatima Al-Qasimi",
        email: "fatima.alqasimi@example.com",
        phone: "+971-4-555-0179",
        role: "member",
        department: "Design",
        jobTitle: "Senior Designer",
        country: "UAE",
        city: "Dubai",
        joinedAt: "2022-09-03",
        lastActive: "2026-04-28T19:11:00Z",
        isActive: true,
        avatarUrl: "https://i.pravatar.cc/150?u=5",
      },
      {
        id: 6,
        username: "lucas.oliveira",
        fullName: "Lucas Oliveira",
        email: "lucas.oliveira@example.com",
        phone: "+55-11-95555-0193",
        role: "member",
        department: "Engineering",
        jobTitle: "Backend Engineer",
        country: "Brazil",
        city: "São Paulo",
        joinedAt: "2023-11-28",
        lastActive: "2026-04-29T08:22:00Z",
        isActive: true,
        avatarUrl: "https://i.pravatar.cc/150?u=6",
      },
      {
        id: 7,
        username: "nora.bergstrom",
        fullName: "Nora Bergström",
        email: "nora.bergstrom@example.com",
        phone: "+46-8-555-0204",
        role: "manager",
        department: "Operations",
        jobTitle: "Ops Manager",
        country: "Sweden",
        city: "Stockholm",
        joinedAt: "2019-04-10",
        lastActive: "2026-04-28T11:05:00Z",
        isActive: true,
        avatarUrl: "https://i.pravatar.cc/150?u=7",
      },
      {
        id: 8,
        username: "priya.menon",
        fullName: "Priya Menon",
        email: "priya.menon@example.com",
        phone: "+91-80-5555-0218",
        role: "editor",
        department: "Product",
        jobTitle: "Technical Writer",
        country: "India",
        city: "Bengaluru",
        joinedAt: "2022-05-16",
        lastActive: "2026-04-28T14:47:00Z",
        isActive: true,
        avatarUrl: "https://i.pravatar.cc/150?u=8",
      },
      {
        id: 9,
        username: "derek.holloway",
        fullName: "Derek Holloway",
        email: "derek.holloway@example.com",
        phone: "+1-555-0234",
        role: "member",
        department: "Support",
        jobTitle: "Customer Success",
        country: "Canada",
        city: "Toronto",
        joinedAt: "2024-02-01",
        lastActive: "2026-04-27T20:18:00Z",
        isActive: false,
        avatarUrl: "https://i.pravatar.cc/150?u=9",
      },
      {
        id: 10,
        username: "isabella.romano",
        fullName: "Isabella Romano",
        email: "isabella.romano@example.com",
        phone: "+39-06-5555-0245",
        role: "admin",
        department: "Finance",
        jobTitle: "CFO",
        country: "Italy",
        city: "Rome",
        joinedAt: "2018-09-12",
        lastActive: "2026-04-29T06:33:00Z",
        isActive: true,
        avatarUrl: "https://i.pravatar.cc/150?u=10",
      },
    ],

    /* --- orders: invoices / transactions --------------------------------- */
    orders: [
      {
        id: 1,
        orderNumber: "ORD-2026-00142",
        customerId: 4,
        customerName: "Marcus Brennan",
        status: "shipped",
        itemCount: 3,
        subtotal: 459.97,
        tax: 41.4,
        shipping: 12.0,
        total: 513.37,
        currency: "USD",
        paymentMethod: "Credit Card",
        shippingMethod: "Express",
        createdAt: "2026-04-22T14:30:00Z",
        shippedAt: "2026-04-23T09:15:00Z",
        estimatedDelivery: "2026-04-25",
        trackingNumber: "TRK894721038",
      },
      {
        id: 2,
        orderNumber: "ORD-2026-00143",
        customerId: 5,
        customerName: "Fatima Al-Qasimi",
        status: "delivered",
        itemCount: 1,
        subtotal: 1099.0,
        tax: 98.91,
        shipping: 0.0,
        total: 1197.91,
        currency: "USD",
        paymentMethod: "Apple Pay",
        shippingMethod: "Standard",
        createdAt: "2026-04-19T11:02:00Z",
        shippedAt: "2026-04-20T08:00:00Z",
        estimatedDelivery: "2026-04-23",
        trackingNumber: "TRK894721102",
      },
      {
        id: 3,
        orderNumber: "ORD-2026-00144",
        customerId: 8,
        customerName: "Priya Menon",
        status: "processing",
        itemCount: 2,
        subtotal: 678.0,
        tax: 61.02,
        shipping: 8.5,
        total: 747.52,
        currency: "USD",
        paymentMethod: "PayPal",
        shippingMethod: "Standard",
        createdAt: "2026-04-27T16:48:00Z",
        shippedAt: null,
        estimatedDelivery: "2026-05-02",
        trackingNumber: null,
      },
      {
        id: 4,
        orderNumber: "ORD-2026-00145",
        customerId: 6,
        customerName: "Lucas Oliveira",
        status: "cancelled",
        itemCount: 1,
        subtotal: 549.0,
        tax: 0.0,
        shipping: 0.0,
        total: 0.0,
        currency: "USD",
        paymentMethod: "Credit Card",
        shippingMethod: "Express",
        createdAt: "2026-04-21T08:12:00Z",
        shippedAt: null,
        estimatedDelivery: null,
        trackingNumber: null,
      },
      {
        id: 5,
        orderNumber: "ORD-2026-00146",
        customerId: 3,
        customerName: "Amelia Singh",
        status: "shipped",
        itemCount: 4,
        subtotal: 1247.0,
        tax: 112.23,
        shipping: 18.0,
        total: 1377.23,
        currency: "GBP",
        paymentMethod: "Credit Card",
        shippingMethod: "Express",
        createdAt: "2026-04-25T10:25:00Z",
        shippedAt: "2026-04-26T07:30:00Z",
        estimatedDelivery: "2026-04-29",
        trackingNumber: "TRK894721245",
      },
      {
        id: 6,
        orderNumber: "ORD-2026-00147",
        customerId: 2,
        customerName: "Kenji Watanabe",
        status: "pending",
        itemCount: 2,
        subtotal: 428.0,
        tax: 38.52,
        shipping: 6.0,
        total: 472.52,
        currency: "JPY",
        paymentMethod: "Bank Transfer",
        shippingMethod: "Standard",
        createdAt: "2026-04-28T22:14:00Z",
        shippedAt: null,
        estimatedDelivery: "2026-05-04",
        trackingNumber: null,
      },
      {
        id: 7,
        orderNumber: "ORD-2026-00148",
        customerId: 1,
        customerName: "Sarah Connor",
        status: "delivered",
        itemCount: 5,
        subtotal: 2156.0,
        tax: 194.04,
        shipping: 24.0,
        total: 2374.04,
        currency: "USD",
        paymentMethod: "Credit Card",
        shippingMethod: "Overnight",
        createdAt: "2026-04-15T13:42:00Z",
        shippedAt: "2026-04-15T18:00:00Z",
        estimatedDelivery: "2026-04-16",
        trackingNumber: "TRK894720899",
      },
      {
        id: 8,
        orderNumber: "ORD-2026-00149",
        customerId: 7,
        customerName: "Nora Bergström",
        status: "returned",
        itemCount: 1,
        subtotal: 399.0,
        tax: 35.91,
        shipping: 10.0,
        total: 0.0,
        currency: "EUR",
        paymentMethod: "Credit Card",
        shippingMethod: "Standard",
        createdAt: "2026-04-10T09:18:00Z",
        shippedAt: "2026-04-11T08:30:00Z",
        estimatedDelivery: "2026-04-15",
        trackingNumber: "TRK894720654",
      },
    ],

    /* --- posts: blog / CMS articles -------------------------------------- */
    posts: [
      {
        id: 1,
        slug: "getting-started-with-basiscore",
        title: "Getting Started with BasisCore",
        excerpt:
          "A practical introduction to declarative web development without heavy frameworks.",
        authorId: 1,
        authorName: "Sarah Connor",
        category: "Tutorial",
        tags: ["basiscore", "beginner", "tutorial"],
        publishedAt: "2026-04-15T10:00:00Z",
        readingTime: 8,
        viewCount: 1247,
        likeCount: 89,
        commentCount: 23,
        coverImageUrl: "https://picsum.photos/seed/post1/800/400",
        isFeatured: true,
      },
      {
        id: 2,
        slug: "inlinesource-vs-api-source",
        title: "InlineSource vs API Source: When to Use Each",
        excerpt: "Choosing the right data source for your BasisCore page.",
        authorId: 3,
        authorName: "Amelia Singh",
        category: "Guide",
        tags: ["data-sources", "architecture"],
        publishedAt: "2026-04-10T14:30:00Z",
        readingTime: 12,
        viewCount: 892,
        likeCount: 67,
        commentCount: 18,
        coverImageUrl: "https://picsum.photos/seed/post2/800/400",
        isFeatured: true,
      },
      {
        id: 3,
        slug: "mocking-apis-for-faster-iteration",
        title: "Mocking APIs for Faster Iteration",
        excerpt: "How to build UI without waiting for the backend team.",
        authorId: 1,
        authorName: "Sarah Connor",
        category: "Workflow",
        tags: ["testing", "development", "productivity"],
        publishedAt: "2026-04-05T09:15:00Z",
        readingTime: 6,
        viewCount: 654,
        likeCount: 41,
        commentCount: 12,
        coverImageUrl: "https://picsum.photos/seed/post3/800/400",
        isFeatured: false,
      },
      {
        id: 4,
        slug: "rtl-ui-best-practices",
        title: "RTL UI Best Practices in 2026",
        excerpt:
          "Common pitfalls and how to handle bidirectional text properly.",
        authorId: 5,
        authorName: "Fatima Al-Qasimi",
        category: "Design",
        tags: ["rtl", "accessibility", "i18n"],
        publishedAt: "2026-03-28T11:45:00Z",
        readingTime: 10,
        viewCount: 2103,
        likeCount: 156,
        commentCount: 47,
        coverImageUrl: "https://picsum.photos/seed/post4/800/400",
        isFeatured: true,
      },
      {
        id: 5,
        slug: "declarative-vs-imperative",
        title: "Declarative vs Imperative: A Mental Model",
        excerpt: "Why 'what' beats 'how' in modern web development.",
        authorId: 8,
        authorName: "Priya Menon",
        category: "Concepts",
        tags: ["paradigm", "best-practices"],
        publishedAt: "2026-03-20T08:00:00Z",
        readingTime: 15,
        viewCount: 1876,
        likeCount: 134,
        commentCount: 38,
        coverImageUrl: "https://picsum.photos/seed/post5/800/400",
        isFeatured: false,
      },
      {
        id: 6,
        slug: "service-workers-deep-dive",
        title: "Service Workers: A Deep Dive",
        excerpt: "Everything you need to know about offline-first web apps.",
        authorId: 6,
        authorName: "Lucas Oliveira",
        category: "Deep Dive",
        tags: ["service-worker", "offline", "pwa"],
        publishedAt: "2026-03-12T16:20:00Z",
        readingTime: 22,
        viewCount: 3421,
        likeCount: 289,
        commentCount: 71,
        coverImageUrl: "https://picsum.photos/seed/post6/800/400",
        isFeatured: true,
      },
      {
        id: 7,
        slug: "building-a-design-system",
        title: "Building a Design System from Scratch",
        excerpt: "Lessons learned from rolling out a company-wide system.",
        authorId: 5,
        authorName: "Fatima Al-Qasimi",
        category: "Design",
        tags: ["design-system", "tokens", "css"],
        publishedAt: "2026-03-05T12:10:00Z",
        readingTime: 14,
        viewCount: 1456,
        likeCount: 98,
        commentCount: 26,
        coverImageUrl: "https://picsum.photos/seed/post7/800/400",
        isFeatured: false,
      },
      {
        id: 8,
        slug: "tsyringe-and-ioc-in-typescript",
        title: "tsyringe and IoC in TypeScript",
        excerpt: "How dependency injection improves testability and design.",
        authorId: 6,
        authorName: "Lucas Oliveira",
        category: "Deep Dive",
        tags: ["ioc", "typescript", "di", "tsyringe"],
        publishedAt: "2026-02-25T15:00:00Z",
        readingTime: 18,
        viewCount: 987,
        likeCount: 72,
        commentCount: 19,
        coverImageUrl: "https://picsum.photos/seed/post8/800/400",
        isFeatured: false,
      },
    ],

    /* --- categories ------------------------------------------------------ */
    categories: [
      {
        id: 1,
        name: "Laptops",
        slug: "laptops",
        productCount: 24,
        parentId: null,
        icon: "💻",
      },
      {
        id: 2,
        name: "Phones",
        slug: "phones",
        productCount: 38,
        parentId: null,
        icon: "📱",
      },
      {
        id: 3,
        name: "Tablets",
        slug: "tablets",
        productCount: 12,
        parentId: null,
        icon: "📱",
      },
      {
        id: 4,
        name: "Audio",
        slug: "audio",
        productCount: 47,
        parentId: null,
        icon: "🎧",
      },
      {
        id: 5,
        name: "Wearables",
        slug: "wearables",
        productCount: 19,
        parentId: null,
        icon: "⌚",
      },
      {
        id: 6,
        name: "Cameras",
        slug: "cameras",
        productCount: 16,
        parentId: null,
        icon: "📷",
      },
      {
        id: 7,
        name: "Gaming",
        slug: "gaming",
        productCount: 31,
        parentId: null,
        icon: "🎮",
      },
      {
        id: 8,
        name: "Accessories",
        slug: "accessories",
        productCount: 89,
        parentId: null,
        icon: "🔌",
      },
      {
        id: 9,
        name: "Monitors",
        slug: "monitors",
        productCount: 22,
        parentId: null,
        icon: "🖥️",
      },
      {
        id: 10,
        name: "E-Readers",
        slug: "e-readers",
        productCount: 8,
        parentId: null,
        icon: "📖",
      },
      {
        id: 11,
        name: "Drones",
        slug: "drones",
        productCount: 14,
        parentId: null,
        icon: "🚁",
      },
    ],

    /* --- countries ------------------------------------------------------- */
    countries: [
      {
        code: "US",
        name: "United States",
        capital: "Washington, D.C.",
        currency: "USD",
        region: "Americas",
        population: 333000000,
      },
      {
        code: "GB",
        name: "United Kingdom",
        capital: "London",
        currency: "GBP",
        region: "Europe",
        population: 67000000,
      },
      {
        code: "JP",
        name: "Japan",
        capital: "Tokyo",
        currency: "JPY",
        region: "Asia",
        population: 125000000,
      },
      {
        code: "DE",
        name: "Germany",
        capital: "Berlin",
        currency: "EUR",
        region: "Europe",
        population: 83000000,
      },
      {
        code: "FR",
        name: "France",
        capital: "Paris",
        currency: "EUR",
        region: "Europe",
        population: 68000000,
      },
      {
        code: "BR",
        name: "Brazil",
        capital: "Brasília",
        currency: "BRL",
        region: "Americas",
        population: 215000000,
      },
      {
        code: "IN",
        name: "India",
        capital: "New Delhi",
        currency: "INR",
        region: "Asia",
        population: 1428000000,
      },
      {
        code: "AE",
        name: "United Arab Emirates",
        capital: "Abu Dhabi",
        currency: "AED",
        region: "Asia",
        population: 9890000,
      },
      {
        code: "SE",
        name: "Sweden",
        capital: "Stockholm",
        currency: "SEK",
        region: "Europe",
        population: 10500000,
      },
      {
        code: "IT",
        name: "Italy",
        capital: "Rome",
        currency: "EUR",
        region: "Europe",
        population: 58940000,
      },
      {
        code: "CA",
        name: "Canada",
        capital: "Ottawa",
        currency: "CAD",
        region: "Americas",
        population: 39000000,
      },
      {
        code: "AU",
        name: "Australia",
        capital: "Canberra",
        currency: "AUD",
        region: "Oceania",
        population: 26000000,
      },
    ],

    /* --- tasks: kanban-style --------------------------------------------- */
    tasks: [
      {
        id: 1,
        title: "Design new landing page hero",
        description: "High-impact hero for the spring campaign.",
        priority: "high",
        status: "in-progress",
        assigneeId: 5,
        assigneeName: "Fatima Al-Qasimi",
        dueDate: "2026-05-05",
        tags: ["design", "marketing"],
        createdAt: "2026-04-20T10:00:00Z",
      },
      {
        id: 2,
        title: "Migrate auth to OAuth 2.1",
        description: "Replace legacy session auth with OAuth 2.1 + PKCE.",
        priority: "high",
        status: "todo",
        assigneeId: 1,
        assigneeName: "Sarah Connor",
        dueDate: "2026-05-15",
        tags: ["security", "backend"],
        createdAt: "2026-04-22T08:30:00Z",
      },
      {
        id: 3,
        title: "Q2 sales report draft",
        description: "Pull data, write narrative, send for review by Friday.",
        priority: "medium",
        status: "in-progress",
        assigneeId: 4,
        assigneeName: "Marcus Brennan",
        dueDate: "2026-05-02",
        tags: ["sales", "reporting"],
        createdAt: "2026-04-25T14:15:00Z",
      },
      {
        id: 4,
        title: "Refactor product detail page",
        description: "Break down monolithic component, add tests.",
        priority: "medium",
        status: "todo",
        assigneeId: 6,
        assigneeName: "Lucas Oliveira",
        dueDate: "2026-05-12",
        tags: ["refactor", "frontend"],
        createdAt: "2026-04-26T11:45:00Z",
      },
      {
        id: 5,
        title: "Localize app to Italian",
        description: "Add it-IT translations, adjust date/number formats.",
        priority: "low",
        status: "in-review",
        assigneeId: 8,
        assigneeName: "Priya Menon",
        dueDate: "2026-05-20",
        tags: ["i18n", "content"],
        createdAt: "2026-04-23T09:00:00Z",
      },
      {
        id: 6,
        title: "Set up CDN for static assets",
        description: "Move images and JS bundles behind CloudFront.",
        priority: "medium",
        status: "done",
        assigneeId: 7,
        assigneeName: "Nora Bergström",
        dueDate: "2026-04-25",
        tags: ["infra", "performance"],
        createdAt: "2026-04-15T13:20:00Z",
      },
      {
        id: 7,
        title: "Customer interview: Acme Corp",
        description: "30-min discovery call about onboarding pain points.",
        priority: "high",
        status: "done",
        assigneeId: 2,
        assigneeName: "Kenji Watanabe",
        dueDate: "2026-04-28",
        tags: ["research", "customer"],
        createdAt: "2026-04-24T07:50:00Z",
      },
      {
        id: 8,
        title: "Update privacy policy",
        description: "Reflect new data retention rules per EU directive.",
        priority: "high",
        status: "in-review",
        assigneeId: 3,
        assigneeName: "Amelia Singh",
        dueDate: "2026-05-08",
        tags: ["legal", "compliance"],
        createdAt: "2026-04-26T16:30:00Z",
      },
      {
        id: 9,
        title: "Investigate flaky checkout test",
        description: "Test fails ~10% of CI runs. Reproduce locally.",
        priority: "medium",
        status: "todo",
        assigneeId: 6,
        assigneeName: "Lucas Oliveira",
        dueDate: "2026-05-04",
        tags: ["bug", "testing"],
        createdAt: "2026-04-28T10:10:00Z",
      },
      {
        id: 10,
        title: "Onboard new hire (May)",
        description: "Prep accounts, schedule intro 1:1s, share runbook.",
        priority: "low",
        status: "todo",
        assigneeId: 7,
        assigneeName: "Nora Bergström",
        dueDate: "2026-05-10",
        tags: ["hr", "onboarding"],
        createdAt: "2026-04-27T15:00:00Z",
      },
    ],
    /* --- summerFruits ------------------------------------------------------- */
    summerFruits: [
      {
        code: "WM",
        name: "Watermelon",
        icon: "🍉",
        color: "Green / Red",
        taste: "Sweet & Refreshing",
        origin: "Africa",
        season: "Summer",
        calories_per_100g: 30,
        water_content_percent: 91,
        vitamins: ["Vitamin C", "Vitamin A"],
        minerals: ["Potassium", "Magnesium"],
        average_weight_kg: 9,
        is_seedless_common: true,
      },
      {
        code: "MN",
        name: "Mango",
        icon: "🥭",
        color: "Yellow / Orange",
        taste: "Sweet & Tropical",
        origin: "South Asia",
        season: "Late Spring - Summer",
        calories_per_100g: 60,
        water_content_percent: 83,
        vitamins: ["Vitamin C", "Vitamin A", "Vitamin E"],
        minerals: ["Potassium", "Copper"],
        average_weight_kg: 0.3,
        is_seedless_common: false,
      },
      {
        code: "PC",
        name: "Peach",
        icon: "🍑",
        color: "Orange / Pink",
        taste: "Sweet & Juicy",
        origin: "China",
        season: "Summer",
        calories_per_100g: 39,
        water_content_percent: 89,
        vitamins: ["Vitamin C", "Vitamin A"],
        minerals: ["Potassium"],
        average_weight_kg: 0.15,
        is_seedless_common: false,
      },
      {
        code: "PN",
        name: "Pineapple",
        icon: "🍍",
        color: "Yellow",
        taste: "Sweet & Tangy",
        origin: "South America",
        season: "Summer",
        calories_per_100g: 50,
        water_content_percent: 86,
        vitamins: ["Vitamin C", "Vitamin B6"],
        minerals: ["Manganese"],
        average_weight_kg: 1.5,
        is_seedless_common: true,
      },
      {
        code: "ST",
        name: "Strawberry",
        icon: "🍓",
        color: "Red",
        taste: "Sweet & Slightly Tart",
        origin: "Europe",
        season: "Spring - Summer",
        calories_per_100g: 32,
        water_content_percent: 91,
        vitamins: ["Vitamin C", "Folate"],
        minerals: ["Manganese"],
        average_weight_kg: 0.012,
        is_seedless_common: true,
      },
      {
        code: "PL",
        name: "Plum",
        icon: "🍑",
        color: "Purple / Red",
        taste: "Sweet & Tart",
        origin: "China",
        season: "Summer",
        calories_per_100g: 46,
        water_content_percent: 87,
        vitamins: ["Vitamin C", "Vitamin K"],
        minerals: ["Potassium"],
        average_weight_kg: 0.07,
        is_seedless_common: false,
      },
      {
        code: "GR",
        name: "Grapes",
        icon: "🍇",
        color: "Green / Purple",
        taste: "Sweet",
        origin: "Middle East",
        season: "Summer - Early Autumn",
        calories_per_100g: 69,
        water_content_percent: 81,
        vitamins: ["Vitamin C", "Vitamin K"],
        minerals: ["Potassium"],
        average_weight_kg: 0.005,
        is_seedless_common: true,
      },
    ],
    /* --- soldClothes --------------------------------------------- */

    soldClothes: [
      {
        id: 1001,
        name: "Men Classic T-Shirt",
        category: "Tops",
        brand: "Zara",
        size: "L",
        color: "Black",
        material: "Cotton",
        price: 19.99,
        discount_percent: 10,
        final_price: 17.99,
        sold_date: "2026-05-01",
        customer_id: 501,
        in_stock_after_sale: 32,
        rating: 4.5,
        is_returned: false,
      },
      {
        id: 1002,
        name: "Women Summer Dress",
        category: "Dresses",
        brand: "H&M",
        size: "M",
        color: "Yellow",
        material: "Linen",
        price: 49.99,
        discount_percent: 15,
        final_price: 42.49,
        sold_date: "2026-05-03",
        customer_id: 502,
        in_stock_after_sale: 12,
        rating: 4.8,
        is_returned: false,
      },
    ],
    /* --- hospitalDoctors --------------------------------------------- */
    hospitalDoctors: [
      {
        id: 301,
        full_name: "Dr. Sarah Johnson",
        specialization: "Cardiology",
        experience_years: 12,
        degree: "MD",
        phone: "+1-202-555-0147",
        email: "s.johnson@hospital.com",
        working_hours: "09:00 - 17:00",
        is_available: "yes",
        rating: 4.9,
        patients_per_day: 25,
        languages: "english",
      },
      {
        id: 302,
        full_name: "Dr. Ali Rezaei",
        specialization: "Neurology",
        experience_years: 8,
        degree: "MD, PhD",
        phone: "+98-912-123-4567",
        email: "a.rezaei@hospital.com",
        working_hours: "10:00 - 16:00",
        is_available: "no",
        rating: 4.7,
        patients_per_day: 18,
        languages: "Persian",
      },
    ],
    /* --- restaurantMenu --------------------------------------------- */
    restaurantMenu: [
      {
        id: 201,
        name: "Cheeseburger",
        category: "Fast Food",
        price: 8.99,
        ingredients: ["Beef", "Cheese", "Lettuce", "Tomato"],
        calories: 550,
        is_vegetarian: "no",
        is_available: "yes",
        preparation_time_min: 15,
        rating: 4.6,
      },
      {
        id: 202,
        name: "Margherita Pizza",
        category: "Italian",
        price: 11.99,
        ingredients: ["Tomato", "Mozzarella", "Basil"],
        calories: 700,
        is_vegetarian: "yes",
        is_available: "yes",
        preparation_time_min: 20,
        rating: 4.8,
      },
    ],
    /* --- movies --------------------------------------------- */
    movies: [
      {
        ImageUrl: "https://picsum.photos/seed/post1/800/400",
        id: 401,
        title: "Inception",
        genre: "Sci-Fi",
        director: "Christopher Nolan",
        release_year: 2010,
        duration_min: 148,
        rating: 8.8,
        language: "English",
        country: "USA",
        is_streaming_available: true,
      },
      {
        ImageUrl: "https://picsum.photos/seed/post1/800/400",
        id: 402,
        title: "Parasite",
        genre: "Thriller",
        director: "Bong Joon-ho",
        release_year: 2019,
        duration_min: 132,
        rating: 8.6,
        language: "Korean",
        country: "South Korea",
        is_streaming_available: true,
      },
      {
        id: 403,
        title: "Interstellar",
        genre: "Sci-Fi",
        director: "Christopher Nolan",
        release_year: 2014,
        duration_min: 169,
        rating: 8.6,
        language: "English",
        country: "USA",
        is_streaming_available: true,
      },
      {
        id: 404,
        title: "The Godfather",
        genre: "Crime",
        director: "Francis Ford Coppola",
        release_year: 1972,
        duration_min: 175,
        rating: 9.2,
        language: "English",
        country: "USA",
        is_streaming_available: false,
      },
      {
        id: 405,
        title: "Spirited Away",
        genre: "Animation",
        director: "Hayao Miyazaki",
        release_year: 2001,
        duration_min: 125,
        rating: 8.6,
        language: "Japanese",
        country: "Japan",
        is_streaming_available: true,
      },
      {
        id: 406,
        title: "The Dark Knight",
        genre: "Action",
        director: "Christopher Nolan",
        release_year: 2008,
        duration_min: 152,
        rating: 9.0,
        language: "English",
        country: "USA",
        is_streaming_available: true,
      },
      {
        id: 407,
        title: "Amélie",
        genre: "Romance",
        director: "Jean-Pierre Jeunet",
        release_year: 2001,
        duration_min: 122,
        rating: 8.3,
        language: "French",
        country: "France",
        is_streaming_available: false,
      },
      {
        id: 408,
        title: "Joker",
        genre: "Drama",
        director: "Todd Phillips",
        release_year: 2019,
        duration_min: 122,
        rating: 8.4,
        language: "English",
        country: "USA",
        is_streaming_available: true,
      },
      {
        id: 409,
        title: "The Matrix",
        genre: "Sci-Fi",
        director: "The Wachowskis",
        release_year: 1999,
        duration_min: 136,
        rating: 8.7,
        language: "English",
        country: "USA",
        is_streaming_available: true,
      },
    ],
    /* --- rideHistory --------------------------------------------- */
    rideHistory: [
      {
        ride_id: 9001,
        user_id: 701,
        driver_name: "Carlos Martinez",
        car_model: "Toyota Prius",
        start_location: "Downtown",
        end_location: "Airport",
        distance_km: 12.5,
        duration_min: 25,
        fare: 18.75,
        payment_method: "Credit Card",
        ride_date: "2026-05-02",
        rating: 4.7,
      },
      {
        ride_id: 9002,
        user_id: 702,
        driver_name: "Mohammad Ahmadi",
        car_model: "Peugeot 206",
        start_location: "Mall",
        end_location: "Home",
        distance_km: 5.2,
        duration_min: 12,
        fare: 6.4,
        payment_method: "Cash",
        ride_date: "2026-05-04",
        rating: 4.5,
      },
    ],
    /* --- courses --------------------------------------------- */
    courses: [
      {
        id: 801,
        title: "JavaScript Advanced",
        instructor: "John Doe",
        level: "Advanced",
        duration_hours: 25,
        price: 99.99,
        students_count: 1200,
        rating: 4.8,
        language: "English",
        is_certificate_available: true,
      },
      {
        id: 802,
        title: "UI/UX Design Basics",
        instructor: "Jane Smith",
        level: "Beginner",
        duration_hours: 15,
        price: 59.99,
        students_count: 850,
        rating: 4.6,
        language: "English",
        is_certificate_available: true,
      },
    ],
    /* --- hotelBookings --------------------------------------------- */
    hotelBookings: [
      {
        booking_id: 5001,
        guest_name: "Emma Wilson",
        hotel_name: "Grand Palace Hotel",
        room_type: "Deluxe",
        check_in: "2026-06-10",
        check_out: "2026-06-15",
        nights: 5,
        price_per_night: 120,
        total_price: 600,
        payment_status: "Paid",
        booking_status: "Confirmed",
        adults: 2,
        children: 1,
      },
      {
        booking_id: 5002,
        guest_name: "Ali Karimi",
        hotel_name: "Sea View Resort",
        room_type: "Suite",
        check_in: "2026-07-01",
        check_out: "2026-07-04",
        nights: 3,
        price_per_night: 200,
        total_price: 600,
        payment_status: "Pending",
        booking_status: "Reserved",
        adults: 2,
        children: 0,
      },
    ],
    /* --- warehouseInventory --------------------------------------------- */
    warehouseInventory: [
      {
        product_id: 3001,
        name: "Wireless Mouse",
        category: "Electronics",
        supplier: "Logitech",
        quantity_in_stock: 150,
        reorder_level: 30,
        unit_price: 15.5,
        warehouse_location: "A1-B2",
        last_restock_date: "2026-04-20",
        expiry_date: null,
        is_active: true,
      },
      {
        product_id: 3002,
        name: "Organic Honey",
        category: "Food",
        supplier: "NatureFarm",
        quantity_in_stock: 60,
        reorder_level: 20,
        unit_price: 8.75,
        warehouse_location: "C3-D1",
        last_restock_date: "2026-04-10",
        expiry_date: "2027-01-01",
        is_active: true,
      },
    ],
    /* --- musicLibrary --------------------------------------------- */
    musicLibrary: [
      {
        track_id: 7001,
        title: "Blinding Lights",
        artist: "The Weeknd",
        album: "After Hours",
        genre: "Pop",
        duration_sec: 200,
        release_year: 2020,
        is_favorite: true,
        play_count: 150,
        rating: 4.9,
      },
      {
        track_id: 7002,
        title: "Shape of You",
        artist: "Ed Sheeran",
        album: "Divide",
        genre: "Pop",
        duration_sec: 233,
        release_year: 2017,
        is_favorite: false,
        play_count: 220,
        rating: 4.8,
      },
    ],
    /* --- jobApplicants --------------------------------------------- */
    jobApplicants: [
      {
        applicant_id: 2101,
        full_name: "Michael Scott",
        position: "Sales Manager",
        experience_years: 10,
        education: "MBA",
        email: "m.scott@email.com",
        phone: "+1-555-1234",
        skills: ["Negotiation", "Leadership", "CRM"],
        application_date: "2026-04-28",
        status: "Interview Scheduled",
      },
      {
        applicant_id: 2102,
        full_name: "Neda Rahimi",
        position: "Frontend Developer",
        experience_years: 4,
        education: "BSc Computer Science",
        email: "n.rahimi@email.com",
        phone: "+98-912-000000",
        skills: ["HTML", "CSS", "JavaScript", "React"],
        application_date: "2026-05-02",
        status: "Under Review",
      },
    ],
    /* --- payments --------------------------------------------- */
    payments: [
      {
        id: 601,
        user_name: "John Smith",
        amount: 120,
        method: "Credit Card",
        status: "success",
        currency: "USD",
        payment_date: "2026-05-01",
      },
      {
        id: 602,
        user_name: "jasmin dana",
        amount: 75,
        method: "PayPal",
        status: "failed",
        currency: "USD",
        payment_date: "2026-05-03",
      },
    ],
    /* --- dfms critical sessions ------------------------------------------ */
    dfmsCriticalSessions: [
      {
        id: "101",
        title: "MK Arrival",
        severity: "critical",
      },
      {
        id: "102",
        title: "Transit Queue",
        severity: "normal",
      },
      {
        id: "103",
        title: "Hotel Overflow",
        severity: "critical",
      },
    ],
    /* --- girl names ------------------------------------------------------- */
    girlNames: [
      {
        id: "g1",
        title: "Ava",
        meaning: "Voice, sound",
        origin: "Persian",
        popularity: "popular",
      },
      {
        id: "g2",
        title: "Liana",
        meaning: "To bind, graceful",
        origin: "Latin",
        popularity: "modern",
      },
      {
        id: "g3",
        title: "Sara",
        meaning: "Princess",
        origin: "Hebrew",
        popularity: "classic",
      },
      {
        id: "g4",
        title: "Mina",
        meaning: "Enamel, blue glass",
        origin: "Persian",
        popularity: "classic",
      },
      {
        id: "g5",
        title: "Raha",
        meaning: "Free, released",
        origin: "Persian",
        popularity: "modern",
      },
      {
        id: "g6",
        title: "Nika",
        meaning: "Good, beautiful",
        origin: "Persian",
        popularity: "popular",
      },
      {
        id: "g7",
        title: "Diana",
        meaning: "Divine",
        origin: "Latin",
        popularity: "popular",
      },
      {
        id: "g8",
        title: "Elina",
        meaning: "Bright, shining",
        origin: "Greek",
        popularity: "modern",
      },
    ],
    /* --- sports --------------------------------------------- */
    sports: [
      {
        sportId: 1,
        sportTitle: "Stretching Sports",
        parentSportId: null,
        icon: "🧘",
        difficulty: "easy",
        caloriesPerHour: 180,
        indoor: true,
        olympic: false,
        popularCountry: "India",
      },
      {
        sportId: 2,
        sportTitle: "Yoga",
        parentSportId: 1,
        icon: "🪷",
        difficulty: "easy",
        caloriesPerHour: 220,
        indoor: true,
        olympic: false,
        popularCountry: "India",
      },
      {
        sportId: 3,
        sportTitle: "Pilates",
        parentSportId: 1,
        icon: "🤸",
        difficulty: "medium",
        caloriesPerHour: 250,
        indoor: true,
        olympic: false,
        popularCountry: "USA",
      },
      {
        sportId: 4,
        sportTitle: "Tai Chi",
        parentSportId: 1,
        icon: "☯️",
        difficulty: "easy",
        caloriesPerHour: 200,
        indoor: true,
        olympic: false,
        popularCountry: "China",
      },
      {
        sportId: 5,
        sportTitle: "Gymnastics Stretch",
        parentSportId: 1,
        icon: "🤸‍♀️",
        difficulty: "hard",
        caloriesPerHour: 350,
        indoor: true,
        olympic: true,
        popularCountry: "Russia",
      },
      {
        sportId: 6,
        sportTitle: "Ball Sports",
        parentSportId: null,
        icon: "⚽",
        difficulty: "medium",
        caloriesPerHour: 400,
        indoor: false,
        olympic: true,
        popularCountry: "Brazil",
      },
      {
        sportId: 7,
        sportTitle: "Football",
        parentSportId: 6,
        icon: "⚽",
        difficulty: "hard",
        caloriesPerHour: 700,
        indoor: false,
        olympic: false,
        popularCountry: "Brazil",
      },
      {
        sportId: 8,
        sportTitle: "Basketball",
        parentSportId: 6,
        icon: "🏀",
        difficulty: "hard",
        caloriesPerHour: 650,
        indoor: true,
        olympic: true,
        popularCountry: "USA",
      },
      {
        sportId: 9,
        sportTitle: "Volleyball",
        parentSportId: 6,
        icon: "🏐",
        difficulty: "medium",
        caloriesPerHour: 500,
        indoor: true,
        olympic: true,
        popularCountry: "Japan",
      },
      {
        sportId: 10,
        sportTitle: "Tennis",
        parentSportId: 6,
        icon: "🎾",
        difficulty: "medium",
        caloriesPerHour: 550,
        indoor: false,
        olympic: true,
        popularCountry: "UK",
      },
      {
        sportId: 11,
        sportTitle: "Table Tennis",
        parentSportId: 6,
        icon: "🏓",
        difficulty: "medium",
        caloriesPerHour: 320,
        indoor: true,
        olympic: true,
        popularCountry: "China",
      },
      {
        sportId: 12,
        sportTitle: "Baseball",
        parentSportId: 6,
        icon: "⚾",
        difficulty: "medium",
        caloriesPerHour: 420,
        indoor: false,
        olympic: false,
        popularCountry: "USA",
      },
      {
        sportId: 13,
        sportTitle: "Handball",
        parentSportId: 6,
        icon: "🤾",
        difficulty: "hard",
        caloriesPerHour: 600,
        indoor: true,
        olympic: true,
        popularCountry: "Germany",
      },
      {
        sportId: 14,
        sportTitle: "Rugby",
        parentSportId: 6,
        icon: "🏉",
        difficulty: "hard",
        caloriesPerHour: 720,
        indoor: false,
        olympic: false,
        popularCountry: "New Zealand",
      },
      {
        sportId: 15,
        sportTitle: "Endurance Sports",
        parentSportId: null,
        icon: "🏃",
        difficulty: "hard",
        caloriesPerHour: 500,
        indoor: false,
        olympic: true,
        popularCountry: "Kenya",
      },
      {
        sportId: 16,
        sportTitle: "Running",
        parentSportId: 15,
        icon: "🏃‍♂️",
        difficulty: "medium",
        caloriesPerHour: 650,
        indoor: false,
        olympic: true,
        popularCountry: "Kenya",
      },
      {
        sportId: 17,
        sportTitle: "Marathon",
        parentSportId: 15,
        icon: "🥇",
        difficulty: "hard",
        caloriesPerHour: 900,
        indoor: false,
        olympic: true,
        popularCountry: "Ethiopia",
      },
      {
        sportId: 18,
        sportTitle: "Cycling",
        parentSportId: 15,
        icon: "🚴",
        difficulty: "medium",
        caloriesPerHour: 580,
        indoor: false,
        olympic: true,
        popularCountry: "France",
      },
      {
        sportId: 19,
        sportTitle: "Swimming",
        parentSportId: 15,
        icon: "🏊",
        difficulty: "hard",
        caloriesPerHour: 700,
        indoor: true,
        olympic: true,
        popularCountry: "Australia",
      },
      {
        sportId: 20,
        sportTitle: "Triathlon",
        parentSportId: 15,
        icon: "🏅",
        difficulty: "hard",
        caloriesPerHour: 1000,
        indoor: false,
        olympic: true,
        popularCountry: "Canada",
      },
      {
        sportId: 21,
        sportTitle: "Combat Sports",
        parentSportId: null,
        icon: "🥋",
        difficulty: "hard",
        caloriesPerHour: 600,
        indoor: true,
        olympic: true,
        popularCountry: "Japan",
      },
      {
        sportId: 22,
        sportTitle: "Boxing",
        parentSportId: 21,
        icon: "🥊",
        difficulty: "hard",
        caloriesPerHour: 800,
        indoor: true,
        olympic: true,
        popularCountry: "USA",
      },
      {
        sportId: 23,
        sportTitle: "Karate",
        parentSportId: 21,
        icon: "🥋",
        difficulty: "medium",
        caloriesPerHour: 650,
        indoor: true,
        olympic: true,
        popularCountry: "Japan",
      },
      {
        sportId: 24,
        sportTitle: "Judo",
        parentSportId: 21,
        icon: "🤼",
        difficulty: "hard",
        caloriesPerHour: 720,
        indoor: true,
        olympic: true,
        popularCountry: "Japan",
      },
      {
        sportId: 25,
        sportTitle: "Taekwondo",
        parentSportId: 21,
        icon: "🦵",
        difficulty: "hard",
        caloriesPerHour: 700,
        indoor: true,
        olympic: true,
        popularCountry: "South Korea",
      },
      {
        sportId: 26,
        sportTitle: "Water Sports",
        parentSportId: null,
        icon: "🌊",
        difficulty: "medium",
        caloriesPerHour: 500,
        indoor: false,
        olympic: true,
        popularCountry: "Australia",
      },
      {
        sportId: 27,
        sportTitle: "Surfing",
        parentSportId: 26,
        icon: "🏄",
        difficulty: "hard",
        caloriesPerHour: 500,
        indoor: false,
        olympic: true,
        popularCountry: "Australia",
      },
      {
        sportId: 28,
        sportTitle: "Diving",
        parentSportId: 26,
        icon: "🤿",
        difficulty: "hard",
        caloriesPerHour: 450,
        indoor: true,
        olympic: true,
        popularCountry: "China",
      },
      {
        sportId: 29,
        sportTitle: "Rowing",
        parentSportId: 26,
        icon: "🚣",
        difficulty: "hard",
        caloriesPerHour: 620,
        indoor: false,
        olympic: true,
        popularCountry: "UK",
      },
      {
        sportId: 30,
        sportTitle: "Sailing",
        parentSportId: 26,
        icon: "⛵",
        difficulty: "medium",
        caloriesPerHour: 300,
        indoor: false,
        olympic: true,
        popularCountry: "Greece",
      },
      {
        sportId: 31,
        sportTitle: "Winter Sports",
        parentSportId: null,
        icon: "❄️",
        difficulty: "hard",
        caloriesPerHour: 550,
        indoor: false,
        olympic: true,
        popularCountry: "Norway",
      },
      {
        sportId: 32,
        sportTitle: "Skiing",
        parentSportId: 31,
        icon: "🎿",
        difficulty: "hard",
        caloriesPerHour: 650,
        indoor: false,
        olympic: true,
        popularCountry: "Switzerland",
      },
      {
        sportId: 33,
        sportTitle: "Snowboarding",
        parentSportId: 31,
        icon: "🏂",
        difficulty: "hard",
        caloriesPerHour: 620,
        indoor: false,
        olympic: true,
        popularCountry: "Canada",
      },
      {
        sportId: 34,
        sportTitle: "Ice Hockey",
        parentSportId: 31,
        icon: "🏒",
        difficulty: "hard",
        caloriesPerHour: 700,
        indoor: true,
        olympic: true,
        popularCountry: "Canada",
      },
      {
        sportId: 35,
        sportTitle: "Fitness Sports",
        parentSportId: null,
        icon: "🏋️",
        difficulty: "medium",
        caloriesPerHour: 450,
        indoor: true,
        olympic: false,
        popularCountry: "USA",
      },
      {
        sportId: 36,
        sportTitle: "Bodybuilding",
        parentSportId: 35,
        icon: "💪",
        difficulty: "hard",
        caloriesPerHour: 500,
        indoor: true,
        olympic: false,
        popularCountry: "USA",
      },
      {
        sportId: 37,
        sportTitle: "CrossFit",
        parentSportId: 35,
        icon: "🏋️‍♂️",
        difficulty: "hard",
        caloriesPerHour: 750,
        indoor: true,
        olympic: false,
        popularCountry: "USA",
      },
      {
        sportId: 38,
        sportTitle: "Aerobics",
        parentSportId: 35,
        icon: "🎶",
        difficulty: "medium",
        caloriesPerHour: 430,
        indoor: true,
        olympic: false,
        popularCountry: "Brazil",
      },
      {
        sportId: 39,
        sportTitle: "Dance Fitness",
        parentSportId: 35,
        icon: "💃",
        difficulty: "medium",
        caloriesPerHour: 480,
        indoor: true,
        olympic: false,
        popularCountry: "Spain",
      },
      {
        sportId: 40,
        sportTitle: "Jump Rope",
        parentSportId: 35,
        icon: "🪢",
        difficulty: "medium",
        caloriesPerHour: 700,
        indoor: true,
        olympic: false,
        popularCountry: "USA",
      },
    ],
    // --- weather  ____________________________________________


    /* --- schemaUploader: file-bearing schema demos ------------------------ */
    schemas: {
      customerProfile: {
        schemaId: 2101,
        schemaVersion: 1,
        lid: 1,
        direction: "rtl",
        sections: [{ sectionId: 1, title: "پروفایل مشتری", gridColumns: 2 }],
        questions: [
          {
            prpId: 21011,
            typeId: 261,
            title: "نام مشتری",
            multi: false,
            sectionId: 1,
            colSpan: 1,
            parts: [{ part: 1, viewType: "text", caption: "نام مشتری", validations: { required: true } }],
          },
          {
            prpId: 21012,
            typeId: 262,
            title: "تصویر پروفایل",
            multi: false,
            sectionId: 1,
            colSpan: 1,
            parts: [{ part: 1, viewType: "upload", caption: "تصویر پروفایل", validations: { required: true } }],
          },
        ],
      },
      productCatalog: {
        schemaId: 2102,
        schemaVersion: 1,
        lid: 1,
        direction: "rtl",
        sections: [{ sectionId: 1, title: "ثبت محصول", gridColumns: 2 }],
        questions: [
          {
            prpId: 21021,
            typeId: 261,
            title: "نام محصول",
            multi: false,
            sectionId: 1,
            colSpan: 1,
            parts: [{ part: 1, viewType: "text", caption: "نام محصول", validations: { required: true } }],
          },
          {
            prpId: 21022,
            typeId: 262,
            title: "تصویر محصول",
            multi: false,
            sectionId: 1,
            colSpan: 1,
            parts: [{ part: 1, viewType: "upload", caption: "تصویر محصول", validations: { required: true } }],
          },
        ],
      },
      kycDocuments: {
        schemaId: 2103,
        schemaVersion: 1,
        lid: 1,
        direction: "ltr",
        sections: [{ sectionId: 1, title: "KYC Documents", gridColumns: 2 }],
        questions: [
          {
            prpId: 21031,
            typeId: 261,
            title: "Legal name",
            multi: false,
            sectionId: 1,
            colSpan: 1,
            parts: [{ part: 1, viewType: "text", caption: "Legal name", validations: { required: true } }],
          },
          {
            prpId: 21032,
            typeId: 262,
            title: "Identity document",
            multi: false,
            sectionId: 1,
            colSpan: 1,
            parts: [{ part: 1, viewType: "upload", caption: "Identity document", validations: { required: true } }],
          },
        ],
      },
      jobApplication: {
        schemaId: 2104,
        schemaVersion: 1,
        lid: 1,
        direction: "rtl",
        sections: [{ sectionId: 1, title: "فرم استخدام", gridColumns: 2 }],
        questions: [
          {
            prpId: 21041,
            typeId: 261,
            title: "نام متقاضی",
            multi: false,
            sectionId: 1,
            colSpan: 1,
            parts: [{ part: 1, viewType: "text", caption: "نام متقاضی", validations: { required: true } }],
          },
          {
            prpId: 21042,
            typeId: 262,
            title: "رزومه",
            multi: false,
            sectionId: 1,
            colSpan: 1,
            parts: [{ part: 1, viewType: "upload", caption: "فایل رزومه", validations: { required: true } }],
          },
        ],
      },
    },
    weather: [
      {
        id: 1,
        city: "Mazandaran",
        temperature: 28,
        unit: "°C",
        date: "2026-05-31",
      },
      {
        id: 2,
        city: "Bandar Abbas",
        temperature: 35,
        unit: "°C",
        date: "2026-05-31",
      },
      {
        id: 3,
        city: "Mazandaran",
        temperature: 29,
        unit: "°C",
        date: "2026-06-01",
      },
      {
        id: 4,
        city: "Bandar Abbas",
        temperature: 36,
        unit: "°C",
        date: "2026-06-01",
      },
      {
        id: 5,
        city: "Mazandaran",
        temperature: 30,
        unit: "°C",
        date: "2026-06-02",
      },
      {
        id: 6,
        city: "Bandar Abbas",
        temperature: 37,
        unit: "°C",
        date: "2026-06-02",
      },
    ],
  };

  /* =========================================================================
   * PATTERN MATCHING
   * =======================================================================*/

  function compilePattern(pattern) {
    var keys = [];
    var escaped = pattern
      .replace(/\/$/, "")
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, function (_, k) {
        keys.push(k);
        return "([^/]+)";
      })
      .replace(/\*/g, ".*");
    return { regex: new RegExp("^" + escaped + "\\/?$"), keys: keys };
  }

  function matchRoute(route, method, pathname, search, body) {
    if (route.method && route.method.toUpperCase() !== method) return null;
    if (route.scenario && route.scenario !== STATE.activeScenario) return null;

    var compiled =
      route._compiled || (route._compiled = compilePattern(route.url));
    var m = pathname.match(compiled.regex);
    if (!m) return null;

    if (route.bodyMatch != null) {
      var bodyText = String(body || "");
      // For dbsource and other form-encoded posters, also test against the
      // decoded body text — so user regexes like /SELECT .+ FROM users/i
      // match natural SQL spaces instead of having to special-case `+`.
      var decodedBody = bodyText;
      if (
        bodyText &&
        (bodyText.indexOf("+") !== -1 || /%[0-9A-Fa-f]{2}/.test(bodyText))
      ) {
        try {
          var params = new URLSearchParams(bodyText);
          var parts = [];
          params.forEach(function (v, k) {
            parts.push(k + "=" + v);
          });
          decodedBody = parts.join("\n");
        } catch (_) {}
      }
      if (route.bodyMatch instanceof RegExp) {
        if (
          !route.bodyMatch.test(bodyText) &&
          !route.bodyMatch.test(decodedBody)
        )
          return null;
      } else {
        var needle = String(route.bodyMatch);
        if (
          bodyText.indexOf(needle) === -1 &&
          decodedBody.indexOf(needle) === -1
        )
          return null;
      }
    }

    var params = {};
    compiled.keys.forEach(function (k, i) {
      try {
        params[k] = decodeURIComponent(m[i + 1]);
      } catch (_) {
        params[k] = m[i + 1];
      }
    });
    var query = {};
    var qs = new URLSearchParams(search || "");
    qs.forEach(function (v, k) {
      query[k] = v;
    });

    return { params: params, query: query };
  }

  /* =========================================================================
   * FETCH PATCH
   * =======================================================================*/

  function patchedFetch(input, init) {
    init = init || {};
    if (!STATE.enabled || STATE.routes.length === 0) {
      return ORIGINAL_FETCH(input, init);
    }

    // Pull URL + method WITHOUT constructing a Request object.
    // (Avoids issues in non-browser test envs where Request requires absolute URLs.)
    var isReq = typeof Request !== "undefined" && input instanceof Request;
    var urlStr = isReq ? input.url : String(input);
    var method = (
      init.method ||
      (isReq ? input.method : "GET") ||
      "GET"
    ).toUpperCase();

    var url;
    try {
      url = new URL(
        urlStr,
        global.location ? global.location.href : "http://x.local",
      );
    } catch (_) {
      return ORIGINAL_FETCH(input, init);
    }

    return readBody(input, init, isReq).then(function (bodyText) {
      for (var i = 0; i < STATE.routes.length; i++) {
        var route = STATE.routes[i];
        var match = matchRoute(
          route,
          method,
          url.pathname,
          url.search,
          bodyText,
        );
        if (!match) continue;
        return runRoute(route, match, method, url, bodyText, input, init);
      }
      return ORIGINAL_FETCH(input, init);
    });
  }

  function readBody(input, init, isReq) {
    // 1) Body provided in init — handle the common types fetch() accepts.
    if (init && init.body != null) {
      var b = init.body;
      if (typeof b === "string") return Promise.resolve(b);
      // URLSearchParams (used by core="dbsource" form-encoded posts)
      if (
        typeof URLSearchParams !== "undefined" &&
        b instanceof URLSearchParams
      ) {
        return Promise.resolve(b.toString());
      }
      // FormData (multipart) — flatten string fields, drop files
      if (typeof FormData !== "undefined" && b instanceof FormData) {
        var fp = new URLSearchParams();
        b.forEach(function (v, k) {
          if (typeof v === "string") fp.append(k, v);
        });
        return Promise.resolve(fp.toString());
      }
      // Binary — not supported for matching
      if (
        (typeof Blob !== "undefined" && b instanceof Blob) ||
        (typeof ArrayBuffer !== "undefined" && b instanceof ArrayBuffer)
      ) {
        return Promise.resolve("");
      }
      // Plain object → JSON
      if (typeof b === "object") {
        try {
          return Promise.resolve(JSON.stringify(b));
        } catch (_) {}
      }
    }
    // 2) Request instance — clone and read text.
    if (isReq && input.method !== "GET" && input.method !== "HEAD") {
      try {
        return input
          .clone()
          .text()
          .catch(function () {
            return "";
          });
      } catch (_) {
        return Promise.resolve("");
      }
    }
    return Promise.resolve("");
  }

  function runRoute(
    route,
    match,
    method,
    url,
    bodyText,
    originalInput,
    originalInit,
  ) {
    var startedAt = Date.now();
    return delay(STATE.latencyMs).then(function () {
      // Random error injection
      if (
        STATE.errorRate > 0 &&
        !route.skipChaos &&
        Math.random() < STATE.errorRate
      ) {
        var errResp = makeJsonResponse(
          { error: "Simulated network error", mocked: true },
          500,
        );
        recordHit({
          url: url.pathname,
          method: method,
          status: 500,
          route: route.url,
          ms: Date.now() - startedAt,
        });
        return errResp;
      }

      var ctx = {
        params: match.params,
        query: match.query,
        body: bodyText,
        bodyJSON: tryParseJSON(bodyText),
        url: url,
        method: method,
        scenario: STATE.activeScenario,
        // Defer Request construction in case the handler wants it.
        get request() {
          try {
            return originalInput instanceof Request
              ? originalInput
              : new Request(url.toString(), originalInit);
          } catch (_) {
            return null;
          }
        },
      };

      var status = route.status || 200;
      var bodyOut;
      try {
        bodyOut =
          typeof route.response === "function"
            ? route.response(ctx)
            : route.response;
      } catch (e) {
        bodyOut = {
          error: "Mock handler threw",
          message: String((e && e.message) || e),
        };
        status = 500;
      }

      return Promise.resolve(bodyOut).then(function (resolved) {
        var resp = makeJsonResponse(resolved, status);
        recordHit({
          url: url.pathname,
          method: method,
          status: status,
          route: route.url,
          ms: Date.now() - startedAt,
        });
        return resp;
      });
    });
  }

  /* =========================================================================
   * HELPERS
   * =======================================================================*/

  function makeJsonResponse(body, status) {
    return new Response(JSON.stringify(body == null ? null : body), {
      status: status || 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Mocked-By": "BasisCore_Mock_1",
      },
    });
  }
  function delay(ms) {
    if (!ms || ms <= 0) return Promise.resolve();
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }
  function tryParseJSON(s) {
    if (!s) return null;
    // Try JSON first
    try {
      return JSON.parse(s);
    } catch (_) {}
    // Fall back to application/x-www-form-urlencoded (used by core="dbsource")
    if (s.indexOf("=") !== -1) {
      try {
        var params = new URLSearchParams(s);
        var obj = {};
        params.forEach(function (v, k) {
          obj[k] = v;
        });
        if (Object.keys(obj).length > 0) return obj;
      } catch (_) {}
    }
    return null;
  }
  function recordHit(entry) {
    entry.at = Date.now();
    STATE.log.unshift(entry);
    if (STATE.log.length > LOG_LIMIT) STATE.log.length = LOG_LIMIT;
    STATE.listeners.forEach(function (fn) {
      try {
        fn({ type: "hit", entry: entry });
      } catch (_) {}
    });
  }
  function deepClone(v) {
    return v == null || typeof v !== "object"
      ? v
      : JSON.parse(JSON.stringify(v));
  }

  /* =========================================================================
   * RESOURCE HELPER  —  spin up a full REST surface from a dataset
   * =======================================================================*/

  function resource(basePath, dataset, options) {
    options = options || {};
    var key = options.keyField || "id";
    var data = dataset.slice(); // local mutable copy
    var routes = [
      // GET list with optional filtering / pagination
      {
        url: basePath,
        method: "GET",
        response: function (ctx) {
          var q = ctx.query || {};
          var rows = data.slice();
          // Generic field-based filter: ?role=admin&isActive=true
          Object.keys(q).forEach(function (k) {
            if (
              k === "_page" ||
              k === "_limit" ||
              k === "_sort" ||
              k === "_order" ||
              k === "_q"
            )
              return;
            var val = q[k];
            rows = rows.filter(function (r) {
              return (
                r[k] != null &&
                String(r[k]).toLowerCase() === String(val).toLowerCase()
              );
            });
          });
          // Free-text search across string fields: ?_q=apple
          if (q._q) {
            var needle = String(q._q).toLowerCase();
            rows = rows.filter(function (r) {
              return Object.keys(r).some(function (k) {
                return (
                  typeof r[k] === "string" &&
                  r[k].toLowerCase().indexOf(needle) !== -1
                );
              });
            });
          }
          // Sort: ?_sort=price&_order=desc
          if (q._sort) {
            var dir = q._order === "desc" ? -1 : 1;
            rows.sort(function (a, b) {
              var av = a[q._sort],
                bv = b[q._sort];
              if (av < bv) return -1 * dir;
              if (av > bv) return 1 * dir;
              return 0;
            });
          }
          var total = rows.length;
          // Paginate: ?_page=2&_limit=5
          if (q._page || q._limit) {
            var limit = Number(q._limit) || 10;
            var page = Number(q._page) || 1;
            rows = rows.slice((page - 1) * limit, page * limit);
            return { data: rows, total: total, page: page, limit: limit };
          }
          return rows;
        },
      },
      // GET one
      {
        url: basePath + "/:id",
        method: "GET",
        response: function (ctx) {
          var match = data.find(function (r) {
            return String(r[key]) === String(ctx.params.id);
          });
          return match || { error: "Not found", id: ctx.params.id };
        },
      },
      // POST create
      {
        url: basePath,
        method: "POST",
        response: function (ctx) {
          var input = ctx.bodyJSON || {};
          var nextId =
            data.reduce(function (m, r) {
              var n = Number(r[key]);
              return n > m ? n : m;
            }, 0) + 1;
          var created = Object.assign({}, input, {
            [key]: input[key] || nextId,
          });
          data.push(created);
          return created;
        },
        status: 201,
      },
      // PUT/PATCH update
      {
        url: basePath + "/:id",
        method: "PUT",
        response: function (ctx) {
          var idx = data.findIndex(function (r) {
            return String(r[key]) === String(ctx.params.id);
          });
          if (idx === -1) return { error: "Not found" };
          data[idx] = Object.assign({}, data[idx], ctx.bodyJSON || {});
          return data[idx];
        },
      },
      {
        url: basePath + "/:id",
        method: "PATCH",
        response: function (ctx) {
          var idx = data.findIndex(function (r) {
            return String(r[key]) === String(ctx.params.id);
          });
          if (idx === -1) return { error: "Not found" };
          data[idx] = Object.assign({}, data[idx], ctx.bodyJSON || {});
          return data[idx];
        },
      },
      // DELETE
      {
        url: basePath + "/:id",
        method: "DELETE",
        response: function (ctx) {
          var idx = data.findIndex(function (r) {
            return String(r[key]) === String(ctx.params.id);
          });
          if (idx === -1) return { error: "Not found" };
          var removed = data.splice(idx, 1)[0];
          return { ok: true, removed: removed };
        },
      },
    ];
    routes.forEach(function (r) {
      STATE.routes.push(r);
    });
    notifyState();
    return api;
  }

  /* =========================================================================
   * PUBLIC API
   * =======================================================================*/

  /* =========================================================================
   * Helper: resolve full source path (tableName) for BasisCore-shaped helpers
   * -------------------------------------------------------------------------
   * Accepts either:
   *   { tableName: 'api.products.items' }                  ← preferred
   *   { commandName: 'api.products', memberName: 'items' } ← auto-joined
   *   { memberName: 'items' }                              ← fallback (warns)
   * =======================================================================*/
  var _bcWarned = {};
  function resolveTableName(opts, context) {
    if (opts.tableName) return String(opts.tableName).toLowerCase();
    if (opts.commandName && opts.memberName) {
      return (opts.commandName + "." + opts.memberName).toLowerCase();
    }
    if (opts.memberName) {
      var key = context + ":" + opts.memberName;
      if (!_bcWarned[key]) {
        _bcWarned[key] = true;
        console.warn(
          "[BasisCoreMock] " +
            context +
            ' was given { memberName: "' +
            opts.memberName +
            '" } ' +
            'with no commandName. For <basis core="api">, the response\'s tableName must equal ' +
            "the full datamembername a downstream command consumes " +
            '(e.g. "api.products.items"). Pass { tableName: "..." } explicitly, or ' +
            '{ commandName: "...", memberName: "..." } so it can be auto-joined. ' +
            'For <basis core="dbsource">, the bare memberName is fine.',
        );
      }
      return String(opts.memberName).toLowerCase();
    }
    return "items";
  }

  function notifyState() {
    STATE.listeners.forEach(function (fn) {
      try {
        fn({ type: "state" });
      } catch (_) {}
    });
  }

  var api = {
    samples: SAMPLES,

    route: function (def) {
      if (!def || !def.url)
        throw new Error("[BasisCoreMock] route() requires { url }");
      def._compiled = null;
      STATE.routes.push(def);
      notifyState();
      return api;
    },
    routes: function (defs) {
      defs.forEach(function (d) {
        api.route(d);
      });
      return api;
    },

    resource: resource,

    /** One-liner: register full REST surfaces for every sample dataset. */
    useAllSamples: function (basePath) {
      var prefix = basePath || "";
      resource(prefix + "/products", deepClone(SAMPLES.products));
      resource(prefix + "/users", deepClone(SAMPLES.users));
      resource(prefix + "/orders", deepClone(SAMPLES.orders));
      resource(prefix + "/posts", deepClone(SAMPLES.posts));
      resource(prefix + "/categories", deepClone(SAMPLES.categories), {
        keyField: "id",
      });
      resource(prefix + "/countries", deepClone(SAMPLES.countries), {
        keyField: "code",
      });
      resource(prefix + "/tasks", deepClone(SAMPLES.tasks));
      return api;
    },



    /**
     * Register a complete mock surface for schema + schemauploader examples.
     *
     * It mounts:
     *   GET  /schema/customer-profile
     *   GET  /schema/product-catalog
     *   GET  /schema/kyc-documents
     *   GET  /schema/job-application
     *   GET  parameter endpoints for edit-mode samples
     *   POST answer endpoints (returns { usedforid })
     *   POST blob endpoints (returns upload metadata)
     *
     * Usage:
     *   BasisCoreMock.useSchemaUploaderSamples();
     */
    useSchemaUploaderSamples: function (opts) {
      opts = opts || {};
      var nextUsedForId = Number(opts.startUsedForId) || 5000;
      var savedAnswers = [];
      var uploadedFiles = [];

      function addRoute(url, method, response, status) {
        STATE.routes.push({
          url: url,
          method: method,
          response: response,
          status: status || 200,
        });
      }

      function answerResponse(ctx) {
        var usedforid = ++nextUsedForId;
        savedAnswers.push({
          usedforid: usedforid,
          url: ctx.url ? ctx.url.pathname : "",
          answer: deepClone(ctx.bodyJSON || {}),
          at: new Date().toISOString(),
        });
        return { usedforid: usedforid, ok: true };
      }

      function blobResponse(ctx) {
        var body = ctx.bodyJSON || {};
        var item = {
          ok: true,
          usedforid: (ctx.query && ctx.query.usedforid) || body.usedforid || null,
          blobid: (ctx.query && ctx.query.blobid) || body.blobid || null,
          uploadtoken: (ctx.query && ctx.query.uploadtoken) || body.uploadtoken || null,
          filename: (ctx.query && ctx.query.filename) || body.filename || "mock-upload.bin",
        };
        uploadedFiles.push(item);
        return item;
      }

      function editAnswer(schemaKey, answerId) {
        var map = {
          customerProfile: { prpId: 21011, value: "مشتری نمونه" },
          productCatalog: { prpId: 21021, value: "محصول نمونه" },
          kycDocuments: { prpId: 21031, value: "Sample Customer" },
          jobApplication: { prpId: 21041, value: "متقاضی نمونه" },
        };
        var item = map[schemaKey];
        return {
          lid: 1,
          usedForId: Number(answerId) || 1001,
          properties: [
            {
              propId: item.prpId,
              multi: false,
              added: [
                {
                  parts: [
                    {
                      part: 1,
                      values: [{ value: item.value }],
                    },
                  ],
                },
              ],
              edited: [],
              deleted: [],
            },
          ],
        };
      }

      addRoute("/schema/customer-profile", "GET", function () {
        return deepClone(SAMPLES.schemas.customerProfile);
      });
      addRoute("/schema/product-catalog", "GET", function () {
        return deepClone(SAMPLES.schemas.productCatalog);
      });
      addRoute("/schema/kyc-documents", "GET", function () {
        return deepClone(SAMPLES.schemas.kycDocuments);
      });
      addRoute("/schema/job-application", "GET", function () {
        return deepClone(SAMPLES.schemas.jobApplication);
      });

      addRoute("/api/customerProfile/params/:id", "GET", function (ctx) {
        return editAnswer("customerProfile", ctx.query.answerId || ctx.params.id);
      });
      addRoute("/api/productCatalog/params/:id", "GET", function (ctx) {
        return editAnswer("productCatalog", ctx.query.answerId || ctx.params.id);
      });
      addRoute("/api/kycDocuments/params/:id", "GET", function (ctx) {
        return editAnswer("kycDocuments", ctx.query.answerId || ctx.params.id);
      });
      addRoute("/api/jobApplication/params/:id", "GET", function (ctx) {
        return editAnswer("jobApplication", ctx.query.answerId || ctx.params.id);
      });

      [
        "/api/schema/customer-profile/answer",
        "/api/catalog/answer",
        "/api/kyc/answer",
        "/api/hr/application/answer",
      ].forEach(function (url) {
        addRoute(url, "POST", answerResponse);
      });

      [
        "/api/schema/customer-profile/blob",
        "/api/catalog/blob",
        "/api/kyc/blob",
        "/api/hr/application/blob",
      ].forEach(function (url) {
        addRoute(url, "POST", blobResponse);
      });

      api.schemaUploaderState = function () {
        return {
          answers: deepClone(savedAnswers),
          uploads: deepClone(uploadedFiles),
        };
      };

      notifyState();
      return api;
    },
    scenario: function (name, fn) {
      STATE.scenarios[name] = fn;
      if (STATE.panel) STATE.panel.refreshScenarios();
      return api;
    },
    useScenario: function (name) {
      var fn = STATE.scenarios[name];
      if (typeof fn === "function") fn(api);
      STATE.activeScenario = name || "default";
      notifyState();
      return api;
    },
    setLatency: function (ms) {
      STATE.latencyMs = Number(ms) || 0;
      notifyState();
      return api;
    },
    setErrorRate: function (r) {
      STATE.errorRate = Math.max(0, Math.min(1, Number(r) || 0));
      notifyState();
      return api;
    },
    setEnabled: function (on) {
      STATE.enabled = !!on;
      notifyState();
      return api;
    },
    clearLog: function () {
      STATE.log = [];
      STATE.listeners.forEach(function (fn) {
        try {
          fn({ type: "log" });
        } catch (_) {}
      });
      return api;
    },
    reset: function () {
      STATE.routes = [];
      STATE.log = [];
      notifyState();
      return api;
    },

    onEvent: function (fn) {
      STATE.listeners.push(fn);
      return function () {
        var i = STATE.listeners.indexOf(fn);
        if (i !== -1) STATE.listeners.splice(i, 1);
      };
    },

    /** Restore the original window.fetch and tear down everything. */
    unpatch: function () {
      if (ORIGINAL_FETCH) global.fetch = ORIGINAL_FETCH;
      if (STATE.panel) {
        STATE.panel.unmount();
        STATE.panel = null;
      }
      STATE.routes = [];
      STATE.log = [];
      delete global.BasisCoreMock;
    },

    /** Mount the floating control panel. Idempotent. */
    panel: function (opts) {
      opts = opts || {};
      if (STATE.panel) return api;
      if (!global.document) return api;
      STATE.panel = createPanel(opts);
      STATE.panel.mount();
      return api;
    },

    /** Snapshot of internal state (read-only). */
    state: function () {
      return {
        enabled: STATE.enabled,
        latencyMs: STATE.latencyMs,
        errorRate: STATE.errorRate,
        scenario: STATE.activeScenario,
        routes: STATE.routes.map(function (r) {
          return {
            url: r.url,
            method: r.method || "GET",
            scenario: r.scenario || null,
          };
        }),
        log: STATE.log.slice(),
      };
    },

    /* =========================================================================
     * BasisCore-shaped response helpers
     * -----------------------------------------------------------------------
     * VERIFIED against basiscore-2.39.6.min.js. Two distinct behaviors:
     *
     * `core="api"` (APIComponent / class oe):
     *   - Parses response, then iterates sources and calls setSource directly
     *     using `options.tableName` as the source id — <member> name is NOT
     *     appended.
     *   - So `options.tableName` MUST be the FULL source path that any
     *     consumer (e.g. <basis core="print" datamembername="...">) refers to.
     *   - Example: <basis core="api" name="api.products"> with print listening
     *     for "api.products.items" → tableName must be "api.products.items".
     *
     * `core="dbsource"` (DbSourceComponent):
     *   - Calls processLoadedDataSet → member.addDataSourceAsync(rows, command.id, options).
     *   - Inside, the source id is built as `${command.id}.${member.name}` —
     *     `options.tableName` is effectively a label only.
     *
     * To make the helpers safe across both cases, prefer `tableName` (full path).
     * `memberName` is kept as a fallback for backward compatibility but logs a
     * console warning so users notice when their setup may not match
     * <basis core="api"> consumers.
     * =====================================================================*/
    bc: {
      /**
       * Wrap rows for a single source.
       *
       * Recommended:
       *   BasisCoreMock.bc.api(rows, { tableName: 'api.products.items', keyField: 'id' })
       *
       * For <basis core="api"> consumers, `tableName` MUST equal the
       * `datamembername` used by downstream commands (e.g. core="print").
       */
      api: function (rows, opts) {
        opts = opts || {};
        var tableName = resolveTableName(opts, "bc.api");
        return {
          sources: [
            {
              data: rows || [],
              options: {
                tableName: tableName,
                keyFieldName: opts.keyField || "id",
              },
            },
          ],
        };
      },

      /**
       * For commands that emit MULTIPLE sources. Each entry should specify
       * `tableName` (full source path) and `rows`. Order matters for dbsource.
       *
       *   BasisCoreMock.bc.apiMulti([
       *     { tableName: 'api.store.items', rows: products },
       *     { tableName: 'api.store.meta',  rows: [{count: 12}] }
       *   ])
       */
      apiMulti: function (members) {
        return {
          sources: (members || []).map(function (m) {
            return {
              data: m.rows || [],
              options: {
                tableName: resolveTableName(m, "bc.apiMulti entry"),
                keyFieldName: m.keyField || "id",
              },
            };
          }),
        };
      },
    },

    /**
     * Like resource(), but every GET response is wrapped in BasisCore's
     * `{sources: [{data, options}]}` shape — ready to feed into
     * <basis core="api"> or <basis core="dbsource">.
     *
     * For <basis core="api">, set `tableName` to the FULL source path that
     * downstream commands consume (e.g. the `datamembername` of a print):
     *
     *   BasisCoreMock.bcResource('/products', SAMPLES.products, {
     *     tableName: 'api.products.items',   // matches <basis core="print" datamembername="api.products.items">
     *     keyField:  'id'
     *   });
     */
    bcResource: function (basePath, dataset, opts) {
      opts = opts || {};
      var tableName = resolveTableName(opts, 'bcResource("' + basePath + '")');
      var keyField = opts.keyField || "id";
      var data = dataset.slice();

      function listFiltered(query) {
        var rows = data.slice();
        var q = query || {};
        Object.keys(q).forEach(function (k) {
          if (
            k === "_page" ||
            k === "_limit" ||
            k === "_sort" ||
            k === "_order" ||
            k === "_q"
          )
            return;
          var val = q[k];
          rows = rows.filter(function (r) {
            return (
              r[k] != null &&
              String(r[k]).toLowerCase() === String(val).toLowerCase()
            );
          });
        });
        if (q._q) {
          var needle = String(q._q).toLowerCase();
          rows = rows.filter(function (r) {
            return Object.keys(r).some(function (k) {
              return (
                typeof r[k] === "string" &&
                r[k].toLowerCase().indexOf(needle) !== -1
              );
            });
          });
        }
        if (q._sort) {
          var dir = q._order === "desc" ? -1 : 1;
          rows.sort(function (a, b) {
            var av = a[q._sort],
              bv = b[q._sort];
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
          });
        }
        if (q._page || q._limit) {
          var limit = Number(q._limit) || 10;
          var page = Number(q._page) || 1;
          rows = rows.slice((page - 1) * limit, page * limit);
        }
        return rows;
      }

      function wrap(rows) {
        return {
          sources: [
            {
              data: rows,
              options: { tableName: tableName, keyFieldName: keyField },
            },
          ],
        };
      }

      var routes = [
        // GET list — wrapped in BasisCore shape
        {
          url: basePath,
          method: "GET",
          response: function (ctx) {
            return wrap(listFiltered(ctx.query));
          },
        },
        // GET single — wrapped
        {
          url: basePath + "/:id",
          method: "GET",
          response: function (ctx) {
            var found = data.find(function (r) {
              return String(r[keyField]) === String(ctx.params.id);
            });
            return wrap(found ? [found] : []);
          },
        },
      ];
      routes.forEach(function (r) {
        STATE.routes.push(r);
      });
      notifyState();
      return api;
    },

    version: "1.4.1",
  };

  /* =========================================================================
   * CONTROL PANEL  —  floating overlay, terminal aesthetic
   * =======================================================================*/

  function createPanel(opts) {
    var rootId = "bcmock-panel";
    var styleId = "bcmock-styles";
    var root = null;
    var expanded = true;

    function mount() {
      if (document.getElementById(rootId)) return;
      // Race: panel() called from <head> before <body> exists.
      // Defer until the DOM is ready.
      if (!document.body) {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", mount, { once: true });
        } else {
          setTimeout(mount, 0);
        }
        return;
      }
      injectStyles();
      root = document.createElement("div");
      root.id = rootId;
      root.dir = "ltr";
      root.innerHTML = template();
      document.body.appendChild(root);
      bind();
      api.onEvent(function (ev) {
        if (ev.type === "hit") {
          appendHit(ev.entry);
          flashDot();
        }
        if (ev.type === "state" || ev.type === "log") renderState();
      });
      renderState();
    }
    function unmount() {
      var el = document.getElementById(rootId);
      if (el) el.remove();
      var st = document.getElementById(styleId);
      if (st) st.remove();
    }
    function refreshScenarios() {
      if (!root) return;
      var sel = root.querySelector('[data-bc="scenario"]');
      var names = ["default"].concat(Object.keys(STATE.scenarios));
      sel.innerHTML = names
        .map(function (n) {
          return (
            '<option value="' +
            n +
            '"' +
            (n === STATE.activeScenario ? " selected" : "") +
            ">" +
            escapeHtml(n) +
            "</option>"
          );
        })
        .join("");
    }

    function template() {
      return (
        "" +
        '<header class="bcm-h">' +
        '<span class="bcm-dot" data-bc="dot"></span>' +
        '<span class="bcm-title">' +
        escapeHtml(opts.title || "BasisCore Mock") +
        "</span>" +
        '<span class="bcm-ver">v' +
        api.version +
        "</span>" +
        '<span class="bcm-spacer"></span>' +
        '<button class="bcm-btn-icon" data-bc="toggle" title="collapse">_</button>' +
        "</header>" +
        '<div class="bcm-body" data-bc="body">' +
        '<div class="bcm-row">' +
        '<label class="bcm-lbl"><input type="checkbox" data-bc="enabled" checked> enabled</label>' +
        '<select class="bcm-sel" data-bc="scenario" title="scenario"></select>' +
        "</div>" +
        '<div class="bcm-row bcm-grid2">' +
        '<label class="bcm-lbl">latency (ms)<input type="number" min="0" step="100" value="0" data-bc="latency"></label>' +
        '<label class="bcm-lbl">error rate<input type="number" min="0" max="1" step="0.05" value="0" data-bc="errorrate"></label>' +
        "</div>" +
        '<div class="bcm-section">' +
        '<div class="bcm-shead">routes <span class="bcm-mut" data-bc="rcount">0</span></div>' +
        '<div class="bcm-list" data-bc="routes"></div>' +
        "</div>" +
        '<div class="bcm-section">' +
        '<div class="bcm-shead">traffic <button class="bcm-btn-mini" data-bc="clear">clear</button></div>' +
        '<div class="bcm-list bcm-traffic" data-bc="hits"></div>' +
        "</div>" +
        "</div>"
      );
    }

    function bind() {
      var $ = function (s) {
        return root.querySelector(s);
      };
      $('[data-bc="toggle"]').addEventListener("click", function () {
        expanded = !expanded;
        root.classList.toggle("bcm-collapsed", !expanded);
      });
      $('[data-bc="enabled"]').addEventListener("change", function (e) {
        api.setEnabled(e.target.checked);
      });
      $('[data-bc="latency"]').addEventListener("change", function (e) {
        api.setLatency(+e.target.value);
      });
      $('[data-bc="errorrate"]').addEventListener("change", function (e) {
        api.setErrorRate(+e.target.value);
      });
      $('[data-bc="scenario"]').addEventListener("change", function (e) {
        api.useScenario(e.target.value);
      });
      $('[data-bc="clear"]').addEventListener("click", function () {
        api.clearLog();
      });
      refreshScenarios();
    }

    function renderState() {
      if (!root) return;
      var s = api.state();
      var $ = function (sel) {
        return root.querySelector(sel);
      };
      $('[data-bc="enabled"]').checked = !!s.enabled;
      $('[data-bc="latency"]').value = s.latencyMs;
      $('[data-bc="errorrate"]').value = s.errorRate;
      $('[data-bc="rcount"]').textContent = String(s.routes.length);
      var list = $('[data-bc="routes"]');
      list.innerHTML =
        s.routes
          .map(function (r) {
            return (
              '<div class="bcm-item">' +
              '<span class="bcm-method bcm-m-' +
              (r.method || "GET").toLowerCase() +
              '">' +
              escapeHtml(r.method || "GET") +
              "</span>" +
              '<span class="bcm-url">' +
              escapeHtml(r.url) +
              "</span>" +
              (r.scenario
                ? '<span class="bcm-tag">' + escapeHtml(r.scenario) + "</span>"
                : "") +
              "</div>"
            );
          })
          .join("") || '<div class="bcm-empty">no routes registered</div>';
      var hits = $('[data-bc="hits"]');
      hits.innerHTML =
        s.log.map(hitHtml).join("") ||
        '<div class="bcm-empty">no traffic yet</div>';
      refreshScenarios();
    }
    function appendHit(entry) {
      if (!root) return;
      var hits = root.querySelector('[data-bc="hits"]');
      var empty = hits.querySelector(".bcm-empty");
      if (empty) empty.remove();
      hits.insertAdjacentHTML("afterbegin", hitHtml(entry));
      while (hits.children.length > LOG_LIMIT) hits.lastElementChild.remove();
    }
    function hitHtml(h) {
      var ok = h.status >= 200 && h.status < 400;
      return (
        '<div class="bcm-item bcm-hit">' +
        '<span class="bcm-status bcm-' +
        (ok ? "ok" : "err") +
        '">' +
        h.status +
        "</span>" +
        '<span class="bcm-method bcm-m-' +
        (h.method || "GET").toLowerCase() +
        '">' +
        escapeHtml(h.method) +
        "</span>" +
        '<span class="bcm-url">' +
        escapeHtml(h.url) +
        "</span>" +
        '<span class="bcm-mut">' +
        h.ms +
        "ms</span>" +
        "</div>"
      );
    }
    function flashDot() {
      if (!root) return;
      var dot = root.querySelector('[data-bc="dot"]');
      if (!dot) return;
      dot.classList.remove("bcm-flash");
      void dot.offsetWidth;
      dot.classList.add("bcm-flash");
    }

    function injectStyles() {
      if (document.getElementById(styleId)) return;
      var css =
        "" +
        "#" +
        rootId +
        " {" +
        "position:fixed;right:16px;bottom:16px;z-index:2147483647;" +
        "width:340px;max-height:70vh;display:flex;flex-direction:column;" +
        "background:#0d0f12;color:#d6deea;border:1px solid #232a35;" +
        'font:12px/1.5 ui-monospace,"JetBrains Mono",Menlo,Consolas,monospace;' +
        "box-shadow:0 24px 60px -20px rgba(0,0,0,.6),0 4px 12px rgba(0,0,0,.4);" +
        "--acc:#ffb454;" +
        "}" +
        "#" +
        rootId +
        ".bcm-collapsed{max-height:34px;overflow:hidden;}" +
        "#" +
        rootId +
        " .bcm-h{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid #232a35;background:#11141a;flex-shrink:0;}" +
        "#" +
        rootId +
        " .bcm-title{color:var(--acc);letter-spacing:.5px;text-transform:uppercase;font-size:11px;}" +
        "#" +
        rootId +
        " .bcm-ver{color:#5b6a83;font-size:9px;}" +
        "#" +
        rootId +
        " .bcm-spacer{flex:1;}" +
        "#" +
        rootId +
        " .bcm-dot{width:8px;height:8px;background:#45506a;border-radius:50%;transition:background .2s;}" +
        "#" +
        rootId +
        " .bcm-dot.bcm-flash{background:var(--acc);animation:bcmFlash .4s;}" +
        "@keyframes bcmFlash{0%{background:var(--acc);transform:scale(1.6);}100%{background:#45506a;transform:scale(1);}}" +
        "#" +
        rootId +
        " .bcm-btn-icon{background:transparent;border:1px solid #232a35;color:#d6deea;width:22px;height:22px;cursor:pointer;font-family:inherit;}" +
        "#" +
        rootId +
        " .bcm-btn-icon:hover{border-color:var(--acc);color:var(--acc);}" +
        "#" +
        rootId +
        " .bcm-body{padding:10px;overflow:auto;display:flex;flex-direction:column;gap:10px;}" +
        "#" +
        rootId +
        " .bcm-row{display:flex;gap:8px;align-items:center;}" +
        "#" +
        rootId +
        " .bcm-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}" +
        "#" +
        rootId +
        " .bcm-lbl{display:flex;flex-direction:column;gap:3px;color:#8a96aa;font-size:10px;text-transform:uppercase;letter-spacing:.5px;}" +
        "#" +
        rootId +
        ' .bcm-lbl input[type="checkbox"]{margin-right:6px;vertical-align:middle;}' +
        "#" +
        rootId +
        ' input[type="number"],#' +
        rootId +
        " select.bcm-sel{background:#050709;border:1px solid #232a35;color:#d6deea;padding:4px 6px;font:inherit;width:100%;box-sizing:border-box;}" +
        "#" +
        rootId +
        " select.bcm-sel{flex:1;}" +
        "#" +
        rootId +
        " input:focus,#" +
        rootId +
        " select:focus{outline:none;border-color:var(--acc);}" +
        "#" +
        rootId +
        " .bcm-shead{display:flex;justify-content:space-between;align-items:center;color:#8a96aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}" +
        "#" +
        rootId +
        " .bcm-mut{color:#5b6a83;font-size:10px;}" +
        "#" +
        rootId +
        " .bcm-btn-mini{background:transparent;border:1px solid #232a35;color:#8a96aa;font:inherit;font-size:10px;padding:1px 6px;cursor:pointer;}" +
        "#" +
        rootId +
        " .bcm-btn-mini:hover{border-color:var(--acc);color:var(--acc);}" +
        "#" +
        rootId +
        " .bcm-list{max-height:140px;overflow:auto;border:1px solid #1a1f28;background:#06080b;}" +
        "#" +
        rootId +
        " .bcm-traffic{max-height:180px;}" +
        "#" +
        rootId +
        " .bcm-empty{color:#45506a;padding:8px;text-align:center;font-style:italic;}" +
        "#" +
        rootId +
        " .bcm-item{display:flex;gap:6px;align-items:center;padding:4px 6px;border-bottom:1px solid #11141a;white-space:nowrap;}" +
        "#" +
        rootId +
        " .bcm-item:last-child{border-bottom:none;}" +
        "#" +
        rootId +
        " .bcm-hit{animation:bcmSlide .25s ease-out;}" +
        "@keyframes bcmSlide{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:none;}}" +
        "#" +
        rootId +
        " .bcm-method{font-size:9px;padding:1px 5px;border:1px solid currentColor;text-transform:uppercase;letter-spacing:.5px;flex-shrink:0;}" +
        "#" +
        rootId +
        " .bcm-m-get{color:#6cb6ff;}" +
        "#" +
        rootId +
        " .bcm-m-post{color:#ffb454;}" +
        "#" +
        rootId +
        " .bcm-m-put,#" +
        rootId +
        " .bcm-m-patch{color:#d8b6ff;}" +
        "#" +
        rootId +
        " .bcm-m-delete{color:#ff6e6e;}" +
        "#" +
        rootId +
        " .bcm-status{font-weight:bold;min-width:28px;}" +
        "#" +
        rootId +
        " .bcm-ok{color:#7bd88f;}" +
        "#" +
        rootId +
        " .bcm-err{color:#ff6e6e;}" +
        "#" +
        rootId +
        " .bcm-url{flex:1;overflow:hidden;text-overflow:ellipsis;}" +
        "#" +
        rootId +
        " .bcm-tag{font-size:9px;padding:1px 5px;background:#232a35;color:var(--acc);}";
      var tag = document.createElement("style");
      tag.id = styleId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    return {
      mount: mount,
      unmount: unmount,
      refreshScenarios: refreshScenarios,
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  /* =========================================================================
   * INSTALL
   * =======================================================================*/

  if (ORIGINAL_FETCH) {
    global.fetch = patchedFetch;
  } else {
    console.warn(
      "[BasisCoreMock] window.fetch not available — mock layer is inert.",
    );
  }
  global.BasisCoreMock = api;
})(
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this,
);
