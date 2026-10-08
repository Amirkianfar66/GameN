# Compact V1 phone interface

The owner requested this simplification after testing staging on 8 October 2026:
nine characters in a matrix selected by one tap; a role-card-only reveal;
the main game fitting the phone without page scrolling; timers/data in a top bar;
and simple bottom navigation similar to a mobile social app.

This supersedes the earlier phone layout's visible instruction paragraphs,
separate name/confirmation form and stacked gameplay sections. A character tap
confirms the existing name or the character call sign. Server uniqueness,
30-second selection with fallback, random role assignment, 30-second minimum
reading and every human's explicit Ready remain unchanged. The Ready control is
retained as part of the card flow. Optional settings, recovery, readable lists
and public vote details stay accessible through Menu; private information is
only constructed after an explicit authorized private-view action.

This is presentation scope. It does not change protocol, ruleset, powers,
timing authority, resource costs or disclosure recipients. Integration is a
follow-up to issue #79 / PR #80 from source `57174b93e2b4abba1b05a79c908593de618e5ca5`.


The owner's next mobile test requested movement by tapping the room-name tag,
removal of Move from the Actions menu, and controls displayed over the current
game board rather than switching views. This explicitly approves board-based
room picking previously deferred by the design handoff. Room A, Room B and
Command labels are uniform public buttons; the existing private controller
checks the server's destinations after the tap and shows the normal guarded
confirmation. Other actions, Card and Menu are dismissible panels over the board.
No role-specific eligibility marker is drawn on the public board. In-flight and
uncertain requests cannot be replaced by a room tap. Movement costs, phase
limits, hospital/jail restrictions and Captain access remain unchanged.
