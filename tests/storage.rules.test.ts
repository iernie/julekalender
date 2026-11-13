import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { ALICE, BOB, newTestEnvironment, seed } from "./helpers";

let env: RulesTestEnvironment;

const png = (bytes = 8) =>
  new Uint8Array(bytes).fill(1) as unknown as Uint8Array<ArrayBuffer>;
const PNG = { contentType: "image/png" };

beforeAll(async () => {
  env = await newTestEnvironment();
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearStorage();
  await env.clearFirestore();
  await seed(env, { calendarId: "kontoret", owner: ALICE });
});

describe("avatars", () => {
  it("are world readable", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), "avatars/1.png"), png(), PNG);
    });
    await assertSucceeds(
      getBytes(ref(env.unauthenticatedContext().storage(), "avatars/1.png"))
    );
  });

  it("cannot be overwritten", async () => {
    await assertFails(
      uploadBytes(
        ref(env.authenticatedContext(ALICE).storage(), "avatars/1.png"),
        png(),
        PNG
      )
    );
  });
});

describe("calendar uploads", () => {
  it("lets the calendar owner upload an avatar", async () => {
    await assertSucceeds(
      uploadBytes(
        ref(env.authenticatedContext(ALICE).storage(), "kontoret/user-1"),
        png(),
        PNG
      )
    );
  });

  it("stops a stranger uploading to someone else's calendar", async () => {
    await assertFails(
      uploadBytes(
        ref(env.authenticatedContext(BOB).storage(), "kontoret/user-1"),
        png(),
        PNG
      )
    );
  });

  it("stops an unauthenticated upload", async () => {
    await assertFails(
      uploadBytes(
        ref(env.unauthenticatedContext().storage(), "kontoret/user-1"),
        png(),
        PNG
      )
    );
  });

  it("rejects non-image content types", async () => {
    await assertFails(
      uploadBytes(
        ref(env.authenticatedContext(ALICE).storage(), "kontoret/user-1"),
        png(),
        { contentType: "application/pdf" }
      )
    );
  });

  it("rejects files over 2 MB", async () => {
    await assertFails(
      uploadBytes(
        ref(env.authenticatedContext(ALICE).storage(), "kontoret/user-1"),
        png(2 * 1024 * 1024 + 1),
        PNG
      )
    );
  });
});

describe("everything else", () => {
  it("is denied", async () => {
    await assertFails(
      uploadBytes(
        ref(env.authenticatedContext(ALICE).storage(), "random/path/file.png"),
        png(),
        PNG
      )
    );
  });
});
