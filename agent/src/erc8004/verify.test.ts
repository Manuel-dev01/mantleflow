import { describe, expect, it } from "vitest";
import { keccak256, stringToHex } from "viem";
import { metadataLogMatches } from "./client.js";

const IDENTITY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
const TOPIC = "0x2c149ed548c6d2993cd73efe187df6eccabe4538091b33adbd25fafdb8a1468b";
const resultHash = "0x2b1d8e948b69aace21e03ef468d9f1a7d960a375d3a3c492b7a949b546b5a546" as const;

const agentTopic = `0x${(309).toString(16).padStart(64, "0")}`;
const keyTopic = keccak256(stringToHex(resultHash));
const goodLog = { address: IDENTITY, topics: [TOPIC, agentTopic, keyTopic] };

describe("metadataLogMatches", () => {
  it("matches the real MetadataSet log (agentId + keccak(resultHash))", () => {
    expect(metadataLogMatches(goodLog, "309", resultHash, IDENTITY)).toBe(true);
  });

  it("rejects a different agentId", () => {
    expect(metadataLogMatches(goodLog, "310", resultHash, IDENTITY)).toBe(false);
  });

  it("rejects a different result hash (tampered)", () => {
    const other = "0x0000000000000000000000000000000000000000000000000000000000000001" as const;
    expect(metadataLogMatches(goodLog, "309", other, IDENTITY)).toBe(false);
  });

  it("rejects a log from another contract", () => {
    expect(metadataLogMatches({ ...goodLog, address: "0xdeadbeef00000000000000000000000000000000" }, "309", resultHash, IDENTITY)).toBe(false);
  });

  it("rejects a log matched against a different registry address", () => {
    expect(metadataLogMatches(goodLog, "309", resultHash, "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432")).toBe(false);
  });

  it("rejects a different event signature", () => {
    expect(metadataLogMatches({ address: IDENTITY, topics: ["0x" + "00".repeat(32), agentTopic, keyTopic] }, "309", resultHash, IDENTITY)).toBe(false);
  });

  it("handles missing topics safely", () => {
    expect(metadataLogMatches({ address: IDENTITY, topics: [] }, "309", resultHash, IDENTITY)).toBe(false);
  });
});
