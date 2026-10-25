"""
Megan — Privacy-First AI Desktop Assistant with Multimodal Screen Copilot.
Main application entry point and interactive CLI loop.
"""

import sys
import argparse
from pathlib import Path

# Safe UTF-8 console output for Windows terminals
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core import config, logger

BANNER = r"""
  __  __ ______ _____          _   _ 
 |  \/  |  ____/ ____|   /\   | \ | |
 | \  / | |__ | |  __   /  \  |  \| |
 | |\/| |  __|| | |_ | / /\ \ | . ` |
 | |  | | |___| |__| |/ ____ \| |\  |
 |_|  |_|______\_____/_/    \_\_| \_|
======================================================
 Megan: AI Desktop Assistant & Multimodal Screen Copilot
======================================================
"""

def print_system_info():
    """Print system configuration and active runtime settings."""
    print(BANNER)
    print(f"Assistant Name     : {config.assistant_name}")
    print(f"Primary Model      : {config.model_name}")
    print(f"Alternate Model    : {config.alternate_model_name}")
    print(f"Inference Mode     : Cloud LLM Gateway")
    print(f"Screen Copilot     : Ready (Multimodal Vision)")
    print(f"PC Automation Safe : {config.safe_delete} (Confirmations: {config.confirmation_required})")
    print("=" * 54)

def run_interactive_cli():
    """Run the interactive terminal chat loop."""
    print(BANNER)
    print("Initializing Megan Assistant Core...")

    from llm import engine

    print()
    print("=" * 54)
    print("Megan is online! Commands:")
    print("  /clear - Clear conversation history")
    print("  /quit  - Exit")
    print("=" * 54)
    print()

    messages = []

    while True:
        try:
            user_input = input("You> ").strip()

            if not user_input:
                continue

            if user_input.lower() in ("/quit", "/exit", "exit", "quit"):
                print("Shutting down Megan. Goodbye!")
                break

            if user_input.lower() == "/clear":
                messages = []
                print("[Chat history cleared.]")
                continue

            messages.append({"role": "user", "content": user_input})
            print()
            print("Megan: ", end="", flush=True)
            response = engine.generate(messages)
            print(response)
            print()
            messages.append({"role": "assistant", "content": response})

        except KeyboardInterrupt:
            print("\nSession interrupted. Exiting...")
            break
        except Exception as e:
            logger.error(f"Error during execution: {e}")
            print(f"[Error]: {e}")

def main():
    parser = argparse.ArgumentParser(
        description="Megan — Privacy-First AI Desktop Assistant with Multimodal Screen Copilot."
    )
    parser.add_argument("--info", action="store_true", help="Print system configuration and exit")
    parser.add_argument("--organize", action="store_true", help="Scan and organize files in watched folders")
    parser.add_argument("--dry-run", action="store_true", help="Simulate organization without moving files")
    parser.add_argument("--watch", action="store_true", help="Start background folder watcher daemon")
    parser.add_argument("--register", action="store_true", help="Register a new local user account")
    parser.add_argument("--list-users", action="store_true", help="List registered local user accounts")
    parser.add_argument("--memory-start", action="store_true", help="Start the Digital Memory screen capture daemon")
    parser.add_argument("--memory-capture", action="store_true", help="Capture and index the screen immediately")
    parser.add_argument("--memory-search", type=str, default=None, help="Search indexed digital memory via query")
    parser.add_argument("--focus", type=str, default=None, help="Start a focused work session with distraction coach")
    parser.add_argument("--focus-duration", type=int, default=45, help="Focus session duration in minutes (default: 45)")
    parser.add_argument("--standup", action="store_true", help="Generate automated daily standup report from Git, Focus, and Memory")
    parser.add_argument("--standup-date", type=str, default=None, help="Target date for standup report (YYYY-MM-DD)")
    parser.add_argument("--macro-list", action="store_true", help="List all saved workflow automation macros")
    parser.add_argument("--macro-run", type=str, default=None, help="Replay a workflow macro by name or ID")
    parser.add_argument("--macro-dry-run", action="store_true", help="Simulate macro execution without modifying desktop state")
    parser.add_argument("--desktop", action="store_true", help="Launch Megan AI as an Electron Desktop Application")

    args = parser.parse_args()

    if args.info:
        print_system_info()
        return

    if args.desktop:
        import subprocess
        print(BANNER)
        print("Launching Megan AI Electron Desktop Application...")
        frontend_dir = PROJECT_ROOT / "frontend"
        try:
            cmd = "npx electron ."
            subprocess.run(cmd, cwd=str(frontend_dir), shell=True)
        except KeyboardInterrupt:
            print("\nDesktop application closed.")
        except Exception as e:
            print(f"[Error] Failed to launch Electron desktop app: {e}")
        return

    if args.focus:
        import time
        from focus import FocusCoach
        print(BANNER)
        print(f"Starting Focus Session: '{args.focus}' for {args.focus_duration} minutes...")
        coach = FocusCoach()
        
        def on_nudge(alert):
            print(f"\n[FOCUS ALERT] {alert['message']}")
            print(f"    Suggested Action: Bring your code editor back to focus!\n")
            
        coach.add_listener(on_nudge)
        coach.start_session(goal=args.focus, duration_minutes=args.focus_duration)
        print("Megan is actively guarding your session against distractions.")
        print("Press Ctrl+C to finish session.\n")
        try:
            while True:
                summary = coach.tracker.get_summary()
                status_line = (
                    f"\rElapsed: {int(summary['elapsed_seconds'])}s | "
                    f"Productive: {summary['productivity_score']}% | "
                    f"Current App: {summary['current_process']} [{summary['current_category']}] "
                )
                print(status_line, end="", flush=True)
                time.sleep(1)
        except KeyboardInterrupt:
            res = coach.stop_session()
            print(f"\n\n--- Focus Session Completed ---")
            print(f"Goal               : {res.get('session_goal')}")
            print(f"Total Productive   : {res.get('time_productive_seconds')}s")
            print(f"Total Distracted   : {res.get('time_distracted_seconds')}s")
            print(f"Productivity Score : {res.get('productivity_score')}%")
            print(f"Nudges Fired       : {res.get('total_nudges_fired')}")
            return

    if args.register:
        from auth import init_db, AuthService, UserCreate
        init_db()
        print(BANNER)
        print("--- Register Local User Account ---")
        username = input("Enter username: ").strip()
        display_name = input("Enter display name (optional): ").strip() or None
        import getpass
        password = getpass.getpass("Enter password (min 6 chars): ").strip()
        try:
            user = AuthService.register(UserCreate(username=username, password=password, display_name=display_name))
            print(f"[OK] Account '{user.username}' created successfully!")
            print(f"Data directory: data/users/{user.username}/")
        except Exception as e:
            print(f"[Error] Failed to create account: {e}")
        return

    if args.list_users:
        from auth import init_db, AuthService
        init_db()
        print(BANNER)
        print("--- Registered Local Users ---")
        users = AuthService.list_users()
        if not users:
            print("No users registered yet. Run 'python main.py --register' to create one.")
        else:
            for u in users:
                print(f"  - {u.username} ({u.display_name or 'No display name'}) [Created: {u.created_at}]")
        return

    if args.memory_capture:
        from memory import DigitalMemoryService
        print(BANNER)
        print("Capturing active screen for Digital Memory...")
        service = DigitalMemoryService()
        result = service.process_frame(force=True)
        print(f"Result: {result.get('status')}")
        if result.get("status") == "captured":
            print(f"  - Saved: {result.get('screenshot_path')}")
            print(f"  - App: {result.get('process_name')} ({result.get('window_title')})")
            print(f"  - Words extracted: {result.get('word_count')}")
            if result.get("text_snippet"):
                print(f"  - Snippet: {result.get('text_snippet')}")
        else:
            print(f"  - Reason: {result.get('reason')}")
        return

    if args.memory_search:
        from memory import DigitalMemoryService
        print(BANNER)
        print(f"Searching Digital Memory for: '{args.memory_search}'...")
        service = DigitalMemoryService()
        results = service.search(query=args.memory_search, top_k=5)
        if not results:
            print("No matching memories found.")
        else:
            print(f"\nFound {len(results)} matches:\n")
            for i, r in enumerate(results, 1):
                meta = r.get("metadata", {})
                score = r.get("score", 0.0)
                print(f"[{i}] Score: {score:.2f} | App: {meta.get('process_name')} | Title: {meta.get('window_title')}")
                print(f"    File: {meta.get('screenshot_path')}")
                print(f"    Time: {meta.get('timestamp')}")
                doc = r.get("text", "")[:150]
                if doc:
                    print(f"    Text: {doc}...")
                print("-" * 50)
        return

    if args.memory_start:
        import time
        from memory import DigitalMemoryService
        print(BANNER)
        print("Starting Digital Memory background capture daemon...")
        service = DigitalMemoryService()
        service.start()
        print(f"Interval: {service.interval}s | Screenshots: {service.screenshots_dir}")
        print("Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            service.stop()
            print("\nDigital Memory stopped.")
        return

    if args.standup:
        from reports.standup_generator import StandupGenerator
        from datetime import date
        print(BANNER)
        target_d = None
        if args.standup_date:
            try:
                target_d = date.fromisoformat(args.standup_date)
            except ValueError:
                print(f"[Error] Invalid date format: '{args.standup_date}'. Use YYYY-MM-DD.")
                return
        gen = StandupGenerator()
        print(f"Synthesizing Daily Standup Report for {target_d or date.today()}...\n")
        report = gen.generate(target_date=target_d)
        print(report["markdown"])
        if report.get("report_path"):
            print(f"\n[Saved report to: {report['report_path']}]")
        return

    if args.macro_list:
        from automation.macro import MacroStore
        print(BANNER)
        print("Available Workflow Automation Macros:\n")
        store = MacroStore()
        macros = store.list_macros()
        if not macros:
            print("  No macros found.")
        for m in macros:
            last = f" (Last run: {m.last_run[:16]})" if m.last_run else ""
            print(f"  - [{m.id}] {m.name} ({len(m.steps)} steps){last}")
            if m.description:
                print(f"      {m.description}")
        return

    if args.macro_run:
        from automation.macro import MacroStore, MacroRunner
        print(BANNER)
        store = MacroStore()
        macro = store.get_macro(args.macro_run)
        if not macro:
            print(f"[Error] Macro '{args.macro_run}' not found. Use --macro-list to see available macros.")
            return

        mode_str = "[DRY RUN] " if args.macro_dry_run else ""
        print(f"{mode_str}Executing Workflow Macro: '{macro.name}' ({len(macro.steps)} steps)...\n")

        runner = MacroRunner()

        def on_step(idx, step, res):
            status_txt = "OK" if res.get("success") else "FAILED"
            msg = res.get("message", "")
            print(f"  [{idx + 1}/{len(macro.steps)}] {step.action_type}: {status_txt} - {msg}")

        result = runner.run(macro=macro, dry_run=args.macro_dry_run, on_step_callback=on_step)
        if not args.macro_dry_run:
            store.save_macro(macro)

        outcome = "Completed successfully" if result["success"] else "Failed"
        print(f"\nMacro {outcome} in {result['duration_seconds']}s.")
        return

    if args.organize:
        from organizer.service import FolderWatcher
        print(BANNER)
        print("Starting Smart File Organizer...")
        watcher = FolderWatcher()
        results = watcher.scan_existing(dry_run=args.dry_run)
        print(f"\nCompleted scan of {len(results)} items. (Dry run: {args.dry_run})")
        for r in results:
            print(f"  - {r.get('file')}: {r.get('category', 'N/A')} [{r.get('action')}]")
        return

    if args.watch:
        import time
        from organizer.service import FolderWatcher
        print(BANNER)
        print("Starting Real-time Folder Watcher daemon...")
        watcher = FolderWatcher()
        watcher.start()
        print(f"Watching folders: {', '.join(str(p) for p in watcher.watch_dirs)}")
        print("Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            watcher.stop()
            print("\nWatcher stopped.")
        return

    run_interactive_cli()

if __name__ == "__main__":
    main()
