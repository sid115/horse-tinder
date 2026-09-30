import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SwipeStack, { type Card } from "./SwipeStack";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({ swipe: vi.fn().mockResolvedValue({ matched: false, matchId: null }) }));

const card: Card = {
  id: "h1", name: "Duke", breedName: "Thoroughbred", sex: "STALLION", dob: "2015-01-01",
  heightHands: 16, discipline: "RACING", location: "Kentucky", studFee: 5000,
  breedHistory: "Line", sireName: "S", damName: "D", allergies: "None",
  healthIssues: "None", temperament: "Calm", photo: null, ownerName: "Ann",
};

describe("SwipeStack", () => {
  it("renders the first card's details", () => {
    render(<SwipeStack cards={[card]} />);
    expect(screen.getByText(/Duke/)).toBeInTheDocument();
    expect(screen.getByText(/Thoroughbred/)).toBeInTheDocument();
  });
  it("shows the empty state with no cards", () => {
    render(<SwipeStack cards={[]} />);
    expect(screen.getByText(/No more horses/)).toBeInTheDocument();
  });
});
