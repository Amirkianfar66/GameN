# Preserved cropped-room visual failure

All nine real timer/network/receipt cases passed, including authoritative ballot readback and accepted abort cleanup. Integration then inspected the final Jail room image and found the player's J1 figure almost entirely cropped off the left edge. The nonempty-SVG assertion did not measure on-screen visibility, so it missed a real room-camera defect.

Original facts, provenance and images are unchanged. This run is **failed visual acceptance**, not the final consumer acceptance. The corrected room camera must fit the complete public rig canvas for every fixed place without changing stored slots or drawing sources. New checks measure the actual drawn silhouette in screen coordinates and its visible fraction inside the room/stage. A fresh real journey is required after the new native source freeze, recorded separately in `../connected/`.
