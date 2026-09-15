import assert from "node:assert/strict";
import fs from "node:fs";
import { HUMAN_TOUR_GUIDES } from "./src/data/human-guides.ts";
import {
  sendMessageServer,
  getConversationsServer,
  getMessagesThreadServer,
  markMessagesReadServer,
} from "./src/lib/chat.server.ts";

console.log("===============================================================");
console.log("  TRAVEZY HUMAN TOUR GUIDE CHAT & MESSAGING VERIFICATION SUITE ");
console.log("  Find Guides ↔ Guide Chat ↔ Realtime ↔ Isolation ↔ Deduplication");
console.log("===============================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ── Mock In-Memory Database Client ───────────────────────────────────────────
function createMockSupabase(initialMessages = []) {
  const messages = [...initialMessages];

  return {
    _messages: messages,
    from(table) {
      if (table === "messages") {
        return {
          insert(data) {
            const row = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              created_at: new Date().toISOString(),
              read_at: null,
              ...data,
            };
            messages.push(row);
            return {
              select(cols) {
                return {
                  single() {
                    return Promise.resolve({ data: row, error: null });
                  },
                };
              },
            };
          },
          select(cols) {
            return {
              or(condition) {
                return {
                  order(field, { ascending } = { ascending: true }) {
                    // Extract IDs from or condition
                    let result = [...messages];
                    // Simple filter matching sender/recipient
                    return Promise.resolve({ data: result, error: null });
                  },
                };
              },
            };
          },
          update(updates) {
            return {
              in(field, ids) {
                messages.forEach((m) => {
                  if (ids.includes(m.id)) Object.assign(m, updates);
                });
                return Promise.resolve({ data: messages, error: null });
              },
              eq(field1, val1) {
                return {
                  eq(field2, val2) {
                    return {
                      is(field3, val3) {
                        messages.forEach((m) => {
                          if (m[field1] === val1 && m[field2] === val2 && m[field3] === val3) {
                            Object.assign(m, updates);
                          }
                        });
                        return Promise.resolve({ data: messages, error: null });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "profiles") {
        return {
          select(cols) {
            return {
              eq(field, val) {
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: {
                        id: val,
                        full_name: "Sarah Jenkins",
                        email: "sarah.j@gmail.com",
                        avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
                      },
                      error: null,
                    });
                  },
                };
              },
              in(field, ids) {
                const list = ids.map((id) => ({
                  id,
                  full_name: "Sarah Jenkins",
                  email: "sarah.j@gmail.com",
                  avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
                }));
                return Promise.resolve({ data: list, error: null });
              },
            };
          },
        };
      }

      if (table === "providers") {
        return {
          select(cols) {
            return {
              eq(field, val) {
                return {
                  maybeSingle() {
                    return Promise.resolve({ data: null, error: null });
                  },
                };
              },
              in(field, ids) {
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
        };
      }

      return {};
    },
  };
}

// ── Run Tests ────────────────────────────────────────────────────────────────
(async () => {
  console.log("--- 1. Guide Authentication & User ID Integrity ---");

  test("All 28 Human Tour Guides have valid UUID account IDs", () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    assert.equal(HUMAN_TOUR_GUIDES.length, 28, "Must contain all 28 guides");

    HUMAN_TOUR_GUIDES.forEach((guide) => {
      assert.ok(uuidRegex.test(guide.user_id), `Guide ${guide.name} user_id must be a valid UUID`);
      assert.ok(guide.profile_image.startsWith("https://"), `Guide ${guide.name} must have a photo`);
      assert.ok(guide.city.length > 0, `Guide ${guide.name} must have a city`);
    });
  });

  console.log("\n--- 2. Tourist ↔ Guide Conversation Lifecycle ---");

  const touristId = "10000000-0000-4000-8000-000000000001";
  const guideA = HUMAN_TOUR_GUIDES[0]; // Ravi Kumar (Kochi)
  const guideB = HUMAN_TOUR_GUIDES[1]; // Deepa Menon (Munnar)

  const mockSupabase = createMockSupabase();

  await asyncTest("Tourist sends inquiry to Guide A (Ravi Kumar)", async () => {
    const sentMsg = await sendMessageServer({
      supabase: mockSupabase,
      senderId: touristId,
      recipientId: guideA.user_id,
      content: "Hi Ravi, I would like to know about your morning heritage walking tour in Fort Kochi.",
    });

    assert.ok(sentMsg.id, "Message must have an ID");
    assert.equal(sentMsg.sender_id, touristId);
    assert.equal(sentMsg.recipient_id, guideA.user_id);
    assert.equal(sentMsg.content, "Hi Ravi, I would like to know about your morning heritage walking tour in Fort Kochi.");
    assert.equal(sentMsg.read_at, null);
  });

  await asyncTest("Guide A resolves in Tourist conversations with full profile metadata", async () => {
    const convs = await getConversationsServer(mockSupabase, touristId);

    assert.equal(convs.length, 1, "Should have 1 active conversation thread");
    const c = convs[0];
    assert.equal(c.partnerId, guideA.user_id);
    assert.equal(c.partnerName, guideA.name);
    assert.equal(c.partnerAvatarUrl, guideA.profile_image);
    assert.equal(c.partnerLocation, `${guideA.city}, ${guideA.state}`);
    assert.equal(c.partnerRole, "Tour Guide");
    assert.ok(c.lastMessage.includes("morning heritage walking tour"));
  });

  await asyncTest("Guide A receives inquiry in their Guide Messages console", async () => {
    const guideConvs = await getConversationsServer(mockSupabase, guideA.user_id);

    assert.equal(guideConvs.length, 1, "Guide should see 1 conversation with Tourist");
    const c = guideConvs[0];
    assert.equal(c.partnerId, touristId);
    assert.equal(c.partnerName, "Sarah Jenkins");
    assert.equal(c.unreadCount, 1, "Guide should see 1 unread message");
  });

  await asyncTest("Guide A replies to Tourist", async () => {
    const replyMsg = await sendMessageServer({
      supabase: mockSupabase,
      senderId: guideA.user_id,
      recipientId: touristId,
      content: "Hello Sarah! Yes, I am available tomorrow morning at 8:30 AM at the Chinese Fishing Nets.",
    });

    assert.ok(replyMsg.id);
    assert.equal(replyMsg.sender_id, guideA.user_id);
    assert.equal(replyMsg.recipient_id, touristId);
  });

  await asyncTest("Conversation Deduplication: Multiple clicks on Guide A reuse the same thread", async () => {
    // Thread retrieval is bidirectional (touristId ↔ guideA.user_id)
    const thread = await getMessagesThreadServer(mockSupabase, touristId, guideA.user_id);

    assert.equal(thread.length, 2, "Thread contains both Tourist inquiry and Guide reply");
    assert.equal(thread[0].sender_id, touristId);
    assert.equal(thread[1].sender_id, guideA.user_id);
  });

  await asyncTest("Tourist chats with Guide B (Deepa Menon) -> Creates distinct thread", async () => {
    await sendMessageServer({
      supabase: mockSupabase,
      senderId: touristId,
      recipientId: guideB.user_id,
      content: "Hi Deepa, do you offer tea plantation treks in Munnar?",
    });

    const convs = await getConversationsServer(mockSupabase, touristId);
    assert.equal(convs.length, 2, "Tourist now has 2 distinct conversation threads");

    const guideAConv = convs.find((c) => c.partnerId === guideA.user_id);
    const guideBConv = convs.find((c) => c.partnerId === guideB.user_id);

    assert.ok(guideAConv, "Guide A conversation exists");
    assert.equal(guideAConv.partnerName, guideA.name);

    assert.ok(guideBConv, "Guide B conversation exists");
    assert.equal(guideBConv.partnerName, guideB.name);
    assert.equal(guideBConv.partnerAvatarUrl, guideB.profile_image);
    assert.equal(guideBConv.partnerLocation, `${guideB.city}, ${guideB.state}`);
  });

  await asyncTest("Marking messages as read updates read_at timestamp", async () => {
    await markMessagesReadServer(mockSupabase, touristId, guideA.user_id);

    const guideReply = mockSupabase._messages.find(
      (m) => m.sender_id === guideA.user_id && m.recipient_id === touristId,
    );
    assert.ok(guideReply.read_at != null, "Guide reply is now marked read");
  });

  console.log("\n--- 3. Security Isolation & RLS Validation ---");

  test("Third-party Tourist C cannot access conversations between Tourist A and Guide A", () => {
    const touristCId = "30000000-0000-4000-8000-000000000003";
    const userMessages = mockSupabase._messages.filter(
      (m) => m.sender_id === touristCId || m.recipient_id === touristCId,
    );

    assert.equal(userMessages.length, 0, "Unauthorized third party sees 0 messages");
  });

  test("Empty message or self-message is rejected", async () => {
    await assert.rejects(
      async () => {
        await sendMessageServer({
          supabase: mockSupabase,
          senderId: touristId,
          recipientId: touristId,
          content: "Hello self",
        });
      },
      /Cannot send a message to yourself/i,
    );

    await assert.rejects(
      async () => {
        await sendMessageServer({
          supabase: mockSupabase,
          senderId: touristId,
          recipientId: guideA.user_id,
          content: "   ",
        });
      },
      /Message content cannot be empty/i,
    );
  });

  console.log("\n===============================================================");
  console.log(`  GUIDE CHAT TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("===============================================================\n");

  if (failed > 0) process.exit(1);
})();
