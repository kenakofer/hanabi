<!-- /lib/components/GameControls.svelte -->
<script lang="ts">
  import { cardsSelectedStore } from "../stores/cardsSelectedStore";
  import { actionStore } from "../stores/actionStore";
  import gameOrReviewStore from "../stores/gameOrReviewStore";
  import { get } from "svelte/store";
  import { onMount, onDestroy } from "svelte";

  import PlayDiscardSelectedCard from "./PlayDiscardSelectedCard.svelte";
  import MoreActionsMenu from "./MoreActionsMenu.svelte";
  import ConfigModal from "./ConfigModal.svelte";
  import HintModal from "./HintModal.svelte";
  import type { GameAction } from "../models/gameActions";
  import { informationOnCardsStore } from "../stores/informationOnCardsStore";
  import { cardsInHandStore } from "../stores/cardsInHandStore";
  import { contextOnCardsStore } from "../stores/contextOnCardsStore";
  import type { WebAction } from "../models/webAction";
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
  let wakeLockButtonText = "Wake Lock Off"; // Initial text

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
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
          wakeLockButtonText = "Turn Wake Lock On"; // Update text when the lock is released
        });
        wakeLockButtonText = "Turn Wake Lock Off"; // Update text to reflect status
      } catch (err) {
        console.error(`Could not acquire wake lock: ${err}`);
      }
    } else {
      wakeLock.release();
      wakeLock = null;
      wakeLockButtonText = "Turn Wake Lock on"; // Update text when the lock is released
    }
  }

  let actionStoreSize = actionStore.size;

  let actions: WebAction[] = [
    { label: wakeLockButtonText, action: toggleWakeLock },
  ];
  $: {
    actions = [{ label: wakeLockButtonText, action: toggleWakeLock }];
  }

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

  let isHintModalOpen = false;

  function openHintModal() {
    isHintModalOpen = true;
  }

  function handleRollback() {
    if ($actionStoreSize > 0) {
      const actionToUndo = actionStore.pop() as GameAction;
      switch (actionToUndo.actionType) {
        case "ColourHint": // undo a colour hint
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
              isHinted: actionToUndo.previousHinted[index],
            };
            contextOnCardsStore.set(id, cardContext);
          });
          break;
        case "NumberHint": // undo a number hint
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
              isHinted: actionToUndo.previousHinted[index],
            };
            contextOnCardsStore.set(id, cardContext);
          });
          break;
        case "ManualEliminate": // undo a manual cross-off
          {
            let cardInformation = informationOnCardsStore.get(actionToUndo.id);
            if (actionToUndo.trait === "colour") {
              cardInformation = {
                ...cardInformation,
                colourInformation: actionToUndo.previousInformation,
              };
            } else {
              cardInformation = {
                ...cardInformation,
                numberInformation: actionToUndo.previousInformation,
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
      class="hint-panel"
      on:click={openHintModal}
      disabled={$cardsSelectedStore.size < 1}>Record Hint</button
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
    <MoreActionsMenu {actions} />
  </div>
</div>

<ConfigModal bind:isOpen={isConfigModalOpen} />
<HintModal bind:isOpen={isHintModalOpen} />

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

  .hint-panel {
    align-self: flex-end; /* Aligns the hint panel button at the end */
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
