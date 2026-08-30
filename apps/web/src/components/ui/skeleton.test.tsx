import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "./skeleton";
import { ServiceCardSkeleton, BookingCalendarSkeleton } from "./skeletons";

describe("Skeleton Component", () => {
  it("renders base skeleton with pulse animation class", () => {
    render(<Skeleton data-testid="test-skeleton" className="h-6 w-24" />);
    const el = screen.getByTestId("test-skeleton");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("h-6");
    expect(el.className).toContain("w-24");
  });

  it("renders ServiceCardSkeleton correctly", () => {
    const { container } = render(<ServiceCardSkeleton />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it("renders BookingCalendarSkeleton with 35 grid cells", () => {
    const { container } = render(<BookingCalendarSkeleton />);
    const cells = container.querySelectorAll(".grid-cols-7 .animate-pulse");
    expect(cells.length).toBeGreaterThanOrEqual(35);
  });
});
