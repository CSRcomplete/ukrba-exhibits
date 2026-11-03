# UKRBA Exhibits kiosk

Fullscreen looping promo video at https://exhibits.ukrba.org. Touch the screen and the pledge form opens;
after submitting (4s thank-you) or 60s of no activity it returns to the video. Submissions go to the Wix
CMS via `wix-http-functions.js`.

## Setting up each tablet (do this the day before)

1. Connect to wifi and open https://exhibits.ukrba.org once so the video downloads and caches.
2. Windows: **Settings > System > Power & battery > Screen and sleep** — set *Screen off* and *Sleep* to **Never**
   (both "on battery" and "plugged in"), and keep the tablet on charge. The page also requests a screen wake lock,
   but this setting is the safety net.
3. Launch in kiosk mode (no address bar, no tabs). Make a desktop shortcut with this target:

   Edge:   `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk https://exhibits.ukrba.org --edge-kiosk-type=fullscreen --autoplay-policy=no-user-gesture-required`

   Chrome: `"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk https://exhibits.ukrba.org --autoplay-policy=no-user-gesture-required`

   Without kiosk mode the page still works: the first touch switches it to fullscreen.
4. Turn on Windows **Do not disturb** / disable notifications, and close other apps.
5. To exit kiosk mode: Alt+F4 (or Ctrl+Alt+Del) using the keyboard.

## Configuration (Railway variables)

| Variable | Purpose | Default |
|---|---|---|
| `EXHIBITS_API_KEY` | Shared secret sent to Wix as `x-api-key` | (required) |
| `WIX_ENDPOINT` | Wix function URL | `https://www.ukrba.org/_functions/exhibitLead` |
| `VIDEO_URL` | Video source | `/video.mp4` |
| `VIDEO_FIT` | `contain` shows the whole video in its panel; `cover` fills the panel (may crop edges) | `contain` |
| `VIDEO_BACKGROUND` | Colour of the video panel behind the video, e.g. `#ffffff` | white |
| `VIDEO_SOUND` | Set `true` to play the video's audio. Works from the first load in kiosk mode (the `--autoplay-policy` flag above); otherwise it starts muted and sound begins after the first touch. Also check the tablet volume | `false` |
| `SHOW_HINT` | Set `false` to hide the "Touch the screen" pill (if the video already says it) | `true` |
| `INACTIVITY_SECONDS` | Idle time before the form closes and the video resumes | `60` |

Replacing the video: swap `public/video.mp4` (keep it small, H.264 MP4) or host it elsewhere and set `VIDEO_URL`.
