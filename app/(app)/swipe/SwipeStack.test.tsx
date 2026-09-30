import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SwipeStack, { type Card } from "./SwipeStack";
import { swipe } from "./actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({ swipe: vi.fn().mockResolvedValue({ matched: false, matchId: null }) }));

const card: Card = {
  id: "h1", name: "Duke", breedName: "Thoroughbred", sex: "STALLION", dob: "2015-01-01",
  heightHands: 16, discipline: "RACING", location: "Kentucky", studFee: 5000,
  breedHistory: "Line", sireName: "S", damName: "D", allergies: "None",
  healthIssues: "None", temperament: "Calm", photo: null, ownerName: "Ann",
};

const card2: Card = { ...card, id: "h2", name: "Bess", breedName: "Arabian" };
const card3: Card = { ...card, id: "h3", name: "Comet", breedName: "Appaloosa" };

const mockedSwipe = vi.mocked(swipe);

beforeEach(() => {
  mockedSwipe.mockReset();
  mockedSwipe.mockResolvedValue({ matched: false, matchId: null });
});

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

  it("advances to the next card on LIKE without skipping", async () => {
    render(<SwipeStack cards={[card, card2, card3]} />);
    expect(screen.getByText(/Duke/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("♥"));

    await waitFor(() => expect(screen.getByText(/Bess/)).toBeInTheDocument());
    expect(screen.queryByText(/Duke/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("♥"));

    await waitFor(() => expect(screen.getByText(/Comet/)).toBeInTheDocument());
    expect(screen.queryByText(/Bess/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("♥"));

    await waitFor(() => expect(screen.getByText(/No more horses/)).toBeInTheDocument());
    expect(mockedSwipe).toHaveBeenCalledTimes(3);
  });

  it("advances on PASS", async () => {
    render(<SwipeStack cards={[card, card2]} />);
    fireEvent.click(screen.getByText("✕"));
    await waitFor(() => expect(screen.getByText(/Bess/)).toBeInTheDocument());
    expect(mockedSwipe).toHaveBeenCalledWith("h1", "PASS");
  });

  it("shows the match banner when swipe reports a match", async () => {
    mockedSwipe.mockResolvedValueOnce({ matched: true, matchId: "m1" });
    render(<SwipeStack cards={[card]} />);
    fireEvent.click(screen.getByText("♥"));
    await waitFor(() => expect(screen.getByText(/It's a match!/)).toBeInTheDocument());
    expect(screen.getByText("Send a message")).toBeInTheDocument();
  });

  it("surfaces an error and does not advance when swipe rejects", async () => {
    mockedSwipe.mockRejectedValueOnce(new Error("Cannot swipe your own horse"));
    render(<SwipeStack cards={[card, card2]} />);
    fireEvent.click(screen.getByText("♥"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText(/Could not record your swipe/)).toBeInTheDocument();
    expect(screen.getByText(/Duke/)).toBeInTheDocument();
  });
});
