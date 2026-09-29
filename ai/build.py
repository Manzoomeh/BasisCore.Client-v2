"""Build the BasisCore client AI skill for different AI coding tools.

    python ai/build.py

Source of truth: ai/skill/basiscore-client/ (SKILL.md + references/). Output: ai/packages/.
Each tool folder is laid out as the files belong in a project, so its zip can be extracted at the
project root. Standard library only. Re-run after editing the skill and commit ai/packages.
"""
import re
import shutil
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKILL = HERE / "skill" / "basiscore-client"
DIST = HERE / "packages"
NAME = "basiscore-client"
REFERENCES = ["binding.md", "commands.md", "dom-attributes.md"]
SHARED_REFERENCE = f"docs/ai/{NAME}-reference.md"
GLOBS = "**/*.html,**/*.htm,**/*.bc,**/*.inc"
REFERENCE_LINK = re.compile(r"`references/[a-z-]+\.md`")


def read_skill() -> tuple[str, str]:
    text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    front, body = match.group(1), match.group(2).strip()
    description = re.search(r"^description:\s*(.+)$", front, re.M).group(1).strip()
    return description, body


def reference_text() -> str:
    parts = ["# BasisCore client — full reference (v2.39.6)",
             "",
             "Attribute tables, binding rules, built-in sources, merge strategies and DOM markers."]
    for name in REFERENCES:
        content = (SKILL / "references" / name).read_text(encoding="utf-8").strip()
        parts += ["", "---", "", re.sub(r"^# ", "## ", content, flags=re.M)]
    return "\n".join(parts) + "\n"


def rule_text(front: str, body: str) -> str:
    body = REFERENCE_LINK.sub(f"`{SHARED_REFERENCE}`", body)
    return (front + body
            + f"\n\n## Full reference\n\nFor every attribute table, read `{SHARED_REFERENCE}`.\n")


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def zip_dir(folder: Path, target: Path, root_name: str = "") -> None:
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(folder.rglob("*")):
            if file.is_file():
                name = Path(root_name) / file.relative_to(folder) if root_name else file.relative_to(folder)
                archive.write(file, name.as_posix())


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    description, body = read_skill()
    reference = reference_text()

    # 1. Agent Skill folder: Claude Code, Claude apps, and other tools that read SKILL.md.
    skill_out = DIST / "agent-skill" / NAME
    shutil.copytree(SKILL, skill_out)

    # 2-4. Editor rules. Each points at one shared reference file under docs/ai/.
    rules = {
        "cursor": (f".cursor/rules/{NAME}.mdc",
                   f"---\ndescription: {description}\nglobs: {GLOBS}\nalwaysApply: false\n---\n\n"),
        "copilot": (f".github/instructions/{NAME}.instructions.md",
                    f"---\napplyTo: \"{GLOBS}\"\n---\n\n"),
        "windsurf": (f".windsurf/rules/{NAME}.md",
                     f"---\ntrigger: model_decision\ndescription: {description}\n---\n\n"),
    }
    for tool, (rule_path, front) in rules.items():
        write(DIST / tool / rule_path, rule_text(front, body))
        write(DIST / tool / SHARED_REFERENCE, reference)

    # 5. Generic: one self-contained file for AGENTS.md / GEMINI.md or any chat assistant.
    generic_body = REFERENCE_LINK.sub("the reference below", body)
    write(DIST / "generic" / "docs" / "ai" / f"{NAME}.md", generic_body + "\n\n" + reference)

    # Zips for download.
    zips = DIST / "zip"
    zips.mkdir(parents=True)
    zip_dir(skill_out, zips / f"{NAME}-agent-skill.zip", root_name=NAME)
    for tool in ("cursor", "copilot", "windsurf", "generic"):
        zip_dir(DIST / tool, zips / f"{NAME}-{tool}.zip")

    for file in sorted(DIST.rglob("*")):
        if file.is_file():
            print(f"{file.relative_to(HERE).as_posix():72} {file.stat().st_size:>8,}")


if __name__ == "__main__":
    main()
