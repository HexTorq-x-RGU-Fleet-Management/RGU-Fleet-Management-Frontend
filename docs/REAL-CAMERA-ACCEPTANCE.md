# Pending real-camera acceptance

The user confirmed all recorders are offline. Do these checks once at least
one channel plays in the phone app/iVMS. Synthetic acceptance tests do not prove
physical camera behavior, vendor token renewal or long-running stream stability.

1. Sign in as an approved workspace admin. Connect the real Hik-Connect account
   in Settings; authorize playback through the installed iVMS sign-in if needed.
2. Refresh recorders. Compare owned/shared device names, status and channel numbers
   with Hik-Connect. No sample cameras should ever appear.
3. Map the real recorder to a bus. Run Check camera availability. Unchecked/error
   channels must not be invented as working; successful previews must be real.
4. Star the working channels and open the bus camera view. Verify grid start/stop,
   single selection, focus/back, SD/HD/adaptive, fit/fill, zoom, snapshot and rotation.
5. Test Smooth H264 and Compatibility. Unmute a camera with known phone-app audio,
   adjust volume and change selected tiles. Confirm only one channel is heard.
6. Record with audio enabled, stop, wait for server-save confirmation, refresh,
   play/download, and delete the clip. Verify retention and member restrictions.
7. Leave a stream open for more than five minutes: current frame observations
   should remain verified. Idle observations expire; offline status remains honest.
8. Test network loss/reconnect, recorder offline, expired viewer session, expired
   Hik/SDK authorization, account switch and provider disconnect. Old frames,
   audio, permissions and thumbnails must not cross accounts/workspaces.
9. Run a longer session with rapid recorder changes, multiple tiles, rotation
   and backend restart. Compare sound/smoothness with the same phone/iVMS channel.

GPS/fuel vendor integration is phase 2. Optional mock readings must first be
generated/stored by the backend; the React app must never generate telemetry.
Linux/VPS deployment and camera archive-footage playback are separate tasks.
