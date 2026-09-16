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
    desc: "The flagship writer. Long-form, multi-section, production-ready.",
    long: "The most powerful text engine on Stacks. Brief it once and get a full piece — article, script, plan, or pack — with structure you can ship.",
    tone: "navy",
    icon: "spark",
    kind: "chat",
    premium: true,
    cost: 2,
    maxTokens: 4000,
    outputType: "html",
    systemPrompt:
      "You are Stacks Engine, the flagship writing system for Stacks.ng. Produce complete, production-ready work. Be specific. No placeholders. No preamble.",
    userPromptTemplate:
      "Task: {task}\nAudience: {audience}\nTone: {tone}\nLength: {length}\nDetails:\n{details}",
    inputs: [
      { name: "task", label: "What to make", type: "text", required: true, placeholder: "e.g. 12-month go-to-market plan" },
      { name: "details", label: "Brief / facts", type: "textarea", required: true, placeholder: "Product, market, constraints" },
      { name: "audience", label: "Audience", type: "text", placeholder: "Who is this for?" },
      { name: "tone", label: "Tone", type: "select", options: ["Professional", "Direct", "Warm", "Authoritative"] },
      { name: "length", label: "Length", type: "select", options: ["Short", "Standard", "Long-form"] },
    ],
  },
  {
    id: "music-studio",
    name: "Music Generator",
    category: "Audio",
    desc: "Original music beds you can download as WAV.",
    long: "Describe the mood and genre. Stacks writes an original instrumental bed — no sample pack — and you download a WAV you can drop under a film, ad, or product.",
    tone: "cyan",
    icon: "mic",
    kind: "audio",
    premium: true,
    cost: 2,
    systemPrompt: "Compose an original instrumental bed.",
    userPromptTemplate: "Genre: {genre}\nMood: {mood}\nBPM: {bpm}\nLength: {seconds}s",
    inputs: [
      { name: "genre", label: "Genre", type: "select", required: true, options: ["Ambient", "Cinematic", "Afrobeat", "Lo-fi", "Corporate"] },
      { name: "mood", label: "Mood", type: "select", options: ["Calm", "Bright", "Dark", "Hopeful"] },
      { name: "bpm", label: "BPM", type: "select", options: ["72", "88", "100", "118"] },
      { name: "seconds", label: "Length", type: "select", options: ["6", "8", "10"] },
    ],
  },
  {
    id: "sfx-studio",
    name: "Effects & Sound Generator",
    category: "Audio",
    desc: "Whooshes, hits, notifies, rises — original WAV effects.",
    long: "Pick a type. Stacks synthesises a clean sound effect and you download the WAV. For product films, apps, and ads.",
    tone: "teal",
    icon: "mic",
    kind: "audio",
    premium: true,
    cost: 1,
    systemPrompt: "Design a short original sound effect.",
    userPromptTemplate: "Type: {type}\nLength: {seconds}s",
    inputs: [
      { name: "type", label: "Effect", type: "select", required: true, options: ["whoosh", "click", "hit", "notify", "rise", "ambient"] },
      { name: "seconds", label: "Length", type: "select", options: ["0.6", "1.2", "1.6", "2.4"] },
    ],
  },
  {
    id: "cinematic-video",
    name: "Cinematic Video",
    category: "Video",
    desc: "Premium motion. Describe a scene, get an MP4.",
    long: "The paid video lane. Write the shot. Stacks renders a short cinematic clip you can download as MP4.",
    tone: "violet",
    icon: "play",
    kind: "video",
    premium: true,
    cost: 5,
    inputs: [{ name: "prompt", label: "Scene", type: "textarea", required: true, placeholder: "Describe the shot, light, motion…" }],
  },
  {
    id: "image-studio-pro",
    name: "Image Studio Pro",
    category: "Image",
    desc: "Higher-grade stills for campaigns and product.",
    long: "The paid image lane. Prompt, refine, download PNG. Built for product and campaign stills, not doodles.",
    tone: "pink",
    icon: "image",
    kind: "image",
    premium: true,
    cost: 3,
    inputs: [{ name: "prompt", label: "Image brief", type: "textarea", required: true, placeholder: "Subject, light, lens, setting…" }],
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
