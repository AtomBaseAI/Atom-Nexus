/**
 * Seed script — run with: bun prisma/seed.ts [--force]
 * Idempotent: skips if users exist, unless --force (wipes and reseeds).
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const db = new PrismaClient()

const V = {
  bigbuck: { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', d: 596 },
  elephants: { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', d: 653 },
  sintel: { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', d: 888 },
  tears: { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', d: 734 },
  blazes: { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', d: 15 },
  escapes: { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', d: 15 },
  fun: { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', d: 60 },
  joyrides: { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', d: 15 },
  meltdowns: { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', d: 15 },
}

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
}

type LessonSeed = {
  title: string
  description?: string
  preview?: boolean
  video?: keyof typeof V
  audio?: string[] // additional audio languages beyond primary 'en'
  subs?: string[]
  noVideo?: boolean
}

type SectionSeed = { title: string; lessons: LessonSeed[] }

type CourseSeed = {
  title: string
  slug: string
  categorySlug: string
  shortDescription: string
  description: string
  thumbnail: string
  price: number // rupees, 0 = free
  compareAt?: number
  featured?: boolean
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  level: string
  objectives: string[]
  prerequisites: string[]
  targetAudience: string[]
  sections: SectionSeed[]
}

const COURSES: CourseSeed[] = [
  {
    title: 'Full-Stack Web Development Bootcamp',
    slug: 'full-stack-web-development-bootcamp',
    categorySlug: 'web-development',
    shortDescription: 'Go from zero to deployed: HTML, CSS, JavaScript, React, Node.js and databases in one hands-on bootcamp.',
    description:
      'This bootcamp takes you from your first line of HTML to deploying a complete full-stack application. You will build real projects, learn modern tooling, and understand how every layer of the web fits together — frontend, backend, and database. Every module ends with a practical assignment and a mini project you can show in your portfolio.',
    thumbnail: '/images/course-webdev.png',
    price: 1999,
    compareAt: 3999,
    status: 'PUBLISHED',
    level: 'BEGINNER',
    objectives: ['Build responsive websites with HTML, CSS and modern JavaScript', 'Create REST APIs with Node.js and Express', 'Work confidently with relational databases', 'Deploy a complete full-stack application'],
    prerequisites: ['Basic computer literacy', 'No prior coding experience required'],
    targetAudience: ['Complete beginners who want a career in web development', 'Designers who want to implement their own work'],
    sections: [
      {
        title: 'Getting Started',
        lessons: [
          { title: 'Welcome & Course Roadmap', description: 'What you will build and how the course is structured.', preview: true, video: 'fun', audio: ['hi'], subs: ['en', 'ta'] },
          { title: 'How the Web Works', description: 'Clients, servers, DNS, HTTP and the request lifecycle.', video: 'bigbuck', audio: ['hi', 'ta'], subs: ['en'] },
        ],
      },
      {
        title: 'Frontend Foundations',
        lessons: [
          { title: 'HTML & Semantic Markup', description: 'Structure content with semantic, accessible HTML.', video: 'escapes', audio: ['ta'], subs: ['en', 'hi'] },
          { title: 'CSS Layouts & Flexbox', description: 'Master layout: box model, flexbox and grid fundamentals.', video: 'joyrides', audio: [], subs: ['en'] },
          { title: 'JavaScript Essentials', description: 'Variables, functions, DOM manipulation and events.', video: 'fun', audio: ['hi', 'ta'], subs: ['en', 'ta'] },
        ],
      },
      {
        title: 'Backend with Node.js',
        lessons: [
          { title: 'REST APIs with Express', description: 'Design and build a clean REST API from scratch.', video: 'meltdowns', audio: [], subs: ['en'] },
          { title: 'Databases & ORMs', description: 'Model your data and query it safely with an ORM.', video: 'tears', audio: ['hi'], subs: ['en'] },
        ],
      },
    ],
  },
  {
    title: 'TypeScript in Practice',
    slug: 'typescript-in-practice',
    categorySlug: 'programming',
    shortDescription: 'Master the type system, generics, and real-world patterns to write bulletproof TypeScript.',
    description:
      'Move beyond basic annotations. This course digs into the parts of TypeScript that make teams productive: narrowing, generics, utility types, declaration files, and safe patterns for API boundaries. You will refactor a real JavaScript project into strict TypeScript as you learn.',
    thumbnail: '/images/course-typescript.png',
    price: 999,
    compareAt: 1999,
    status: 'PUBLISHED',
    level: 'INTERMEDIATE',
    objectives: ['Use advanced types, generics and utility types effectively', 'Migrate JavaScript projects to strict TypeScript', 'Model API contracts and shared types end-to-end'],
    prerequisites: ['Comfortable with JavaScript fundamentals'],
    targetAudience: ['JavaScript developers levelling up', 'Teams adopting TypeScript'],
    sections: [
      {
        title: 'Type System Deep Dive',
        lessons: [
          { title: 'Why TypeScript?', description: 'Where types pay off and where they get in the way.', preview: true, video: 'fun', audio: ['hi'], subs: ['en', 'ta'] },
          { title: 'Narrowing & Control Flow Analysis', description: 'How the compiler follows your logic.', video: 'blazes', audio: ['ta'], subs: ['en'] },
          { title: 'Generics Without Tears', description: 'Build reusable, well-inferred abstractions.', video: 'joyrides', audio: [], subs: ['en'] },
        ],
      },
      {
        title: 'Real-World Patterns',
        lessons: [
          { title: 'Typing API Boundaries', description: 'Zod, runtime validation and inferred types.', video: 'meltdowns', audio: ['hi'], subs: ['en'] },
          { title: 'Utility Types & Mapped Types', description: 'Partial, Pick, Omit, Record and writing your own.', video: 'sintel', audio: [], subs: ['en'] },
        ],
      },
    ],
  },
  {
    title: 'Cloud Foundations: AWS Essentials',
    slug: 'cloud-foundations-aws-essentials',
    categorySlug: 'cloud-computing',
    shortDescription: 'Core AWS services explained with hands-on labs: EC2, S3, IAM, Lambda and more.',
    description:
      'A practical introduction to Amazon Web Services. You will launch compute, store files, manage identities, and glue services together with serverless functions. Each lesson maps to a hands-on lab in the free tier so you learn by doing, not by slides.',
    thumbnail: '/images/course-cloud.png',
    price: 1499,
    status: 'PUBLISHED',
    level: 'BEGINNER',
    objectives: ['Navigate the AWS console and CLI with confidence', 'Launch and secure EC2 instances', 'Store and serve files with S3', 'Automate tasks with Lambda'],
    prerequisites: ['Basic networking concepts help but are not required'],
    targetAudience: ['Developers moving to the cloud', 'IT professionals preparing for cloud roles'],
    sections: [
      {
        title: 'Cloud Basics',
        lessons: [
          { title: 'What Is Cloud Computing?', description: 'IaaS, PaaS, SaaS and shared responsibility.', preview: true, video: 'fun', audio: ['hi', 'ta'], subs: ['en'] },
          { title: 'IAM: Users, Roles & Policies', description: 'Least privilege from day one.', video: 'escapes', audio: [], subs: ['en'] },
        ],
      },
      {
        title: 'Core Services',
        lessons: [
          { title: 'EC2 & Virtual Machines', description: 'Launch, connect to and monitor instances.', video: 'bigbuck', audio: ['hi'], subs: ['en', 'ta'] },
          { title: 'S3: Storage That Scales', description: 'Buckets, permissions and static hosting.', video: 'blazes', audio: [], subs: ['en'] },
          { title: 'Serverless with Lambda', description: 'Run code without managing servers.', video: 'meltdowns', audio: ['ta'], subs: ['en'] },
        ],
      },
    ],
  },
  {
    title: 'Data Engineering with Python & SQL',
    slug: 'data-engineering-with-python-and-sql',
    categorySlug: 'data-engineering',
    shortDescription: 'Build reliable pipelines: ingestion, transformation, warehousing and orchestration.',
    description:
      'Learn the craft of moving data reliably. You will ingest raw events, clean and transform them, model a warehouse, and orchestrate everything into repeatable pipelines. A draft course currently being finalised.',
    thumbnail: '/images/course-data.png',
    price: 1799,
    status: 'DRAFT',
    level: 'INTERMEDIATE',
    objectives: ['Design robust ETL and ELT pipelines', 'Model analytical data with SQL', 'Schedule and monitor pipeline runs'],
    prerequisites: ['Comfortable with Python basics', 'Some SQL experience'],
    targetAudience: ['Analysts moving into engineering', 'Backend developers handling data'],
    sections: [
      {
        title: 'Pipelines 101',
        lessons: [
          { title: 'Anatomy of a Data Pipeline', description: 'Sources, sinks, batches and streams.', preview: true, video: 'fun', audio: ['hi'], subs: ['en'] },
          { title: 'Ingestion Patterns', description: 'Pulling data from APIs, files and event streams.', video: 'joyrides', audio: [], subs: ['en'] },
        ],
      },
      {
        title: 'Transformation & Storage',
        lessons: [
          { title: 'SQL for Analytics', description: 'Window functions, CTEs and query patterns.', video: 'tears', audio: [], subs: ['en'] },
          { title: 'Warehouse Modelling', description: 'Star schemas and incremental loads.', noVideo: true },
        ],
      },
    ],
  },
  {
    title: 'Product Design Fundamentals',
    slug: 'product-design-fundamentals',
    categorySlug: 'design',
    shortDescription: 'A free introduction to modern product design: research, wireframes, UI and usability.',
    description:
      'Learn how great products are shaped: from understanding users to sketching flows, building wireframes and crafting interfaces that feel obvious. This free course is the perfect first step into a design career.',
    thumbnail: '/images/course-design.png',
    price: 0,
    status: 'PUBLISHED',
    level: 'BEGINNER',
    objectives: ['Run lightweight user research', 'Sketch and validate product flows', 'Apply visual hierarchy and design systems'],
    prerequisites: [],
    targetAudience: ['Aspiring product designers', 'Developers who want design instincts'],
    sections: [
      {
        title: 'Thinking Like a Designer',
        lessons: [
          { title: 'What Product Design Really Is', description: 'Beyond pixels: outcomes over output.', preview: true, video: 'fun', audio: ['hi', 'ta'], subs: ['en'] },
          { title: 'User Research on a Budget', description: 'Interviews, assumptions and quick tests.', video: 'escapes', audio: ['ta'], subs: ['en', 'hi'] },
        ],
      },
      {
        title: 'From Sketch to Screen',
        lessons: [
          { title: 'Wireframing Flows', description: 'Turn ideas into testable screens fast.', video: 'blazes', audio: [], subs: ['en'] },
          { title: 'Visual Hierarchy & Type', description: 'Make screens scannable and calm.', video: 'sintel', audio: ['hi'], subs: ['en', 'ta'] },
        ],
      },
    ],
  },
  {
    title: 'Business Analytics Crash Course',
    slug: 'business-analytics-crash-course',
    categorySlug: 'business',
    shortDescription: 'Turn data into decisions: KPIs, dashboards and stakeholder-ready storytelling.',
    description:
      'A fast, practical tour of business analytics. Learn to define metrics that matter, build dashboards people actually use, and present insights that drive decisions. Perfect for founders, managers and analysts.',
    thumbnail: '/images/course-business.png',
    price: 799,
    status: 'PUBLISHED',
    level: 'ALL_LEVELS',
    objectives: ['Define KPIs aligned to business goals', 'Build clean, honest dashboards', 'Present insights persuasively'],
    prerequisites: [],
    targetAudience: ['Founders and managers', 'Aspiring data analysts'],
    sections: [
      {
        title: 'Metrics That Matter',
        lessons: [
          { title: 'Choosing Your KPIs', description: 'North-star metrics and guardrails.', preview: true, video: 'fun', audio: ['hi'], subs: ['en', 'ta'] },
          { title: 'Cohorts & Retention Basics', description: 'Understand behaviour over time.', video: 'meltdowns', audio: [], subs: ['en'] },
        ],
      },
      {
        title: 'Communicating Insights',
        lessons: [
          { title: 'Dashboard Design Principles', description: 'Clarity beats decoration.', video: 'joyrides', audio: ['ta'], subs: ['en'] },
          { title: 'The Analytics Story', description: 'Structure findings so people act on them.', video: 'blazes', audio: ['hi'], subs: ['en'] },
        ],
      },
    ],
  },
  {
    title: 'Next.js 16 Mastery',
    slug: 'nextjs-16-mastery',
    categorySlug: 'web-development',
    shortDescription: 'App Router, server components, caching, and production patterns for real products.',
    description:
      'Go deep on the modern Next.js stack. You will master the App Router, server and client components, data fetching and caching strategies, authentication patterns, and deployment — building a production-grade SaaS starter along the way.',
    thumbnail: '/images/course-nextjs.png',
    price: 2499,
    compareAt: 4499,
    featured: true,
    status: 'PUBLISHED',
    level: 'ADVANCED',
    objectives: ['Architect apps with the App Router', 'Blend server and client components correctly', 'Master caching, revalidation and streaming', 'Ship production-ready, secure applications'],
    prerequisites: ['Solid React fundamentals', 'Familiarity with TypeScript'],
    targetAudience: ['React developers going professional', 'Teams standardising on Next.js'],
    sections: [
      {
        title: 'App Router Foundations',
        lessons: [
          { title: 'Routing & Layouts', description: 'File-based routing, layouts and templates.', preview: true, video: 'fun', audio: ['hi', 'ta'], subs: ['en'] },
          { title: 'Server vs Client Components', description: 'The mental model that makes it click.', video: 'blazes', audio: ['hi'], subs: ['en', 'ta'] },
        ],
      },
      {
        title: 'Data & Caching',
        lessons: [
          { title: 'Data Fetching Strategies', description: 'Static, dynamic and everything between.', video: 'escapes', audio: [], subs: ['en'] },
          { title: 'Caching & Revalidation', description: 'Request memoisation, data cache and ISR.', video: 'sintel', audio: ['ta'], subs: ['en'] },
        ],
      },
      {
        title: 'Going Production',
        lessons: [
          { title: 'Auth Patterns', description: 'Sessions, middleware and server guards.', video: 'joyrides', audio: ['hi'], subs: ['en'] },
          { title: 'Deploying with Confidence', description: 'Environments, observability and rollbacks.', video: 'tears', audio: [], subs: ['en', 'ta'] },
        ],
      },
    ],
  },
  {
    title: 'Intro to UI/UX Design',
    slug: 'intro-to-ui-ux-design',
    categorySlug: 'design',
    shortDescription: 'A free starter course on interfaces, usability and the UX process — with weekly exercises.',
    description:
      'Discover how good interfaces are made. This free course walks you through the UX process, core UI patterns, and usability heuristics, with short weekly exercises that build into a small portfolio piece.',
    thumbnail: '/images/course-uiux.png',
    price: 0,
    featured: true,
    status: 'PUBLISHED',
    level: 'BEGINNER',
    objectives: ['Understand the end-to-end UX process', 'Recognise and apply core UI patterns', 'Evaluate usability with heuristics'],
    prerequisites: [],
    targetAudience: ['Anyone curious about design', 'Product folks who work with designers'],
    sections: [
      {
        title: 'UX Foundations',
        lessons: [
          { title: 'The UX Process End to End', description: 'Discover, define, design, deliver.', preview: true, video: 'fun', audio: ['hi', 'ta'], subs: ['en'] },
          { title: 'Usability Heuristics', description: 'Ten rules that catch most problems.', video: 'escapes', audio: ['hi'], subs: ['en'] },
        ],
      },
      {
        title: 'UI Patterns in Practice',
        lessons: [
          { title: 'Forms & Validation', description: 'Design forms people can complete.', video: 'meltdowns', audio: ['ta'], subs: ['en'] },
          { title: 'Navigation & Wayfinding', description: 'Help users know where they are.', video: 'sintel', audio: [], subs: ['en', 'ta'] },
        ],
      },
    ],
  },
]

async function wipe() {
  await db.refund.deleteMany()
  await db.payment.deleteMany()
  await db.order.deleteMany()
  await db.lessonProgress.deleteMany()
  await db.enrollment.deleteMany()
  await db.lessonSubtitle.deleteMany()
  await db.lessonAudioTrack.deleteMany()
  await db.lesson.deleteMany()
  await db.section.deleteMany()
  await db.course.deleteMany()
  await db.category.deleteMany()
  await db.webhookEvent.deleteMany()
  await db.setting.deleteMany()
  await db.user.deleteMany()
}

async function main() {
  const force = process.argv.includes('--force')
  const existing = await db.user.count()
  if (existing > 0 && !force) {
    console.log('Database already seeded. Use --force to reseed.')
    return
  }
  if (force) {
    console.log('Wiping existing data…')
    await wipe()
  }

  console.log('Seeding users…')
  const admin = await db.user.create({
    data: {
      email: 'admin@lms.dev',
      name: 'Platform Admin',
      passwordHash: hashPassword('admin123'),
      role: 'ADMIN',
    },
  })
  const learner = await db.user.create({
    data: {
      email: 'learner@lms.dev',
      name: 'Arun Kumar',
      passwordHash: hashPassword('learner123'),
      role: 'LEARNER',
    },
  })

  console.log('Seeding categories…')
  const categoryDefs = [
    ['Programming', 'programming'],
    ['Web Development', 'web-development'],
    ['Cloud Computing', 'cloud-computing'],
    ['Data Engineering', 'data-engineering'],
    ['Business', 'business'],
    ['Design', 'design'],
  ]
  const categories: Record<string, string> = {}
  for (const [name, slug] of categoryDefs) {
    const c = await db.category.create({ data: { name, slug } })
    categories[slug] = c.id
  }

  console.log('Seeding courses…')
  const courseIds: Record<string, string> = {}
  const lessonIds: Record<string, string[]> = {} // slug -> ordered lesson ids

  for (const cs of COURSES) {
    const course = await db.course.create({
      data: {
        title: cs.title,
        slug: cs.slug,
        shortDescription: cs.shortDescription,
        description: cs.description,
        thumbnailUrl: cs.thumbnail,
        priceAmount: cs.price * 100,
        compareAtPrice: cs.compareAt ? cs.compareAt * 100 : null,
        isFree: cs.price === 0,
        status: cs.status,
        level: cs.level,
        featured: cs.featured ?? false,
        objectives: JSON.stringify(cs.objectives),
        prerequisites: JSON.stringify(cs.prerequisites),
        targetAudience: JSON.stringify(cs.targetAudience),
        categoryId: categories[cs.categorySlug],
        publishedAt: cs.status === 'PUBLISHED' ? new Date() : null,
      },
    })
    courseIds[cs.slug] = course.id
    lessonIds[cs.slug] = []

    let sOrder = 0
    for (const ss of cs.sections) {
      const section = await db.section.create({
        data: { courseId: course.id, title: ss.title, order: sOrder++ },
      })
      let lOrder = 0
      for (const ls of ss.lessons) {
        const video = ls.video ? V[ls.video] : null
        const lesson = await db.lesson.create({
          data: {
            sectionId: section.id,
            courseId: course.id,
            title: ls.title,
            description: ls.description ?? '',
            order: lOrder++,
            isPreview: ls.preview ?? false,
            videoSourceUrl: video?.url ?? '',
            processingStatus: ls.noVideo ? 'NO_VIDEO' : 'READY',
            durationSeconds: video?.d ?? 0,
            muxAssetId: video ? `demo-asset-${course.slug}-${lOrder}` : '',
            muxPlaybackId: video ? `demo-playback-${course.slug}-${lOrder}` : '',
            audioTracks: {
              create: [
                { languageCode: 'en', displayName: LANG_NAMES['en'], isPrimary: true, status: 'READY', srcUrl: video?.url ?? '' },
                ...(ls.audio ?? []).map((code) => ({
                  languageCode: code,
                  displayName: LANG_NAMES[code] ?? code,
                  isPrimary: false,
                  status: 'READY',
                  srcUrl: video ? V.escapes.url : '', // simulated dubbed source
                })),
              ],
            },
            subtitles: {
              create: (ls.subs ?? []).map((code) => ({
                languageCode: code,
                displayName: LANG_NAMES[code] ?? code,
                status: 'READY',
                srcUrl: `/subtitles/${code}.vtt`,
              })),
            },
          },
        })
        lessonIds[cs.slug].push(lesson.id)
      }
    }
    console.log(`  ✓ ${cs.title} (${cs.sections.length} sections)`)
  }

  console.log('Seeding enrollments, orders and progress…')
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  // Free course enrollment (Intro to UI/UX Design)
  await db.enrollment.create({
    data: {
      userId: learner.id,
      courseId: courseIds['intro-to-ui-ux-design'],
      status: 'ACTIVE',
      enrolledAt: new Date(now - 6 * DAY),
      lastAccessedAt: new Date(now - 2 * DAY),
      lastLessonId: lessonIds['intro-to-ui-ux-design'][0],
    },
  })

  // Paid order → PAID + CAPTURED payment + ACTIVE enrollment + partial progress
  const bizOrderId = 'order_seed_biz001'
  const bizOrder = await db.order.create({
    data: {
      userId: learner.id,
      courseId: courseIds['business-analytics-crash-course'],
      totalAmount: 79900,
      status: 'PAID',
      razorpayOrderId: bizOrderId,
      razorpayPaymentId: 'pay_seed_biz001',
      createdAt: new Date(now - 5 * DAY),
      paidAt: new Date(now - 5 * DAY + 3 * 60 * 1000),
    },
  })
  await db.payment.create({
    data: {
      orderId: bizOrder.id,
      provider: 'razorpay',
      providerPaymentId: 'pay_seed_biz001',
      amount: 79900,
      status: 'CAPTURED',
      method: 'upi',
      capturedAt: new Date(now - 5 * DAY + 3 * 60 * 1000),
    },
  })
  await db.enrollment.create({
    data: {
      userId: learner.id,
      courseId: courseIds['business-analytics-crash-course'],
      status: 'ACTIVE',
      enrolledAt: new Date(now - 5 * DAY),
      lastAccessedAt: new Date(now - 1 * DAY),
      lastLessonId: lessonIds['business-analytics-crash-course'][1],
    },
  })
  // Progress: first lesson completed, second partially watched
  await db.lessonProgress.create({
    data: {
      userId: learner.id,
      lessonId: lessonIds['business-analytics-crash-course'][0],
      courseId: courseIds['business-analytics-crash-course'],
      lastPositionSeconds: 60,
      watchedSeconds: 60,
      completedAt: new Date(now - 4 * DAY),
    },
  })
  await db.lessonProgress.create({
    data: {
      userId: learner.id,
      lessonId: lessonIds['business-analytics-crash-course'][1],
      courseId: courseIds['business-analytics-crash-course'],
      lastPositionSeconds: 7,
      watchedSeconds: 7,
    },
  })

  // Purchased then refunded (TypeScript in Practice)
  const tsOrder = await db.order.create({
    data: {
      userId: learner.id,
      courseId: courseIds['typescript-in-practice'],
      totalAmount: 99900,
      status: 'REFUNDED',
      razorpayOrderId: 'order_seed_ts001',
      razorpayPaymentId: 'pay_seed_ts001',
      createdAt: new Date(now - 9 * DAY),
      paidAt: new Date(now - 9 * DAY + 2 * 60 * 1000),
    },
  })
  const tsPayment = await db.payment.create({
    data: {
      orderId: tsOrder.id,
      provider: 'razorpay',
      providerPaymentId: 'pay_seed_ts001',
      amount: 99900,
      status: 'REFUNDED',
      method: 'card',
      capturedAt: new Date(now - 9 * DAY + 2 * 60 * 1000),
    },
  })
  await db.refund.create({
    data: {
      paymentId: tsPayment.id,
      providerRefundId: 'rfnd_seed_ts001',
      amount: 99900,
      status: 'PROCESSED',
      createdAt: new Date(now - 7 * DAY),
      completedAt: new Date(now - 6 * DAY),
    },
  })
  await db.enrollment.create({
    data: {
      userId: learner.id,
      courseId: courseIds['typescript-in-practice'],
      status: 'REVOKED',
      enrolledAt: new Date(now - 9 * DAY),
    },
  })

  console.log('Seeding settings…')
  const settings: [string, string][] = [
    ['platformName', 'Atom Nexus'],
    ['defaultLocale', 'en'],
    ['supportedLocales', 'en,ta,hi'],
    ['refundPolicy', 'You may request a full refund within 14 days of purchase, provided less than 30% of the course content has been completed. Refunds are processed through Razorpay and may take 5–7 business days to reflect.'],
    ['supportEmail', 'support@atomnexus.io'],
    ['termsUrl', '/terms'],
    ['privacyUrl', '/privacy'],
  ]
  for (const [key, value] of settings) {
    await db.setting.create({ data: { key, value } })
  }

  console.log(`\n✅ Seed complete.`)
  console.log(`   Admin:   admin@lms.dev / admin123 (id: ${admin.id})`)
  console.log(`   Learner: learner@lms.dev / learner123 (id: ${learner.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
