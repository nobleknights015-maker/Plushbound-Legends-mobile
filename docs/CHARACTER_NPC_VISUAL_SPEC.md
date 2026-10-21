# Plushbound Legends — Character & NPC Visual Production Standard

This document defines the baseline visual pipeline for all humanoid characters in Plushbound Legends, including the custom player, named NPCs, merchants, quest givers, battle-capable allies, background townsfolk, story characters, and recurring OCs.

## 1. Visual Direction

All humanoid characters use an original classic JRPG / MV-era-inspired visual language without copying RPG Maker stock assets.

Core traits:
- readable chibi overworld silhouettes
- polished anime-fantasy portraits
- practical fantasy clothing with Plushbound-specific stitched/thread motifs
- clean anatomy and normal hands
- strong color coding by role/faction/region
- mobile readability at Moto G scale
- consistent character identity across portrait, overworld, battle, menu, and dialogue views

Plushbound-specific motifs may include:
- stitched seams
- thread charms
- fabric trims
- Waystitch emblems
- Guardian-bond tokens
- embroidered symbols
- layered belts, satchels, scarves, and practical fantasy accessories

## 2. Asset Tiers

### Tier A — Major / Recurring Characters
Used for major story NPCs, recurring allies, named OCs, important rivals, major antagonists, and key service characters.

Required assets:
- full portrait master
- dialogue portrait/bust
- 4-direction overworld walk sprite
- idle animation
- expression set
- UI head icon
- battle sprite if combat-capable
- special pose/event art only when story requires it

Examples: Kazen Ryujin, Chris Bourn, Penney Nguyen, major villains, party-like allies.

### Tier B — Named Supporting NPCs
Used for named quest givers, shopkeepers, Waystitch Keepers, innkeepers, craftsmen, regional guides, etc.

Required assets:
- dialogue portrait/bust
- 4-direction overworld walk sprite or stationary idle sprite
- UI head icon when used in quest/menu systems
- one default expression plus one alternate when useful

Example: Lio the Waystitch Keeper.

### Tier C — Ambient / Background NPCs
Used for townsfolk, travelers, guards, farmers, market visitors, generic staff, etc.

Required assets:
- modular overworld sprite
- optional compact dialogue bust if they have more than one meaningful conversation

Background NPCs should be assembled from reusable modular parts rather than receiving unique full art unless promoted by story importance.

## 3. Player Character Creator Assets

The custom player uses modular parts that must stay visually consistent across all game surfaces.

### Creator options
Baseline categories:
- body build: slim / balanced / broad
- skin tone
- face shape
- eye style
- eye color
- hairstyle
- hair color
- outfit palette
- accessory slot 1
- accessory slot 2 later if performance allows
- name

Avoid continuous sliders for appearance. Use discrete modular choices for stability, readability, and consistent rendering.

### Player portrait master
Recommended master canvas: 512×512 px.

Portrait assembly layers:
1. base head/skin
2. facial features
3. eyes
4. brows
5. hair back
6. hair front
7. clothing shoulders/chest
8. accessory
9. thread/Guardian-bond detail

### Player overworld sprite
Recommended frame size: 64×64 px.

Required directions:
- down
- left
- right
- up

Required frames per direction:
- 3 walk frames minimum

Sheet size at 64×64:
- 192×256 px for one 3×4 walk sheet

Optional later:
- 4-frame idle
- run animation
- interact pose
- emote set
- Guardian-bond activation pose

### Player battle representation
For the current combat style, target 160×160 px per battle frame.

Minimum states if the player is directly shown in combat:
- idle
- command/ready
- item/support
- guard
- Bond Call
- hit

The Guardian remains the primary supernatural combat actor; the player should visually read as commander/support rather than replacing the Guardian’s role.

## 4. Humanoid Overworld Sprite Standard

### Frame size
Preferred: 64×64 px.

### Sheet layout
- 3 columns × 4 rows
- 12 frames total
- row order: down, left, right, up

### Animation timing
- walk: 120–150 ms/frame
- idle: 180–240 ms/frame
- reaction/emote: 100–180 ms/frame

### Silhouette rules
Characters must remain recognizable at small size through:
- hairstyle
- outerwear shape
- dominant palette
- hat/scarf/cape profile
- weapon/tool silhouette only when story-appropriate

Do not depend on tiny facial details for identity on the overworld.

## 5. Humanoid Portrait Standard

### Master size
512×512 px recommended.

### Dialogue crop
Display as bust/head-and-shoulders crop.

### Expression baseline for Tier A
- neutral
- happy/warm
- focused/serious
- concerned/hurt
- surprised

Optional:
- angry
- embarrassed
- tired
- amused

Tier B may use:
- neutral
- one alternate expression

Tier C normally uses no portrait unless needed.

### Portrait style
- anime-fantasy proportions
- clean eyes and facial structure
- readable expression at phone scale
- detailed but not overly noisy clothing
- thread/fabric motifs visible near collar, shoulder, cloak, charm, or sash

## 6. Battle-Capable Human/NPC Sprite Standard

Recommended frame size: 160×160 px.

Minimum animation states:
- idle: 4 frames
- attack/action: 4–6 frames
- skill/support: 4–6 frames
- hit: 2–3 frames
- defeat/down: 2–4 frames

Use battle sprites only for characters who actually participate in combat.

Avoid creating battle sheets for merchants, civilians, and service NPCs unless the story later requires it.

## 7. Dialogue Presentation

Dialogue panels should show:
- character name
- portrait/bust
- readable text
- optional Guardian icon/mini portrait when relevant
- expression change without reloading the whole scene

Named characters should never revert to single-letter placeholder portraits once their production asset exists.

Important recurring characters should have their visual identity preserved across every scene.

## 8. NPC Role Visual Language

### Waystitch Keepers
- layered robes/coats
- thread or map motifs
- Waystitch emblem
- subtle gold/teal accents
- composed, service-oriented silhouettes

### Merchants
- satchels, pouches, aprons, ledgers
- warmer market palettes
- visually obvious trade identity

### Innkeepers
- softer, welcoming shapes
- cloth/apron layers
- warm interior-friendly palettes

### Guards / Protectors
- structured jackets, light armor, reinforced boots
- faction crest or regional trim
- stronger shoulder/silhouette shapes

### Wanderers / Hunters
- practical travel clothing
- layered scarf/cloak
- belts, packs, weathered accents

### Scholars / Threadwrights
- fine stitched details
- notebooks, thread tools, charms
- cleaner robes and layered sleeves

### Villains / Hostile Factions
- stronger silhouette contrast
- sharper forms
- darker or desaturated palettes
- faction markings
- avoid generic black-red-only design unless narratively justified

## 9. Region-Based Character Design

Each region should have a recognizable clothing/material language.

### Sunny Plains of Elyndor
- practical travel clothes
- light fabric
- green, tan, cream, blue accents
- pastoral stitching motifs

### Akatsukiyama
- Japanese-inspired fantasy layering
- dark indigo, charcoal, red, warm gold accents
- mountain/travel protection
- distinct but original textile motifs

Future regions should receive their own palette/material guide before large NPC batches are produced.

## 10. Current Named Character Visual Baselines

### Kazen Ryujin
Role: wandering protector tied to Akatsukiyama.

Visual language:
- darker protector silhouette
- charcoal/indigo layers
- warm ember-red accent
- practical travel clothing
- restrained Japanese-inspired fantasy influence
- Hono appears beside or near him when scene composition allows

Hono remains an ember-fox Guardian and should visually complement Kazen without blending into his silhouette.

### Lio
Role: Waystitch Keeper.

Visual language:
- teal/blue-gray service robes or coat
- gold-thread accents
- Waystitch emblem
- compact practical silhouette
- calm, helpful expression

### Chris Bourn
If used as an established NPC:
- male, 33
- 5'5" / ~165 cm
- tousled medium/dark brown hair
- brown eyes
- black rectangular glasses
- fuller neat/casual beard and mustache
- lean/naturally fit, not bulky
- practical dark clothing with red accents

### Penney Nguyen
If used as an established NPC:
- female, 25
- 4'11"
- short dark blue hair
- black/purple/white palette
- modern fantasy adaptation of her established casual style
- bunny necklace/motif may be retained as a personal accessory
- proportions must reflect her shorter height consistently

## 11. Asset Naming Convention

Use lowercase snake_case.

Pattern:
characterid_assettype_variant.ext

Examples:
- kazen_overworld_walk.png
- kazen_portrait_neutral.png
- kazen_portrait_focused.png
- lio_overworld_idle.png
- lio_portrait_default.png
- chris_portrait_default.png
- penney_icon.png

Player modular assets:
- player_face_01.png
- player_hair_front_03.png
- player_hair_back_03.png
- player_outfit_02.png
- player_accessory_glasses_01.png

## 12. Folder Structure

assets/
  characters/
    player/
      creator/
      overworld/
      battle/
      portraits/
      ui/
    kazen/
      overworld/
      portraits/
      battle/
      ui/
    lio/
      overworld/
      portraits/
      ui/
    chris/
      overworld/
      portraits/
      battle/
      ui/
    penney/
      overworld/
      portraits/
      battle/
      ui/
  npc_modular/
    heads/
    hair/
    outfits/
    accessories/
    palettes/

## 13. Modular Background NPC System

To avoid creating hundreds of unique files, ambient NPCs use modular combinations.

Minimum reusable pool target:
- 8 head/skin combinations
- 12 hairstyles
- 8 hair palettes
- 10 outfit silhouettes
- 8 outfit palettes
- 8 accessories

This allows many combinations while keeping APK size controlled.

Rules:
- avoid duplicate-looking NPCs standing close together
- regional outfit rules override random generation
- important NPCs must use authored designs, not random modular generation

## 14. Height and Proportion Handling

Humanoid characters should not all render at identical scale.

Use a small set of safe sprite scale categories:
- petite: 0.92
- standard: 1.00
- tall: 1.08
- broad: width emphasis without excessive height increase

Never stretch only one body axis in a way that distorts anatomy.

Named character height differences should remain visually consistent in cutscenes and portraits.

## 15. Mobile Performance Rules

Moto G remains the baseline device.

Use:
- sprite sheets instead of excessive separate frame files where practical
- compressed PNG/WebP depending on transparency needs
- portraits sized near actual display requirements
- scene-based asset loading
- shared modular NPC assets
- limited simultaneous animated portraits

Avoid:
- huge 4K character images
- live layered character rigs for every NPC
- excessive particle effects attached to idle characters
- decoding all NPC portrait art at scene start

## 16. Quality Rules

All production character art must preserve:
- normal anatomy
- consistent hands
- no merged fingers/limbs
- no warped faces
- no extra limbs
- consistent clothing between related assets
- correct character height/proportion
- legible UI text
- clean silhouette at phone scale

## 17. Production Order

### Phase 1 — Current playable slice
1. Player creator visual baseline
2. Player overworld sprite
3. Kazen + Hono
4. Lio
5. starter Guardian visuals
6. Frayling enemy
7. dialogue portraits

### Phase 2 — Elyndor population
1. quest givers
2. merchants
3. inn/service NPCs
4. guards/protectors
5. ambient townsfolk modular pool

### Phase 3 — Recurring OCs and Akatsukiyama
1. Chris
2. Penney
3. Akatsukiyama cast
4. regional enemy/ally characters

### Phase 4 — polish
1. additional expressions
2. event poses
3. alternate outfits
4. combat animation expansion
5. bond-reaction scenes

## 18. Definition of Done for a Named NPC

A Tier A character is production-ready when:
- design is approved
- overworld sprite works in all 4 directions
- default portrait works in dialogue
- required expressions exist
- UI icon exists
- battle set exists if combat-capable
- palette and proportions remain consistent across all assets
- asset source/license is recorded in the ledger

A Tier B character is production-ready when:
- overworld sprite or stationary sprite exists
- dialogue portrait exists
- role identity is clear
- palette/proportions are consistent
- asset source/license is recorded

## 19. Legal / Asset Ledger Requirement

Every shipped character asset must be categorized as one of:
- original project asset
- commissioned asset with commercial rights
- properly licensed third-party asset
- excluded/non-shippable reference-only asset

No unknown-origin sprite or portrait should enter a release build.

## 20. Default Rule Going Forward

Any new named humanoid character added to Plushbound Legends should be assigned Tier A, B, or C immediately and built according to this standard. This keeps the whole cast visually consistent and prevents placeholder art from becoming permanent by accident.
