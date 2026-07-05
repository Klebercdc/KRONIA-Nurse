# Animate UI Component Registry

Install any item with: `npx shadcn@latest add @animate-ui/<name>`
Import path after install: `@/components/animate-ui/<section>/<group>/<name>` (mirrors the registry name with dashes replaced by slashes).

Components depend on their matching primitive (auto-installed as a registry dependency).

## components/animate

- `@animate-ui/components-animate-avatar-group` — Avatar Group: An animated avatar group that displays overlapping user images and smoothly shifts each avatar forward on hover to highlight it.
- `@animate-ui/components-animate-code` — Code: A code component that animates the code as it is written.
- `@animate-ui/components-animate-code-tabs` — Code Tabs: A tabs component that displays code for different languages.
- `@animate-ui/components-animate-cursor` — Cursor: An animated cursor component that allows you to customize both the cursor and cursor follow elements with smooth animations.
- `@animate-ui/components-animate-github-stars-wheel` — GitHub Stars Wheel: A scrolling wheel that displays GitHub stars count.
- `@animate-ui/components-animate-tabs` — Tabs: A set of layered sections of content—known as tab panels—that are displayed one at a time.
- `@animate-ui/components-animate-tooltip` — Tooltip: A tooltip is a small box that appears when hovering over an element.

## components/backgrounds

- `@animate-ui/components-backgrounds-bubble` — Bubble Background: An interactive background featuring smoothly animated gradient bubbles, creating a playful, dynamic, and visually engaging backdrop.
- `@animate-ui/components-backgrounds-fireworks` — Fireworks Background: A background component that displays a fireworks animation.
- `@animate-ui/components-backgrounds-gradient` — Gradient Background: A background component featuring a subtle yet engaging animated gradient effect, smoothly transitioning colors to enhance visual depth.
- `@animate-ui/components-backgrounds-gravity-stars` — Gravity Stars Background: A background component featuring a subtle yet engaging animated gravity stars effect.
- `@animate-ui/components-backgrounds-hexagon` — Hexagon Background: A background component featuring an interactive hexagon grid.
- `@animate-ui/components-backgrounds-hole` — Hole Background: A background component featuring an animated hole grid.
- `@animate-ui/components-backgrounds-stars` — Stars Background: An interactive background featuring animated dots of varying sizes and speeds, simulating a dynamic and immersive starry space effect.

## components/base

- `@animate-ui/components-base-accordion` — Accordion: A set of collapsible panels with headings.
- `@animate-ui/components-base-alert-dialog` — Alert Dialog: A dialog that requires user response to proceed.
- `@animate-ui/components-base-checkbox` — Checkbox: An easily stylable checkbox component.
- `@animate-ui/components-base-dialog` — Dialog: A popup that opens on top of the entire page.
- `@animate-ui/components-base-files` — Files: A component that allows you to display a list of files and folders.
- `@animate-ui/components-base-menu` — Menu: A list of actions in a dropdown, enhanced with keyboard navigation.
- `@animate-ui/components-base-popover` — Popover: An accessible popup anchored to a button.
- `@animate-ui/components-base-preview-card` — Preview Card: A popup that appears when a link is hovered, showing a preview for sighted users.
- `@animate-ui/components-base-preview-link-card` — Preview Link Card: Displays a preview image of a link when hovered.
- `@animate-ui/components-base-progress` — Progress: Displays the status of a task that takes a long time.
- `@animate-ui/components-base-radio` — Base Radio: An easily stylable radio button component.
- `@animate-ui/components-base-switch` — Switch: A control that indicates whether a setting is on or off.
- `@animate-ui/components-base-tabs` — Tabs: A component for toggling between related panels on the same page.
- `@animate-ui/components-base-toggle` — Toggle: A two-state button that can be on or off.
- `@animate-ui/components-base-toggle-group` — Toggle Group: Provides a shared state to a series of toggle buttons.
- `@animate-ui/components-base-tooltip` — Tooltip: A popup that appears when an element is hovered or focused, showing a hint for sighted users.

## components/buttons

- `@animate-ui/components-buttons-button` — Button: A button component with a variety of styles and animations.
- `@animate-ui/components-buttons-copy` — Copy Button: A copy button component with a variety of styles and animations.
- `@animate-ui/components-buttons-flip` — Flip Button: A button that flips between two states on hover.
- `@animate-ui/components-buttons-github-stars` — GitHub Stars Button: A clickable button that links to a GitHub repository and displays the number of stars.
- `@animate-ui/components-buttons-icon` — Icon Button: An icon button component with a variety of styles and animations.
- `@animate-ui/components-buttons-liquid` — Liquid Button: A button that fills on hover.
- `@animate-ui/components-buttons-ripple` — Ripple Button: A button that animates on tap with a ripple effect.
- `@animate-ui/components-buttons-theme-toggler` — Theme Toggler Button: A button that toggles the theme gradually.

## components/community

- `@animate-ui/components-community-flip-card` — Flip Card: A 3D animated card component that flips to reveal content on the back.
- `@animate-ui/components-community-management-bar` — Management Bar: A management bar for managing items.
- `@animate-ui/components-community-motion-carousel` — Motion Carousel: A carousel built on top of Embla Carousel with smooth Motion-powered animations. Each slide scales dynamically based on its active state, and the pagination uses animated pill-style dot buttons for an interactive, fluid experience.
- `@animate-ui/components-community-notification-list` — Notification List: A fun notification list with animated stacking and cards that expand as you interact.
- `@animate-ui/components-community-pin-list` — Pin List: A playful list for pinning and unpinning items, with smooth animated transitions as items move between groups.
- `@animate-ui/components-community-playful-todolist` — Playful Todolist: A playful todolist component with animated wavy strikethroughs for each completed task.
- `@animate-ui/components-community-radial-intro` — Radial Intro: A circular intro animation component that arranges elements in a radial layout, smoothly transitioning them into orbit with looping motion.
- `@animate-ui/components-community-radial-menu` — Radial Menu: A circular context menu built with Base UI, displaying actions in a clean radial layout with full keyboard support and smooth interaction.
- `@animate-ui/components-community-radial-nav` — Radial Nav: A circular navigation menu with animated pointer and expanding buttons for smooth interactive transitions.
- `@animate-ui/components-community-share-button` — Share Button: This is a button for sharing.
- `@animate-ui/components-community-user-presence-avatar` — User Presence Avatar: A compact avatar group for showing online and offline users, with smooth animated transitions when presence changes.

## components/headless

- `@animate-ui/components-headless-accordion` — Accordion: A vertically stacked set of interactive headings that each reveal an associated section of content.
- `@animate-ui/components-headless-checkbox` — Checkbox: Checkboxes provide the same functionality as native HTML checkboxes, without any of the styling, giving you a clean slate to design them however you'd like.
- `@animate-ui/components-headless-dialog` — Dialog: A fully-managed, renderless dialog component jam-packed with accessibility and keyboard features, perfect for building completely custom dialogs and alerts.
- `@animate-ui/components-headless-popover` — Popover: Popovers are perfect for floating panels with arbitrary content like navigation menus, mobile menus and flyout menus.
- `@animate-ui/components-headless-switch` — Switch: Switches are a pleasant interface for toggling a value between two states, and offer the same semantics and keyboard navigation as native checkbox elements.
- `@animate-ui/components-headless-tabs` — Tabs: Easily create accessible, fully customizable tab interfaces, with robust focus management and keyboard navigation support.

## components/radix

- `@animate-ui/components-radix-accordion` — Accordion: A vertically stacked set of interactive headings that each reveal an associated section of content.
- `@animate-ui/components-radix-alert-dialog` — Alert Dialog: A modal dialog that interrupts the user with important content and expects a response.
- `@animate-ui/components-radix-checkbox` — Checkbox: A control that allows the user to toggle between checked and not checked.
- `@animate-ui/components-radix-dialog` — Dialog: A window overlaid on either the primary window or another dialog window, rendering the content underneath inert.
- `@animate-ui/components-radix-dropdown-menu` — Dropdown Menu: Displays a menu to the user — such as a set of actions or functions — triggered by a button.
- `@animate-ui/components-radix-files` — Files: A component that allows you to display a list of files and folders.
- `@animate-ui/components-radix-hover-card` — Hover Card: For sighted users to preview content available behind a link.
- `@animate-ui/components-radix-popover` — Popover: Displays rich content in a portal, triggered by a button.
- `@animate-ui/components-radix-preview-link-card` — Preview Link Card: Displays a preview image of a link when hovered.
- `@animate-ui/components-radix-progress` — Progress: Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
- `@animate-ui/components-radix-radio-group` — Radio Group: A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time.
- `@animate-ui/components-radix-sheet` — Sheet: Extends the Dialog component to display content that complements the main content of the screen.
- `@animate-ui/components-radix-sidebar` — Sidebar: A composable, themeable and customizable sidebar component. Created by Shadcn and animated by Animate UI.
- `@animate-ui/components-radix-switch` — Switch: A control that allows the user to toggle between checked and not checked.
- `@animate-ui/components-radix-tabs` — Tabs: A set of layered sections of content—known as tab panels—that are displayed one at a time.
- `@animate-ui/components-radix-toggle` — Toggle: A two-state button that can be either on or off.
- `@animate-ui/components-radix-toggle-group` — Toggle Group: A set of two-state buttons that can be toggled on or off.
- `@animate-ui/components-radix-tooltip` — Tooltip: A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.

## primitives/animate

- `@animate-ui/primitives-animate-avatar-group` — Avatar Group: An animated avatar group that displays overlapping user images and smoothly shifts each avatar forward on hover to highlight it.
- `@animate-ui/primitives-animate-code-block` — Code Block: A code block component that animates the code as it is written.
- `@animate-ui/primitives-animate-cursor` — Cursor: An animated cursor component that allows you to customize both the cursor and cursor follow elements with smooth animations.
- `@animate-ui/primitives-animate-github-stars` — Github Stars: A component that animates a number of stars, smoothly animating number transitions using the SlidingNumber component.
- `@animate-ui/primitives-animate-motion-grid` — Motion Grid: A grid that displays animations in a grid.
- `@animate-ui/primitives-animate-pinned-list` — Pin List: A pin list component that allows you to pin items to the top of the list.
- `@animate-ui/primitives-animate-scroll-progress` — Scroll Progress: A scroll progress component that allows you to track the progress of a scrollable element.
- `@animate-ui/primitives-animate-slot` — Animate Slot: A slot component that allows you to use motion components with any element.
- `@animate-ui/primitives-animate-spring` — Spring: A flexible, animated spring component that attaches a draggable element to its origin with a spring line.
- `@animate-ui/primitives-animate-tabs` — Tabs: A set of layered sections of content—known as tab panels—that are displayed one at a time.
- `@animate-ui/primitives-animate-tooltip` — Tooltip: An animated tooltip that shows contextual info on hover or focus and smoothly glides to the next element without disappearing between transitions.

## primitives/base

- `@animate-ui/primitives-base-accordion` — Base Accordion: An easily stylable accordion component.
- `@animate-ui/primitives-base-alert-dialog` — Base Alert Dialog: A dialog that requires user response to proceed.
- `@animate-ui/primitives-base-checkbox` — Base Checkbox: An easily stylable checkbox component.
- `@animate-ui/primitives-base-collapsible` — Base Collapsible: A collapsible panel controlled by a button.
- `@animate-ui/primitives-base-dialog` — Base Dialog: A popup that opens on top of the entire page.
- `@animate-ui/primitives-base-files` — Files: A component that allows you to display a list of files and folders.
- `@animate-ui/primitives-base-menu` — Base Menu: A list of actions in a dropdown, enhanced with keyboard navigation.
- `@animate-ui/primitives-base-popover` — Base Popover: An accessible popup anchored to a button.
- `@animate-ui/primitives-base-preview-card` — Base Preview Card: A popup that appears when a link is hovered, showing a preview for sighted users.
- `@animate-ui/primitives-base-preview-link-card` — Base Preview Link Card: Displays a preview image of a link when hovered.
- `@animate-ui/primitives-base-progress` — Base Progress: Displays the status of a task that takes a long time.
- `@animate-ui/primitives-base-radio` — Base Radio: An easily stylable radio button component.
- `@animate-ui/primitives-base-switch` — Base Switch: A control that indicates whether a setting is on or off.
- `@animate-ui/primitives-base-tabs` — Base Tabs: A component for toggling between related panels on the same page.
- `@animate-ui/primitives-base-toggle` — Base Toggle: A two-state button that can be on or off.
- `@animate-ui/primitives-base-toggle-group` — Base Toggle Group: Provides a shared state to a series of toggle buttons.
- `@animate-ui/primitives-base-tooltip` — Base Tooltip: A popup that appears when an element is hovered or focused, showing a hint for sighted users.

## primitives/buttons

- `@animate-ui/primitives-buttons-button` — Button: A simple button that animates on hover and tap.
- `@animate-ui/primitives-buttons-flip` — Flip Button: A button that flips between two states on hover.
- `@animate-ui/primitives-buttons-liquid` — Liquid Button: A button that fills on hover.
- `@animate-ui/primitives-buttons-ripple` — Ripple Button: A button that animates on tap with a ripple effect.

## primitives/effects

- `@animate-ui/primitives-effects-auto-height` — Auto Height: An effect that automatically adjusts the height of an element based on its content.
- `@animate-ui/primitives-effects-blur` — Blur: An effect that allows you to animate elements with a blur effect on first view or load.
- `@animate-ui/primitives-effects-click` — Click: An effect that creates animated effects at the click position, adding interactive feedback to user actions.
- `@animate-ui/primitives-effects-effect` — Effect: An effect that allows you to animate elements on first view or load.
- `@animate-ui/primitives-effects-fade` — Fade: An effect that allows you to animate elements with a fade effect on first view or load.
- `@animate-ui/primitives-effects-highlight` — Highlight: A highlight effect that allows you to highlight elements on hover, click or with a controlled value.
- `@animate-ui/primitives-effects-image-zoom` — Image Zoom: An effect that allows you to zoom in on an image on hover.
- `@animate-ui/primitives-effects-magnetic` — Magnetic: A magnetic effect that clings to the cursor, creating a magnetic attraction effect.
- `@animate-ui/primitives-effects-particles` — Particles: A particles effect that creates a particle system.
- `@animate-ui/primitives-effects-shine` — Shine: An animated light sweep effect with configurable timing, colors, and triggers (hover, tap, or continuous).
- `@animate-ui/primitives-effects-slide` — Slide: An effect that allows you to animate elements with a slide effect on first view or load.
- `@animate-ui/primitives-effects-theme-toggler` — Theme Toggler: An effect that allows you to toggle the theme gradually.
- `@animate-ui/primitives-effects-tilt` — Tilt: An effect that allows you to animate elements with a tilt effect on mouse hover.
- `@animate-ui/primitives-effects-zoom` — Zoom: An effect that allows you to animate elements with a zoom effect on first view or load.

## primitives/headless

- `@animate-ui/primitives-headless-checkbox` — Headless Checkbox: Checkboxes provide the same functionality as native HTML checkboxes, without any of the styling, giving you a clean slate to design them however you'd like.
- `@animate-ui/primitives-headless-dialog` — Headless Dialog: A fully-managed, renderless dialog component jam-packed with accessibility and keyboard features, perfect for building completely custom dialogs and alerts.
- `@animate-ui/primitives-headless-disclosure` — Headless Disclosure: A simple, accessible foundation for building custom UIs that show and hide content, like togglable accordion panels.
- `@animate-ui/primitives-headless-popover` — Headless Popover: Popovers are perfect for floating panels with arbitrary content like navigation menus, mobile menus and flyout menus.
- `@animate-ui/primitives-headless-switch` — Headless Switch: Switches are a pleasant interface for toggling a value between two states, and offer the same semantics and keyboard navigation as native checkbox elements.
- `@animate-ui/primitives-headless-tabs` — Headless Tabs: Easily create accessible, fully customizable tab interfaces, with robust focus management and keyboard navigation support.

## primitives/radix

- `@animate-ui/primitives-radix-accordion` — Radix Accordion: A vertically stacked set of interactive headings that each reveal an associated section of content.
- `@animate-ui/primitives-radix-alert-dialog` — Radix Alert Dialog: A modal dialog that interrupts the user with important content and expects a response.
- `@animate-ui/primitives-radix-checkbox` — Radix Checkbox: A control that allows the user to toggle between checked and not checked.
- `@animate-ui/primitives-radix-collapsible` — Radix Collapsible: An interactive component which expands/collapses a panel.
- `@animate-ui/primitives-radix-dialog` — Radix Dialog: A window overlaid on either the primary window or another dialog window, rendering the content underneath inert.
- `@animate-ui/primitives-radix-dropdown-menu` — Radix Dropdown Menu: Displays a menu to the user — such as a set of actions or functions — triggered by a button.
- `@animate-ui/primitives-radix-files` — Files: A component that allows you to display a list of files and folders.
- `@animate-ui/primitives-radix-hover-card` — Radix Hover Card: For sighted users to preview content available behind a link.
- `@animate-ui/primitives-radix-popover` — Radix Popover: Displays rich content in a portal, triggered by a button.
- `@animate-ui/primitives-radix-preview-link-card` — Radix Preview Link Card: Displays a preview image of a link when hovered.
- `@animate-ui/primitives-radix-progress` — Radix Progress: Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
- `@animate-ui/primitives-radix-radio-group` — Radix Radio Group: A set of checkable buttons—known as radio buttons—where no more than one of the buttons can be checked at a time.
- `@animate-ui/primitives-radix-sheet` — Radix Sheet: Extends the Dialog component to display content that complements the main content of the screen.
- `@animate-ui/primitives-radix-switch` — Radix Switch: A control that allows the user to toggle between checked and not checked.
- `@animate-ui/primitives-radix-tabs` — Radix Tabs: A set of layered sections of content—known as tab panels—that are displayed one at a time.
- `@animate-ui/primitives-radix-toggle` — Radix Toggle: A two-state button that can be either on or off.
- `@animate-ui/primitives-radix-toggle-group` — Radix Toggle Group: A set of two-state buttons that can be toggled on or off.
- `@animate-ui/primitives-radix-tooltip` — Radix Tooltip: A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.

## primitives/texts

- `@animate-ui/primitives-texts-counting-number` — Counting Number: A counting number animation.
- `@animate-ui/primitives-texts-gradient` — Gradient Text: A gradient text animation.
- `@animate-ui/primitives-texts-highlight` — Highlight Text: A highlight text animation.
- `@animate-ui/primitives-texts-morphing` — Morphing Text: A text component that smoothly morphs characters to transition between strings.
- `@animate-ui/primitives-texts-rolling` — Rolling Text: A rolling text animation.
- `@animate-ui/primitives-texts-rotating` — Rotating Text: A rotating text animation.
- `@animate-ui/primitives-texts-scrolling-number` — Scrolling Number: A scrolling number animation.
- `@animate-ui/primitives-texts-shimmering` — Shimmering Text: A shimmering text animation.
- `@animate-ui/primitives-texts-sliding-number` — Sliding Number: A sliding number animation.
- `@animate-ui/primitives-texts-splitting` — Splitting Text: A splitting text animation.
- `@animate-ui/primitives-texts-typing` — Typing Text: A typing text animation.
