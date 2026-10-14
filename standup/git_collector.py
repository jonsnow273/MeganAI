"""
Git commit collector for Megan Standup Generator.

Reads recent commits from the local git repository using subprocess + git log.
Returns structured commit data scoped to a specific author and date range.
"""

import subprocess
import re
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path

from core import logger


class GitCollector:
    """
    Collects Git commits from a local repository using `git log`.
    Safe: uses subprocess with no shell=True and sanitized args.
    """

    def __init__(self, repo_dir: Optional[Path] = None):
        """
        Args:
            repo_dir: Path to the git repository root.
                      Defaults to the MeganAI project root (2 levels up from this file).
        """
        if repo_dir:
            self.repo_dir = Path(repo_dir)
        else:
            # Default: project root (parent of standup/)
            self.repo_dir = Path(__file__).resolve().parent.parent

    def _run_git(self, args: List[str]) -> str:
        """Run a git subcommand safely and return stdout."""
        try:
            result = subprocess.run(
                ["git"] + args,
                capture_output=True,
                text=True,
                cwd=str(self.repo_dir),
                timeout=15,
            )
            if result.returncode == 0:
                return result.stdout.strip()
            logger.debug(f"git command stderr: {result.stderr.strip()}")
            return ""
        except FileNotFoundError:
            logger.warning("git not found on PATH. Git data skipped.")
            return ""
        except subprocess.TimeoutExpired:
            logger.warning("git log timed out.")
            return ""
        except Exception as e:
            logger.error(f"Git subprocess error: {e}")
            return ""

    def get_current_branch(self) -> str:
        """Return the current git branch name."""
        return self._run_git(["rev-parse", "--abbrev-ref", "HEAD"]) or "unknown"

    def get_author_email(self) -> str:
        """Return the configured git author email."""
        return self._run_git(["config", "user.email"]) or ""

    def get_commits(
        self,
        since_date: Optional[date] = None,
        until_date: Optional[date] = None,
        author: Optional[str] = None,
        max_count: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Fetch commits filtered by date range and optional author.

        Args:
            since_date: Start of date range (inclusive). Defaults to today.
            until_date: End of date range (inclusive). Defaults to today.
            author:     Author filter string (name or email substring).
            max_count:  Maximum number of commits to return.

        Returns:
            List of commit dicts: {hash, subject, body, author_name, author_email, timestamp, files_changed}
        """
        today = date.today()
        since = since_date or today
        until = until_date or today

        # git log --after includes commits AFTER the date; use --since with time
        since_str = f"{since.isoformat()}T00:00:00"
        until_str = f"{until.isoformat()}T23:59:59"

        args = [
            "log",
            f"--since={since_str}",
            f"--until={until_str}",
            f"--max-count={max_count}",
            "--pretty=format:COMMIT_START%n%H%n%s%n%b%nAUTHOR:%an%nEMAIL:%ae%nTIME:%ai%nCOMMIT_END",
        ]
        if author:
            args += [f"--author={author}"]

        raw = self._run_git(args)
        if not raw:
            return []

        commits = []
        blocks = raw.split("COMMIT_START\n")
        for block in blocks:
            block = block.strip()
            if not block or "COMMIT_END" not in block:
                continue

            lines = block.replace("COMMIT_END", "").strip().splitlines()
            if len(lines) < 2:
                continue

            commit: Dict[str, Any] = {
                "hash": "",
                "subject": "",
                "body": "",
                "author_name": "",
                "author_email": "",
                "timestamp": "",
                "files_changed": [],
            }

            # First line = hash, second = subject
            commit["hash"] = lines[0].strip() if lines else ""
            commit["subject"] = lines[1].strip() if len(lines) > 1 else ""

            body_lines = []
            for line in lines[2:]:
                if line.startswith("AUTHOR:"):
                    commit["author_name"] = line[7:].strip()
                elif line.startswith("EMAIL:"):
                    commit["author_email"] = line[6:].strip()
                elif line.startswith("TIME:"):
                    commit["timestamp"] = line[5:].strip()
                else:
                    body_lines.append(line)
            commit["body"] = "\n".join(body_lines).strip()

            # Get files changed for this commit
            files_raw = self._run_git(["diff-tree", "--no-commit-id", "-r", "--name-only", commit["hash"]])
            commit["files_changed"] = [f.strip() for f in files_raw.splitlines() if f.strip()]

            commits.append(commit)

        return commits

    def get_stats(self, since_date: Optional[date] = None, until_date: Optional[date] = None) -> Dict[str, Any]:
        """Return aggregate stats: total commits, files touched, insertions, deletions."""
        today = date.today()
        since = since_date or today
        until = until_date or today

        shortstat = self._run_git([
            "log",
            f"--since={since.isoformat()}T00:00:00",
            f"--until={until.isoformat()}T23:59:59",
            "--shortstat",
            "--oneline",
        ])

        total_commits = shortstat.count("\n ") if shortstat else 0
        insertions = 0
        deletions = 0

        for line in shortstat.splitlines():
            ins_match = re.search(r"(\d+) insertion", line)
            del_match = re.search(r"(\d+) deletion", line)
            if ins_match:
                insertions += int(ins_match.group(1))
            if del_match:
                deletions += int(del_match.group(1))

        return {
            "total_commits": total_commits,
            "lines_inserted": insertions,
            "lines_deleted": deletions,
            "branch": self.get_current_branch(),
        }
