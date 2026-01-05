# Keyboard Navigation

The LazyQMK web editor now supports TUI-like keyboard navigation for the keyboard preview, allowing users to navigate and edit keys without using a mouse.

## Features

### Arrow Key Navigation
- **Arrow Keys** (`↑` `↓` `←` `→`): Navigate between keys in the keyboard preview
- **Shift + Arrow Keys**: Extend selection while navigating
- Navigation uses spatial proximity, finding the nearest key in the direction pressed

### Layer Cycling
- **`[`**: Cycle to previous layer
- **`]`**: Cycle to next layer
- Shortcuts work when keyboard preview has focus

### Key Editing
- **Enter**: Open keycode picker for the currently selected key
- **Escape**: 
  - Close keycode picker (if open)
  - Clear selection (if picker is closed)

### Accessibility
- **Focus Management**: Keyboard preview is focusable with `Tab` key
- **Visual Focus Ring**: Focus-visible outline shows when navigating with keyboard
- **ARIA Roles**: Proper `role="application"` for screen readers
- **Roving Tabindex**: Focus management follows ARIA best practices

### Smart Input Detection
All keyboard shortcuts are **context-aware** and only work when appropriate:
- ✅ Shortcuts work when keyboard preview has focus
- ❌ Shortcuts are **disabled** when typing in text inputs
- ❌ Shortcuts are **disabled** when focus is on select elements
- ❌ Shortcuts are **disabled** in contenteditable elements

This ensures you can type `[`, `]`, or arrow keys in form fields without triggering navigation.

## Usage

1. **Initial Focus**: Click on the keyboard preview or press `Tab` until it receives focus
2. **Navigate**: Use arrow keys to move between keys
3. **Select Multiple**: Hold `Shift` while using arrow keys to extend selection
4. **Edit Key**: Press `Enter` to open the keycode picker for the active key
5. **Change Layer**: Press `[` or `]` to cycle through layers
6. **Clear Selection**: Press `Escape` to clear multi-selection

## Implementation Details

### Files Changed
- **`web/src/lib/utils/keyboardNavigation.ts`**: Core navigation logic
  - `isTypingContext()`: Detects if user is typing in a form element
  - `findAdjacentKey()`: Spatial key finding algorithm
  - `handleKeyboardNavigation()`: Arrow key navigation handler
  - `shouldCycleLayer()`: Layer cycling detection
  - `shouldHandleEscape()`: Escape key handling
  - `shouldOpenPicker()`: Enter key handling

- **`web/src/lib/components/KeyboardPreview.svelte`**: Updated component
  - Added `tabindex="0"` for focusability
  - Added `onkeydown` handler for arrow keys
  - Added `onNavigate` callback prop
  - Added focus-visible styles

- **`web/src/routes/layouts/[name]/+page.svelte`**: Main page integration
  - Added global `keydown` handler for layer cycling and shortcuts
  - Added `handleKeyboardNavigation()` callback
  - Connected navigation to state management

### Accessibility Choices
1. **`role="application"`**: Keyboard preview uses application role because it provides custom keyboard navigation that overrides standard browser behavior
2. **`tabindex="0"`**: Makes the keyboard preview focusable in normal tab order
3. **Focus-visible styles**: Clear 2px ring outline when navigating with keyboard
4. **Context-aware shortcuts**: Prevents hijacking browser shortcuts or form input

### Spatial Navigation Algorithm
The `findAdjacentKey()` function uses a grid-based approach:
1. Calculate center points of current and candidate keys
2. Filter keys based on direction (must be in the correct quadrant)
3. Use combined distance metric: `primaryDistance + secondaryDistance * 0.5`
   - Primary: distance in the navigation direction
   - Secondary: perpendicular offset (weighted lower)
4. Return the key with minimum combined distance

This provides intuitive navigation even on irregular keyboard layouts (split keyboards, ortholinear, staggered, etc.).

## Testing

Unit tests are included in `web/src/lib/utils/keyboardNavigation.test.ts`:
- ✅ 31 tests covering all navigation scenarios
- ✅ Context detection (form elements, contenteditable)
- ✅ Arrow key navigation in all directions
- ✅ Shift-selection extension
- ✅ Layer cycling detection
- ✅ Edge case handling (no adjacent key, empty keyboard)

Run tests with: `npm run test:unit`

## Future Enhancements

Potential improvements for future iterations:
- [ ] Tab key to cycle through keys sequentially
- [ ] Home/End to jump to first/last key in row
- [ ] PageUp/PageDown for layer cycling (alternative to `[` `]`)
- [ ] Ctrl+A to select all keys
- [ ] Visual hint overlay showing available shortcuts
- [ ] Configurable keyboard shortcuts
