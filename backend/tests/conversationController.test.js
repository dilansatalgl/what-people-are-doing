const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Conversation = require("../models/Conversation");
const { listConversations } = require("../controllers/conversationController");

const originalFind = Conversation.find;

test.afterEach(() => {
  Conversation.find = originalFind;
});

const buildRes = () => {
  const out = {};
  return {
    status(code) {
      out.statusCode = code;
      return this;
    },
    json(body) {
      out.body = body;
      return this;
    },
    _result: out,
  };
};

const stubFind = (rows) => {
  Conversation.find = () => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    populate() {
      return this;
    },
    lean: async () => rows,
  });
};

test("listConversations: initiator sees 'Anonymous' when creator has not replied", async () => {
  const initiatorId = new mongoose.Types.ObjectId();
  const creatorId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();
  const postId = new mongoose.Types.ObjectId();

  stubFind([
    {
      _id: conversationId,
      post: postId,
      creator: { _id: creatorId, username: "alice" },
      initiator: { _id: initiatorId, username: "bob" },
      creatorRevealed: false,
      lastMessageAt: new Date("2026-05-06T10:00:00.000Z"),
      lastMessagePreview: "hi",
      unreadByCreator: 0,
      unreadByInitiator: 1,
    },
  ]);

  const req = { user: { userId: initiatorId.toString() }, query: {} };
  const res = buildRes();

  await listConversations(req, res);

  assert.equal(res._result.statusCode, 200);
  const thread = res._result.body.threads[0];
  assert.equal(thread.viewerRole, "initiator");
  assert.equal(thread.otherPartyName, "Anonymous");
  assert.equal(thread.creatorRevealed, false);
  assert.equal(thread.unreadCount, 1);
});

test("listConversations: initiator sees real username after creator replies", async () => {
  const initiatorId = new mongoose.Types.ObjectId();
  const creatorId = new mongoose.Types.ObjectId();

  stubFind([
    {
      _id: new mongoose.Types.ObjectId(),
      post: new mongoose.Types.ObjectId(),
      creator: { _id: creatorId, username: "alice" },
      initiator: { _id: initiatorId, username: "bob" },
      creatorRevealed: true,
      lastMessageAt: new Date("2026-05-06T10:00:00.000Z"),
      lastMessagePreview: "hello back",
      unreadByCreator: 0,
      unreadByInitiator: 0,
    },
  ]);

  const req = { user: { userId: initiatorId.toString() }, query: {} };
  const res = buildRes();

  await listConversations(req, res);

  const thread = res._result.body.threads[0];
  assert.equal(thread.viewerRole, "initiator");
  assert.equal(thread.otherPartyName, "alice");
  assert.equal(thread.creatorRevealed, true);
});

test("listConversations: creator always sees initiator's username", async () => {
  const initiatorId = new mongoose.Types.ObjectId();
  const creatorId = new mongoose.Types.ObjectId();

  stubFind([
    {
      _id: new mongoose.Types.ObjectId(),
      post: new mongoose.Types.ObjectId(),
      creator: { _id: creatorId, username: "alice" },
      initiator: { _id: initiatorId, username: "bob" },
      creatorRevealed: false,
      lastMessageAt: new Date("2026-05-06T10:00:00.000Z"),
      lastMessagePreview: "hi",
      unreadByCreator: 1,
      unreadByInitiator: 0,
    },
  ]);

  const req = { user: { userId: creatorId.toString() }, query: {} };
  const res = buildRes();

  await listConversations(req, res);

  const thread = res._result.body.threads[0];
  assert.equal(thread.viewerRole, "creator");
  assert.equal(thread.otherPartyName, "bob");
  assert.equal(thread.unreadCount, 1);
});
