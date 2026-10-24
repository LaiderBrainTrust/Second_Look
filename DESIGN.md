---
name: Second Look
description: Clarity before commitment
colors:
  paper: "#0c0c0c"
  surface: "#121212"
  ink: "#ededed"
  muted: "#b0b0b0"
  line: "#353535"
  accent: "#d9ff43"
  soft: "#1c1c1c"
  accent-hover: "#c8ed36"
  positive: "#ededed"
  positive-soft: "#161616"
  warning: "#ededed"
  warning-soft: "#1c1c1c"
  input-line: "#6e6e6e"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "38px"
    fontWeight: 400
    lineHeight: 1.16
    letterSpacing: "-0.035em"
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.65
rounded:
  control: "5px"
  panel: "8px"
spacing:
  control-gap: "12px"
  page-inset: "40px"
---

# Second Look product experience

Mat authorized the customer journey replacement and a more distinctive visual direction on October 24. The app is an Operate surface: one case, a readable financial question, one useful next action, and supporting evidence on demand.

## Overview

Near-black canvas, charcoal surfaces and light neutral text, based on the soft monochrome palette in justus-lumin/x1-design. Mat requested an acid-lime accent for primary actions, the active step and limited highlights. Status meaning remains explicit in words rather than relying on color. See docs/COLOR_PALETTE.md for the source and contrast decisions.

| Role                   | Token                    | Value             |
| ---------------------- | ------------------------ | ----------------- |
| Workspace              | paper                    | #0c0c0c           |
| Paper / input          | surface                  | #121212           |
| Main text / cash total | ink                      | #ededed           |
| Secondary text         | muted                    | #b0b0b0           |
| Dividing rule          | line                     | #353535           |
| Action / active step   | accent                   | #d9ff43           |
| Press / hover          | accent-hover             | #c8ed36           |
| Quiet support          | soft                     | #1c1c1c           |
| Completed state        | positive / positive-soft | #ededed / #161616 |
| Missing or changed     | warning / warning-soft   | #ededed / #1c1c1c |
| Input boundary         | input-line               | #6e6e6e           |

## Typography

Self-hosted IBM Plex Sans for controls, prose and tabular financial numbers. Source Serif 4 for the page's question and next-action heading. The two WOFF2 files are variable fonts; licenses are in public/fonts. Fonts need no third-party request. 16px base; 38px desktop page title, 32px on mobile. Numbers align and do not animate. Rounded corners are quiet (5–8px), with one low elevation on the entry form.

## Layout

The desktop first viewport should contain the actual cash calculation and its next action, not just a title. Keep the header, case path and four-step navigation compact. The charcoal total is the bottom of a visible calculation; never a detached metric. Unknown amounts remain words and receive an explicit unresolved treatment, never zero. The adjacent action explains what the user needs to do now. Once recorded, it says to view the record, not repeat the work.

The four stages are Your offer, Research (optional), Confirm details, and Review & save. Case and step live in the URL. Keyboard focus is visible. Controls are at least 44px, inputs at least 16px, and layout becomes one column below 760px. Forms, facts and financial numbers do not enter with animation. Following Emil Kowalski's design engineering guidance, pointer presses have a restrained 140ms response; keyboard and reduced-motion actions have no movement. Use explicit transition properties, not transition: all.

## Do’s and Don’ts

Technical provider details stay under Service details; completed research retains the actual receipts. Fictional example disclosures remain visible and compact. Quotes under comparison are never presented as the sale being reviewed. The decision is a saved review, not executed settlement. Real accounts keep case membership and personal X1 connections distinct from presenter role simulation.
