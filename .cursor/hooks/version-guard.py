#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def read_stdin_json():
  try:
    return json.loads(sys.stdin.read() or "{}")
  except Exception:
    return {}


def run_git(args):
  try:
    result = subprocess.run(
      ["git", *args],
      check=False,
      capture_output=True,
      text=True,
    )
    if result.returncode != 0:
      return ""
    return result.stdout.strip()
  except Exception:
    return ""


def parse_version(version):
  match = re.match(r"^(\d+)\.(\d+)\.(\d+)$", version)
  if not match:
    return None
  return tuple(int(part) for part in match.groups())


def bump_version(version, bump):
  major, minor, patch = version
  if bump == "major":
    return f"{major + 1}.0.0"
  if bump == "minor":
    return f"{major}.{minor + 1}.0"
  return f"{major}.{minor}.{patch + 1}"


def infer_bump(commit_subject):
  lower = commit_subject.lower()
  if "breaking change" in lower or re.search(r"^\w+!:", lower):
    return "major", "破壊的変更の可能性（BREAKING/!）"
  if lower.startswith("feat:"):
    return "minor", "機能追加（feat）"
  return "patch", "バグ修正・改善系（既定）"


def extract_commit_message(command):
  m = re.search(r"-m\s+['\"]([^'\"]+)['\"]", command)
  if m:
    return m.group(1).strip()
  return ""


def main():
  hook_input = read_stdin_json()
  command = hook_input.get("command", "")

  if not re.search(r"^git\s+(commit|push)\b", command):
    print(json.dumps({"permission": "allow"}))
    return

  repo_root = run_git(["rev-parse", "--show-toplevel"])
  package_path = Path(repo_root) / "package.json" if repo_root else Path("package.json")

  try:
    package = json.loads(package_path.read_text(encoding="utf-8"))
    current_version = package.get("version", "unknown")
  except Exception:
    current_version = "unknown"

  parsed = parse_version(current_version)
  if parsed is None:
    print(
      json.dumps(
        {
          "permission": "ask",
          "user_message": (
            "バージョン確認: package.json の version が semver 形式ではありません。"
            " commit/push 前に手動で次バージョンを確認してください。"
          ),
          "agent_message": "package.json の version が semver 形式ではないため、自動提案できません。",
        },
        ensure_ascii=False,
      )
    )
    return

  if command.startswith("git commit"):
    subject = extract_commit_message(command) or run_git(["log", "-1", "--pretty=%s"])
  else:
    subject = run_git(["log", "-1", "--pretty=%s"])

  bump, reason = infer_bump(subject)
  proposed = bump_version(parsed, bump)

  payload = {
    "permission": "ask",
    "user_message": (
      f"バージョン確認: 現在 {current_version} / 提案 {proposed}（{reason}）。"
      " このバージョン方針で進める場合のみ実行してください。"
    ),
    "agent_message": (
      f"Version guard: current={current_version}, proposed={proposed}, "
      f"reason={reason}, commit_subject={subject or 'N/A'}"
    ),
  }
  print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
  main()
