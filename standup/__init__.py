"""
Megan Daily Standup Report Generator.

Synthesizes Git commits, Focus Coach session data, and Digital Memory
screen topics into a structured Markdown report (with optional PDF export).
"""

from standup.generator import StandupGenerator

__all__ = ["StandupGenerator"]
