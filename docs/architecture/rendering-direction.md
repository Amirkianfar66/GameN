# Rendering direction after the Three.js discussion

**Status:** Proposed visual direction for the first evaluation slice; not a benchmarked renderer decision.

The earlier architecture selected PixiJS for an illustrated 2D board. The subsequent discussion identified Three.js as a better fit if Mothership's digital board should have actual depth, volumetric tokens, lighting, shadows and controlled camera motion.

Build the candidate board slice with **React + TypeScript + React Three Fiber + Three.js**. Use a fixed or tightly constrained camera and stylized 2.5D scene. Keep readable card details, private information, voting and ordinary controls in React's DOM layer. Firebase and the server rules engine retain the same responsibilities.

The Designer supplies a comic art direction with painted textures, selective toon shading and restrained halftone. Do not expose hidden identity through token colors, asset loading, audio, highlights or camera focus.

The Frontend agent owns renderer integration and lifecycle. The Designer owns visual specifications and source assets. Shared design tokens are versioned. Test on actual mobile devices; GPU cost, load time and readability decide whether this direction is accepted for the production board.

Use one primary board renderer in the first slice. Introducing PixiJS and Three.js together requires a demonstrated need. If the intended product stays primarily a physical board plus private phone controls, the value of the 3D board should be reviewed.

The user subsequently requested expressive comic motion graphics. See [the motion direction](../design/motion-direction.md): layered 2D panels, ink effects and readable lettering accompany the candidate 2.5D board. GSAP remains the timeline direction from the architecture. This request does not require a new renderer or change Firebase/engine responsibilities.

Official references checked in the preceding design review:

- https://threejs.org/manual/pages/fundamentals.html
- https://r3f.docs.pmnd.rs/getting-started/introduction
- https://r3f.docs.pmnd.rs/advanced/scaling-performance
- https://threejs.org/docs/pages/MeshToonMaterial.html
- https://threejs.org/docs/pages/HalftonePass.html

No source assets, 3D board, renderer benchmark or production implementation are included merely by adopting this direction for evaluation.
