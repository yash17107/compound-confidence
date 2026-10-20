import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("Compound Confidence dashboard", () => {
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

  it("blocks leftover into investments until the lesson is done", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /^allocate$/i }));
    expect(screen.getByTestId("split-status")).toHaveTextContent(
      /finish the 60-second lesson/i,
    );
  });

  it("lets leftover into investments after the lesson, inside the cap", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await finishLesson(user);
    await user.click(screen.getByRole("button", { name: /^the desk$/i }));
    await user.click(screen.getByRole("button", { name: /^allocate$/i }));
    const invest = screen.getByLabelText(/move to investments/i);
    await user.clear(invest);
    await user.type(invest, "40");
    expect(screen.queryByTestId("split-status")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^the desk$/i }));
    expect(screen.getByTestId("confidence")).toHaveTextContent(/3\/3/);
    expect(screen.getByTestId("confidence")).toHaveTextContent(/you may size/i);
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

  it("lights the confidence meter after the lesson and sizing inside the cap", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    expect(screen.getByTestId("confidence")).toHaveTextContent(/1\/3/);
    expect(screen.getByTestId("confidence")).toHaveTextContent(/ego stays on the bench/i);
    await finishLesson(user);
    await user.click(screen.getByRole("button", { name: /^the desk$/i }));
    expect(screen.getByTestId("confidence")).toHaveTextContent(/2\/3/);
  });

  it("opens Accounts with main, savings and investments", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getAllByRole("button", { name: /^accounts$/i })[0]);
    expect(screen.getByRole("heading", { name: /^your accounts$/i })).toBeInTheDocument();
    expect(screen.getByTestId("account-page-main")).toHaveTextContent("R180");
    expect(screen.getByTestId("account-page-savings")).toHaveTextContent("R760");
    expect(screen.getByTestId("account-page-invest")).toHaveTextContent("R0");
    expect(screen.getByText(/how this lives in fnb/i)).toBeInTheDocument();
    expect(screen.getByText(/leftover lock/i)).toBeInTheDocument();
  });

  it("opens an account with 30 days of transactions and moves money", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByTestId("account-main"));
    const detail = screen.getByTestId("account-detail-main");
    expect(within(detail).getByTestId("detail-balance")).toHaveTextContent("R180");
    expect(within(detail).getAllByTestId("tx-row").length).toBeGreaterThan(5);
    expect(within(detail).getAllByText(/to savings/i).length).toBeGreaterThan(0);

    await user.type(within(detail).getByLabelText(/amount/i), "100");
    await user.click(within(detail).getByRole("button", { name: /^move$/i }));
    expect(screen.getByTestId("move-status")).toHaveTextContent(/moved r100 to savings/i);
    expect(screen.getByTestId("detail-balance")).toHaveTextContent("R80");

    await user.click(screen.getByRole("tab", { name: /^savings$/i }));
    const savings = screen.getByTestId("account-detail-savings");
    expect(within(savings).getByTestId("detail-balance")).toHaveTextContent("R860");
    expect(within(savings).getAllByTestId("tx-row")[0]).toHaveTextContent(/from main.*\+R100/i);

    await user.click(within(savings).getByRole("button", { name: /all accounts/i }));
    expect(screen.getByTestId("account-page-savings")).toHaveTextContent("R860");
  });

  it("blocks moving more than the balance", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByTestId("account-main"));
    await user.type(screen.getByLabelText(/amount/i), "5000");
    await user.click(screen.getByRole("button", { name: /^move$/i }));
    expect(screen.getByTestId("move-status")).toHaveTextContent(/not enough/i);
    expect(screen.getByTestId("detail-balance")).toHaveTextContent("R180");
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
    await user.click(screen.getByRole("button", { name: /^allocate$/i }));
    expect(screen.getByTestId("split-status")).toHaveTextContent(/sit down/i);
    await user.click(screen.getByRole("button", { name: /^the desk$/i }));
    await user.click(screen.getByRole("button", { name: /gig landed/i }));
    expect(screen.getByTestId("leftover")).toHaveTextContent("R180");
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
    await user.click(screen.getByRole("button", { name: /^allocate$/i }));
    expect(screen.queryByText(/finish the 60-second lesson/i)).not.toBeInTheDocument();
  });

  it("resets Thabo's packed week after an extra gig", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /add r200 extra gig/i }));
    expect(screen.getByTestId("leftover")).toHaveTextContent("R380");
    await user.click(screen.getByRole("button", { name: /reset this week/i }));
    expect(screen.getByTestId("leftover")).toHaveTextContent("R180");
    expect(screen.getByRole("heading", { name: /show a judge this/i })).toBeInTheDocument();
  });

  it("shows a leftover receipt and how this sits inside FNB", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    expect(screen.getByTestId("leftover-receipt")).toHaveTextContent("R180");
    expect(screen.getByTestId("leftover-receipt")).toHaveTextContent(/rent is paid/i);
    await user.click(screen.getAllByRole("button", { name: /^accounts$/i })[0]);
    expect(screen.getByRole("heading", { name: /how this lives in fnb/i })).toBeInTheDocument();
    expect(screen.getByText(/leftover lock/i)).toBeInTheDocument();
  });

  it("predicts next week from Thabo's history and caps the paper buy", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    expect(screen.getByTestId("forecast-call")).toHaveTextContent(/size lightly/i);
    expect(screen.getByTestId("forecast-odds")).toHaveTextContent(/4 of the last 6 weeks/i);
    expect(screen.getByTestId("forecast-cap")).toHaveTextContent(/cap next week: R40/i);
    await user.click(screen.getByRole("button", { name: /^allocate$/i }));
    expect(screen.getByTestId("invest-forecast")).toHaveTextContent("R40");
  });

  it("learns from a closed ugly week and tells Thabo to sit next week", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /gig missed this week/i }));
    await user.click(screen.getByTestId("close-week"));
    expect(screen.getByTestId("week-closed")).toBeInTheDocument();
    expect(screen.getByTestId("forecast-call")).toHaveTextContent(/sit next week/i);
    expect(screen.getByTestId("forecast-odds")).toHaveTextContent(/4 of the last 7 weeks/i);
    expect(screen.getByTestId("leftover")).toHaveTextContent("R180");
  });

  it("answers on the phone when the coach server is unreachable", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /^ask the desk$/i }));
    await user.click(screen.getByRole("button", { name: /can i invest this week/i }));
    const chat = screen.getByTestId("coach-chat");
    expect(await within(chat).findByText(/cap investments at R40/i)).toBeInTheDocument();
    expect(within(chat).getByText(/offline/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("sends the desk to the Python coach and shows the AI reply", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, reply: "Size lightly, bru. R40 max.", source: "ai" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /^ask the desk$/i }));
    await user.type(screen.getByPlaceholderText(/ask about your money/i), "Ngingatshala?");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    expect(await screen.findByText(/size lightly, bru/i)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/coach");
    const body = JSON.parse(init.body);
    expect(body.question).toBe("Ngingatshala?");
    expect(body.desk.history).toHaveLength(6);
    vi.unstubAllGlobals();
  });

  it("shows main, savings and investment accounts and settles a good week", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    expect(screen.getByTestId("account-main")).toHaveTextContent("R180");
    expect(screen.getByTestId("account-savings")).toHaveTextContent("R760");
    expect(screen.getByTestId("account-invest")).toHaveTextContent("R0");
    expect(screen.getByTestId("account-savings")).toHaveTextContent(/after this week: R810/i);
    await user.click(screen.getByTestId("close-week"));
    expect(screen.getByTestId("account-main")).toHaveTextContent("R310");
    expect(screen.getByTestId("account-savings")).toHaveTextContent("R810");
    expect(screen.getByTestId("account-invest")).toHaveTextContent("R0");
    expect(screen.getByTestId("week-moves")).toHaveTextContent(/moved R50 to savings/i);
  });

  it("lets savings pay the rent in a missed week", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /gig missed this week/i }));
    await user.click(screen.getByTestId("close-week"));
    expect(screen.getByTestId("week-moves")).toHaveTextContent(/savings covered R710/i);
    expect(screen.getByTestId("week-moves")).toHaveTextContent(/rent still got paid/i);
    expect(screen.getByTestId("account-savings")).toHaveTextContent("R50");
  });

  it("moves leftover into investments when the week closes after the lesson", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await finishLesson(user);
    await user.click(screen.getByRole("button", { name: /^the desk$/i }));
    await user.click(screen.getByTestId("close-week"));
    expect(screen.getByTestId("account-invest")).toHaveTextContent("R40");
    expect(screen.getByTestId("account-savings")).toHaveTextContent("R810");
  });

  it("shows safe-to-spend and the next bills on the desk", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    const safe = screen.getByTestId("safe-spend");
    expect(within(safe).getByTestId("safe-amount")).toHaveTextContent(/^R\d+$/);
    expect(within(safe).getByText(/days to payday/i)).toBeInTheDocument();
    expect(screen.getByTestId("flex-strip")).toHaveTextContent(/tracker/i);
  });

  it("flags bills a missed week can't cover", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /^this week$/i }));
    const calendar = screen.getByTestId("bill-calendar");
    expect(calendar.querySelectorAll(".bill.short")).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: /gig missed this week/i }));
    expect(screen.getByTestId("bill-calendar").querySelectorAll(".bill.short").length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText(/^rent.* due day$/i), "3");
    expect(screen.getByTestId("bill-rent")).toHaveTextContent(/wed/i);
  });

  it("levels up, tracks goals and projects compound growth", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByRole("button", { name: /^goals & flex$/i }));
    expect(screen.getByTestId("flex-level")).toHaveTextContent(/tracker/i);
    expect(screen.getByTestId("flex-streak")).toHaveTextContent("6");
    expect(screen.getByTestId("badge-lesson")).not.toHaveClass("on");

    const rows = screen.getAllByTestId("goal-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/R760 \/ R2.?800/);
    expect(rows[1]).toHaveTextContent(/finish the lesson/i);

    const form = screen.getByTestId("goal-form");
    await user.type(within(form).getByPlaceholderText(/school shoes/i), "School shoes");
    await user.type(within(form).getByPlaceholderText("R0"), "600");
    await user.click(within(form).getByRole("button", { name: /add goal/i }));
    expect(screen.getAllByTestId("goal-row")).toHaveLength(3);
    expect(screen.getAllByTestId("goal-row")[2]).toHaveTextContent(/school shoes/i);
    await user.click(screen.getByRole("button", { name: /remove school shoes/i }));
    expect(screen.getAllByTestId("goal-row")).toHaveLength(2);

    expect(screen.getByTestId("milestone-10")).toHaveTextContent(/R\d/);
    await user.click(screen.getByRole("radio", { name: /strong/i }));
    expect(screen.getByRole("radio", { name: /strong/i })).toHaveAttribute("aria-checked", "true");
  });

  it("writes the 30-day money wrap offline", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getAllByRole("button", { name: /^accounts$/i })[0]);
    const wrap = screen.getByTestId("wrap");
    expect(wrap).toHaveTextContent(/the survivor/i);
    expect(wrap).toHaveTextContent("R4");
    await user.click(within(wrap).getByTestId("wrap-write"));
    expect(await screen.findByTestId("wrap-story")).toHaveTextContent(/buffer did its job/i);
    vi.unstubAllGlobals();
  });

  it("remembers closed weeks after signing out and back in", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await enterAsThabo(user);
    await user.click(screen.getByTestId("close-week"));
    expect(screen.getByTestId("forecast-odds")).toHaveTextContent(/of the last 7 weeks/i);
    unmount();
    render(<App />);
    expect(screen.getByTestId("forecast-odds")).toHaveTextContent(/of the last 7 weeks/i);
  });
});
