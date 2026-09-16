import toolsCatalog from "./tools-catalog.json";

export type IconName =
  | "play"
  | "mail"
  | "image"
  | "briefcase"
  | "bot"
  | "mic"
  | "spark"
  | "palette"
  | "pen"
  | "chart"
  | "chat"
  | "code"
  | "search";

export type Tone =
  | "blue"
  | "navy"
  | "indigo"
  | "teal"
  | "violet"
  | "amber"
  | "cyan"
  | "rose"
  | "lime"
  | "orange"
  | "pink"
  | "sky";

export const TONES: Tone[] = [
  "blue",
  "navy",
  "indigo",
  "teal",
  "violet",
  "amber",
  "cyan",
  "rose",
  "lime",
  "orange",
  "pink",
  "sky",
];

export const ICONS: IconName[] = [
  "play",
  "mail",
  "image",
  "briefcase",
  "bot",
  "mic",
  "spark",
  "palette",
  "pen",
  "chart",
  "chat",
  "code",
  "search",
];

export type StacksApp = {
  id: string;
  name: string;
  category: string;
  desc: string;
  long: string;
  tone: Tone;
  icon: IconName;
};

export type ToolInput = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "url";
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type StacksTool = {
  id: string;
  name: string;
  category: string;
  desc: string;
  long: string;
  tone: Tone;
  icon: IconName;
  kind?: ToolKind;
  outputType?: string;
  maxTokens?: number;
  systemPrompt?: string;
  userPromptTemplate?: string;
  inputs?: ToolInput[];
  tag?: string;
  premium?: boolean;
  cost?: number;
};

const CATEGORY_TONE: Record<string, Tone> = {
  Writing: "sky",
  Marketing: "blue",
  Image: "pink",
  Video: "violet",
  Audio: "cyan",
  SEO: "orange",
  Social: "indigo",
  Business: "amber",
  Developer: "cyan",
  Entertainment: "blue",
  Design: "rose",
  Career: "amber",
  Legal: "navy",
  Africa: "lime",
  Builder: "indigo",
  App: "navy",
  "AI Assistant": "navy",
};

const CATEGORY_ICON: Record<string, IconName> = {
  Writing: "pen",
  Marketing: "mail",
  Image: "image",
  Video: "play",
  Audio: "mic",
  SEO: "search",
  Social: "chat",
  Business: "briefcase",
  Developer: "code",
  Entertainment: "play",
  Design: "palette",
  Career: "briefcase",
  Legal: "briefcase",
  Africa: "spark",
  Builder: "spark",
  App: "spark",
  "AI Assistant": "bot",
};

export type ToolKind = "chat" | "image" | "video" | "audio";

export function kindForCategory(category: string): ToolKind {
  if (category === "Image") return "image";
  if (category === "Video") return "video";
  if (category === "Audio") return "audio";
  return "chat";
}

export function toneForCategory(category: string): Tone {
  return CATEGORY_TONE[category] ?? "navy";
}

export function iconForCategory(category: string): IconName {
  return CATEGORY_ICON[category] ?? "spark";
}

export function fillToolTemplate(template: string, fields: Record<string, string>) {
  let out = template;
  for (const [key, value] of Object.entries(fields)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out.replace(/\{[a-z0-9_]+\}/gi, "").trim();
}

export const APPS: StacksApp[] = [
  {
    id: "naijamovies",
    name: "NaijaMovies",
    category: "Entertainment",
    desc: "Discover, stream and explore Nigerian movies and shows.",
    long: "A cinematic discovery surface for Nollywood and African storytelling. Browse titles, trailers and collections in a dark, premium theater-like interface.",
    tone: "blue",
    icon: "play",
  },
  {
    id: "pablo",
    name: "Pablo",
    category: "AI Assistant",
    desc: "Your AI money mascot for WordPress. Chat, trade, invest and grow.",
    long: "Pablo is a playful financial companion that lives inside your workflow. Ask questions, track ideas and get guidance without leaving the page.",
    tone: "navy",
    icon: "bot",
  },
  {
    id: "email-writer",
    name: "AI Email Writer",
    category: "Marketing",
    desc: "Generate high-converting email copy in seconds.",
    long: "Draft outreach, newsletters and product emails with a tone slider, audience targeting and instant variations.",
    tone: "indigo",
    icon: "mail",
  },
  {
    id: "video-generator",
    name: "Video Generator",
    category: "Video",
    desc: "Turn ideas into stunning videos with AI.",
    long: "Describe a scene and Stacks assembles motion, pacing and soundtrack into a short cinematic clip.",
    tone: "teal",
    icon: "play",
  },
  {
    id: "image-generator",
    name: "Image Generator",
    category: "Image",
    desc: "Create beautiful images from text prompts.",
    long: "A studio for stills. Prompt, refine and export high-resolution visuals with a glass-first workspace.",
    tone: "violet",
    icon: "image",
  },
  {
    id: "job-finder",
    name: "Job Finder",
    category: "Career",
    desc: "Discover real opportunities and grow your career.",
    long: "Match skills to roles, generate tailored applications and keep a living map of your career experiments.",
    tone: "amber",
    icon: "briefcase",
  },
  {
    id: "voice-studio",
    name: "Voice Studio",
    category: "Audio",
    desc: "Clone tone, narrate scripts and design sonic identities.",
    long: "A quiet lab for voice. Generate narration, brand audio and experimental sound beds.",
    tone: "cyan",
    icon: "mic",
  },
  {
    id: "prompt-lab",
    name: "Prompt Lab",
    category: "Builder",
    desc: "Design, version and share prompt systems.",
    long: "Treat prompts like products. Version them, test them and ship them into other Stacks apps.",
    tone: "indigo",
    icon: "spark",
  },
  {
    id: "brand-kit",
    name: "Brand Kit",
    category: "Design",
    desc: "Generate cohesive identity systems in minutes.",
    long: "Color, type, logo marks and usage rules assembled into a living kit you can export.",
    tone: "rose",
    icon: "palette",
  },
  {
    id: "script-writer",
    name: "Script Writer",
    category: "Writing",
    desc: "Structure stories, ads and product films.",
    long: "From beat sheet to finished script with scene cards and dialogue passes.",
    tone: "sky",
    icon: "pen",
  },
  {
    id: "thumbnail-maker",
    name: "Thumbnail Maker",
    category: "Image",
    desc: "High-contrast covers engineered for clicks.",
    long: "Compose thumbnails with hierarchy, faces and punchy type without leaving the gallery.",
    tone: "pink",
    icon: "image",
  },
  {
    id: "analytics-hub",
    name: "Analytics Hub",
    category: "Business",
    desc: "See how every experiment is performing.",
    long: "A calm control surface for traffic, conversions and content velocity across Stacks products.",
    tone: "lime",
    icon: "chart",
  },
];

export const PREMIUM_TOOLS: StacksTool[] = [
  {
    id: "stacks-engine",
    name: "Stacks Engine",
    category: "Writing",
    desc: "Flagship writer. Long-form you can ship.",
    long: "Brief it once. Get a full piece — article, script, plan, or pack — with structure, voice, and no placeholders.",
    tone: "navy",
    icon: "spark",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 4000,
    outputType: "html",
    systemPrompt:
      "You are Stacks Engine, the flagship writing system for Stacks.ng. Produce complete, production-ready work. Be specific. No placeholders. No preamble. Use the format they asked for.",
    userPromptTemplate:
      "Task: {task}\nAudience: {audience}\nTone: {tone}\nLength: {length}\nFormat: {format}\nLanguage: {language}\nConstraints: {constraints}\nDetails:\n{details}",
    inputs: [
      { name: "task", label: "What to make", type: "text", required: true, placeholder: "e.g. 12-month go-to-market plan" },
      { name: "details", label: "Brief / facts", type: "textarea", required: true, placeholder: "Product, market, constraints" },
      { name: "audience", label: "Audience", type: "text", placeholder: "Who is this for?" },
      { name: "tone", label: "Tone", type: "select", options: ["Professional", "Direct", "Warm", "Authoritative"] },
      { name: "format", label: "Format", type: "select", options: ["Article", "Script", "Memo", "Outline", "Email sequence"] },
      { name: "length", label: "Length", type: "select", options: ["Short", "Standard", "Long-form"] },
      { name: "language", label: "Language", type: "select", options: ["English", "Nigerian English", "Pidgin mix"] },
      { name: "constraints", label: "Must include / avoid", type: "textarea", placeholder: "Must mention X. Avoid jargon." },
    ],
  },
  {
    id: "music-studio",
    name: "Music Generator",
    category: "Audio",
    desc: "Original music beds. Type the vibe. Download WAV.",
    long: "Describe the track. Stacks writes an original instrumental bed — no sample pack — and you download a WAV for film, ads, or product.",
    tone: "cyan",
    icon: "mic",
    kind: "audio",
    premium: true,
    cost: 2,
    systemPrompt: "Compose an original instrumental bed.",
    userPromptTemplate: "Describe: {prompt}\nGenre: {genre}\nMood: {mood}\nBPM: {bpm}\nLength: {seconds}s",
    inputs: [
      { name: "prompt", label: "Describe the music", type: "textarea", required: true, placeholder: "Warm afrobeat bed under a product film, soft percussion, hopeful" },
      { name: "genre", label: "Genre (type it)", type: "text", placeholder: "Afrobeat, amapiano, lo-fi, cinematic…" },
      { name: "mood", label: "Mood", type: "text", placeholder: "Calm, bright, dark, hopeful" },
      { name: "bpm", label: "BPM", type: "text", placeholder: "88" },
      { name: "seconds", label: "Length seconds", type: "select", options: ["6", "8", "10"] },
    ],
  },
  {
    id: "sfx-studio",
    name: "Effects & Sound Generator",
    category: "Audio",
    desc: "Type any sound. Get an original WAV.",
    long: "Write the sound. Do not pick from a list — type car door, cash register, rain on tin, laser, UI click. Stacks synthesises an original WAV from your words.",
    tone: "teal",
    icon: "mic",
    kind: "audio",
    premium: true,
    cost: 1,
    systemPrompt: "Design a short original sound effect from the description.",
    userPromptTemplate: "Sound: {prompt}\nWhere: {space}\nWeight: {intensity}\nLength: {seconds}s",
    inputs: [
      {
        name: "prompt",
        label: "Type the sound you want",
        type: "textarea",
        required: true,
        placeholder: "Heavy car door slam in a concrete parkade, short tail",
      },
      { name: "space", label: "Where it happens", type: "text", placeholder: "Parkade, church, close mic, Lagos street" },
      { name: "intensity", label: "Weight", type: "select", options: ["Soft", "Medium", "Hard", "Huge"] },
      { name: "seconds", label: "Length", type: "select", options: ["0.6", "1.2", "1.6", "2.4", "4"] },
    ],
  },
  {
    id: "cinematic-video",
    name: "Cinematic Video",
    category: "Video",
    desc: "Premium motion. Shot, lens, light — then MP4.",
    long: "Write the shot. Stacks renders a short cinematic clip you can download as MP4.",
    tone: "violet",
    icon: "play",
    kind: "video",
    premium: true,
    cost: 5,
    userPromptTemplate:
      "Scene: {prompt}\nShot: {shot}\nLens: {lens}\nMotion: {motion}\nLight: {light}\nDuration: {duration}",
    inputs: [
      { name: "prompt", label: "Scene", type: "textarea", required: true, placeholder: "A slow push into a Lagos workshop at dusk" },
      { name: "shot", label: "Shot", type: "select", options: ["Wide", "Medium", "Close-up", "Aerial", "Tracking"] },
      { name: "lens", label: "Lens", type: "select", options: ["24mm", "35mm", "50mm", "85mm", "Anamorphic"] },
      { name: "motion", label: "Camera", type: "select", options: ["Locked off", "Slow push", "Handheld", "Gimbal drift"] },
      { name: "light", label: "Light", type: "select", options: ["Golden hour", "Practical night", "Soft studio", "Hard sun"] },
      { name: "duration", label: "Length", type: "select", options: ["6s", "10s"] },
    ],
  },
  {
    id: "image-studio-pro",
    name: "Image Studio Pro",
    category: "Image",
    desc: "Campaign stills. Subject, light, lens, aspect.",
    long: "The paid image lane. Prompt, refine, download PNG. Built for product and campaign stills.",
    tone: "pink",
    icon: "image",
    kind: "image",
    premium: true,
    cost: 3,
    userPromptTemplate:
      "Subject: {prompt}\nLight: {light}\nLens: {lens}\nAspect: {aspect}\nAvoid: {negative}",
    inputs: [
      { name: "prompt", label: "Image brief", type: "textarea", required: true, placeholder: "Matte bottle on wet stone, night city bokeh" },
      { name: "light", label: "Light", type: "select", options: ["Soft daylight", "Hard studio", "Golden hour", "Practical night"] },
      { name: "lens", label: "Lens", type: "select", options: ["35mm", "50mm", "85mm", "Macro"] },
      { name: "aspect", label: "Aspect", type: "select", options: ["1:1", "4:5", "16:9", "9:16"] },
      { name: "negative", label: "Do not include", type: "text", placeholder: "No text, no watermark, no extra hands" },
    ],
  },
  {
    id: "brand-system",
    name: "Brand System",
    category: "Writing",
    desc: "Name, voice, palette notes, and a one-page kit.",
    long: "A full brand starter: positioning, voice, do/don't, sample lines. Production copy you can hand to design.",
    tone: "indigo",
    icon: "palette",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3500,
    userPromptTemplate: "Brand: {name}\nWhat it does: {offer}\nAudience: {audience}\nFeel: {feel}\nRivals: {rivals}",
    inputs: [
      { name: "name", label: "Brand name", type: "text", required: true, placeholder: "Stacks" },
      { name: "offer", label: "What it does", type: "textarea", required: true, placeholder: "Nigerian showroom + generation engine" },
      { name: "audience", label: "Who it's for", type: "text", placeholder: "Founders, studios, operators" },
      { name: "feel", label: "Feel", type: "select", options: ["Quiet premium", "Bold", "Warm", "Technical"] },
      { name: "rivals", label: "Don't sound like", type: "text", placeholder: "Generic SaaS, gold/crimson templates" },
    ],
  },
  {
    id: "pitch-os",
    name: "Pitch OS",
    category: "Business",
    desc: "Investor or client pitch, structured and specific.",
    long: "Problem, product, market, traction, ask. Written like an operator, not a template mill.",
    tone: "amber",
    icon: "briefcase",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3500,
    userPromptTemplate: "Company: {company}\nWhat: {offer}\nTraction: {traction}\nAsk: {ask}\nAudience: {audience}",
    inputs: [
      { name: "company", label: "Company", type: "text", required: true },
      { name: "offer", label: "What you sell", type: "textarea", required: true },
      { name: "traction", label: "Traction / proof", type: "textarea", placeholder: "Numbers, logos, waitlist" },
      { name: "ask", label: "The ask", type: "text", placeholder: "Raise, intro, pilot" },
      { name: "audience", label: "Who hears this", type: "select", options: ["Investor", "Enterprise buyer", "Partner"] },
    ],
  },
  {
    id: "campaign-os",
    name: "Campaign OS",
    category: "Marketing",
    desc: "Hooks, ads, landing, and a 14-day run plan.",
    long: "A campaign you can actually run: hooks, primary text, landing outline, and a two-week calendar.",
    tone: "blue",
    icon: "mail",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3500,
    userPromptTemplate: "Product: {product}\nOffer: {offer}\nChannel: {channel}\nAudience: {audience}\nGoal: {goal}",
    inputs: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "offer", label: "Offer", type: "textarea", required: true, placeholder: "What they get, price, urgency" },
      { name: "channel", label: "Channel", type: "select", options: ["X / Twitter", "Instagram", "Email", "TikTok", "YouTube"] },
      { name: "audience", label: "Audience", type: "text", required: true },
      { name: "goal", label: "Goal", type: "select", options: ["Waitlist", "Sales", "Installs", "Awareness"] },
    ],
  },
  {
    id: "hook-lab",
    name: "Hook Lab",
    category: "Social",
    desc: "Twenty hooks. Different angles. Ready to shoot.",
    long: "Twenty first-lines and visual cues. No recycled 'stop scrolling'. Built for Reels, Shorts, and ads.",
    tone: "rose",
    icon: "chat",
    kind: "chat",
    premium: true,
    cost: 1,
    maxTokens: 2500,
    userPromptTemplate: "Product: {product}\nAudience: {audience}\nPlatform: {platform}\nProof: {proof}",
    inputs: [
      { name: "product", label: "Product / topic", type: "text", required: true },
      { name: "audience", label: "Audience", type: "text", required: true },
      { name: "platform", label: "Platform", type: "select", options: ["TikTok / Reels", "X", "YouTube", "LinkedIn"] },
      { name: "proof", label: "Proof you can show", type: "textarea", placeholder: "A demo, a number, a before/after" },
    ],
  },
  {
    id: "naija-desk",
    name: "Naija Market Desk",
    category: "Africa",
    desc: "Pricing, channels, and copy for Nigerian buyers.",
    long: "How this product should talk, price, and ship in Nigeria. Specific. No tourist copy.",
    tone: "lime",
    icon: "spark",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3000,
    userPromptTemplate: "Product: {product}\nPrice band: {price}\nCity: {city}\nBuyer: {buyer}\nNotes: {notes}",
    inputs: [
      { name: "product", label: "Product", type: "textarea", required: true },
      { name: "price", label: "Price band", type: "text", placeholder: "₦5k–₦25k / $2–$10" },
      { name: "city", label: "Primary city", type: "select", options: ["Lagos", "Abuja", "PH", "Ibadan", "Kano", "Nationwide"] },
      { name: "buyer", label: "Buyer", type: "text", required: true },
      { name: "notes", label: "Constraints", type: "textarea" },
    ],
  },
  {
    id: "thumbnail-director",
    name: "Thumbnail Director",
    category: "Image",
    desc: "Click-worthy stills. Face, object, type space.",
    long: "A thumbnail you can drop on YouTube or a reel cover. High contrast, clear subject, room for type.",
    tone: "pink",
    icon: "image",
    kind: "image",
    premium: true,
    cost: 3,
    userPromptTemplate: "Title idea: {title}\nSubject: {prompt}\nMood: {mood}\nPlatform: {platform}",
    inputs: [
      { name: "title", label: "Title on the thumb", type: "text", required: true, placeholder: "Leave space for these words" },
      { name: "prompt", label: "What we see", type: "textarea", required: true },
      { name: "mood", label: "Mood", type: "select", options: ["Urgent", "Premium", "Curious", "Warm"] },
      { name: "platform", label: "Platform", type: "select", options: ["YouTube 16:9", "Reels 9:16", "Square"] },
    ],
  },
  {
    id: "product-still-pro",
    name: "Product Still Pro",
    category: "Image",
    desc: "Pack shot. Surface, light, crop.",
    long: "A still for a PDP or ad. No lifestyle clutter unless you ask for it.",
    tone: "pink",
    icon: "image",
    kind: "image",
    premium: true,
    cost: 3,
    userPromptTemplate: "Product: {prompt}\nSurface: {surface}\nLight: {light}\nCrop: {crop}",
    inputs: [
      { name: "prompt", label: "Product", type: "textarea", required: true, placeholder: "Matte green bottle, paper label" },
      { name: "surface", label: "Surface", type: "select", options: ["Seamless", "Stone", "Wood", "Wet glass", "Concrete"] },
      { name: "light", label: "Light", type: "select", options: ["Softbox", "Window", "Hard spot", "Night practical"] },
      { name: "crop", label: "Crop", type: "select", options: ["1:1", "4:5", "16:9"] },
    ],
  },
  {
    id: "trailer-cut",
    name: "Trailer Cut",
    category: "Video",
    desc: "A short trailer beat. Tension, then the product.",
    long: "Six to ten seconds: open, turn, land on the product. Built for ads and launches.",
    tone: "violet",
    icon: "play",
    kind: "video",
    premium: true,
    cost: 5,
    userPromptTemplate: "Product: {product}\nOpen: {prompt}\nTurn: {turn}\nEnd card: {end}",
    inputs: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "prompt", label: "Opening image", type: "textarea", required: true },
      { name: "turn", label: "The turn", type: "text", placeholder: "What changes at second 3" },
      { name: "end", label: "End card", type: "text", placeholder: "Logo / line" },
    ],
  },
  {
    id: "voice-bed",
    name: "Voice Bed",
    category: "Audio",
    desc: "A bed under voiceover. Quiet, looping, WAV.",
    long: "Low music that stays out of the way of speech. For explainers and ads.",
    tone: "cyan",
    icon: "mic",
    kind: "audio",
    premium: true,
    cost: 2,
    userPromptTemplate: "Voice topic: {prompt}\nMood: {mood}\nBPM: {bpm}\nLength: {seconds}s",
    inputs: [
      { name: "prompt", label: "What the voice is saying", type: "textarea", required: true, placeholder: "Explainer about a fintech wallet" },
      { name: "mood", label: "Mood", type: "select", options: ["Calm", "Hopeful", "Serious", "Bright"] },
      { name: "bpm", label: "BPM", type: "select", options: ["72", "88", "100"] },
      { name: "seconds", label: "Length", type: "select", options: ["8", "10"] },
    ],
  },
  {
    id: "ad-film-score",
    name: "Ad Film Score",
    category: "Audio",
    desc: "A 6–10s hit for a product film.",
    long: "Short score: in, crest, out. For the last seconds of an ad.",
    tone: "cyan",
    icon: "mic",
    kind: "audio",
    premium: true,
    cost: 2,
    userPromptTemplate: "Film: {prompt}\nGenre: {genre}\nMood: {mood}\nLength: {seconds}s",
    inputs: [
      { name: "prompt", label: "Describe the film", type: "textarea", required: true },
      { name: "genre", label: "Genre", type: "select", options: ["Cinematic", "Afrobeat", "Corporate", "Lo-fi"] },
      { name: "mood", label: "Mood", type: "select", options: ["Triumph", "Quiet", "Hype", "Warm"] },
      { name: "seconds", label: "Length", type: "select", options: ["6", "8", "10"] },
    ],
  },
  {
    id: "landing-os",
    name: "Landing Page OS",
    category: "Marketing",
    desc: "Full landing: headline, proof, sections, FAQs, CTA.",
    long: "A complete landing you can hand to design. Hero, proof, offer, objections, FAQ, and the CTA.",
    tone: "blue",
    icon: "mail",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 4000,
    userPromptTemplate:
      "Product: {product}\nOffer: {offer}\nAudience: {audience}\nProof: {proof}\nObjections: {objections}\nTone: {tone}\nGoal: {goal}",
    inputs: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "offer", label: "Offer", type: "textarea", required: true, placeholder: "What they get, price, urgency" },
      { name: "audience", label: "Who lands here", type: "text", required: true },
      { name: "proof", label: "Proof you can show", type: "textarea", placeholder: "Numbers, logos, quotes" },
      { name: "objections", label: "Objections to kill", type: "textarea" },
      { name: "tone", label: "Tone", type: "select", options: ["Quiet premium", "Direct", "Warm", "Bold"] },
      { name: "goal", label: "Primary CTA", type: "text", placeholder: "Start free, Book demo, Buy" },
    ],
  },
  {
    id: "email-seq-pro",
    name: "Email Sequence Pro",
    category: "Marketing",
    desc: "A 7-mail sequence. Subject, body, why it exists.",
    long: "Seven emails with a job each: welcome, proof, objection, offer, story, urgency, last look.",
    tone: "indigo",
    icon: "mail",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 4000,
    userPromptTemplate:
      "Product: {product}\nOffer: {offer}\nAudience: {audience}\nVoice: {voice}\nProof: {proof}\nLength: {length}",
    inputs: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "offer", label: "The offer", type: "textarea", required: true },
      { name: "audience", label: "List / buyer", type: "text", required: true },
      { name: "voice", label: "Voice", type: "select", options: ["Founder", "Operator", "Warm", "Sharp"] },
      { name: "proof", label: "Proof / stories", type: "textarea" },
      { name: "length", label: "Mails", type: "select", options: ["5", "7", "9"] },
    ],
  },
  {
    id: "sales-page",
    name: "Sales Page",
    category: "Marketing",
    desc: "Long-form sales page. Problem to close.",
    long: "A full sales page: open, problem, stakes, product, proof, offer, guarantee, FAQ, close.",
    tone: "amber",
    icon: "briefcase",
    kind: "chat",
    premium: true,
    cost: 3,
    maxTokens: 4500,
    userPromptTemplate:
      "Product: {product}\nPrice: {price}\nBuyer: {audience}\nPain: {pain}\nPromise: {promise}\nProof: {proof}\nGuarantee: {guarantee}",
    inputs: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "price", label: "Price", type: "text", required: true },
      { name: "audience", label: "Buyer", type: "text", required: true },
      { name: "pain", label: "The pain", type: "textarea", required: true },
      { name: "promise", label: "The promise", type: "textarea", required: true },
      { name: "proof", label: "Proof", type: "textarea" },
      { name: "guarantee", label: "Guarantee", type: "text" },
    ],
  },
  {
    id: "youtube-script",
    name: "YouTube Script Room",
    category: "Social",
    desc: "Hook, beats, B-roll notes, CTA. Ready to shoot.",
    long: "A timed script with visual cues. Hook in 8 seconds. No filler.",
    tone: "rose",
    icon: "play",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3500,
    userPromptTemplate:
      "Title idea: {title}\nTopic: {topic}\nLength: {length}\nAudience: {audience}\nProof on camera: {proof}\nCTA: {cta}",
    inputs: [
      { name: "title", label: "Working title", type: "text", required: true },
      { name: "topic", label: "What the video is", type: "textarea", required: true },
      { name: "length", label: "Length", type: "select", options: ["45s Short", "8 min", "12 min", "18 min"] },
      { name: "audience", label: "Who watches", type: "text", required: true },
      { name: "proof", label: "What we can show", type: "textarea" },
      { name: "cta", label: "End CTA", type: "text" },
    ],
  },
  {
    id: "press-kit",
    name: "Press Kit",
    category: "Writing",
    desc: "Boilerplate, bio, facts, quotes, one-pager.",
    long: "A press kit you can send tonight: boilerplate, founder bio, facts, quotes, and a one-page brief.",
    tone: "navy",
    icon: "pen",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3500,
    userPromptTemplate:
      "Brand: {name}\nWhat it is: {offer}\nFounder: {founder}\nFacts: {facts}\nAudience: {audience}",
    inputs: [
      { name: "name", label: "Brand", type: "text", required: true },
      { name: "offer", label: "What it is", type: "textarea", required: true },
      { name: "founder", label: "Founder note", type: "textarea" },
      { name: "facts", label: "Facts / traction", type: "textarea", required: true },
      { name: "audience", label: "Who this kit is for", type: "select", options: ["Press", "Partners", "Investors"] },
    ],
  },
  {
    id: "offer-architect",
    name: "Offer Architect",
    category: "Business",
    desc: "Name the offer. Stack, price, guarantee.",
    long: "Build the offer: core, bonuses, price ladder, guarantee, who it is not for.",
    tone: "amber",
    icon: "briefcase",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3200,
    userPromptTemplate:
      "Product: {product}\nBuyer: {audience}\nPrice band: {price}\nWhat they fear: {fear}\nWhat you can deliver: {deliver}",
    inputs: [
      { name: "product", label: "Product / service", type: "textarea", required: true },
      { name: "audience", label: "Buyer", type: "text", required: true },
      { name: "price", label: "Price band", type: "text", placeholder: "₦15k / $49 / retainers" },
      { name: "fear", label: "What they fear", type: "textarea" },
      { name: "deliver", label: "What you can actually ship", type: "textarea", required: true },
    ],
  },
  {
    id: "launch-calendar",
    name: "Launch Calendar",
    category: "Marketing",
    desc: "14 or 30 days. Channel, asset, owner.",
    long: "A day-by-day launch calendar. What to post, who it is for, and the asset to make.",
    tone: "blue",
    icon: "chart",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3500,
    userPromptTemplate:
      "Product: {product}\nDate: {date}\nChannels: {channels}\nAudience: {audience}\nAssets we have: {assets}\nDays: {days}",
    inputs: [
      { name: "product", label: "What launches", type: "text", required: true },
      { name: "date", label: "Launch date", type: "text", required: true },
      { name: "channels", label: "Channels", type: "text", placeholder: "X, IG, email, WhatsApp" },
      { name: "audience", label: "Audience", type: "text", required: true },
      { name: "assets", label: "Assets already in hand", type: "textarea" },
      { name: "days", label: "Span", type: "select", options: ["14 days", "30 days"] },
    ],
  },
  {
    id: "research-desk",
    name: "Research Desk",
    category: "Business",
    desc: "Market, rivals, questions, and a brief.",
    long: "A research brief: market shape, rivals, buyer questions, and what to do next. Not a Wikipedia dump.",
    tone: "navy",
    icon: "search",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3500,
    userPromptTemplate:
      "Subject: {topic}\nMarket: {market}\nRivals: {rivals}\nQuestion: {question}\nUse: {use}",
    inputs: [
      { name: "topic", label: "What to research", type: "textarea", required: true },
      { name: "market", label: "Market / city", type: "text", placeholder: "Lagos, US SMB, etc." },
      { name: "rivals", label: "Known rivals", type: "textarea" },
      { name: "question", label: "The decision this informs", type: "textarea", required: true },
      { name: "use", label: "Deliver as", type: "select", options: ["Brief", "Memo", "Slide outline"] },
    ],
  },
  {
    id: "product-spec",
    name: "Product Spec",
    category: "Developer",
    desc: "Problem, users, screens, rules, out of scope.",
    long: "A spec an engineer can build from. Users, screens, states, rules, and what we will not do.",
    tone: "cyan",
    icon: "code",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 4000,
    userPromptTemplate:
      "Product: {product}\nUsers: {users}\nJob: {job}\nConstraints: {constraints}\nOut of scope: {out}",
    inputs: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "users", label: "Users", type: "textarea", required: true },
      { name: "job", label: "Job to be done", type: "textarea", required: true },
      { name: "constraints", label: "Constraints", type: "textarea", placeholder: "Stack, time, budget" },
      { name: "out", label: "Out of scope", type: "textarea" },
    ],
  },
  {
    id: "copy-director",
    name: "Copy Director",
    category: "Writing",
    desc: "One voice. Headlines, body, buttons, errors.",
    long: "A copy system: voice rules, 12 headlines, body, buttons, empty states, errors. One product, one voice.",
    tone: "sky",
    icon: "pen",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3500,
    userPromptTemplate:
      "Product: {product}\nVoice: {voice}\nAudience: {audience}\nSurfaces: {surfaces}\nAvoid: {avoid}",
    inputs: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "voice", label: "Voice in one line", type: "text", required: true },
      { name: "audience", label: "Audience", type: "text", required: true },
      { name: "surfaces", label: "Where copy lives", type: "textarea", placeholder: "Landing, app, emails, ads" },
      { name: "avoid", label: "Words we never use", type: "text" },
    ],
  },
  {
    id: "onboarding-os",
    name: "Onboarding OS",
    category: "Business",
    desc: "First-run screens, empty states, the aha.",
    long: "The first session: screens, copy, empty states, and the moment they get it.",
    tone: "indigo",
    icon: "spark",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3200,
    userPromptTemplate:
      "Product: {product}\nFirst job: {job}\nUser: {audience}\nAha: {aha}\nConstraints: {constraints}",
    inputs: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "job", label: "First job they must complete", type: "textarea", required: true },
      { name: "audience", label: "First-time user", type: "text", required: true },
      { name: "aha", label: "The aha", type: "textarea" },
      { name: "constraints", label: "Constraints", type: "textarea" },
    ],
  },
  {
    id: "pricing-page",
    name: "Pricing Page Copy",
    category: "Business",
    desc: "Tiers, who each is for, FAQ on price.",
    long: "Pricing page copy: three tiers, who each is for, what is included, and the questions people ask before they pay.",
    tone: "amber",
    icon: "briefcase",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 3000,
    userPromptTemplate:
      "Product: {product}\nTiers: {tiers}\nBuyer: {audience}\nInclude: {include}\nObjections: {objections}",
    inputs: [
      { name: "product", label: "Product", type: "text", required: true },
      { name: "tiers", label: "Tiers / prices", type: "textarea", required: true, placeholder: "Free / Pro ₦x / Studio ₦y" },
      { name: "audience", label: "Who pays", type: "text", required: true },
      { name: "include", label: "What each tier must include", type: "textarea" },
      { name: "objections", label: "Price objections", type: "textarea" },
    ],
  },
];


export const TOOLS: StacksTool[] = [...PREMIUM_TOOLS, ...(toolsCatalog as StacksTool[])];

export function isPremiumTool(tool: Pick<StacksTool, "id" | "premium">) {
  return Boolean(tool.premium) || PREMIUM_TOOLS.some((item) => item.id === tool.id);
}

export function toolCost(tool: Pick<StacksTool, "id" | "cost" | "kind" | "premium">) {
  if (tool.cost && tool.cost > 0) return tool.cost;
  if (!isPremiumTool(tool)) return 0;
  if (tool.kind === "video") return 5;
  if (tool.kind === "image") return 3;
  if (tool.kind === "audio") return 2;
  return 1;
}

export const TOOL_FILTERS = [
  "All",
  "Writing",
  "Marketing",
  "Image",
  "Video",
  "Audio",
  "SEO",
  "Social",
  "Business",
  "Developer",
  "Career",
  "Legal",
  "Africa",
] as const;
