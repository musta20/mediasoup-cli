"""Exercise the actual CLI REPL, including shell handoff, in a PTY."""
import errno
import json
import os
import pty
import select
import subprocess
import sys
import time

mode = sys.argv[1]
master, slave = pty.openpty()
child = subprocess.Popen(sys.argv[2:], stdin=slave, stdout=slave, stderr=slave)
os.close(slave)
output = bytearray()
cursor = 0


def read_until(marker, timeout=10):
    global cursor
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        position = output.find(marker, cursor)
        if position >= 0:
            captured = bytes(output[cursor:position + len(marker)])
            cursor = position + len(marker)
            return captured
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
    raise AssertionError(f"Missing {marker!r}: {output.decode(errors='replace')}")


def send(text):
    os.write(master, text.encode())


try:
    if mode == "shell":
        read_until("mediasoup ● › ".encode())
        send("repl\n")
    read_until(b"js> ")
    send("const testWorkers = await Promise.all([...workers.values()].map(w => w.dump()))\n")
    read_until(b"js> ")
    send('console.log("workers=" + testWorkers.length)\n')
    assert b"workers=2" in read_until(b"js> ")
    send("({\n")
    read_until(b"... ")
    send('value: "multiline-ok"\n')
    read_until(b"... ")
    send("})\n")
    assert b"multiline-ok" in read_until(b"js> ")
    send('throw new Error("expected-repl-error")\n')
    assert b"Uncaught Error: expected-repl-error" in read_until(b"js> ")
    send("await Promise.resolve(6 * 7)\n")
    assert b"42" in read_until(b"js> ")
    if mode == "ctrl-c":
        os.write(master, b"\x03")
    elif mode == "ctrl-d":
        os.write(master, b"\x04")
    else:
        send(".exit\n")
    if mode == "shell":
        read_until("› ".encode())
        send("summary\n")
        # The command prints data before reopening the normal shell prompt.
        assert b"workers" in read_until("› ".encode()).lower()
        send("repl\n")
        read_until(b"js> ")
        send("typeof testWorkers\n")
        assert b"undefined" in read_until(b"js> ")
        send(".exit\n")
        read_until("› ".encode())
        send("exit\n")
    child.wait(timeout=10)
    assert child.returncode == 0, output.decode(errors="replace")
    print(json.dumps({"mode": mode, "exitCode": child.returncode, "transcript": output.decode(errors="replace")}))
finally:
    if child.poll() is None:
        child.kill()
        child.wait()
    os.close(master)
