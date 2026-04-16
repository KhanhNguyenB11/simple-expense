import { BadRequestException } from "@nestjs/common";
import { ReportStatus } from "../generated/prisma";
import { applyTransition, assertItemsEditable } from "./state-machine";

describe("State Machine — applyTransition", () => {
  it("user can submit a DRAFT report", () => {
    expect(applyTransition(ReportStatus.DRAFT, "submit", "user")).toBe(
      ReportStatus.SUBMITTED,
    );
  });

  it("user can re-submit a REJECTED report directly to SUBMITTED", () => {
    expect(applyTransition(ReportStatus.REJECTED, "submit", "user")).toBe(
      ReportStatus.SUBMITTED,
    );
  });

  it("admin can approve a SUBMITTED report", () => {
    expect(applyTransition(ReportStatus.SUBMITTED, "approve", "admin")).toBe(
      ReportStatus.APPROVED,
    );
  });

  it("admin can reject a SUBMITTED report", () => {
    expect(applyTransition(ReportStatus.SUBMITTED, "reject", "admin")).toBe(
      ReportStatus.REJECTED,
    );
  });

  it("throws when user tries to approve", () => {
    expect(() =>
      applyTransition(ReportStatus.SUBMITTED, "approve", "user"),
    ).toThrow(BadRequestException);
  });

  it("throws when admin tries to submit", () => {
    expect(() =>
      applyTransition(ReportStatus.DRAFT, "submit", "admin"),
    ).toThrow(BadRequestException);
  });

  it("throws when approving an already APPROVED report (terminal state)", () => {
    expect(() =>
      applyTransition(ReportStatus.APPROVED, "approve", "admin"),
    ).toThrow(BadRequestException);
  });

  it("throws when submitting a SUBMITTED report", () => {
    expect(() =>
      applyTransition(ReportStatus.SUBMITTED, "submit", "user"),
    ).toThrow(BadRequestException);
  });

  it("throws when rejecting a DRAFT report", () => {
    expect(() =>
      applyTransition(ReportStatus.DRAFT, "reject", "admin"),
    ).toThrow(BadRequestException);
  });
});

describe("State Machine — assertItemsEditable", () => {
  it("allows edits in DRAFT", () => {
    expect(() => assertItemsEditable(ReportStatus.DRAFT)).not.toThrow();
  });

  it("allows edits in REJECTED", () => {
    expect(() => assertItemsEditable(ReportStatus.REJECTED)).not.toThrow();
  });

  it("blocks edits in SUBMITTED", () => {
    expect(() => assertItemsEditable(ReportStatus.SUBMITTED)).toThrow(
      BadRequestException,
    );
  });

  it("blocks edits in APPROVED", () => {
    expect(() => assertItemsEditable(ReportStatus.APPROVED)).toThrow(
      BadRequestException,
    );
  });
});
