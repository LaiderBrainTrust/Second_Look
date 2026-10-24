---
name: Second Look
description: Clarity before commitment
colors:
  paper: "#f5f2ec"
  surface: "#fff"
  ink: "#192c40"
  muted: "#566575"
  line: "#d8d9d8"
  accent: "#a94728"
  soft: "#e9edf0"
  accent-hover: "#89371e"
  positive: "#246349"
  positive-soft: "#eaf1eb"
  warning: "#7b411b"
  warning-soft: "#f9eddd"
  input-line: "#98a2ad"
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

Ink navy, warm limestone and restrained burnt orange. The reference is a well-edited financial publication that happens to be interactive. No green brand wash, neon status displays, decorative charts or dashboard metric tiles. Green has one job: an answered or recorded state. Amber identifies missing information or changed terms.

| Role                   | Token                    | Value             |
| ---------------------- | ------------------------ | ----------------- |
| Workspace              | paper                    | #f5f2ec           |
| Paper / input          | surface                  | #ffffff           |
| Main text / cash total | ink                      | #192c40           |
| Secondary text         | muted                    | #566575           |
| Dividing rule          | line                     | #d8d9d8           |
| Action / active step   | accent                   | #a94728           |
| Press / hover          | accent-hover             | #89371e           |
| Quiet support          | soft                     | #e9edf0           |
| Completed state        | positive / positive-soft | #246349 / #eaf1eb |
| Missing or changed     | warning / warning-soft   | #7b411b / #f9eddd |
| Input boundary         | input-line               | #98a2ad           |

## Typography

Self-hosted IBM Plex Sans for controls, prose and tabular financial numbers. Source Serif 4 for the page's question and next-action heading. The two WOFF2 files are variable fonts; licenses are in public/fonts. Fonts need no third-party request. 16px base; 38px desktop page title, 32px on mobile. Numbers align and do not animate. Rounded corners are quiet (5–8px), with one low elevation on the entry form.

## Layout

The desktop first viewport should contain the actual cash calculation and its next action, not just a title. Keep the header, case path and four-step navigation compact. The navy total is the bottom of a visible calculation; never a detached metric. Unknown amounts remain words and receive the amber treatment, never zero. The adjacent action explains what the user needs to do now. Once recorded, it says to view the record, not repeat the work.

The four stages remain The deal, The evidence, The conversation, Your decision. Case and step live in the URL. Keyboard focus is visible. Controls are at least 44px, inputs at least 16px, and layout becomes one column below 760px. Forms, facts and financial numbers do not enter with animation. Following Emil Kowalski's design engineering guidance, pointer presses have a restrained 140ms response; keyboard and reduced-motion actions have no movement. Use explicit transition properties, not transition: all.

## Do’s and Don’ts

Technical provider details stay under Service details; completed research retains the actual receipts. Fictional example disclosures remain visible and compact. Quotes under comparison are never presented as the sale being reviewed. The decision is a saved review, not executed settlement. Real accounts keep case membership and personal X1 connections distinct from presenter role simulation.
