# Contestability

This document describes the contestability model used by Vera and how it is
reflected in the contestation utilities.

## Core idea

A contestation is a structured challenge that modifies a framework without
mutating the original. Contestations can change base scores, add or remove
arguments, and add or remove relations.

## Properties

The implementation follows two key properties from the ArgLLM paper:

Property 1 (Base Score Contestability)
- Increasing a pro argument base score will not decrease the root strength.
- Increasing a con argument base score will not increase the root strength.

Property 2 (Argument Relation Contestability)
- Adding a pro argument will not decrease the root strength.
- Adding a con argument will not increase the root strength.

Pro or con is determined by the parity of attack edges on the path to the root:
- Pro: even number of attacks.
- Con: odd number of attacks.

## API overview

Key functions live under `src/contestation/`:

- `applyContestation` returns a modified framework with deterministic ordering.
- `predictContestationEffect` predicts directional impact in simple cases.
- `recomputeFramework` applies a contestation and re-evaluates the framework.

## Determinism

All contestation operations are pure and deterministic:
- Inputs are not mutated.
- Arguments and relations are sorted by stable keys.
- Outputs are frozen to prevent accidental mutation.

## Testing

Contestability tests exercise Properties 1 and 2 using small, explicit
frameworks to keep results deterministic.
