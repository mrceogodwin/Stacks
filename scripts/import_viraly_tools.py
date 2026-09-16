#!/usr/bin/env python3
"""Parse Viraly PHP tool definitions into src/lib/tools-catalog.json."""
from __future__ import annotations

import json
import re
from pathlib import Path

PHP = Path("/tmp/viraly-plugin/viraly-core/includes/class-viraly-tool-definitions-master.php")
OUT = Path("/workspace/src/lib/tools-catalog.json")

CAT_MAP = {
    "content": "Writing",
    "creative": "Writing",
    "email": "Marketing",
    "marketing": "Marketing",
    "seo": "SEO",
    "social": "Social",
    "business": "Business",
    "finance": "Business",
    "ecommerce": "Business",
    "legal": "Legal",
    "tech": "Developer",
    "video": "Video",
    "career": "Career",
    "education": "Career",
    "african": "Africa",
}

TONE = {
    "Writing": "sky",
    "Marketing": "blue",
    "Image": "pink",
    "Video": "violet",
    "SEO": "orange",
    "Social": "indigo",
    "Business": "amber",
    "Developer": "cyan",
    "Career": "amber",
    "Legal": "navy",
    "Africa": "lime",
}

ICON = {
    "Writing": "pen",
    "Marketing": "mail",
    "Image": "image",
    "Video": "play",
    "SEO": "search",
    "Social": "chat",
    "Business": "briefcase",
    "Developer": "code",
    "Career": "briefcase",
    "Legal": "briefcase",
    "Africa": "spark",
}

MEDIA = [
    {
        "id": "image-gen",
        "name": "Image Generator",
        "category": "Image",
        "desc": "Create stunning images from a text prompt.",
        "long": "Prompt, refine and export stills as PNG.",
        "kind": "image",
        "outputType": "image",
        "maxTokens": 0,
        "systemPrompt": "Create a high-quality image from the user's brief.",
        "userPromptTemplate": "{prompt}",
        "inputs": [
            {"name": "prompt", "label": "Describe the image", "type": "textarea", "required": True, "placeholder": "A product photo on mint glass, soft daylight", "options": []}
        ],
    },
    {
        "id": "product-photo",
        "name": "Product Photographer",
        "category": "Image",
        "desc": "Stage products in cinematic lighting.",
        "long": "Place a product in a studio, loft or outdoor set without a shoot day.",
        "kind": "image",
        "outputType": "image",
        "maxTokens": 0,
        "systemPrompt": "Create a cinematic product photograph from the brief.",
        "userPromptTemplate": "{prompt}",
        "inputs": [
            {"name": "prompt", "label": "Product and setting", "type": "textarea", "required": True, "placeholder": "Matte black headphones on wet concrete, night city bokeh", "options": []}
        ],
    },
    {
        "id": "logo-forge",
        "name": "Logo Forge",
        "category": "Image",
        "desc": "Explore mark directions from a short brief.",
        "long": "Wordmarks and symbols you can take into a brand kit.",
        "kind": "image",
        "outputType": "image",
        "maxTokens": 0,
        "systemPrompt": "Design a clean logo mark from the brief. Flat, high contrast, no mockups.",
        "userPromptTemplate": "{prompt}",
        "inputs": [
            {"name": "prompt", "label": "Brand and direction", "type": "textarea", "required": True, "placeholder": "Stacks — geometric S mark, emerald on white", "options": []}
        ],
    },
    {
        "id": "video-gen",
        "name": "Video Generator",
        "category": "Video",
        "desc": "Turn ideas into videos with AI.",
        "long": "Describe a scene and get a short cinematic clip.",
        "kind": "video",
        "outputType": "video",
        "maxTokens": 0,
        "systemPrompt": "Produce a short cinematic video from the brief.",
        "userPromptTemplate": "{prompt}",
        "inputs": [
            {"name": "prompt", "label": "Describe the video", "type": "textarea", "required": True, "placeholder": "A slow push into a Lagos workshop at dusk, warm practical lights", "options": []}
        ],
    },
    {
        "id": "reel-cutter",
        "name": "Reel Cutter",
        "category": "Video",
        "desc": "Slice long footage ideas into social-ready clips.",
        "long": "Find beats, crop for vertical and export with captions.",
        "kind": "video",
        "outputType": "video",
        "maxTokens": 0,
        "systemPrompt": "Produce a vertical social clip from the brief.",
        "userPromptTemplate": "{prompt}",
        "inputs": [
            {"name": "prompt", "label": "Clip idea", "type": "textarea", "required": True, "placeholder": "9:16 hook: a barista pour, cut on the beat, end on the cup", "options": []}
        ],
    },
    {
        "id": "subtitle-engine",
        "name": "Subtitle Engine",
        "category": "Video",
        "desc": "Burn captions into a generated clip.",
        "long": "Describe the scene and the words on screen.",
        "kind": "video",
        "outputType": "video",
        "maxTokens": 0,
        "systemPrompt": "Produce a captioned short from the brief.",
        "userPromptTemplate": "{prompt}",
        "inputs": [
            {"name": "prompt", "label": "Scene and caption text", "type": "textarea", "required": True, "placeholder": "Talking-head kitchen, caption: Home food, Lagos speed.", "options": []}
        ],
    },
]


def skip_ws(s: str, i: int) -> int:
    while i < len(s) and s[i] in " \t\r\n":
        i += 1
    return i


def parse_string(s: str, i: int) -> tuple[str, int]:
    q = s[i]
    i += 1
    out: list[str] = []
    while i < len(s):
        ch = s[i]
        if ch == "\\" and i + 1 < len(s):
            nxt = s[i + 1]
            out.append({"n": "\n", "t": "\t", "r": "\r", "'": "'", '"': '"', "\\": "\\"}.get(nxt, nxt))
            i += 2
            continue
        if ch == q:
            return "".join(out), i + 1
        out.append(ch)
        i += 1
    raise ValueError("unterminated string")


def parse_value(s: str, i: int):
    i = skip_ws(s, i)
    if i >= len(s):
        raise ValueError("eof")
    if s.startswith("self::i(", i) or s.startswith("self::t(", i):
        name = "i" if s.startswith("self::i(", i) else "t"
        args, j = parse_call_args(s, i + len(f"self::{name}("))
        return ("call", name, args), j
    if s[i] in "'\"":
        val, j = parse_string(s, i)
        return val, j
    if s.startswith("array(", i):
        items, j = parse_call_args(s, i + 6)
        return items, j
    if s.startswith("true", i) and (i + 4 == len(s) or not s[i + 4].isalnum()):
        return True, i + 4
    if s.startswith("false", i) and (i + 5 == len(s) or not s[i + 5].isalnum()):
        return False, i + 5
    m = re.match(r"-?\d+", s[i:])
    if m:
        return int(m.group()), i + m.end()
    raise ValueError(f"bad value at {s[i:i+40]!r}")


def parse_call_args(s: str, i: int) -> tuple[list, int]:
    args = []
    i = skip_ws(s, i)
    if i < len(s) and s[i] == ")":
        return args, i + 1
    while i < len(s):
        val, i = parse_value(s, i)
        args.append(val)
        i = skip_ws(s, i)
        if i < len(s) and s[i] == ",":
            i += 1
            continue
        if i < len(s) and s[i] == ")":
            return args, i + 1
        raise ValueError(f"expected comma or ) at {s[i:i+40]!r}")
    raise ValueError("unterminated args")


def input_from_i(args: list) -> dict:
    name = args[0] if args else "field"
    label = args[1] if len(args) > 1 else name
    typ = args[2] if len(args) > 2 else "text"
    required = bool(args[3]) if len(args) > 3 else False
    placeholder = args[4] if len(args) > 4 and isinstance(args[4], str) else ""
    options = args[5] if len(args) > 5 and isinstance(args[5], list) else []
    options = [o for o in options if isinstance(o, str)]
    return {
        "name": name,
        "label": label,
        "type": typ if typ in ("text", "textarea", "select", "url") else "text",
        "required": required,
        "placeholder": placeholder,
        "options": options,
    }


def inputs_from_args(raw) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out = []
    for item in raw:
        if isinstance(item, tuple) and item[0] == "call" and item[1] == "i":
            out.append(input_from_i(item[2]))
        elif isinstance(item, dict):
            out.append(item)
    return out


def finish_tool(raw: dict) -> dict:
    viraly_cat = raw["category"]
    category = CAT_MAP.get(viraly_cat, "Writing")
    return {
        "id": raw["id"],
        "name": raw["name"],
        "category": category,
        "desc": raw["desc"][:220],
        "long": raw["desc"],
        "tone": TONE.get(category, "navy"),
        "icon": ICON.get(category, "spark"),
        "kind": "chat",
        "outputType": raw.get("outputType") or "text",
        "maxTokens": int(raw.get("maxTokens") or 1500),
        "systemPrompt": raw["systemPrompt"],
        "userPromptTemplate": raw["userPromptTemplate"],
        "inputs": raw["inputs"],
        "tag": raw.get("tag") or "ai",
    }


def parse_t(args: list) -> dict | None:
    if len(args) < 10:
        return None
    slug, name, _icon, category, tag, _plan, desc = args[:7]
    inputs = inputs_from_args(args[7])
    system = args[8] if isinstance(args[8], str) else ""
    template = args[9] if isinstance(args[9], str) else ""
    output = args[10] if len(args) > 10 and isinstance(args[10], str) else "text"
    tokens = args[11] if len(args) > 11 and isinstance(args[11], int) else 1500
    return finish_tool(
        {
            "id": slug,
            "name": name,
            "category": category,
            "desc": desc,
            "tag": tag,
            "systemPrompt": system,
            "userPromptTemplate": template.replace("\\n", "\n"),
            "outputType": output,
            "maxTokens": tokens,
            "inputs": inputs,
        }
    )


def fill_tool(row: list[str], sort: int) -> dict:
    slug, name, _icon, category, tag, _plan, desc = row
    otype = "html" if category in ("legal", "tech", "finance", "business") else "text"
    sys = (
        f"You are an expert specialist in {name.lower()}. {desc} "
        "Produce complete, high-quality, production-ready output. Be specific and thorough. "
        "Never use placeholder text or say insert here. Deliver work that can be used immediately. "
        "Output ONLY the final content — no markdown fences, no preamble."
    )
    return finish_tool(
        {
            "id": slug,
            "name": name,
            "category": category,
            "desc": desc,
            "tag": tag,
            "systemPrompt": sys,
            "userPromptTemplate": f"Create: {name}\nDetails: {{topic}}\nContext: {{context}}\nTone: {{tone}}\nAudience: {{target_audience}}",
            "outputType": otype,
            "maxTokens": 1500,
            "inputs": [
                {
                    "name": "topic",
                    "label": "Topic or key details",
                    "type": "textarea",
                    "required": True,
                    "placeholder": "Describe what you need — the more detail, the better the output",
                    "options": [],
                },
                {
                    "name": "context",
                    "label": "Context or goal",
                    "type": "text",
                    "required": False,
                    "placeholder": "Brand name, background, or extra context",
                    "options": [],
                },
                {
                    "name": "tone",
                    "label": "Tone",
                    "type": "select",
                    "required": False,
                    "placeholder": "",
                    "options": [
                        "Professional",
                        "Conversational",
                        "Bold and direct",
                        "Friendly",
                        "Authoritative",
                        "Casual and fun",
                    ],
                },
                {
                    "name": "target_audience",
                    "label": "Target audience",
                    "type": "text",
                    "required": False,
                    "placeholder": "Who is this for?",
                    "options": [],
                },
            ],
        }
    )


def main() -> None:
    src = PHP.read_text(encoding="utf-8")
    tools: list[dict] = []
    seen: set[str] = set()

    def add(t: dict) -> None:
        if t["id"] in seen:
            return
        seen.add(t["id"])
        tools.append(t)

    for m in MEDIA:
        add({**m, "tone": TONE[m["category"]], "icon": ICON[m["category"]], "tag": "flagship"})

    i = 0
    while True:
        j = src.find("self::t(", i)
        if j < 0:
            break
        try:
            args, k = parse_call_args(src, j + len("self::t("))
            parsed = parse_t(args)
            if parsed:
                add(parsed)
            i = k
        except ValueError as e:
            print("skip t at", j, e)
            i = j + 8

    fill_block = src.split("$fill_tools = array(", 1)
    if len(fill_block) == 2:
        body = fill_block[1]
        end = body.find("        );")
        body = body[:end]
        pattern = re.compile(
            r"array\(\s*'([a-z0-9-]+)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'((?:\\'|[^'])*)'\s*\)",
            re.S,
        )
        n = 0
        for m in pattern.finditer(body):
            row = [m.group(1), m.group(2).replace("\\'", "'"), m.group(3), m.group(4), m.group(5), m.group(6), m.group(7).replace("\\'", "'")]
            add(fill_tool(row, 51 + n))
            n += 1
        print("fill tools parsed", n)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(tools, ensure_ascii=False, indent=2))
    cats: dict[str, int] = {}
    for t in tools:
        cats[t["category"]] = cats.get(t["category"], 0) + 1
    print("wrote", OUT, "count", len(tools), "cats", cats)


if __name__ == "__main__":
    main()
