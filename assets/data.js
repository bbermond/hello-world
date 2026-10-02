// Single source of truth for the portfolio. Edit content here, not in index.html.
// Each project lists the tracks it appears in. The order of `featured` per track controls placement.

window.PORTFOLIO = {
  person: {
    name: "Bermond Yange",
    location: "San Jose, California · works remotely across US & Africa time zones",
    email: "yange.bermond@gmail.com",
    links: [
      { label: "LinkedIn", url: "https://www.linkedin.com/in/bermondyange/" },
      { label: "Behance", url: "https://www.behance.net/bermond" },
      { label: "Dribbble", url: "https://dribbble.com/bermondyange" },
      { label: "Iknite Studio", url: "https://iknite.studio" }
    ],
    languages: "English (native) · French (professional) · Italian (basic)"
  },

  tracks: {
    craft: {
      label: "Brand & Visual",
      eyebrow: "Visual, brand & UI designer",
      headline: "Identity systems that stay consistent at any scale.",
      summary:
        "I've designed for 15 years: print, brand, motion, 3D and UI. I build visual systems that hold together from a festival flyer to a national summit to a product interface. I work fast, ship production-ready files and can work with any team's tools and brand.",
      skills: ["Visual identity", "Campaign systems", "UI design", "Illustration", "Motion & explainer video", "3D modeling & rendering", "Print production", "Figma · Adobe CC"],
      featured: ["cits", "cimfest", "newu", "colorfluid"]
    },
    product: {
      label: "Product Design",
      eyebrow: "Senior product designer",
      headline: "Product design that serves both users and the business.",
      summary:
        "I'm a product designer who has owned end-to-end UX at startups in the US, Nigeria and Cameroon, from research and flows through design systems to shipped UI. My strength is solving problems: I use design sprints and user-centered design to reach measurable outcomes, and I balance user needs against business goals.",
      skills: ["End-to-end product design", "UX research", "Design systems", "Prototyping", "Design sprints", "Web & mobile UI", "Content strategy", "HTML · CSS · JS"],
      featured: ["ikniteos", "iknite-systems", "solver", "vivaxd"]
    },
    leader: {
      label: "AI Product Leadership",
      eyebrow: "Founder · product & design leader · AI-native",
      headline: "I lead product and design for AI-native teams.",
      summary:
        "I'm Founder-CEO and Acting CPO of Iknite Studio, where I build IkniteOS: lead capture, follow-up and growth automation for small businesses, run by AI agents. I set product strategy, lead a distributed team, and design and prototype myself. Before this I was Head of Product Design, and I've trained founders to build MVPs.",
      skills: ["Product strategy", "0→1 products", "AI agents & workflow automation", "Team leadership", "Design leadership", "Go-to-market", "Prompt & eval design", "Founder experience"],
      featured: ["ikniteos", "iknite-studio", "solver", "mvp-masterclass"]
    }
  },

  projects: {
    ikniteos: {
      title: "IkniteOS",
      kicker: "AI product · 0→1 · 2026",
      role: "Founder-CEO & Acting CPO",
      summary:
        "One place for every lead, message and follow-up. IkniteOS is a growth operating system for SMBs that captures inquiries, routes them and uses AI-agent workflows to follow up automatically. I own the strategy, roadmap, UX and the marketing site, including conversion reviews, pricing pages and illustrated growth plans.",
      outcomes: ["Paying clients on milestone-based growth plan engagements", "Agent-driven workflows for intake, follow-up and invoicing", "Marketing site, pricing and branded case studies shipped in-house"],
      tags: ["AI agents", "SaaS", "Strategy", "UX"],
      link: ""
    },
    solver: {
      title: "Solver AI",
      kicker: "AI startup · Nov 2023–",
      role: "Product, UX & Visual Designer",
      summary:
        "Product, UX and visual design for an AI startup in the Bay Area: product interfaces, flows and the visual language across the product and marketing.",
      outcomes: ["Owned UX and visual design across product and brand surfaces"],
      tags: ["AI", "Product design", "Visual design"],
      link: "",
      todo: "Add 2–3 shipped screens and one metric or outcome."
    },
    cits: {
      title: "Cameroon International Tech Summit",
      kicker: "Campaign identity · 2026",
      role: "Creative direction & identity",
      summary:
        "This identity makes a national agenda feel like an invitation. It's one campaign system covering the main summit announcement, regional innovation weeks, partners and participant groups, in English and French.",
      outcomes: ["Master identity and announcement system for the 2026 campaign", "Bilingual creative across national and regional touchpoints", "Reusable partner, countdown, badge and event-material formats"],
      tags: ["Brand system", "Bilingual", "Events"],
      link: "https://citscm.com"
    },
    cimfest: {
      title: "CIMFEST",
      kicker: "Music, culture & events · 2026",
      role: "Brand identity & campaign",
      summary:
        "Brand identity for a music festival: primary logo and marks, brand guide, pitch deck and an activities carousel of flyers and posters for social media.",
      outcomes: ["Primary logo, marks and brand guide", "Sponsor pitch deck", "Social campaign carousel"],
      tags: ["Identity", "Campaign", "Pitch deck"],
      link: ""
    },
    newu: {
      title: "NewU Wellness",
      kicker: "Wellness & services · 2026",
      role: "Brand identity & web",
      summary:
        "Brand identity for a hydration and wellness lounge, applied to brand guidelines, packaging (gift bags) and the website.",
      outcomes: ["Primary wordmark and brand guidelines", "Packaging mockups", "Live website"],
      tags: ["Identity", "Packaging", "Web"],
      link: "https://newuhydrationlounge.com"
    },
    "iknite-studio": {
      title: "Iknite Studio",
      kicker: "Agency → product company · 2018–now",
      role: "Head of Product Design → Founder-CEO",
      summary:
        "I grew a design agency for startups and SMEs into a product company. I lead an agile, distributed team in the US and Cameroon covering UX/UI, branding, software and sales copy, delivered on time and on budget.",
      outcomes: ["Led an agile, distributed team", "Shipped products that gained early traction and validated product/market fit for startup clients", "Took the studio from services to its own SaaS (IkniteOS)"],
      tags: ["Leadership", "Agency", "Operations"],
      link: "https://iknite.studio"
    },
    "iknite-systems": {
      title: "Design systems for startups",
      kicker: "Iknite Studio · 2018–2023",
      role: "Senior Designer / UX Director",
      summary:
        "Style guides, pattern libraries and design systems for medium-size businesses and startups. These let small dev teams ship consistent UI without a dedicated designer on every sprint.",
      outcomes: ["Reusable component libraries and style guides across several clients"],
      tags: ["Design systems", "UI"],
      link: "",
      todo: "Pick one client system and show before/after plus component sheet."
    },
    vivaxd: {
      title: "Viva XD",
      kicker: "Startup · Nigeria",
      role: "Lead Designer",
      summary:
        "Sole designer at an early-stage startup, responsible for UX, UI, user research, content strategy and visual design. I worked directly with the developers and also covered product and marketing.",
      outcomes: ["Owned product, design and marketing end-to-end as the only designer"],
      tags: ["Startup", "UX research", "UI"],
      link: ""
    },
    "freelance-ux": {
      title: "Thrive Agric · Gifted Mom · SEMobility",
      kicker: "Freelance UX · social-impact startups",
      role: "UX Designer",
      summary:
        "UX for African impact startups in agritech financing (Thrive Agric), maternal health (Gifted Mom) and mobility (SEMobility).",
      outcomes: ["UX design for agritech, health and mobility products"],
      tags: ["Impact", "Mobile", "UX"],
      link: "",
      todo: "Choose the strongest of the three for a full case study."
    },
    colorfluid: {
      title: "Colorfluid & Motionfountain",
      kicker: "Design & motion studio",
      role: "Design Lead",
      summary:
        "I led a team of 3 design partners on branding, UI and visual design, explainer videos, illustration, and 2D/3D modeling and animation.",
      outcomes: ["Managed a 3-person design team", "Explainer videos and 3D animation for clients"],
      tags: ["Motion", "3D", "Branding"],
      link: "https://colorfluid.com"
    },
    "mvp-masterclass": {
      title: "MVP masterclass, Green Hack Bamenda",
      kicker: "Speaking · 2024",
      role: "Instructor",
      summary:
        "\"How to build your Minimum Viable Product\", a masterclass for founders at a 48-hour hackathon in the Cameroon International Tech Summit ecosystem.",
      outcomes: ["Taught founders product scoping and MVP strategy"],
      tags: ["Speaking", "Mentorship"],
      link: ""
    }
  },

  experience: [
    { years: "2024–now", role: "Co-founder → Founder-CEO & Acting CPO", org: "Iknite Studio / IkniteOS" },
    { years: "2023–", role: "Product, UX & Visual Designer", org: "Solver AI" },
    { years: "2018–2024", role: "Senior Designer → UX Director → Head of Product Design", org: "Iknite Studio" },
    { years: "2018–2019", role: "Freelance UX Designer", org: "Thrive Agric, Gifted Mom, SEMobility" },
    { years: "2016–2018", role: "Lead Designer", org: "Viva XD (Nigeria)" },
    { years: "2014–2016", role: "Design Lead", org: "Colorfluid & Motionfountain" },
    { years: "2014", role: "Freelance Designer", org: "Upwork & local businesses" },
    { years: "2010–2014", role: "Junior Designer → Branch Manager", org: "Unique Printers" },
    { years: "Education", role: "BSc Biochemistry", org: "University of Buea" }
  ]
};
