# Shared Character — Production Acceptance Specification (v1)

Status: **Visual concept approved; production 3D asset not yet built or accepted.**

## Goal
Create one age-appropriate, expressive 3D girl avatar shared by Sky Rush 3D, Mystery Mansion and Creature Quest. Approved reference is the latest character concept shown privately in the design conversation. **Do not upload the original child's photograph or derived identifiable face textures to this public repository.** A production artist must compare the private reference offline, with guardian permission.

## Appearance (locked until owner approves a change)
- Realistic animated-film CGI aesthetic, not a blocky primitive avatar.
- Warm brown eyes, long dark-brown hair with side part, friendly natural smile.
- Pink outer layer, light shirt, jeans and pink/purple sneakers.
- Consistent recognizable proportions and facial structure across all games.
- Avoid artificial skin smoothing or exaggerated adult features. Age-appropriate presentation.

## Real-time asset requirements
- Skinned humanoid 3D mesh with stable skeletal rig (hips, spine, shoulders, elbows, wrists, fingers, neck, head, legs and feet).
- Facial blendshapes or equivalent facial rig: blink left/right, smile, mouth open, eyebrows raised/furrowed, surprise, thinking, disappointment and laugh.
- Secondary hair motion using a performance-budgeted rig; no clipping through face or body.
- GLB/glTF preferred for cross-browser delivery; avoid relying on remote CDN at runtime.
- Use a reusable character controller and animation state machine, not independent moving illustrations.

## Required animation clips
Idle breathing, turn, walk, run, anticipation crouch, jump, airborne, landing, wave, point, celebrate, dance, curious, surprised, worried, relieved. Every clip must have smooth transitions and grounded feet.

## First review: Character Motion Lab
1. Orbit 360 degrees on iPad without disappearing, clipping or breaking controls.
2. Switch among idle, walk, run, jump, surprise, wave and celebrate.
3. Show clear face close-up for blink, smile, surprise and thought.
4. Show full-body movement and side view for jump/land and walking.
5. A correct answer triggers celebration; a wrong answer does not.
6. Test portrait and landscape iPad Safari; keep buttons >= 44 CSS px.
7. Provide reduced motion and mute settings.
8. Check loading, frame pacing and memory on real iPad hardware.

## Acceptance gates
- **G1 Visual likeness:** owner reviews the production render beside private approved image.
- **G2 Rig:** real skeleton and face rig inspected, no static cutout masquerading as 3D.
- **G3 Motion:** walk/run/jump/land/celebrate are visually believable.
- **G4 iPad:** actual Safari touch, portrait/landscape and WebGL tests pass.
- **G5 Reuse:** exact same character asset loads in each of the three games.
All gates remain OPEN until tested and signed off.

## Game-specific expression triggers
- Sky Rush 3D: anticipation before jumps, focused face in motion, relief on landing, excited victory.
- Mystery Mansion: curiosity while investigating, surprise at clues, thoughtful decision-making, relief after escape.
- Creature Quest: delight on discoveries, empathy toward friendly creatures, cautious reactions and celebration.

## Scope control
Do not change the original Bounce Lab theme or the user's existing QuestLab deployment. No paid dependencies or subscriptions. The public repository is for code and non-identifying placeholder assets only.
