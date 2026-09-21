import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App.jsx";

async function enterAsThabo(user) {
  await user.click(screen.getByTestId("demo-login"));
}

async function finishLesson(user) {
  await user.click(screen.getByRole("button", { name: /^learn$/i }));
  await user.click(screen.getByRole("button", { name: /next slide/i }));
  await user.click(screen.getByRole("button", { name: /next slide/i }));
  await user.click(screen.getByRole("button", { name: /next slide/i }));
  await user.click(screen.getByRole("button", { name: /next slide/i }));
  await user.click(screen.getByRole("button", { name: /i understand/i }));
}

describe("House Money dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts on the login screen", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /continue as thabo/i })).toBeInTheDocument();
    expect(screen.queryByTestId("leftover")).not.toBeInTheDocument();
  });

  it("opens the dashboard after demo login", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    expect(screen.getByTestId("leftover")).toHaveTextContent("R180");
    expect(screen.getByText(/thabo m/i)).toBeInTheDocument();
  });

  it("rejects a bad password", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/email/i), "thabo@imali.za");
    await user.type(screen.getByLabelText(/password/i), "nope");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/incorrect/i);
  });

  it("raises leftover when an extra gig is added", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /add r200 extra gig/i }));
    expect(screen.getByTestId("leftover")).toHaveTextContent("R380");
  });

  it("blocks a paper buy until the lesson is done", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /paper buy/i }));
    await user.click(screen.getByTestId("paper-buy"));
    expect(screen.getByTestId("buy-status")).toHaveTextContent(
      /finish the 60-second lesson/i,
    );
  });

  it("opens a paper position after the lesson", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await finishLesson(user);
    await user.click(screen.getByRole("button", { name: /paper buy/i }));
    await user.click(screen.getByTestId("paper-buy"));
    await user.click(screen.getByTestId("ticket-confirm"));
    expect(screen.getByTestId("buy-status")).toHaveTextContent(/paper position opened/i);
    expect(screen.getByTestId("paper-pnl")).toHaveTextContent(/next week on paper/i);
  });

  it("switches the dashboard into Afrikaans", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.selectOptions(screen.getByTestId("lang-select"), "af");
    expect(screen.getByRole("heading", { name: /die desk, hierdie week/i })).toBeInTheDocument();
    expect(screen.getByText(/^huisgeld$/i)).toBeInTheDocument();
  });

  it("switches into isiXhosa and captioned SASL", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.selectOptions(screen.getByTestId("lang-select"), "xh");
    expect(screen.getByRole("heading", { name: /idesika, kule veki/i })).toBeInTheDocument();
    await user.selectOptions(screen.getByTestId("lang-select"), "sfs");
    expect(screen.getByText(/sasl is visual/i)).toBeInTheDocument();
  });

  it("blocks a guaranteed bitcoin tip", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /^rug check$/i }));
    await user.click(
      screen.getByRole("button", { name: /guaranteed 30% this week/i }),
    );
    expect(screen.getByTestId("scam-status")).toHaveTextContent(/rug-pulled/i);
  });

  it("lights the confidence meter after lesson, buffer, and a rug catch", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    expect(screen.getByTestId("confidence")).toHaveTextContent(/1\/3/);
    expect(screen.getByTestId("confidence")).toHaveTextContent(/ego stays on the bench/i);
    await finishLesson(user);
    await user.click(screen.getByRole("button", { name: /^the desk$/i }));
    await user.click(screen.getByRole("button", { name: /^rug check$/i }));
    await user.click(
      screen.getByRole("button", { name: /guaranteed 30% this week/i }),
    );
    await user.click(screen.getByRole("button", { name: /^the desk$/i }));
    expect(screen.getByTestId("confidence")).toHaveTextContent(/3\/3/);
    expect(screen.getByTestId("confidence")).toHaveTextContent(/you may size/i);
  });

  it("opens FNB rails in order", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /^the pipes$/i }));
    await user.click(screen.getByTestId("rail-shares"));
    expect(screen.getByTestId("rail-status")).toHaveTextContent(/easy zero first/i);
    await user.click(screen.getByTestId("rail-easy"));
    await user.click(screen.getByTestId("rail-wallet"));
    await user.click(screen.getByTestId("rail-shares"));
    expect(screen.getByTestId("rail-status")).toHaveTextContent(/shares zero desk is open/i);
  });

  it("builds a new desk from scratch, not Thabo's tape", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /new here\? open a desk/i }));
    await user.type(screen.getByLabelText(/full name/i), "Yash");
    await user.type(screen.getByLabelText(/email/i), "yash@housemoney.za");
    await user.type(screen.getByLabelText(/password/i), "leftover300");
    await user.click(screen.getByRole("button", { name: /^open a desk$/i }));
    expect(screen.queryByRole("heading", { name: /what's the hustle/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^student$/i })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/city/i), "Durban");
    await user.click(screen.getByTestId("setup-next"));
    await user.type(screen.getByTestId("in-label-0"), "Night shift");
    await user.type(screen.getByTestId("in-amount-0"), "1000");
    await user.click(screen.getByTestId("setup-next"));
    await user.type(screen.getByTestId("out-label-0"), "Rent");
    await user.type(screen.getByTestId("out-amount-0"), "700");
    await user.click(screen.getByTestId("setup-next"));
    expect(screen.getByTestId("setup-leftover")).toHaveTextContent("R300");
    await user.click(screen.getByRole("button", { name: /that's my tape/i }));
    expect(screen.getByTestId("leftover")).toHaveTextContent("R300");
    expect(screen.getByText(/yash/i)).toBeInTheDocument();
    expect(screen.getByText(/durban/i)).toBeInTheDocument();
    expect(screen.getByText(/night shift/i)).toBeInTheDocument();
    expect(screen.queryByText(/taxi gig/i)).not.toBeInTheDocument();
  });

  it("wipes a custom desk so the same email can open again", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /new here\? open a desk/i }));
    await user.type(screen.getByLabelText(/full name/i), "Yash");
    await user.type(screen.getByLabelText(/email/i), "yash@housemoney.za");
    await user.type(screen.getByLabelText(/password/i), "leftover300");
    await user.click(screen.getByRole("button", { name: /^open a desk$/i }));
    await user.type(screen.getByLabelText(/city/i), "Durban");
    await user.click(screen.getByTestId("setup-next"));
    await user.type(screen.getByTestId("in-label-0"), "Night shift");
    await user.type(screen.getByTestId("in-amount-0"), "1000");
    await user.click(screen.getByTestId("setup-next"));
    await user.type(screen.getByTestId("out-label-0"), "Rent");
    await user.type(screen.getByTestId("out-amount-0"), "700");
    await user.click(screen.getByTestId("setup-next"));
    await user.click(screen.getByRole("button", { name: /that's my tape/i }));

    await user.click(screen.getByRole("button", { name: /delete this desk/i }));
    await user.click(screen.getByRole("button", { name: /wipe the desk/i }));

    expect(screen.getByRole("heading", { name: /^open a desk$/i })).toBeInTheDocument();
    expect(screen.queryByText("yash@housemoney.za")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/full name/i), "Yash");
    await user.type(screen.getByLabelText(/email/i), "yash@housemoney.za");
    await user.type(screen.getByLabelText(/password/i), "leftover300");
    await user.click(screen.getByRole("button", { name: /^open a desk$/i }));
    expect(screen.getByRole("heading", { name: /where's the desk/i })).toBeInTheDocument();
  });

  it("keeps saved desks on logout and can remove them from login", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /new here\? open a desk/i }));
    await user.type(screen.getByLabelText(/full name/i), "Yash");
    await user.type(screen.getByLabelText(/email/i), "yash@housemoney.za");
    await user.type(screen.getByLabelText(/password/i), "leftover300");
    await user.click(screen.getByRole("button", { name: /^open a desk$/i }));
    await user.click(screen.getByRole("button", { name: /open another desk/i }));

    expect(screen.getByRole("heading", { name: /saved desks/i })).toBeInTheDocument();
    expect(screen.getByText("yash@housemoney.za")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^remove$/i }));
    expect(screen.queryByText("yash@housemoney.za")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/full name/i), "Yash");
    await user.type(screen.getByLabelText(/email/i), "yash@housemoney.za");
    await user.type(screen.getByLabelText(/password/i), "leftover300");
    await user.click(screen.getByRole("button", { name: /^open a desk$/i }));
    expect(screen.getByRole("heading", { name: /where's the desk/i })).toBeInTheDocument();
  });

  it("does not let Thabo's demo desk get deleted", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    expect(screen.queryByRole("button", { name: /delete this desk/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /open another desk/i }));
    expect(screen.getByRole("heading", { name: /^open a desk$/i })).toBeInTheDocument();
    expect(screen.queryByText("thabo@imali.za")).not.toBeInTheDocument();
  });

  it("sits when Thabo's gig misses this week", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /gig missed this week/i }));
    expect(screen.getByTestId("sit-status")).toHaveTextContent(/sit/i);
    expect(screen.getByTestId("leftover")).not.toHaveTextContent("R180");
    await user.click(screen.getByRole("button", { name: /paper buy/i }));
    await user.click(screen.getByTestId("paper-buy"));
    expect(screen.getByTestId("buy-status")).toHaveTextContent(/sit down/i);
    await user.click(screen.getByRole("button", { name: /^the desk$/i }));
    await user.click(screen.getByRole("button", { name: /gig landed/i }));
    expect(screen.getByTestId("leftover")).toHaveTextContent("R180");
  });

  it("rug-checks a pasted group-chat tip", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /^rug check$/i }));
    await user.type(
      screen.getByTestId("paste-tip"),
      "Bro send Bitcoin now, guaranteed 30% this week",
    );
    await user.click(screen.getByTestId("paste-check"));
    expect(screen.getByTestId("scam-status")).toHaveTextContent(/rug-pulled/i);
  });

  it("opens Nomsa's care tape, not Thabo's taxi leftover", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /continue as nomsa/i }));
    expect(screen.getByTestId("leftover")).toHaveTextContent("R200");
    expect(screen.getByText(/nomsa d/i)).toBeInTheDocument();
    expect(screen.getByText(/tembisa/i)).toBeInTheDocument();
    expect(screen.getByText(/wages/i)).toBeInTheDocument();
    expect(screen.queryByText(/taxi gig/i)).not.toBeInTheDocument();
  });

  it("remembers Thabo's lesson after flatten and log back in", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await finishLesson(user);
    await user.click(screen.getByRole("button", { name: /flatten \/ log out/i }));
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /paper buy/i }));
    await user.click(screen.getByTestId("paper-buy"));
    expect(screen.getByTestId("shares-ticket")).toBeInTheDocument();
    expect(screen.queryByText(/finish the 60-second lesson/i)).not.toBeInTheDocument();
  });

  it("shows a leftover receipt and how this sits inside FNB", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    expect(screen.getByTestId("leftover-receipt")).toHaveTextContent("R180");
    expect(screen.getByTestId("leftover-receipt")).toHaveTextContent(/rent is paid/i);
    await user.click(screen.getByRole("button", { name: /^the pipes$/i }));
    expect(screen.getByRole("heading", { name: /how this lives in fnb/i })).toBeInTheDocument();
    expect(screen.getByText(/leftover lock/i)).toBeInTheDocument();
  });
});
