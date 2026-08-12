# Design Brief: TimeSlotPicker

## Problem
The current scheduling workflow requires users to manually enter time slots, which can lead to errors and inconsistencies. A time-slot-picker component would allow users to easily select available time slots, improving the overall user experience and reducing mistakes. This component would be particularly useful in features like meeting scheduling and appointment booking, where precise time selection is crucial. By providing a standardized time-slot-picker component, we can ensure consistency across the application and make it easier for users to interact with time-based features.

## Category
actions

## Expected variants
- default
- compact
- with-timezone
- with-duration

## Notes
(none)

## Design system guidelines
- Every color, spacing, radius, and font value must come from the shared token library — never a raw hex/px value. Token references look like `{color.action.primary.default.bg}`, `{spacing.md}`, `{radius.md}`.
- Name each anatomy part clearly (e.g. root, label, icon) and mark which parts are optional.
- Design every interaction state this component needs — default, hover, active, focus, disabled, loading — only the ones that actually apply.
- Document keyboard behavior and ARIA requirements per state. A component can't ship as "stable" without at least one accessibility requirement recorded.
- See `components/button/spec.json` in this repo for a fully worked example of the token, anatomy, and accessibility conventions this component should follow.

## Figma structure (what Verify actually checks)
Verify reads the file's real structure via the Figma REST API — a spec sheet or mockup showing every variant won't reconcile, no matter how accurate it looks, unless the file is actually built this way:
- Build it as a Figma **Component Set** — not a Frame, Group, or mockup. Create each variant as its own Component (select it, Ctrl/Cmd+Alt+K), then select all of them and Combine as Variants.
- Each variant's own component name must contain that variant's text somewhere in it — e.g. a "State=With Timezone" variant property matches "with-timezone" fine, spacing vs. hyphens doesn't matter.
- Name it "TimeSlotPicker" somewhere in the file — casing and spacing don't matter ("Time Slot Picker" works as well as "TimeSlotPicker").
- Bind at least one fill or text style under it to a real Figma Variable from the shared token library — referencing a token by name in a text label isn't enough, it has to be an actual bound variable.

## Once built
Share the Figma file with the platform team and record its file key on this request (`figmaFileKey`), then run `ds request verify time-slot-picker` to reconcile it automatically.
