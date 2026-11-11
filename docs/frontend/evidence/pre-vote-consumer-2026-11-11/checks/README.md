# Frontend check attribution

`final-*` and `presentation-build.txt` ran with frozen native source `b63403e6a8d1b5f68f48ec13f4a392a79870bfcd`. Typechecking passed and the loopback-enabled Frontend suite passed 218 presentation plus 733 app tests, with zero failures/skips. Its production exclusion check found 76 reachable modules, 226 scanned files and 112 labelled development files, with no development leakage.

`frontend-sandbox-attempt.txt` is the first attempt: eight HTTP/stream cases could not bind 127.0.0.1 (`listen EPERM`) under the sandbox. It is an infrastructure failure, retained separately from the complete successful run.

`c5a-*` belongs to the earlier exact behavioral/room-camera source `c5a70b7eea1c3f755f655d37ac729e5f78d24efc`. Its six synthetic and nine real connected cases are not relabelled as final presentation captures. The connected server summary records the raw local log hash, fifteen early-deadline retry errors, zero ECONNREFUSED messages and successful script exit. The actual host abort and emulator shutdown completed before port release; the server log is not described as error-free.

Both source-guard records preserve the expected refusal from the historical, unmodified consumer approval fence. Frontend does not treat this as a passing check: Integration must adopt the exact new native closure and run the combined production checks.

`round-order-*` ran at the later copy-only native source `d1a03c87e80de7b5923c97a15a968c1ba6f5b40c`: pure/browser typecheck, seven focused library tests and all 952 Frontend tests (219 presentation + 733 app) passed, with no failures/skips. Production exclusion found 113 labelled dev files and no leaks. These logs and the six new round-order panel cases are additional evidence; every earlier c5a/b634 record remains unchanged.
