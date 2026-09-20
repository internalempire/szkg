"""A process-wide and OS-backed lock for supported local writer entry points."""

from contextlib import contextmanager
from pathlib import Path
import os
import threading

LOCK_FILE = Path(__file__).parent / "data" / ".writer.lock"
_mutex = threading.Lock()


class WorkBusyError(RuntimeError):
    pass


@contextmanager
def exclusive_work(path: Path | None = None):
    """Reject concurrent jobs; OS locks are released even after a process crash."""
    if not _mutex.acquire(blocking=False):
        raise WorkBusyError("Another local operation is active. Finish or cancel its preview first.")
    handle = None
    locked = False
    try:
        path = path or LOCK_FILE
        path.parent.mkdir(parents=True, exist_ok=True)
        handle = path.open("a+b")
        try:
            if os.name == "nt":
                import msvcrt
                handle.seek(0); handle.write(b"0"); handle.flush(); handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            locked = True
        except OSError:
            raise WorkBusyError("Another SZKG process is updating this library. Try again after it finishes.") from None
        yield
    finally:
        if handle:
            if locked:
                if os.name == "nt":
                    import msvcrt
                    handle.seek(0); msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(handle, fcntl.LOCK_UN)
            handle.close()
        _mutex.release()
