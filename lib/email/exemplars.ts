// Curated cold email exemplars — real patterns from emails known to get replies.
// These are injected as few-shot examples into the generation prompt so the AI
// learns sentence rhythm, specificity level, and tone, not from templates.

export const EMAIL_EXEMPLARS = `
---EXEMPLAR 1 (research opportunity, CS/ML, junior)---
Subject: Quick question about your work on sparse attention

Hi Professor Nguyen,

I read your 2023 paper on locality-sensitive sparse attention while building a small transformer for a class project. The section on dynamic sparsity masks was something I genuinely hadn't seen framed that way before — I ended up restructuring my whole approach because of it.

I'm a junior at Georgia Tech studying CS, mostly focused on efficiency in language models. I'd love to learn more about what problems your group is currently working through. Would you be open to a 15-minute call sometime in the next few weeks?

Thanks,
Marcus

---EXEMPLAR 2 (research opportunity, biology/neuroscience, sophomore)---
Subject: Your rat hippocampus paper from NeurIPS

Hi Professor Okafor,

I came across your 2022 work on place cell remapping in novel environments last semester — I was actually looking for something unrelated and fell into a two-hour rabbit hole. The finding that remapping rates differed so sharply between familiar and novel contexts made me rethink something I'd been assuming in my intro neuro course.

I'm a sophomore at Johns Hopkins interested in computational neuroscience. I'd love to hear what your lab is focused on right now. If there's ever a chance to sit in on a lab meeting or ask you a few questions, I'd be really grateful.

No pressure either way — I know your inbox is probably not short on student emails.

Ana

---EXEMPLAR 3 (mentorship, economics, senior)---
Subject: Behavioral nudges paper — one question

Hi Professor Ramirez,

I've been working through your 2021 paper on default effects in retirement savings for my senior thesis. The part that's stuck with me is the comparison between opt-in versus opt-out across income brackets — it seems like there's something there that doesn't get talked about enough in the policy conversation.

I'm a senior studying economics and behavioral science at Michigan. I'm not looking for a research position — I just wanted to ask you one question about how you approached the counterfactual design. Would you be up for a brief email exchange, or a 10-minute call if that's easier?

Appreciate your time,
Jonah

---EXEMPLAR 4 (research opportunity, physics, freshman)---
Subject: Your quantum error correction work

Professor Chen,

I read through your group's 2023 preprint on topological codes and surface code thresholds. I'm a freshman so I won't pretend I followed all the math, but the conceptual argument in section 3 about why braiding operations stay robust under certain noise models actually made sense to me and I've been thinking about it since.

I'm interested in quantum computing and trying to figure out what real research looks like before I get too far in. Is there any way to visit your lab, or someone in your group I could talk to?

Thanks,
Riley Park

---EXEMPLAR 5 (referral/rec letter, CS, senior)---
Subject: Letter of recommendation — software systems

Hi Professor Abramowitz,

I took your distributed systems course two years ago and ended up building my capstone on consistent hashing, which started from something you said in week 6 about the practical limits of strong consistency. That class changed how I think about tradeoffs in system design.

I'm applying to PhD programs this fall focused on systems and storage. I'd be honored if you'd consider writing a letter — I know it's a significant ask and I want to make it as easy as possible. I can send you my SOP draft, the projects most relevant to your course, and any other context that would help.

Would you be open to it?

Priya

---EXEMPLAR 6 (research opportunity, environmental science, junior)---
Subject: Carbon sequestration fieldwork — your Oregon study

Hi Dr. Walsh,

I've been following your lab's work on temperate rainforest carbon stocks since I found your 2022 Science paper through a citation chain. The part about belowground biomass estimates being off by 30–40% in earlier models was genuinely surprising — I'd been using those numbers uncritically in a class project.

I'm a junior at UW studying environmental science and I'd love to be involved in fieldwork at some point, even in a supporting role. I have some experience with soil sampling from a summer position at a local conservation trust.

Is your lab taking on undergrads this year?

Thanks,
Devon

---EXEMPLAR 7 (mentorship, business/entrepreneurship, sophomore)---
Subject: Your talk on founder-market fit

Hi Professor Liu,

I watched your Stanford talk on founder-market fit from 2021 three times. The part where you said "passion is a lagging indicator, not a leading one" stuck with me — I've been repeating it to people since.

I'm a sophomore at Wharton trying to figure out the gap between what I'm learning in class and how early-stage companies actually operate. I'm not sure I'm ready to start something yet but I'm trying to get sharper on what readiness even looks like.

Would you ever be up for a 20-minute conversation? I'd come to campus or do a call, whatever's easier.

Sam

---EXEMPLAR 8 (research opportunity, materials science, junior)---
Subject: Perovskite degradation paper — question about the humidity data

Professor Takahashi,

I read your 2023 paper on perovskite solar cell degradation under high humidity and I had one question I couldn't find the answer to in the supplementary data. In Figure 4, the degradation curve for the encapsulated samples flattens out earlier than I'd expect — was that a materials difference or something in the test conditions?

I'm a junior studying materials engineering at MIT. I'm interested in photovoltaics and I'm trying to get into a research group this year. Your work on interface stability is exactly the direction I want to go.

I'd love to learn more about what your lab is working on right now. Even a 10-minute conversation would be helpful.

Lily Osei

---PATTERNS THAT MAKE THESE WORK---
- Subject line names the specific paper or topic — not "Question about your research"
- First line references something concrete (a specific finding, section, or quote) — not a compliment
- The student explains WHY that thing stuck with them — not just that they read it
- Background is 1–2 sentences max — no wall of text about achievements
- The ask is one specific thing — a call, a visit, one question, a letter
- Length is 120–200 words
- Tone is direct but not presumptuous — they acknowledge the ask is a favor
- No: "I hope this email finds you well", "I am writing to express interest", "I would be honored to", "My name is X and I am a Y student at Z"
- Yes: starting mid-thought, like the email is already in progress
`;
