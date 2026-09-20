# foundations/07 — Neuroscience of Development

## 1. Purpose

Map each stage and each line to its best-known neural substrates, so
that Mysterium's mechanics can claim — *with citations* — that the in-game
training plausibly engages those substrates. Without this document,
"trains the brain" is rhetoric; with it, "trains [these regions /
networks via these tasks]" is a falsifiable claim.

This document does not commit Mysterium to fMRI validation studies. It does
commit Mysterium to *not making claims* about neural training that contradict
this map.

## 2. Scientific basis

### 2.1 Brain regions and networks per executive function

The most-replicated mappings, drawn from Diamond (2013), Miyake & Friedman
(2012), Niendam et al. (2012), and Banich (2009):

| EF / capacity | Primary regions | Networks | Validated tasks |
|---|---|---|---|
| Working memory | dlPFC (BA 9/46), parietal (BA 7) | Frontoparietal control network (FPCN) | n-back, complex span, Corsi |
| Inhibitory control (response) | rIFG, pre-SMA, ACC | Cingulo-opercular | Go/No-Go, stop-signal |
| Inhibitory control (interference) | dACC, anterior insula | Salience network | Stroop, Flanker, Simon |
| Cognitive flexibility / set-shifting | PFC + parietal, basal ganglia | FPCN + striatum | WCST, task-switching |
| Planning | rostral PFC (BA 10) | Default-mode + FPCN | Tower of London / Hanoi |
| Reasoning | lateral PFC, posterior parietal | FPCN | Raven's, analogical reasoning |
| Sustained attention | rDLPFC, cingulate | Cingulo-opercular + DAN | Continuous performance, vigilance |

### 2.2 Per-line neural substrate (best-evidence summary)

| Line | Primary substrates | Key references |
|---|---|---|
| Cognitive | FPCN (dlPFC + parietal) + cingulo-opercular control | Cole & Schneider 2007, Niendam 2012 |
| Emotional | Amygdala, ventromedial PFC, anterior insula, right hemisphere | Pessoa 2008, Phelps 2006 |
| Moral | vmPFC, TPJ, posterior cingulate, dACC | Greene 2014, Young & Dungan 2012 |
| Intrapersonal | Default-mode network (medial PFC, PCC), insula | Andrews-Hanna 2010, Vago & Silbersweig 2012 |
| Spiritual | DMN suppression + frontoparietal during peak; PCC, precuneus | Newberg 2010, Tang et al. 2015 |
| Somatic | Cerebellum, motor / premotor / SMA, posterior insula | Wolpert 2011, Craig 2009 |
| Willpower | dlPFC, ACC; depletion in BA 24/32; striatal reward integration | Hare et al. 2009, Inzlicht & Schmeichel 2012 |
| Interpersonal | TPJ, mPFC, mirror system, precuneus | Frith & Frith 2006, Iacoboni 2009 |

### 2.3 Per-stage neuroplastic windows

A simplification of developmental-cognitive-neuroscience consensus:

| Stage band | Substrate maturation | Plasticity window |
|---|---|---|
| Infrared (0–2y) | Subcortical, brainstem, limbic | Massive |
| Magenta (2–5y) | Right hemisphere, limbic, basal ganglia | Massive |
| Red (5–7y) | Posterior → frontal myelination | High |
| Amber (7–11y) | Bilateral cortical, parietal | High |
| Orange (12–25y) | dlPFC, FPCN, late myelination | Moderate-high |
| Green (25y+) | Continued FPCN refinement, DMN integration | Moderate |
| Teal (with practice) | DMN-FPCN integration | Practice-dependent |
| Turquoise (with deep practice) | Long-term meditators show structural changes | Practice-dependent |

Mysterium is honest about these windows: a 35-year-old playing the game is
not going to acquire 0–2y plasticity. The claim is **practice-driven
plasticity within the adult range** — well-evidenced for FPCN tasks
(action video games, working-memory training transfer to FPCN
recruitment).

## 3. Game-design mapping

### 3.1 Tasks → networks (the tracebook)

This is the most important table in Mysterium's validity arc. Each in-game
task names the network it claims to engage:

| In-game ability | Cognitive task | Network claimed |
|---|---|---|
| Echo Casting (spell) | n-back | FPCN (dlPFC, parietal) |
| Chromatic Parry | Stroop | dACC, anterior insula (Salience) |
| Spatial Counter | Simon | Frontoparietal |
| Phantom Feint defence | Go/No-Go | rIFG, pre-SMA |
| Sigil Tracing | Corsi | Right parietal, hippocampal-parietal |
| Elemental Shifting | WCST | PFC + striatum |
| Combo Sequencing | Tower of London | Rostral PFC, FPCN |
| Focus Channeling | Complex span | FPCN under interference |
| Asynchronous Wielding | Task-switching | dACC, FPCN |
| Witness Pause | Sustained attention + meta | DAN + DMN regulation |
| Empath Read | Affect recognition + ToM | TPJ, mPFC |
| Dilemma | Moral judgement | vmPFC, TPJ, dACC |

### 3.2 Stage-appropriate task difficulty

Each task has stage-banded parameter ranges aligned with the substrate's
realistic load capacity at that altitude:

| Stage | n-back ceiling | Stroop SOA | WCST rule-shift cadence |
|---|---|---|---|
| Infrared | n=1 (object permanence) | 1500 ms | not yet |
| Magenta | n=1 | 1200 ms | not yet |
| Red | n=2 | 1000 ms | rare |
| Amber | n=2 | 800 ms | low |
| Orange | n=3 | 700 ms | moderate |
| Green | n=3–4 | 600 ms | high |
| Teal | n=4 | 500 ms | very high (with meta) |
| Turquoise | n=5 (rarely) | 400 ms | continuous |

These are *defaults*, modulated by the staircase per player. The point
of this table is to give level designers a *feasibility envelope* —
asking a player to do n=5 at Amber stage is not a hard challenge; it is
a non-feasibility against the substrate.

### 3.3 Telemetry → plausible-substrate report

The post-stage-up dashboard reports, *cautiously*:

> "This stage's training engaged tasks associated with the
> frontoparietal control network and the salience network. Continued
> practice at this load is consistent with literature showing
> training-related FPCN refinement (cite). This is not a clinical claim
> about your individual brain."

The wording is the validity contract.

## 4. Architectural contract

```
interface NetworkClaim {
  taskSlug:          TaskSlug;
  network:           'FPCN' | 'CON' | 'SN' | 'DMN' | 'DAN' | 'Limbic' | 'MotorCerebellar' | 'Mirror';
  primaryRegions:    ReadonlyArray<string>;   // free-text labels for documentation only
  citation:          string;                  // BibTeX key
}

const TASK_NETWORK_MAP: ReadonlyArray<NetworkClaim>;
```

Tested invariant: every `TaskSlug` in the cognitive-task library has at
least one `NetworkClaim` row. A task without a claim cannot ship.

## 5. Open questions

- **fMRI validation.** Do we ever validate the network claims with
  imaging? Out of scope for indie release; in scope if a research
  collaboration emerges. Tracked in `validation/01`.
- **Individual variability.** Network maps are population averages.
  Individual brains differ substantially. The dashboard wording must
  reflect this.
- **Newer connectomics.** This document uses canonical-network
  vocabulary (FPCN, SN, DMN, DAN, CON). As consensus shifts (e.g.,
  network-of-networks, multiple-demand system), this document evolves.

## 6. Principles served

Principles **2** (validity), **6** (honesty — never claims more than the
substrate allows).
