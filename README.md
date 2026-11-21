# easy-fight-firefox

Torn userscript that moves the **Start Fight** button and your chosen outcome
(Leave / Mug / Hospitalize) over your weapons on the attack page, so they're
easy to click. It only moves and hides buttons. You still do every click yourself.

Based on "Newest easy-fight (All-in-one version)" by seintz [2460991], Finaly [2060206],
Anxiety [2149726] and Brother [2590792] (GNU GPLv3).

Changes in this version:
- Works on Firefox (Greasemonkey/Violentmonkey/Tampermonkey): starts at DOMContentLoaded
  instead of waiting for `load`, and falls back to localStorage when `GM_*` isn't available.
- Settings changes apply right away, with no reload.
- Runs on both attack URLs: `loader.php?sid=attack` and `page.php?sid=attack`.

## Install
Open `easy-fight.user.js` in Tampermonkey/Violentmonkey (or paste it into a new
script in the editor) and save.
