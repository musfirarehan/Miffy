import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_CONTEXT_CHARS, MAX_CONTEXT_MESSAGES } from "@/config/chat-api";
import { trimHistory } from "@/features/assistant/prompt";
import {
  isExplicitRemember,
  isSensitive,
  looksPersonal,
  parseAnalysis,
} from "@/features/memories/extraction";
import { buildMemoryQuery } from "@/features/memories/retrieval";
import { chunkForSpeech, cleanForSpeech } from "@/features/voice/speech-text";
import { createRateLimiter } from "@/lib/utilities/rate-limit";

describe("memory gates", () => {
  it("spots messages that may contain a durable fact", () => {
    assert.ok(looksPersonal("Call me Maheera"));
    assert.ok(looksPersonal("I'm studying computer science"));
    assert.ok(looksPersonal("My goal is to ship by June"));
    assert.ok(!looksPersonal("What is the capital of France?"));
  });

  it("detects explicit remember requests", () => {
    assert.ok(isExplicitRemember("Please remember I like oat milk"));
    assert.ok(isExplicitRemember("don't forget my exam is Friday"));
    assert.ok(!isExplicitRemember("I like oat milk"));
  });

  it("never allows sensitive content", () => {
    for (const text of [
      "my password is hunter2",
      "card 4242 4242 4242 4242",
      "ssn 123-45-6789",
      "sk-abcdefghijklmnop1234",
      "I was diagnosed with something",
      "my salary is high",
    ]) {
      assert.ok(isSensitive(text), text);
    }
    assert.ok(!isSensitive("I love baking sourdough"));
  });
});

describe("parseAnalysis", () => {
  const allow = { title: true, memories: true };

  it("parses a good response", () => {
    const out = parseAnalysis(
      'Here: {"title":"Sourdough tips.","memories":[{"category":"interest","content":"Loves baking sourdough"}]}',
      allow,
    );
    assert.equal(out.title, "Sourdough tips");
    assert.deepEqual(out.memories, [{ category: "interest", content: "Loves baking sourdough" }]);
  });

  it("survives malformed output", () => {
    assert.deepEqual(parseAnalysis("not json", allow), { title: null, memories: [] });
    assert.deepEqual(parseAnalysis("{broken", allow), { title: null, memories: [] });
    assert.deepEqual(parseAnalysis("[1,2]", allow), { title: null, memories: [] });
  });

  it("drops sensitive memories, considers at most three, and maps unknown categories to other", () => {
    const out = parseAnalysis(
      JSON.stringify({
        title: "x",
        memories: [
          { category: "tool", content: "Their password is hunter2" },
          { category: "weird", content: "Likes tea" },
          { category: "goal", content: "Wants to learn Rust" },
          { category: "goal", content: "Wants to run a marathon" },
          { category: "goal", content: "Wants to read more" },
        ],
      }),
      allow,
    );
    // Only the first three candidates are considered; the sensitive one is dropped.
    assert.equal(out.memories.length, 2);
    assert.equal(out.memories[0].category, "other");
    assert.ok(out.memories.every((m) => !/password/i.test(m.content)));
  });

  it("respects the allow flags", () => {
    const raw = '{"title":"Hello there","memories":[{"category":"goal","content":"Wants to learn Rust"}]}';
    assert.deepEqual(parseAnalysis(raw, { title: false, memories: false }), {
      title: null,
      memories: [],
    });
  });
});

describe("buildMemoryQuery", () => {
  it("keeps only letters and digits so tsquery operators can't be injected", () => {
    const q = buildMemoryQuery("baking & (sourdough) | !drop; 'tables' -- :*");
    assert.match(q, /^[\p{L}\p{N} |]+$/u);
    assert.ok(q.includes("baking") && q.includes("sourdough"));
  });
  it("de-duplicates, drops stopwords and caps the length", () => {
    assert.equal(buildMemoryQuery("bread bread bread"), "bread");
    assert.equal(buildMemoryQuery("the and for"), "");
    const many = Array.from({ length: 40 }, (_, i) => `word${i}x`).join(" ");
    assert.equal(buildMemoryQuery(many).split(" | ").length, 12);
  });
});

describe("trimHistory", () => {
  const msg = (role: "user" | "assistant", content: string) => ({ role, content });

  it("keeps short conversations whole", () => {
    const h = [msg("user", "a"), msg("assistant", "b"), msg("user", "c")];
    assert.deepEqual(trimHistory(h), h);
  });
  it("caps the number of turns, always keeps the newest, and starts on a user turn", () => {
    const h = Array.from({ length: 100 }, (_, i) => msg(i % 2 === 0 ? "user" : "assistant", `m${i}`));
    h.push(msg("user", "latest"));
    const out = trimHistory(h);
    assert.ok(out.length <= MAX_CONTEXT_MESSAGES + 1);
    assert.equal(out.at(-1)?.content, "latest");
    assert.equal(out[0].role, "user");
  });
  it("enforces the character budget but never drops the newest message", () => {
    const big = "x".repeat(MAX_CONTEXT_CHARS);
    const out = trimHistory([msg("user", big), msg("assistant", big), msg("user", big)]);
    assert.equal(out.length, 1);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit, then blocks with a retry time, then recovers", () => {
    const check = createRateLimiter({ limit: 3, windowMs: 1000 });
    assert.ok(check("a", 0).allowed && check("a", 100).allowed && check("a", 200).allowed);
    const blocked = check("a", 300);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 1);
    assert.ok(check("a", 1001).allowed);
  });
  it("counts each key separately", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1000 });
    assert.ok(check("a", 0).allowed);
    assert.ok(check("b", 0).allowed);
    assert.equal(check("a", 1).allowed, false);
  });
});

describe("speech text", () => {
  it("strips markdown and never reads code or raw URLs", () => {
    const out = cleanForSpeech("**Hi** `x`\n```js\nsecret()\n```\nsee https://example.com/a?b=1 now");
    assert.ok(!out.includes("secret"));
    assert.ok(!out.includes("https"));
    assert.ok(!out.includes("*"));
    assert.ok(out.includes("Hi") && out.includes("link"));
  });
  it("chunks long text under the limit without losing words", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const chunks = chunkForSpeech(text, 200);
    assert.ok(chunks.length > 1 && chunks.every((c) => c.length <= 200));
    assert.equal(chunks.join(" ").replace(/\s+/g, " "), text);
  });
  it("splits a single very long sentence", () => {
    const chunks = chunkForSpeech("word ".repeat(200).trim(), 100);
    assert.ok(chunks.every((c) => c.length <= 100));
    assert.equal(chunkForSpeech("   ").length, 0);
  });
});
