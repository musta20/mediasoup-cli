"""Run one watch command in a real PTY and stop it with the requested key."""
import errno
import json
import os
import pty
import select
import subprocess
import sys
import time

master, slave = pty.openpty()
child = subprocess.Popen(sys.argv[2:], stdin=slave, stdout=slave, stderr=slave)
os.close(slave)
output = bytearray()
sent = False
deadline = time.monotonic() + 15
try:
    while time.monotonic() < deadline:
        if select.select([master], [], [], 0.1)[0]:
            try:
                data = os.read(master, 65536)
            except OSError as error:
                if error.errno == errno.EIO:
                    break
                raise
            if not data:
                break
            output.extend(data)
            if not sent and b"Every" in output:
                os.write(master, b"q" if sys.argv[1] == "q" else b"\x03")
                sent = True
        elif child.poll() is not None:
            break
    if child.poll() is None:
        child.wait(timeout=max(0.1, deadline - time.monotonic()))
    text = output.decode(errors="replace")
    assert sent, "watch never rendered a frame"
    assert child.returncode == 0, text
    assert "\x1b[?1049h" in text, "watch did not enter the alternate screen"
    assert "\x1b[?1049l" in text, "watch did not restore the terminal"
    assert "\x1b[?25h" in text, "watch did not restore the cursor"
    print(json.dumps({"key": sys.argv[1], "exitCode": child.returncode, "transcript": text}))
finally:
    if child.poll() is None:
        child.kill()
        child.wait()
    os.close(master)
