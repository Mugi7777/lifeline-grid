# Lifeline Grid — 2:45 Demo Script

Record at desktop width with `OPENAI_API_KEY` configured. Use only the built-in synthetic scenario. Keep the pointer moving slowly and let each state change settle.

## 0:00–0:18 — Hook

**Screen:** Opening command center, three facility nodes and five mobile batteries.

**Narration:**

> A blackout does not always mean there is no energy. It can mean the energy is stranded in the wrong place. Lifeline Grid turns idle mobile batteries into a verified emergency grid—without sacrificing the mobility people still need.

## 0:18–0:42 — Understand the need

**Action:** Point to the three fictional reports, then click **Analyze reports with GPT-5.6**.

**Narration:**

> Three fictional facilities report urgent needs in natural language. GPT-5.6 turns each report into a source-linked power contract: kilowatts, duration, deadline, priority, and connector. Assumptions stay explicit.

**Visual proof:** The badge reads **GPT-5.6 LIVE** and structured chips appear.

## 0:42–1:12 — Show why chat is not enough

**Screen:** Candidate routes appear. E-12 is connected to Riverside Clinic in red.

**Narration:**

> The closest-looking candidate sends E-12 to the clinic. It sounds reasonable—but it is physically unsafe. The vehicle can cover only about 1.2 of the required 8 hours, and would fall below the protected 35 percent mobility reserve.

**Action:** Point to the two failed checks, then click **Run deterministic safety gate**.

## 1:12–1:40 — Prove the safe plan

**Screen:** Metrics turn green and E-07 replaces E-12 for the clinic.

**Narration:**

> The safety kernel does not ask the model to guess. It deterministically checks energy, power, connector, deadline, route, duration, and return reserve. It finds a zero-violation plan that protects all 12 critical site-hours and leaves every vehicle mobile.

## 1:40–2:03 — Keep a human in command

**Action:** Click **Approve simulated dispatch**.

**Narration:**

> Passing every constraint still does not authorize action. A human incident lead approves the simulated dispatch, and the decision enters an auditable mission timeline.

## 2:03–2:31 — Close the loop

**Action:** Click **Simulate bridge closure**.

**Screen:** East Bridge is marked closed; E-21’s old path is invalidated; E-44 is routed via Ridge Bypass.

**Narration:**

> Then the world changes. East Bridge closes. Lifeline Grid invalidates the old plan, re-runs every hard constraint, and safely reassigns the water station to E-44 through Ridge Bypass—with no loss of critical coverage.

## 2:31–2:45 — Close

**Screen:** Hold on the re-planned state and event timeline.

**Narration:**

> Chat can describe a crisis. Lifeline Grid maintains the state, proves the plan, keeps a human in control, and adapts when reality changes. Stranded energy becomes resilience.

## Recording checklist

- Keep the final video below three minutes.
- Confirm the model badge says **GPT-5.6 LIVE**.
- Show the red blocked state long enough to read both failures.
- Show the human approval state before simulating the closure.
- Do not imply real deployment or autonomous vehicle control.
- End on the zero-violation re-planned state.
