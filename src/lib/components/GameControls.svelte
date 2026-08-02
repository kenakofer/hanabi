<!-- /lib/components/GameControls.svelte -->
<script lang="ts">
  import { cardsSelectedStore } from "../stores/cardsSelectedStore";
  import { actionStore } from "../stores/actionStore";
  import gameOrReviewStore from "../stores/gameOrReviewStore";
  import { get } from "svelte/store";
  import { onMount, onDestroy } from "svelte";

  import PlayDiscardSelectedCard from "./PlayDiscardSelectedCard.svelte";
  import ConfigModal from "./ConfigModal.svelte";
  import ClueModal from "./ClueModal.svelte";
  import ConventionsModal from "./ConventionsModal.svelte";
  import type { GameAction } from "../models/gameActions";
  import { informationOnCardsStore } from "../stores/informationOnCardsStore";
  import { cardsInHandStore } from "../stores/cardsInHandStore";
  import { contextOnCardsStore } from "../stores/contextOnCardsStore";
  import reviewTurnStore from "../stores/reviewTurnStore";
  import { nextCardId } from "../stores/cardIDCounterStore";
  import { version } from "../../../package.json";

  const repoUrl = "https://github.com/kenakofer/hanabi";

  let versionLabel: string;
  let versionHref: string;
  $: {
    // BASE_URL is normalised by Vite (e.g. "/hanabi/", "/dev/").
    const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
    switch (base) {
      case "/hanabi":
        versionLabel = `v${version}`;
        versionHref = `${repoUrl}/tree/v${version}`;
        break;
      case "/dev":
        versionLabel = `dev ${version}`;
        versionHref = repoUrl;
        break;
      default:
        versionLabel = `v${version}`;
        versionHref = repoUrl;
        break;
    }
  }

  let wakeLock: WakeLockSentinel | null = null;
  let wakeLockSupported = "wakeLock" in navigator;
  let wakeLockOn = false;
  // Action label — describes what clicking does, not the current state.
  $: wakeLockLabel = wakeLockOn ? "Allow Screen to Sleep" : "Keep Screen Awake";

  // Fullscreen toggle (shown on mobile only — see CSS). Only render the button
  // where the Fullscreen API is actually available.
  let fullscreenSupported =
    typeof document !== "undefined" &&
    !!(document.documentElement.requestFullscreen || (document.documentElement as any).webkitRequestFullscreen);
  let isFullscreen = false;

  function fullscreenElement(): Element | null {
    return document.fullscreenElement || (document as any).webkitFullscreenElement || null;
  }

  async function toggleFullscreen() {
    try {
      if (!fullscreenElement()) {
        const el = document.documentElement as any;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      }
    } catch (err) {
      console.error(`Could not toggle fullscreen: ${err}`);
    }
  }

  function onFullscreenChange() {
    isFullscreen = !!fullscreenElement();
  }

  async function toggleWakeLock() {
    if (!wakeLock) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        // The browser drops the lock on its own (tab hidden, etc.) — follow it.
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
          wakeLockOn = false;
        });
        wakeLockOn = true;
      } catch (err) {
        console.error(`Could not acquire wake lock: ${err}`);
      }
    } else {
      wakeLock.release();
      wakeLock = null;
      wakeLockOn = false;
    }
  }

  let actionStoreSize = actionStore.size;

  let reviewLabel = "Review";
  $: {
    if ($gameOrReviewStore) {
      reviewLabel = "Review";
    } else {
      reviewLabel = "Exit Review";
    }
  }

  function toggleGameOrReview() {
    gameOrReviewStore.set(!get(gameOrReviewStore));
    reviewTurnStore.set($actionStoreSize);
  }

  let isConfigModalOpen = false;

  function openConfigModal() {
    isConfigModalOpen = true;
  }

  let isClueModalOpen = false;

  function openClueModal() {
    isClueModalOpen = true;
  }

  let isConventionsModalOpen = false;

  function openConventionsModal() {
    isConventionsModalOpen = true;
  }

  function handleRollback() {
    if ($actionStoreSize > 0) {
      const actionToUndo = actionStore.pop() as GameAction;
      switch (actionToUndo.actionType) {
        case "ColourClue": // undo a colour clue
          actionToUndo.ids.forEach((id, index) => {
            let cardInformation = informationOnCardsStore.get(id);
            cardInformation = {
              ...cardInformation,
              colourInformation: actionToUndo.previousColourInformation[index],
              knownColourInformation:
                actionToUndo.previousKnownColourInformation[index],
            };
            informationOnCardsStore.set(id, cardInformation);

            let cardContext = contextOnCardsStore.get(id);
            cardContext = {
              ...cardContext,
              isClued: actionToUndo.previousClued[index],
            };
            contextOnCardsStore.set(id, cardContext);
          });
          break;
        case "NumberClue": // undo a number clue
          actionToUndo.ids.forEach((id, index) => {
            let cardInformation = informationOnCardsStore.get(id);
            cardInformation = {
              ...cardInformation,
              numberInformation: actionToUndo.previousNumberInformation[index],
              knownNumberInformation:
                actionToUndo.previousKnownNumberInformation[index],
            };
            informationOnCardsStore.set(id, cardInformation);

            let cardContext = contextOnCardsStore.get(id);
            cardContext = {
              ...cardContext,
              isClued: actionToUndo.previousClued[index],
            };
            contextOnCardsStore.set(id, cardContext);
          });
          break;
        case "ManualEliminate": // undo a manual cross-off (X toggle)
          {
            let cardInformation = informationOnCardsStore.get(actionToUndo.id);
            if (actionToUndo.trait === "colour") {
              cardInformation = {
                ...cardInformation,
                crossedColourInformation: actionToUndo.previousInformation,
              };
            } else {
              cardInformation = {
                ...cardInformation,
                crossedNumberInformation: actionToUndo.previousInformation,
              };
            }
            informationOnCardsStore.set(actionToUndo.id, cardInformation);
          }
          break;
        case "PlayDiscard": // undo a play/discard
          let ids = get(cardsInHandStore);

          // Create a new array and insert the actionToUndo.id in the correct position
          let previousIds = ids.filter((id) => id < actionToUndo.id);
          previousIds.push(actionToUndo.id);
          previousIds = previousIds.concat(
            ids.filter((id) => id > actionToUndo.id)
          );

          // Ensure the list stays the same length by removing the highest id
          if (previousIds.length > ids.length) {
            previousIds.pop();
          }

          cardsInHandStore.set(previousIds);

          // remove one from the nextCardId store
          nextCardId.set(Math.max(...ids));
          break;
      }
    }
  }

  onMount(() => {
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  });
  onDestroy(() => {
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
  });
</script>

<div class="game-controls">
  
  <div class="primary-actions">
    {#if $gameOrReviewStore}
    <button class="configure" on:click={openConfigModal}>⚙️</button>
    <PlayDiscardSelectedCard />
    <button
      class="clue-panel"
      on:click={openClueModal}
      disabled={$cardsSelectedStore.size < 1}>Record Clue</button
    >
    <button
      class="undo"
      on:click={handleRollback}
      disabled={$actionStoreSize < 1}
    >
      Undo
    </button>
    {:else}
    <button class="review-button" disabled={$reviewTurnStore <= 0} on:click={() => reviewTurnStore.set(get(reviewTurnStore) - 1)}>
      Previous
    </button>
    <button class="review-button" disabled={$reviewTurnStore >= $actionStoreSize} on:click={() => reviewTurnStore.set(get(reviewTurnStore) + 1)}>
      Next
    </button>
    {/if}
  </div>

  <div class="secondary-actions">
    <a class="version-link" href={versionHref} target="_blank" rel="noopener">
      {versionLabel}
    </a>
    <button
      class="icon-btn"
      on:click={openConventionsModal}
      aria-label="Conventions cheat sheet"
      title="Conventions cheat sheet"
    >
      📖
    </button>
    {#if wakeLockSupported}
      <button
        class="icon-btn wake-lock-btn"
        class:active={wakeLockOn}
        on:click={toggleWakeLock}
        aria-pressed={wakeLockOn}
        aria-label={wakeLockLabel}
        title={wakeLockLabel}
      >
        {wakeLockOn ? "☀️" : "💤"}
      </button>
    {/if}
    {#if fullscreenSupported}
      <button
        class="fullscreen-btn"
        on:click={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? "🗗" : "⛶"}
      </button>
    {/if}
    <button on:click={toggleGameOrReview}>
      {reviewLabel}
    </button>
  </div>
</div>

<ConfigModal bind:isOpen={isConfigModalOpen} />
<ClueModal bind:isOpen={isClueModalOpen} />
<ConventionsModal bind:isOpen={isConventionsModalOpen} />

<style>
  .game-controls {
    display: flex;
    justify-content: space-between; /* Ensures space between primary and secondary actions */
    padding: 5px;
    gap: 5px;
    width: 100%; /* Ensure it uses the full width */
    box-sizing: border-box;
  }

  .primary-actions {
    display: flex;
    gap: 5px; /* Space between buttons */
  }

  .secondary-actions {
    display: flex;
    align-items: center; /* Align items vertically in the center */
    margin-left: auto; /* Pushes secondary actions to the right */
    gap: 5px;
  }
  .configure {
    align-self: flex-start; /* Aligns the configure button at the start */
  }

  .version-link {
    font-size: 0.85rem;
    white-space: nowrap;
    text-decoration: underline;
    opacity: 0.8;
  }

  .clue-panel {
    align-self: flex-end; /* Aligns the clue panel button at the end */
  }

  .icon-btn {
    font-size: 1.1rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  /* Wake lock is a stateful toggle, so make "on" visible at a glance rather
     than relying on the icon swap alone. */
  .wake-lock-btn.active {
    border-color: currentColor;
    box-shadow: inset 0 0 0 1px currentColor;
  }

  /* Portrait can't fit the whole control bar on one line — at 390px the
     buttons total ~700px and push the page into horizontal scroll. Let both
     groups wrap and trim the button padding so the bar stays compact and the
     hand keeps the vertical space. */
  @media (orientation: portrait) {
    .game-controls {
      flex-wrap: wrap;
      justify-content: center;
      padding: 3px;
      gap: 3px;
    }
    .primary-actions,
    .secondary-actions {
      flex-wrap: wrap;
      justify-content: center;
      gap: 3px;
      margin-left: 0; /* stop secondary actions being pushed off-row */
    }
    .game-controls :global(button) {
      padding: 0.4em 0.6em;
      font-size: 0.85rem;
    }
  }

  /* Fullscreen toggle is only useful on mobile / touch devices, so hide it
     on devices with a fine pointer (mouse) such as desktops. */
  .fullscreen-btn {
    display: none;
    font-size: 1.1rem;
    line-height: 1;
  }
  @media (hover: none) and (pointer: coarse) {
    .fullscreen-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
