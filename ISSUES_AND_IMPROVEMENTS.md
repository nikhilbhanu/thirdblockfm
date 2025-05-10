# third block fm — Issues, Limitations, and Architecture Improvements

## Known Issues & Limitations

### 1. HTML Audio & IcecastMetadataPlayer Limitations (Especially on Mobile)
- **Autoplay Restrictions**: Most mobile browsers require user interaction before audio can play. Initial play attempts may fail unless triggered by a tap/click.
- **Background Playback**: Mobile browsers may pause or throttle audio when the app is backgrounded or the device is locked.
- **Network Interruptions**: Mobile networks are less stable; stream interruptions may not recover gracefully.
- **Volume Control**: Some mobile devices ignore programmatic volume changes for security reasons.
- **Third-Party Library Risks**: Reliance on IcecastMetadataPlayer means updates, bugs, or browser compatibility issues are outside direct project control.
- **Browser Support**: Not all browsers may fully support the APIs used by IcecastMetadataPlayer.

### 2. Event Handling & Playback Logic
- **Event Cleanup**: If event listeners are not properly cleaned up, memory leaks or unexpected behavior may occur.
- **Error Propagation**: Some errors (e.g., stream errors, metadata errors) are only logged to the console, not shown to the user.
- **No Crossfade**: There is no crossfade between stations; switching is abrupt.

### 3. Metadata Handling
- **Metadata Reliability**: If the stream does not provide ICY metadata, artist/track info will show as "unknown".
- **Parsing**: Assumes a specific format for StreamTitle; unexpected formats may break display.
- **No Retry UI**: If metadata fails to load, there is no user-facing retry or error message.

### 4. Accessibility & Usability
- **Custom Controls**: The vertical switch UI is not a native control; screen readers may not interpret it correctly.
- **Keyboard Navigation**: While some keyboard support exists, focus states and ARIA roles could be improved.
- **Touch Targets**: On small screens, controls may be too small for comfortable tapping.
- **Color Contrast & Font Size**: Retro color palette and small pixel font may not meet WCAG contrast guidelines or be readable for all users.

### 5. UI/UX
- **Fixed Positioning**: The player is fixed to the top-left, which may not be ideal for all devices or orientations.
- **No User-Facing Error States**: Errors are not surfaced to the user; only visible in the console (or ConsoleLogDisplay in dev).
- **No Dark Mode**: Only a light theme is available.
- **No Customization**: Users cannot adjust font size, color scheme, or layout.

### 6. Mobile & PWA
- **Not a PWA**: The app is not installable or offline-capable.
- **Font Scaling**: Pixel font may be too small on high-DPI or small screens.
- **Testing**: Needs more testing on a variety of devices and browsers for compatibility.

---

## Architecture & Code Improvements

### 1. Audio Handling
- Use the [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) to improve lock screen controls and metadata on mobile.
- Consider fallback logic for browsers that do not support required APIs.
- Add robust error handling for audio events (`onerror`, `onstalled`, etc.) and display user-friendly messages.

### 2. Event Handling
- Ensure all event listeners are properly cleaned up to prevent memory leaks.
- Surface errors and loading states to the user, not just the console.

### 3. Metadata & API
- Add retry logic or exponential backoff for metadata fetch failures.
- Validate and sanitize all metadata before display.
- Allow for custom metadata parsing or fallback display.

### 4. Accessibility
- Improve ARIA roles and keyboard navigation for all controls.
- Increase touch target size and add visible focus indicators.
- Provide alternative text for all icons and controls.
- Consider larger or scalable font options.

### 5. UI/UX
- Add loading/error states for streams and metadata.
- Consider a dark mode or high-contrast theme for accessibility.
- Make the player draggable or allow repositioning on desktop.
- Allow user customization of color themes or font size.

### 6. Mobile & PWA
- Consider making the app a Progressive Web App (PWA) for better mobile experience and offline support.
- Test on a variety of devices and browsers for compatibility.

---

## References

- [MDN: HTMLAudioElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement)
- [MDN: Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API)
- [WebAIM: Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/)

---

## Summary

While the current architecture is robust for desktop and modern browsers, mobile and accessibility limitations are inherent to the HTML audio API, custom UI, and reliance on third-party libraries. Addressing the above issues will improve reliability, usability, and inclusivity across all platforms.

---

## Actionable Recommendations (2025-05-09)

**Highest Impact Improvements:**
- Implement user-facing error and loading states for audio and metadata.
- Increase color contrast and touch target size for accessibility.
- Add ARIA roles, keyboard navigation, and focus indicators for all controls.
- Use the Media Session API for improved mobile lock screen controls.
- Add retry logic and user feedback for metadata failures.
- Test and optimize for a variety of mobile devices and browsers.

**Quick Wins:**
- Add a dark mode or high-contrast theme option.
- Make the player draggable or repositionable on desktop.
- Provide tooltips/help text for custom controls.
- Add a project logo and update favicon for stronger branding.

**Longer-Term Enhancements:**
- Refactor event handling to ensure all listeners are cleaned up.
- Consider making the app a PWA for installability and offline support.
- Allow user customization of font size and color themes.

**Ongoing:**
- Regularly test on new devices and browsers.
- Monitor third-party library updates for compatibility.

These recommendations are prioritized to maximize user experience, accessibility, and maintainability.
