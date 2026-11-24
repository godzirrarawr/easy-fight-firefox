// ==UserScript==
// @name        Newest easy-fight (All-in-one version)
// @namespace   seintz.torn.easy-fight
// @version     2.6
// @description move start fight, outcome and continue buttons for easy click. Includes All-in-One and specific weapon options.
// @author      seintz [2460991], Finaly [2060206], Anxiety [2149726], Brother [2590792]
// @license     GNU GPLv3
// @run-at      document-end
// @match       https://www.torn.com/loader.php?sid=attack*
// @match       https://www.torn.com/page.php?sid=attack*
// @grant       GM_setValue
// @grant       GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    // ---- storage: GM_* when available (Tampermonkey/Violentmonkey), else localStorage
    // (Greasemonkey 4 on Firefox has no synchronous GM_* functions).
    const store = {
        get(key, def) {
            try {
                if (typeof GM_getValue === 'function') return GM_getValue(key, def);
            } catch (e) { /* fall through */ }
            try {
                const v = localStorage.getItem('easyfight.' + key);
                return v === null ? def : JSON.parse(v);
            } catch (e) { return def; }
        },
        set(key, val) {
            try {
                if (typeof GM_setValue === 'function') return GM_setValue(key, val);
            } catch (e) { /* fall through */ }
            try { localStorage.setItem('easyfight.' + key, JSON.stringify(val)); } catch (e) { /* ignore */ }
        },
    };

    // TornPDA can inject the same script twice into one page; only run once.
    if (window.__easyFightLoaded) return;
    window.__easyFightLoaded = true;

    // Validate stored values: some managers' GM shims (e.g. TornPDA) can hand back
    // promises or strings instead of the stored value.
    function pick(key, def, allowed) {
        let v = store.get(key, def);
        if (typeof def === 'boolean' && typeof v === 'string') v = v === 'true';
        if (allowed ? !allowed.includes(v) : typeof v !== typeof def) return def;
        return v;
    }

    const isPhone = window.innerWidth <= 600;
    const settings = {
        outcome: pick('outcome', 'leave', ['leave', 'mug', 'hosp']),
        weapon: pick('defaultWeapon', 'all', ['all', 'primary', 'secondary', 'melee']),
        useTemp: pick('useTemp', true),
        collapsed: pick('panelCollapsed', isPhone), // start folded up on phones
    };

    const OUTCOME_INDEX = { leave: 0, mug: 1, hosp: 2 };
    const OUTCOME_TEXTS = ['leave', 'mug', 'hospitalize'];
    const CONTAINER = 'div[class*="dialogButtons___"]';
    const MOVED = 'ef-move';

    // ---- styling: one <style> element, rewritten only when settings change.
    // Breakpoints: mobile <=600px, tablet <=1000px, desktop above.
    const styleEl = document.getElementById('easyfight-style') || document.createElement('style');
    styleEl.id = 'easyfight-style';
    if (!styleEl.isConnected) (document.head || document.documentElement).appendChild(styleEl);

    function buildCss() {
        const left = ['-100px', '-140px', '-150px'];
        let top, height, extra = '';
        if (settings.weapon === 'all') {
            top = ['10px', '10px', '10px'];
            height = ['245px', '350px', '350px'];
            extra = 'opacity: 0.8; font-size: 24px;';
        } else {
            height = ['60px', '60px', '60px'];
            if (settings.useTemp) top = ['192.5px', '297.5px', '297.5px'];
            else if (settings.weapon === 'primary') top = ['10px', '10px', '10px'];
            else if (settings.weapon === 'secondary') top = ['75px', '110px', '110px'];
            else top = ['140px', '210px', '210px']; // melee
        }
        const rule = (i) => `${CONTAINER} > button.${MOVED} {
            position: absolute !important; left: ${left[i]}; top: ${top[i]};
            height: ${height[i]}; width: 120px; z-index: 10; ${extra}
        }`;
        return `
            ${rule(2)}
            @media (max-width: 1000px) { ${rule(1)} }
            @media (max-width: 600px)  { ${rule(0)} }
            [class*="playerWindow___"] { overflow: visible !important; }
            [class*="modelWrap___"] { visibility: visible !important; width: 322px !important; }
        `;
    }

    function applyStyle() { styleEl.textContent = buildCss(); }

    // ---- button handling
    function processButtons() {
        const box = document.querySelector(CONTAINER);
        if (!box) return;

        const buttons = [...box.children];
        const texts = buttons.map((b) => (b.textContent || '').trim().toLowerCase());
        const isOutcome = texts.some((t) => OUTCOME_TEXTS.includes(t));
        const isContinue = !isOutcome && texts.includes('continue');
        const phase = isOutcome ? 'outcome:' : isContinue ? 'continue:' : 'fight:';
        const state = phase + settings.outcome + ':' + texts.join('|');
        if (box.dataset.efState === state) return; // nothing changed since last pass
        box.dataset.efState = state;

        const wanted = OUTCOME_INDEX[settings.outcome];
        buttons.forEach((btn, i) => {
            // fight -> chosen outcome -> continue all land in the same spot
            const move = isOutcome ? i === wanted
                : isContinue ? texts[i] === 'continue'
                : texts[i].includes('fight');
            btn.classList.toggle(MOVED, move);
            btn.style.display = isOutcome && !move ? 'none' : '';
        });
    }

    // Coalesce bursts of DOM mutations into one pass per animation frame.
    let queued = false;
    function schedule() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; processButtons(); });
    }

    function resetButtons() {
        const box = document.querySelector(CONTAINER);
        if (box) delete box.dataset.efState;
        schedule();
    }

    // ---- settings panel (changes apply live, no reload)
    function injectUI() {
        if (document.getElementById('parameterUI')) return;
        const ui = document.createElement('div');
        ui.id = 'parameterUI';
        ui.style.cssText = 'position: fixed; top: 210px; left: 10px; z-index: 999; background-color: #333; color: white; padding: 6px 10px; border: 2px solid #555; border-radius: 5px; font-family: Arial, sans-serif; font-size: 13px; max-width: 170px;';
        ui.innerHTML = `
            <div id="efToggle" style="cursor: pointer; user-select: none; font-weight: bold;"></div>
            <div id="efBody" style="margin-top: 8px;">
            <div style="margin-bottom: 10px;">
                <label for="outcomeSelect" style="display: block; margin-bottom: 5px;">Attack Outcome:</label>
                <select id="outcomeSelect" style="width: 100%; padding: 5px;">
                    <option value="leave">Leave</option>
                    <option value="mug">Mug</option>
                    <option value="hosp">Hospitalize</option>
                </select>
            </div>
            <div style="margin-bottom: 10px;">
                <label for="weaponSelect" style="display: block; margin-bottom: 5px;">Weapon Button Style:</label>
                <select id="weaponSelect" style="width: 100%; padding: 5px;">
                    <option value="all">All-in-One</option>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="melee">Melee</option>
                </select>
            </div>
            <div>
                <label for="useTempCheckbox" style="display: flex; align-items: center;">
                    <input type="checkbox" id="useTempCheckbox" style="margin-right: 5px;"> Use Temporary
                </label>
            </div>
            </div>`;
        document.body.appendChild(ui);

        // Tap the header to fold the panel away (it covers a lot of a phone screen).
        const toggle = ui.querySelector('#efToggle');
        const body = ui.querySelector('#efBody');
        const renderCollapsed = () => {
            body.style.display = settings.collapsed ? 'none' : '';
            toggle.textContent = settings.collapsed ? '⚔ Easy Fight ▸' : '⚔ Easy Fight ▾';
        };
        renderCollapsed();
        toggle.addEventListener('click', () => {
            settings.collapsed = !settings.collapsed;
            store.set('panelCollapsed', settings.collapsed);
            renderCollapsed();
        });

        const outcomeSel = ui.querySelector('#outcomeSelect');
        const weaponSel = ui.querySelector('#weaponSelect');
        const tempBox = ui.querySelector('#useTempCheckbox');
        outcomeSel.value = settings.outcome;
        weaponSel.value = settings.weapon;
        tempBox.checked = settings.useTemp;

        outcomeSel.addEventListener('change', () => {
            settings.outcome = outcomeSel.value;
            store.set('outcome', settings.outcome);
            resetButtons();
        });
        weaponSel.addEventListener('change', () => {
            settings.weapon = weaponSel.value;
            store.set('defaultWeapon', settings.weapon);
            applyStyle();
        });
        tempBox.addEventListener('change', () => {
            settings.useTemp = tempBox.checked;
            store.set('useTemp', settings.useTemp);
            applyStyle();
        });
    }

    // ---- start. Don't wait for window 'load': on Firefox the script is often
    // injected after it has already fired, so the handler would never run.
    function start() {
        applyStyle();
        injectUI();
        processButtons();
        new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
