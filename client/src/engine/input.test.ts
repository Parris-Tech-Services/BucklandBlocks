import test from "node:test";
import assert from "node:assert/strict";
import { createGameInput } from "./input";

test("a quick left click remains queued even after mouseup", () => {
  const input = createGameInput();

  input.mouse(0, true, true);
  input.mouse(0, false, true);

  assert.equal(input.read().mine, false);
  assert.equal(input.hasMousePress("mine"), true);
  assert.equal(input.consumeMousePress("mine"), true);
  assert.equal(input.hasMousePress("mine"), false);
  assert.equal(input.consumeMousePress("mine"), false);
});

test("held left mouse remains active while its discrete press is consumed once", () => {
  const input = createGameInput();

  input.mouse(0, true, true);

  assert.equal(input.read().mine, true);
  assert.equal(input.consumeMousePress("mine"), true);
  assert.equal(input.consumeMousePress("mine"), false);
  assert.equal(input.read().mine, true);

  input.mouse(0, false, true);
  assert.equal(input.read().mine, false);
});

test("inactive clicks are not queued", () => {
  const input = createGameInput();

  input.mouse(0, true, false);
  input.mouse(0, false, false);

  assert.equal(input.read().mine, false);
  assert.equal(input.hasMousePress("mine"), false);
});

test("clear removes held state and queued clicks", () => {
  const input = createGameInput();

  input.mouse(0, true, true);
  input.key("KeyW", true, true);
  input.clear();

  assert.equal(input.read().mine, false);
  assert.equal(input.read().forward, false);
  assert.equal(input.hasMousePress("mine"), false);
});
