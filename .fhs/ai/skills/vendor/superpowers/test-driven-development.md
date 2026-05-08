---
name: test-driven-development
source: https://github.com/obra/superpowers
vendor_date: 2026-05-09
description: Enforces RED-GREEN-REFACTOR TDD cycle. No production code without a failing test first.
---

# Test-Driven Development (TDD)

## Overview

Test-driven development requires writing tests before implementation code. The core principle emphasizes that "If you didn't watch the test fail, you don't know if it tests the right thing."

## Key Principles

**The Iron Law:** No production code should exist without a failing test written first. If code is written before tests, it must be deleted and reimplemented following the TDD cycle.

**Red-Green-Refactor Cycle:**
1. **RED** - Write a minimal failing test
2. **GREEN** - Write minimal code to pass the test
3. **REFACTOR** - Clean up while maintaining passing tests

## When to Apply TDD

TDD should be used for:
- New features
- Bug fixes
- Refactoring
- Behavior changes

Exceptions require explicit approval from your team lead.

## Critical Requirements

Tests must:
- Focus on one behavior
- Have clear, descriptive names
- Use real code rather than mocks when possible
- Be verified as failing before implementation begins

The mandatory verification step prevents false confidence—a passing test without watching it fail first may not actually test what's needed.

## Common Rationalizations to Reject

Phrases like "I'll test after," "too simple to test," or "already manually tested it" are warning signs of TDD violation. Testing after implementation proves only that the code matches itself, not that it's correct.

## Final Checkpoint

Before completion, verify that every function has a corresponding test that failed first, was watched to fail for the right reason, and passes after minimal implementation.
